from typing import Callable, Any
from models.base import BaseSearchRequest
from .error import handle_search_error


async def handle_search_request(
    request: BaseSearchRequest,
    search_method: Callable,
    **kwargs
) -> dict:
    try:
       
        if hasattr(request, 'page'):
            result = await search_method(request.query, request.page)
        elif hasattr(request, 'num'):
            result = await search_method(request.query, request.num)
        else:
            result = await search_method(request.query)
            
        return result.dict()
    except Exception as e:
        raise handle_search_error(e)