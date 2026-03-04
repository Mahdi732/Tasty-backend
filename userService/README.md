# Tasty Auth Service

Production-grade Auth Service (Node.js + Express + MongoDB + Redis) for microservices.

## Run locally

1. Copy `.env.example` to `.env` and provide real keys/secrets.
2. Start dependencies and service:
   - `docker compose up --build`
3. Health check:
   - `GET http://localhost:4000/health`
   - `GET http://localhost:4000/.well-known/jwks.json`

## Security notes

- Uses Argon2id for password hashing.
- Uses RS256 JWT with `kid` header and JWKS endpoint.
- Refresh tokens are opaque, rotated, and hashed at rest.
- Supports refresh token transport via secure HttpOnly cookie and/or JSON body.
- OAuth: Google and Facebook implemented.
- Email/password registration requires email verification (OTP-based).

## OAuth multi-platform clients

- OAuth client selection is now provider + platform based.
- Start endpoint example:
   - `GET /auth/oauth/google/start?mode=login&platform=web`
   - `GET /auth/oauth/google/start?mode=login&platform=android`
   - `GET /auth/oauth/google/start?mode=login&platform=ios`
   - `GET /auth/oauth/google/start?mode=login&platform=desktop`
- Backend binds `platform` into validated `state`; callback uses platform from state (not raw query input).
- Public clients (`mobile`, `desktop`, `android`, `ios`) use PKCE and do not require forcing `client_secret`.
- Legacy `GOOGLE_CLIENT_ID` / `FACEBOOK_CLIENT_ID` style env vars are temporarily supported in migration mode for `web`; startup warns when legacy mode is used.

## Email verification

- Register creates account in `pending_email_verification` state.
- Login is blocked until email is verified.
- Verification endpoints:
   - `POST /auth/email/start-verification`
   - `POST /auth/email/verify`
   - `POST /auth/email/change/request` (scaffold)
- OTP codes are 6-digit, stored hashed, expire quickly, and enforce resend cooldown + attempt lockouts.

## Postman testing

- See `POSTMAN_TESTING.md` for a complete request-by-request Postman workflow aligned with the current API.

## Architecture conclusion (Auth Service)

This service is now a pure Identity Provider for the marketplace architecture.

- It owns identity only: user credentials, verification state, account status, sessions, and JWT issuance.
- It is tenant-agnostic: there is no `tenantId` in the user schema, indexes, auth flows, or JWT payload.
- It issues RS256 access tokens with global claims for downstream authorization:
   - `sub` (userId)
   - `roles` (global roles)
   - `sid` / `jti` (+ standard `iat` / `exp`)

### Roles handled here

- `user`: default global role for customer identity.
- `manager`: global capability to access protected manager APIs in downstream services.
- `superadmin`: global admin role with bypass behavior in downstream services.

Auth Service does not decide restaurant ownership. It only asserts identity + global roles in JWT.

### Test alignment

- `tests/integration/auth.routes.test.js`
   - Validates register → verify → login → me flow.
   - Asserts access token includes `roles` and does not include `tenantId`.
- `tests/integration/refresh-rotation.test.js`
   - Validates refresh rotation and reuse detection behavior.
- `tests/integration/protected-route.test.js`
   - Validates JWT protection for authenticated routes.
