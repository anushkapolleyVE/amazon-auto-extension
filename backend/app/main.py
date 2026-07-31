from fastapi import FastAPI

# Import all models so SQLAlchemy registers relationships
import app.models

from app.api.auth import router as auth_router
from app.api.products import router as product_router

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Amazon Extension API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(product_router)
from app.api.history import router as history_router

app.include_router(history_router)

@app.get("/")
def home():
    return {
        "message": "Backend Running Successfully"
    }