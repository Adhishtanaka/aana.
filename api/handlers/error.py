from fastapi import HTTPException
from utils.serper_client import SerperError

def handle_search_error(e: Exception) -> HTTPException:
    if isinstance(e, SerperError):
        return HTTPException(status_code=400, detail=str(e))
    else:
        return HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")