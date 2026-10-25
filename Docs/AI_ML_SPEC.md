# SmartGrocer — AI and Machine Learning Specification

## 1. Objective

The Python service provides predictions that help SmartGrocer recommend suitable groceries and quantities, estimate when items may run out, and identify potential food waste.

Python is not required for basic bill calculation, database operations, authentication, or standard shopping-list management.

## 2. Responsibilities

### Node.js
- Collects data from PostgreSQL.
- Calculates the estimated bill.
- Applies budget constraints.
- Checks confirmed pantry stock.
- Calls the Python service.
- Validates and returns recommendations.

### Python
- Processes prediction features.
- Runs trained models or baseline prediction logic.
- Returns suggested quantities and explanations.
- Reports model version and prediction limitations.

## 3. Feature A: Grocery Demand Prediction

Objective: Predict which groceries a user may need for an upcoming shopping period.

Potential input features:
- Product identifier.
- Previous purchase dates.
- Previous purchase quantities.
- Time since the last purchase.
- Confirmed current stock.
- Household size.
- Days until the next planned shopping trip.
- Recorded consumption rate.
- Relevant seasonal information, if sufficient data exists.

Expected output:
- Product likely to need replenishment.
- Suggested quantity.
- Reason for the recommendation.
- Model version.

The final recommendation must account for available pantry stock and the budget in Node.js.

## 4. Feature B: Consumption Prediction

Objective: Estimate how long an available grocery item may last.

Potential inputs:
- Current stock.
- Historical purchase quantities.
- Consumption records.
- Household size.
- Time since purchase.
- Typical consumption interval.

Expected output:
- Estimated time until the item may run out.
- Suggested replenishment date or shopping window.
- Explanation of the estimate.

If consumption history is unavailable, use transparent rules and ask the user to confirm stock.

## 5. Feature C: Food-Waste Risk

Objective: Identify items that may remain unused or expire before consumption.

Potential inputs:
- Quantity purchased.
- Current stock.
- Expiry date, when known.
- Historical consumption.
- Recorded wasted quantities.
- Household size.
- Time remaining before expiry.

Expected output:
- A risk category or calibrated risk score, if the model supports it.
- Explanation of contributing factors.
- Suggested action, such as consuming the item soon or buying a smaller quantity next time.

An expiry date alone does not prove food has been wasted. Collect actual outcomes where possible.

## 6. Feature D: Budget-Aware Product Suggestions

The initial version should implement budget optimisation in Node.js rather than machine learning.

Use:
- Product prices.
- Comparable product units.
- Dietary preferences.
- Household needs.
- Existing pantry stock.
- User priorities.

Python may later improve product ranking, but it should not determine the final bill.

## 7. Recipe Recommendations

Recipe suggestions can initially use a curated recipe dataset and matching rules.

The system should:
- Identify ingredients already available.
- Match recipes to those ingredients.
- Identify missing ingredients.
- Show a short description and preparation guidance.
- Consider recorded dietary restrictions.

A language model or external recipe API is optional. Recipe generation is not a prerequisite for the initial ML service.

## 8. Service Design

Use Python with FastAPI for an internal HTTP service.

Suggested endpoint responsibilities:
- Health check.
- Demand prediction.
- Consumption prediction.
- Food-waste risk prediction.

Node.js should call the service with validated JSON payloads. The Python service should return structured JSON responses and must not be exposed directly to the mobile application.

## 9. Data Collection

Useful historical records include:
- Product purchases and dates.
- Purchased quantities.
- Confirmed stock levels.
- Consumption events.
- Waste events.
- Household size.
- Whether users accepted, edited, or dismissed recommendations.

Collect only necessary information and document the source of the data.

Synthetic data may be used for initial development and pipeline testing, but results obtained from synthetic data must not be presented as evidence of real-world predictive performance.

## 10. Model Development

1. Define the exact prediction target and time horizon.
2. Inspect and clean available data.
3. Create features using information available at prediction time.
4. Establish a simple rule-based baseline.
5. Train an appropriate model using Scikit-learn.
6. Evaluate it against the baseline on held-out data.
7. Record limitations and performance metrics.
8. Save the model and feature schema.
9. Load the model in the FastAPI service.
10. Monitor predictions against later real outcomes.

For quantity prediction, consider Mean Absolute Error (MAE). For waste-risk classification, consider precision, recall, and F1-score. Choose metrics according to the actual prediction objective.

## 11. Integration and Failure Handling

- Node.js calls Python only when a prediction is needed.
- Requests must have timeouts.
- Validate responses before using them.
- Fall back to rule-based recommendations when the service is unavailable.
- Do not silently replace missing model outputs with invented predictions.
- Store model version and useful evaluation metadata.
- Recommendations remain optional suggestions that the user can edit.

## 12. AI Acceptance Criteria

The AI component is acceptable when:
- Its input and output schemas are documented.
- Predictions can be reproduced and tested.
- It performs at least as usefully as the chosen baseline, according to predefined evaluation criteria, before being presented as an improvement.
- Failures do not break basic grocery shopping.
- Predictions are evaluated against actual outcomes when suitable data becomes available.
