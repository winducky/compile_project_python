from fastapi import APIRouter, Request
from starlette.templating import _TemplateResponse
from web.templates import templates

router = APIRouter(prefix="/stt", tags=["STT"])


@router.get("", response_class=_TemplateResponse, include_in_schema=False)
def index(request: Request):
    context = {"title": "Moonshine STT - Chuyển giọng nói thành văn bản"}
    return templates.TemplateResponse(request, "stt/index.html", context)
