from typing import List
from pydantic import BaseModel, Field

class WasteRiskItemInput(BaseModel):
    product_id: str
    name: str
    category: str
    quantity: float = Field(gt=0)
    unit: str = "unit"
    expiry_days_left: float

class WasteRiskRequest(BaseModel):
    household_size: int = Field(default=1, ge=1, le=20)
    items: List[WasteRiskItemInput]

class WasteRiskItem(BaseModel):
    product_id: str
    product_name: str
    quantity: float
    unit: str
    days_until_expiry: float
    estimated_days_to_consume: float
    risk_level: str # "CRITICAL" | "HIGH" | "MODERATE" | "LOW"
    potential_waste_quantity: float
    suggested_action: str

class WasteRiskResponse(BaseModel):
    at_risk_items: List[WasteRiskItem]
    total_at_risk: int
    summary: str
