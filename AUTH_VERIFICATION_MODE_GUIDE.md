# Auth Verification Mode Guide (Dev to Production)

This guide keeps your current easy dev flow intact and shows how to switch to production behavior whenever you want.

## Current Dev Mode (what you have now)

In local Docker Compose, user-service currently runs with:

- EXPOSE_VERIFICATION_CODES=true
- SMS_PROVIDER=noop (default unless overridden)

Effect:

- Email OTP is fixed to 123456.
- Phone OTP is fixed to 1234.
- SMS is not delivered to real phones (noop sender only logs).

## Production Behavior You Can Switch To

Goal in production mode:

- Random OTP codes.
- Real SMS delivery (Twilio or Infobip).
- Real SMTP delivery.
- Secure cookie settings.

## One-Time Setup

1. Keep secrets out of git.
2. Put production secrets in your deployment environment, not in .env committed files.
3. Configure SMS provider credentials:
   - Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, SMS_FROM_PHONE
   - or Infobip: INFOBIP_BASE_URL, INFOBIP_API_KEY, SMS_FROM_PHONE
4. Configure SMTP credentials: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM

## Switch Checklist (Dev -> Production)

For user-service environment values:

- NODE_ENV=production
- EXPOSE_VERIFICATION_CODES=false
- SMS_PROVIDER=twilio (or infobip)
- COOKIE_SECURE=true
- COOKIE_SAME_SITE=none
- TRUST_PROXY=1

If using gateway from a browser domain:

- Set strict CORS_ORIGINS to your real frontend URL(s), no wildcard.

## Local Production-Like Test

If you want to test production-like verification locally without deploying:

1. Use the override file: docker-compose.auth-prod-like.override.yml.
2. Fill provider credentials through your shell environment or an untracked env file.
3. Start with override:
   - docker compose -f docker-compose.yml -f docker-compose.auth-prod-like.override.yml up -d --force-recreate user-service

## Switch Back To Easy Dev Mode

Set:

- EXPOSE_VERIFICATION_CODES=true
- SMS_PROVIDER=noop

Then recreate user-service:

- docker compose up -d --force-recreate user-service

## Quick Validation After Switching

1. Start email verification and confirm OTP is not always 123456.
2. Start phone verification and confirm OTP is not always 1234.
3. Confirm SMS arrives on a real number.
4. Confirm verify endpoints still advance status correctly.

## Notes on Error Messages

Backend now supports returning both:

- error.message (technical/developer-facing)
- error.userMessage (user-friendly)

Frontend should display error.userMessage to end users and keep technical details in network/console logs.
