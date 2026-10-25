from typing import List, Optional
from pydantic import BaseModel, Field

class BasketItemInput(BaseModel):
    product_id: str
    name: str
    category: str
    default_unit_price: float = Field(ge=0)
    quantity: float = Field(gt=0, default=1.0)

class CatalogueProductInput(BaseModel):
    product_id: str
    name: str
    brands: Optional[str] = None
    category: str
    default_unit_price: float = Field(ge=0)
    unit: str = "unit"

class AlternativesRequest(BaseModel):
    basket_items: List[BasketItemInput]
    catalogue: List[CatalogueProductInput]
    target_budget: Optional[float] = None

class SubstitutionSuggestion(BaseModel):
    original_product_id: str
    original_product_name: str
    original_price: float
    suggested_product_id: str
    suggested_product_name: str
    suggested_price: float
    estimated_savings: float
    reason: str

class AlternativesResponse(BaseModel):
    potential_total_savings: float
    substitutions: List[SubstitutionSuggestion]
    summary: str
