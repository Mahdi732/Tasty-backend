# Postman Testing Guide (Tasty Auth Service)

This file gives a practical Postman workflow to test the running auth service.

## 1) Prerequisites

- Docker stack is running:
  - auth-service on http://localhost:4000
  - mongo on localhost:27017
  - redis on localhost:6379
- Health endpoint responds:
  - GET http://localhost:4000/health

## 2) Postman Environment

Create a Postman Environment named: Local Auth Service

Add these variables:

- baseUrl = http://localhost:4000
- accessToken = (empty)
- refreshToken = (empty)
- sessionId = (empty)
- email = qa.user+1@example.com
- password = StrongPass!123
- oauthPlatform = web

## 3) Collection Structure

Create a collection: Tasty Auth Service

Recommended folders:

- Health
- Auth (Register/Login/Me/Refresh/Logout)
- Sessions
- Metadata
- OAuth

## 4) Requests and exact setup

### A) Health

Request:
- Method: GET
- URL: {{baseUrl}}/health

Expected:
- Status: 200
- Body success true

---

### B) Register

Request:
- Method: POST
- URL: {{baseUrl}}/auth/register
- Headers: Content-Type: application/json
- Body (raw JSON):

{
  "email": "{{email}}",
  "password": "{{password}}"
}

Tests tab script:

pm.test("Register success", function () {
  pm.response.to.have.status(201);
});

const json = pm.response.json();
if (json?.data?.accessToken) {
  pm.environment.set("accessToken", json.data.accessToken);
}
if (json?.data?.refreshToken) {
  pm.environment.set("refreshToken", json.data.refreshToken);
}
if (json?.data?.session?.sessionId) {
  pm.environment.set("sessionId", json.data.session.sessionId);
}

Expected:
- 201 Created
- verificationRequired true
- no login tokens until email is verified

---

### C) Start email verification OTP

Request:
- Method: POST
- URL: {{baseUrl}}/auth/email/start-verification
- Headers: Content-Type: application/json
- Body:

{
  "email": "{{email}}"
}

Expected:
- 200 OK
- Generic success response

---

### D) Verify email OTP

Request:
- Method: POST
- URL: {{baseUrl}}/auth/email/verify
- Headers: Content-Type: application/json
- Body:

{
  "email": "{{email}}",
  "code": "123456"
}

Expected:
- 200 OK
- verified true

---

### E) Login

Request:
- Method: POST
- URL: {{baseUrl}}/auth/login
- Headers: Content-Type: application/json
- Body (raw JSON):

{
  "email": "{{email}}",
  "password": "{{password}}",
  "deviceId": "postman-desktop-1"
}

Tests tab script:

pm.test("Login success", function () {
  pm.response.to.have.status(200);
});

const json = pm.response.json();
if (json?.data?.accessToken) {
  pm.environment.set("accessToken", json.data.accessToken);
}
if (json?.data?.refreshToken) {
  pm.environment.set("refreshToken", json.data.refreshToken);
}
if (json?.data?.session?.sessionId) {
  pm.environment.set("sessionId", json.data.session.sessionId);
}

Expected:
- 200 OK
- New accessToken + refreshToken

---

### F) Me (Protected)

Request:
- Method: GET
- URL: {{baseUrl}}/auth/me
- Header: Authorization: Bearer {{accessToken}}

Expected:
- 200 OK with user profile

Negative test:
- Remove Authorization header
- Expected 401

---

### G) Refresh (JSON body mode)

Request:
- Method: POST
- URL: {{baseUrl}}/auth/refresh
- Headers: Content-Type: application/json
- Body:

{
  "refreshToken": "{{refreshToken}}"
}

Tests tab script:

pm.test("Refresh success", function () {
  pm.response.to.have.status(200);
});

const json = pm.response.json();
if (json?.data?.accessToken) {
  pm.environment.set("accessToken", json.data.accessToken);
}
if (json?.data?.refreshToken) {
  pm.environment.set("refreshToken", json.data.refreshToken);
}
if (json?.data?.session?.sessionId) {
  pm.environment.set("sessionId", json.data.session.sessionId);
}

Expected:
- 200 OK
- Refresh token rotated (new refreshToken value)

Replay/reuse check:
1. Save old refresh token manually before calling refresh.
2. Call refresh once to rotate.
3. Call refresh again with old token.
4. Expected: 409 (reuse detected) or 401.

---

### H) Logout current session

Option 1: by session from access token
- Method: POST
- URL: {{baseUrl}}/auth/logout
- Header: Authorization: Bearer {{accessToken}}
- Body: {}

Option 2: by explicit refresh token
- Method: POST
- URL: {{baseUrl}}/auth/logout
- Header: Authorization: Bearer {{accessToken}}
- Body:

{
  "refreshToken": "{{refreshToken}}"
}

Expected:
- 200 OK
- revoked true

---

### I) Logout all sessions

Request:
- Method: POST
- URL: {{baseUrl}}/auth/logout-all
- Header: Authorization: Bearer {{accessToken}}
- Body:

{
  "exceptCurrentSession": false
}

Expected:
- 200 OK
- revokedSessions >= 0

---

### J) List sessions

Request:
- Method: GET
- URL: {{baseUrl}}/auth/sessions
- Header: Authorization: Bearer {{accessToken}}

Expected:
- 200 OK
- list of active sessions

---

### K) Revoke one session

Request:
- Method: DELETE
- URL: {{baseUrl}}/auth/sessions/{{sessionId}}
- Header: Authorization: Bearer {{accessToken}}

Expected:
- 200 OK
- revoked true

---

### L) JWKS

Request:
- Method: GET
- URL: {{baseUrl}}/.well-known/jwks.json

Expected:
- 200 OK
- body includes keys array with kid values (active and previous if configured)

---

## 5) OAuth testing in Postman

Supported platform values:
- web
- mobile
- desktop
- android
- ios

### Google start

Request:
- GET {{baseUrl}}/auth/oauth/google/start?mode=login&platform={{oauthPlatform}}

Expected:
- 200 with authorizationUrl
- Open authorizationUrl in browser to continue login and callback flow

### Facebook start

Request:
- GET {{baseUrl}}/auth/oauth/facebook/start?mode=login&platform={{oauthPlatform}}

Expected:
- 200 with authorizationUrl

### OAuth callback note

- Callback route is provider-specific:
  - `GET /auth/oauth/google/callback?code=...&state=...`
  - `GET /auth/oauth/facebook/callback?code=...&state=...`
- Do not pass `platform` on callback for trust decisions.
- Backend resolves platform from validated state stored at `/start`.

### OAuth account linking start

Request:
- Method: POST
- URL: `{{baseUrl}}/auth/oauth/link/google`
- Header: `Authorization: Bearer {{accessToken}}`
- Body (raw JSON):

{
  "platform": "{{oauthPlatform}}"
}

Expected:
- 200 with authorizationUrl for linking flow
- Use returned URL in browser; callback will complete link flow

## 6) Cookie mode testing notes

Service is configured with REFRESH_TOKEN_TRANSPORT=both in local env.

- For browser-like cookie testing in Postman:
  - Ensure cookie jar is enabled.
  - After login, verify refresh cookie named rt is set.
  - Call POST /auth/refresh with empty JSON body and rely on cookie.

## 7) Common error checks

- Invalid credentials:
  - POST /auth/login with wrong password -> 401 generic message
- Missing token on protected route:
  - GET /auth/me without Authorization -> 401
- Validation:
  - Short password on register -> 400
- Rate limiting:
  - Burst login attempts -> 429 (based on configured limits)

## 8) Suggested Postman run order

1. Health
2. Register
3. Start verification
4. Verify email
5. Login
6. Me
7. Refresh
8. Sessions list
9. Logout
10. Login again
11. Logout-all

## 9) Optional: one-click import idea

If you want, create a Postman collection JSON file from this guide and import it. I can generate that file next.
