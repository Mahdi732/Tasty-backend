# Tasty Face Recognition Service (Standalone)

A black-box face recognition service for activation, anti-fraud watchlist search, and verification.

## Capabilities

- Face activation (one-time embedding generation + storage)
- Anti-fraud / debtor search against watchlist vectors
- Face verification (1:1 compare)
- MongoDB Atlas Vector Search hook via `$vectorSearch`
- Python embedding worker bridge

## Stack

- Node.js (JavaScript), Express, Mongoose
- Python FastAPI worker for embedding extraction
- MongoDB (Atlas Vector Search compatible model)

## Run

1. Copy `.env.example` to `.env`
2. Start with Docker:
   - `docker compose up --build`
3. Health checks:
   - `GET http://localhost:4030/v1/health`
   - `GET http://localhost:4030/v1/ready`

### Run Python worker locally (without Docker)

From `python-embedder/`:

1. Create virtual environment:
   - `python -m venv .venv`
2. Activate it:
   - PowerShell: `.venv\\Scripts\\Activate.ps1`
3. Install dependencies:
   - `pip install -r requirements.txt`
4. Start worker:
   - `uvicorn app:app --host 0.0.0.0 --port 8081`

Then run Node service from root folder:

- `npm install`
- `npm run start`

## API

- `POST /v1/faces/activate`
- `POST /v1/faces/search`
- `POST /v1/faces/verify`

Use header `x-api-key: <SERVICE_API_KEY>`.

## Postman Collection

- Collection path: `postman/faceRecognitionService.postman_collection.json`
- Import in Postman, then set variables:
   - `baseUrl` (default `http://localhost:4030`)
   - `apiKey` (must match `SERVICE_API_KEY`)
   - `tenantId`, `personRef*`
   - `imageBase64*` with real face image base64 payloads

Recommended order:

1. Activate Normal face
2. Activate Banned/Debtor entries
3. Search using probe face against `BANNED` + `DEBTOR`
4. Verify against known `personRef`

## Notes

- Python worker now uses InsightFace ArcFace (`buffalo_l`) on CPU.
- Use `scripts/create-vector-index.js` as a starter for Atlas vector index setup.
