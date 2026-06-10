# Growth Plugin

This workspace is the clean Home AI Growth plugin scaffold.

The previous `growth` directory was a Home AI full-repository clone used for
Growth-focused work. It has been archived and must not be treated as a
production plugin source. The current workspace is intentionally small and will
receive extracted Growth UI/API/domain code through the Home AI plugin
contract.

## Current Scope

- Embedded plugin manifest endpoint.
- Workspace registration endpoint with hashed access-key storage only.
- Launch endpoint placeholder.
- Minimal embedded UI.
- Minimal Growth API for scaffold status and empty board projection.

## Non-Goals

- It does not yet own the Home AI learning-growth SQLite data.
- It does not yet expose a Growth MCP toolset.
- It does not yet replace the built-in Home AI Growth page.

## Local Development

```bash
npm run check
npm test
GROWTH_PORT=4881 GROWTH_REGISTRATION_KEY=dev-registration-key npm start
```

Manifest:

```bash
curl http://127.0.0.1:4881/api/v1/hermes/plugin/manifest
```
