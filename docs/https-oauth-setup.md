# HTTPS/OAuth Setup for Secure Calendar Integration

## Problem Statement

Microsoft OAuth requires HTTPS redirect URIs and an exact match with the Azure app registration.

Current state:

- the Pi serves HTTP on `192.168.2.179:8080`
- the OAuth callback currently builds a redirect URI from the request origin
- Microsoft rejects private IP addresses as redirect URIs in this setup

## Solution Options

### Option A: Self-Signed Certificates for Local Testing

Use this for development and private-network testing.

Approach:

1. Generate self-signed certificates on the Pi
2. Configure the display runtime with certificate paths
3. Access the app over HTTPS in the browser and accept the certificate warning
4. Update Azure to use the HTTPS redirect URI

Pros:

- no external services needed
- full control over deployment
- works on a private network

Cons:

- browser certificate warnings
- Azure OAuth may still reject private IP addresses depending on registration rules

### Option B: Let's Encrypt Certificate for Production

Use this if the system will be exposed with a public domain.

Approach:

1. Obtain a public domain
2. Point DNS at the Pi or reverse proxy
3. Use Certbot to issue a Let's Encrypt certificate
4. Configure the runtime with the certificate paths
5. Update Azure to use the domain redirect URI

Pros:

- valid certificates
- standard OAuth setup
- no browser warning during normal use

Cons:

- requires a public domain
- DNS setup is needed
- more deployment complexity

### Option C: HTTPS Tunnel Service

Use this for quick testing without certificate management.

Approach:

1. Install ngrok or use Cloudflare Tunnel
2. Create a tunnel that exposes the Pi over HTTPS
3. Update Azure to use the tunnel redirect URI
4. Forward HTTPS traffic to the local HTTP server

Pros:

- no certificate management
- works immediately
- easy to test

Cons:

- depends on an external service
- tunnel URL may change unless you pay for a stable endpoint
- not ideal for long-term production use

## Recommended Path

For this project:

1. Use Option A now for internal testing
2. Switch to Option B if the system must be publicly reachable
3. Use Option C only for rapid iteration or temporary demos

## Implementation: Self-Signed Certificates

### Step 1: Generate Certificates

```bash
sudo mkdir -p /etc/ssl/otto
cd /etc/ssl/otto
sudo openssl genrsa -out otto-display.key 2048
sudo openssl req -new -x509 -key otto-display.key -out otto-display.crt -days 3650 \
  -subj "/C=US/ST=State/L=City/O=Otto/CN=192.168.2.179"
sudo chmod 644 otto-display.crt
sudo chmod 600 otto-display.key
```

### Step 2: Update Runtime Environment

```bash
export OTTO_HTTPS_KEY_PATH=/etc/ssl/otto/otto-display.key
export OTTO_HTTPS_CERT_PATH=/etc/ssl/otto/otto-display.crt
```

### Step 3: Update Azure App Registration

1. Go to the app registration in Azure
2. Update the redirect URI to `https://192.168.2.179:8080/oauth/callback`
3. Save the change

### Step 4: Test OAuth Flow

1. Open the dev UI over HTTPS
2. Navigate to Orchestrator Settings
3. Click Authenticate for Microsoft Calendar
4. Verify the browser redirects to Microsoft login
5. Confirm the callback returns successfully with a token

## Current Implementation Status

### Server Support

- `createNodeServer()` in otto-server supports HTTPS config
- display-runtime passes HTTPS paths to the shared server factory
- the environment variables already exist in the runtime design

### OAuth Callback

- `/oauth/callback` is wired correctly
- the redirect URI is built from the request origin
- token exchange and storage are implemented

### Missing

- self-signed certificates on the Pi
- Azure app registration update to HTTPS
- end-to-end test of the secured OAuth flow

## Next Steps

1. SSH to the Pi and generate the self-signed certificates
2. Trust the local CA certificate on Windows clients using `tools/trust-otto-ca.ps1` (see `docs/windows-trust-local-ca.md`)
3. Update the deployment package to include certificate setup
4. Test the HTTPS health endpoint with curl
5. Update Azure to the HTTPS redirect URI
6. Run the OAuth flow end to end

## Troubleshooting

### Certificate Checks

```bash
openssl x509 -in /etc/ssl/otto/otto-display.crt -text -noout
openssl x509 -noout -modulus -in /etc/ssl/otto/otto-display.crt | openssl md5
openssl rsa -noout -modulus -in /etc/ssl/otto/otto-display.key | openssl md5
```

### HTTPS Checks

```bash
curl -k https://127.0.0.1:8080/health
curl -v https://192.168.2.179:8080/health 2>&1 | head -20
```

### OAuth Callback Checks

```bash
journalctl -u otto-display-system.service -n 50 | grep oauth
```

## Long-Term Production Recommendation

For a permanent deployment, use Let's Encrypt with a proper domain and a reverse proxy such as nginx or Caddy. Keep certificates auto-renewed and follow standard Azure OAuth callback security practices.
