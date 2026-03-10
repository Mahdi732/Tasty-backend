from fastapi import FastAPI, File, HTTPException, UploadFile
import cv2
import numpy as np
from insightface.app import FaceAnalysis


app = FastAPI(title="tasty-python-embedder", version="2.0.0")

MODEL_NAME = "buffalo_l"
MODEL_VERSION = "insightface-buffalo_l-arcface"
TARGET_DIMENSION = 512
ID_FACE_THRESHOLD = 0.42
SPOOF_THRESHOLD = 0.58

face_app = FaceAnalysis(name=MODEL_NAME, providers=["CPUExecutionProvider"])
face_app.prepare(ctx_id=-1, det_size=(640, 640))


def largest_face(faces):
    if not faces:
        return None
    return max(faces, key=lambda face: (face.bbox[2] - face.bbox[0]) * (face.bbox[3] - face.bbox[1]))


def decode_image(content: bytes):
    np_buffer = np.frombuffer(content, dtype=np.uint8)
    image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image bytes")
    return image


def anti_spoof_score(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    reasons = []
    score = 0.0

    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if lap_var < 45:
        score += 0.28
        reasons.append("LOW_TEXTURE_OR_BLUR")

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    glare_ratio = float(np.mean((hsv[:, :, 1] < 35) & (hsv[:, :, 2] > 240)))
    if glare_ratio > 0.05:
        score += 0.22
        reasons.append("SCREEN_GLARE_PATTERN")

    edges = cv2.Canny(gray, 80, 160)
    border_width = max(2, int(min(h, w) * 0.04))
    border = np.zeros_like(edges)
    border[:border_width, :] = 255
    border[-border_width:, :] = 255
    border[:, :border_width] = 255
    border[:, -border_width:] = 255
    border_edges_ratio = float(np.sum((edges > 0) & (border > 0)) / max(np.sum(edges > 0), 1))
    if border_edges_ratio > 0.35:
        score += 0.28
        reasons.append("SCREEN_BORDER_EDGES")

    fft = np.fft.fftshift(np.fft.fft2(gray))
    spectrum = np.log(np.abs(fft) + 1.0)
    center_h, center_w = h // 2, w // 2
    central_band = spectrum[center_h - 8:center_h + 8, center_w - 8:center_w + 8]
    full_mean = float(np.mean(spectrum))
    central_mean = float(np.mean(central_band)) if central_band.size else 0.0
    if full_mean > 0 and (central_mean / full_mean) < 0.8:
        score += 0.18
        reasons.append("MOIRE_OR_RECAPTURE_FREQUENCY")

    score = min(score, 1.0)
    return {
        "spoofScore": score,
        "isSpoof": score >= SPOOF_THRESHOLD,
        "reasons": reasons,
    }


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL_VERSION}


@app.post("/embed")
async def embed(image_file: UploadFile = File(...)):
    content = await image_file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Image file is empty")

    image = decode_image(content)

    spoof = anti_spoof_score(image)
    if spoof["isSpoof"]:
        raise HTTPException(status_code=422, detail={
            "message": "Input appears to be re-photographed screen / spoofed image",
            "livenessStatus": "SPOOF_SUSPECT",
            "spoofScore": spoof["spoofScore"],
            "reasons": spoof["reasons"],
        })

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
        "livenessStatus": "LIVE",
        "spoofScore": spoof["spoofScore"],
        "reasons": spoof["reasons"],
    }


@app.post("/compare-id")
async def compare_id(id_card_file: UploadFile = File(...), live_file: UploadFile = File(...)):
    id_content = await id_card_file.read()
    live_content = await live_file.read()

    if not id_content or not live_content:
        raise HTTPException(status_code=400, detail="ID card and live image are required")

    id_image = decode_image(id_content)
    live_image = decode_image(live_content)

    spoof = anti_spoof_score(live_image)
    if spoof["isSpoof"]:
        return {
            "matched": False,
            "score": 0.0,
            "threshold": ID_FACE_THRESHOLD,
            "livenessStatus": "SPOOF_SUSPECT",
            "spoofScore": spoof["spoofScore"],
            "reasons": spoof["reasons"],
        }

    id_faces = face_app.get(id_image)
    live_faces = face_app.get(live_image)

    id_face = largest_face(id_faces)
    live_face = largest_face(live_faces)

    if id_face is None or live_face is None:
        raise HTTPException(status_code=422, detail="No face detected in ID or live image")

    score = float(np.dot(id_face.normed_embedding, live_face.normed_embedding))

    return {
        "matched": score >= ID_FACE_THRESHOLD,
        "score": score,
        "threshold": ID_FACE_THRESHOLD,
        "livenessStatus": "LIVE",
        "spoofScore": spoof["spoofScore"],
        "reasons": spoof["reasons"],
    }
