# SmartGrocer

## Project Overview

SmartGrocer is an AI-powered mobile grocery management application that helps users plan grocery shopping based on their budget, household size, existing pantry stock, dietary preferences, and previous purchases.

The application aims to reduce unnecessary purchases, prevent food waste, provide estimated bills before shopping, and recommend suitable grocery quantities.

## Technology Stack

- Mobile application: React Native, Expo, TypeScript
- Navigation: Expo Router
- Authentication: Clerk
- Backend: Node.js, Express.js, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- AI service: Python, FastAPI, Scikit-learn
- Data processing: Pandas, NumPy
- API communication: REST and JSON
- Testing: Jest, Supertest, React Native Testing Library, Pytest
- Version control: Git and GitHub
- Deployment: Expo EAS, Docker, managed PostgreSQL

## Main Features

1. User registration and login.
2. Household profile and budget configuration.
3. Grocery catalogue and search.
4. Shopping list creation and management.
5. Estimated bill calculation.
6. Budget-aware grocery recommendations.
7. Pantry and existing-stock management.
8. Shopping history and purchase records.
9. Expiry tracking and reminders.
10. Recipe suggestions based on available ingredients.
11. Consumption and grocery-demand prediction.
12. Food-waste risk prediction.
13. Spending and shopping analytics.

## System Responsibilities

React Native provides the mobile interface. Clerk manages user identity and sessions. Node.js handles business logic, validates requests, and manages database operations. PostgreSQL stores application data. Python provides machine-learning predictions through a private API.

The mobile application communicates with Node.js only. Node.js communicates with PostgreSQL and calls the Python service when predictions are needed.

## Development Strategy

Build the application incrementally:

1. Requirements and architecture.
2. Database and authentication.
3. Product catalogue and shopping lists.
4. Bill estimation and budget management.
5. Pantry and purchase history.
6. Rule-based recommendations.
7. Python AI integration.
8. Testing, evaluation, and deployment.

The first release should focus on a functional grocery application. Machine learning should be introduced after the core workflows and data collection are working.
