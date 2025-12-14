import re
import os
import json
import aiohttp
import requests
import html2text
import random
import asyncio
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from async_lru import alru_cache
from urllib.parse import urljoin, urlparse
from youtube_transcript_api import YouTubeTranscriptApi

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

import random

# Rotate user agents to avoid detection
user_agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
]

def get_random_headers():
    """Generate random headers to avoid bot detection"""
    return {
        "User-Agent": random.choice(user_agents),
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

header2 = get_random_headers()

# Wikipedia-compliant headers following Wikimedia Foundation User-Agent Policy
wikipedia_headers = {
    "User-Agent": "AANA-SearchBot/1.0 (https://github.com/Adhishtanaka/aana; aana-search@example.com) aiohttp/3.11.11",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

youtube_url_pattern = (
    r"^.*((youtu\.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*"
)


def search_web(query):
    payload = json.dumps(
        {
            "q": query,
        }
    )
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
        # For Wikipedia articles, try to use REST API for better performance
        if 'wikipedia.org' in domain and '/wiki/' in url:
            rest_api_url = convert_wikipedia_to_rest_api(url)
            if rest_api_url != url:
                url = rest_api_url
    else:
        # Use random headers for non-Wikipedia sites to avoid detection
        headers_to_use = get_random_headers()
    
    if any(prob_domain in domain for prob_domain in problematic_domains):
        return await get_html_fallback(url, headers_to_use)
    
    # Add random delay to avoid rate limiting
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
    """Convert Wikipedia article URL to REST API endpoint for better performance"""
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
    """Fallback method using requests for problematic URLs"""
    if headers is None:
        headers = header2
        
    try:
        import requests
        response = requests.get(
            url, 
            headers=headers, 
            timeout=30,
            allow_redirects=True,
            stream=False
        )
        if response.status_code == 200:
            return get_markdown(response.text, url)
        else:
            if response.status_code == 403:
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
    """Extract YouTube video ID from various URL formats"""
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
    return None

def get_transcript(url):
    try:
        video_id = extract_video_id(url)
        if video_id:
            srt = YouTubeTranscriptApi.get_transcript(video_id)
            return {
                'transcript': srt,
                'video_id': video_id,
                'url': url
            }
        else:
            return {"error": "Could not extract video ID from URL", "url": url}
    except Exception as e:
        return {"error": str(e), "url": url}


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
