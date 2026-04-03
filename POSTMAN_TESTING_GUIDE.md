# Tasty Postman Testing Guide

This guide helps QA/devs test the project through API Gateway only.

## Files

- Collection: `postman/Tasty_API_Gateway.postman_collection.json`
- Environment: `postman/Tasty_Local.postman_environment.json`

## Prerequisites

1. Start backend stack from `backend/`:

```bash
docker-compose up --build
```

2. Ensure gateway is reachable:
- `http://localhost:8080`

3. Import both Postman files.

## Environment Variables

Required in Postman environment:

- `baseUrl` -> `http://localhost:8080`
- `email`
- `password`
- `phoneNumber`
- `accessToken` (auto-updated by scripts on login)
- `restaurantId`
- `orderId`
- `qrToken`

## Recommended End-to-End Test Order

1. **Register**
- `POST {{baseUrl}}/api/v1/auth/register`

2. **Start Email Verification**
- `POST {{baseUrl}}/api/v1/auth/email/start-verification`

3. **Verify Email**
- `POST {{baseUrl}}/api/v1/auth/email/verify`

4. **Login**
- `POST {{baseUrl}}/api/v1/auth/login`
- Script stores `accessToken` if gateway returns it.

5. **Phone Verification**
- `POST {{baseUrl}}/api/v1/auth/phone/start-verification`
- `POST {{baseUrl}}/api/v1/auth/phone/verify`

6. **Activate Account**
- `POST {{baseUrl}}/api/v1/activate-account`

7. **Browse Restaurants + Menu**
- `GET {{baseUrl}}/api/v1/restaurants`
- `GET {{baseUrl}}/api/v1/restaurants/:citySlug/:slug/menu`

8. **Order + Payment**
- `POST {{baseUrl}}/api/v1/orders`
- `POST {{baseUrl}}/api/v1/payments/order`

9. **Ops Testing**
- `POST {{baseUrl}}/api/v1/ops/orders/qr/scan`
- `POST {{baseUrl}}/api/v1/orders/:orderId/driver-arrived`

## Notes

- Protected endpoints require `Authorization: Bearer {{accessToken}}`.
- If login/refresh token body is unavailable in your environment, run frontend flow and copy token from app state/session for manual Postman tests.
- Keep tests gateway-only. Do not test internal service private URLs from Postman unless explicitly debugging internals.
