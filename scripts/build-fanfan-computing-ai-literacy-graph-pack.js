#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const VERSION = "2026-06-19-v1";
const IMPORT_ID = "kg_import_20260619_fanfan_computing_ai_literacy_v1";
const DOMAIN_PACK_ID = "domain_pack_fanfan_computing_ai_literacy_v1";
const DOMAIN = "computing_ai_literacy";
const CURRICULUM = "fanfan_computing_ai_literacy_v1";
const STAGE = "middle_school_breadth";
const OUTPUT_PATH = path.join(__dirname, "..", "knowledge-graph", "fanfan-computing-ai-literacy-v1.json");

const DEFAULT_MASTERY_SIGNALS = Object.freeze([
  "project_demo_summary",
  "code_diff_summary",
  "test_result_summary",
  "debug_trace_summary",
  "design_note_summary",
  "oral_explanation_summary",
  "ai_assistance_disclosure",
  "responsibility_review"
]);

const DEFAULT_EXPERIENCE_SIGNALS = Object.freeze([
  "too_easy",
  "right_level",
  "too_hard",
  "not_learned",
  "confusing",
  "needs_more_project_context"
]);

const sourceDocuments = Object.freeze([
  {
    sourceRef: "local:fanfan_python_archive_summary_20260619",
    title: "Fanfan Python archive bounded placement summary",
    localPath: "",
    officialUrl: ""
  },
  {
    sourceRef: "k12cs:framework",
    title: "K-12 Computer Science Framework",
    localPath: "",
    officialUrl: "https://k12cs.org/"
  },
  {
    sourceRef: "k12cs:framework-concepts",
    title: "K-12 Computer Science Framework statements by concept",
    localPath: "",
    officialUrl: "https://k12cs.org/framework-statements-by-concept/"
  },
  {
    sourceRef: "csta:k12_standards",
    title: "CSTA K-12 Computer Science Standards",
    localPath: "",
    officialUrl: "https://csteachers.org/k12standards/"
  },
  {
    sourceRef: "teachcomputing:ks3",
    title: "Teach Computing Key Stage 3 curriculum",
    localPath: "",
    officialUrl: "https://teachcomputing.org/curriculum/key-stage-3"
  },
  {
    sourceRef: "raspberrypi:computing_curriculum",
    title: "Raspberry Pi Foundation Computing Curriculum",
    localPath: "",
    officialUrl: "https://www.raspberrypi.org/curriculum"
  },
  {
    sourceRef: "ai4k12:guidelines",
    title: "AI4K12 K-12 AI Guidelines",
    localPath: "",
    officialUrl: "https://ai4k12.org/"
  },
  {
    sourceRef: "ai4k12:gradeband_progressions",
    title: "AI4K12 grade-band progression charts",
    localPath: "",
    officialUrl: "https://ai4k12.org/gradeband-progression-charts/"
  },
  {
    sourceRef: "unesco:ai_competency_students_2024",
    title: "UNESCO AI competency framework for students",
    localPath: "",
    officialUrl: "https://unesdoc.unesco.org/ark%3A/48223/pf0000391105/PDF/391105eng.pdf.multi"
  },
  {
    sourceRef: "cs2023:knowledge_areas",
    title: "ACM/IEEE-CS/AAAI CS2023 knowledge areas",
    localPath: "",
    officialUrl: "https://csed.acm.org/knowledge-areas/"
  },
  {
    sourceRef: "chm:timeline",
    title: "Computer History Museum timeline",
    localPath: "",
    officialUrl: "https://www.computerhistory.org/timeline/"
  },
  {
    sourceRef: "sep:artificial_intelligence",
    title: "Stanford Encyclopedia of Philosophy: Artificial Intelligence",
    localPath: "",
    officialUrl: "https://plato.stanford.edu/entries/artificial-intelligence/"
  },
  {
    sourceRef: "python:official_tutorial",
    title: "Python official tutorial",
    localPath: "",
    officialUrl: "https://docs.python.org/3/tutorial/index.html"
  },
  {
    sourceRef: "mdn:learn_web_development",
    title: "MDN Learn web development",
    localPath: "",
    officialUrl: "https://developer.mozilla.org/en-US/docs/Learn_web_development"
  },
  {
    sourceRef: "git:pro_git",
    title: "Pro Git book",
    localPath: "",
    officialUrl: "https://git-scm.com/book/en/v2"
  },
  {
    sourceRef: "pygame:docs",
    title: "Pygame documentation",
    localPath: "",
    officialUrl: "https://www.pygame.org/docs/"
  },
  {
    sourceRef: "openai:codex_best_practices",
    title: "OpenAI Codex best practices",
    localPath: "",
    officialUrl: "https://developers.openai.com/codex/learn/best-practices"
  },
  {
    sourceRef: "openai:codex_agents_md",
    title: "OpenAI Codex AGENTS.md guide",
    localPath: "",
    officialUrl: "https://developers.openai.com/codex/guides/agents-md"
  },
  {
    sourceRef: "openai:codex_workflows",
    title: "OpenAI Codex workflows",
    localPath: "",
    officialUrl: "https://developers.openai.com/codex/workflows"
  }
]);

const strands = Object.freeze([
  {
    id: "python_practical_tool",
    title: "Python as a practical tool",
    sourceRef: "python:official_tutorial",
    nodes: [
      ["python_tooling", "Python interpreter, scripts, REPL, project files, and run context", ["Explain where Python code runs and which file or prompt is active."], ["oral_explanation_summary", "project_demo_summary"]],
      ["python_values_control", "Values, variables, types, conditions, loops, and simple state", ["Use control flow to describe a small system or game rule."], ["test_result_summary", "oral_explanation_summary"]],
      ["python_functions_boundaries", "Function parameters, return values, and responsibility boundaries", ["Split a repeated behavior into a named function with inputs and output."], ["code_diff_summary", "test_result_summary"]],
      ["python_collections_records", "Lists, dictionaries, nested records, and structured data", ["Choose a list or dictionary shape for repeated records."], ["project_demo_summary", "oral_explanation_summary"]],
      ["python_oop_game_entities", "Classes, objects, attributes, methods, and game entities", ["Model a game entity as object state plus behavior."], ["project_demo_summary", "code_diff_summary"]],
      ["python_files_csv_json", "Files, CSV, JSON, encodings, and persistent output", ["Save structured output and verify it can be read back."], ["test_result_summary", "debug_trace_summary"]],
      ["python_exceptions_debugging", "Exceptions, tracebacks, defensive checks, and debugging", ["Use a symptom and traceback to isolate one likely fix."], ["debug_trace_summary", "test_result_summary"]],
      ["python_api_requests", "Requests, responses, HTTP status, JSON API results, and safe token concepts", ["Describe request/response flow without exposing credentials."], ["project_demo_summary", "responsibility_review"]],
      ["python_html_parsing", "HTML tree structure, selectors, field extraction, and container-first parsing", ["Extract fields from repeated page containers without cross-record mismatch."], ["project_demo_summary", "test_result_summary"]],
      ["python_session_persistence", "Session, history records, local state, and resume behavior", ["Persist game or tool state so a later run can resume meaningfully."], ["project_demo_summary", "debug_trace_summary"]]
    ]
  },
  {
    id: "computational_thinking",
    title: "Computational thinking",
    sourceRef: "k12cs:framework",
    nodes: [
      ["problem_framing", "Turn a vague wish into a concrete computing problem", ["State the user, problem, constraint, and desired result."], ["design_note_summary"]],
      ["decomposition", "Split a long task into smaller ordered steps", ["Break one feature or bug into inspect, change, and verify steps."], ["design_note_summary", "oral_explanation_summary"]],
      ["abstraction_models", "Choose a useful model for a real-world or game system", ["Name the important state and ignore irrelevant details."], ["oral_explanation_summary", "project_demo_summary"]],
      ["algorithm_patterns", "Search, sort, count, filter, match, and simulate", ["Recognize common algorithm patterns inside a project."], ["test_result_summary"]],
      ["data_representation", "Numbers, text, images, tables, files, and encodings", ["Explain how one idea changes representation across code and files."], ["oral_explanation_summary"]],
      ["state_and_events", "State transitions, event loops, and user actions", ["Trace what changes after one user or timer event."], ["project_demo_summary", "debug_trace_summary"]],
      ["testing_debugging", "Test cases, expected output, reproduction, and fix verification", ["Define expected behavior before claiming a fix is done."], ["test_result_summary", "debug_trace_summary"]],
      ["tradeoffs", "Tradeoffs among correctness, simplicity, speed, maintainability, and safety", ["Explain one design tradeoff in an age-appropriate project."], ["oral_explanation_summary", "design_note_summary"]]
    ]
  },
  {
    id: "software_engineering_ai_coding",
    title: "Software engineering with AI coding",
    sourceRef: "openai:codex_best_practices",
    nodes: [
      ["ai_coding_context", "Provide files, goal, constraints, and current state before asking AI for help", ["Prepare enough context for Codex to inspect the right code."], ["ai_assistance_disclosure", "design_note_summary"]],
      ["ai_coding_requirements", "Express user story, scope, non-goals, and acceptance criteria", ["Turn a feature wish into a clear build request."], ["design_note_summary"]],
      ["ai_coding_task_breakdown", "Ask for a plan, split work, and track completion", ["Use a checklist or plan to keep a task from becoming vague."], ["ai_assistance_disclosure", "design_note_summary"]],
      ["ai_coding_repo_awareness", "Understand file structure, existing patterns, and ownership", ["Point to likely files and explain why they matter."], ["oral_explanation_summary", "code_diff_summary"]],
      ["ai_coding_git_workflow", "Branch, diff, commit, push, and rollback concepts", ["Use Git vocabulary to describe what changed and how to recover."], ["code_diff_summary", "responsibility_review"]],
      ["ai_coding_test_validation", "Run or design checks before claiming done", ["Match a change to concrete verification evidence."], ["test_result_summary"]],
      ["ai_coding_diff_review", "Read a diff and identify unintended changes", ["Spot whether an AI patch touched unrelated files."], ["code_diff_summary", "oral_explanation_summary"]],
      ["ai_coding_debug_loop", "Reproduce, hypothesize, inspect logs, patch, and retest", ["Describe a debug loop with evidence before and after."], ["debug_trace_summary", "test_result_summary"]],
      ["ai_coding_docs_handoff", "Write short README, usage notes, and handoff evidence", ["Leave a future reader enough context to run or review the project."], ["design_note_summary"]],
      ["ai_coding_responsibility", "Separate AI suggestion from learner understanding and final responsibility", ["Identify what AI did, what the learner changed, and what the learner can explain."], ["ai_assistance_disclosure", "oral_explanation_summary"]]
    ]
  },
  {
    id: "web_data_apis",
    title: "Web, data, and APIs",
    sourceRef: "mdn:learn_web_development",
    nodes: [
      ["web_html_dom", "HTML elements, attributes, nesting, IDs/classes, links, and images", ["Use HTML structure to find or create meaningful content."], ["project_demo_summary", "oral_explanation_summary"]],
      ["web_css_js", "CSS styling, JavaScript interaction, and page behavior", ["Explain the difference between structure, style, and behavior."], ["project_demo_summary"]],
      ["web_http_urls", "URL parts, GET/POST, status codes, headers, and request/response flow", ["Trace a simple web request from URL to response."], ["oral_explanation_summary"]],
      ["web_api_contracts", "API inputs, outputs, schemas, rate limits, and authentication concepts", ["Use an API result without exposing credentials."], ["project_demo_summary", "responsibility_review"]],
      ["data_cleaning", "Missing fields, text cleanup, type conversion, and validation", ["Handle missing or messy fields without crashing."], ["test_result_summary", "debug_trace_summary"]],
      ["data_tables_csv", "Rows, columns, headers, CSV writer, encoding, and spreadsheet readback", ["Write table output and verify rows and headers."], ["test_result_summary"]],
      ["data_pipeline", "Collect, parse, transform, save, and verify", ["Explain each step of a small data pipeline."], ["project_demo_summary", "oral_explanation_summary"]],
      ["web_dynamic_pages", "Dynamic loading, browser automation concepts, and scraping limits", ["Explain why data may not be present in initial HTML."], ["oral_explanation_summary"]],
      ["web_ethics", "Allowed use, source terms awareness, copyright, and privacy boundaries", ["Identify whether a data collection task is appropriate."], ["responsibility_review"]]
    ]
  },
  {
    id: "computing_systems",
    title: "Computing systems",
    sourceRef: "k12cs:framework-concepts",
    nodes: [
      ["system_hardware", "CPU, memory, storage, input/output, and sensors", ["Relate program behavior to basic hardware roles."], ["oral_explanation_summary"]],
      ["system_os_files", "Operating system, process, file path, working directory, and permissions", ["Fix or explain a path/permission/run-location problem."], ["debug_trace_summary"]],
      ["system_runtime_packages", "Interpreter, library, package, virtual environment, and version", ["Explain why an import or package version matters."], ["debug_trace_summary"]],
      ["system_networks", "IP, DNS, client/server, latency, and failure", ["Describe why a network request may fail."], ["oral_explanation_summary", "debug_trace_summary"]],
      ["system_cloud", "Local machine versus server, hosting, logs, and deployment concept", ["Distinguish local code from deployed services."], ["oral_explanation_summary"]],
      ["system_databases", "Table, row, key, query, and persistence", ["Describe why persistent data needs a structured store."], ["project_demo_summary"]],
      ["system_security", "Passwords, tokens, permissions, phishing, and least privilege", ["Avoid exposing secrets and explain permission boundaries."], ["responsibility_review"]],
      ["system_reliability", "Backups, error recovery, monitoring, and reproducibility", ["Describe one recovery or reproducibility step."], ["debug_trace_summary"]]
    ]
  },
  {
    id: "ai_literacy",
    title: "AI literacy",
    sourceRef: "ai4k12:guidelines",
    nodes: [
      ["ai_history", "Symbolic AI, neural networks, machine learning, deep learning, and generative AI milestones", ["Place a tool in a broad AI history timeline."], ["oral_explanation_summary"]],
      ["ai4k12_perception", "How computers sense or receive inputs", ["Explain how text, image, audio, or sensor input enters a system."], ["oral_explanation_summary"]],
      ["ai4k12_representation_reasoning", "Representations, rules, search, and reasoning", ["Describe a representation that helps a system reason."], ["oral_explanation_summary"]],
      ["ai4k12_learning", "Data, training, inference, examples, and feedback", ["Distinguish training from using a trained model."], ["oral_explanation_summary"]],
      ["ai4k12_natural_interaction", "Language, images, multimodal input, and conversational tools", ["Explain why AI conversation still needs context."], ["ai_assistance_disclosure"]],
      ["ai4k12_societal_impact", "Bias, privacy, jobs, safety, and responsibility", ["Name one possible benefit and one possible harm of an AI system."], ["responsibility_review"]],
      ["llm_context_tokens", "Context, prompt, token budget, memory, and why missing context causes bad answers", ["Explain why a vague prompt can produce a bad coding answer."], ["ai_assistance_disclosure"]],
      ["llm_evaluation", "Hallucination, checking sources, tests, and evidence", ["Check an AI claim with a source or test."], ["test_result_summary", "responsibility_review"]],
      ["human_in_loop", "Human goal-setting, review, judgment, and accountability", ["Explain why the learner remains responsible for an AI-assisted result."], ["ai_assistance_disclosure", "oral_explanation_summary"]]
    ]
  },
  {
    id: "product_problem_solving",
    title: "Product and problem solving",
    sourceRef: "csta:k12_standards",
    nodes: [
      ["product_problem_discovery", "Observe a user pain or opportunity", ["Find a real problem before choosing a tool."], ["design_note_summary"]],
      ["product_users_stakeholders", "Identify user, Owner, learner, and affected people", ["Name who benefits and who may be affected."], ["design_note_summary"]],
      ["product_requirements", "Must-have, nice-to-have, constraints, and non-goals", ["Write a small requirement list with non-goals."], ["design_note_summary"]],
      ["product_prototype", "Make the smallest useful version", ["Build a small version that can be tried."], ["project_demo_summary"]],
      ["product_feedback", "Collect feedback, identify bug versus feature, and decide next action", ["Classify feedback and choose a follow-up."], ["design_note_summary"]],
      ["product_metrics", "Define success with simple measurable evidence", ["Name a simple success check for a project."], ["test_result_summary", "design_note_summary"]],
      ["product_explanation", "Demo, describe design choices, and answer questions", ["Explain a project clearly to another person."], ["oral_explanation_summary"]],
      ["product_cross_domain", "Connect computing with science, writing, health, finance, games, or daily life", ["Use computing to support another learning or life domain."], ["project_demo_summary", "oral_explanation_summary"]]
    ]
  },
  {
    id: "history_society_ethics",
    title: "History, society, and ethics",
    sourceRef: "chm:timeline",
    nodes: [
      ["history_timeline", "From calculation tools to modern computers", ["Place one computing invention in a historical sequence."], ["oral_explanation_summary"]],
      ["history_internet_web", "Internet, web, search, mobile, cloud, and platforms", ["Explain one shift in how people use computing."], ["oral_explanation_summary"]],
      ["history_games_media", "Games, graphics, interaction, and digital creativity", ["Connect a game project to broader digital media history."], ["project_demo_summary", "oral_explanation_summary"]],
      ["society_open_source", "Open source, community, licenses, and reuse", ["Explain when reuse needs attribution or license review."], ["responsibility_review"]],
      ["society_privacy_data_rights", "Personal data, consent, retention, and data ownership", ["Identify personal data and how to protect it."], ["responsibility_review"]],
      ["society_accessibility", "Design for different users and abilities", ["Improve or evaluate a project for another kind of user."], ["design_note_summary"]],
      ["society_copyright", "Code, media, datasets, attribution, and fair-use boundaries", ["Avoid copying assets or code without attribution."], ["responsibility_review"]],
      ["society_sustainability", "Energy, hardware lifecycle, and computing's environmental footprint", ["Explain one environmental cost of computing."], ["oral_explanation_summary"]]
    ]
  }
]);

const checkpoints = Object.freeze([
  {
    suffix: "checkpoint_ai_coding_game_feature_v1",
    title: "Checkpoint: AI-assisted game feature",
    subject: "stage_checkpoint",
    sourceRef: "openai:codex_workflows",
    outcomes: ["Define one game feature, use AI coding with context, review the diff, test behavior, and explain the result."],
    evidence: ["project_demo_summary", "code_diff_summary", "test_result_summary", "ai_assistance_disclosure", "oral_explanation_summary"],
    prerequisites: [
      "kg_compute_ai_coding_context",
      "kg_compute_ai_coding_requirements",
      "kg_compute_ai_coding_diff_review",
      "kg_compute_testing_debugging",
      "kg_compute_python_oop_game_entities"
    ]
  },
  {
    suffix: "checkpoint_web_data_pipeline_v1",
    title: "Checkpoint: Web data pipeline",
    subject: "stage_checkpoint",
    sourceRef: "mdn:learn_web_development",
    outcomes: ["Collect structured web or API data, clean it, save CSV/JSON, and verify output."],
    evidence: ["project_demo_summary", "test_result_summary", "debug_trace_summary", "responsibility_review"],
    prerequisites: [
      "kg_compute_web_html_dom",
      "kg_compute_web_api_contracts",
      "kg_compute_data_cleaning",
      "kg_compute_data_pipeline",
      "kg_compute_web_ethics"
    ]
  },
  {
    suffix: "checkpoint_problem_to_prototype_v1",
    title: "Checkpoint: Problem to prototype",
    subject: "stage_checkpoint",
    sourceRef: "csta:k12_standards",
    outcomes: ["Turn a real problem into requirements, build a small prototype, collect feedback, and choose the next action."],
    evidence: ["design_note_summary", "project_demo_summary", "oral_explanation_summary"],
    prerequisites: [
      "kg_compute_product_problem_discovery",
      "kg_compute_product_requirements",
      "kg_compute_product_prototype",
      "kg_compute_product_feedback",
      "kg_compute_product_explanation"
    ]
  },
  {
    suffix: "checkpoint_ai_literacy_review_v1",
    title: "Checkpoint: Responsible AI literacy review",
    subject: "stage_checkpoint",
    sourceRef: "unesco:ai_competency_students_2024",
    outcomes: ["Explain how an AI tool helped, where it may be wrong, and how the learner checked it."],
    evidence: ["ai_assistance_disclosure", "test_result_summary", "responsibility_review", "oral_explanation_summary"],
    prerequisites: [
      "kg_compute_llm_context_tokens",
      "kg_compute_llm_evaluation",
      "kg_compute_human_in_loop",
      "kg_compute_ai4k12_societal_impact"
    ]
  }
]);

function nodeId(subjectOrSuffix, suffix = "") {
  const tail = suffix || subjectOrSuffix;
  return `kg_compute_${tail}`;
}

function sourceKindFor(sourceRef) {
  if (sourceRef.startsWith("local:")) return "local_summary_seed";
  if (sourceRef.startsWith("openai:")) return "official_product_docs";
  if (sourceRef.startsWith("python:")) return "official_language_docs";
  if (sourceRef.startsWith("mdn:")) return "reference_docs";
  if (sourceRef.startsWith("git:")) return "official_tool_docs";
  if (sourceRef.startsWith("pygame:")) return "official_library_docs";
  return "official_curriculum_or_reference";
}

function createNode({
  id,
  title,
  nodeType = "topic",
  subject,
  sourceRef,
  outcomes,
  evidence,
  aliases = []
}) {
  return {
    aliases,
    learningOutcomes: outcomes,
    evidenceRequired: evidence,
    assessmentCoverage: nodeType === "stage_assessment" ? evidence : [],
    masterySignals: DEFAULT_MASTERY_SIGNALS,
    experienceSignals: DEFAULT_EXPERIENCE_SIGNALS,
    privacyClass: "summary_only",
    importConfidence: "curated_seed",
    status: "seeded",
    nodeId: id,
    domainPackId: DOMAIN_PACK_ID,
    domain: DOMAIN,
    nodeType,
    stage: STAGE,
    subject,
    curriculum: CURRICULUM,
    title,
    sourceKind: sourceKindFor(sourceRef),
    sourceRef,
    version: VERSION
  };
}

function createEdge({ from, to, type = "prerequisite", sourceRef, rationale }) {
  return {
    edgeId: `edge_${from}__${type}__${to}`,
    fromNodeId: from,
    toNodeId: to,
    edgeType: type,
    confidence: "curated_seed",
    rationale,
    sourceRef
  };
}

function buildPack() {
  const nodes = [];
  const edges = [];

  const rootId = "kg_compute_fanfan_computing_ai_literacy_path";
  nodes.push(createNode({
    id: rootId,
    title: "Fanfan computing and AI literacy breadth path",
    nodeType: "pathway",
    subject: "cross_strand",
    sourceRef: "local:fanfan_python_archive_summary_20260619",
    outcomes: ["Use computing and AI as broad problem-solving tools rather than a narrow programming-language track."],
    evidence: ["design_note_summary", "project_demo_summary", "oral_explanation_summary"]
  }));

  for (const strand of strands) {
    const strandId = nodeId(`strand_${strand.id}`);
    nodes.push(createNode({
      id: strandId,
      title: strand.title,
      nodeType: "strand",
      subject: strand.id,
      sourceRef: strand.sourceRef,
      outcomes: [`Build breadth in ${strand.title.toLowerCase()} through age-appropriate projects and explanations.`],
      evidence: ["design_note_summary", "project_demo_summary", "oral_explanation_summary"]
    }));
    edges.push(createEdge({
      from: rootId,
      to: strandId,
      type: "contains",
      sourceRef: strand.sourceRef,
      rationale: "The pathway contains this learning strand."
    }));

    for (const [suffix, title, outcomes, evidence] of strand.nodes) {
      const id = nodeId(suffix);
      nodes.push(createNode({
        id,
        title,
        subject: strand.id,
        sourceRef: strand.sourceRef,
        outcomes,
        evidence
      }));
      edges.push(createEdge({
        from: strandId,
        to: id,
        type: "contains",
        sourceRef: strand.sourceRef,
        rationale: "The strand contains this target capability."
      }));
    }
  }

  for (const checkpoint of checkpoints) {
    const id = nodeId(checkpoint.suffix);
    nodes.push(createNode({
      id,
      title: checkpoint.title,
      nodeType: "stage_assessment",
      subject: checkpoint.subject,
      sourceRef: checkpoint.sourceRef,
      outcomes: checkpoint.outcomes,
      evidence: checkpoint.evidence
    }));
    edges.push(createEdge({
      from: rootId,
      to: id,
      type: "contains",
      sourceRef: checkpoint.sourceRef,
      rationale: "The pathway contains this stage checkpoint."
    }));
    for (const prerequisite of checkpoint.prerequisites) {
      edges.push(createEdge({
        from: prerequisite,
        to: id,
        type: "prerequisite",
        sourceRef: checkpoint.sourceRef,
        rationale: "This capability should be visible before the checkpoint is attempted."
      }));
    }
  }

  const prerequisites = [
    ["kg_compute_problem_framing", "kg_compute_decomposition", "k12cs:framework"],
    ["kg_compute_decomposition", "kg_compute_ai_coding_task_breakdown", "openai:codex_best_practices"],
    ["kg_compute_product_requirements", "kg_compute_ai_coding_requirements", "openai:codex_best_practices"],
    ["kg_compute_ai_coding_context", "kg_compute_ai_coding_task_breakdown", "openai:codex_best_practices"],
    ["kg_compute_ai_coding_requirements", "kg_compute_ai_coding_test_validation", "openai:codex_workflows"],
    ["kg_compute_ai_coding_test_validation", "kg_compute_ai_coding_diff_review", "openai:codex_workflows"],
    ["kg_compute_testing_debugging", "kg_compute_ai_coding_debug_loop", "openai:codex_workflows"],
    ["kg_compute_ai_coding_responsibility", "kg_compute_human_in_loop", "unesco:ai_competency_students_2024"],
    ["kg_compute_python_values_control", "kg_compute_python_functions_boundaries", "python:official_tutorial"],
    ["kg_compute_python_functions_boundaries", "kg_compute_python_oop_game_entities", "python:official_tutorial"],
    ["kg_compute_python_collections_records", "kg_compute_python_files_csv_json", "python:official_tutorial"],
    ["kg_compute_python_files_csv_json", "kg_compute_data_tables_csv", "python:official_tutorial"],
    ["kg_compute_python_exceptions_debugging", "kg_compute_testing_debugging", "python:official_tutorial"],
    ["kg_compute_python_api_requests", "kg_compute_web_api_contracts", "mdn:learn_web_development"],
    ["kg_compute_python_html_parsing", "kg_compute_data_pipeline", "mdn:learn_web_development"],
    ["kg_compute_web_html_dom", "kg_compute_python_html_parsing", "mdn:learn_web_development"],
    ["kg_compute_web_http_urls", "kg_compute_web_api_contracts", "mdn:learn_web_development"],
    ["kg_compute_web_api_contracts", "kg_compute_data_pipeline", "mdn:learn_web_development"],
    ["kg_compute_data_cleaning", "kg_compute_data_pipeline", "mdn:learn_web_development"],
    ["kg_compute_system_os_files", "kg_compute_system_runtime_packages", "k12cs:framework-concepts"],
    ["kg_compute_system_networks", "kg_compute_web_http_urls", "k12cs:framework-concepts"],
    ["kg_compute_system_security", "kg_compute_web_api_contracts", "csta:k12_standards"],
    ["kg_compute_system_reliability", "kg_compute_ai_coding_debug_loop", "csta:k12_standards"],
    ["kg_compute_ai4k12_perception", "kg_compute_ai4k12_representation_reasoning", "ai4k12:guidelines"],
    ["kg_compute_ai4k12_representation_reasoning", "kg_compute_ai4k12_learning", "ai4k12:guidelines"],
    ["kg_compute_ai4k12_learning", "kg_compute_llm_evaluation", "ai4k12:guidelines"],
    ["kg_compute_llm_context_tokens", "kg_compute_llm_evaluation", "openai:codex_best_practices"],
    ["kg_compute_ai4k12_societal_impact", "kg_compute_ai_coding_responsibility", "unesco:ai_competency_students_2024"],
    ["kg_compute_product_problem_discovery", "kg_compute_product_requirements", "csta:k12_standards"],
    ["kg_compute_product_users_stakeholders", "kg_compute_product_requirements", "csta:k12_standards"],
    ["kg_compute_product_requirements", "kg_compute_product_prototype", "csta:k12_standards"],
    ["kg_compute_product_prototype", "kg_compute_product_feedback", "csta:k12_standards"],
    ["kg_compute_product_metrics", "kg_compute_product_feedback", "csta:k12_standards"],
    ["kg_compute_product_explanation", "kg_compute_product_cross_domain", "csta:k12_standards"],
    ["kg_compute_society_privacy_data_rights", "kg_compute_system_security", "csta:k12_standards"],
    ["kg_compute_society_copyright", "kg_compute_web_ethics", "csta:k12_standards"],
    ["kg_compute_society_open_source", "kg_compute_ai_coding_git_workflow", "git:pro_git"],
    ["kg_compute_history_games_media", "kg_compute_python_oop_game_entities", "pygame:docs"],
    ["kg_compute_history_internet_web", "kg_compute_web_http_urls", "chm:timeline"]
  ];

  for (const [from, to, sourceRef] of prerequisites) {
    edges.push(createEdge({
      from,
      to,
      type: "prerequisite",
      sourceRef,
      rationale: "Curated prerequisite relationship for breadth-first computing and AI literacy."
    }));
  }

  return {
    schemaVersion: "hermes.learningGraphSeed.v0.1",
    importId: IMPORT_ID,
    version: VERSION,
    privacyClass: "summary_only",
    sourceDocuments,
    domainPacks: [{
      domainPackId: DOMAIN_PACK_ID,
      domain: DOMAIN,
      title: "Fanfan Computing and AI Literacy Breadth Path",
      sourceKind: "curated_multi_source_seed",
      version: VERSION,
      ownerWorkspaceId: "owner",
      visibility: "private_seed",
      importStatus: "validated_seed"
    }],
    nodes,
    edges
  };
}

function main() {
  const pack = buildPack();
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    ok: true,
    outputPath: path.relative(path.join(__dirname, ".."), OUTPUT_PATH),
    importId: IMPORT_ID,
    domainPackId: DOMAIN_PACK_ID,
    sourceDocuments: pack.sourceDocuments.length,
    nodes: pack.nodes.length,
    edges: pack.edges.length
  }, null, 2));
}

if (require.main === module) main();

module.exports = {
  buildPack
};
