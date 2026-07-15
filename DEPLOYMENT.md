# Deploying Freebies JSON Tools to Google Cloud Run

This guide covers deploying both the FastAPI backend and SvelteKit frontend to **Google Cloud Run**.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Architecture Options](#2-architecture-options)
3. [Option A: Two Separate Services (Recommended)](#3-option-a-two-separate-services)
4. [Option B: Single Combined Service](#4-option-b-single-combined-service)
5. [CI/CD with Cloud Build](#5-cicd-with-cloud-build)
6. [Custom Domain](#6-custom-domain)
7. [Monitoring & Logging](#7-monitoring--logging)
8. [Cost Optimization](#8-cost-optimization)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

```bash
# Install Google Cloud CLI
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# Create Artifact Registry repo (one-time)
gcloud artifacts repositories create freebies-json-tools \
  --repository-format=docker \
  --location=us-central1 \
  --description="Freebies JSON Tools container images"

# Configure Docker auth
gcloud auth configure-docker us-central1-docker.pkg.dev
```

Set these shell variables (used throughout this guide):

```bash
export PROJECT_ID=$(gcloud config get-value project)
export REGION=us-central1
export REGISTRY=us-central1-docker.pkg.dev/$PROJECT_ID/freebies-json-tools
```

---

## 2. Architecture Options

### Option A: Two Separate Cloud Run Services (Recommended)

```
                    ┌──────────────────┐
  Browser ──────────┤  Cloud Run       │
  /api/*            │  (backend)       │  ← FastAPI on port 8000
                    │  backend-service │
                    └──────────────────┘

  Browser ──────────┤  Cloud Run       │
  /*                │  (frontend)      │  ← SvelteKit Node on port 3000
                    │  frontend-service│
                    └──────────────────┘
```

**Pros**: Independent scaling, separate deploy cycles, better resource isolation.
**Cons**: Need to configure frontend to call backend URL (cross-origin).

### Option B: Single Combined Service

Bundle both into one container using a process manager. Simpler but less flexible.

---

## 3. Option A: Two Separate Services

### 3.1 Deploy the Backend

#### Update CORS for production

Edit `backend/app/main.py` to accept your production frontend URL:

```python
import os

allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]

# Add production frontend URL from environment
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Build & Push Backend Image

```bash
cd backend

# Build the image
docker build -t $REGISTRY/backend:latest .

# Push to Artifact Registry
docker push $REGISTRY/backend:latest
```

#### Deploy Backend to Cloud Run

```bash
gcloud run deploy backend-service \
  --image $REGISTRY/backend:latest \
  --region $REGION \
  --platform managed \
  --port 8000 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --allow-unauthenticated \
  --set-env-vars "PYTHONUNBUFFERED=1" \
  --set-env-vars "FRONTEND_URL=https://your-frontend-url.run.app"
```

Note the backend URL from the output (e.g., `https://backend-service-xxxxx.run.app`).

### 3.2 Deploy the Frontend

#### Update Frontend API Base URL

The frontend needs to know the backend URL in production. Update `frontend/src/lib/api.ts`:

```typescript
const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';
```

Then pass the backend URL at build time or configure the Vite proxy.

**Recommended approach** — set an environment variable at build time:

Create/update `frontend/.env.production`:

```bash
VITE_API_BASE=https://backend-service-xxxxx.run.app/api/v1
```

#### Build & Push Frontend Image

```bash
cd frontend

# Build the image
docker build -t $REGISTRY/frontend:latest .

# Push to Artifact Registry
docker push $REGISTRY/frontend:latest
```

#### Deploy Frontend to Cloud Run

```bash
gcloud run deploy frontend-service \
  --image $REGISTRY/frontend:latest \
  --region $REGION \
  --platform managed \
  --port 3000 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "ORIGIN=https://your-frontend-url.run.app"
```

> **Important**: The `ORIGIN` env var must match the actual URL Cloud Run assigns. After the first deploy, update it with the real URL:
>
> ```bash
> FRONTEND_URL=$(gcloud run services describe frontend-service --region $REGION --format 'value(status.url)')
> gcloud run services update frontend-service --region $REGION --set-env-vars "ORIGIN=$FRONTEND_URL"
> ```

---

## 4. Option B: Single Combined Service

### 4.1 Create a Combined Dockerfile

Create `Dockerfile` in the project root:

```dockerfile
# ── Stage 1: Build Frontend ──
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
# Point API calls to local backend (same container)
ENV VITE_API_BASE=/api/v1
RUN npm run build

# ── Stage 2: Backend + serve frontend ──
FROM python:3.13-slim
WORKDIR /app

# Install supervisord for process management
RUN apt-get update && apt-get install -y --no-install-recommends supervisor nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
RUN pip install uv
COPY backend/pyproject.toml backend/uv.lock ./backend/
WORKDIR /app/backend
RUN uv sync --no-dev
COPY backend/app ./app

# Copy built frontend
WORKDIR /app/frontend
COPY --from=frontend-builder /app/frontend/build ./build
COPY --from=frontend-builder /app/frontend/package.json ./
RUN npm ci --omit=dev

# Supervisor config
WORKDIR /app
COPY <<'EOF' /etc/supervisor/conf.d/app.conf
[supervisord]
nodaemon=true
logfile=/dev/null
logfile_maxbytes=0

[program:backend]
command=uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
directory=/app/backend
autostart=true
autorestart=true
stdout_logfile=/dev/fd/1
stdout_logfile_maxbytes=0
redirect_stderr=true

[program:frontend]
command=node build
directory=/app/frontend
environment=NODE_ENV="production",PORT="3000",ORIGIN="%(ENV_ORIGIN)s"
autostart=true
autorestart=true
stdout_logfile=/dev/fd/1
stdout_logfile_maxbytes=0
redirect_stderr=true
EOF

# Cloud Run uses PORT env var — expose 8080 and use nginx to route
# For simplicity, we'll run both and have Cloud Run point to frontend port
EXPOSE 3000

ENV ORIGIN=http://localhost:3000
ENV PORT=3000

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/app.conf"]
```

> **Note**: Cloud Run expects a single `PORT`. In the combined approach, frontend is the entry point on port 3000, and the frontend's Vite config proxy forwards `/api` to the backend on 8000 internally. For production SvelteKit with adapter-node, you need a server hook to proxy API calls.

### 4.2 Deploy Combined Service

```bash
# Build from project root
docker build -t $REGISTRY/freebies-json-tools:latest .

docker push $REGISTRY/freebies-json-tools:latest

gcloud run deploy freebies-json-tools \
  --image $REGISTRY/freebies-json-tools:latest \
  --region $REGION \
  --platform managed \
  --port 3000 \
  --memory 1Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 5 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,PYTHONUNBUFFERED=1"

# Update ORIGIN with the actual URL
SERVICE_URL=$(gcloud run services describe freebies-json-tools --region $REGION --format 'value(status.url)')
gcloud run services update freebies-json-tools --region $REGION --set-env-vars "ORIGIN=$SERVICE_URL"
```

---

## 5. CI/CD with Cloud Build

### 5.1 Create `cloudbuild.yaml`

Create this in the project root for the **two-service** approach:

```yaml
# cloudbuild.yaml
steps:
  # ── Build Backend ──
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - '${_REGISTRY}/backend:$SHORT_SHA'
      - '-t'
      - '${_REGISTRY}/backend:latest'
      - './backend'
    id: 'build-backend'

  # ── Build Frontend ──
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - '${_REGISTRY}/frontend:$SHORT_SHA'
      - '-t'
      - '${_REGISTRY}/frontend:latest'
      - './frontend'
    id: 'build-frontend'

  # ── Push Backend ──
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '--all-tags', '${_REGISTRY}/backend']
    id: 'push-backend'
    waitFor: ['build-backend']

  # ── Push Frontend ──
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '--all-tags', '${_REGISTRY}/frontend']
    id: 'push-frontend'
    waitFor: ['build-frontend']

  # ── Deploy Backend ──
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'backend-service'
      - '--image=${_REGISTRY}/backend:$SHORT_SHA'
      - '--region=${_REGION}'
      - '--platform=managed'
      - '--port=8000'
      - '--memory=512Mi'
      - '--allow-unauthenticated'
    id: 'deploy-backend'
    waitFor: ['push-backend']

  # ── Deploy Frontend ──
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'frontend-service'
      - '--image=${_REGISTRY}/frontend:$SHORT_SHA'
      - '--region=${_REGION}'
      - '--platform=managed'
      - '--port=3000'
      - '--memory=256Mi'
      - '--allow-unauthenticated'
    id: 'deploy-frontend'
    waitFor: ['push-frontend']

substitutions:
  _REGION: us-central1
  _REGISTRY: us-central1-docker.pkg.dev/$PROJECT_ID/freebies-json-tools

options:
  logging: CLOUD_LOGGING_ONLY
```

### 5.2 Set Up Trigger

```bash
# Connect your GitHub repo first (via Cloud Console or CLI)
gcloud builds triggers create github \
  --name="deploy-freebies-json-tools" \
  --repo-name="json-diff-app" \
  --repo-owner="YOUR_GITHUB_USERNAME" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml"
```

Or trigger manually:

```bash
gcloud builds submit --config=cloudbuild.yaml .
```

---

## 6. Custom Domain

### Map a custom domain to Cloud Run

```bash
# Verify domain ownership (one-time)
gcloud domains verify your-domain.com

# Map domain to the frontend service
gcloud run domain-mappings create \
  --service frontend-service \
  --domain json-tools.your-domain.com \
  --region $REGION

# Map a subdomain for the API (optional)
gcloud run domain-mappings create \
  --service backend-service \
  --domain api.json-tools.your-domain.com \
  --region $REGION
```

Then add the DNS records shown by the command to your domain registrar.

After domain mapping, update:
1. Backend CORS: `FRONTEND_URL=https://json-tools.your-domain.com`
2. Frontend API base: `VITE_API_BASE=https://api.json-tools.your-domain.com/api/v1`
3. Frontend ORIGIN: `ORIGIN=https://json-tools.your-domain.com`

---

## 7. Monitoring & Logging

### View Logs

```bash
# Backend logs
gcloud run services logs read backend-service --region $REGION --limit 50

# Frontend logs
gcloud run services logs read frontend-service --region $REGION --limit 50

# Tail logs in real-time
gcloud run services logs tail backend-service --region $REGION
```

### Health Check

Cloud Run automatically checks your container starts responding on the configured port. The backend also exposes `/health`:

```bash
BACKEND_URL=$(gcloud run services describe backend-service --region $REGION --format 'value(status.url)')
curl $BACKEND_URL/health
# → {"status":"healthy","version":"1.0.0"}
```

### Set Up Alerts (Optional)

```bash
# Alert on high error rate
gcloud monitoring policies create \
  --display-name="Cloud Run 5xx errors" \
  --condition-display-name="Error rate > 5%" \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"'
```

---

## 8. Cost Optimization

### Cloud Run Pricing Tips

| Setting | Recommendation | Why |
|---------|---------------|-----|
| `--min-instances 0` | Use zero for dev/staging | Scales to zero when idle (no cost) |
| `--min-instances 1` | Use for production | Avoids cold start latency |
| `--max-instances 5` | Start low | Prevents runaway costs |
| `--memory 256Mi` | Frontend | SvelteKit Node server is lightweight |
| `--memory 512Mi` | Backend | FastAPI + Polars needs more memory |
| `--cpu 1` | Both services | Sufficient for moderate traffic |
| `--cpu-throttling` | Default (enabled) | CPU only allocated during requests |

### Estimated Monthly Cost (Low Traffic)

| Resource | Cost |
|----------|------|
| Cloud Run (scales to 0) | ~$0–5/month |
| Artifact Registry | ~$0.10/GB/month |
| Cloud Build (free tier) | 120 min/day free |
| Custom domain | No extra cost on Cloud Run |

---

## 9. Troubleshooting

### Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| CORS errors in browser | Backend doesn't allow frontend origin | Add `FRONTEND_URL` env var to backend service |
| `ORIGIN` mismatch error | SvelteKit rejects requests from unknown origin | Set `ORIGIN` env var to the Cloud Run URL |
| Container fails to start | Port mismatch | Ensure `--port` matches what the app listens on (8000/3000) |
| Cold start slow (>5s) | Python + Polars import overhead | Set `--min-instances 1` for production |
| 502 Bad Gateway | Container not ready in time | Increase startup probe timeout: `--cpu-boost` |
| `npm run build` fails | Missing env vars at build time | Set `VITE_*` vars in Dockerfile or `.env.production` |

### Useful Debug Commands

```bash
# Check service status
gcloud run services describe backend-service --region $REGION

# Check recent revisions
gcloud run revisions list --service backend-service --region $REGION

# Run container locally to test
docker run -p 8000:8000 $REGISTRY/backend:latest
docker run -p 3000:3000 -e ORIGIN=http://localhost:3000 $REGISTRY/frontend:latest

# Re-deploy with a specific image tag
gcloud run deploy backend-service \
  --image $REGISTRY/backend:abc123 \
  --region $REGION

# Roll back to previous revision
gcloud run services update-traffic backend-service \
  --to-revisions PREVIOUS_REVISION=100 \
  --region $REGION
```

---

## Quick Reference: Full Deploy Script

```bash
#!/bin/bash
# deploy.sh — Deploy both services to Cloud Run
set -euo pipefail

PROJECT_ID=$(gcloud config get-value project)
REGION=us-central1
REGISTRY=us-central1-docker.pkg.dev/$PROJECT_ID/freebies-json-tools
TAG=$(git rev-parse --short HEAD)

echo "==> Building backend..."
docker build -t $REGISTRY/backend:$TAG -t $REGISTRY/backend:latest ./backend
docker push $REGISTRY/backend:$TAG
docker push $REGISTRY/backend:latest

echo "==> Building frontend..."
docker build -t $REGISTRY/frontend:$TAG -t $REGISTRY/frontend:latest ./frontend
docker push $REGISTRY/frontend:$TAG
docker push $REGISTRY/frontend:latest

echo "==> Deploying backend..."
gcloud run deploy backend-service \
  --image $REGISTRY/backend:$TAG \
  --region $REGION \
  --port 8000 \
  --memory 512Mi \
  --allow-unauthenticated \
  --quiet

echo "==> Deploying frontend..."
gcloud run deploy frontend-service \
  --image $REGISTRY/frontend:$TAG \
  --region $REGION \
  --port 3000 \
  --memory 256Mi \
  --allow-unauthenticated \
  --quiet

BACKEND_URL=$(gcloud run services describe backend-service --region $REGION --format 'value(status.url)')
FRONTEND_URL=$(gcloud run services describe frontend-service --region $REGION --format 'value(status.url)')

echo ""
echo "==> Deployment complete!"
echo "    Frontend: $FRONTEND_URL"
echo "    Backend:  $BACKEND_URL"
echo "    API Docs: $BACKEND_URL/docs"
```
