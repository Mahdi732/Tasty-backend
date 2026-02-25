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
- OAuth: Google and Facebook implemented; Apple scaffold included.
