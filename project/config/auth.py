from fastapi import Request, HTTPException
from functools import wraps


API_KEY = "moonshine-stt-key-2024"


def verify_api_key(request: Request):
    x_api_key = request.headers.get("x-api-key")
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API Key")
    return x_api_key


def resolve_auth(func):
    func.__auth_required__ = True

    @wraps(func)
    def wrapper(*args, **kwargs):
        request = kwargs.get("request")
        if request is None:
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
        if request is not None:
            verify_api_key(request)
        return func(*args, **kwargs)

    return wrapper
