from typing import List
from schemas.waste import (
    WasteRiskRequest,
    WasteRiskItem,
    WasteRiskResponse,
)
from models.demand_predictor import CATEGORY_DAILY_CONSUMPTION_PER_PERSON

class WasteAnalyzer:
    """
    Analyzes food waste and spoilage risk by contrasting remaining shelf life (days until expiry)
    against the household's estimated daily consumption capacity.
    """

    def analyze(self, req: WasteRiskRequest) -> WasteRiskResponse:
        household = max(1, req.household_size)
        at_risk: List[WasteRiskItem] = []

        for item in req.items:
            cat_key = item.category.lower().strip()
            daily_rate = CATEGORY_DAILY_CONSUMPTION_PER_PERSON.get(cat_key, 0.25) * household
            days_to_consume = item.quantity / max(0.01, daily_rate)
            days_until_exp = item.expiry_days_left

            # If it takes longer to consume than days remaining before expiry, it will spoil
            if days_to_consume > days_until_exp or days_until_exp <= 2.0:
                consumable_before_exp = max(0.0, daily_rate * max(0.0, days_until_exp))
                waste_qty = max(0.0, round(item.quantity - consumable_before_exp, 2))

                if days_until_exp <= 1.0:
                    risk_level = "CRITICAL"
                    action = "Use today or freeze immediately to avoid total spoilage."
                elif days_until_exp <= 3.0 or waste_qty > (item.quantity * 0.5):
                    risk_level = "HIGH"
                    action = f"Plan a meal using this item within {int(days_until_exp)} days."
                else:
                    risk_level = "MODERATE"
                    action = "Monitor stock or consider batch cooking."

                at_risk.append(
                    WasteRiskItem(
                        product_id=item.product_id,
                        product_name=item.name,
                        quantity=item.quantity,
                        unit=item.unit,
                        days_until_expiry=round(days_until_exp, 1),
                        estimated_days_to_consume=round(days_to_consume, 1),
                        risk_level=risk_level,
                        potential_waste_quantity=waste_qty,
                        suggested_action=action,
                    )
                )

        # Sort by urgency (lowest days until expiry first)
        at_risk.sort(key=lambda x: x.days_until_expiry)

        summary = (
            f"Found {len(at_risk)} items at risk of spoiling before full consumption. "
            f"Action is recommended to prevent household grocery waste."
            if at_risk
            else "All pantry stock is on pace to be safely consumed prior to expiry."
        )

        return WasteRiskResponse(
            at_risk_items=at_risk,
            total_at_risk=len(at_risk),
            summary=summary,
        )

waste_analyzer = WasteAnalyzer()
