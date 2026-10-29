import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_recipe_generation_endpoint():
    payload = {
        "household_size": 2,
        "dietary_preferences": ["Vegetarian"],
        "pantry_items": [
            {
                "product_id": "test-bread-1",
                "name": "Artisan Sourdough Loaf",
                "category": "Breads",
                "quantity": 1,
                "unit": "loaf",
                "days_until_expiry": 2.0
            },
            {
                "product_id": "test-cheese-1",
                "name": "British Mature Cheddar",
                "category": "Dairies",
                "quantity": 100,
                "unit": "g",
                "days_until_expiry": 5.0
            }
        ]
    }

    response = client.post("/api/v1/recipes/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "recipes" in data
    assert len(data["recipes"]) > 0
    assert "source" in data
    assert data["recipes"][0]["servings"] == 2
    assert len(data["recipes"][0]["instructions"]) > 0
