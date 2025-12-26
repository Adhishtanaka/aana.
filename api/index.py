import os
import json
from typing import Optional
from google import genai
from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from urllib.parse import urlparse, unquote
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from utils.qubecrawl import search, search_again, extract_video_id
from utils.serper_client import serper_client
from models.search import WebSearchRequest, MediaSearchRequest, ShoppingRequest, Request, URLCheckRequest
from handlers.search import handle_search_request

load_dotenv(override=True)

url = ""
context = ""
first_message = ""
search_results = {}

api_key = os.getenv("Gemini_API_KEY")
client = genai.Client(api_key=api_key)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/search/web")
async def search_web_endpoint(request: WebSearchRequest):
    return await handle_search_request(request, serper_client.search_web)

@app.post("/api/search/images")
async def search_images_endpoint(request: MediaSearchRequest):
    return await handle_search_request(request, serper_client.search_images)

@app.post("/api/search/videos")
async def search_videos_endpoint(request: MediaSearchRequest):
    return await handle_search_request(request, serper_client.search_videos)

@app.post("/api/search/shopping")
async def search_shopping_endpoint(request: ShoppingRequest):
    return await handle_search_request(request, serper_client.search_shopping)

@app.post("/api/search/places")
async def search_places_endpoint(request: MediaSearchRequest):
    return await handle_search_request(request, serper_client.search_places)

@app.post("/api/check-url")
async def check_url_accessibility(request: URLCheckRequest):
    try:
        parsed = urlparse(request.url)
        
        if any(yt_domain in parsed.netloc.lower() for yt_domain in ["youtube.com", "youtu.be"]):
            result = await search_again(request.url)
            print(f"YouTube URL check for {request.url}: {result}")
            if isinstance(result, dict):
                if 'transcript' in result and result['transcript'] and result['transcript'].strip():
                    print(f"Transcript found, length: {len(result['transcript'])}")
                    return {"accessible": True, "reason": "YouTube video with transcript available"}
                elif 'error' in result:
                    print(f"Transcript error: {result['error']}")
                    return {"accessible": False, "reason": f"YouTube video transcript not available: {result['error']}"}
            print("No transcript data found")
            return {"accessible": False, "reason": "YouTube video transcript not accessible"}
        
        result = await search_again(request.url)
        
        if isinstance(result, dict) and 'error' in result:
            return {"accessible": False, "reason": result.get('error', 'Unknown error')}
      
        if isinstance(result, str):
            error_indicators = [
                "Access to this website is restricted",
                "403 Forbidden",
                "Access Denied",
                "Cloudflare",
                "Rate limited",
                "Too many requests"
            ]
            
            for indicator in error_indicators:
                if indicator.lower() in result.lower():
                    return {"accessible": False, "reason": f"Content blocked: {indicator}"}
            
            if len(result.strip()) < 100:
                return {"accessible": False, "reason": "Content too short or empty"}
            
            if len(result) > 50000:
                return {"accessible": False, "reason": "Content too long for AI processing"}
        
        return {"accessible": True, "reason": "URL is accessible for AI chat"}
        
    except Exception as e:
        return {"accessible": False, "reason": f"Error checking URL: {str(e)}"}

def generate_response(markdown, query, url):

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
       - Video embed iframe using: <iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID_HERE" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
       - Source attribution as clickable link: [Source: YouTube Video](https://www.youtube.com/watch?v=VIDEO_ID_HERE)
    5. Use the exact VIDEO_ID provided to generate correct embed URLs
    6. Keep response concise and helpful
    7. Replace VIDEO_ID_HERE with the actual video ID from the context
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
       - Videos using iframes 
       - Location data using OpenStreetMap iframe
    5. Include attribution as a clickable link
    6. For any geographical coordinates:
       - Convert DMS format to decimal format using the formula: Degrees + (Minutes/60) + (Seconds/3600)
       - Include both a link and an embedded map

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

    [Source: Archaeological Survey Department](https://example.com/archaeology)

    Note: Coordinates converted from DMS format:
    - 07°57'25″N = 7 + (57/60) + (25/3600) = 7.956944
    - 80°45'35″E = 80 + (45/60) + (35/3600) = 80.759722
    """
    parsed = urlparse(url)
    if any(
        yt_domain in parsed.netloc.lower() for yt_domain in ["youtube.com", "youtu.be"]
    ):
        if isinstance(markdown, dict):
            if 'error' in markdown:
                video_id = extract_video_id(markdown.get('url', url))
                if not video_id:
                    video_id = extract_video_id(url)
                prompt = template1.format(
                    transcript=f"Transcript Retrieval Status: Unfortunately, a transcript could not be retrieved for the video provided. This is most likely because subtitles are disabled for this video, as indicated in the context. Therefore, I cannot provide a description of the video's content or answer specific questions about it.",
                    video_id=video_id,
                    query=query, 
                    url=markdown.get('url', url)
                )
            else:
                transcript_text = markdown.get('transcript', '')
                video_id = markdown.get('video_id', '')
                if not video_id:
                    video_id = extract_video_id(url)
                prompt = template1.format(
                    transcript=transcript_text, 
                    video_id=video_id,
                    query=query, 
                    url=url
                )
        else:
            video_id = extract_video_id(url)
            prompt = template1.format(transcript=markdown, video_id=video_id, query=query, url=url)
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

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash", contents=prompt
        )
        return response.text
    except Exception as e:
        error_msg = str(e)
        if "503" in error_msg or "overloaded" in error_msg.lower():
            return f"""
## Service Temporarily Unavailable

I'm sorry, but the AI service is currently experiencing high demand and is temporarily overloaded. 

**What you can do:**
- Try again in a few moments
- The content from your URL is available below for reference

**Content Summary:**
{str(markdown)[:500]}...

**Source:** [{url}]({url})

Please try your question again in a moment when the service is less busy.
"""
        elif "400" in error_msg or "invalid" in error_msg.lower():
            return f"""
## Content Processing Issue

There was an issue processing the content from this URL.

**Source:** [{url}]({url})

**Raw Content Preview:**
```
{str(markdown)[:300]}...
```

Please try visiting the source directly or rephrase your question.
"""
        else:
            return f"""
## Temporary Service Issue

I encountered an issue while processing your request: {error_msg}

**Source:** [{url}]({url})

Please try again or visit the source directly for the information you need.
"""


def stream_complete_response(complete_text):
    yield f"0:{json.dumps(complete_text)}\n"

@app.post("/api/chat/{index}")
async def handle_chat_data(request: Request, index, specific_url: Optional[str] = None):
    global context, url, search_results, first_message
    index = int(index)
    messages = request.messages
    first_message = messages[0].content
    last_message = messages[-1].content

    if specific_url:
        try:
            decoded_url = unquote(specific_url)
            context = await search_again(decoded_url)
            if isinstance(context, dict):
                pass
            else:
                context += f"\n\nUSER QUESTION: {last_message}\n"

            complete_response = generate_response(context, last_message, decoded_url)
            response = StreamingResponse(stream_complete_response(complete_response))
            response.headers["x-vercel-ai-data-stream"] = "v1"
            return response
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing URL: {str(e)}")

    if search_results == {} and len(messages) == 1:
        new_result = await search(first_message, index)
        context, url, search_results = new_result

    elif len(messages) == 1 and search_results != {}:
        links = [item["link"] for item in search_results["organic"]]
        if index >= len(links):
            index = 0
        url = links[index]
        context = await search_again(url)
      
        if isinstance(context, dict):
            pass
        else:
            context += f"\n\nUSER QUESTION: {last_message}\n"

    elif context == "" and len(messages) > 1:
        links = [item["link"] for item in search_results["organic"]]
        if index >= len(links):
            index = 0
        url = links[index]
        context = await search_again(url)
        if isinstance(context, dict):
            pass
        else:
            context += f"\n\nUSER QUESTION: {last_message}\n"

    else:
        base_context = await search_again(url)
        if isinstance(base_context, dict):
            context = base_context  
        else:
            context = base_context + f"\n\nUSER QUESTION: {last_message}\n"
    complete_response = generate_response(context, last_message, url)
    response = StreamingResponse(stream_complete_response(complete_response))
    response.headers["x-vercel-ai-data-stream"] = "v1"
    return response
