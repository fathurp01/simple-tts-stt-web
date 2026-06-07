from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from arithmetic_validator import ArithmeticValidator

# ------------------------------------------------------------------
# FastAPI application
# ------------------------------------------------------------------
app = FastAPI(
    title="Speech Technology UTS – Arithmetic Challenge API",
    version="1.0.0",
    description="Backend validation service for the Arithmetic Challenge engine.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

validator = ArithmeticValidator()

# ------------------------------------------------------------------
# Pydantic models
# ------------------------------------------------------------------
class EquationInput(BaseModel):
    equation: str = Field(..., min_length=1, description="Arithmetic equation string")
    language: str | None = Field(default="es", description="Language/model choice for TTS")


class ValidationOutput(BaseModel):
    valid: bool
    result: int | None = None
    errors: list[str] = []


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------
@app.get("/")
def root():
    return {
        "service": "Speech Technology UTS – Arithmetic Challenge Validator",
        "status": "running",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/validate", response_model=ValidationOutput)
def validate_equation_endpoint(data: EquationInput):
    result = validator.validate(data.equation)
    return result.to_dict()

from fastapi import File, UploadFile, Form
import speech_engine

@app.post("/api/v2t")
async def v2t_endpoint(file: UploadFile = File(...), top_db: int = Form(45)):
    audio_bytes = await file.read()
    
    try:
        pipeline_data = speech_engine.process_v2t(audio_bytes, top_db=top_db)
    except ValueError as e:
        return {
            "validation": {"valid": False, "errors": [str(e)]},
            "pipeline": None
        }
    
    validation_res = validator.validate(pipeline_data["transcription"])
    
    return {
        "validation": validation_res.to_dict(),
        "pipeline": pipeline_data
    }

@app.post("/api/t2v")
def t2v_endpoint(data: EquationInput):
    validation_res = validator.validate(data.equation)
    if not validation_res.valid:
        return {
            "validation": validation_res.to_dict(),
            "pipeline": None
        }
        
    pipeline_data = speech_engine.process_t2v(data.equation, language=data.language)
    return {
        "validation": validation_res.to_dict(),
        "pipeline": pipeline_data
    }

# ------------------------------------------------------------------
# Run with:  uvicorn app:app --reload --port 8000
# ------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
