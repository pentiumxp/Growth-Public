# HANDOFF

## Home AI Platform Contract Pointer

- Home AI platform contract version: `20260609-v2`.
- Local pointer: `docs/HOME_AI_PLATFORM_CONTRACT.md`.
- Canonical Home AI docs live under:
  `/Users/hermes-dev/HermesMobileDev/app/docs/PLATFORM_CONTRACTS/`.
- Do not record raw secrets, access keys, workspace keys, launch tokens, or
  private payloads in this handoff.

## 2026-06-10 Clean Growth Plugin Workspace Created

- Archived the two incorrect Home AI full-repository Growth clones:
  - `/Users/hermes-dev/HermesMobileDev/plugins/growth`;
  - `/Users/xuxin/Desktop/growth`.
- Archive location:
  `/Users/hermes-dev/HermesMobileDev/_archived-growth-clones/20260610T002452Z`.
- Created a new clean Growth plugin scaffold at:
  `/Users/hermes-dev/HermesMobileDev/plugins/growth`.
- Initialized the clean workspace as a git repository and pushed it to:
  `git@github.com:pentiumxp/Education.git`.
- The previous remote `Education/main` was preserved before cleanup as:
  `archive/education-pre-growth-plugin-20260610`
  (`8c9e898b7ff21a4318975eba2baf5f75e9b33f57`).
- Current `Education/main` is:
  `55110c98acc670c01b5abb9091b15dcc5f7e9ca2`
  (`chore: scaffold growth plugin workspace`).
- The scaffold includes:
  - embedded plugin manifest endpoint;
  - workspace registration endpoint;
  - launch endpoint placeholder;
  - minimal Growth API and embedded UI;
  - platform contract pointer;
  - focused tests.
- Validation passed:
  - `npm run check`;
  - `npm test`;
  - local smoke on `http://127.0.0.1:4881` for manifest, status, board,
    workspace provisioning, and launch.
- The temporary smoke service was stopped and local smoke data was deleted.
- This scaffold is not yet registered in the Home AI host and does not yet own
  the built-in learning-growth data, MCP toolset, or production launchd
  service.

## Next Steps

1. Decide the first extraction boundary from Home AI built-in Growth:
   board projection, card detail, or teaching-card workflow.
2. Add host registration for plugin id `growth` only after the plugin manifest,
   workspace provisioning, and embedded UI harness pass.
3. Add the Growth MCP toolset only after plugin-side data/API ownership is
   explicit.
