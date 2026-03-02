# Tasty Restaurant + Menu Service

Production-grade Restaurant + Menu microservice.

## Features
- Multi-tenant restaurant onboarding with mandatory verification + subscription gating
- Public discoverability only for ACTIVE restaurants
- Menu management with OptionGroup/OptionItem normalized collections
- Public menu projection for high-performance reads
- RS256 JWT verification via Auth Service JWKS
- RBAC + strict tenant scoping
- Soft-delete strategy for future Orders/Payments compatibility

## Run locally
1. Copy `.env.example` to `.env`
2. Start dependencies and service:
   - `docker compose up --build`
3. Health endpoints:
   - `GET http://localhost:4010/health`
   - `GET http://localhost:4010/ready`
