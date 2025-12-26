import re
import os
import json
import aiohttp
import requests
import html2text
import random
import asyncio
import time
import tempfile
import yt_dlp
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from async_lru import alru_cache
from urllib.parse import urljoin, urlparse

load_dotenv()
SERPER_API_KEY = os.getenv("SERPER_API_KEY")
url = "https://google.serper.dev/search"

unnecessary_patterns = r"""
    nav|menu|navbar|sidebar|drawer|breadcrumb|side-nav|sidenav|header|footer|bottom-bar|top-bar|ad-|ads-|advertisement|banner|promo|sponsored|ads|social|share|tweet
    |facebook|linkedin|instagram|pinterest|comment|disqus|discuss|reaction|rating|review-form|popup|modal|overlay|dialog|toast|alert|notification|tracking|analytics
    |pixel|beacon|tag-manager|disclaimer|newsletter|subscribe|signup|mailing-list|related|suggested|recommended|similar|more-like-this|search|login|register|sign-in
    |cart|checkout|auth|cookie|gdpr|consent|privacy|terms|copyright|hidden|display-none|invisible|spacer|gap|background|decoration|ornament|pattern|gradient|carousel
    |slider|lightbox|tooltip|dropdown|skeleton|placeholder|loading|shimmer|spinner
"""

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
]

def get_random_headers():
    """Generate random headers for web scraping."""
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
    }

wikipedia_headers = {
    "User-Agent": "AANA-SearchBot/1.0 (https://github.com/Adhishtanaka/aana; aana-search@example.com) aiohttp/3.11.11",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


def search_web(query):
    from .serper_client import serper_client
    import asyncio
    
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(serper_client.search_web(query))
        results = {
            "organic": [item.dict() for item in result.organic],
            "knowledgeGraph": result.knowledgeGraph.dict() if result.knowledgeGraph else None,
            "peopleAlsoAsk": [item.dict() for item in result.peopleAlsoAsk] if result.peopleAlsoAsk else None,
            "relatedSearches": result.relatedSearches
        }
        
        links = [item["link"] for item in results["organic"]]
        return links, results
        
    except Exception as e:
        print(f"SerperClient failed, using fallback: {e}")
        payload = json.dumps({"q": query})
        header1 = {"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"}
        response = requests.post(url, headers=header1, data=payload)
        results = response.json()
        
        links = [item["link"] for item in results["organic"]]
        return links, results


async def get_html(url):
    domain = urlparse(url).netloc.lower()
    
    problematic_domains = ['x.com', 'twitter.com', 'facebook.com', 'instagram.com']
    
    wikipedia_domains = ['wikipedia.org', 'wikimedia.org', 'wikidata.org', 'wikisource.org', 
                        'wiktionary.org', 'wikinews.org', 'wikiquote.org', 'wikibooks.org',
                        'wikiversity.org', 'wikivoyage.org', 'wikispecies.org']
    
    if any(wiki_domain in domain for wiki_domain in wikipedia_domains):
        headers_to_use = wikipedia_headers
        if 'wikipedia.org' in domain and '/wiki/' in url:
            rest_api_url = convert_wikipedia_to_rest_api(url)
            if rest_api_url != url:
                url = rest_api_url
    else:
        headers_to_use = get_random_headers()
    
    if any(prob_domain in domain for prob_domain in problematic_domains):
        return await get_html_fallback(url, headers_to_use)
    await asyncio.sleep(random.uniform(0.5, 2.0))
    
    connector = aiohttp.TCPConnector(
        limit=100,
        limit_per_host=30,
        ttl_dns_cache=300,
        use_dns_cache=True,
    )
    
    timeout = aiohttp.ClientTimeout(total=30, connect=10)
    
    try:
        async with aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            connector_owner=True,
        ) as session:
            async with session.get(
                url, 
                headers=headers_to_use,
                allow_redirects=True,
                max_redirects=10,
            ) as response:
                if response.status == 200:
                    html = await response.text()
                    return get_markdown(html, url)
                else:
                    print(f"HTTP {response.status} error for URL: {url}")
                    if response.status == 403:
                        return f"Access to this website is restricted. The site may be blocking automated requests. Please visit the link directly: {url}"
                    else:
                        return f"Error: Unable to fetch content (HTTP {response.status}). Please visit the link directly: {url}"
                    
    except aiohttp.ClientResponseError as e:
        if "Header value is too long" in str(e) or "Got more than" in str(e):
            print(f"Header size error for {url}, using fallback method...")
            return await get_html_fallback(url, headers_to_use)
        else:
            print(f"Client response error for {url}: {e}")
            return f"Error: {str(e)}"
    except Exception as e:
        print(f"Unexpected error for {url}: {e}")
        return await get_html_fallback(url, headers_to_use)


def convert_wikipedia_to_rest_api(url):
    try:
        parsed = urlparse(url)
        if 'wikipedia.org' in parsed.netloc:
            path_parts = parsed.path.split('/')
            if len(path_parts) >= 3 and path_parts[1] == 'wiki':
                article_title = path_parts[2]
                rest_url = f"https://{parsed.netloc}/api/rest_v1/page/html/{article_title}"
                return rest_url
    except Exception as e:
        print(f"Could not convert Wikipedia URL to REST API: {e}")
    return url

async def get_html_fallback(url, headers=None):
    """Fallback method for HTML fetching using requests (sync)."""
    if headers is None:
        headers = get_random_headers()
        
    try:
        response = requests.get(
            url, 
            headers=headers, 
            timeout=30,
            allow_redirects=True,
            stream=False
        )
        if response.status_code == 200:
            return get_markdown(response.text, url)
        elif response.status_code == 403:
            return f"Access to this website is restricted. The site may be blocking automated requests. Please visit the link directly: {url}"
        else:
            return f"Error: Unable to fetch content (HTTP {response.status_code}). Please visit the link directly: {url}"
    except Exception as e:
        print(f"Fallback method also failed for {url}: {e}")
        return f"Error: Unable to fetch content - {str(e)}"


def get_markdown(content, url):
    html = BeautifulSoup(content, "lxml")
    html_body = html.find("main") or html.find("article") or html.find("body") or html
    elements_to_remove = html_body.select(
        'nav, header, footer, form, button, input, script, label, style, select, textarea, option, meta, canvas, [aria-hidden="true"]'
    )
    elements_to_remove.extend(html_body.find_all(class_=unnecessary_patterns))
    elements_to_remove.extend(html_body.find_all(id=unnecessary_patterns))
    for element in elements_to_remove:
        element.decompose()
    for figure in html_body.find_all("figure"):
        img = figure.find("img")
        if img:
            figcaption = figure.find("figcaption")
            if figcaption:
                img["alt"] = figcaption.get_text(strip=True)
            figure.replace_with(img)
    for img in html_body.find_all("img"):
        if not img.get("alt"):
            img.decompose()
    for element in html_body.select("img[src], img[data-src]"):
        if "src" in element.attrs:
            element["src"] = urljoin(url, element["src"])
        if "data-src" in element.attrs:
            element["data-src"] = urljoin(url, element["data-src"])
    for link in html.find_all("a", href=True):
        link["href"] = urljoin(url, link["href"])
    convert = html2text.HTML2Text()
    convert.ignore_links = True
    convert.ignore_emphasis = True
    convert.protect_links = True
    convert.skip_internal_links = True
    convert.use_automatic_links = True
    convert.body_width = 0
    markdown = convert.handle(str(html_body))
    markdown = re.sub(r"\n{3,}", "\n\n", markdown)
    markdown = re.sub(r"^\s+|\s+$", "", markdown)
    return markdown


@alru_cache(maxsize=20)
async def search(query, index):
    links, results = search_web(query)
    
    url = links[index]
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return
    if url.lower().endswith(".pdf"):
        file = get_file(url)
        return file, url, results
    elif any(
        yt_domain in parsed.netloc.lower() for yt_domain in ["youtube.com", "youtu.be"]
    ):
        transcript = get_transcript(url)
        return transcript, url, results
    else:
        html = await get_html(url)
        markdown = get_markdown(html, url)
        return markdown, url, results


@alru_cache(maxsize=20)
async def search_again(url):
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return
    if url.lower().endswith(".pdf"):
        file = get_file(url)
        return file
    elif any(
        yt_domain in parsed.netloc.lower() for yt_domain in ["youtube.com", "youtu.be"]
    ):
        transcript = get_transcript(url)
        return transcript
    else:
        html = await get_html(url)
        markdown = get_markdown(html, url)
        return markdown


def extract_video_id(url):
    """
    Consolidated function to extract YouTube video ID from various URL formats.
    Combines patterns from both extract_video_id and extract_video_id_from_url.
    
    Args:
        url: YouTube URL in any format
        
    Returns:
        str: Video ID if found, empty string if not found (for backward compatibility)
    """
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/v\/([^&\n?#]+)',
        r'youtube\.com\/user\/[^\/]+#[^\/]*\/[^\/]*\/[^\/]*\/([^&\n?#]+)',
        r'youtube\.com\/.*[?&]v=([^&\n?#]+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return '' 

def get_transcript_with_yt_dlp(video_id, url):
    try:
        # Configure yt-dlp options for subtitle extraction
        ydl_opts = {
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'en-US', 'en-GB', 'en-CA', 'en-AU'],
            'subtitlesformat': 'json3',
            'skip_download': True,
            'quiet': True,
            'no_warnings': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract video info including available subtitles
            try:
                info = ydl.extract_info(url, download=False)
                
                # Check if subtitles are available
                subtitles = info.get('subtitles', {})
                automatic_captions = info.get('automatic_captions', {})
                
                print(f"Available subtitles: {list(subtitles.keys())}")
                print(f"Available automatic captions: {list(automatic_captions.keys())}")
                
                # Try to get English subtitles (prefer manual over auto-generated)
                transcript_data = None
                source_type = None
                
                # First try manual subtitles
                for lang in ['en', 'en-US', 'en-GB', 'en-CA', 'en-AU']:
                    if lang in subtitles:
                        transcript_data = subtitles[lang]
                        source_type = "manual"
                        break
                
                # If no manual subtitles, try automatic captions
                if not transcript_data:
                    for lang in ['en', 'en-US', 'en-GB', 'en-CA', 'en-AU']:
                        if lang in automatic_captions:
                            print(f"Found automatic captions in {lang}")
                            transcript_data = automatic_captions[lang]
                            source_type = "automatic"
                            break
                
                if not transcript_data:
                    return {
                        "error": "No English subtitles or captions available",
                        "video_id": video_id,
                        "url": url,
                        "transcript_available": False
                    }
                
                # Find the best format (prefer json3, then vtt, then srv1)
                best_format = None
                for fmt in transcript_data:
                    if fmt.get('ext') == 'json3':
                        best_format = fmt
                        break
                    elif fmt.get('ext') == 'vtt' and not best_format:
                        best_format = fmt
                    elif fmt.get('ext') == 'srv1' and not best_format:
                        best_format = fmt
                
                if not best_format:
                    return {
                        "error": "No suitable subtitle format found",
                        "video_id": video_id,
                        "url": url,
                        "transcript_available": False
                    }
                
                # Download and parse the subtitle file
                subtitle_url = best_format['url']
                print(f"Downloading {source_type} subtitles from: {subtitle_url}")
                
                response = requests.get(subtitle_url, timeout=30)
                response.raise_for_status()
                
                # Parse based on format
                transcript_text = ""
                if best_format.get('ext') == 'json3':
                    transcript_text = parse_json3_subtitles(response.text)
                elif best_format.get('ext') == 'vtt':
                    transcript_text = parse_vtt_subtitles(response.text)
                elif best_format.get('ext') == 'srv1':
                    transcript_text = parse_srv1_subtitles(response.text)
                
                if transcript_text.strip():
                    return {
                        'transcript': transcript_text,
                        'video_id': video_id,
                        'url': url,
                        'transcript_available': True,
                        'source_type': source_type
                    }
                else:
                    return {
                        "error": "Transcript extracted but appears to be empty",
                        "video_id": video_id,
                        "url": url,
                        "transcript_available": False
                    }
                    
            except Exception as extract_error:
                print(f"yt-dlp extraction failed: {extract_error}")
                return {
                    "error": f"Failed to extract video info: {str(extract_error)}",
                    "video_id": video_id,
                    "url": url,
                    "transcript_available": False
                }
                
    except Exception as e:
        print(f"yt-dlp transcript extraction failed: {e}")
        return {
            "error": f"Transcript extraction failed: {str(e)}",
            "video_id": video_id,
            "url": url,
            "transcript_available": False
        }

def parse_json3_subtitles(json_content):
    try:
        data = json.loads(json_content)
        events = data.get('events', [])
        
        transcript_parts = []
        for event in events:
            if 'segs' in event:
                for seg in event['segs']:
                    if 'utf8' in seg:
                        transcript_parts.append(seg['utf8'])
        
        return ' '.join(transcript_parts).strip()
    except Exception as e:
        print(f"Error parsing JSON3 subtitles: {e}")
        return ""

def parse_vtt_subtitles(vtt_content):
    """Parse VTT format subtitles"""
    try:
        lines = vtt_content.split('\n')
        transcript_parts = []
        
        for line in lines:
            line = line.strip()
            # Skip empty lines, WEBVTT header, and timestamp lines
            if (line and 
                not line.startswith('WEBVTT') and 
                not line.startswith('NOTE') and
                '-->' not in line and
                not line.isdigit()):
                # Remove HTML tags and add to transcript
                clean_line = re.sub(r'<[^>]+>', '', line)
                if clean_line:
                    transcript_parts.append(clean_line)
        
        return ' '.join(transcript_parts).strip()
    except Exception as e:
        print(f"Error parsing VTT subtitles: {e}")
        return ""

def parse_srv1_subtitles(srv1_content):
    try:
        # SRV1 is XML format
        from xml.etree import ElementTree as ET
        root = ET.fromstring(srv1_content)
        
        transcript_parts = []
        for text_elem in root.findall('.//text'):
            if text_elem.text:
                transcript_parts.append(text_elem.text.strip())
        
        return ' '.join(transcript_parts).strip()
    except Exception as e:
        print(f"Error parsing SRV1 subtitles: {e}")
        return ""

def get_transcript_with_retry(video_id, max_retries=3):
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                time.sleep(1 + attempt * 0.5) 
            try:
                return YouTubeTranscriptApi.get_transcript(video_id)
            except Exception as e1:
                for lang in ['en', 'en-US', 'en-GB']:
                    try:
                        return YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])
                    except:
                        continue
                
                try:
                    available_transcripts = YouTubeTranscriptApi.list_transcripts(video_id)
                    for transcript in available_transcripts:
                        if transcript.language_code.startswith('en'):
                            try:
                                return transcript.fetch()
                            except:
                                continue
                except:
                    pass

                if attempt == max_retries - 1:
                    raise e1
                    
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            print(f"Attempt {attempt + 1} failed: {e}")
    
    return None

def get_transcript(url):
    try:
        video_id = extract_video_id(url)
        if not video_id:
            return {
                "error": "Could not extract video ID from URL", 
                "video_id": "", 
                "url": url,
                "transcript_available": False
            }
        
        # Try yt-dlp first (more reliable)
        result = get_transcript_with_yt_dlp(video_id, url)
        
        if result.get('transcript_available'):
            return result
        
        print("yt-dlp failed, falling back to youtube-transcript-api")
        
        # Fallback to youtube-transcript-api if yt-dlp fails
        try:
            transcript_list = get_transcript_with_retry(video_id)
            
            if transcript_list and len(transcript_list) > 0:
                transcript_text = ' '.join([item['text'] for item in transcript_list])
                return {
                    'transcript': transcript_text,
                    'video_id': video_id,
                    'url': url,
                    'transcript_available': True,
                    'source_type': 'fallback'
                }
            else:
                return {
                    "error": "Empty transcript received from fallback", 
                    "video_id": video_id, 
                    "url": url,
                    "transcript_available": False
                }
                
        except Exception as e:
            error_msg = str(e).lower()
            print(f"Both yt-dlp and fallback failed: {e}")
            
            # Return the yt-dlp error as it's usually more informative
            return result
        
    except Exception as e:
        print(f"Unexpected error in get_transcript: {e}")
        return {
            "error": str(e), 
            "video_id": extract_video_id(url) or "", 
            "url": url,
            "transcript_available": False
        }


def get_file(url):
    response = requests.head(url, allow_redirects=True)
    response.raise_for_status()
    size_bytes = int(response.headers.get("Content-Length", 0))
    file_name = (
        response.headers.get("Content-Disposition", url.split("/")[-1])
        .split("filename=")[-1]
        .strip('"')
    )
    return {
        "file_name": file_name,
        "url": url,
        "size_mb": round(size_bytes / (1024**2), 2),
    }
