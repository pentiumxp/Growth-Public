# Growth Plugin Project Context

## Purpose

This workspace is the clean Home AI Growth embedded plugin workspace.

The older Mac `growth` directories were Home AI full-repository clones, not
standard plugins. They remain useful only as references to the built-in Growth
module and have been archived outside this workspace.

## Canonical Platform Contract

Read `docs/HOME_AI_PLATFORM_CONTRACT.md` first for local facts and canonical
Home AI contract links.

## Current State

- Plugin id: `growth`.
- Default local port: `4881`.
- Registration credential env: `GROWTH_REGISTRATION_KEY` or
  `GROWTH_REGISTRATION_KEY_PATH`.
- Workspace binding: `.hermes-growth/config.json` and
  `.hermes-growth/access-key.txt`.
- Current implementation is scaffold-only. It does not yet own Home AI
  learning-growth data or MCP tools.

## Development Rule

Extract Growth code from the Home AI built-in module only through a documented
service/API boundary. Do not copy the Home AI server wholesale into this
workspace.
