# Security policy

## Reporting a problem

If you find a security problem in itsa10but, please report it privately through GitHub: open the Security tab of this repository and choose "Report a vulnerability". Please don't open a public issue for it.

Include what you found, the steps to reproduce it and the address or file involved. I'll reply as soon as I can, and I'll credit you in the fix if you'd like.

## What matters most here

- Visitor API keys travel in one request header and are never stored or logged. Anything that stores, logs or echoes a key is a security bug.
- Résumé text is read in the browser. Anything that stores it on the server, or sends it somewhere the privacy copy doesn't name, is a security bug.
- The site's own keys (Anthropic, Firecrawl, Cloudflare) are server-side secrets and must never reach the browser or the repository.

## Supported version

Only the latest release on the `main` branch is supported.
