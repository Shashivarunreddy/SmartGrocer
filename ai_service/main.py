import logging
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from schemas import (
    ReplenishmentRequest,
    ReplenishmentResponse,
    WasteRiskRequest,
    WasteRiskResponse,
    AlternativesRequest,
    AlternativesResponse,
)
from models import (
    demand_predictor,
    waste_analyzer,
    alternative_finder,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smartgrocer-ai")

app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.SERVICE_VERSION,
    description="Microservice providing demand prediction, consumption rate analysis, food waste prevention, and basket cost optimization for SmartGrocer.",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
async def health_check():
    """Service liveness probe"""
    return {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
    }

@app.post(
    f"{settings.API_V1_STR}/predict/replenishment",
    response_model=ReplenishmentResponse,
    status_code=status.HTTP_200_OK,
    tags=["Predictions"],
    summary="Predict grocery items requiring replenishment",
)
async def predict_replenishment(request: ReplenishmentRequest):
    """
    Predicts which products will deplete before the next planned shopping trip
    based on household size, consumption baseline, and active pantry inventory.
    """
    logger.info(
        f"Processing replenishment prediction for household_size={request.household_size}, "
        f"frequency={request.shopping_frequency_days}d"
    )
    return demand_predictor.predict(request)

@app.post(
    f"{settings.API_V1_STR}/predict/waste-risk",
    response_model=WasteRiskResponse,
    status_code=status.HTTP_200_OK,
    tags=["Predictions"],
    summary="Analyze pantry stock for spoilage and food waste risk",
)
async def predict_waste_risk(request: WasteRiskRequest):
    """
    Compares shelf life against household consumption capacity to flag items at risk
    of spoiling before they can be completely consumed.
    """
    logger.info(f"Analyzing waste risk for {len(request.items)} pantry items")
    return waste_analyzer.analyze(request)

@app.post(
    f"{settings.API_V1_STR}/optimize/alternatives",
    response_model=AlternativesResponse,
    status_code=status.HTTP_200_OK,
    tags=["Optimization"],
    summary="Find cheaper product alternatives within the catalogue",
)
async def find_cheaper_alternatives(request: AlternativesRequest):
    """
    Identifies high-value substitutes in the catalogue within the same category to reduce
    the total shopping bill.
    """
    logger.info(f"Finding alternatives for {len(request.basket_items)} basket items")
    return alternative_finder.find_alternatives(request)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
