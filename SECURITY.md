# Security Policy

## Reporting a vulnerability

If you find a security issue in Kit for AI — this repo, the SDK, the MCP
integration, or the API at `kitforai.com` — please report it privately:

- Email **security@kitforai.com**, or
- Open a [private security advisory](https://github.com/kitforai/kitforai/security/advisories/new).

Please do **not** open a public issue for security reports.

Include steps to reproduce, the impact, and any relevant requests/responses.
We aim to acknowledge within 72 hours.

## Scope

- **In scope:** authentication/authorization, data exposure, injection, SSRF,
  rate-limit bypass, and anything that lets one account read or affect another.
- **Out of scope:** reports that rely on a leaked API key you control, missing
  best-practice headers with no demonstrated impact, or volumetric DoS.

## Handling secrets

Never commit an API key. This repository's examples use the
`KITFORAI_API_KEY` environment variable — create keys at
<https://kitforai.com/app/settings> and rotate any key you believe is exposed.
