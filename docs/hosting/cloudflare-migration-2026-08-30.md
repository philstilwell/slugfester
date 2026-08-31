# Cloudflare migration record — 2026-08-30

This file records the public DNS state captured immediately before moving `slugfester.com` from Namecheap DNS to Cloudflare DNS. It is a rollback reference, not a source of credentials.

## Hosting origin

- Provider: GitHub Pages
- Repository custom domain: `slugfester.com`
- Apex addresses:
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`
- `www` target: `philstilwell.github.io`

## Email forwarding

- MX priority 10: `eforward1.registrar-servers.com`
- MX priority 10: `eforward2.registrar-servers.com`
- MX priority 10: `eforward3.registrar-servers.com`
- MX priority 15: `eforward4.registrar-servers.com`
- MX priority 20: `eforward5.registrar-servers.com`
- SPF TXT: `v=spf1 include:spf.efwd.registrar-servers.com ~all`

## Nameservers

- Previous Namecheap nameservers:
  - `dns1.registrar-servers.com`
  - `dns2.registrar-servers.com`
- Assigned Cloudflare nameservers:
  - `jack.ns.cloudflare.com`
  - `tia.ns.cloudflare.com`

## Cloudflare import review

Cloudflare's automatic scan found the four apex A records, the `www` CNAME, all five MX records, and the SPF TXT record. The website records are proxied; the email records are DNS-only. No DS record was published, so DNSSEC was not active before the nameserver change.

## Completed configuration

The registry began publishing the Cloudflare nameservers on 2026-08-30, and Cloudflare then marked the zone active.

- Plan: Free
- DNS setup: Full
- Hosting origin: unchanged GitHub Pages deployment
- Website records: proxied through Cloudflare
- Email forwarding records: DNS-only
- Origin encryption: Full (strict)
- Always Use HTTPS: enabled
- Automatic HTTPS Rewrites: enabled
- Minimum TLS version: 1.2
- Universal edge certificate: active for `slugfester.com` and `*.slugfester.com`
- HSTS: `max-age=31536000`, without `includeSubDomains` or preload
- Response headers applied at the edge:
  - `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`

DNSSEC remains off for the initial stabilization period. Enabling it later requires adding Cloudflare's DS record at Namecheap; an incorrect DS record could make the domain unreachable.

## Live verification

- `https://slugfester.com/`: `200`
- `http://slugfester.com/`: `301` to HTTPS
- `https://www.slugfester.com/`: `301` to the canonical apex URL
- `https://slugfester.com/backend/`: `200`
- Public DNS returns Cloudflare proxy addresses and the assigned Cloudflare nameservers.
- All five Namecheap email-forwarding MX records and the SPF TXT record remain published.
- Landing, Rankings, Backend, interlocutor, and debate pages rendered successfully in a browser without console errors.

## Rollback

If the Cloudflare delegation must be reversed, restore the two previous Namecheap nameservers. The records above document the pre-move zone contents.
