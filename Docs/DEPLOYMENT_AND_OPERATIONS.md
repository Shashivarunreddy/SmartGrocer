# SmartGrocer — Deployment and Operations

## 1. Environments

Maintain separate development, testing, and production configurations.

### Development
- React Native app running through Expo.
- Node.js API running locally.
- PostgreSQL development database.
- Python FastAPI service running locally.
- Development Clerk application and credentials.

### Production
- Mobile builds distributed through Expo EAS.
- Node.js API hosted on a suitable application or container platform.
- Managed PostgreSQL database.
- Python AI service deployed separately.
- Production Clerk configuration and restricted secrets.

## 2. Configuration

Store environment-specific settings outside source control.

Required configuration includes:
- Clerk publishable key for the mobile application.
- Clerk secret key for the backend.
- PostgreSQL connection URL.
- Backend API base URL.
- Internal Python service URL.
- Internal service authentication credentials, if used.
- Logging and runtime settings.

Never place database credentials or Clerk secret keys in the mobile app.

## 3. Database Operations

- Apply schema changes through Prisma migrations.
- Back up production data regularly.
- Restrict database access to trusted services.
- Test backup restoration.
- Monitor database errors and connection usage.
- Define retention and account-deletion procedures.

## 4. Backend Deployment

- Build and test the Node.js service.
- Configure production environment variables.
- Apply reviewed database migrations.
- Enable HTTPS.
- Configure health checks.
- Monitor API response times and errors.
- Restrict access to administrative endpoints.

## 5. AI Service Deployment

- Package FastAPI and model dependencies separately.
- Version trained model files and feature schemas.
- Restrict network access to the API service where possible.
- Configure request timeouts and health checks.
- Monitor prediction failures and response latency.
- Retain a rule-based fallback for core recommendations.

## 6. Mobile Release

- Configure production API URLs.
- Verify Clerk production settings.
- Build Android or iOS application binaries using Expo EAS.
- Test sign-in and core workflows on physical devices.
- Verify error handling and connectivity.
- Distribute the app according to the project's demonstration or release requirements.

## 7. Monitoring

Monitor:
- API availability.
- Authentication failures.
- Database connection errors.
- Shopping-list and purchase-record failures.
- Python prediction failures.
- Request latency.
- Unexpected increases in error rates.

Avoid logging authentication tokens, passwords, and unnecessary personal information.

## 8. Incident Response

When a service fails:
1. Identify the affected component.
2. Preserve relevant diagnostic logs without exposing secrets.
3. Restore service or use a safe fallback.
4. Verify data integrity.
5. Document the cause and corrective action.

The mobile application should continue supporting core grocery workflows if the AI service fails.
