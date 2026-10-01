import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.tasks.scheduler import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Gracefully start crawler scheduler (only in non-serverless environments)
    if not os.getenv("VERCEL"):
        try:
            start_scheduler()
        except Exception as e:
            import logging
            logging.getLogger("uvicorn").warning(f"Scheduler initialization skipped: {e}")
    yield
    if not os.getenv("VERCEL"):
        try:
            stop_scheduler()
        except Exception:
            pass

app = FastAPI(
    title="EduPath 2026 - Data Retrieval & Crawler Microservice",
    version="1.0.0",
    description="Máy chủ Độc lập Cào & Truy xuất Dữ liệu Tuyển sinh Đại học Việt Nam (Google Gemini 2.5 Flash + Supabase)",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Include retrieval routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "Admissions Data Retrieval & Crawler Microservice",
        "model": "Google Gemini 2.5 Flash (Extraction)",
        "database": "Supabase PostgreSQL",
        "docs": "/docs"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "data_retrieval_service",
        "model": "Google Gemini 2.5 Flash",
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=8001, reload=True)
