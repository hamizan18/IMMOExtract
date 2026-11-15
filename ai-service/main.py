from fastapi import FastAPI

app = FastAPI(title="IMMOExtract AI Service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {"status": "ok", "service": "ai-service", "model_loaded": False}
