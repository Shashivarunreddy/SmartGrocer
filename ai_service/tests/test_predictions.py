import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "1.0.0"

def test_replenishment_prediction_urgency():
    payload = {
        "household_size": 3,
        "shopping_frequency_days": 7,
        "pantry_items": [
            {
                "product_id": "prod-1",
                "name": "Whole Milk 2L",
                "category": "Dairies",
                "quantity": 0.5,
                "unit": "L",
            }
        ],
        "purchase_history": [
            {
                "product_id": "prod-1",
                "name": "Whole Milk 2L",
                "category": "Dairies",
                "quantity": 4.0,
                "unit": "L",
                "days_ago": 7.0,
            }
        ],
    }

    response = client.post("/api/v1/predict/replenishment", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["replenishments"]) > 0

    item = data["replenishments"][0]
    assert item["product_id"] == "prod-1"
    assert item["urgency"] in ["CRITICAL", "HIGH"]
    assert item["suggested_quantity"] >= 1.0
    assert "Household of 3" in item["reason"]

def test_waste_risk_analysis():
    payload = {
        "household_size": 1,
        "items": [
            {
                "product_id": "prod-cheese",
                "name": "Mature Cheddar 500g",
                "category": "Dairies",
                "quantity": 4.0,
                "unit": "pack",
                "expiry_days_left": 2.0,
            }
        ],
    }

    response = client.post("/api/v1/predict/waste-risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_at_risk"] == 1

    risk_item = data["at_risk_items"][0]
    assert risk_item["risk_level"] in ["CRITICAL", "HIGH"]
    assert risk_item["potential_waste_quantity"] > 0

def test_cheaper_alternatives():
    payload = {
        "basket_items": [
            {
                "product_id": "bread-artisan",
                "name": "Luxury Sourdough",
                "category": "Breads",
                "default_unit_price": 3.50,
                "quantity": 2.0,
            }
        ],
        "catalogue": [
            {
                "product_id": "bread-artisan",
                "name": "Luxury Sourdough",
                "category": "Breads",
                "default_unit_price": 3.50,
            },
            {
                "product_id": "bread-store",
                "name": "Store Fresh Toast Loaf",
                "brands": "SmartGrocer Select",
                "category": "Breads",
                "default_unit_price": 1.20,
            },
        ],
    }

    response = client.post("/api/v1/optimize/alternatives", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["potential_total_savings"] == 4.60  # (3.50 - 1.20) * 2 = 4.60
    assert len(data["substitutions"]) == 1
    assert data["substitutions"][0]["suggested_product_id"] == "bread-store"
