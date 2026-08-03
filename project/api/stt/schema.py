from pydantic import BaseModel
from typing import Optional


class TranscribeResponse(BaseModel):
    text: str
    language: str
    duration_seconds: float
    lines: list[dict]


class ErrorResponse(BaseModel):
    detail: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    language: str
