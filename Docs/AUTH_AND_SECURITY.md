# SmartGrocer — Authentication and Security Specification

## 1. Authentication Provider

Clerk manages identity, sign-up, sign-in, and session lifecycle. SmartGrocer stores only the Clerk user identifier and application-specific profile data.

## 2. Mobile Authentication

The React Native application must:
- Provide sign-in and sign-up screens using the supported Clerk Expo/React Native SDK.
- Maintain authentication state using the SDK.
- Protect authenticated application screens.
- Obtain a session token for protected API requests.
- Send the token in the Authorization Bearer header.
- Handle expired sessions and sign-out.
- Avoid storing passwords or server credentials locally.

Use Clerk's current React Native and Expo integration documentation when implementing the SDK.

## 3. Backend Authentication

The Express API must:
- Verify each protected request's Clerk token using Clerk's supported server-side SDK or middleware.
- Derive the Clerk user ID from verified claims.
- Find or create the internal UserProfile.
- Restrict every user-owned database query to the authenticated user.
- Return 401 when authentication is missing or invalid.
- Return 403 when an authenticated user lacks permission.

Authentication alone is not sufficient: every protected resource must also pass an ownership check.

## 4. Environment Configuration

Mobile environment:
- Clerk publishable key.
- Public API base URL.

Backend environment:
- Clerk secret key.
- PostgreSQL connection URL.
- Python service URL.
- Internal service authentication secret, if required.
- Logging and runtime configuration.

The Python service may use its own configuration for model location and runtime settings.

## 5. Secrets Management

- Never commit `.env` files or secret keys.
- Provide `.env.example` with placeholder values only.
- Never put the Clerk secret key or database credentials in the mobile application.
- Treat the Python service as an internal service.
- Rotate exposed credentials immediately.
- Keep development and production credentials separate.

## 6. Data Protection

- Collect only information needed for grocery planning.
- Restrict access to personal purchase history and dietary preferences.
- Avoid storing unnecessary sensitive information.
- Provide a clear policy for data retention and account deletion.
- Define how application records are handled when a user deletes their account.
- Back up the database securely.

## 7. Security Testing

- Confirm unauthenticated users cannot access protected APIs.
- Confirm User A cannot read or change User B's shopping lists, pantry, or history.
- Confirm client-supplied user IDs cannot override verified identity.
- Confirm secrets are not included in mobile bundles or API responses.
- Confirm invalid product IDs and malicious input are handled safely.
- Confirm private AI endpoints cannot be used by unauthenticated external clients.
