import re
import os
import json
import aiohttp
import requests
import html2text
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

header2 = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
    "Referer": "https://www.google.lk",
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
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=header2) as response:
            html = await response.text()
            return get_markdown(html, url)


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


def get_transcript(url):
    try:
        match = re.match(youtube_url_pattern, url)
        if match:
            video_id = match.group(7)
            srt = YouTubeTranscriptApi.get_transcript(video_id)
            return srt
        else:
            return None
    except Exception as e:
        return f"{e}"


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
