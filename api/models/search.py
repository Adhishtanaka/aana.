from typing import List
from pydantic import BaseModel
from .base import PaginatedSearchRequest, LimitedSearchRequest, ShoppingSearchRequest

class WebSearchRequest(PaginatedSearchRequest):
    pass


class MediaSearchRequest(LimitedSearchRequest):
    pass

class ShoppingRequest(ShoppingSearchRequest):
    pass


class ClientMessage(BaseModel):
    role: str
    content: str
    createdAt: str

    def to_dict(self):
        return {"role": self.role, "content": self.content, "createdAt": self.createdAt}


class Request(BaseModel):
    messages: List[ClientMessage]


class URLCheckRequest(BaseModel):
    url: str