from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from api.stt.schema import TranscribeResponse, HealthResponse, ErrorResponse
from api.stt.service import process_audio_file
from api.stt.repo import is_model_loaded, get_language, reload_model
from config.auth import resolve_auth

router = APIRouter(prefix="/api/v1/stt", tags=["Speech-to-Text"])


@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    summary="Chuyển giọng nói thành văn bản",
    description="Nhận file audio (WAV, MP3, OGG, FLAC, M4A) và trả về văn bản đã nhận dạng giọng nói tiếng Việt.",
)
@resolve_auth
def transcribe(request: Request, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    try:
        return process_audio_file(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Kiểm tra trạng thái service",
    description="Kiểm tra model STT đã được load và sẵn sàng hoạt động.",
)
def health(request: Request):
    return HealthResponse(
        status="ready" if is_model_loaded() else "loading",
        model_loaded=is_model_loaded(),
        language=get_language(),
    )
