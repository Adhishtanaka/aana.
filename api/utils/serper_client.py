import os
import json
import aiohttp
import requests
from typing import Dict, List, Optional, Union
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class SerperError(Exception):
    pass

class WebSearchResult(BaseModel):
    title: str
    link: str
    snippet: str
    position: int
    sitelinks: Optional[List[Dict]] = None
    attributes: Optional[Dict[str, str]] = None

class KnowledgeGraph(BaseModel):
    title: str
    type: str
    website: Optional[str] = None
    imageUrl: Optional[str] = None
    description: str
    descriptionSource: str
    descriptionLink: str
    attributes: Dict[str, str]

class ImageResult(BaseModel):
    title: str
    imageUrl: str
    thumbnailUrl: str
    imageWidth: int
    imageHeight: int
    source: str
    domain: str
    link: str
    position: int

class VideoResult(BaseModel):
    title: str
    link: str
    snippet: str
    imageUrl: str
    duration: str
    source: str
    channel: str
    date: str
    position: int

class ShoppingResult(BaseModel):
    title: str
    source: str
    link: str
    price: str
    imageUrl: str
    position: int

class PlaceResult(BaseModel):
    title: str
    address: str
    latitude: float
    longitude: float
    rating: float
    ratingCount: int
    category: str
    phoneNumber: Optional[str] = None
    website: Optional[str] = None
    position: int

class PeopleAlsoAsk(BaseModel):
    question: str
    snippet: str
    title: str
    link: str

class WebSearchResponse(BaseModel):
    organic: List[WebSearchResult]
    knowledgeGraph: Optional[KnowledgeGraph] = None
    peopleAlsoAsk: Optional[List[PeopleAlsoAsk]] = None
    relatedSearches: Optional[List[Dict[str, str]]] = None

class ImageSearchResponse(BaseModel):
    images: List[ImageResult]

class VideoSearchResponse(BaseModel):
    videos: List[VideoResult]

class ShoppingSearchResponse(BaseModel):
    shopping: List[ShoppingResult]

class PlacesSearchResponse(BaseModel):
    places: List[PlaceResult]

class SerperClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("SERPER_API_KEY")
        if not self.api_key:
            raise ValueError("SERPER_API_KEY not found in environment variables")
        
        self.base_url = "https://google.serper.dev"
        self.headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def _make_request(self, endpoint: str, payload: Dict) -> Dict:
        url = f"{self.base_url}/{endpoint}"
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    url, 
                    headers=self.headers, 
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    elif response.status == 429:
                        raise SerperError("Rate limit exceeded. Please try again later.")
                    elif response.status == 403:
                        raise SerperError("API access forbidden. Check your API key.")
                    else:
                        error_text = await response.text()
                        raise SerperError(f"API request failed with status {response.status}: {error_text}")
            except aiohttp.ClientError as e:
                raise SerperError(f"Network error: {str(e)}")
    
    def _make_sync_request(self, endpoint: str, payload: Dict) -> Dict:
        url = f"{self.base_url}/{endpoint}"     
        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=30)
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 429:
                raise SerperError("Rate limit exceeded. Please try again later.")
            elif response.status_code == 403:
                raise SerperError("API access forbidden. Check your API key.")
            else:
                raise SerperError(f"API request failed with status {response.status_code}: {response.text}")
        except requests.RequestException as e:
            raise SerperError(f"Network error: {str(e)}")
    
    async def search_web(self, query: str, page: int = 1) -> WebSearchResponse:
        payload = {
            "q": query,
            "page": page
        }     
        try:
            result = await self._make_request("search", payload)    
            organic_results = []
            for item in result.get("organic", []):
                organic_results.append(WebSearchResult(
                    title=item.get("title", ""),
                    link=item.get("link", ""),
                    snippet=item.get("snippet", ""),
                    position=item.get("position", 0),
                    sitelinks=item.get("sitelinks"),
                    attributes=item.get("attributes")
                ))
     
            knowledge_graph = None
            if "knowledgeGraph" in result:
                kg = result["knowledgeGraph"]
                knowledge_graph = KnowledgeGraph(
                    title=kg.get("title", ""),
                    type=kg.get("type", ""),
                    website=kg.get("website"),
                    imageUrl=kg.get("imageUrl"),
                    description=kg.get("description", ""),
                    descriptionSource=kg.get("descriptionSource", ""),
                    descriptionLink=kg.get("descriptionLink", ""),
                    attributes=kg.get("attributes", {})
                )
            people_also_ask = None
            if "peopleAlsoAsk" in result:
                people_also_ask = []
                for paa in result["peopleAlsoAsk"]:
                    people_also_ask.append(PeopleAlsoAsk(
                        question=paa.get("question", ""),
                        snippet=paa.get("snippet", ""),
                        title=paa.get("title", ""),
                        link=paa.get("link", "")
                    ))
            
            return WebSearchResponse(
                organic=organic_results,
                knowledgeGraph=knowledge_graph,
                peopleAlsoAsk=people_also_ask,
                relatedSearches=result.get("relatedSearches")
            )  
        except Exception as e:
            raise SerperError(f"Web search failed: {str(e)}")
    
    async def search_images(self, query: str, num: int = 10) -> ImageSearchResponse:
        payload = {
            "q": query,
            "num": num
        }     
        try:
            result = await self._make_request("images", payload)          
            images = []
            for item in result.get("images", []):
                images.append(ImageResult(
                    title=item.get("title", ""),
                    imageUrl=item.get("imageUrl", ""),
                    thumbnailUrl=item.get("thumbnailUrl", ""),
                    imageWidth=item.get("imageWidth", 0),
                    imageHeight=item.get("imageHeight", 0),
                    source=item.get("source", ""),
                    domain=item.get("domain", ""),
                    link=item.get("link", ""),
                    position=item.get("position", 0)
                ))           
            return ImageSearchResponse(images=images)
        
        except Exception as e:
            raise SerperError(f"Image search failed: {str(e)}")
    
    async def search_videos(self, query: str, num: int = 10) -> VideoSearchResponse:
        payload = {
            "q": query,
            "num": num
        }      
        try:
            result = await self._make_request("videos", payload)
            
            videos = []
            for item in result.get("videos", []):
                videos.append(VideoResult(
                    title=item.get("title", ""),
                    link=item.get("link", ""),
                    snippet=item.get("snippet", ""),
                    imageUrl=item.get("imageUrl", ""),
                    duration=item.get("duration", ""),
                    source=item.get("source", ""),
                    channel=item.get("channel", ""),
                    date=item.get("date", ""),
                    position=item.get("position", 0)
                ))
            
            return VideoSearchResponse(videos=videos)
        
        except Exception as e:
            raise SerperError(f"Video search failed: {str(e)}")
    
    async def search_shopping(self, query: str, num: int = 40) -> ShoppingSearchResponse:
        payload = {
            "q": query,
            "num": num
        }
        try:
            result = await self._make_request("shopping", payload)    
            shopping = []
            for item in result.get("shopping", []):
                shopping.append(ShoppingResult(
                    title=item.get("title", ""),
                    source=item.get("source", ""),
                    link=item.get("link", ""),
                    price=item.get("price", ""),
                    imageUrl=item.get("imageUrl", ""),
                    position=item.get("position", 0)
                ))
            return ShoppingSearchResponse(shopping=shopping)      
        except Exception as e:
            raise SerperError(f"Shopping search failed: {str(e)}")
    async def search_places(self, query: str, num: int = 10) -> PlacesSearchResponse:
        payload = {
            "q": query,
            "num": num
        }
        try:
            result = await self._make_request("places", payload)          
            places = []
            for item in result.get("places", []):
                places.append(PlaceResult(
                    title=item.get("title", ""),
                    address=item.get("address", ""),
                    latitude=item.get("latitude", 0.0),
                    longitude=item.get("longitude", 0.0),
                    rating=item.get("rating", 0.0),
                    ratingCount=item.get("ratingCount", 0),
                    category=item.get("category", ""),
                    phoneNumber=item.get("phoneNumber"),
                    website=item.get("website"),
                    position=item.get("position", 0)
                ))           
            return PlacesSearchResponse(places=places)       
        except Exception as e:
            raise SerperError(f"Places search failed: {str(e)}")

serper_client = SerperClient()