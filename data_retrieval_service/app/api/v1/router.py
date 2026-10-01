from fastapi import APIRouter
from app.api.v1.endpoints import retrieval, universities

api_router = APIRouter()

api_router.include_router(retrieval.router, prefix="/retrieval", tags=["Data Retrieval & Crawler Pipeline"])
api_router.include_router(universities.router, prefix="/universities", tags=["Cơ sở Đào tạo & Điểm chuẩn"])
