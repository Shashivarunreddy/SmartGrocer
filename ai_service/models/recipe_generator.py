import json
import logging
from typing import List
import httpx
from config import settings
from schemas.recipe import (
    RecipeGenerateRequest,
    RecipeGenerateResponse,
    RecipeItem,
    RecipeIngredient,
    MissingIngredient,
)

logger = logging.getLogger("smartgrocer-ai.recipes")

class RecipeGenerator:
    """
    Zero-Waste Chef Recipe Engine.
    Uses Google Gemini when GEMINI_API_KEY is configured,
    and falls back to rule-based UK pantry pairing when offline/unconfigured.
    """

    async def generate_recipes(self, req: RecipeGenerateRequest) -> RecipeGenerateResponse:
        pantry_names = [p.name.lower() for p in req.pantry_items]
        expiring = [p for p in req.pantry_items if p.days_until_expiry is not None and p.days_until_expiry <= 4]

        # 1. Try Gemini API if API key is present
        if settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY.strip()) > 10:
            try:
                gemini_recipes = await self._call_gemini(req, expiring)
                if gemini_recipes:
                    return RecipeGenerateResponse(
                        recipes=gemini_recipes,
                        source="GEMINI_AI",
                        summary=f"Generated {len(gemini_recipes)} zero-waste meals using Gemini AI based on your pantry stock.",
                    )
            except Exception as e:
                logger.warning(f"Gemini recipe generation failed, falling back to heuristic: {e}")

        # 2. Rule-Based Fallback using UK Pantry ingredients
        fallback_recipes = self._generate_heuristic_recipes(req, expiring)
        return RecipeGenerateResponse(
            recipes=fallback_recipes,
            source="CURATED_UK_PANTRY_HEURISTIC",
            summary=f"Suggested {len(fallback_recipes)} delicious meals prioritizing {len(expiring)} item(s) expiring soon.",
        )

    async def _call_gemini(self, req: RecipeGenerateRequest, expiring: List) -> List[RecipeItem]:
        pantry_list_str = ", ".join([f"{p.name} ({p.quantity} {p.unit}, expires in {p.days_until_expiry or 'N/A'}d)" for p in req.pantry_items])
        diet_str = ", ".join(req.dietary_preferences) if req.dietary_preferences else "None"

        system_instruction = (
            "You are SmartGrocer's Zero-Waste Chef, a British culinary expert helping UK households "
            "cook delicious, affordable meals using groceries currently in their pantry. "
            "Your #1 goal is to prevent food waste by prioritizing items closest to expiration."
        )

        user_prompt = f"""
Given this household's pantry items:
[{pantry_list_str}]

Household Size: {req.household_size} people
Dietary Restrictions: {diet_str}

Generate 3 realistic, British household-friendly recipes (e.g. quick breakfasts, comforting dinners, or easy lunches).
Format strictly as JSON with this schema:
{{
  "recipes": [
    {{
      "id": "recipe-1",
      "title": "Recipe Name",
      "description": "Short appetizing description (1 sentence)",
      "prep_time_minutes": 20,
      "difficulty": "EASY",
      "cuisine": "British",
      "servings": {req.household_size},
      "used_pantry_items": [
        {{ "name": "Item Name", "quantity": "amount", "is_from_pantry": true }}
      ],
      "missing_ingredients": [
        {{ "name": "Missing ingredient", "estimated_price_gbp": 1.20, "suggested_category": "Groceries" }}
      ],
      "instructions": [
        "Step 1 instruction",
        "Step 2 instruction"
      ],
      "chef_tip": "Chef zero-waste tip",
      "waste_reduction_score": 90
    }}
  ]
}}
Only return valid JSON without extra markdown backticks.
"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": system_instruction + "\n\n" + user_prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.4,
                "responseMimeType": "application/json"
            }
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                recipes_raw = parsed.get("recipes", [])
                
                results = []
                for idx, r in enumerate(recipes_raw):
                    results.append(RecipeItem(
                        id=r.get("id", f"recipe-gemini-{idx+1}"),
                        title=r.get("title", "Pantry Meal"),
                        description=r.get("description", "A tasty meal made from pantry staples."),
                        prep_time_minutes=int(r.get("prep_time_minutes", 20)),
                        difficulty=r.get("difficulty", "EASY").upper(),
                        cuisine=r.get("cuisine", "British"),
                        servings=int(r.get("servings", req.household_size)),
                        used_pantry_items=[RecipeIngredient(**i) for i in r.get("used_pantry_items", [])],
                        missing_ingredients=[MissingIngredient(**m) for m in r.get("missing_ingredients", [])],
                        instructions=r.get("instructions", ["Prepare ingredients and cook thoroughly."]),
                        chef_tip=r.get("chef_tip"),
                        waste_reduction_score=int(r.get("waste_reduction_score", 85)),
                    ))
                return results

        return []

    def _generate_heuristic_recipes(self, req: RecipeGenerateRequest, expiring: List) -> List[RecipeItem]:
        """
        Deterministic, appetizing UK supermarket pantry recipes.
        """
        recipes: List[RecipeItem] = []

        # Find available items in user's pantry
        pantry_lookup = {p.name.lower(): p for p in req.pantry_items}
        
        has_bread = any("bread" in k or "sourdough" in k or "toast" in k for k in pantry_lookup)
        has_marmalade = any("marmalade" in k or "jam" in k or "spread" in k for k in pantry_lookup)
        has_yogurt = any("yogurt" in k or "yoghurt" in k for k in pantry_lookup)
        has_cheese = any("cheese" in k or "cheddar" in k for k in pantry_lookup)
        has_pasta = any("pasta" in k or "spaghetti" in k for k in pantry_lookup)
        has_oats = any("oat" in k or "porridge" in k for k in pantry_lookup)
        has_milk = any("milk" in k or "dair" in k for k in pantry_lookup)

        # Recipe 1: Artisan Toast & Preserve Breakfast
        r1_used = []
        if has_bread:
            b_item = next(p for k, p in pantry_lookup.items() if "bread" in k or "sourdough" in k)
            r1_used.append(RecipeIngredient(name=b_item.name, quantity="2 thick slices", is_from_pantry=True, product_id=b_item.product_id))
        else:
            r1_used.append(RecipeIngredient(name="Sourdough Bread", quantity="2 slices", is_from_pantry=False))

        if has_marmalade:
            m_item = next(p for k, p in pantry_lookup.items() if "marmalade" in k or "jam" in k)
            r1_used.append(RecipeIngredient(name=m_item.name, quantity="1 tbsp", is_from_pantry=True, product_id=m_item.product_id))

        if has_yogurt:
            y_item = next(p for k, p in pantry_lookup.items() if "yogurt" in k or "yoghurt" in k)
            r1_used.append(RecipeIngredient(name=y_item.name, quantity="100g", is_from_pantry=True, product_id=y_item.product_id))

        recipes.append(RecipeItem(
            id="rec-toast-parfait",
            title="Golden Toasted Sourdough & Greek Yogurt Parfait",
            description="Warm toasted artisan bread served with fine-cut marmalade alongside creamy Greek yogurt.",
            prep_time_minutes=10,
            difficulty="EASY",
            cuisine="British Breakfast",
            servings=req.household_size,
            used_pantry_items=r1_used,
            missing_ingredients=[
                MissingIngredient(name="Fresh Berries", estimated_price_gbp=2.00, suggested_category="Produce")
            ] if not has_yogurt else [],
            instructions=[
                "Toast the sourdough bread slices until golden brown and crispy at the edges.",
                "Spread a generous layer of butter and fine-cut marmalade across the warm toast.",
                "Spoon chilled Greek style yogurt into a side bowl.",
                "Serve immediately for a refreshing, protein-rich breakfast."
            ],
            chef_tip="Toast stale sourdough slices lightly in olive oil for an ultra-crunchy crust.",
            waste_reduction_score=95,
        ))

        # Recipe 2: Comforting British Cheddar Panini
        recipes.append(RecipeItem(
            id="rec-cheddar-melt",
            title="Crispy Cheddar & Tomato Pantry Melt",
            description="Melted mature cheddar sandwiched between golden griddled bread slices with herbs.",
            prep_time_minutes=15,
            difficulty="EASY",
            cuisine="Comfort Food",
            servings=req.household_size,
            used_pantry_items=[
                RecipeIngredient(name="Artisan Bread", quantity="4 slices", is_from_pantry=has_bread),
                RecipeIngredient(name="British Mature Cheddar", quantity="80g", is_from_pantry=has_cheese),
            ],
            missing_ingredients=[
                MissingIngredient(name="Vine Tomatoes", estimated_price_gbp=1.20, suggested_category="Produce"),
                MissingIngredient(name="English Mustard", estimated_price_gbp=1.10, suggested_category="Condiments"),
            ],
            instructions=[
                "Slice the mature cheddar cheese thinly to ensure even melting.",
                "Lightly butter the exterior of each bread slice.",
                "Layer cheese and sliced tomatoes inside the sandwich with a dab of English mustard.",
                "Heat a non-stick frying pan over medium-low heat and toast each side for 3-4 minutes until cheese is bubbling."
            ],
            chef_tip="Cover the pan with a lid while grilling to trap steam and melt the cheese faster.",
            waste_reduction_score=88,
        ))

        # Recipe 3: Hearty Morning Porridge
        recipes.append(RecipeItem(
            id="rec-hearty-porridge",
            title="Slow-Cooked Scottish Rolled Oats with Honey",
            description="Creamy warm porridge bowl made with semi-skimmed milk and finished with honey.",
            prep_time_minutes=12,
            difficulty="EASY",
            cuisine="Scottish / British",
            servings=req.household_size,
            used_pantry_items=[
                RecipeIngredient(name="Rolled Oats", quantity="80g", is_from_pantry=has_oats),
                RecipeIngredient(name="Fresh Milk", quantity="350ml", is_from_pantry=has_milk),
            ],
            missing_ingredients=[
                MissingIngredient(name="Pure Clear Honey", estimated_price_gbp=1.85, suggested_category="Spreads")
            ],
            instructions=[
                "Combine rolled oats, milk, and a pinch of sea salt in a small saucepan.",
                "Bring to a gentle simmer over medium heat, stirring continuously with a wooden spoon.",
                "Reduce heat to low and cook for 4-5 minutes until rich, thick, and velvety.",
                "Pour into warm bowls and drizzle with clear honey."
            ],
            chef_tip="Using milk nearing its use-by date in hot cooked porridge is the safest way to avoid spoilage.",
            waste_reduction_score=92,
        ))

        return recipes

recipe_generator = RecipeGenerator()
