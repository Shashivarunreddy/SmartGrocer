from typing import List, Dict
from schemas.alternatives import (
    AlternativesRequest,
    SubstitutionSuggestion,
    AlternativesResponse,
)

class AlternativeFinder:
    """
    Scans the catalogue for cheaper substitutions within the same category
    to help users optimize shopping bills and maintain target budgets.
    """

    def find_alternatives(self, req: AlternativesRequest) -> AlternativesResponse:
        # Group catalogue by category
        catalogue_by_category: Dict[str, List] = {}
        for product in req.catalogue:
            cat_key = product.category.lower().strip()
            catalogue_by_category.setdefault(cat_key, []).append(product)

        # Sort each category by price ascending (cheapest first)
        for cat, items in catalogue_by_category.items():
            items.sort(key=lambda x: x.default_unit_price)

        substitutions: List[SubstitutionSuggestion] = []
        total_savings = 0.0

        for basket_item in req.basket_items:
            cat_key = basket_item.category.lower().strip()
            candidates = catalogue_by_category.get(cat_key, [])

            # Find the best candidate that is strictly cheaper and not the exact same product
            best_candidate = None
            for cand in candidates:
                if cand.product_id != basket_item.product_id and cand.default_unit_price < basket_item.default_unit_price:
                    # Minimum meaningful saving of at least £0.10
                    if (basket_item.default_unit_price - cand.default_unit_price) >= 0.10:
                        best_candidate = cand
                        break

            if best_candidate:
                unit_saving = basket_item.default_unit_price - best_candidate.default_unit_price
                line_saving = round(unit_saving * basket_item.quantity, 2)
                total_savings += line_saving

                brand_info = f" ({best_candidate.brands})" if best_candidate.brands else ""
                reason = (
                    f"Switching from '{basket_item.name}' (£{basket_item.default_unit_price:.2f}) "
                    f"to '{best_candidate.name}'{brand_info} (£{best_candidate.default_unit_price:.2f}) "
                    f"saves £{line_saving:.2f}."
                )

                substitutions.append(
                    SubstitutionSuggestion(
                        original_product_id=basket_item.product_id,
                        original_product_name=basket_item.name,
                        original_price=round(basket_item.default_unit_price, 2),
                        suggested_product_id=best_candidate.product_id,
                        suggested_product_name=best_candidate.name,
                        suggested_price=round(best_candidate.default_unit_price, 2),
                        estimated_savings=line_saving,
                        reason=reason,
                    )
                )

        # Sort substitutions by biggest savings first
        substitutions.sort(key=lambda x: x.estimated_savings, reverse=True)
        total_savings = round(total_savings, 2)

        summary = (
            f"Identified {len(substitutions)} cost-saving alternatives with a total potential saving of £{total_savings:.2f}."
            if substitutions
            else "Your current basket is already optimized for value."
        )

        return AlternativesResponse(
            potential_total_savings=total_savings,
            substitutions=substitutions,
            summary=summary,
        )

alternative_finder = AlternativeFinder()
