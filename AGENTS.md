# Growth Plugin Agent Instructions

Use English for engineering documents, code comments, runbooks, handoffs,
technical notes, and implementation plans. Use Chinese only for user-facing
assistant replies and product UI text.

Before substantial work in this workspace, read:

1. `.agent-context/PROJECT_CONTEXT.md`
2. `.agent-context/HANDOFF.md`
3. `docs/HOME_AI_PLATFORM_CONTRACT.md`

The canonical Home AI platform contracts live in
`/Users/hermes-dev/HermesMobileDev/app/docs/PLATFORM_CONTRACTS/`.

Do not store raw access keys, launch tokens, passwords, cookies, or private
payloads in docs, logs, handoffs, or committed files.

Plugin main/source thread preflight:
- Before non-trivial Growth plugin work, run:
  `node /Users/hermes-dev/HermesMobileDev/app/scripts/main-thread-routing-preflight.js --source-thread-role plugin_main --task "<task>" --changed-file <path> --mode classify`
- If the result is `classification=plugin_worker`, dispatch a bounded
  `plugin_worker` task card with a terminal return contract, privacy boundary,
  conflict rule, and expected validation, or return `blocked` with the missing
  lane.
- Do not use Task Intake, deploy lanes, audit lanes, Loop lanes, or the current
  plugin source thread as a Worker fallback.
