# Security Policy

HandoffKit is designed to create safe handoff packets, but redaction is best effort.

## Reporting a Vulnerability

Please open a private security advisory on GitHub or contact the maintainer directly. Do not publish working exploit details before there is a fix or documented mitigation.

## Security Boundaries

- The CLI does not call LLM APIs.
- The CLI should not make network requests.
- The CLI should not modify git state.
- Generated output is redacted after rendering, before stdout or file writes.

Review generated packets before pasting them into third-party tools, especially when using `--include-diff`.
