from typing import List, Optional
from pydantic import BaseModel, Field

class PantryItemInput(BaseModel):
    product_id: str
    name: str
    category: str
    quantity: float = Field(ge=0)
    unit: str = "unit"
    days_since_purchase: Optional[float] = None
    expiry_days_left: Optional[float] = None

class PurchaseHistoryInput(BaseModel):
    product_id: str
    name: str
    category: str
    quantity: float = Field(gt=0)
    unit: str = "unit"
    days_ago: float = Field(ge=0)

class ReplenishmentRequest(BaseModel):
    household_size: int = Field(default=1, ge=1, le=20)
    shopping_frequency_days: int = Field(default=7, ge=1, le=30)
    pantry_items: List[PantryItemInput] = []
    purchase_history: List[PurchaseHistoryInput] = []
    target_budget: Optional[float] = None

class ReplenishmentItem(BaseModel):
    product_id: str
    product_name: str
    category: str
    suggested_quantity: float
    unit: str
    estimated_days_until_depleted: float
    urgency: str # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    confidence_score: float = Field(ge=0.0, le=1.0)
    reason: str

class ReplenishmentResponse(BaseModel):
    replenishments: List[ReplenishmentItem]
    model_version: str = "demand-v1.0.0"
    total_recommended_items: int
