# Security Policy

## Supported Versions

Volt is pre-launch (currently mid-roadmap). Only the latest commit on
`main` is supported — there are no released/tagged versions yet.

## Reporting a Vulnerability

Please report security issues privately rather than as a public GitHub
issue. Open a
[private security advisory](../../security/advisories/new) on this repo,
or email the maintainer directly (see GitHub profile). Include steps to
reproduce and, if applicable, which self-hosted component is affected
(backend, frontend, or MCP server).

## If something goes wrong

Volt is self-hosted and single-tenant by design — each instance holds
one person's Gmail credentials, encrypted at rest with a key that only
exists in that instance's own server memory (see
[ADR 0003](docs/decisions/0003-zero-knowledge-vault.md)). If a
vulnerability is confirmed: it will be disclosed here and in the
CHANGELOG with severity and affected versions, a fix will be released
as soon as possible with upgrade instructions, and if credential
exposure is possible, affected users will be told explicitly to rotate
their Google OAuth client secret and any AI provider keys. There is no
central Volt service that can revoke anything on your behalf — every
self-hosted instance is your own to patch and rotate.
