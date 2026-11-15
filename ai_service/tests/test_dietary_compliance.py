import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

FORBIDDEN_MEAT_KEYWORDS = ["chicken", "beef", "pork", "bacon", "salmon", "fish", "meat", "lamb", "turkey"]
FORBIDDEN_DAIRY_KEYWORDS = ["milk", "cheddar", "cheese", "cream", "butter", "yogurt", "yoghurt", "parmesan", "mozzarella"]
FORBIDDEN_EGG_KEYWORDS = ["egg", "eggs", "mayonnaise"]
FORBIDDEN_GLUTEN_KEYWORDS = ["penne", "spaghetti", "pasta", "sourdough", "bread", "toast", "flour", "wheat"]
FORBIDDEN_NUT_KEYWORDS = ["peanut", "peanuts", "almond", "almonds", "cashew", "walnut", "hazelnut", "pecan"]


def _extract_all_text(recipes):
    all_tokens = []
    for r in recipes:
        all_tokens.append(r.get("title", "").lower())
        all_tokens.append(r.get("description", "").lower())
        for ing in r.get("used_pantry_items", []):
            all_tokens.append(ing.get("name", "").lower())
        for ing in r.get("missing_ingredients", []):
            all_tokens.append(ing.get("name", "").lower())
    return " ".join(all_tokens)


def test_vegan_dietary_compliance():
    """Verify that requesting Vegan produces recipes with 0 meat, 0 dairy, and 0 eggs."""
    payload = {
        "household_size": 2,
        "dietary_preferences": ["Vegan"],
        "pantry_items": [
            {"product_id": "p1", "name": "Baking Potatoes", "category": "Fresh Produce", "quantity": 2, "unit": "kg", "days_until_expiry": 4.0},
            {"product_id": "p2", "name": "Baked Beans", "category": "Pantry", "quantity": 1, "unit": "tin", "days_until_expiry": 10.0},
        ],
    }
    resp = client.post("/api/v1/recipes/generate", json=payload)
    assert resp.status_code == 200
    recipes = resp.json().get("recipes", [])
    assert len(recipes) > 0

    full_text = _extract_all_text(recipes)
    for meat in FORBIDDEN_MEAT_KEYWORDS:
        assert meat not in full_text, f"Vegan recipe contained forbidden meat: {meat}"
    for dairy in FORBIDDEN_DAIRY_KEYWORDS:
        assert dairy not in full_text, f"Vegan recipe contained forbidden dairy: {dairy}"
    for egg in FORBIDDEN_EGG_KEYWORDS:
        assert egg not in full_text, f"Vegan recipe contained forbidden egg: {egg}"


def test_gluten_free_dietary_compliance():
    """Verify that requesting Gluten-Free produces recipes with 0 gluten ingredients."""
    payload = {
        "household_size": 3,
        "dietary_preferences": ["Gluten-Free"],
        "pantry_items": [
            {"product_id": "p1", "name": "Basmati Rice", "category": "Pantry", "quantity": 500, "unit": "g", "days_until_expiry": 20.0},
            {"product_id": "p2", "name": "Baking Potatoes", "category": "Fresh Produce", "quantity": 2, "unit": "kg", "days_until_expiry": 5.0},
        ],
    }
    resp = client.post("/api/v1/recipes/generate", json=payload)
    assert resp.status_code == 200
    recipes = resp.json().get("recipes", [])
    assert len(recipes) > 0

    full_text = _extract_all_text(recipes)
    for gluten in FORBIDDEN_GLUTEN_KEYWORDS:
        assert gluten not in full_text, f"Gluten-Free recipe contained forbidden gluten: {gluten}"


def test_dairy_free_dietary_compliance():
    """Verify that requesting Dairy-Free produces recipes with 0 dairy ingredients."""
    payload = {
        "household_size": 1,
        "dietary_preferences": ["Dairy-Free"],
        "pantry_items": [
            {"product_id": "p1", "name": "Basmati Rice", "category": "Pantry", "quantity": 500, "unit": "g", "days_until_expiry": 15.0},
        ],
    }
    resp = client.post("/api/v1/recipes/generate", json=payload)
    assert resp.status_code == 200
    recipes = resp.json().get("recipes", [])
    assert len(recipes) > 0

    full_text = _extract_all_text(recipes)
    for dairy in FORBIDDEN_DAIRY_KEYWORDS:
        assert dairy not in full_text, f"Dairy-Free recipe contained forbidden dairy: {dairy}"


def test_nut_allergy_dietary_compliance():
    """Verify that requesting Nut Allergy produces recipes with 0 nut ingredients."""
    payload = {
        "household_size": 2,
        "dietary_preferences": ["Nut Allergy"],
        "pantry_items": [
            {"product_id": "p1", "name": "Baking Potatoes", "category": "Fresh Produce", "quantity": 2, "unit": "kg", "days_until_expiry": 5.0},
        ],
    }
    resp = client.post("/api/v1/recipes/generate", json=payload)
    assert resp.status_code == 200
    recipes = resp.json().get("recipes", [])
    assert len(recipes) > 0

    full_text = _extract_all_text(recipes)
    for nut in FORBIDDEN_NUT_KEYWORDS:
        assert nut not in full_text, f"Nut Allergy recipe contained forbidden nuts: {nut}"


def test_combined_vegan_and_gluten_free_compliance():
    """Verify that combined Vegan + Gluten-Free satisfies both dietary constraints."""
    payload = {
        "household_size": 4,
        "dietary_preferences": ["Vegan", "Gluten-Free"],
        "pantry_items": [
            {"product_id": "p1", "name": "Basmati Rice", "category": "Pantry", "quantity": 1, "unit": "kg", "days_until_expiry": 30.0},
        ],
    }
    resp = client.post("/api/v1/recipes/generate", json=payload)
    assert resp.status_code == 200
    recipes = resp.json().get("recipes", [])
    assert len(recipes) > 0

    full_text = _extract_all_text(recipes)
    for meat in FORBIDDEN_MEAT_KEYWORDS:
        assert meat not in full_text, f"Vegan+GF recipe contained forbidden meat: {meat}"
    for dairy in FORBIDDEN_DAIRY_KEYWORDS:
        assert dairy not in full_text, f"Vegan+GF recipe contained forbidden dairy: {dairy}"
    for gluten in FORBIDDEN_GLUTEN_KEYWORDS:
        assert gluten not in full_text, f"Vegan+GF recipe contained forbidden gluten: {gluten}"

