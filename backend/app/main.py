"""JSON Diff API - FastAPI backend for JSON comparison."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import diff

app = FastAPI(
    title="Freebies JSON Comparer API",
    description="API for comparing JSON documents and visualizing differences - Freebies",
    version="1.0.0",
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://frontend-933362628329.us-east1.run.app", "https://onestopjson.com", "https://www.onestopjson.com","http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(diff.router, prefix="/api/v1", tags=["diff"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}
