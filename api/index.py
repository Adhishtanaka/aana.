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
    VIDEO_URL: {url}
    You are a helpful assistant. The context provided above is the transcript of a YouTube video from the provided URL. 
    Follow ALL of the rules below to create an answer based on this context:
    1. For general video queries (no specific question):
       - Provide a brief description of the video
       - Include the full video embed using iframe
       - Add a download button below the video using the 9xbuddy URL
    2. For specific questions about the video content:
       - Analyze the transcript to find the relevant part
       - Only provide the specific timestamped link(s) to the relevant section(s)
       - Include a download option for the specific section
    3. Always include:
       - A clear description
       - Source attribution as a clickable link
       - Video download option using 9xbuddy
    4. Do not include external links apart from YouTube and download links
    5. Ensure the response is concise and directly addresses the query

    EXAMPLE OUTPUT:

    ## Video Overview
    
    This video explains the basics of machine learning algorithms and their applications in data science.

    <iframe width="540" height="315" src="https://www.youtube.com/embed/example" frameborder="0" allowfullscreen></iframe>

    ### Download Video
    <ion-icon name="cloud-download-outline"></ion-icon> [Download Video](https://9xbuddy.com/process?url=https://www.youtube.com/watch?v=example)

    [Source: TechEdu Channel](https://www.youtube.com/c/techedu)

    For specific timestamp answer:
    ## Video Answer
    
    The gradient descent algorithm is explained as an optimization method that finds the minimum of a function by iteratively moving in the direction of steepest descent.

    [Watch Explanation (12:30-12:45)](https://www.youtube.com/watch?v=example&t=750)

    ### Download This Section
    <ion-icon name="cloud-download-outline"></ion-icon> [Download Video Section](https://9xbuddy.com/process?url=https://www.youtube.com/watch?v=example&t=750)

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
        prompt = template1.format(transcript=markdown, query=query, url=url)
    else:
        prompt = template2.format(markdown=markdown, query=query, url=url)

    chat_completion = client.models.generate_content_stream(
        model="gemini-2.0-flash-exp", contents=prompt
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
        url = links[index]
        context = await search_again(url)
        context += f"\n\nUSER QUESTION: {last_message}\n"
        print("Case 2: Visiting new unvisited page")

    elif context == "" and len(messages) > 1:
        links = [item["link"] for item in search_results["organic"]]
        url = links[index]
        context = await search_again(url)
        context += f"\n\nUSER QUESTION: {last_message}\n"
        print("Case 3: Revisiting previous page")

    else:
        base_context = await search_again(url)
        context = base_context + f"\n\nUSER QUESTION: {last_message}\n"
        print("Case 4: New question on current page")

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
