from fastapi import APIRouter
from web.stt.router import router as stt_router
from web.home.router import router as home_router

router = APIRouter()
router.include_router(stt_router)
router.include_router(home_router)
