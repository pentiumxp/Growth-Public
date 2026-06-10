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
- Current implementation owns plugin SQLite read projections, migrated audio
  playback, historical audio BLOB backfill tooling, workspace-bound read-only
  MCP tools, workspace-bearer submission/reflection evidence write endpoints,
  async evaluation processing, per-card Growth learning coin settlement, and
  bounded completion/mastery/review event emission.
- Platform `通宝` exchange, monthly Growth coin clearing, Action Inbox/Web Push
  handoff, and Owner manual decision flows remain in Home AI until their own
  migration stages are implemented and validated.

## Development Rule

Extract Growth code from the Home AI built-in module only through a documented
service/API boundary. Do not copy the Home AI server wholesale into this
workspace.
