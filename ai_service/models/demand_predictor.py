import math
from typing import List, Dict
from schemas.replenishment import (
    ReplenishmentRequest,
    ReplenishmentItem,
    ReplenishmentResponse,
)

# Standard UK household daily consumption baselines (per person per day)
CATEGORY_DAILY_CONSUMPTION_PER_PERSON: Dict[str, float] = {
    "dairies": 0.35,        # ~0.35L or units/day
    "breads": 0.18,         # ~0.18 loaves/day
    "groceries": 0.25,      # general staple
    "breakfast": 0.20,      # cereals/oats
    "beverages": 0.40,      # tea/coffee/juices
    "snacks": 0.20,         # biscuits/crisps
    "spreads": 0.05,        # butter/jam/nutella
}

class DemandPredictor:
    """
    Predicts grocery replenishment demand combining statistical consumption rates,
    user purchase frequency, household size, and active pantry stock.
    """

    MODEL_VERSION = "demand-v1.2.0"

    def predict(self, req: ReplenishmentRequest) -> ReplenishmentResponse:
        household = max(1, req.household_size)
        frequency = max(1, req.shopping_frequency_days)
        pantry_map = {p.product_id: p for p in req.pantry_items}

        # Step 1: Compute historical consumption rates per product
        history_by_product: Dict[str, List] = {}
        for h in req.purchase_history:
            history_by_product.setdefault(h.product_id, []).append(h)

        replenishments: List[ReplenishmentItem] = []

        # Step 2: Evaluate products in purchase history
        evaluated_ids = set()
        for prod_id, purchases in history_by_product.items():
            evaluated_ids.add(prod_id)
            latest = purchases[0]
            cat_key = latest.category.lower().strip()
            base_daily_per_person = CATEGORY_DAILY_CONSUMPTION_PER_PERSON.get(cat_key, 0.25)
            default_daily = base_daily_per_person * household

            # Calculate personalized rate if history has multiple records
            if len(purchases) >= 2:
                sorted_p = sorted(purchases, key=lambda x: x.days_ago)
                time_span = max(1.0, sorted_p[-1].days_ago - sorted_p[0].days_ago)
                total_qty = sum(p.quantity for p in sorted_p)
                observed_daily = total_qty / time_span
                # Blend observed rate (70%) with baseline (30%)
                daily_consumption = (0.7 * observed_daily) + (0.3 * default_daily)
                confidence = min(0.95, 0.65 + (len(purchases) * 0.05))
            else:
                daily_consumption = default_daily
                confidence = 0.70

            # Check pantry stock
            pantry_item = pantry_map.get(prod_id)
            current_stock = pantry_item.quantity if pantry_item else 0.0

            days_until_empty = current_stock / max(0.01, daily_consumption)

            # Needs replenishment if it runs out before next shopping cycle
            if days_until_empty <= frequency:
                needed = (daily_consumption * frequency) - current_stock
                suggested_qty = max(1.0, math.ceil(needed))

                if days_until_empty <= 1.5:
                    urgency = "CRITICAL"
                elif days_until_empty <= 3.5:
                    urgency = "HIGH"
                else:
                    urgency = "MEDIUM"

                reason = (
                    f"Household of {household} consumes ~{daily_consumption:.2f} {latest.unit}/day. "
                    f"With {current_stock:.1f} in pantry, stock will deplete in {days_until_empty:.1f} days."
                )

                replenishments.append(
                    ReplenishmentItem(
                        product_id=prod_id,
                        product_name=latest.name,
                        category=latest.category,
                        suggested_quantity=float(suggested_qty),
                        unit=latest.unit,
                        estimated_days_until_depleted=round(days_until_empty, 1),
                        urgency=urgency,
                        confidence_score=round(confidence, 2),
                        reason=reason,
                    )
                )

        # Step 3: Evaluate pantry items not in purchase history
        for p in req.pantry_items:
            if p.product_id in evaluated_ids:
                continue
            cat_key = p.category.lower().strip()
            daily_consumption = CATEGORY_DAILY_CONSUMPTION_PER_PERSON.get(cat_key, 0.25) * household
            days_until_empty = p.quantity / max(0.01, daily_consumption)

            if days_until_empty <= frequency:
                needed = (daily_consumption * frequency) - p.quantity
                suggested_qty = max(1.0, math.ceil(needed))

                urgency = "HIGH" if days_until_empty <= 2.0 else "MEDIUM"
                reason = (
                    f"Estimated consumption is ~{daily_consumption:.2f}/day for {household} members. "
                    f"Pantry stock will deplete in {days_until_empty:.1f} days."
                )

                replenishments.append(
                    ReplenishmentItem(
                        product_id=p.product_id,
                        product_name=p.name,
                        category=p.category,
                        suggested_quantity=float(suggested_qty),
                        unit=p.unit,
                        estimated_days_until_depleted=round(days_until_empty, 1),
                        urgency=urgency,
                        confidence_score=0.60,
                        reason=reason,
                    )
                )

        # Sort replenishments by urgency and days until empty
        urgency_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        replenishments.sort(
            key=lambda x: (urgency_order.get(x.urgency, 4), x.estimated_days_until_depleted)
        )

        return ReplenishmentResponse(
            replenishments=replenishments,
            model_version=self.MODEL_VERSION,
            total_recommended_items=len(replenishments),
        )

demand_predictor = DemandPredictor()
