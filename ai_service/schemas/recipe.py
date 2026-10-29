from typing import List, Optional
from pydantic import BaseModel, Field

class PantryItemInput(BaseModel):
    product_id: str
    name: str
    category: str
    quantity: float
    unit: str = "unit"
    days_until_expiry: Optional[float] = None

class RecipeGenerateRequest(BaseModel):
    household_size: int = Field(default=2, ge=1)
    dietary_preferences: List[str] = Field(default_factory=list)
    pantry_items: List[PantryItemInput] = Field(default_factory=list)
    meal_type: Optional[str] = "dinner"  # breakfast, lunch, dinner, snack

class RecipeIngredient(BaseModel):
    name: str
    quantity: str
    is_from_pantry: bool = True
    product_id: Optional[str] = None

class MissingIngredient(BaseModel):
    name: str
    estimated_price_gbp: float = 1.50
    suggested_category: str = "Groceries"

class RecipeItem(BaseModel):
    id: str
    title: str
    description: str
    prep_time_minutes: int
    difficulty: str  # EASY, MEDIUM, HARD
    cuisine: str
    servings: int
    used_pantry_items: List[RecipeIngredient]
    missing_ingredients: List[MissingIngredient]
    instructions: List[str]
    chef_tip: Optional[str] = None
    waste_reduction_score: int = Field(default=85, description="Percentage of expiring stock rescued")

class RecipeGenerateResponse(BaseModel):
    recipes: List[RecipeItem]
    source: str  # "GEMINI_AI" or "CURATED_UK_PANTRY_HEURISTIC"
    summary: str
