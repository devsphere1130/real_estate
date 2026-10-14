import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import (
    admin_leads,
    admin_listings,
    admin_photos,
    admin_stats,
    auth,
    leads_public,
    listings_public,
)

settings = get_settings()
logger = logging.getLogger("devsphere")

app = FastAPI(
    title="DevSphere Real Estate API",
    version="1.0.0",
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return response


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    # Log the details for the owner, but never show them to visitors.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse({"detail": "Something went wrong on our side. Please try again."}, status_code=500)

upload_dir = settings.resolved_upload_dir
upload_dir.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=upload_dir),
    name="uploads",
)

for router in (
    auth.router,
    listings_public.router,
    leads_public.router,
    admin_listings.router,
    admin_photos.router,
    admin_leads.router,
    admin_stats.router,
):
    app.include_router(router)


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok"}
