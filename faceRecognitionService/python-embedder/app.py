from fastapi import FastAPI, File, HTTPException, UploadFile
import cv2
import numpy as np
from insightface.app import FaceAnalysis


app = FastAPI(title="tasty-python-embedder", version="2.0.0")

MODEL_NAME = "buffalo_l"
MODEL_VERSION = "insightface-buffalo_l-arcface"
TARGET_DIMENSION = 512

face_app = FaceAnalysis(name=MODEL_NAME, providers=["CPUExecutionProvider"])
face_app.prepare(ctx_id=-1, det_size=(640, 640))


def largest_face(faces):
    if not faces:
        return None
    return max(faces, key=lambda face: (face.bbox[2] - face.bbox[0]) * (face.bbox[3] - face.bbox[1]))


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL_VERSION}


@app.post("/embed")
async def embed(image_file: UploadFile = File(...)):
    content = await image_file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Image file is empty")

    np_buffer = np.frombuffer(content, dtype=np.uint8)
    image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image bytes")

    faces = face_app.get(image)
    target = largest_face(faces)
    if target is None:
        raise HTTPException(status_code=422, detail="No face detected in image")

    embedding = target.normed_embedding
    dimension = int(embedding.shape[0])
    if dimension != TARGET_DIMENSION:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected embedding dimension: {dimension}, expected {TARGET_DIMENSION}",
        )

    quality_score = float(getattr(target, "det_score", 0.0))

    return {
        "embedding": embedding.astype(float).tolist(),
        "dimension": dimension,
        "modelVersion": MODEL_VERSION,
        "qualityScore": quality_score,
    }
