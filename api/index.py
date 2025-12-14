import os
import json
from typing import List
from google import genai
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
from utils.qubecrawl import search, search_again
from urllib.parse import urlparse
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from utils.store import (
    get_all_conversations,
    delete_conversations_by_date,
    store_conversation,
    delete_conversations,
)

load_dotenv(override=True)

url = ""
context = ""
first_message = ""
search_results = {}

api_key = os.getenv("Gemini_API_KEY")
client = genai.Client(api_key=api_key)


class ClientMessage(BaseModel):
    role: str
    content: str
    createdAt: str

    def to_dict(self):
        return {"role": self.role, "content": self.content, "createdAt": self.createdAt}


class Request(BaseModel):
    messages: List[ClientMessage]


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/chat/history")
async def get_history():
    return get_all_conversations()


@app.delete("/api/chat/history/{created_time}")
async def delete_history_specific(created_time):
    delete_conversations_by_date(created_time)


@app.delete("/api/chat/history")
async def delete_history():
    delete_conversations()


def extract_video_id_from_url(url):
    """Extract YouTube video ID from URL"""
    import re
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/v\/([^&\n?#]+)',
        r'youtube\.com\/.*[?&]v=([^&\n?#]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return ''

def stream_response(markdown, query, url):
    template0 = """
    CONTEXT: {function_output}
    URL: {url}
    You are a helpful assistant. The context provided above contains file information from a function output and its source URL. 
    Follow ALL of the rules below to create a Markdown response:
    1. Use the file information (`file_name`, `url`, `size_mb`) to construct a download button in Markdown.
    2. The download button should include:
    - The file name and size displayed clearly
    - A download icon element using <ion-icon name="cloud-download-outline"></ion-icon>
    - A clickable link to download the file (`url`)
    3. Format the button as Markdown code.
    4. If relevant, include reference to the source URL where this file was found.

    EXAMPLE OUTPUT:

    ## File Download
    
    **sample_document.pdf** (2.5 MB)  
    <ion-icon name="cloud-download-outline"></ion-icon> [Download File](https://example.com/files/sample_document.pdf)
    
    [Source Document](https://example.com/documents/sample)
    """

    template1 = """
    CONTEXT: {transcript}
    VIDEO_ID: {video_id}
    VIDEO_URL: {url}
    QUERY: {query}
    You are a helpful assistant. The context provided above is related to a YouTube video with the video ID and URL provided. 
    Follow ALL of the rules below to create an answer:
    1. ALWAYS include the video embed using iframe with the VIDEO_ID provided
    2. If transcript is available:
       - Provide a brief description based on the transcript
       - Answer any specific questions about the video content
    3. If transcript is NOT available (context mentions transcript retrieval issues):
       - Acknowledge that transcript couldn't be retrieved
       - Still show the video embed so users can watch it
       - Explain that you cannot provide content details without transcript
    4. Always include:
       - Video embed iframe
       - Download button using 9xbuddy
       - Source attribution as clickable link
    5. Use the exact VIDEO_ID provided to generate correct embed URLs
    6. Keep response concise and helpful

    EXAMPLE OUTPUT FOR AVAILABLE TRANSCRIPT:

    ## Video: Machine Learning Basics
    
    This video explains the fundamentals of machine learning algorithms and their practical applications.

    <iframe width="560" height="315" src="https://www.youtube.com/embed/{video_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

    ### Download Video
    [Download Video](https://9xbuddy.com/process?url=https://www.youtube.com/watch?v={video_id})

    [Source: YouTube Video](https://www.youtube.com/watch?v={video_id})

    EXAMPLE OUTPUT FOR NO TRANSCRIPT:

    ## YouTube Video
    
    Unfortunately, a transcript could not be retrieved for this video as subtitles are not available. Please watch the video directly for content.

    <iframe width="560" height="315" src="https://www.youtube.com/embed/{video_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

    ### Download Video
    [Download Video](https://9xbuddy.com/process?url=https://www.youtube.com/watch?v={video_id})

    [Source: YouTube Video](https://www.youtube.com/watch?v={video_id})

    [Source: Introduction to Machine Learning - TechEdu](https://www.youtube.com/c/techedu)
    """

    template2 = """
    CONTEXT: {markdown}
    SOURCE_URL: {url}
    You are a helpful assistant. Above is some context from the provided source URL.
    Please answer the question, and make sure you follow ALL of the rules below:
    1. Answer the questions only based on context provided and its source URL, do not make things up
    2. Answer questions in a helpful manner that's straight to the point, with clear structure & all relevant information
    3. Answer should be formatted in Markdown
    4. Include and properly embed any relevant:
       - Images using HTML img tags
       - Videos using iframes (with download button using 9xbuddy)
       - Location data using OpenStreetMap iframe
    5. Include attribution as a clickable link
    6. For any geographical coordinates:
       - Convert DMS format to decimal format using the formula: Degrees + (Minutes/60) + (Seconds/3600)
       - Include both a link and an embedded map
    7. For any video content:
       - Add a download button below the video using 9xbuddy URL format

    EXAMPLE OUTPUT:

    ## Historical Temple Site

    The ancient temple complex is located in the central highlands of Sri Lanka, featuring intricate stone carvings from the 5th century.

    ### Location
    The temple is situated at coordinates 7.956944°N, 80.759722°E

    <iframe width="450" height="360" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" 
    src="https://www.openstreetmap.org/export/embed.html?bbox=80.75472280,7.95194447,80.76472280,7.96194447&layer=mapnik&marker=7.956944,80.759722">
    </iframe>

    [View Location on OpenStreetMap](https://www.openstreetmap.org/?mlat=7.956944&mlon=80.759722#map=15/7.956944/80.759722)

    ### Visual Documentation

    <img src="https://example.com/images/temple-entrance.jpg" alt="Temple Entrance" width="600">

    ### Site Tour
    <iframe width="560" height="315" src="https://www.youtube.com/embed/example" frameborder="0" allowfullscreen></iframe>

    ### Download Video Tour
    <ion-icon name="cloud-download-outline"></ion-icon> [Download Video](https://9xbuddy.com/process?url=https://www.youtube.com/embed/example)

    [Source: Archaeological Survey Department](https://example.com/archaeology)

    Note: Coordinates converted from DMS format:
    - 07°57'25″N = 7 + (57/60) + (25/3600) = 7.956944
    - 80°45'35″E = 80 + (45/60) + (35/3600) = 80.759722
    """
    parsed = urlparse(url)
    if url.lower().endswith(".pdf"):
        prompt = template0.format(function_output=markdown, url=url)
    elif any(
        yt_domain in parsed.netloc.lower() for yt_domain in ["youtube.com", "youtu.be"]
    ):
        if isinstance(markdown, dict):
            if 'error' in markdown:
                video_id = extract_video_id_from_url(markdown.get('url', url))
                prompt = template1.format(
                    transcript=f"Transcript Retrieval Status: Unfortunately, a transcript could not be retrieved for the video provided. This is most likely because subtitles are disabled for this video, as indicated in the context. Therefore, I cannot provide a description of the video's content or answer specific questions about it.",
                    video_id=video_id,
                    query=query, 
                    url=markdown.get('url', url)
                )
            else:
                transcript_text = markdown.get('transcript', '')
                video_id = markdown.get('video_id', '')
                prompt = template1.format(
                    transcript=transcript_text, 
                    video_id=video_id,
                    query=query, 
                    url=url
                )
        else:
            prompt = template1.format(transcript=markdown, video_id='', query=query, url=url)
    else:
        if "Access to this website is restricted" in str(markdown) and any(keyword in query.lower() for keyword in ["direction", "travel", "route", "way to", "how to get"]):
            prompt = f"""
            CONTEXT: {markdown}
            QUERY: {query}
            SOURCE_URL: {url}
            
            The user is asking for travel directions but the website is blocked. Provide helpful general guidance about travel between these locations based on the query, and suggest alternative resources.
            
            Include:
            1. General information about the locations mentioned
            2. Common transportation methods for this region
            3. Suggest visiting the blocked website directly
            4. Recommend alternative direction services (Google Maps, etc.)
            5. Include the source link for direct access
            
            Format the response in Markdown with clear sections.
            """
        else:
            prompt = template2.format(markdown=markdown, query=query, url=url)

    chat_completion = client.models.generate_content_stream(
        model="gemini-2.5-flash", contents=prompt
    )
    for chunk in chat_completion:
        yield "0:{text}\n".format(text=json.dumps(chunk.text))


@app.post("/api/chat/{index}")
async def handle_chat_data(request: Request, index):
    global context, url, search_results, first_message
    index = int(index)
    messages = request.messages
    first_message = messages[0].content
    created_time = messages[0].createdAt
    last_message = messages[-1].content

    if search_results == {} and len(messages) == 1:
        new_result = await search(first_message, index)
        context, url, search_results = new_result

    elif len(messages) == 1 and search_results != {}:
        links = [item["link"] for item in search_results["organic"]]
        # Add bounds checking to prevent index out of range
        if index >= len(links):
            index = 0
        url = links[index]
        context = await search_again(url)
        # Handle different context types
        if isinstance(context, dict):
            # For YouTube videos, don't append user question here as it's handled in template
            pass
        else:
            context += f"\n\nUSER QUESTION: {last_message}\n"


    elif context == "" and len(messages) > 1:
        links = [item["link"] for item in search_results["organic"]]
        # Add bounds checking to prevent index out of range
        if index >= len(links):
            index = 0
        url = links[index]
        context = await search_again(url)
        # Handle different context types
        if isinstance(context, dict):
            # For YouTube videos, don't append user question here as it's handled in template
            pass
        else:
            context += f"\n\nUSER QUESTION: {last_message}\n"


    else:
        base_context = await search_again(url)
        # Handle different context types
        if isinstance(base_context, dict):
            context = base_context  # For YouTube videos, don't append user question here
        else:
            context = base_context + f"\n\nUSER QUESTION: {last_message}\n"


    store_conversation(created_time, first_message, url)
    response = StreamingResponse(stream_response(context, last_message, url))
    response.headers["x-vercel-ai-data-stream"] = "v1"
    return response


@app.patch("/api/chat/reset")
async def reset_chat():
    global context, url
    context = ""
    url = ""


@app.delete("/api/chat/delete")
async def delete_chat():
    global search_results, context, url, first_message
    search_results = {}
    context = ""
    url = ""
    first_message = ""


@app.get("/api/chat/info")
async def get_info():
    global search_results
    return {"search_results": search_results, "first_message": first_message}
