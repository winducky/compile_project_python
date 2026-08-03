from fastapi import APIRouter
from api.stt.router import router as stt_router

router = APIRouter()
router.include_router(stt_router)
