$ErrorActionPreference = 'Stop'

$certDir = Join-Path $PSScriptRoot "..\certs"
New-Item -ItemType Directory -Force -Path $certDir | Out-Null

$keyPath = Join-Path $certDir "key.pem"
$certPath = Join-Path $certDir "cert.pem"

$openssl = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $openssl) {
  throw "OpenSSL is required to generate development certificates. Install OpenSSL and rerun."
}

& openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 365 `
  -keyout $keyPath -out $certPath -subj "/CN=localhost"

Write-Host "Generated dev certificates:"
Write-Host "  $keyPath"
Write-Host "  $certPath"
