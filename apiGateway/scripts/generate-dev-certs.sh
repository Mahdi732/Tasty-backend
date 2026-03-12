#!/usr/bin/env bash
set -euo pipefail

CERT_DIR="$(cd "$(dirname "$0")/../certs" && pwd)"
mkdir -p "$CERT_DIR"

openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 365 \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -subj "/CN=localhost"

echo "Generated dev certificates in $CERT_DIR"
