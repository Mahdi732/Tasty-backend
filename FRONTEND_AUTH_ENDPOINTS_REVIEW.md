# Frontend Auth Integration Guide (From Backend Code)

This file documents the auth endpoints the frontend should use, based on the current backend implementation.

Scope:
- Source of truth is backend code, not only Swagger comments.
- Primary frontend surface is API Gateway routes under `/api/v1`.
- This includes a backend review section with issues found while auditing auth flows.

## Base URL

Use API Gateway as the frontend entry point:
- Local example: `https://localhost` (gateway serves HTTPS by default)
- Auth base path: `/api/v1/auth`

## Response Envelope

Most routes return:
- Success: `{ "success": true, "data": ... }`
- Error: `{ "success": false, "error": { "code": "...", "message": "..." } }`

Note:
- User service errors may include additional fields (`requestId`, `details`, `meta`), but gateway currently normalizes errors and usually returns only `code` and `message`.

## Frontend Auth Endpoints (Gateway)

### 1) Register
- Method: `POST`
- Path: `/api/v1/auth/register`
- Auth: No
- Body:
```json
{
  "email": "user@example.com",
  "password": "VeryStrongPassword123!",
  "phoneNumber": "+201234567890",
  "nickname": "ChefNeo",
  "deviceId": "web-chrome-001"
}
```
- Success (201):
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "verification_required",
    "user_id": "...",
    "email": "user@example.com",
    "nickname": "ChefNeo",
    "roles": ["USER"]
  }
}
```
- Frontend meaning:
  - Account is created in `PENDING_EMAIL_VERIFICATION` state.
  - User must verify email before login can succeed.

### 2) Login
- Method: `POST`
- Path: `/api/v1/auth/login`
- Auth: No
- Body:
```json
{
  "email": "user@example.com",
  "password": "VeryStrongPassword123!",
  "deviceId": "web-chrome-001"
}
```
- Success (200): returns user/session data from user service, but gateway strips auth token fields from body.
- Frontend meaning:
  - Expect user/account info.
  - Do not expect `accessToken`/`refreshToken` in response body from gateway (current behavior).

### 3) Refresh Session
- Method: `POST`
- Path: `/api/v1/auth/refresh`
- Auth: No
- Body:
```json
{
  "refreshToken": "optional-if-cookie-transport-works"
}
```
- Success (200): similar to login, gateway strips token fields from response body.

### 4) Logout
- Method: `POST`
- Path: `/api/v1/auth/logout`
- Auth: Bearer token required
- Body (optional):
```json
{
  "refreshToken": "optional",
  "sessionId": "optional-uuid"
}
```
- Success (200):
```json
{
  "success": true,
  "data": { "revoked": true }
}
```

### 5) Start Email Verification
- Method: `POST`
- Path: `/api/v1/auth/email/start-verification`
- Auth: No
- Body:
```json
{
  "email": "user@example.com"
}
```
- Success (200):
```json
{
  "success": true,
  "data": {
    "sent": true,
    "code": "123456"
  }
}
```
`code` is only present when `EXPOSE_VERIFICATION_CODES=true`.

### 6) Verify Email OTP
- Method: `POST`
- Path: `/api/v1/auth/email/verify`
- Auth: No
- Body:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```
- Success (200):
```json
{
  "success": true,
  "data": { "verified": true }
}
```

### 7) Start Phone Verification
- Method: `POST`
- Path: `/api/v1/auth/phone/start-verification`
- Auth: Bearer token required
- Body:
```json
{
  "phoneNumber": "+201234567890"
}
```
- Success (200):
```json
{
  "success": true,
  "data": {
    "sent": true,
    "code": "1234"
  }
}
```
`code` is only present when `EXPOSE_VERIFICATION_CODES=true`.

### 8) Verify Phone OTP
- Method: `POST`
- Path: `/api/v1/auth/phone/verify`
- Auth: Bearer token required
- Body:
```json
{
  "phoneNumber": "+201234567890",
  "code": "1234"
}
```
- Success (200):
```json
{
  "success": true,
  "data": { "verified": true }
}
```

### 9) Activate Account (Face + ID)
- Method: `POST`
- Path: `/api/v1/activate-account`
- Auth: Bearer token required
- Body:
```json
{
  "idCardImageBase64": "...base64...",
  "imageBase64": "...base64..."
}
```
- Success (200):
```json
{
  "success": true,
  "data": {
    "activated": true,
    "status": "ACTIVE",
    "activationCompletedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### 10) Get Current User Profile
- Method: `GET`
- Paths:
  - `/api/v1/auth/profile`
  - `/api/v1/auth/me`
- Auth: Bearer token required
- Success (200):
```json
{
  "success": true,
  "data": {
    "userId": "...",
    "email": "user@example.com",
    "nickname": "ChefNeo",
    "phoneNumber": "+201234567890",
    "roles": ["USER"],
    "status": "PENDING_PHONE_VERIFICATION",
    "verification": {
      "email": true,
      "phone": false,
      "face": false
    }
  }
}
```

## Suggested Frontend Flow (Based on Backend Rules)

1. Register: `POST /api/v1/auth/register`
2. Send email OTP: `POST /api/v1/auth/email/start-verification`
3. Verify email OTP: `POST /api/v1/auth/email/verify`
4. Login: `POST /api/v1/auth/login`
5. Start phone OTP: `POST /api/v1/auth/phone/start-verification` (requires bearer)
6. Verify phone OTP: `POST /api/v1/auth/phone/verify` (requires bearer)
7. Face + ID activation: `POST /api/v1/activate-account` (requires bearer)
8. Refresh profile: `GET /api/v1/auth/me`

Status progression in user service:
- `PENDING_EMAIL_VERIFICATION` -> `PENDING_PHONE_VERIFICATION` -> `PENDING_FACE_ACTIVATION` -> `ACTIVE`

## Important Error Codes for Frontend Handling

Common auth-related `error.code` values:
- `VALIDATION_ERROR`
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_UNAUTHORIZED`
- `AUTH_FORBIDDEN`
- `AUTH_EMAIL_EXISTS`
- `EMAIL_NOT_VERIFIED`
- `AUTH_INVALID_VERIFICATION_CODE`
- `AUTH_VERIFICATION_COOLDOWN`
- `AUTH_VERIFICATION_LOCKED`
- `AUTH_RATE_LIMITED`
- `AUTH_TOKEN_REUSE_DETECTED`
- `FACE_ACTIVATION_BLOCKED`

## Backend Review Findings

### Critical 1: Gateway strips auth tokens from login/refresh responses
- Where:
  - `backend/apiGateway/src/routes/api.routes.js`
  - `stripAuthTokens: true` for `/api/v1/auth/login` and `/api/v1/auth/refresh`
  - token fields removed in `forwardToUserService`
- Impact:
  - Frontend cannot reliably obtain bearer access token from gateway login/refresh payload.
  - Protected endpoints (`/api/v1/auth/phone/*`, `/api/v1/activate-account`, `/api/v1/auth/me`) require bearer token.
- Recommendation:
  - Either stop stripping `accessToken` from login/refresh responses, or switch all protected gateway auth to cookie session strategy.

### Critical 2: Refresh cookie path mismatch through gateway
- Where:
  - User service sets refresh cookie path to `/auth` in `backend/userService/src/controllers/auth.controller.js`.
  - Frontend calls gateway path `/api/v1/auth/refresh`.
- Impact:
  - Browser may not send refresh cookie to `/api/v1/auth/*` if cookie path is `/auth`.
  - Combined with token stripping, refresh flow can fail completely.
- Recommendation:
  - Set refresh cookie path to `/` or `/api/v1/auth` (gateway-facing path), and verify cross-site cookie settings in browser.

### Medium 1: Swagger login contract does not match runtime gateway behavior
- Where:
  - `backend/apiGateway/src/docs/openapi.paths.js` shows `access_token` and `refresh_token` for login.
- Impact:
  - Frontend developers can implement wrong parsing logic.
- Recommendation:
  - Update OpenAPI docs to match real gateway response behavior.

### Medium 2: Register endpoint shape is inconsistent with other auth responses
- Where:
  - `backend/apiGateway/src/routes/api.routes.js` register uses gRPC result wrapped as `data: response` where `response` has its own `success` and snake_case fields.
- Impact:
  - Frontend needs special-case parsing for register only.
- Recommendation:
  - Normalize register response to match login/refresh/profile style.

### Medium 3: Register route in gateway lacks request schema validation
- Where:
  - `backend/apiGateway/src/routes/api.routes.js` (`/api/v1/auth/register`)
- Impact:
  - Invalid payloads are forwarded to gRPC layer; errors are less consistent.
- Recommendation:
  - Add gateway-level payload validation (email/password/phone format, required fields).

### Medium 4: Some useful auth routes are not exposed via gateway
- Not currently exposed in gateway (available in user service):
  - `POST /auth/logout-all`
  - `GET /auth/sessions`
  - `DELETE /auth/sessions/:sessionId`
  - OAuth routes under `/auth/oauth/*`
- Impact:
  - Frontend cannot use session management or OAuth via gateway unless calling user service directly.
- Recommendation:
  - Expose required routes through gateway or document direct-service access policy.

## Frontend Integration Checklist

- Use API Gateway `/api/v1/*` for auth calls.
- Always handle `success=false` and branch by `error.code`.
- Handle cooldown/lock errors for OTP UX.
- Plan for status-based UX (`PENDING_*`, `ACTIVE`).
- Align with backend team on token transport decision before finalizing frontend auth state management.
- If cookies are used, send requests with credentials enabled from frontend HTTP client.

## Source Files Audited

Gateway:
- `backend/apiGateway/src/routes/api.routes.js`
- `backend/apiGateway/src/middlewares/auth.middleware.js`
- `backend/apiGateway/src/docs/openapi.paths.js`

User service:
- `backend/userService/src/routes/index.js`
- `backend/userService/src/routes/auth.routes.js`
- `backend/userService/src/controllers/auth.controller.js`
- `backend/userService/src/services/auth.service.js`
- `backend/userService/src/services/user.service.js`
- `backend/userService/src/services/email-verification.service.js`
- `backend/userService/src/services/phone-verification.service.js`
- `backend/userService/src/validators/auth.validators.js`
- `backend/userService/src/constants/errors.js`
- `backend/userService/src/constants/user-status.js`
