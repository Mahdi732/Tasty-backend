# Restaurant + Menu Service — Postman Testing Guide

This document provides a practical Postman workflow for the Restaurant+Menu service.

Base URL (local):
- `http://localhost:4010`

## 1) Environment variables in Postman
Create a Postman environment with:
- `baseUrl` = `http://localhost:4010`
- `accessTokenManager` = manager JWT from Auth service
- `accessTokenSuperadmin` = superadmin JWT from Auth service
- `citySlug` = e.g. `marrakech`
- `slug` = e.g. `menu-r`
- `restaurantId` = (filled after create)
- `categoryId` = (filled after create)
- `itemId` = (filled after create)

Auth header for protected routes:
- `Authorization: Bearer {{accessTokenManager}}` (manager routes)
- `Authorization: Bearer {{accessTokenSuperadmin}}` (admin routes)

## 2) Health checks
1. `GET {{baseUrl}}/health` -> 200
2. `GET {{baseUrl}}/ready` -> 200 (Mongo connected; Redis optional)

## 3) Manager onboarding flow

### 3.1 Create restaurant (DRAFT)
- `POST {{baseUrl}}/restaurants`
- Headers: manager bearer token
- Body:
```json
{
  "name": "Menu R",
  "location": {
    "city": "Marrakech",
    "citySlug": "marrakech"
  }
}
```
Save `data._id` as `restaurantId` and `data.slug` as `slug`.

### 3.2 Request publish before gates pass
- `POST {{baseUrl}}/restaurants/{{restaurantId}}/request-publish`
- Expect status to move to pending (`PENDING_SUBSCRIPTION` or `PENDING_VERIFICATION`) with `activationBlockers`.

## 4) Superadmin gate actions

### 4.1 Set subscription (temporary admin setter)
- `PATCH {{baseUrl}}/restaurants/{{restaurantId}}/subscription`
- Headers: superadmin bearer token
- Body:
```json
{
  "status": "ACTIVE",
  "planId": "pro-monthly",
  "providerCustomerId": "cust_123",
  "providerSubscriptionId": "sub_123",
  "cancelAtPeriodEnd": false
}
```

### 4.2 Verify restaurant
- `PATCH {{baseUrl}}/restaurants/{{restaurantId}}/verify`
- Body:
```json
{
  "reviewNotes": "KYC passed"
}
```

### 4.3 Re-request publish (manager)
- `POST {{baseUrl}}/restaurants/{{restaurantId}}/request-publish`
- Expect `status = ACTIVE` and empty `activationBlockers`.

## 5) Menu management (manager)

### 5.1 Create category
- `POST {{baseUrl}}/restaurants/{{restaurantId}}/menu/categories`
- Body:
```json
{
  "name": "Main",
  "sortOrder": 1
}
```
Save `data._id` as `categoryId`.

### 5.2 Create item (published)
- `POST {{baseUrl}}/restaurants/{{restaurantId}}/menu/items`
- Body:
```json
{
  "categoryId": "{{categoryId}}",
  "name": "Visible Burger",
  "basePrice": 12,
  "currency": "USD",
  "isPublished": true,
  "availability": "IN_STOCK",
  "optionGroups": [
    {
      "name": "Size",
      "required": true,
      "multiSelect": false,
      "minSelect": 1,
      "maxSelect": 1,
      "items": [
        { "name": "Regular", "priceDelta": 0 },
        { "name": "Large", "priceDelta": 2 }
      ]
    }
  ]
}
```
Save `data._id` as `itemId`.

### 5.3 Create item (unpublished)
- Repeat create item with `"isPublished": false`.

### 5.4 Toggle availability/publish
- `PATCH {{baseUrl}}/menu/items/{{itemId}}/availability`
```json
{ "availability": "OUT_OF_STOCK" }
```
- `PATCH {{baseUrl}}/menu/items/{{itemId}}/publish`
```json
{ "isPublished": false }
```

## 6) Public read verification

### 6.1 List restaurants (ACTIVE only)
- `GET {{baseUrl}}/restaurants`
- Only ACTIVE restaurants should be returned.

### 6.2 Restaurant detail by city+slug
- `GET {{baseUrl}}/restaurants/{{citySlug}}/{{slug}}`

### 6.3 Public menu (published-only)
- `GET {{baseUrl}}/restaurants/{{citySlug}}/{{slug}}/menu`
- Only `isPublished=true` items are expected in output.

Optional include out-of-stock:
- `GET {{baseUrl}}/restaurants/{{citySlug}}/{{slug}}/menu?includeOutOfStock=true`

## 7) Tenant scoping negative test
1. Create another manager token.
2. Try to patch restaurant not owned by that manager:
- `PATCH {{baseUrl}}/restaurants/{{restaurantId}}`
3. Expect `403` with error code `TENANT_ACCESS_DENIED`.

## 8) Common error checks
- 401: missing/invalid JWT
- 403: wrong role or tenant mismatch
- 404: restaurant/category/item not found or not public
- 409: invalid state transition
- 400: request validation failure
