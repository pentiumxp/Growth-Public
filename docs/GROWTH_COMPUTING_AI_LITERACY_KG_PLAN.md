# Fanfan Computing And AI Literacy Knowledge Graph Plan

Last updated: 2026-06-19.
Status: source pack generated and imported into the local Mac development
SQLite database. No production deployment, release approval, scheduler
permission, Gateway call, or learner-state mutation has been performed.

## Purpose

This document records the Owner decision to add a new Growth knowledge graph
category for Fanfan's broad computing and AI literacy path.

The goal is not to continue a narrow Python -> C++ -> computer engineering
track. Fanfan should keep Python as the main practical programming language
for now, but the long-range learning target should shift toward:

- problem discovery and problem definition;
- requirement framing and tradeoff thinking;
- structured collaboration with AI coding tools;
- broad computing literacy across systems, data, web, security, history, and
  AI;
- cross-disciplinary integration and clear explanation of created artifacts.

This package should be breadth-first and age-appropriate for a 13-year-old
middle-school learner. It should provide enough structure for Growth card
planning, evidence binding, and later stage checkpoints, without becoming a
full university computer science curriculum.

## Current Growth Graph State

Before this slice, the current Mac development runtime database had one native
imported domain pack:

| Field | Value |
| --- | --- |
| `domainPackId` | `domain_pack_fanfan_cambridge_pathway_v1` |
| `domain` | `cross_subject_curriculum` |
| `title` | `Fanfan Cambridge Lower Secondary to IGCSE and A Level pathway seed` |
| `version` | `2026-05-27-v1` |
| `status` | `validated_seed` |
| `nodes` | `294` |
| `edges` | `329` |

After the local development import, the same database also contains:

| Field | Value |
| --- | --- |
| `domainPackId` | `domain_pack_fanfan_computing_ai_literacy_v1` |
| `domain` | `computing_ai_literacy` |
| `title` | `Fanfan Computing and AI Literacy Breadth Path` |
| `version` | `2026-06-19-v1` |
| `status` | `validated_seed` |
| `nodes` | `83` |
| `edges` | `140` |

The Cambridge pack already contains 32 `computer_science` nodes, but they are
mainly IGCSE / A-Level exam-oriented nodes such as data representation,
hardware, software, internet use, algorithm design, databases, Boolean logic,
and AI. Those nodes are useful as a distant reference, not as the primary route
for the new AI-coding-era learning plan.

The new category should therefore be a separate domain pack rather than an
extension of the Cambridge pathway pack.

## Local Learner Evidence

The local Fanfan Python archive remains the baseline for placement and project
interest. It must be used only as summary evidence, not copied into graph
records.

Current local archive:

```text
/Users/xuxin/HermesMobile/data/drive/users/owner/Hermes-徐欣/凡凡/01_Python编程
```

Current master file:

```text
凡凡_Python编程学习日志_全量_2025-09-26_to_2026-04-30.md
```

Summary placement from that archive:

- Fanfan has moved beyond beginner syntax into project-based Python.
- Current strengths include project interest, game iteration, logical
  understanding, willingness to explain code, and transfer across games, small
  tools, and web-scraping tasks.
- Already covered or partly covered: `pygame`, event loops, functions,
  classes/objects, lists/dicts/sets, sorting, Git/GitHub basics, APIs, HTTP
  requests, JSON, HTML/CSS/JavaScript basics, static/dynamic webpage concepts,
  scraping, CSV persistence, exception handling, and session/history
  persistence.
- Current development needs include careful reading, long-task decomposition,
  debugging habits, project explanation, Git closure, structured parsing, field
  protection, end-to-end validation, and making AI assistance explicit.
- The observed AI-coding gap is that Fanfan can use Codex-like tools, but the
  behavior is still close to wishing for results. The graph should teach
  context, requirements, decomposition, acceptance criteria, test evidence,
  diff review, and reflection.

Do not import raw chat logs, answer keys, full submissions, private payloads,
token-looking values, local attachment bodies, or full copyrighted source
material into the graph source pack.

## Source Strategy

Use a curated multi-source seed. No single external curriculum should be
imported wholesale.

| Source family | Use in this pack |
| --- | --- |
| K-12 CS Framework, `https://k12cs.org/` | Core breadth frame: computing systems, networks, data, algorithms/programming, impacts, and CS practices. |
| CSTA K-12 Standards, `https://csteachers.org/k12standards/` | Measurable K-12 expectations and practice language. |
| Teach Computing KS3, `https://teachcomputing.org/curriculum/key-stage-3` | Age-appropriate unit sequence for 11-14: Python, data science, cybersecurity, media, web, physical computing. |
| Raspberry Pi Computing Curriculum, `https://www.raspberrypi.org/curriculum` | Free structured computing resources for ages 5-16 and project ideas. |
| AI4K12, `https://ai4k12.org/` | AI literacy frame: perception, representation and reasoning, learning, natural interaction, and societal impact. |
| UNESCO AI competency framework for students, `https://unesdoc.unesco.org/ark%3A/48223/pf0000391105/PDF/391105eng.pdf.multi` | Responsible, critical, human-centered AI use and AI system design competencies. |
| ACM/IEEE/AAAI CS2023, `https://csed.acm.org/` | Distant university knowledge-area map only; not depth target for this learner stage. |
| Computer History Museum, `https://computerhistory.org/` | Computing history, artifact timeline, and social context. |
| Stanford Encyclopedia of Philosophy AI entry, `https://plato.stanford.edu/entries/artificial-intelligence/` | AI history and conceptual/philosophical context. |
| Python official tutorial, `https://docs.python.org/3/tutorial/index.html` | Python language boundary and official reference layer. |
| MDN Learn Web Development, `https://developer.mozilla.org/en-US/docs/Learn_web_development` | Web, HTTP, data, and API literacy. |
| Pro Git, `https://git-scm.com/book/en/v2` | Git vocabulary and source-control workflow. |
| Pygame documentation, `https://www.pygame.org/docs/` | Game-project implementation surface for current learner interest. |
| OpenAI Codex docs, `https://developers.openai.com/codex/learn/best-practices`, `https://developers.openai.com/codex/guides/agents-md`, and `https://developers.openai.com/codex/workflows` | AI coding collaboration habits: context, durable guidance, validation, and repeatable workflows. |

## Proposed Domain Pack Identity

| Field | Proposed value |
| --- | --- |
| `schemaVersion` | `hermes.learningGraphSeed.v0.1` |
| `importId` | `kg_import_20260619_fanfan_computing_ai_literacy_v1` |
| `version` | `2026-06-19-v1` |
| `privacyClass` | `summary_only` |
| `domainPackId` | `domain_pack_fanfan_computing_ai_literacy_v1` |
| `domain` | `computing_ai_literacy` |
| `title` | `Fanfan Computing and AI Literacy Breadth Path` |
| `sourceKind` | `curated_multi_source_seed` |
| `visibility` | `private_seed` |
| `importStatus` | `validated_seed` after source-pack dry-run and local development import |

## Generated Source Pack

Current generated source artifact:

```text
knowledge-graph/fanfan-computing-ai-literacy-v1.json
```

Generator:

```text
scripts/build-fanfan-computing-ai-literacy-graph-pack.js
```

Validated counts:

| Metric | Count |
| --- | ---: |
| source documents | 19 |
| domain packs | 1 |
| nodes | 83 |
| edges | 140 |
| prerequisite edges | 58 |
| pathway nodes | 1 |
| strand nodes | 8 |
| topic nodes | 70 |
| stage assessment nodes | 4 |

Source SHA-256:

```text
c30acd8ddbf4610f3a7b7b723b003687619596b75f1108eb45518962f0ba5db9
```

Dry-run and readback validation both reported:

- duplicate node ids: `0`;
- duplicate edge ids: `0`;
- missing edge endpoints: `0`;
- prerequisite cycles: `0`;
- rejected records: `0`;
- unsafe raw-content keys: `0`;
- absolute source-document paths: `0`.

Local development import target:

```text
data/growth-learning.sqlite3
```

Import backup created under the ignored local backup directory:

```text
data/backups/growth-learning-before-graph-import-20260618T224501Z.sqlite3
```

Post-import local development database counts:

| Table | Count |
| --- | ---: |
| `learning_graph_imports` | 2 |
| `learning_graph_domain_packs` | 2 |
| `learning_graph_nodes` | 377 |
| `learning_graph_edges` | 469 |
| `learning_graph_plans` | 4 |
| `learning_card_graph_bindings` | 4 |

## Design Principles

1. Python is the practical language, not the identity of the whole learning
   path.
2. AI coding is a supervised engineering workflow, not prompt wishing.
3. Every formal card must bind to graph nodes and summary-only evidence.
4. Depth should be capped for middle school: broad orientation, usable mental
   models, and project evidence matter more than university-level theory.
5. Code artifacts may be referenced through bounded evidence metadata, but raw
   code, raw prompts, answer keys, or private project payloads should not be
   copied into graph records.
6. Current learner interest in games should remain the first project surface,
   but the same skills should transfer to data, web, automation, science, and
   communication projects.
7. Stage assessments should evaluate explanation, debugging, requirement
   clarity, validation evidence, and responsible AI use, not only whether a
   program runs.

## V1 Strand Map

### Strand 1: Python As A Practical Tool

Purpose: keep Python as the main implementation language while moving from
syntax recall toward small, explainable, testable tools.

Candidate nodes:

- `kg_compute_python_tooling`: Python interpreter, script, REPL, and project
  file roles.
- `kg_compute_python_values_control`: variables, types, conditionals, loops,
  and simple state.
- `kg_compute_python_functions_boundaries`: function parameters, return values,
  and single-responsibility boundaries.
- `kg_compute_python_collections_records`: lists, dictionaries, nested records,
  and structured data.
- `kg_compute_python_oop_game_entities`: classes, objects, attributes, methods,
  and game entities.
- `kg_compute_python_files_csv_json`: files, CSV, JSON, encodings, and
  persistence.
- `kg_compute_python_exceptions_debugging`: exceptions, tracebacks, defensive
  checks, and debugging.
- `kg_compute_python_api_requests`: requests, responses, HTTP status, JSON API
  results, and safe token concepts without storing secrets.
- `kg_compute_python_html_parsing`: HTML tree structure, selectors, field
  extraction, and container-first parsing.
- `kg_compute_python_session_persistence`: session, history records, local
  state, and resume behavior.

Initial placement:

- Fanfan has partial or strong evidence for most nodes in this strand.
- The weakest part is not exposure; it is reliable decomposition, validation,
  and independent explanation under longer tasks.

### Strand 2: Computational Thinking

Purpose: make problem-solving concepts explicit so they transfer beyond Python.

Candidate nodes:

- `kg_compute_problem_framing`: turn a vague wish into a concrete problem.
- `kg_compute_decomposition`: split a long task into small steps.
- `kg_compute_abstraction_models`: choose a useful model of a real-world or
  game system.
- `kg_compute_algorithm_patterns`: search, sort, count, filter, match, and
  simulate.
- `kg_compute_data_representation`: numbers, text, images, tables, files, and
  encoding.
- `kg_compute_state_and_events`: state transitions, event loops, and user
  actions.
- `kg_compute_testing_debugging`: test cases, expected output, reproduction,
  and fix verification.
- `kg_compute_tradeoffs`: simple tradeoffs among correctness, simplicity,
  speed, maintainability, and safety.

### Strand 3: Software Engineering With AI Coding

Purpose: teach Fanfan to work with Codex-like tools as an engineering partner.

Candidate nodes:

- `kg_compute_ai_coding_context`: provide files, goal, constraints, and current
  state before asking for help.
- `kg_compute_ai_coding_requirements`: express user story, scope, non-goals,
  and acceptance criteria.
- `kg_compute_ai_coding_task_breakdown`: ask for a plan, split work, and track
  completion.
- `kg_compute_ai_coding_repo_awareness`: understand file structure, existing
  patterns, and why changes belong in specific files.
- `kg_compute_ai_coding_git_workflow`: branch, diff, commit, push, and
  rollback concepts.
- `kg_compute_ai_coding_test_validation`: run or design checks before claiming
  done.
- `kg_compute_ai_coding_diff_review`: read a diff and identify unintended
  changes.
- `kg_compute_ai_coding_debug_loop`: reproduce, hypothesize, inspect logs,
  patch, and retest.
- `kg_compute_ai_coding_docs_handoff`: write short README, usage note, and
  handoff evidence.
- `kg_compute_ai_coding_responsibility`: separate AI suggestion from learner
  understanding and final responsibility.

Initial placement:

- Fanfan appears to use AI tools and likes project effects, but the workflow is
  currently closer to prompt wishing. This strand should be the first real
  shift in learning behavior.

### Strand 4: Web, Data, And APIs

Purpose: convert current scraping/API exposure into durable web and data
literacy.

Candidate nodes:

- `kg_compute_web_html_dom`: HTML elements, attributes, nesting, IDs/classes,
  links, and images.
- `kg_compute_web_css_js`: CSS styling, JavaScript interaction, and page
  behavior.
- `kg_compute_web_http_urls`: URL parts, GET/POST, status codes, headers, and
  request/response flow.
- `kg_compute_web_api_contracts`: API inputs, outputs, schemas, rate limits,
  and authentication concepts without secrets.
- `kg_compute_data_cleaning`: missing fields, text cleanup, type conversion,
  and validation.
- `kg_compute_data_tables_csv`: rows, columns, headers, CSV writer, encoding,
  and spreadsheet readback.
- `kg_compute_data_pipeline`: collect -> parse -> transform -> save -> verify.
- `kg_compute_web_dynamic_pages`: dynamic loading, browser automation concepts,
  and scraping limits.
- `kg_compute_web_ethics`: allowed use, robots/terms awareness, copyright, and
  privacy boundaries.

### Strand 5: Computing Systems

Purpose: give enough mental model for debugging and AI-assisted building.

Candidate nodes:

- `kg_compute_system_hardware`: CPU, memory, storage, input/output, and
  sensors.
- `kg_compute_system_os_files`: operating system, process, file path, working
  directory, and permissions.
- `kg_compute_system_runtime_packages`: interpreter, library, package, virtual
  environment, and version.
- `kg_compute_system_networks`: IP, DNS, client/server, latency, and failure.
- `kg_compute_system_cloud`: local machine versus server, hosting, logs, and
  deployment concept.
- `kg_compute_system_databases`: table, row, key, query, and persistence.
- `kg_compute_system_security`: passwords, tokens, permissions, phishing, and
  least privilege.
- `kg_compute_system_reliability`: backups, error recovery, monitoring, and
  reproducibility.

### Strand 6: AI Literacy

Purpose: make AI understandable enough for safe and effective use.

Candidate nodes:

- `kg_compute_ai_history`: symbolic AI, neural networks, machine learning,
  deep learning, and generative AI milestones.
- `kg_compute_ai4k12_perception`: how computers sense or receive inputs.
- `kg_compute_ai4k12_representation_reasoning`: representations, rules,
  search, and reasoning.
- `kg_compute_ai4k12_learning`: data, training, inference, examples, and
  feedback.
- `kg_compute_ai4k12_natural_interaction`: language, images, multimodal input,
  and conversational tools.
- `kg_compute_ai4k12_societal_impact`: bias, privacy, jobs, safety, and
  responsibility.
- `kg_compute_llm_context_tokens`: context, prompt, token budget, memory, and
  why missing context causes bad answers.
- `kg_compute_llm_evaluation`: hallucination, checking sources, tests, and
  evidence.
- `kg_compute_human_in_loop`: human goal-setting, review, judgment, and
  accountability.

### Strand 7: Product And Problem Solving

Purpose: move from "make a cool thing" to "solve a defined problem well."

Candidate nodes:

- `kg_compute_product_problem_discovery`: observe a user pain or opportunity.
- `kg_compute_product_users_stakeholders`: identify user, Owner, learner, and
  affected people.
- `kg_compute_product_requirements`: must-have, nice-to-have, constraints, and
  non-goals.
- `kg_compute_product_prototype`: make the smallest useful version.
- `kg_compute_product_feedback`: collect feedback, identify bug versus feature,
  and decide next action.
- `kg_compute_product_metrics`: define success with simple measurable evidence.
- `kg_compute_product_explanation`: demo, describe design choices, and answer
  questions.
- `kg_compute_product_cross_domain`: connect computing with science, writing,
  health, finance, games, or daily life.

### Strand 8: History, Society, And Ethics

Purpose: broaden perspective and prevent computing from being reduced to code.

Candidate nodes:

- `kg_compute_history_timeline`: from calculation tools to modern computers.
- `kg_compute_history_internet_web`: internet, web, search, mobile, cloud, and
  platforms.
- `kg_compute_history_games_media`: games, graphics, interaction, and digital
  creativity.
- `kg_compute_society_open_source`: open source, community, licenses, and
  reuse.
- `kg_compute_society_privacy_data_rights`: personal data, consent, retention,
  and data ownership.
- `kg_compute_society_accessibility`: design for different users and abilities.
- `kg_compute_society_copyright`: code, media, datasets, attribution, and fair
  use boundaries.
- `kg_compute_society_sustainability`: energy, hardware lifecycle, and
  computing's environmental footprint.

## Evidence Types

Use bounded evidence metadata only.

| Evidence type | Description | Store in graph? |
| --- | --- | --- |
| `project_demo_summary` | Short summary of what the project does and what changed. | Yes, bounded. |
| `code_diff_summary` | File/module names, change intent, and learner explanation. | Yes, bounded; no full code. |
| `test_result_summary` | Test name, expected result, actual result, and pass/fail. | Yes, bounded. |
| `debug_trace_summary` | Symptom, hypothesis, fix, and verification. | Yes, bounded; no raw logs with private payloads. |
| `design_note_summary` | Problem, user, requirements, non-goals, and tradeoffs. | Yes, bounded. |
| `oral_explanation_summary` | Learner explanation of design and code behavior. | Yes, bounded. |
| `ai_assistance_disclosure` | What AI suggested, what learner changed, what learner understands. | Yes, bounded; no raw prompts/model output. |
| `responsibility_review` | Privacy, copyright, safety, and source-use check. | Yes, bounded. |

## Prerequisite Edge Rules

V1 does not need dense prerequisite chains. It should use sparse,
reviewable edges:

- Python implementation nodes may depend on relevant computational thinking
  nodes, but not every syntax node needs an edge.
- AI coding workflow nodes should depend on problem framing and validation
  nodes, not only on Python syntax.
- Web/data/API nodes should depend on structured data and testing/debugging
  nodes.
- Systems/security nodes should be mostly breadth nodes and should not block
  project learning unless a card specifically touches credentials, cloud, or
  deployment.
- History/ethics nodes should provide context and reflection evidence rather
  than block creation cards.
- Stage assessments should cover a cross-strand node set, for example:
  requirements + AI collaboration + implementation + validation +
  explanation + responsible-use review.

## Candidate Stage Checkpoints

| Checkpoint | Coverage | Example evidence |
| --- | --- | --- |
| `checkpoint_ai_coding_game_feature_v1` | Define one game feature, use AI coding with context, review diff, test behavior, explain result. | Project demo summary, code diff summary, test result, AI assistance disclosure, oral explanation. |
| `checkpoint_web_data_pipeline_v1` | Collect structured web/API data, clean it, save CSV/JSON, and verify output. | Data pipeline summary, test result, debug trace, privacy/source review. |
| `checkpoint_problem_to_prototype_v1` | Turn a real problem into requirements and a small prototype. | Design note, prototype summary, feedback summary, tradeoff explanation. |
| `checkpoint_ai_literacy_review_v1` | Explain how an AI tool helped, where it may be wrong, and how the learner checked it. | AI assistance disclosure, hallucination/source check, human-in-loop reflection. |

## First Source Pack Shape

The first importable seed is still small enough to review manually, but it is
broader than the initial estimate because the final source set includes web,
Git, Pygame, and Codex workflow references:

- 1 domain pack;
- 83 nodes;
- 140 edges;
- source documents as bounded references only;
- no local absolute paths in `sourceDocuments.localPath`;
- no raw lesson bodies, raw answers, answer keys, raw prompts, raw model
  outputs, transcripts, or private payloads.

Suggested source refs:

- `local:fanfan_python_archive_summary_20260619`
- `k12cs:framework`
- `k12cs:framework-concepts`
- `csta:k12_standards`
- `teachcomputing:ks3`
- `raspberrypi:computing_curriculum`
- `ai4k12:guidelines`
- `ai4k12:gradeband_progressions`
- `unesco:ai_competency_students_2024`
- `cs2023:knowledge_areas`
- `chm:timeline`
- `sep:artificial_intelligence`
- `python:official_tutorial`
- `mdn:learn_web_development`
- `git:pro_git`
- `pygame:docs`
- `openai:codex_best_practices`
- `openai:codex_agents_md`
- `openai:codex_workflows`

## Implementation Path

Completed local-development steps:

1. Owner approved importing the pack by this plan.
2. Generated a bounded `hermes.learningGraphSeed.v0.1` JSON seed from this
   document.
3. Ran dry-run validation:

   ```bash
   node scripts/import-learning-graph-pack.js \
     --source knowledge-graph/fanfan-computing-ai-literacy-v1.json \
     --dry-run \
     --json
   ```

4. Wrote into the local Mac development SQLite database through the existing
   graph import script.
5. Verified readback by import id and direct SQLite subject counts.

Remaining steps:

1. Do not treat the local development import as production release evidence.
2. If Owner approves a production rollout, import through the same script
   against the intended production target database with an explicit backup.
3. Provision Fanfan's visible target for the new domain pack.
4. Add first daily-card recipes or graph target selections only after target
   provisioning is explicit.

## Non-Goals

- Do not replace Fanfan's private Python teacher.
- Do not add C++ as a near-term requirement.
- Do not treat university CS2023 depth as a middle-school learning target.
- Do not generate cards from a free-form "AI coding" prompt without graph
  binding.
- Do not store raw Codex prompts, raw model outputs, raw learner answers,
  answer keys, private local files, credentials, or copyrighted source bodies
  in graph records.
- Do not enable scheduler automation, release approval, or production mutation
  through this planning document.
