# UserService Test Client

Minimal browser UI to manually test `userService` auth/session endpoints.

## What it covers

- Register
- Start email verification
- Verify email OTP
- Login
- Me
- Refresh
- Logout
- Logout all
- List sessions
- Revoke session

## Run

From `backend/userService/test-client`:

```bash
npx serve -l 3000 .
```

Then open:

- http://localhost:3000

Default API base URL in the UI:

- `http://localhost:4000`

## CORS note

`userService` default CORS allows `http://localhost:3000` (from `.env.example`).
If you use another frontend port, add it to `CORS_ORIGINS` in `backend/userService/.env` and restart service.
