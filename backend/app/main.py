"""JSON Diff API - FastAPI backend for JSON comparison."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from app.routers import diff

# Configure max upload size to 50MB (50 * 1024 * 1024 bytes)
MAX_UPLOAD_SIZE = 50 * 1024 * 1024

app = FastAPI(
    title="Freebies JSON Comparer API",
    description="API for comparing JSON documents and visualizing differences - Freebies",
    version="1.0.0",
)


# Middleware to enforce max body size limit (50MB)
class LimitUploadSize:
    def __init__(self, app: ASGIApp, max_upload_size: int = MAX_UPLOAD_SIZE) -> None:
        self.app = app
        self.max_upload_size = max_upload_size

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] == "http" and scope["method"] in ["POST", "PUT", "PATCH"]:
            headers = dict(scope.get("headers", []))
            content_length = headers.get(b"content-length")

            if content_length and int(content_length) > self.max_upload_size:
                await send(
                    {
                        "type": "http.response.start",
                        "status": 413,
                        "headers": [[b"content-type", b"application/json"]],
                    }
                )
                error_msg = f"Payload too large. Maximum size is {self.max_upload_size // (1024*1024)}MB"
                await send(
                    {
                        "type": "http.response.body",
                        "body": f'{{"detail": "{error_msg}"}}'.encode(),
                    }
                )
                return

        await self.app(scope, receive, send)


app.add_middleware(LimitUploadSize, max_upload_size=MAX_UPLOAD_SIZE)


# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://frontend-933362628329.us-east1.run.app",
        "https://onestopjson.com",
        "https://www.onestopjson.com",
        "http://localhost:3000",
        "http://localhost:5173",  # vite dev
        "http://localhost:4173",  # vite preview
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(diff.router, prefix="/api/v1", tags=["diff"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}
