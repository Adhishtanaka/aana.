
from pydantic import BaseModel
from typing import Optional


class BaseSearchRequest(BaseModel):
    query: str


class PaginatedSearchRequest(BaseSearchRequest):
    page: Optional[int] = 1


class LimitedSearchRequest(BaseSearchRequest):
    num: Optional[int] = 10


class ShoppingSearchRequest(BaseSearchRequest):
    num: Optional[int] = 40