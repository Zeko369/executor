---
"@executor-js/sdk": patch
"@executor-js/plugin-openapi": patch
"@executor-js/react": patch
"@executor-js/api": patch
---

Support OAuth providers with nonstandard scope delimiters, token request fields, nested token-response envelopes, declarative HMAC-signed preflights, and refresh requests that must omit the optional scope field through provider-agnostic integration-template configuration. Normalize absolute OpenAPI path keys before invocation so malformed published specifications do not produce doubled request URLs.
