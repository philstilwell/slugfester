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

## Rollback

If the Cloudflare delegation must be reversed, restore the two previous Namecheap nameservers. The records above document the pre-move zone contents.
