# PROJECT_CONTEXT

Last compacted: 2026-06-18T09:26:52.492Z

This live project context was automatically compacted before a Codex Mobile continuation.
The full previous context was archived and should be read only when this routing index is insufficient.

## Compaction Summary

- Workspace: `/Users/hermes-dev/HermesMobileDev/plugins/growth`
- Original project context bytes: `137663`
- Archived full project context: `/Users/hermes-dev/HermesMobileDev/plugins/growth/.agent-context/archive/context-compaction-20260618_092652/PROJECT_CONTEXT.full-before-context-budget.md`
- Preserved live excerpt chars: `777`

## Source Of Truth

1. Current repository files and runtime checks.
2. Latest source-thread handoff under `.agent-context/thread-handoffs/` for explicit continuation threads.
3. This compact `.agent-context/PROJECT_CONTEXT.md` and `.agent-context/HANDOFF.md`.
4. Focused docs under `docs/`.
5. Archived full context only when old provenance is explicitly needed.

## Startup Guidance

- Read `.agent-context/HANDOFF.md` after this file.
- Read `docs/README.md`, then the smallest relevant focused doc.
- Keep raw secrets, tokens, one-time approvals, upload contents, full rollout logs, and `.codex` runtime state out of shared context and Git.
- Do not load the archived full project context by default. Load it only when the user asks about older provenance, a missing rule, or a historical decision not present in live docs.

## Preserved Project Context Excerpt

# Growth Plugin Project Context

## Purpose

This workspace is the clean Home AI Growth embedded plugin workspace.

The older Mac `growth` directories were Home AI full-repository clones, not
standard plugins. They remain useful only as references to the built-in Growth
module and have been archived outside this workspace.

## Canonical Platform Contract

Read `docs/HOME_AI_PLATFORM_CONTRACT.md` first for local facts and canonical
Home AI contract links.

Growth-specific documents are owned by t

...(archived middle omitted; read the archive path above when older details are needed)...

## Development Rule

Extract Growth code from the Home AI built-in module only through a documented
service/API boundary. Do not copy the Home AI server wholesale into this
workspace.
