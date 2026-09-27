"""CareerPilot AI - FastAPI Application Entry Point"""
import logging
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "AI-powered job application management system. "
            "Upload resumes, match against jobs, generate cover letters, "
            "track applications, and practice interviews."
        ),
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    @app.middleware("http")
    async def add_request_metadata(request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        start = time.monotonic()
        response = await call_next(request)
        duration_ms = round((time.monotonic() - start) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms}ms"
        return response

    # Import and register routers
    from app.api.routes import (
        analytics,
        applications,
        auth,
        cover_letters,
        interviews,
        jobs,
        matches,
        resume_studio,
        resumes,
    )

    API_PREFIX = "/api/v1"
    app.include_router(auth.router, prefix=f"{API_PREFIX}/auth", tags=["Authentication"])
    app.include_router(resumes.router, prefix=f"{API_PREFIX}/resumes", tags=["Resumes"])
    app.include_router(jobs.router, prefix=f"{API_PREFIX}/jobs", tags=["Jobs"])
    app.include_router(matches.router, prefix=f"{API_PREFIX}/matches", tags=["Job Matching"])
    app.include_router(
        resume_studio.router, prefix=f"{API_PREFIX}/resume-studio", tags=["Resume Studio"]
    )
    app.include_router(
        cover_letters.router, prefix=f"{API_PREFIX}/cover-letters", tags=["Cover Letters"]
    )
    app.include_router(
        applications.router, prefix=f"{API_PREFIX}/applications", tags=["Applications"]
    )
    app.include_router(
        interviews.router, prefix=f"{API_PREFIX}/interviews", tags=["Interview Coach"]
    )
    app.include_router(analytics.router, prefix=f"{API_PREFIX}/analytics", tags=["Analytics"])

    @app.get("/health", tags=["Health"])
    def health_check():
        from app.services.ai_service import ai_service
        return {
            "status": "ok",
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "ai_configured": ai_service.is_configured(),
            "ai_provider": ai_service.active_provider,
        }

    @app.get("/", tags=["Root"])
    def root():
        return {
            "message": "CareerPilot AI API",
            "version": settings.APP_VERSION,
            "docs": "/api/docs",
        }

    return app


app = create_app()
