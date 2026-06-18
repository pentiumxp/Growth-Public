(function registerGrowthCardGenerationUi(root) {
  function clean(value) {
    return String(value ?? "").trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  const UI_EVIDENCE_FILE_FIELDS = Object.freeze([
    "owner_daily_ui_evidence_file",
    "owner_audit_ui_evidence_file",
    "proposal_review_ui_evidence_file",
    "release_package_review_ui_evidence_file",
    "automation_digest_ui_evidence_file",
    "automation_action_handoff_ui_evidence_file",
    "scheduler_execution_ui_evidence_file",
    "scheduler_run_ui_evidence_file",
    "scheduler_worker_target_ui_evidence_file"
  ]);

  function defaultEscapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isFanfanSampleTarget(target = {}) {
    const text = [
      target.workspaceId,
      target.growthWorkspaceId,
      target.learnerId,
      target.displayName,
      target.label
    ].map(clean).join(" ").toLowerCase();
    return /\bfan[\s_-]*fan\b/.test(text) || text.includes("fanfan") || text.includes("凡凡");
  }

  function statusText(status = "") {
    const value = clean(status);
    if (value === "loading_context") return "加载中";
    if (value === "drafting") return "规划中";
    if (value === "drafted") return "已规划";
    if (value === "advancing") return "生成中";
    if (value === "publishing") return "发布中";
    if (value === "generating") return "生成中";
    if (value === "published") return "已发布";
    if (value === "failed") return "失败";
    return "待生成";
  }

  function provisioningReasonText(code = "") {
    const value = clean(code);
    const map = {
      learning_target_not_provisioned: "该学习者还没有开通这个学习目标。",
      learning_domain_pack_options_unavailable: "当前没有可用的知识图谱 domain pack。",
      learning_domain_pack_not_provisioned: "该 domain pack 尚未为这个学习者开通。",
      learning_domain_pack_not_found: "选择的 domain pack 不存在。",
      learning_subject_not_provisioned: "该科目尚未为这个学习者开通。",
      learning_subject_not_found: "选择的科目不在这个 domain pack 中。",
      learning_target_node_not_in_provision: "选择的图谱节点不属于已开通范围。",
      learning_target_workspace_required: "缺少目标学习者 workspace。",
      learning_target_provision_repository_unavailable: "目标开通仓库不可用。"
    };
    return map[value] || value || "目标开通状态来自 Growth provisioning service。";
  }

  function targetProvisionModeText(mode = "") {
    const value = clean(mode).toLowerCase();
    if (value === "sample_default") return "sample";
    if (value === "explicit_provision") return "已开通";
    if (value === "not_provisioned") return "未开通";
    return value || "未确认";
  }

  function readinessRows(context = {}, escapeHtml = defaultEscapeHtml) {
    const readiness = context.readiness || {};
    const graph = context.graph || {};
    const provisioning = context.targetProvisioning || {};
    const targetMeta = provisioning.targetEnabled
      ? `${targetProvisionModeText(provisioning.mode)} · ${provisioning.selectedSubject || provisioning.selectedDomain || "默认目标"}`
      : provisioningReasonText(provisioning.error || "learning_target_not_provisioned");
    const rows = [
      ["学习目标", readiness.targetEnabled, targetMeta],
      ["学习图谱", readiness.learningGraphReady, `${Number(graph.nodeCount || 0)} 节点 / ${Number(graph.edgeCount || 0)} 关系`],
      ["历史摘要", readiness.historySummaryReady, "只读取卡片、评价、反思和掌握度摘要"],
      ["Planner context", readiness.plannerContextReady ?? readiness.learningGraphReady, "图谱、画像和近期信号摘要"],
      ["Planner Gateway", readiness.plannerGatewayConfigured ?? readiness.gatewayConfigured, "只通过 Gateway 起草学习计划"],
      ["Gateway authoring", readiness.authoringGatewayConfigured ?? readiness.gatewayConfigured, "SSE / JSON 输出进入 draft 校验"],
      ["Gateway evaluation", readiness.evaluationGatewayConfigured, "批改 draft 先校验再写入画像"]
    ];
    return rows.map(([label, ok, meta]) => `<div class="learning-card-generation-readiness-row" data-ready="${ok ? "true" : "false"}">
      <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(meta)}</small></span>
      <em>${ok ? "通过" : "待处理"}</em>
    </div>`).join("");
  }

  function targetRows(targets = [], currentWorkspaceId = "", context = {}, escapeHtml = defaultEscapeHtml) {
    const rows = asArray(targets).filter((target) => clean(target.workspaceId));
    if (!rows.length) return `<div class="learning-coin-empty">暂无可选学习者。</div>`;
    const activeWorkspaceId = clean(currentWorkspaceId);
    const contextTarget = context.target || {};
    const provisioning = context.targetProvisioning || {};
    return rows.map((target) => {
      const workspaceId = clean(target.workspaceId);
      const active = activeWorkspaceId ? workspaceId === activeWorkspaceId : Boolean(target.current);
      const contextMatches = clean(contextTarget.workspaceId) === workspaceId;
      const enabled = Boolean(target.targetEnabled || target.enabled || isFanfanSampleTarget(target) || (contextMatches && contextTarget.enabled));
      const mode = contextMatches ? clean(provisioning.mode) : "";
      const status = enabled ? targetProvisionModeText(mode || (isFanfanSampleTarget(target) ? "sample_default" : "explicit_provision")) : "可开通";
      return `<button type="button" class="learning-card-generation-target${active ? " active" : ""}${enabled ? "" : " needs-provision"}"
        data-card-generation-target="${escapeHtml(workspaceId)}">
        <span>
          <strong>${escapeHtml(target.label || workspaceId)}</strong>
          <small>${escapeHtml(workspaceId)}${enabled ? ` · ${status}` : " · 需开通"}</small>
        </span>
        <em>${escapeHtml(status)}</em>
      </button>`;
    }).join("");
  }

  function targetRowsWithContext({ targets = [], context = {}, currentWorkspaceId = "", escapeHtml = defaultEscapeHtml } = {}) {
    const rows = asArray(targets).filter((target) => clean(target.workspaceId));
    const contextTarget = context.target || {};
    const contextWorkspaceId = clean(contextTarget.workspaceId);
    if (contextWorkspaceId && !rows.some((target) => clean(target.workspaceId) === contextWorkspaceId)) {
      rows.push({
        workspaceId: contextWorkspaceId,
        learnerId: contextTarget.learnerId,
        displayName: contextTarget.displayName,
        label: contextTarget.displayName || contextWorkspaceId,
        enabled: contextTarget.enabled,
        current: contextWorkspaceId === clean(currentWorkspaceId)
      });
    }
    return targetRows(rows, currentWorkspaceId, context, escapeHtml);
  }

  function graphOptionsForContext(context = {}) {
    const provisioning = context.targetProvisioning || {};
    return provisioning.graphOptions || context.graphOptions || {};
  }

  function selectedProvisionDraft(context = {}, draft = {}) {
    const provisioning = context.targetProvisioning || {};
    const graphOptions = graphOptionsForContext(context);
    const selectedPack = clean(draft.domainPackId || draft.domain_pack_id || provisioning.selectedDomainPackId || graphOptions.selectedDomainPackId || context.domainPackId);
    const packs = asArray(graphOptions.domainPacks);
    const pack = packs.find((item) => clean(item.domainPackId || item.domain_pack_id) === selectedPack) || packs[0] || {};
    const subjects = asArray(pack.subjects).length ? asArray(pack.subjects) : asArray(graphOptions.subjects);
    return {
      domainPackId: selectedPack || clean(pack.domainPackId || pack.domain_pack_id),
      domain: clean(draft.domain || provisioning.selectedDomain || graphOptions.selectedDomain || pack.domain || context.domain),
      subject: clean(draft.subject || provisioning.selectedSubject || graphOptions.selectedSubject || subjects[0] || context.subject),
      packs,
      subjects: subjects.map(clean).filter(Boolean).slice(0, 40),
      pack
    };
  }

  function provisionStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "loading") return "加载中";
    if (value === "submitting") return "开通中";
    if (value === "submitted") return "已开通";
    if (value === "failed") return "失败";
    return "待确认";
  }

  function targetProvisioningPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const provisioning = context.targetProvisioning || {};
    const draft = selectedProvisionDraft(context, state.targetProvisionDraft || {});
    const status = clean(state.targetProvisionDraft?.status || "idle");
    const targetEnabled = provisioning.targetEnabled === true || context.target?.enabled === true;
    const busy = status === "loading" || status === "submitting";
    const packOptions = draft.packs.map((pack) => {
      const id = clean(pack.domainPackId || pack.domain_pack_id);
      const label = clean(pack.title || pack.domain || id);
      return `<option value="${escapeHtml(id)}"${id === draft.domainPackId ? " selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("");
    const subjectOptions = draft.subjects.map((subject) => `<option value="${escapeHtml(subject)}"${subject === draft.subject ? " selected" : ""}>${escapeHtml(subject)}</option>`).join("");
    const canProvision = Boolean(draft.domainPackId && draft.subject && !busy);
    const statusDetail = clean(state.targetProvisionDraft?.error)
      || (targetEnabled
        ? `${targetProvisionModeText(provisioning.mode)} · ${draft.domainPackId || "domain pack"} · ${draft.subject || "subject"}`
        : provisioningReasonText(provisioning.error || "learning_target_not_provisioned"));
    return `<section class="learning-card-generation-provisioning" data-card-generation-target-provisioning data-target-provisioning-enabled="${targetEnabled ? "true" : "false"}">
      <div class="learning-card-generation-provisioning-head">
        <span>
          <strong>学习目标</strong>
          <small>${escapeHtml(statusDetail)}</small>
        </span>
        <em>${escapeHtml(targetEnabled ? "可规划" : provisionStatusText(status))}</em>
      </div>
      <div class="learning-card-generation-provisioning-grid">
        <label>
          <span>Domain pack</span>
          <select data-card-generation-domain-pack ${busy || !draft.packs.length ? "disabled" : ""}>
            ${packOptions || `<option value="">暂无 domain pack</option>`}
          </select>
        </label>
        <label>
          <span>Subject</span>
          <select data-card-generation-subject ${busy || !draft.subjects.length ? "disabled" : ""}>
            ${subjectOptions || `<option value="">暂无 subject</option>`}
          </select>
        </label>
      </div>
      <div class="learning-card-generation-provisioning-actions">
        <span>${escapeHtml(targetEnabled ? "选择会刷新上下文，规划仍由服务端决定图谱节点。" : "Owner 需要先显式开通该学习者的目标范围。")}</span>
        <button type="button" data-card-generation-apply-target ${busy || !draft.domainPackId ? "disabled" : ""}>应用选择</button>
        <button type="button" class="primary" data-card-generation-provision-target ${canProvision ? "" : "disabled"}>${busy ? "处理中" : targetEnabled ? "更新开通" : "开通目标"}</button>
      </div>
    </section>`;
  }


  function recipeOptions(context = {}, escapeHtml = defaultEscapeHtml) {
    const selected = clean(context.selectedRecipeId || "daily_english_v1");
    return asArray(context.recipes).map((recipe) => {
      const id = clean(recipe.id);
      const active = id === selected;
      const duration = recipe.durationMinutes
        ? `${recipe.durationMinutes.min || 10}-${recipe.durationMinutes.max || 15} 分钟`
        : "10-15 分钟";
      return `<div class="learning-card-generation-recipe${active ? " active" : ""}" data-card-generation-recipe="${escapeHtml(id)}">
        <strong>${escapeHtml(recipe.label || id)}</strong>
        <small>${escapeHtml(`${duration} · 低压力`)}</small>
      </div>`;
    }).join("");
  }

  function historyFacts(context = {}, escapeHtml = defaultEscapeHtml) {
    const learner = context.historySummary?.learnerSummary || {};
    const profile = context.learningProfile?.summary || {};
    const rows = [
      ["近期卡片", learner.recentCardCount],
      ["已完成", learner.completedRecentCardCount],
      ["画像点", profile.masteryStateCount ?? context.historySummary?.masteryStateCount],
      ["轨迹", profile.recentTrajectoryCount ?? context.historySummary?.recentTrajectoryCount]
    ];
    return rows.map(([label, value]) => `<span><small>${escapeHtml(label)}</small><strong>${escapeHtml(String(Number(value || 0) || 0))}</strong></span>`).join("");
  }

  function profileItemRows(items = [], emptyText = "暂无记录", escapeHtml = defaultEscapeHtml) {
    const rows = asArray(items).slice(0, 3);
    if (!rows.length) return `<div class="learning-card-generation-profile-empty">${escapeHtml(emptyText)}</div>`;
    return rows.map((item) => {
      const label = clean(item.nodeId || item.targetNodeId || item.strategy || item.signalType || "记录");
      const meta = clean(item.summary || item.performanceSummary || item.reason || item.status || "");
      const score = Number(item.score || 0) || 0;
      const badge = clean(item.signalType || item.strategy || item.status || (score ? `${score}` : ""));
      return `<div class="learning-card-generation-profile-row">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(meta || "summary-only")}</small>
        </span>
        <em>${escapeHtml(badge || "摘要")}</em>
      </div>`;
    }).join("");
  }

  function recommendationSourceText(recommendation = {}) {
    const recommendationMode = clean(recommendation.recommendationMode);
    const selectionMode = clean(recommendation.selectionMode);
    if (recommendationMode === "trajectory") return "评价轨迹";
    if (recommendationMode === "profile_strategy") return "画像策略";
    if (selectionMode === "recommendation") return "推荐";
    if (selectionMode === "strategy") return "画像策略";
    if (selectionMode === "graph_suggestion") return "图谱建议";
    if (selectionMode === "explicit") return "Owner 指定";
    return "策略";
  }

  function recommendationLifecycleStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "accepted") return "已生成";
    if (value === "superseded") return "已替换";
    if (value === "skipped") return "已跳过";
    if (value === "expired") return "已过期";
    if (value === "pending") return "待生成";
    return value || "记录";
  }

  function recommendationLifecycleActionStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "submitting") return "记录中";
    if (value === "reviewed") return "已记录";
    if (value === "failed") return "失败";
    return value || "待操作";
  }

  function recommendationLifecycleActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.actionStatus);
    const error = clean(holder.actionError);
    const result = holder.actionResult || {};
    const recommendation = result.recommendation || {};
    if (!status || status === "idle") return "";
    const detail = status === "reviewed"
      ? `推荐已记录为 ${recommendationLifecycleStatusText(recommendation.status)}。`
      : status === "submitting"
        ? "正在通过 Growth recommendation lifecycle service 写入。"
        : error || "推荐状态写入失败。";
    return `<div class="learning-card-generation-lifecycle-status" data-recommendation-lifecycle-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(recommendationLifecycleActionStatusText(status))}</em>
    </div>`;
  }

  function recommendationLifecyclePanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const rows = asArray(context.recommendationLifecycle).slice(0, 4);
    const holder = state.recommendationLifecycle || {};
    const busy = holder.actionStatus === "submitting";
    if (!rows.length) {
      return `<div class="learning-card-generation-lifecycle" data-card-generation-lifecycle>
        <div class="learning-card-generation-lifecycle-head">
          <span>
            <strong>推荐闭环</strong>
            <small>等待生成和评价后形成记录</small>
          </span>
          <em>暂无</em>
        </div>
      </div>`;
    }
    const renderedRows = rows.map((item) => {
      const targets = asArray(item.targetNodeIds).map(clean).filter(Boolean);
      const label = clean(targets[0] || item.strategy || item.trajectoryId || item.sourceTaskCardId || item.taskCardId || "推荐");
      const status = clean(item.status);
      const canReview = status === "pending";
      const trajectoryId = clean(item.trajectoryId || item.id);
      const sourceTaskCardId = clean(item.sourceTaskCardId || item.taskCardId || item.source_task_card_id || item.task_card_id);
      const sourceEvaluationId = clean(item.sourceEvaluationId || item.evaluationId || item.source_evaluation_id || item.evaluation_id);
      const resultId = clean(item.generatedTaskCardId || item.supersededByTrajectoryId || item.sourceEvaluationId || item.sourceTaskCardId || item.taskCardId);
      const detail = clean(item.reason) || resultId || "summary-only";
      const meta = [
        clean(item.strategy),
        resultId
      ].filter(Boolean).join(" · ");
      return `<div class="learning-card-generation-lifecycle-row" data-recommendation-lifecycle-status="${escapeHtml(status)}">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(recommendationLifecycleStatusText(status))}</em>
        ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
        ${canReview ? `<div class="learning-card-generation-lifecycle-actions">
          <button type="button"
            data-recommendation-lifecycle-review
            data-recommendation-lifecycle-trajectory-id="${escapeHtml(trajectoryId)}"
            data-recommendation-lifecycle-source-task-card-id="${escapeHtml(sourceTaskCardId)}"
            data-recommendation-lifecycle-source-evaluation-id="${escapeHtml(sourceEvaluationId)}"
            data-recommendation-lifecycle-status="skipped"
            ${busy ? "disabled" : ""}>${busy ? "记录中" : "跳过"}</button>
          <button type="button"
            data-recommendation-lifecycle-review
            data-recommendation-lifecycle-trajectory-id="${escapeHtml(trajectoryId)}"
            data-recommendation-lifecycle-source-task-card-id="${escapeHtml(sourceTaskCardId)}"
            data-recommendation-lifecycle-source-evaluation-id="${escapeHtml(sourceEvaluationId)}"
            data-recommendation-lifecycle-status="expired"
            ${busy ? "disabled" : ""}>过期</button>
        </div>` : ""}
      </div>`;
    }).join("");
    return `<div class="learning-card-generation-lifecycle" data-card-generation-lifecycle>
      <div class="learning-card-generation-lifecycle-head">
        <span>
          <strong>推荐闭环</strong>
          <small>待生成 / 已生成 / 已替换 摘要</small>
        </span>
        <em>${escapeHtml(String(rows.length))}</em>
      </div>
      ${renderedRows}
      ${recommendationLifecycleActionStatusPanel(holder, escapeHtml)}
    </div>`;
  }

  function nextCardRecommendationPanel(context = {}, fallbackStrategy = {}, escapeHtml = defaultEscapeHtml) {
    const recommendation = context.nextCardRecommendation || {};
    const strategy = recommendation.ok !== false && clean(recommendation.strategy)
      ? recommendation
      : fallbackStrategy || {};
    const targetNodeIds = asArray(recommendation.targetNodeIds).length
      ? asArray(recommendation.targetNodeIds)
      : asArray(strategy.targetNodeIds);
    const targetLabel = clean(recommendation.targetNodeId || targetNodeIds[0] || context.suggestedPlan?.targetNodeId || "未选择");
    const strategyLabel = clean(strategy.strategy || "stabilize");
    const role = clean(strategy.cardRole || context.suggestedPlan?.cardRole || "practice");
    const difficulty = clean(strategy.difficultyBand || context.suggestedPlan?.difficultyBand || "foundation");
    const reason = clean(strategy.reason || context.suggestedPlan?.strategyReason)
      || "根据当前图谱目标生成一张日常英语练习卡。";
    return `<div class="learning-card-generation-recommendation" data-card-generation-recommendation data-recommendation-mode="${escapeHtml(clean(recommendation.recommendationMode || recommendation.selectionMode || ""))}">
      <div class="learning-card-generation-recommendation-head">
        <span>
          <strong>下一张建议</strong>
          <small>${escapeHtml(recommendationSourceText(recommendation))}</small>
        </span>
        <em>${escapeHtml(strategyLabel)}</em>
      </div>
      <div class="learning-card-generation-recommendation-grid">
        <span><small>目标</small><strong>${escapeHtml(targetLabel)}</strong></span>
        <span><small>角色</small><strong>${escapeHtml(role)}</strong></span>
        <span><small>难度</small><strong>${escapeHtml(difficulty)}</strong></span>
      </div>
      <p>${escapeHtml(reason)}</p>
    </div>`;
  }

  function learningProfilePanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const profile = context.learningProfile || {};
    const strategy = profile.nextCardStrategy || context.nextCardStrategy || {};
    const summary = profile.summary || {};
    const profileReady = profile.ok !== false && profile.available !== false;
    return `<section class="learning-card-generation-profile" data-card-generation-profile>
      <div class="learning-card-generation-profile-head">
        <span>
          <strong>学习画像</strong>
          <small>${profileReady ? "掌握度、信号和轨迹摘要" : "等待评价后形成画像"}</small>
        </span>
        <em>${escapeHtml(clean(strategy.strategy) || "stabilize")}</em>
      </div>
      <div class="learning-card-generation-profile-metrics">
        <span><small>弱点</small><strong>${escapeHtml(String(Number(summary.weaknessCount || 0) || 0))}</strong></span>
        <span><small>强项</small><strong>${escapeHtml(String(Number(summary.strengthCount || 0) || 0))}</strong></span>
        <span><small>信号</small><strong>${escapeHtml(String(Number(summary.recentExperienceSignalCount || 0) || 0))}</strong></span>
      </div>
      <div class="learning-card-generation-profile-columns">
        <div>
          <b>需要加强</b>
          ${profileItemRows(profile.weaknesses, "暂无明显弱点", escapeHtml)}
        </div>
        <div>
          <b>近期轨迹</b>
          ${profileItemRows(profile.recentTrajectory, "暂无轨迹", escapeHtml)}
        </div>
      </div>
      ${recommendationLifecyclePanel(context, state, escapeHtml)}
      ${nextCardRecommendationPanel(context, strategy, escapeHtml)}
    </section>`;
  }

  function stageAssessmentStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "checking") return "检查中";
    if (value === "activating") return "生成中";
    if (value === "eligible") return "可激活";
    if (value === "active") return "已激活";
    if (value === "cooldown") return "冷却中";
    if (value === "dormant") return "暂不建议";
    if (value === "failed") return "失败";
    return "未检查";
  }

  function stageAssessmentReasonText(result = {}) {
    const reason = clean(result.reason || result.activationReason || result.cycle?.activationReason || result.error);
    const map = {
      enough_recent_practice: "近期练习证据足够，可以生成一次阶段测评。",
      challenge_ready: "学习者信号显示可以尝试挑战。",
      recent_high_pressure_signal: "近期有压力信号，先降低难度或修补前置点。",
      insufficient_recent_practice: "近期普通卡证据不足，建议先继续日常练习。",
      stage_assessment_cooldown_active: "同一能力簇仍在冷却期。",
      stage_assessment_recently_completed: "近期已完成正式测评，暂不需要重复。"
    };
    return map[reason] || reason || "先检查近期轨迹和掌握度摘要。";
  }

  function stageAssessmentControlsReasonText(reason = "") {
    const value = clean(reason);
    const map = {
      stage_assessment_not_eligible: "当前还不适合生成正式测评，先继续日常练习。",
      stage_assessment_cooldown_active: "同一能力簇仍在冷却期。",
      stage_assessment_already_active: "已经有一张阶段测评在进行中。",
      insufficient_recent_practice: "近期普通卡证据不足，建议先继续日常练习。",
      recent_high_pressure_signal: "近期有压力信号，先保持低压力练习。",
      controls_not_loaded: "先读取阶段测评控制状态。",
      gateway_not_ready: "Gateway 尚未准备好，暂不能生成正式测评。",
      target_not_ready: "学习目标、图谱或历史摘要尚未就绪。"
    };
    return map[value] || value || "阶段测评由 controls read model 决定是否开放。";
  }

  function stageAssessmentAction(controls = {}, key = "") {
    return asArray(controls.actions).find((action) => clean(action.key) === key) || null;
  }

  function stageAssessmentRubricPolicy({ controls = {}, context = {}, generated = {} } = {}) {
    const policy = controls.rubricPolicy
      || context.stageCheckpointRubricPolicy
      || generated.rubricPolicy
      || generated.draft?.rubricPolicy
      || generated.published?.rubricPolicy
      || null;
    if (policy && typeof policy === "object") return policy;
    const catalog = asArray(context.rubricCatalog);
    return catalog.find((item) => clean(item.cardRole) === "stage_assessment") || null;
  }

  function stageAssessmentRubricPanel(policy = null, escapeHtml = defaultEscapeHtml) {
    if (!policy || typeof policy !== "object") return "";
    const policyId = clean(policy.policyId);
    const dimensions = asArray(policy.rubricDimensions).length
      ? asArray(policy.rubricDimensions)
      : asArray(policy.dimensionIds).map((dimensionId) => ({ dimensionId, label: dimensionId }));
    const evidenceKeys = asArray(policy.evidenceKeys).length
      ? asArray(policy.evidenceKeys).map(clean).filter(Boolean)
      : asArray(policy.evidenceMapping).map((item) => clean(item.evidenceKey)).filter(Boolean);
    const assessment = policy.assessmentPolicy || {};
    const duration = assessment.expectedDurationMinutes || {};
    const durationText = Number(duration.min || 0) && Number(duration.max || 0)
      ? `${Number(duration.min)}-${Number(duration.max)} 分钟`
      : "25-30 分钟";
    const dimensionRows = dimensions.slice(0, 4).map((dimension) => {
      const dimensionId = clean(dimension.dimensionId || dimension);
      return `<span>
        <strong>${escapeHtml(clean(dimension.label) || dimensionId)}</strong>
        <small>${escapeHtml(dimensionId)}</small>
      </span>`;
    }).join("");
    return `<div class="learning-card-generation-stage-rubric" data-stage-assessment-rubric data-stage-assessment-rubric-policy-id="${escapeHtml(policyId)}">
      <div class="learning-card-generation-stage-rubric-head">
        <span>
          <strong>测评规则</strong>
          <small>${escapeHtml(policyId || "formal_assessment")}</small>
        </span>
        <em>${escapeHtml(clean(assessment.completionPolicy) || "formal_assessment")}</em>
      </div>
      <div class="learning-card-generation-stage-rubric-grid">
        <span><small>批改</small><strong>${escapeHtml(String(Number(assessment.evaluationAttempts || 1) || 1))} 次</strong></span>
        <span><small>反思</small><strong>${escapeHtml(String(Number(assessment.reflectionAttempts || 1) || 1))} 次</strong></span>
        <span><small>时长</small><strong>${escapeHtml(durationText)}</strong></span>
      </div>
      <div class="learning-card-generation-stage-rubric-dimensions">
        ${dimensionRows || `<span><strong>维度待读取</strong><small>summary-only</small></span>`}
      </div>
      ${evidenceKeys.length ? `<div class="learning-card-generation-stage-rubric-evidence">证据：${escapeHtml(evidenceKeys.slice(0, 6).join(" · "))}</div>` : ""}
    </div>`;
  }

  function learningLoopStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "loading") return "读取中";
    if (value === "failed") return "读取失败";
    if (value === "ready_to_draft") return "可起草";
    if (value === "ready_to_publish") return "可发布";
    if (value === "stage_checkpoint_ready") return "测评就绪";
    if (value === "stage_checkpoint_active") return "测评进行中";
    if (value === "audit_incomplete") return "补审计";
    if (value === "blocked") return "阻塞";
    if (value === "needs_owner_review") return "需检查";
    return value || "未读取";
  }

  function learningLoopActionText(action = "") {
    const value = clean(action).toLowerCase();
    if (value === "draft_daily_plan") return "起草日常计划";
    if (value === "publish_selected_plan_item") return "发布已选计划";
    if (value === "review_stage_assessment") return "检查阶段测评";
    if (value === "complete_active_stage_assessment") return "完成阶段测评";
    if (value === "complete_cycle_audit") return "补齐审计";
    if (value === "provision_learning_target") return "开通学习目标";
    if (value === "import_or_select_learning_graph") return "选择学习图谱";
    if (value === "configure_planner_gateway") return "配置 Planner";
    if (value === "refresh_learning_context") return "刷新学习上下文";
    if (value === "owner_review") return "Owner 检查";
    return value || "等待状态";
  }

  function learningLoopReasonText(reason = "") {
    const value = clean(reason);
    const map = {
      daily_plan_ready: "可以根据当前画像起草一张低压力日常卡。",
      validated_plan_ready: "已有验证过的计划项，可以由 Owner 明确发布。",
      stage_checkpoint_ready: "近期证据满足阶段测评检查条件。",
      stage_checkpoint_active: "已有正式阶段测评卡进行中，先完成这张卡再生成下一步。",
      cycle_audit_incomplete: "上一轮学习证据还没有补齐审计闭环。",
      target_not_enabled: "当前学习目标还未开通。",
      learning_graph_not_ready: "学习图谱目标尚未就绪。",
      planner_context_not_ready: "学习上下文还未就绪。",
      planner_gateway_not_ready: "Planner Gateway 尚未配置。",
      no_safe_automatic_action: "没有安全的自动下一步，需要 Owner 检查。"
    };
    if (value.startsWith("next_strategy:")) return `下一张策略：${value.slice("next_strategy:".length)}`;
    return map[value] || value || "状态来自 Growth learning-loop state，只包含 summary-only 证据。";
  }

  function learningLoopStatePanel(state = {}, context = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.learningLoopState || {};
    const data = holder.data || context.learningLoopState || {};
    const loading = holder.status === "loading";
    const failed = holder.status === "failed";
    const status = failed ? "failed" : loading ? "loading" : clean(data.status || holder.status);
    const nextAction = data.nextAction || {};
    const profile = data.profile || {};
    const audit = data.audit || {};
    const stage = data.stageAssessment || {};
    const summary = data.summary || {};
    const action = learningLoopActionText(nextAction.action);
    const activeStageTaskCardId = clean(stage.generatedTaskCardId || nextAction.taskCardId);
    const reason = failed
      ? clean(holder.error) || "learning_loop_state_unavailable"
      : loading
        ? "正在读取 daily-loop preview、画像、审计和阶段测评摘要。"
        : learningLoopReasonText(nextAction.reason);
    return `<section class="learning-card-generation-loop-state" data-learning-loop-state-panel data-learning-loop-state-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-loop-head">
        <span>
          <strong>学习闭环</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <em>${escapeHtml(learningLoopStatusText(status))}</em>
      </div>
      <div class="learning-card-generation-loop-grid">
        <span><small>下一步</small><strong>${escapeHtml(action)}</strong></span>
        <span><small>弱点</small><strong>${escapeHtml(String(Number(summary.weaknessCount ?? profile.weaknessCount ?? 0) || 0))}</strong></span>
        <span><small>审计缺口</small><strong>${escapeHtml(String(asArray(summary.missingRequired || audit.missingRequired).length))}</strong></span>
        <span><small>阶段测评</small><strong>${escapeHtml(stage.eligible ? "可检查" : learningLoopStatusText(stage.status || "dormant"))}</strong></span>
      </div>
      ${clean(stage.status) === "active" && activeStageTaskCardId ? `<div class="learning-card-generation-loop-action">
        <span>阶段测评进行中</span>
        <button type="button" class="learning-card-generation-open-card" data-learning-open-growth-task="${escapeHtml(activeStageTaskCardId)}">打开阶段测评</button>
      </div>` : ""}
    </section>`;
  }

  function operatingLoopActionStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "loading") return "读取中";
    if (value === "running") return "执行中";
    if (value === "executed") return "已执行";
    if (value === "blocked") return "已拦截";
    if (value === "failed") return "失败";
    if (value === "listed") return "已读取";
    return value || "待执行";
  }

  function operatingLoopRunStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "executed") return "已执行";
    if (value === "blocked") return "已拦截";
    if (value === "failed") return "失败";
    if (value === "listed") return "已读取";
    return value || "记录";
  }

  function operatingLoopRunRows(holder = {}, escapeHtml = defaultEscapeHtml) {
    const data = holder.data || {};
    const runs = asArray(data.runs).slice(0, 5);
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取闭环执行记录。</div>`;
    if (status === "failed") return `<div class="learning-card-generation-proposal-empty">闭环执行记录读取失败：${escapeHtml(clean(holder.error) || "operating_loop_runs_failed")}</div>`;
    if (!runs.length) return `<div class="learning-card-generation-proposal-empty">暂无闭环执行记录。Owner 执行一次后会写入 summary-only run history。</div>`;
    return runs.map((run) => {
      const runId = clean(run.runId || run.run_id);
      const action = clean(run.action || run.nextAction?.action);
      const taskCardId = clean(run.taskCardId || run.task_card_id || run.resultSelectors?.taskCardId);
      const planDraftId = clean(run.planDraftId || run.plan_draft_id || run.resultSelectors?.planDraftId);
      const error = clean(run.error);
      return `<div class="learning-card-generation-proposal-row" data-operating-loop-run-row data-operating-loop-run-id="${escapeHtml(runId)}">
        <span>
          <strong>${escapeHtml(runId || "闭环执行记录")}</strong>
          <small>${escapeHtml(`${learningLoopActionText(action)} · ${clean(run.executionMode || run.execution_mode || "service_facade")}`)}</small>
          <small>${escapeHtml(taskCardId ? `card ${taskCardId}` : planDraftId ? `plan ${planDraftId}` : error || "summary-only run audit")}</small>
        </span>
        <em>${escapeHtml(operatingLoopRunStatusText(run.status))}</em>
      </div>`;
    }).join("");
  }

  function operatingLoopActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.actionStatus);
    const error = clean(holder.actionError);
    const result = holder.actionResult || {};
    const summary = result.summary || {};
    const actionResult = result.actionResult || {};
    if (!status || status === "idle") return "";
    const taskCardId = clean(summary.taskCardId || actionResult.taskCardId);
    const runId = clean(summary.operatingLoopRunId || result.operatingLoopRun?.runId || result.runAudit?.runId);
    const detail = status === "running"
      ? "正在通过 learning-operating-loop-service 执行当前 next action。"
      : status === "executed"
        ? `闭环动作已执行${taskCardId ? `，生成卡片 ${taskCardId}` : ""}${runId ? `，记录 ${runId}` : "。"}`
        : status === "blocked"
          ? clean(result.error || error || "当前 next action 需要单独流程处理。")
          : error || clean(result.error) || "闭环执行失败。";
    return `<div class="learning-card-generation-proposal-status" data-operating-loop-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(operatingLoopActionStatusText(status))}</em>
    </div>`;
  }

  function operatingLoopRunBlockedReason({ state = {}, context = {} } = {}) {
    if (state.status === "loading_context") return "正在加载生成上下文，请稍候。";
    if (!context || !Object.keys(context).length) return "生成上下文还没加载完成，请先刷新状态。";
    const data = state.learningLoopState?.data || context.learningLoopState || {};
    const nextAction = data.nextAction || {};
    const action = clean(nextAction.action);
    if (!action) return "还没有可执行的服务端 next action。";
    if (nextAction.enabled === false) return learningLoopReasonText(nextAction.reason);
    if (!["draft_daily_plan", "publish_selected_plan_item", "review_stage_assessment"].includes(action)) {
      return "当前 next action 需要在对应面板单独处理。";
    }
    return "";
  }

  function operatingLoopPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.operatingLoop || {};
    const data = holder.data || {};
    const runs = asArray(data.runs);
    const latestRun = data.latestRun || runs[0] || {};
    const loopData = state.learningLoopState?.data || context.learningLoopState || {};
    const nextAction = loopData.nextAction || {};
    const action = clean(nextAction.action);
    const busy = holder.actionStatus === "running" || ["drafting", "publishing", "advancing", "generating"].includes(clean(state.status));
    const blockedReason = busy ? "" : operatingLoopRunBlockedReason({ state, context });
    const canRun = Boolean(!busy && !blockedReason);
    const reason = holder.status === "loading"
      ? "正在读取 summary-only run history。"
      : holder.status === "failed"
        ? clean(holder.error) || "operating_loop_runs_failed"
        : blockedReason || "Owner 可以执行服务端判定的当前 next action，并记录 run history。";
    const buttonLabel = action === "review_stage_assessment"
      ? "确认测评"
      : action === "publish_selected_plan_item"
        ? "发布当前计划"
        : "执行下一步";
    return `<section class="learning-card-generation-proposals learning-card-generation-operating-loop" data-operating-loop-panel data-operating-loop-status="${escapeHtml(clean(holder.status || data.status || "idle"))}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>闭环执行</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-operating-loop-refresh ${holder.status === "loading" ? "disabled" : ""}>${holder.status === "loading" ? "读取中" : "刷新记录"}</button>
          <button type="button" data-operating-loop-run-next data-operating-loop-action="${escapeHtml(action)}" ${canRun ? "" : `disabled aria-disabled="true" data-operating-loop-blocked-reason="${escapeHtml(blockedReason)}"`}>${busy ? "执行中" : escapeHtml(buttonLabel)}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>当前动作</small><strong>${escapeHtml(learningLoopActionText(action))}</strong></span>
        <span><small>执行记录</small><strong>${escapeHtml(String(Number(data.count ?? runs.length ?? 0) || 0))}</strong></span>
        <span><small>最近状态</small><strong>${escapeHtml(operatingLoopRunStatusText(latestRun.status || holder.actionStatus))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${operatingLoopRunRows(holder, escapeHtml)}
      </div>
      ${operatingLoopActionStatusPanel(holder, escapeHtml)}
    </section>`;
  }

  function referenceObjectTypeText(objectType = "") {
    const value = clean(objectType);
    const map = {
      program: "学习项目",
      task_card: "卡片",
      submission: "提交",
      evaluation: "批改",
      reflection: "反思",
      mastery_profile: "画像",
      learning_graph_plan: "图谱计划",
      plan_draft: "计划草稿",
      profile_feedback: "画像闭环"
    };
    return map[value] || value || "引用";
  }

  function referenceChainStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "loading") return "读取中";
    if (value === "ready") return "已读取";
    if (value === "failed") return "读取失败";
    if (value === "partial") return "部分可读";
    return "待读取";
  }

  function addReferenceRequest(items, objectType, objectId, label = "", reason = "") {
    const type = clean(objectType);
    const id = clean(objectId);
    if (!type || !id) return;
    const key = `${type}:${id}`;
    if (items.some((item) => item.key === key)) return;
    items.push({
      key,
      objectType: type,
      objectId: id,
      label: clean(label) || referenceObjectTypeText(type),
      reason: clean(reason) || "owner_loop"
    });
  }

  function createReferenceChainRequests({ context = {}, state = {}, workspaceId = "" } = {}) {
    const requests = [];
    const target = context.target || {};
    const plan = context.suggestedPlan || {};
    const defaults = context.generationDefaults || {};
    const draftResult = state.dailyLoopDraftResult || {};
    const publishResult = state.dailyLoopPublishResult || {};
    const generated = state.generatedResult || publishResult.generation || {};
    const planDraft = draftResult.planDraft || publishResult.planDraft || generated.planDraft || {};
    const published = generated.published || publishResult.published || {};
    const learningGraphPlan = generated.learningGraphPlan || publishResult.learningGraphPlan || draftResult.learningGraphPlan || {};
    const selectedCycle = state.cycleHistory?.selectedCycle || {};
    const selectors = selectedCycle.selectors || {};
    const auditTimeline = asArray(state.cycleDrilldown?.audit?.timeline);
    const learnerId = firstCleanValue(target.learnerId, workspaceId, context.workspaceId);
    addReferenceRequest(requests, "mastery_profile", learnerId, "学习画像", "profile_basis");
    addReferenceRequest(requests, "program", firstCleanValue(context.programId, plan.programId, defaults.programId, planDraft.programId), "学习项目", "scope");
    addReferenceRequest(requests, "learning_graph_plan", firstCleanValue(learningGraphPlan.learningGraphPlanId, generated.learningGraphPlanId, publishResult.learningGraphPlanId, plan.learningGraphPlanId), "图谱计划", "graph_plan");
    addReferenceRequest(requests, "plan_draft", firstCleanValue(planDraft.planDraftId, selectors.planDraftId, selectedCycle.planDraftId), "计划草稿", "plan_draft");
    const taskCardId = firstCleanValue(published.taskCardId, generated.taskCardId, publishResult.taskCardId, selectors.taskCardId, selectedCycle.taskCardId);
    const evaluationId = firstCleanValue(selectors.evaluationId, selectedCycle.evaluationId);
    addReferenceRequest(requests, "task_card", taskCardId, "学习卡片", "published_card");
    addReferenceRequest(requests, "evaluation", evaluationId, "批改证据", "cycle_audit");
    const feedbackTaskCardId = firstCleanValue(selectors.taskCardId, selectedCycle.taskCardId, taskCardId);
    addReferenceRequest(requests, "profile_feedback", feedbackTaskCardId ? `task_card:${feedbackTaskCardId}` : evaluationId ? `evaluation:${evaluationId}` : "", "画像闭环", "profile_feedback");
    for (const entry of auditTimeline) {
      addReferenceRequest(requests, "task_card", firstCleanValue(entry.taskCardId), "审计卡片", "cycle_timeline");
      addReferenceRequest(requests, "evaluation", firstCleanValue(entry.evaluationId), "审计批改", "cycle_timeline");
      if (requests.length >= 8) break;
    }
    return requests.slice(0, 8);
  }

  function referenceChainRow(item = {}, escapeHtml = defaultEscapeHtml) {
    const display = item.display || {};
    const summary = item.summary || {};
    const ok = item.ok !== false;
    const title = clean(display.title || summary.title || item.label || referenceObjectTypeText(item.objectType));
    const detail = clean(display.subtitle || summary.subtitle || item.error || item.reason || item.referenceId || "summary-only");
    return `<div class="learning-card-generation-reference-row" data-reference-object-type="${escapeHtml(clean(item.objectType))}" data-reference-object-id="${escapeHtml(clean(item.objectId))}" data-reference-ok="${ok ? "true" : "false"}">
      <span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(detail)}</small>
      </span>
      <em>${escapeHtml(ok ? referenceObjectTypeText(item.objectType) : "不可读")}</em>
    </div>`;
  }

  function referenceChainPanel(context = {}, state = {}, workspaceId = "", escapeHtml = defaultEscapeHtml) {
    const holder = state.referenceChain || {};
    const objectTypes = holder.objectTypes || context.referenceObjectTypes || {};
    const summaries = asArray(holder.summaries || context.referenceSummaries);
    const requests = asArray(holder.requests).length ? asArray(holder.requests) : createReferenceChainRequests({ context, state, workspaceId });
    const loading = holder.status === "loading";
    const failed = holder.status === "failed";
    const status = failed ? "failed" : loading ? "loading" : clean(holder.status || (summaries.length ? "ready" : "idle"));
    const typeCount = Number(objectTypes.referenceContractObjectTypeCount || asArray(objectTypes.objectTypes).length || 0) || 0;
    const rows = summaries.length
      ? summaries.slice(0, 8).map((item) => referenceChainRow(item, escapeHtml)).join("")
      : requests.length
        ? requests.slice(0, 8).map((item) => referenceChainRow(Object.assign({}, item, { ok: holder.status !== "failed", display: { title: item.label, subtitle: item.objectId } }), escapeHtml)).join("")
        : `<div class="learning-card-generation-reference-empty">等待计划、卡片或审计记录形成后显示引用。</div>`;
    const detail = failed
      ? clean(holder.error) || "reference_chain_failed"
      : loading
        ? "正在读取 Growth Reference Contract summary。"
        : `${typeCount || 8} 类 summary-only 引用，当前链路 ${summaries.length || requests.length} 项。`;
    return `<section class="learning-card-generation-reference-chain" data-reference-chain-panel data-reference-chain-status="${escapeHtml(status)}">
      <div class="learning-card-generation-reference-head">
        <span>
          <strong>闭环引用</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <button type="button" data-reference-chain-refresh ${loading ? "disabled" : ""}>${escapeHtml(loading ? "读取中" : "刷新引用")}</button>
      </div>
      <div class="learning-card-generation-reference-grid">
        <span><small>对象类型</small><strong>${escapeHtml(String(typeCount || 8))}</strong></span>
        <span><small>当前引用</small><strong>${escapeHtml(String(summaries.length || requests.length || 0))}</strong></span>
        <span><small>隐私</small><strong>summary-only</strong></span>
      </div>
      <div class="learning-card-generation-reference-list">
        ${rows}
      </div>
    </section>`;
  }

  function releaseWorkbenchStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "loading") return "读取中";
    if (value === "ready" || value === "pass" || value === "ready_for_release_review") return "可记录";
    if (value === "recording") return "记录中";
    if (value === "recorded") return "已记录";
    if (value === "blocked") return "有缺口";
    if (value === "failed") return "失败";
    return value || "待检查";
  }

  function releaseWorkbenchActionText(endpointKey = "") {
    const value = clean(endpointKey).toLowerCase();
    if (value === "release_evidence") return "记录证据";
    if (value === "release_approval") return "记录审批";
    if (value === "release_evidence_collection") return "收集证据";
    if (value === "release_decision") return "记录决策";
    if (value === "release_activation") return "记录激活";
    if (value === "runtime_enablement") return "记录启用";
    if (value === "release_package") return "需要包体";
    return "查看";
  }

  function releaseArtifactTemplateStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "artifact_manifest_required") return "需补证据";
    if (value === "release_evidence_actions_required") return "需执行";
    if (value === "release_evidence_ready_for_review") return "可复核";
    if (value === "no_artifact_manifest_required") return "无需 manifest";
    return releaseWorkbenchStatusText(value);
  }

  function releaseArtifactTemplateData(context = {}, state = {}) {
    const holder = state.releaseArtifactTemplate || {};
    const data = holder.data || context.releaseArtifactTemplate || {};
    const template = data.releaseArtifactTemplate || data || {};
    return { holder, data, template };
  }

  function releaseArtifactSlotRows(slots = [], escapeHtml = defaultEscapeHtml) {
    const rows = asArray(slots).slice(0, 4);
    if (!rows.length) return `<div class="learning-card-generation-release-empty">当前没有中心视觉/UI artifact slot。</div>`;
    return rows.map((slot = {}) => {
      const label = clean(slot.uiGate || slot.evidenceKey || slot.taskId || "artifact");
      const detail = clean(slot.source || slot.checkKey || slot.manifestField || slot.manifestKey || "summary-only");
      return `<div class="learning-card-generation-release-row" data-release-artifact-slot data-release-artifact-task-id="${escapeHtml(clean(slot.taskId))}">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(slot.required === false ? "可选" : "必需")}</em>
      </div>`;
    }).join("");
  }

  function releaseChecklistRows(checklist = {}, escapeHtml = defaultEscapeHtml) {
    const rows = asArray(checklist.items).slice(0, 6);
    if (!rows.length) return `<div class="learning-card-generation-release-empty">证据清单暂时没有阻塞项。</div>`;
    return rows.map((item = {}) => {
      const key = clean(item.key || item.taskId || item.evidenceKey || item.checkKey || "checklist");
      const label = clean(item.label || item.title || item.evidenceKey || item.checkKey || key);
      const detail = clean(item.commandName || item.routePath || item.kind || item.status || "summary-only");
      return `<div class="learning-card-generation-release-row" data-release-artifact-checklist-item data-release-artifact-checklist-key="${escapeHtml(key)}">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(clean(item.status || item.kind || "待补齐"))}</em>
      </div>`;
    }).join("");
  }

  function releaseActionPlanRows(actionPlan = {}, escapeHtml = defaultEscapeHtml) {
    const rows = asArray(actionPlan.actions).slice(0, 5);
    if (!rows.length) return `<div class="learning-card-generation-release-empty">暂无额外行动计划。</div>`;
    return rows.map((action = {}) => {
      const key = clean(action.key || action.action || "action");
      const label = clean(action.label || action.action || key);
      const route = action.route || action.followupRoute || {};
      const detail = clean(route.path || action.directCollectionRoutePath || action.readyPhase || action.status || "Owner action plan");
      const ready = action.readyToSubmit === true;
      return `<div class="learning-card-generation-release-row" data-release-artifact-action-plan data-release-artifact-action-key="${escapeHtml(key)}" data-release-artifact-action-ready="${ready ? "true" : "false"}">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(ready ? "可提交" : "待前置")}</em>
      </div>`;
    }).join("");
  }

  function releaseArtifactTemplatePanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const { holder, data, template } = releaseArtifactTemplateData(context, state);
    const checklist = template.releaseEvidenceChecklist || {};
    const actionPlan = template.releaseEvidenceActionPlan || {};
    const loading = holder.status === "loading";
    const failed = holder.status === "failed";
    const status = failed ? "failed" : loading ? "loading" : clean(template.status || data.status || holder.status);
    const nextAction = actionPlan.nextSubmittableAction || actionPlan.nextAction || template.nextAction || {};
    const detail = failed
      ? clean(holder.error) || "release_artifact_template_unavailable"
      : loading
        ? "正在读取中心视觉/UI 证据模板。"
        : clean(nextAction.label || nextAction.action || nextAction.key || "按证据清单补齐 release evidence。");
    return `<div class="learning-card-generation-release-artifact-template" data-release-artifact-template-panel data-release-artifact-template-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-release-head">
        <span>
          <strong>证据清单</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <button type="button" data-release-artifact-template-refresh ${loading ? "disabled" : ""}>${escapeHtml(loading ? "刷新中" : "刷新")}</button>
      </div>
      <div class="learning-card-generation-release-grid">
        <span><small>Artifact slots</small><strong>${escapeHtml(String(Number(template.artifactSlotCount ?? asArray(template.artifactSlots).length ?? 0) || 0))}</strong></span>
        <span><small>Checklist</small><strong>${escapeHtml(String(Number(checklist.itemCount ?? asArray(checklist.items).length ?? 0) || 0))}</strong></span>
        <span><small>可提交</small><strong>${escapeHtml(String(Number(actionPlan.submittableActionCount ?? 0) || 0))}</strong></span>
        <span><small>阶段</small><strong>${escapeHtml(clean(actionPlan.readyPhase || status || "idle"))}</strong></span>
      </div>
      <div class="learning-card-generation-release-actions">
        ${releaseArtifactSlotRows(template.artifactSlots, escapeHtml)}
        ${releaseChecklistRows(checklist, escapeHtml)}
        ${releaseActionPlanRows(actionPlan, escapeHtml)}
      </div>
      <div class="learning-card-generation-release-status" data-release-artifact-template-readback="${escapeHtml(status || "idle")}">
        <span>${escapeHtml(`Manifest ${template.readyForManifestInput ? "已准备" : "待中心视觉/UI artifact"} · ${clean(template.manifestSchemaVersion || template.artifactManifestTemplate?.schemaVersion || "summary-only")}`)}</span>
        <em>${escapeHtml(releaseArtifactTemplateStatusText(status))}</em>
      </div>
    </div>`;
  }

  function releaseWorkbenchActionAuditStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "listed") return "已读取";
    if (value === "recorded") return "已记录";
    if (value === "blocked") return "已阻塞";
    if (value === "failed") return "失败";
    if (value === "loading") return "读取中";
    return releaseWorkbenchStatusText(value);
  }

  function releaseWorkbenchActionAuditRows(audits = [], escapeHtml = defaultEscapeHtml) {
    const rows = asArray(audits).slice(0, 5);
    if (!rows.length) return `<div class="learning-card-generation-release-empty">暂无 release action audit。</div>`;
    return rows.map((audit = {}) => {
      const actionAuditId = clean(audit.actionAuditId || audit.action_audit_id);
      const endpointKey = clean(audit.endpointKey || audit.endpoint_key);
      const actionKey = clean(audit.actionKey || audit.action_key);
      const recordId = clean(audit.recordId || audit.record_id);
      const recordStatus = clean(audit.recordStatus || audit.record_status);
      const detail = [
        endpointKey,
        actionKey,
        recordId ? `record:${recordId}` : "",
        recordStatus
      ].filter(Boolean).join(" · ") || "summary-only audit";
      return `<div class="learning-card-generation-release-row" data-release-workbench-action-audit-row data-release-workbench-action-audit-id="${escapeHtml(actionAuditId)}">
        <span>
          <strong>${escapeHtml(actionAuditId || actionKey || endpointKey || "action audit")}</strong>
          <small>${escapeHtml(clean(audit.error) || detail)}</small>
        </span>
        <em>${escapeHtml(releaseWorkbenchActionAuditStatusText(audit.status))}</em>
      </div>`;
    }).join("");
  }

  function releaseWorkbenchActionAuditsPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.releaseWorkbenchActionAudits || {};
    const data = holder.data || context.releaseWorkbenchActionAudits || {};
    const audits = asArray(data.actionAudits || data.action_audits);
    const loading = holder.status === "loading";
    const failed = holder.status === "failed";
    const status = failed ? "failed" : loading ? "loading" : clean(data.status || holder.status || "idle");
    const detail = failed
      ? clean(holder.error) || "release_workbench_action_audits_unavailable"
      : loading
        ? "正在读取 release workbench action audit。"
        : `${Number(data.actionAuditCount ?? audits.length ?? 0) || 0} 条 summary-only action audit。`;
    return `<div class="learning-card-generation-release-action-audits" data-release-workbench-action-audits-panel data-release-workbench-action-audits-status="${escapeHtml(status)}">
      <div class="learning-card-generation-release-head">
        <span>
          <strong>操作审计</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <button type="button" data-release-workbench-action-audits-refresh ${loading ? "disabled" : ""}>${escapeHtml(loading ? "刷新中" : "刷新")}</button>
      </div>
      <div class="learning-card-generation-release-grid">
        <span><small>Audit</small><strong>${escapeHtml(String(Number(data.actionAuditCount ?? audits.length ?? 0) || 0))}</strong></span>
        <span><small>状态</small><strong>${escapeHtml(releaseWorkbenchActionAuditStatusText(status))}</strong></span>
        <span><small>权限</small><strong>Owner</strong></span>
      </div>
      <div class="learning-card-generation-release-actions">
        ${releaseWorkbenchActionAuditRows(audits, escapeHtml)}
      </div>
    </div>`;
  }

  function releaseStatusReadbackDataForKey(data = {}, key = "") {
    const value = data[key] || {};
    if (key === "controls") return value.releaseControls || value.controls || value;
    if (key === "dashboard") return value.releaseDashboard || value.dashboard || value;
    if (key === "inventory") return value.releaseInventory || value.inventory || value;
    if (key === "review") return value.releaseReview || value.review || value;
    if (key === "authorization") return value.releaseAuthorization || value.authorization || value;
    if (key === "closure") return value.releaseClosure || value.closure || value;
    if (key === "preflight") return value.releasePreflight || value.preflight || value;
    if (key === "activation") return value.releaseActivation || value.activation || value;
    if (key === "runtimeEnablement") return value.runtimeEnablement || value.runtime_enablement || value;
    return value;
  }

  function releaseStatusReadbackStatus(readback = {}, key = "") {
    const item = releaseStatusReadbackDataForKey(readback, key);
    return clean(
      item.status
        || item.releaseStatus
        || item.releaseReviewStatus
        || item.releaseAuthorizationStatus
        || item.releaseClosureStatus
        || item.releasePreflightStatus
        || item.releaseActivationStatus
        || item.runtimeEnablementStatus
        || readback[key]?.status
        || "idle"
    );
  }

  function releaseStatusReadbackDetail(readback = {}, key = "") {
    const item = releaseStatusReadbackDataForKey(readback, key);
    const nextAction = item.nextAction || item.next_action || {};
    const latestId = item.latestPreflightReportId || item.latest_preflight_report_id
      || item.latestPackageId || item.latest_package_id
      || item.latestCollectionRunId || item.latest_collection_run_id
      || item.latestDecisionId || item.latest_decision_id;
    return clean(nextAction.label || nextAction.key || nextAction.action || item.reason || item.blockingReason || latestId || "summary-only");
  }

  function releaseStatusReadbackRows(data = {}, escapeHtml = defaultEscapeHtml) {
    const rows = [
      ["controls", "Controls"],
      ["dashboard", "Dashboard"],
      ["inventory", "Inventory"],
      ["review", "Review"],
      ["authorization", "Authorization"],
      ["closure", "Closure"],
      ["preflight", "Preflight"],
      ["activation", "Activation"],
      ["runtimeEnablement", "Runtime"]
    ];
    return rows.map(([key, label]) => {
      const status = releaseStatusReadbackStatus(data, key);
      return `<div class="learning-card-generation-release-row" data-release-status-readback-row data-release-status-readback-key="${escapeHtml(key)}">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(releaseStatusReadbackDetail(data, key))}</small>
        </span>
        <em>${escapeHtml(releaseWorkbenchStatusText(status))}</em>
      </div>`;
    }).join("");
  }

  function releaseStatusReadbacksPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.releaseStatusReadbacks || {};
    const data = holder.data || context.releaseStatusReadbacks || {};
    const loading = holder.status === "loading";
    const failed = holder.status === "failed";
    const status = failed ? "failed" : loading ? "loading" : clean(holder.status || data.status || "idle");
    const detail = failed
      ? clean(holder.error) || "release_status_readbacks_unavailable"
      : loading
        ? "正在读取 release controls、dashboard、review 和 activation 摘要。"
        : "只读汇总 release controls、dashboard、review、closure、preflight 和 runtime 状态。";
    return `<div class="learning-card-generation-release-status-readbacks" data-release-status-readbacks-panel data-release-status-readbacks-status="${escapeHtml(status)}">
      <div class="learning-card-generation-release-head">
        <span>
          <strong>发布总览</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <button type="button" data-release-status-readbacks-refresh ${loading ? "disabled" : ""}>${escapeHtml(loading ? "刷新中" : "刷新")}</button>
      </div>
      <div class="learning-card-generation-release-actions">
        ${releaseStatusReadbackRows(data, escapeHtml)}
      </div>
    </div>`;
  }

  function releaseEvidenceLedgerStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "ready") return "已读取";
    if (value === "loading") return "读取中";
    if (value === "failed") return "失败";
    if (value === "pass") return "通过";
    if (value === "approved") return "已批准";
    if (value === "revoked") return "已撤销";
    if (value === "expired") return "已过期";
    return releaseWorkbenchStatusText(value);
  }

  function releaseEvidenceLedgerRows(data = {}, escapeHtml = defaultEscapeHtml) {
    const releaseEvidence = data.releaseEvidence || data.evidence || {};
    const releaseApprovals = data.releaseApprovals || data.approvals || {};
    const evidenceRows = Array.isArray(data.evidence)
      ? data.evidence
      : asArray(releaseEvidence.evidence || data.evidenceRows);
    const approvalRows = Array.isArray(data.approvals)
      ? data.approvals
      : asArray(releaseApprovals.approvals || data.approvalRows);
    const rows = evidenceRows.slice(0, 4).map((record = {}) => {
      const recordId = clean(record.evidenceRecordId || record.evidence_record_id || record.evidenceId || record.evidence_id || record.id);
      const evidenceKey = clean(record.evidenceKey || record.evidence_key || record.key || record.checkKey || record.check_key);
      const checkKey = clean(record.checkKey || record.check_key);
      const detail = [
        checkKey,
        clean(record.note),
        clean(record.observedAt || record.observed_at || record.updatedAt || record.updated_at)
      ].filter(Boolean).join(" · ") || "摘要证据";
      return `<div class="learning-card-generation-release-row" data-release-evidence-ledger-row data-release-evidence-ledger-kind="evidence" data-release-evidence-ledger-id="${escapeHtml(recordId)}">
        <span>
          <strong>${escapeHtml(evidenceKey || recordId || "release evidence")}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(releaseEvidenceLedgerStatusText(record.status))}</em>
      </div>`;
    });
    rows.push(...approvalRows.slice(0, 4).map((record = {}) => {
      const recordId = clean(record.approvalId || record.approval_id || record.id);
      const approvalKey = clean(record.approvalKey || record.approval_key || record.configGate || record.config_gate);
      const detail = [
        clean(record.approvedBy || record.approved_by),
        clean(record.note),
        clean(record.approvedAt || record.approved_at || record.updatedAt || record.updated_at)
      ].filter(Boolean).join(" · ") || "摘要审批";
      return `<div class="learning-card-generation-release-row" data-release-evidence-ledger-row data-release-evidence-ledger-kind="approval" data-release-evidence-ledger-id="${escapeHtml(recordId)}">
        <span>
          <strong>${escapeHtml(approvalKey || recordId || "release approval")}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(releaseEvidenceLedgerStatusText(record.status))}</em>
      </div>`;
    }));
    if (!rows.length) return `<div class="learning-card-generation-release-empty">暂无发布证据或审批记录。</div>`;
    return rows.join("");
  }

  function releaseEvidenceLedgerPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.releaseEvidenceLedger || {};
    const data = holder.data || context.releaseEvidenceLedger || {};
    const releaseEvidence = data.releaseEvidence || data.evidence || {};
    const releaseApprovals = data.releaseApprovals || data.approvals || {};
    const evidenceRows = Array.isArray(data.evidence)
      ? data.evidence
      : asArray(releaseEvidence.evidence || data.evidenceRows);
    const approvalRows = Array.isArray(data.approvals)
      ? data.approvals
      : asArray(releaseApprovals.approvals || data.approvalRows);
    const loading = holder.status === "loading";
    const failed = holder.status === "failed";
    const status = failed ? "failed" : loading ? "loading" : clean(holder.status || data.status || "idle");
    const evidenceCount = Number(data.evidenceCount ?? releaseEvidence.count ?? evidenceRows.length ?? 0) || 0;
    const approvalCount = Number(data.approvalCount ?? releaseApprovals.count ?? approvalRows.length ?? 0) || 0;
    const passCount = evidenceRows.filter((row) => clean(row.status).toLowerCase() === "pass").length;
    const approvedCount = approvalRows.filter((row) => clean(row.status).toLowerCase() === "approved").length;
    const detail = failed
      ? clean(holder.error) || "release_evidence_ledger_unavailable"
      : loading
        ? "正在读取已保存的发布证据和审批记录。"
        : "只读账本；写入仍通过工作台动作和服务校验。";
    return `<div class="learning-card-generation-release-evidence-ledger" data-release-evidence-ledger-panel data-release-evidence-ledger-status="${escapeHtml(status)}">
      <div class="learning-card-generation-release-head">
        <span>
          <strong>证据账本</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <button type="button" data-release-evidence-ledger-refresh ${loading ? "disabled" : ""}>${escapeHtml(loading ? "刷新中" : "刷新")}</button>
      </div>
      <div class="learning-card-generation-release-grid">
        <span><small>证据</small><strong>${escapeHtml(String(evidenceCount))}</strong></span>
        <span><small>通过</small><strong>${escapeHtml(String(passCount))}</strong></span>
        <span><small>审批</small><strong>${escapeHtml(String(approvalCount))}</strong></span>
        <span><small>已批</small><strong>${escapeHtml(String(approvedCount))}</strong></span>
      </div>
      <div class="learning-card-generation-release-actions">
        ${releaseEvidenceLedgerRows(data, escapeHtml)}
      </div>
    </div>`;
  }

  function releaseLifecycleRecordsStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "ready") return "已读取";
    if (value === "loading") return "读取中";
    if (value === "recording") return "记录中";
    if (value === "recorded") return "已记录";
    if (value === "failed") return "失败";
    if (value === "blocked") return "已阻塞";
    return releaseWorkbenchStatusText(value);
  }

  function releaseLifecycleRecordId(kind = "", record = {}) {
    const value = clean(kind);
    if (value === "preflight") return clean(record.preflightReportId || record.preflight_report_id || record.reportId || record.report_id);
    if (value === "activation") return clean(record.activationId || record.activation_id);
    if (value === "runtime") return clean(record.enablementId || record.enablement_id);
    return clean(record.id);
  }

  function releaseLifecycleRecordDetail(kind = "", record = {}) {
    const value = clean(kind);
    if (value === "preflight") {
      const preflight = record.releasePreflight || record.release_preflight || record.summary || {};
      return clean(preflight.nextAction?.label || preflight.next_action?.label || record.collectionRunId || record.collection_run_id || record.createdAt || record.created_at || "summary-only preflight");
    }
    if (value === "activation") {
      const gates = asArray(record.requestedActivationGates || record.requested_activation_gates || record.activationGates || record.activation_gates)
        .map((item) => clean(typeof item === "string" ? item : item?.key))
        .filter(Boolean)
        .join(", ");
      return clean(gates || record.note || record.recordedAt || record.recorded_at || "summary-only activation");
    }
    if (value === "runtime") {
      const configKeys = asArray(record.requiredConfigKeys || record.required_config_keys)
        .map(clean)
        .filter(Boolean)
        .join(", ");
      return clean(configKeys || record.note || record.recordedAt || record.recorded_at || "summary-only runtime enablement");
    }
    return clean(record.status || "summary-only");
  }

  function releaseLifecycleRecordRows(kind = "", rows = [], escapeHtml = defaultEscapeHtml) {
    const records = asArray(rows).slice(0, 3);
    if (!records.length) {
      const label = kind === "preflight" ? "Preflight" : kind === "activation" ? "Activation" : "Runtime";
      return `<div class="learning-card-generation-release-empty">${escapeHtml(label)} 暂无记录。</div>`;
    }
    return records.map((record = {}) => {
      const recordId = releaseLifecycleRecordId(kind, record);
      const status = clean(record.status || "listed");
      return `<div class="learning-card-generation-release-row" data-release-lifecycle-record-row data-release-lifecycle-record-kind="${escapeHtml(kind)}" data-release-lifecycle-record-id="${escapeHtml(recordId)}">
        <span>
          <strong>${escapeHtml(recordId || kind || "release record")}</strong>
          <small>${escapeHtml(releaseLifecycleRecordDetail(kind, record))}</small>
        </span>
        <em>${escapeHtml(releaseWorkbenchStatusText(status))}</em>
      </div>`;
    }).join("");
  }

  function releaseLifecycleActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.actionStatus);
    const error = clean(holder.actionError);
    const result = holder.actionResult || {};
    const report = result.report || {};
    const activation = result.activation || {};
    const enablement = result.enablement || {};
    const recordId = clean(report.preflightReportId || activation.activationId || enablement.enablementId);
    if (!status || status === "idle") return "";
    const detail = status === "recorded"
      ? `发布记录已写入${recordId ? `：${recordId}` : "。"}`
      : status === "recording"
        ? "正在通过 Growth release lifecycle service 写入摘要记录。"
        : error || clean(result.error) || "发布记录写入失败。";
    return `<div class="learning-card-generation-release-status" data-release-lifecycle-record-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(releaseLifecycleRecordsStatusText(status))}</em>
    </div>`;
  }

  function releaseLifecycleRecordsPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.releaseLifecycleRecords || {};
    const data = holder.data || context.releaseLifecycleRecords || {};
    const preflightReports = asArray(data.preflightReports?.reports || data.preflight_reports?.reports || data.reports);
    const activations = asArray(data.activations?.activations || data.releaseActivations?.activations || data.release_activations?.activations);
    const runtimeEnablements = asArray(data.runtimeEnablements?.enablements || data.runtime_enablements?.enablements || data.enablements);
    const loading = holder.status === "loading";
    const failed = holder.status === "failed";
    const busy = holder.actionStatus === "recording";
    const status = failed ? "failed" : loading ? "loading" : clean(holder.status || data.status || "idle");
    const detail = failed
      ? clean(holder.error) || "release_lifecycle_records_unavailable"
      : loading
        ? "正在读取 preflight、activation 和 runtime 记录。"
        : "显式记录发布前检查、激活审计和运行启用审计。";
    return `<div class="learning-card-generation-release-lifecycle-records" data-release-lifecycle-records-panel data-release-lifecycle-records-status="${escapeHtml(status)}">
      <div class="learning-card-generation-release-head">
        <span>
          <strong>发布记录</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <button type="button" data-release-lifecycle-records-refresh ${loading ? "disabled" : ""}>${escapeHtml(loading ? "刷新中" : "刷新")}</button>
      </div>
      <div class="learning-card-generation-release-grid">
        <span><small>Preflight</small><strong>${escapeHtml(String(preflightReports.length))}</strong></span>
        <span><small>Activation</small><strong>${escapeHtml(String(activations.length))}</strong></span>
        <span><small>Runtime</small><strong>${escapeHtml(String(runtimeEnablements.length))}</strong></span>
        <span><small>权限</small><strong>Owner</strong></span>
      </div>
      <div class="learning-card-generation-release-row" data-release-lifecycle-record-controls>
        <span>
          <strong>显式 Owner 记录</strong>
          <small>记录摘要审计；runtime config 仍需在 Growth 外手动处理。</small>
        </span>
        <div class="learning-card-generation-release-row-actions">
          <button type="button" data-release-lifecycle-record="preflight" ${busy ? "disabled" : ""}>${escapeHtml(busy ? "记录中" : "记录 Preflight")}</button>
          <button type="button" data-release-lifecycle-record="activation" ${busy ? "disabled" : ""}>${escapeHtml(busy ? "记录中" : "记录 Activation")}</button>
          <button type="button" data-release-lifecycle-record="runtime" ${busy ? "disabled" : ""}>${escapeHtml(busy ? "记录中" : "记录 Runtime")}</button>
        </div>
      </div>
      <div class="learning-card-generation-release-actions">
        ${releaseLifecycleRecordRows("preflight", preflightReports, escapeHtml)}
        ${releaseLifecycleRecordRows("activation", activations, escapeHtml)}
        ${releaseLifecycleRecordRows("runtime", runtimeEnablements, escapeHtml)}
      </div>
      ${releaseLifecycleActionStatusPanel(holder, escapeHtml)}
    </div>`;
  }

  function releaseWorkbenchSupportedEndpoint(endpointKey = "") {
    return ["release_evidence", "release_approval", "release_evidence_collection", "release_decision", "release_package", "release_activation", "runtime_enablement"].includes(clean(endpointKey).toLowerCase());
  }

  function releaseWorkbenchScopeFromContext(context = {}, workspaceId = "") {
    const plan = context.suggestedPlan || {};
    const defaults = context.generationDefaults || {};
    const data = context.releaseWorkbench || {};
    const summary = data.releaseWorkbench || data;
    const inventory = summary.inventory || context.releaseInventory || {};
    return {
      workspace_id: clean(workspaceId || context.target?.workspaceId),
      learner_id: clean(context.target?.learnerId || workspaceId),
      program_id: clean(context.programId || plan.programId || defaults.programId),
      domain_pack_id: clean(context.domainPackId || plan.domainPackId || defaults.domainPackId),
      domain: clean(plan.domain || context.domain || defaults.domain),
      subject: clean(plan.subject || context.subject || defaults.subject || plan.domain || context.domain),
      horizon: clean(context.horizon || defaults.horizon || "daily_plan"),
      collection_run_id: clean(context.collectionRunId || inventory.latestCollectionRunId)
    };
  }

  function createReleaseArtifactTemplateQueryPayload({ context = {}, workspaceId = "" } = {}) {
    return Object.fromEntries(Object.entries(releaseWorkbenchScopeFromContext(context, workspaceId)).filter(([, value]) => clean(value)));
  }

  function createReleaseWorkbenchActionAuditQueryPayload({ context = {}, workspaceId = "" } = {}) {
    return Object.fromEntries(Object.entries(Object.assign({}, releaseWorkbenchScopeFromContext(context, workspaceId), {
      limit: 5
    })).filter(([, value]) => clean(value)));
  }

  function createReleaseStatusReadbackQueryPayload({ context = {}, workspaceId = "" } = {}) {
    return Object.fromEntries(Object.entries(Object.assign({}, releaseWorkbenchScopeFromContext(context, workspaceId), {
      limit: 4,
      activation_record_limit: 5,
      runtime_enablement_record_limit: 5
    })).filter(([, value]) => clean(value)));
  }

  function compactReleasePayload(payload = {}) {
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "object") return Boolean(value);
      return clean(value) || value === true;
    }));
  }

  function createReleaseEvidenceLedgerQueryPayload({ context = {}, workspaceId = "" } = {}) {
    return compactReleasePayload(Object.assign({}, releaseWorkbenchScopeFromContext(context, workspaceId), {
      limit: 8
    }));
  }

  function createReleaseLifecycleRecordsQueryPayload({ context = {}, workspaceId = "" } = {}) {
    return compactReleasePayload(Object.assign({}, releaseWorkbenchScopeFromContext(context, workspaceId), {
      limit: 5
    }));
  }

  function createReleaseLifecycleRecordPayload({ context = {}, workspaceId = "", recordKind = "" } = {}) {
    const kind = clean(recordKind);
    const payload = Object.assign({}, releaseWorkbenchScopeFromContext(context, workspaceId), {
      requested_by: "owner",
      recorded_by: "owner",
      activation_gates: ["writeful_execution"],
      note: "Owner recorded summary-only release lifecycle readback from Growth UI.",
      evidence: {
        schemaVersion: "growth.releaseLifecycleRecord.ownerUiEvidence.v1",
        summaryOnly: true,
        recordKind: kind,
        source: "growth_owner_generation_ui"
      }
    });
    if (kind === "preflight") {
      payload.allow_write_preflight = true;
      payload.created_by = "owner";
      delete payload.recorded_by;
      delete payload.activation_gates;
      delete payload.note;
      delete payload.evidence;
    }
    if (kind === "activation") {
      payload.activation_decision = {
        schemaVersion: "growth.learningAutomationReleaseActivation.decision.v1",
        summaryOnly: true,
        decision: "approved_for_config_enablement",
        recordOnly: true,
        advisoryOnly: true
      };
    }
    if (kind === "runtime") {
      payload.enablement_decision = {
        schemaVersion: "growth.learningAutomationRuntimeEnablement.decision.v1",
        summaryOnly: true,
        decision: "ready_for_manual_runtime_config_enablement",
        recordOnly: true,
        advisoryOnly: true
      };
    }
    return compactReleasePayload(payload);
  }

  function createReleasePackageBuildPayload({ context = {}, workspaceId = "", action = {} } = {}) {
    const routeBody = action.preparationRoute?.body || action.route?.body || {};
    const actionKey = clean(action.key || action.actionKey || action.action_key || routeBody.record_kind || "release_package");
    const payload = Object.assign({}, releaseWorkbenchScopeFromContext(context, workspaceId), {
      requested_by: "owner",
      action_key: actionKey,
      action: {
        key: actionKey,
        action: clean(action.action),
        endpointKey: clean(action.endpointKey || action.endpoint_key),
        source: clean(action.source),
        summaryOnly: true
      },
      tasks: asArray(routeBody.tasks || ["planner_readiness", "scheduler_dry_run"]).map(clean).filter(Boolean),
      required_task_ids: asArray(routeBody.required_task_ids || routeBody.requiredTaskIds || ["planner_readiness", "scheduler_dry_run"]).map(clean).filter(Boolean),
      activation_gates: asArray(routeBody.activation_gates || routeBody.activationGates || ["writeful_execution"]).map(clean).filter(Boolean)
    });
    if (routeBody.write_collection_run === true || routeBody.writeCollectionRun === true || routeBody.record_collection_run === true || routeBody.recordCollectionRun === true) {
      payload.write_collection_run = true;
    }
    if (routeBody.write_package_record === true || routeBody.writePackageRecord === true || routeBody.record_package === true || routeBody.recordPackage === true) {
      payload.write_package_record = true;
    }
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return typeof value === "object" ? Boolean(value) : clean(value);
    }));
  }

  function releasePackageCandidateFromHolder(holder = {}) {
    const result = holder.packageResult || {};
    const candidate = holder.packageCandidate || result.package || result.releasePackage || result.release_package;
    return candidate && typeof candidate === "object" ? candidate : null;
  }

  function createReleaseWorkbenchActionPayload({ context = {}, workspaceId = "", action = {}, releasePackage = null } = {}) {
    const endpointKey = clean(action.endpointKey || action.endpoint_key);
    const routeBody = action.route?.body || {};
    const actionKey = clean(action.key || action.actionKey || routeBody.evidence_key || routeBody.check_key || routeBody.approval_key);
    const payload = Object.assign({}, releaseWorkbenchScopeFromContext(context, workspaceId), {
      endpoint_key: endpointKey,
      action_key: actionKey,
      requested_by: "owner",
      action: {
        key: actionKey,
        action: clean(action.action),
        endpointKey,
        source: clean(action.source),
        summaryOnly: true
      }
    });
    if (endpointKey === "release_evidence") {
      payload.evidence_key = clean(routeBody.evidence_key || routeBody.check_key || actionKey);
      payload.check_key = clean(routeBody.check_key || routeBody.evidence_key || actionKey);
    }
    if (endpointKey === "release_approval") {
      payload.approval_key = clean(routeBody.approval_key || routeBody.config_gate || actionKey);
      payload.config_gate = clean(routeBody.config_gate || routeBody.approval_key || actionKey);
      payload.status = "active";
    }
    if (endpointKey === "release_evidence_collection") {
      payload.tasks = asArray(routeBody.tasks || ["learning_loop_state"]).map(clean).filter(Boolean);
      payload.required_task_ids = asArray(routeBody.required_task_ids || routeBody.requiredTaskIds || payload.tasks).map(clean).filter(Boolean);
      payload.write_collection_run = routeBody.write_collection_run === true || routeBody.writeCollectionRun === true || routeBody.record_collection_run === true || routeBody.recordCollectionRun === true;
      payload.write_release_evidence_records = routeBody.write_release_evidence_records === true || routeBody.writeReleaseEvidenceRecords === true || routeBody.record_release_evidence_records === true || routeBody.recordReleaseEvidenceRecords === true;
      if (routeBody.auto_select_completed_cycle === true || routeBody.autoSelectCompletedCycle === true) {
        payload.auto_select_completed_cycle = true;
      }
      if (routeBody.auto_select_latest_completed_cycle === true || routeBody.autoSelectLatestCompletedCycle === true) {
        payload.auto_select_latest_completed_cycle = true;
      }
      payload.central_visual_evidence_file = clean(routeBody.central_visual_evidence_file || routeBody.centralVisualEvidenceFile);
      for (const field of UI_EVIDENCE_FILE_FIELDS) {
        payload[field] = clean(routeBody[field]);
      }
    }
    if (endpointKey === "release_package" && releasePackage && typeof releasePackage === "object") {
      payload.release_package = releasePackage;
    }
    if (endpointKey === "release_decision") {
      payload.status = clean(routeBody.status || "approved");
      payload.decision_summary = routeBody.decision_summary && typeof routeBody.decision_summary === "object"
        ? routeBody.decision_summary
        : { summaryOnly: true };
      payload.collection_run_id = clean(routeBody.collection_run_id || routeBody.collectionRunId || payload.collection_run_id);
      if (routeBody.auto_select_latest_ready_collection_run === true || routeBody.autoSelectLatestReadyCollectionRun === true) {
        payload.auto_select_latest_ready_collection_run = true;
      }
    }
    if (endpointKey === "release_activation") {
      payload.activation_gates = asArray(routeBody.activation_gates || routeBody.activationGates || ["writeful_execution"]).map(clean).filter(Boolean);
    }
    if (endpointKey === "runtime_enablement") {
      payload.activation_gates = asArray(routeBody.activation_gates || routeBody.activationGates || ["writeful_execution"]).map(clean).filter(Boolean);
    }
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return typeof value === "object" ? Boolean(value) : clean(value);
    }));
  }

  function releaseWorkbenchActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.actionStatus);
    const error = clean(holder.actionError);
    const result = holder.actionResult || {};
    const record = result.actionRecord || {};
    if (!status || status === "idle") return "";
    const detail = status === "recorded"
      ? `已写入 ${clean(result.endpointKey || record.endpointKey || "release")} 记录${clean(record.recordId) ? `：${clean(record.recordId)}` : "。"}`
      : status === "recording"
        ? "正在写入 release workbench 摘要记录。"
        : error || "记录失败。";
    return `<div class="learning-card-generation-release-status" data-release-workbench-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(releaseWorkbenchStatusText(status))}</em>
    </div>`;
  }

  function releasePackageStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.packageStatus);
    const error = clean(holder.packageError);
    const result = holder.packageResult || {};
    const candidate = releasePackageCandidateFromHolder(holder);
    if (!status || status === "idle") return "";
    const summary = candidate?.summary || result.summary || {};
    const packageId = clean(candidate?.packageId || candidate?.package_id || candidate?.id || summary.packageId || summary.package_id);
    const packageStatus = clean(candidate?.status || summary.status || result.status || status);
    const stepCount = Number(candidate?.stepCount ?? summary.stepCount ?? (Array.isArray(candidate?.steps) ? candidate.steps.length : 0)) || 0;
    const detail = status === "building"
      ? "正在构建 summary-only release package candidate。"
      : status === "ready"
        ? `包候选已构建${packageId ? `：${packageId}` : "。"}${packageStatus ? ` · ${packageStatus}` : ""}${stepCount ? ` · ${stepCount} steps` : ""}`
        : status === "blocked"
          ? `包候选仍阻塞${packageStatus ? `：${packageStatus}` : "。"}${error ? ` · ${error}` : ""}`
          : error || "包候选构建失败。";
    return `<div class="learning-card-generation-release-status" data-release-package-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(releaseWorkbenchStatusText(status))}</em>
    </div>`;
  }

  function releasePackageActionRow(action = {}, holder = {}, escapeHtml = defaultEscapeHtml) {
    const endpointKey = clean(action.endpointKey || action.endpoint_key);
    const actionKey = clean(action.key || action.actionKey || action.action_key);
    const buildBusy = holder.packageStatus === "building";
    const recordBusy = holder.actionStatus === "recording";
    const candidate = releasePackageCandidateFromHolder(holder);
    const disabledReason = !candidate
      ? "先构建 summary-only release package candidate，再记录 package。"
      : recordBusy ? "正在记录上一条 release action。" : "";
    return `<div class="learning-card-generation-release-row" data-release-workbench-action-row data-release-workbench-endpoint="${escapeHtml(endpointKey || "unsupported")}">
      <span>
        <strong>${escapeHtml(clean(action.label) || actionKey || "Record release package")}</strong>
        <small>${escapeHtml(clean(action.source || action.action || "build package candidate before recording"))}</small>
      </span>
      <div class="learning-card-generation-release-row-actions">
        <button type="button"
          data-release-package-build
          data-release-workbench-action-key="${escapeHtml(actionKey)}"
          data-release-workbench-endpoint-key="${escapeHtml(endpointKey)}"
          ${buildBusy || recordBusy ? "disabled" : ""}>${escapeHtml(buildBusy ? "构建中" : "构建包候选")}</button>
        <button type="button"
          data-release-workbench-action
          data-release-workbench-action-key="${escapeHtml(actionKey)}"
          data-release-workbench-endpoint-key="${escapeHtml(endpointKey)}"
          ${disabledReason ? `data-release-workbench-blocked-reason="${escapeHtml(disabledReason)}"` : ""}
          ${!candidate || buildBusy || recordBusy ? "disabled" : ""}>${escapeHtml(recordBusy ? "记录中" : "记录包")}</button>
      </div>
    </div>`;
  }

  function releaseWorkbenchActionRows(actions = [], holder = {}, escapeHtml = defaultEscapeHtml) {
    const busy = holder.actionStatus === "recording";
    if (!actions.length) return `<div class="learning-card-generation-release-empty">暂无需要 Owner 记录的 release action。</div>`;
    return actions.slice(0, 6).map((action) => {
      const endpointKey = clean(action.endpointKey || action.endpoint_key);
      const actionKey = clean(action.key || action.actionKey || action.action_key);
      if (endpointKey === "release_package") return releasePackageActionRow(action, holder, escapeHtml);
      const supported = releaseWorkbenchSupportedEndpoint(endpointKey);
      const disabled = busy || !supported;
      const detail = action.externalActionRequired
        ? "先在 Growth 外确认配置，再记录摘要"
        : clean(action.source || action.action || "release workbench");
      const disabledReason = !supported
        ? "当前界面只支持 evidence、approval、evidence collection、activation 和 runtime enablement。"
        : busy ? "正在记录上一条 release action。" : "";
      return `<div class="learning-card-generation-release-row" data-release-workbench-action-row data-release-workbench-endpoint="${escapeHtml(endpointKey || "unsupported")}">
        <span>
          <strong>${escapeHtml(clean(action.label) || actionKey || releaseWorkbenchActionText(endpointKey))}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <button type="button"
          data-release-workbench-action
          data-release-workbench-action-key="${escapeHtml(actionKey)}"
          data-release-workbench-endpoint-key="${escapeHtml(endpointKey)}"
          ${disabledReason ? `data-release-workbench-blocked-reason="${escapeHtml(disabledReason)}"` : ""}
          ${disabled ? "disabled" : ""}>${escapeHtml(busy && supported ? "记录中" : releaseWorkbenchActionText(endpointKey))}</button>
      </div>`;
    }).join("");
  }

  function releaseWorkbenchPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.releaseWorkbench || {};
    const data = holder.data || context.releaseWorkbench || {};
    const summary = data.releaseWorkbench || data;
    const loading = holder.status === "loading";
    const failed = holder.status === "failed";
    const status = failed ? "failed" : loading ? "loading" : clean(summary.status || data.status || holder.status);
    const actions = asArray(summary.ownerActions || summary.owner_actions);
    const inventory = summary.inventory || data.releaseInventory || {};
    const missingEvidenceKeys = asArray(summary.missingEvidenceKeys).length ? summary.missingEvidenceKeys : summary.missingCheckKeys;
    const nextAction = summary.nextAction || actions[0] || {};
    const reason = failed
      ? clean(holder.error) || "release_workbench_unavailable"
      : loading
        ? "正在读取 release readiness、controls、dashboard 和 inventory 摘要。"
        : clean(nextAction.label || nextAction.action || "Owner 可以按缺口记录 release evidence。");
    return `<section class="learning-card-generation-release-workbench" data-release-workbench-panel data-release-workbench-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-release-head">
        <span>
          <strong>发布工作台</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <em>${escapeHtml(releaseWorkbenchStatusText(status))}</em>
      </div>
      <div class="learning-card-generation-release-grid">
        <span><small>待处理</small><strong>${escapeHtml(String(Number(summary.ownerActionCount ?? actions.length ?? 0) || 0))}</strong></span>
        <span><small>证据缺口</small><strong>${escapeHtml(String(asArray(missingEvidenceKeys).length))}</strong></span>
        <span><small>审批缺口</small><strong>${escapeHtml(String(asArray(summary.missingApprovalKeys).length))}</strong></span>
        <span><small>记录缺口</small><strong>${escapeHtml(String(asArray(summary.missingRecordKinds || inventory.missingRecordKinds).length))}</strong></span>
      </div>
      ${releaseArtifactTemplatePanel(context, state, escapeHtml)}
      ${releaseWorkbenchActionAuditsPanel(context, state, escapeHtml)}
      ${releaseStatusReadbacksPanel(context, state, escapeHtml)}
      ${releaseEvidenceLedgerPanel(context, state, escapeHtml)}
      ${releaseLifecycleRecordsPanel(context, state, escapeHtml)}
      <div class="learning-card-generation-release-actions">
        ${releaseWorkbenchActionRows(actions, holder, escapeHtml)}
      </div>
      ${releasePackageStatusPanel(holder, escapeHtml)}
      ${releaseWorkbenchActionStatusPanel(holder, escapeHtml)}
    </section>`;
  }

  function automationProposalScopeFromContext(context = {}, workspaceId = "") {
    const plan = context.suggestedPlan || {};
    const defaults = context.generationDefaults || {};
    const provisioning = context.targetProvisioning || {};
    const graphOptions = graphOptionsForContext(context);
    return {
      workspace_id: clean(workspaceId || context.target?.workspaceId),
      learner_id: clean(context.target?.learnerId || workspaceId),
      program_id: clean(context.programId || plan.programId || defaults.programId),
      domain_pack_id: clean(provisioning.selectedDomainPackId || graphOptions.selectedDomainPackId || context.domainPackId || plan.domainPackId || defaults.domainPackId),
      domain: clean(provisioning.selectedDomain || graphOptions.selectedDomain || plan.domain || context.domain || defaults.domain),
      subject: clean(provisioning.selectedSubject || graphOptions.selectedSubject || plan.subject || context.subject || defaults.subject || plan.domain || context.domain),
      horizon: clean(context.horizon || defaults.horizon || "daily_plan")
    };
  }

  function createAutomationProposalQueryPayload({ context = {}, workspaceId = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      limit: 6
    })).filter(([, value]) => clean(value)));
  }

  function createAutomationProposalDecisionPayload({ context = {}, workspaceId = "", proposal = {}, status = "", reason = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    const targetStatus = clean(status);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      status: targetStatus,
      reason: clean(reason) || automationProposalDecisionReason(targetStatus),
      reviewed_by: "owner",
      proposal_id: clean(proposal.proposalId || proposal.proposal_id)
    })).filter(([, value]) => clean(value)));
  }

  function automationProposalDecisionReason(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "accepted") return "Owner accepted supervised next-card proposal.";
    if (value === "expired") return "Owner expired stale supervised next-card proposal.";
    if (value === "superseded") return "Owner superseded supervised next-card proposal.";
    return "Owner skipped supervised next-card proposal.";
  }

  function createAutomationProposalPublishPayload({ context = {}, workspaceId = "", proposal = {} } = {}) {
    const defaults = context.generationDefaults || {};
    const scope = automationProposalScopeFromContext(context, workspaceId);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      proposal_id: clean(proposal.proposalId || proposal.proposal_id),
      generation_key: ["automation_proposal", clean(proposal.proposalId || proposal.proposal_id), clean(proposal.planDraftId || proposal.plan_draft_id)].filter(Boolean).join(":"),
      card_schema_version: clean(defaults.cardSchemaVersion || "growth.card.authoring.v1"),
      requested_by: "owner"
    })).filter(([, value]) => clean(value)));
  }

  function createAutomationDigestQueryPayload({ context = {}, workspaceId = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      limit: 6
    })).filter(([, value]) => clean(value)));
  }

  function createAutomationDigestCreatePayload({ context = {}, workspaceId = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      limit: 6,
      requested_by: "owner"
    })).filter(([, value]) => clean(value)));
  }

  function createAutomationDigestReviewPayload({ context = {}, workspaceId = "", digest = {}, status = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    const targetStatus = clean(status);
    const selectedCandidateIds = asArray(digest.requiredActions)
      .map((action = {}) => clean(action.candidateId || action.candidate_id))
      .filter(Boolean);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      digest_id: clean(digest.digestId || digest.digest_id),
      status: targetStatus,
      selected_candidate_ids: selectedCandidateIds,
      reason: automationDigestReviewReason(targetStatus),
      reviewed_by: "owner"
    })).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return clean(value);
    }));
  }

  function automationDigestReviewReason(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "reviewed") return "Owner reviewed automation digest without publishing.";
    if (value === "archived") return "Owner archived automation digest without publishing.";
    if (value === "superseded") return "Owner superseded automation digest without publishing.";
    return "Owner reviewed automation digest.";
  }

  function createAutomationFailurePolicyQueryPayload({ context = {}, workspaceId = "", status = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      status: clean(status),
      limit: 6
    })).filter(([, value]) => clean(value)));
  }

  function createAutomationFailurePolicyCreatePayload({ context = {}, workspaceId = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      policy_version: "growth.learningAutomationFailurePolicy.v1",
      policy: {
        schemaVersion: "growth.learningAutomationPolicy.v1",
        summaryOnly: true,
        ownerReviewRequired: true,
        digestReviewRequired: true,
        actionHandoffRequiredBeforeScheduling: true,
        writefulSchedulingAllowed: false
      },
      rollback_policy: {
        schemaVersion: "growth.learningAutomationFailurePolicy.rollback.v1",
        summaryOnly: true,
        transactionalPublishRequired: true,
        partialPublishBehavior: "service_transaction_rollback",
        proposalExecutionFailure: "record_bounded_execution_failure_owner_retry",
        actionHandoffFailure: "no_learning_write_visible_owner_retry",
        retryRequiresOwner: true,
        maxAutomaticRetries: 0
      },
      failure_policy: {
        schemaVersion: "growth.learningAutomationFailurePolicy.failure.v1",
        summaryOnly: true,
        visibleFailureRequired: true,
        ownerReviewRequired: true,
        retryRequiresOwner: true,
        maxAutomaticRetries: 0,
        writefulSchedulingAllowed: false
      },
      requested_by: "owner"
    })).filter(([, value]) => {
      if (value && typeof value === "object") return true;
      return clean(value);
    }));
  }

  function createAutomationFailurePolicyReviewPayload({ context = {}, workspaceId = "", policy = {}, status = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    const targetStatus = clean(status);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      policy_id: clean(policy.policyId || policy.policy_id),
      status: targetStatus,
      reason: targetStatus === "active"
        ? "Owner activated failure policy for supervised automation readiness; writeful scheduling remains disabled."
        : `Owner marked failure policy ${targetStatus || "reviewed"}; no scheduler permission changed.`,
      note: targetStatus === "active"
        ? "Visible failure and Owner retry policy activated."
        : "Owner reviewed failure policy without enabling scheduling.",
      reviewed_by: "owner"
    })).filter(([, value]) => clean(value)));
  }

  function createAutomationActionHandoffQueryPayload({ context = {}, workspaceId = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      limit: 6
    })).filter(([, value]) => clean(value)));
  }

  function createAutomationActionHandoffPayload({ context = {}, workspaceId = "", digest = {} } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      digest_id: clean(digest.digestId || digest.digest_id),
      summary: `Owner requested bounded action handoff for reviewed digest ${clean(digest.digestId || digest.digest_id) || "digest"}.`,
      requested_by: "owner"
    })).filter(([, value]) => clean(value)));
  }

  function createAutomationActionHandoffDeliverPayload({ context = {}, workspaceId = "", handoff = {} } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      handoff_id: clean(handoff.handoffId || handoff.handoff_id),
      requested_by: "owner"
    })).filter(([, value]) => clean(value)));
  }

  function automationSchedulerExecutionActionFromHandoff(handoff = {}) {
    const actions = asArray(handoff.actions);
    return actions.find((action = {}) => clean(action.proposalId || action.proposal_id)) || actions[0] || {};
  }

  function createAutomationSchedulerExecutionQueryPayload({ context = {}, workspaceId = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      limit: 6
    })).filter(([, value]) => clean(value)));
  }

  function createAutomationSchedulerExecutionPayload({ context = {}, workspaceId = "", handoff = {} } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    const defaults = context.generationDefaults || {};
    const action = automationSchedulerExecutionActionFromHandoff(handoff);
    const handoffId = clean(handoff.handoffId || handoff.handoff_id);
    const proposalId = clean(action.proposalId || action.proposal_id || handoff.proposalId || handoff.proposal_id);
    const planDraftId = clean(action.planDraftId || action.plan_draft_id || handoff.planDraftId || handoff.plan_draft_id);
    const selectedItemId = clean(action.selectedItemId || action.selected_item_id || action.itemId || action.item_id || handoff.selectedItemId || handoff.selected_item_id);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      handoff_id: handoffId,
      digest_id: clean(handoff.digestId || handoff.digest_id),
      policy_id: clean(handoff.policyId || handoff.policy_id),
      proposal_id: proposalId,
      plan_draft_id: planDraftId,
      selected_item_id: selectedItemId,
      execution_mode: "owner_explicit_once",
      generation_key: ["scheduler_execution", handoffId, proposalId, planDraftId, selectedItemId].filter(Boolean).join(":"),
      card_schema_version: clean(defaults.cardSchemaVersion || "growth.card.authoring.v1"),
      requested_by: "owner"
    })).filter(([, value]) => clean(value)));
  }

  function createAutomationSchedulerRunQueryPayload({ context = {}, workspaceId = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      limit: 6
    })).filter(([, value]) => clean(value)));
  }

  function createAutomationSchedulerRunPayload({ context = {}, workspaceId = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    const defaults = context.generationDefaults || {};
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      run_mode: "background_supervised_tick",
      limit: 5,
      generation_key: ["scheduler_run", clean(scope.workspace_id), clean(scope.domain), clean(scope.subject), clean(scope.horizon)].filter(Boolean).join(":"),
      card_schema_version: clean(defaults.cardSchemaVersion || "growth.card.authoring.v1"),
      requested_by: "owner"
    })).filter(([, value]) => clean(value)));
  }

  function createAutomationSchedulerWorkerTargetQueryPayload({ context = {}, workspaceId = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      limit: 6
    })).filter(([, value]) => clean(value)));
  }

  function createAutomationSchedulerWorkerTargetPayload({ context = {}, workspaceId = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    const plan = context.suggestedPlan || {};
    const recommendation = context.nextCardRecommendation || {};
    const targetNodeIds = firstCleanArray(recommendation.targetNodeIds, plan.targetNodeIds, [recommendation.targetNodeId || plan.targetNodeId]);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      target_node_ids: targetNodeIds,
      limit: 5,
      policy: {
        schemaVersion: "growth.learningAutomationSchedulerWorkerTarget.policy.v1",
        summaryOnly: true,
        workerMode: "background_worker_tick",
        schedulerRunMode: "background_supervised_tick",
        ownerReviewRequired: true,
        targetProvisioningRequired: true,
        actionHandoffRequiredBeforeScheduling: true,
        productionSchedulingAllowed: false,
        maxActionsPerTick: 5
      },
      requested_by: "owner"
    })).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === "object") return true;
      return clean(value);
    }));
  }

  function createAutomationSchedulerWorkerTargetReviewPayload({ context = {}, workspaceId = "", target = {}, status = "" } = {}) {
    const scope = automationProposalScopeFromContext(context, workspaceId);
    const targetId = clean(target.targetId || target.target_id || target.workerTargetId || target.worker_target_id);
    const targetStatus = clean(status);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      target_id: targetId,
      status: targetStatus,
      reason: targetStatus === "enabled"
        ? "Owner reviewed target for future scheduler worker evidence; production scheduling remains disabled."
        : `Owner marked worker target ${targetStatus || "reviewed"}; no worker started.`,
      reviewed_by: "owner"
    })).filter(([, value]) => clean(value)));
  }

  function createRecommendationLifecycleDecisionPayload({ context = {}, workspaceId = "", recommendation = {}, status = "" } = {}) {
    const plan = context.suggestedPlan || {};
    const defaults = context.generationDefaults || {};
    const targetStatus = clean(status);
    const payload = {
      workspace_id: clean(workspaceId || recommendation.workspaceId || recommendation.workspace_id || context.target?.workspaceId),
      learner_id: clean(context.target?.learnerId || recommendation.learnerId || recommendation.learner_id || workspaceId),
      program_id: clean(context.programId || recommendation.programId || recommendation.program_id || plan.programId || defaults.programId),
      trajectory_id: clean(recommendation.trajectoryId || recommendation.trajectory_id || recommendation.id),
      task_card_id: clean(recommendation.sourceTaskCardId || recommendation.source_task_card_id || recommendation.taskCardId || recommendation.task_card_id),
      source_evaluation_id: clean(recommendation.sourceEvaluationId || recommendation.source_evaluation_id || recommendation.evaluationId || recommendation.evaluation_id),
      status: targetStatus,
      reason_code: targetStatus === "expired" ? "owner_expired_stale_recommendation" : "owner_skipped_low_pressure",
      reviewed_by: "owner"
    };
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => clean(value)));
  }

  function createAutomationProposalCreatePayload({ context = {}, workspaceId = "", selectedCycle = {} } = {}) {
    const plan = context.suggestedPlan || {};
    const defaults = context.generationDefaults || {};
    const recommendation = context.nextCardRecommendation || {};
    const scope = automationProposalScopeFromContext(context, workspaceId);
    const selected = cycleSelectionPayload(selectedCycle || {});
    const targetNodeIds = firstCleanArray(
      selected.target_node_ids,
      recommendation.targetNodeIds,
      plan.targetNodeIds,
      [recommendation.targetNodeId || plan.targetNodeId]
    );
    const payload = Object.assign({}, scope, {
      available_minutes: firstCleanValue(defaults.availableMinutes, context.availableMinutes, 15),
      low_pressure: true,
      requested_by: "owner",
      source_plan_draft_id: selected.plan_draft_id,
      source_task_card_id: selected.task_card_id,
      source_evaluation_id: selected.evaluation_id,
      profile_delta_id: selected.profile_delta_id,
      evidence_id: selected.evidence_id,
      correction_id: selected.correction_id,
      source_id: selected.source_id,
      source_target_node_ids: selected.target_node_ids,
      target_node_ids: targetNodeIds
    });
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return clean(value);
    }));
  }

  function createAutomationCycleClosurePayload({ context = {}, workspaceId = "", selectedCycle = {} } = {}) {
    const payload = createAutomationProposalCreatePayload({ context, workspaceId, selectedCycle });
    return Object.fromEntries(Object.entries(Object.assign({}, payload, {
      auto_select_latest_completed_cycle: true,
      accept_proposal: true,
      create_digest: true,
      review_digest: false,
      create_handoff: false,
      deliver_handoff: false,
      requested_by: "owner"
    })).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "boolean") return true;
      return clean(value);
    }));
  }

  function automationCycleClosureStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "submitting") return "准备中";
    if (value === "prepared") return "已准备";
    if (value === "proposal_ready") return "建议已准备";
    if (value === "digest_pending" || value === "pending") return "Digest 待复核";
    if (value === "reviewed") return "已复核";
    if (value === "delivered") return "已投递";
    if (value === "blocked") return "已阻塞";
    if (value === "failed") return "失败";
    return value || "待准备";
  }

  function automationCycleClosureStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.actionStatus);
    const error = clean(holder.actionError);
    const result = holder.actionResult || {};
    const summary = result.summary || {};
    if (!status || status === "idle") return "";
    const detail = status === "prepared"
      ? `复核包已准备：${clean(summary.proposalId) || "proposal"} / ${clean(summary.digestId) || "digest"}。`
      : status === "submitting"
        ? "正在从完成周期准备 proposal 和 digest。"
        : error || clean(result.error) || "闭环复核包准备失败。";
    return `<div class="learning-card-generation-proposal-status" data-automation-cycle-closure-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationCycleClosureStatusText(status))}</em>
    </div>`;
  }

  function automationCycleClosurePanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.automationCycleClosure || {};
    const result = holder.actionResult || {};
    const summary = result.summary || {};
    const stages = asArray(result.stages);
    const selectedCycle = result.selectedCycle || state.cycleHistory?.selectedCycle || {};
    const selectedCycleId = clean(summary.selectedCycleId || selectedCycle.cycleId || selectedCycle.cycle_id);
    const proposalId = clean(summary.proposalId || result.proposal?.proposalId || result.proposal?.proposal_id);
    const digestId = clean(summary.digestId || result.digest?.digestId || result.digest?.digest_id);
    const busy = clean(holder.actionStatus) === "submitting";
    const status = clean(holder.actionStatus || result.status || "idle");
    const failedStages = stages.filter((stage = {}) => stage.ok === false).map((stage = {}) => clean(stage.name)).filter(Boolean);
    const detail = clean(holder.actionError)
      || clean(result.error)
      || (proposalId || digestId
        ? "已把完成周期转成 Owner 可复核的下一张建议和 dry-run digest。"
        : "默认自动选择最新完成周期；只准备复核包，不发布卡片、不启动 scheduler。");
    return `<section class="learning-card-generation-proposals learning-card-generation-cycle-closure" data-automation-cycle-closure-panel data-automation-cycle-closure-status="${escapeHtml(status)}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>闭环复核包</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" class="primary${busy ? " disabled" : ""}" data-automation-cycle-closure-prepare ${busy ? "disabled" : ""}>${busy ? "准备中" : "准备复核包"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>完成周期</small><strong>${escapeHtml(selectedCycleId || "auto")}</strong></span>
        <span><small>Proposal</small><strong>${escapeHtml(proposalId || "待生成")}</strong></span>
        <span><small>Digest</small><strong>${escapeHtml(digestId || "待生成")}</strong></span>
      </div>
      ${failedStages.length ? `<div class="learning-card-generation-proposal-empty">阻塞阶段：${escapeHtml(failedStages.join(" · "))}</div>` : ""}
      ${automationCycleClosureStatusPanel(holder, escapeHtml)}
    </section>`;
  }

  function automationProposalStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "loading") return "读取中";
    if (value === "proposed") return "待复核";
    if (value === "accepted") return "已接受";
    if (value === "skipped") return "已跳过";
    if (value === "expired") return "已过期";
    if (value === "superseded") return "已替代";
    if (value === "publishing") return "发布中";
    if (value === "published") return "已发布";
    if (value === "created") return "已生成";
    if (value === "blocked") return "已阻塞";
    if (value === "failed") return "失败";
    return value || "待建议";
  }

  function automationProposalStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.actionStatus);
    const error = clean(holder.actionError);
    const result = holder.actionResult || {};
    const proposal = result.proposal || {};
    if (!status || status === "idle") return "";
    const execution = proposal.execution || {};
    const detail = status === "published"
      ? `建议已发布${clean(execution.generatedTaskCardId) ? `：${clean(execution.generatedTaskCardId)}` : "。"}`
      : status === "created"
        ? `已生成自动化建议${clean(proposal.proposalId || proposal.proposal_id) ? `：${clean(proposal.proposalId || proposal.proposal_id)}` : "。"}`
      : status === "reviewed"
        ? `建议已记录为 ${automationProposalStatusText(proposal.status)}。`
        : status === "submitting"
          ? "正在通过 Growth automation proposal service 写入。"
          : error || "建议操作失败。";
    return `<div class="learning-card-generation-proposal-status" data-automation-proposal-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationProposalStatusText(status))}</em>
    </div>`;
  }

  function automationProposalRows(holder = {}, escapeHtml = defaultEscapeHtml) {
    const data = holder.data || {};
    const proposals = asArray(data.proposals).slice(0, 5);
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    const busy = holder.actionStatus === "submitting";
    if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取自动化建议。</div>`;
    if (status === "failed") return `<div class="learning-card-generation-proposal-empty">自动化建议读取失败：${escapeHtml(clean(holder.error) || "automation_proposals_failed")}</div>`;
    if (!proposals.length) return `<div class="learning-card-generation-proposal-empty">暂无可复核的自动化建议。完成一张卡并生成 proposal 后会显示在这里。</div>`;
    return proposals.map((proposal) => {
      const proposalId = clean(proposal.proposalId || proposal.proposal_id);
      const execution = proposal.execution || {};
      const executionStatus = clean(execution.status);
      const isProposed = clean(proposal.status) === "proposed";
      const isAccepted = clean(proposal.status) === "accepted";
      const canPublish = isAccepted && executionStatus !== "published";
      const targetNodes = asArray(proposal.targetNodeIds || proposal.target_node_ids).map(clean).filter(Boolean);
      const title = clean(proposal.proposalSummary || proposalId || "下一张建议");
      const detail = clean(proposal.rationale?.plan?.reason || proposal.rationale?.plan?.selectedItemId || proposal.planDraftId || "summary-only proposal");
      const meta = [clean(proposal.status), executionStatus, clean(proposal.planDraftId)].filter(Boolean).join(" · ") || "proposal";
      return `<div class="learning-card-generation-proposal-row" data-automation-proposal-row data-automation-proposal-id="${escapeHtml(proposalId)}">
        <span>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(detail)}</small>
          <small>${escapeHtml(targetNodes.join(" · ") || "bounded graph target")}</small>
        </span>
        <em>${escapeHtml(meta)}</em>
        <div class="learning-card-generation-proposal-actions">
          ${["accepted", "skipped", "expired", "superseded"].map((decision) => {
            const blockedReason = busy
              ? "建议操作正在写入。"
              : !isProposed
                ? "只有待复核建议可以记录决策。"
                : "";
            const label = decision === "accepted" ? "接受" : decision === "skipped" ? "跳过" : decision === "expired" ? "过期" : "替代";
            return `<button type="button" class="${blockedReason ? "disabled" : ""}" data-automation-proposal-review data-automation-proposal-id="${escapeHtml(proposalId)}" data-automation-proposal-status="${escapeHtml(decision)}" ${blockedReason ? `aria-disabled="true" data-automation-proposal-blocked-reason="${escapeHtml(blockedReason)}"` : ""}>${escapeHtml(label)}</button>`;
          }).join("")}
          <button type="button" class="primary${busy || !canPublish ? " disabled" : ""}" data-automation-proposal-publish data-automation-proposal-id="${escapeHtml(proposalId)}" ${busy || !canPublish ? `aria-disabled="true" data-automation-proposal-blocked-reason="${escapeHtml(busy ? "建议操作正在写入。" : executionStatus === "published" ? "建议已经发布。" : "只有已接受且未发布的建议可以发布。")}"` : ""}>${busy && canPublish ? "发布中" : executionStatus === "published" ? "已发布" : "发布"}</button>
        </div>
      </div>`;
    }).join("");
  }

  function automationProposalPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.automationProposals || {};
    const data = holder.data || {};
    const proposals = asArray(data.proposals);
    const proposedCount = proposals.filter((item) => clean(item.status) === "proposed").length;
    const acceptedCount = proposals.filter((item) => clean(item.status) === "accepted").length;
    const publishedCount = proposals.filter((item) => clean(item.execution?.status) === "published").length;
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    const selectedCycle = state.cycleHistory?.selectedCycle || {};
    const createPayload = createAutomationProposalCreatePayload({
      context,
      workspaceId: state.selectedWorkspaceId || context.target?.workspaceId,
      selectedCycle
    });
    const hasSelectedSource = cycleAuditHasAnchor({
      plan_draft_id: createPayload.source_plan_draft_id,
      task_card_id: createPayload.source_task_card_id,
      evaluation_id: createPayload.source_evaluation_id,
      profile_delta_id: createPayload.profile_delta_id,
      evidence_id: createPayload.evidence_id,
      correction_id: createPayload.correction_id,
      source_id: createPayload.source_id
    });
    const busy = holder.actionStatus === "submitting";
    const reason = status === "loading"
      ? "正在读取 Owner 可复核的下一张建议。"
      : status === "failed"
        ? clean(holder.error) || "automation_proposals_failed"
        : proposedCount
          ? "Owner 需要复核 AI 建议后再发布。"
          : hasSelectedSource
            ? "可从选中的完整周期生成下一张建议。"
            : "没有待复核建议；请选择一个完整历史周期后生成 proposal。";
    return `<section class="learning-card-generation-proposals" data-automation-proposal-panel data-automation-proposal-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>自动化建议</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" class="${busy || !hasSelectedSource ? "disabled" : ""}" data-automation-proposal-create ${busy || !hasSelectedSource ? `aria-disabled="true" data-automation-proposal-blocked-reason="${escapeHtml(hasSelectedSource ? "建议操作正在写入。" : "请先在历史周期里选择一个完整周期。")}"` : ""}>${busy && hasSelectedSource ? "生成中" : "生成建议"}</button>
          <button type="button" data-automation-proposal-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新建议"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>待复核</small><strong>${escapeHtml(String(proposedCount))}</strong></span>
        <span><small>已接受</small><strong>${escapeHtml(String(acceptedCount))}</strong></span>
        <span><small>已发布</small><strong>${escapeHtml(String(publishedCount))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationProposalRows(holder, escapeHtml)}
      </div>
      ${automationProposalStatusPanel(holder, escapeHtml)}
    </section>`;
  }

  function automationDigestStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "loading") return "读取中";
    if (value === "pending") return "待复核";
    if (value === "reviewed") return "已复核";
    if (value === "archived") return "已归档";
    if (value === "superseded") return "已替代";
    if (value === "created") return "已生成";
    if (value === "failed") return "失败";
    return value || "待摘要";
  }

  function automationDigestActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.actionStatus);
    const error = clean(holder.actionError);
    const result = holder.actionResult || {};
    const digest = result.digest || {};
    if (!status || status === "idle") return "";
    const detail = status === "created"
      ? "Digest 已生成，等待 Owner 复核。"
      : status === "reviewed"
      ? `Digest 已记录为 ${automationDigestStatusText(digest.status)}。`
      : status === "submitting"
        ? "正在通过 Growth automation digest service 写入。"
        : error || "Digest 操作失败。";
    return `<div class="learning-card-generation-proposal-status" data-automation-digest-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationDigestStatusText(status))}</em>
    </div>`;
  }

  function automationDigestRows(holder = {}, escapeHtml = defaultEscapeHtml) {
    const data = holder.data || {};
    const digests = asArray(data.digests).slice(0, 5);
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    const busy = holder.actionStatus === "submitting";
    if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取自动化 digest。</div>`;
    if (status === "failed") return `<div class="learning-card-generation-proposal-empty">自动化 digest 读取失败：${escapeHtml(clean(holder.error) || "automation_digests_failed")}</div>`;
    if (!digests.length) return `<div class="learning-card-generation-proposal-empty">暂无自动化 digest。生成并接受 proposal 后，后端 dry-run digest 会显示在这里。</div>`;
    return digests.map((digest) => {
      const digestId = clean(digest.digestId || digest.digest_id);
      const digestStatus = clean(digest.status);
      const canReview = digestStatus === "pending";
      const summary = digest.summary || {};
      const requiredActions = asArray(digest.requiredActions || digest.required_actions);
      const blocked = asArray(digest.blocked);
      const candidates = asArray(digest.candidates);
      const firstAction = requiredActions[0] || {};
      const firstBlocked = blocked[0] || {};
      const title = clean(digestId || "自动化 digest");
      const detail = clean(firstAction.proposalId || firstAction.proposal_id || firstBlocked.reason || firstBlocked.decision || digest.createdAt || digest.created_at || "summary-only digest");
      const counts = [
        `would ${Number(summary.wouldPublish || summary.would_publish || 0) || 0}`,
        `blocked ${Number(summary.blocked || 0) || 0}`,
        `skipped ${Number(summary.skipped || 0) || 0}`,
        `actions ${Number(summary.requiredActions || summary.required_actions || requiredActions.length || 0) || 0}`
      ].join(" · ");
      const target = clean(digest.subject || digest.domain || digest.domainPackId || digest.domain_pack_id || "bounded scope");
      return `<div class="learning-card-generation-proposal-row" data-automation-digest-row data-automation-digest-id="${escapeHtml(digestId)}">
        <span>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(detail)}</small>
          <small>${escapeHtml(`${target} · ${counts}`)}</small>
          ${candidates.length ? `<small>${escapeHtml(`候选 ${candidates.length} · 手动发布，不自动执行`)}</small>` : ""}
        </span>
        <em>${escapeHtml(digestStatus || "digest")}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-digest-review data-automation-digest-id="${escapeHtml(digestId)}" data-automation-digest-status="reviewed" ${busy || !canReview ? "disabled" : ""}>复核</button>
          <button type="button" data-automation-digest-review data-automation-digest-id="${escapeHtml(digestId)}" data-automation-digest-status="archived" ${busy || !canReview ? "disabled" : ""}>归档</button>
          <button type="button" data-automation-digest-review data-automation-digest-id="${escapeHtml(digestId)}" data-automation-digest-status="superseded" ${busy || !canReview ? "disabled" : ""}>替代</button>
        </div>
      </div>`;
    }).join("");
  }

  function automationDigestPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.automationDigests || {};
    const data = holder.data || {};
    const digests = asArray(data.digests);
    const pendingCount = digests.filter((item) => clean(item.status) === "pending").length;
    const reviewedCount = digests.filter((item) => clean(item.status) === "reviewed").length;
    const requiredActionCount = digests.reduce((total, item = {}) => total + asArray(item.requiredActions || item.required_actions).length, 0);
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    const busy = holder.actionStatus === "submitting";
    const reason = status === "loading"
      ? "正在读取自动化 digest。"
      : status === "failed"
        ? clean(holder.error) || "automation_digests_failed"
        : pendingCount
          ? "Owner 可以复核 digest，但不会自动发布或通知。"
          : "暂无待复核 digest；可以从当前 dry-run 摘要生成一条待复核 digest。";
    return `<section class="learning-card-generation-proposals learning-card-generation-digests" data-automation-digest-panel data-automation-digest-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>自动化 Digest</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-digest-create ${busy ? "disabled" : ""}>${busy ? "生成中" : "生成 Digest"}</button>
          <button type="button" data-automation-digest-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新 Digest"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>待复核</small><strong>${escapeHtml(String(pendingCount))}</strong></span>
        <span><small>已复核</small><strong>${escapeHtml(String(reviewedCount))}</strong></span>
        <span><small>手动动作</small><strong>${escapeHtml(String(requiredActionCount))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationDigestRows(holder, escapeHtml)}
      </div>
      ${automationDigestActionStatusPanel(holder, escapeHtml)}
    </section>`;
  }

  function automationFailurePolicyStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "loading") return "读取中";
    if (value === "draft") return "草稿";
    if (value === "active") return "已激活";
    if (value === "archived") return "已归档";
    if (value === "superseded") return "已替代";
    if (value === "created") return "已创建";
    if (value === "reviewed") return "已复核";
    if (value === "failed") return "失败";
    if (value === "failure_policy_ready") return "策略已就绪";
    if (value === "missing_active_failure_policy") return "缺少激活策略";
    return value || "待策略";
  }

  function automationFailurePolicyActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.actionStatus);
    const error = clean(holder.actionError);
    const result = holder.actionResult || {};
    const policy = result.policy || {};
    if (!status || status === "idle") return "";
    const detail = status === "created"
      ? `失败策略已创建：${clean(policy.policyId || policy.policy_id) || "failure policy"}。`
      : status === "reviewed"
        ? `失败策略已记录为 ${automationFailurePolicyStatusText(policy.status)}。`
        : status === "submitting"
          ? "正在通过 Growth failure policy service 写入。"
          : error || "失败策略操作失败。";
    return `<div class="learning-card-generation-proposal-status" data-automation-failure-policy-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationFailurePolicyStatusText(status))}</em>
    </div>`;
  }

  function automationFailurePolicyRows(holder = {}, escapeHtml = defaultEscapeHtml) {
    const data = holder.data || {};
    const policies = asArray(data.policies).slice(0, 5);
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    const busy = holder.actionStatus === "submitting";
    if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取 failure policy。</div>`;
    if (status === "failed") return `<div class="learning-card-generation-proposal-empty">Failure policy 读取失败：${escapeHtml(clean(holder.error) || "automation_failure_policies_failed")}</div>`;
    if (!policies.length) return `<div class="learning-card-generation-proposal-empty">暂无 failure policy。创建并激活后，action handoff 才有失败可见性前置条件。</div>`;
    return policies.map((policy) => {
      const policyId = clean(policy.policyId || policy.policy_id);
      const policyStatus = clean(policy.status);
      const canReview = policyId && policyStatus === "draft";
      const failurePolicy = policy.failurePolicy || policy.failure_policy || {};
      const rollbackPolicy = policy.rollbackPolicy || policy.rollback_policy || {};
      const visibleFailure = failurePolicy.visibleFailureRequired !== false;
      const retryRequiresOwner = failurePolicy.retryRequiresOwner !== false;
      const transactional = rollbackPolicy.transactionalPublishRequired !== false;
      const meta = [
        visibleFailure ? "visible failure" : "hidden failure blocked",
        retryRequiresOwner ? "Owner retry" : "retry policy disabled",
        transactional ? "transactional publish" : "transaction not proven"
      ].join(" · ");
      return `<div class="learning-card-generation-proposal-row" data-automation-failure-policy-row data-automation-failure-policy-id="${escapeHtml(policyId)}">
        <span>
          <strong>${escapeHtml(policyId || "failure policy")}</strong>
          <small>${escapeHtml(meta)}</small>
          <small>激活策略只满足监督自动化前置条件，不开启调度。</small>
        </span>
        <em>${escapeHtml(automationFailurePolicyStatusText(policyStatus))}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-failure-policy-review data-automation-failure-policy-id="${escapeHtml(policyId)}" data-automation-failure-policy-status="active" ${busy || !canReview ? "disabled" : ""}>激活</button>
          <button type="button" data-automation-failure-policy-review data-automation-failure-policy-id="${escapeHtml(policyId)}" data-automation-failure-policy-status="archived" ${busy || !canReview ? "disabled" : ""}>归档</button>
          <button type="button" data-automation-failure-policy-review data-automation-failure-policy-id="${escapeHtml(policyId)}" data-automation-failure-policy-status="superseded" ${busy || !canReview ? "disabled" : ""}>替代</button>
        </div>
      </div>`;
    }).join("");
  }

  function automationFailurePolicyPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.automationFailurePolicies || {};
    const data = holder.data || {};
    const policies = asArray(data.policies);
    const readiness = data.readiness || {};
    const activeCount = policies.filter((item) => clean(item.status) === "active").length;
    const draftCount = policies.filter((item) => clean(item.status) === "draft").length;
    const ready = readiness.readyForWritefulAutomationPrerequisite === true;
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    const busy = holder.actionStatus === "submitting";
    const reason = status === "loading"
      ? "正在读取 failure policy。"
      : status === "failed"
        ? clean(holder.error) || "automation_failure_policies_failed"
        : ready
          ? "失败可见性和 Owner retry 策略已激活；调度仍保持关闭。"
          : "需要创建并激活 failure policy，才能进入 action handoff / scheduler 前置检查。";
    return `<section class="learning-card-generation-proposals learning-card-generation-failure-policies" data-automation-failure-policy-panel data-automation-failure-policy-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>失败策略</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-failure-policy-create ${busy ? "disabled" : ""}>${busy ? "创建中" : "创建策略"}</button>
          <button type="button" data-automation-failure-policy-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新策略"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>就绪</small><strong>${escapeHtml(ready ? "1" : "0")}</strong></span>
        <span><small>草稿</small><strong>${escapeHtml(String(draftCount))}</strong></span>
        <span><small>激活</small><strong>${escapeHtml(String(activeCount))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationFailurePolicyRows(holder, escapeHtml)}
      </div>
      ${automationFailurePolicyActionStatusPanel(holder, escapeHtml)}
    </section>`;
  }

  function automationActionHandoffStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "loading") return "读取中";
    if (value === "pending_delivery") return "待投递";
    if (value === "not_delivered") return "未投递";
    if (value === "delivered") return "已投递";
    if (value === "delivery_failed") return "投递失败";
    if (value === "delivery_pending") return "投递待定";
    if (value === "created") return "已创建";
    if (value === "failed") return "失败";
    return value || "待处理";
  }

  function automationActionHandoffActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.actionStatus);
    const error = clean(holder.actionError);
    const result = holder.actionResult || {};
    const handoff = result.handoff || {};
    if (!status || status === "idle") return "";
    const resultStatus = clean(result.deliveryStatus || handoff.deliveryStatus || handoff.delivery_status || handoff.status);
    const detail = status === "created"
      ? `Handoff 已创建：${clean(handoff.handoffId || handoff.handoff_id) || "action handoff"}。`
      : status === "delivered"
        ? `Handoff 投递状态：${automationActionHandoffStatusText(resultStatus)}。`
        : status === "submitting"
          ? "正在通过 Growth action handoff service 写入。"
          : error || "Handoff 操作失败。";
    return `<div class="learning-card-generation-proposal-status" data-automation-action-handoff-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationActionHandoffStatusText(status))}</em>
    </div>`;
  }

  function automationActionHandoffRows(holder = {}, escapeHtml = defaultEscapeHtml) {
    const data = holder.data || {};
    const handoffs = asArray(data.handoffs).slice(0, 5);
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    const busy = holder.actionStatus === "submitting";
    if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取 action handoff。</div>`;
    if (status === "failed") return `<div class="learning-card-generation-proposal-empty">Action handoff 读取失败：${escapeHtml(clean(holder.error) || "automation_action_handoffs_failed")}</div>`;
    if (!handoffs.length) return `<div class="learning-card-generation-proposal-empty">暂无 action handoff。复核 digest 后，可以创建平台提醒元数据。</div>`;
    return handoffs.map((handoff) => {
      const handoffId = clean(handoff.handoffId || handoff.handoff_id);
      const digestId = clean(handoff.digestId || handoff.digest_id);
      const deliveryStatus = clean(handoff.deliveryStatus || handoff.delivery_status || handoff.status);
      const actionSummary = handoff.actionSummary || handoff.action_summary || {};
      const actions = asArray(handoff.actions);
      const blocked = asArray(handoff.blocked);
      const actionCount = Number(actionSummary.requiredActions || actionSummary.required_actions || actions.length || 0) || 0;
      const blockedCount = Number(actionSummary.blocked || blocked.length || 0) || 0;
      const canDeliver = handoffId && deliveryStatus !== "delivered";
      return `<div class="learning-card-generation-proposal-row" data-automation-action-handoff-row data-automation-action-handoff-id="${escapeHtml(handoffId)}">
        <span>
          <strong>${escapeHtml(handoffId || "action handoff")}</strong>
          <small>${escapeHtml(`digest ${digestId || "unknown"} · actions ${actionCount} · blocked ${blockedCount}`)}</small>
          <small>投递只创建平台 action metadata，不发布卡片、不调度。</small>
        </span>
        <em>${escapeHtml(automationActionHandoffStatusText(deliveryStatus))}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-action-handoff-deliver data-automation-action-handoff-id="${escapeHtml(handoffId)}" ${busy || !canDeliver ? "disabled" : ""}>投递</button>
        </div>
      </div>`;
    }).join("");
  }

  function automationActionHandoffDigestRows(digestsHolder = {}, handoffsHolder = {}, escapeHtml = defaultEscapeHtml) {
    const digests = asArray(digestsHolder.data?.digests).filter((digest) => clean(digest.status) === "reviewed").slice(0, 4);
    const handoffs = asArray(handoffsHolder.data?.handoffs);
    const existingDigestIds = new Set(handoffs.map((handoff) => clean(handoff.digestId || handoff.digest_id)).filter(Boolean));
    const busy = handoffsHolder.actionStatus === "submitting";
    if (!digests.length) return `<div class="learning-card-generation-proposal-empty">没有可创建 handoff 的已复核 digest。</div>`;
    return digests.map((digest) => {
      const digestId = clean(digest.digestId || digest.digest_id);
      const summary = digest.summary || {};
      const alreadyCreated = existingDigestIds.has(digestId);
      const actionCount = Number(summary.requiredActions || summary.required_actions || asArray(digest.requiredActions || digest.required_actions).length || 0) || 0;
      return `<div class="learning-card-generation-proposal-row" data-automation-action-handoff-digest-row data-automation-digest-id="${escapeHtml(digestId)}">
        <span>
          <strong>${escapeHtml(digestId || "reviewed digest")}</strong>
          <small>${escapeHtml(`已复核 digest · required actions ${actionCount}`)}</small>
        </span>
        <em>${escapeHtml(alreadyCreated ? "已建 handoff" : "可创建")}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-action-handoff-create data-automation-digest-id="${escapeHtml(digestId)}" ${busy || alreadyCreated || !digestId ? "disabled" : ""}>创建 Handoff</button>
        </div>
      </div>`;
    }).join("");
  }

  function automationActionHandoffPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.automationActionHandoffs || {};
    const data = holder.data || {};
    const handoffs = asArray(data.handoffs);
    const pendingDelivery = handoffs.filter((item) => clean(item.deliveryStatus || item.delivery_status || item.status) !== "delivered").length;
    const delivered = handoffs.filter((item) => clean(item.deliveryStatus || item.delivery_status || item.status) === "delivered").length;
    const failed = handoffs.filter((item) => clean(item.deliveryStatus || item.delivery_status) === "delivery_failed").length;
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    const reason = status === "loading"
      ? "正在读取 action handoff。"
      : status === "failed"
        ? clean(holder.error) || "automation_action_handoffs_failed"
        : pendingDelivery
          ? "Owner 可以投递平台 action metadata；仍不会发布或调度。"
          : "从已复核 digest 创建 handoff，作为平台提醒前的 Growth 记录。";
    return `<section class="learning-card-generation-proposals learning-card-generation-action-handoffs" data-automation-action-handoff-panel data-automation-action-handoff-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>行动 Handoff</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-action-handoff-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新 Handoff"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>待投递</small><strong>${escapeHtml(String(pendingDelivery))}</strong></span>
        <span><small>已投递</small><strong>${escapeHtml(String(delivered))}</strong></span>
        <span><small>失败</small><strong>${escapeHtml(String(failed))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationActionHandoffDigestRows(state.automationDigests || {}, holder, escapeHtml)}
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationActionHandoffRows(holder, escapeHtml)}
      </div>
      ${automationActionHandoffActionStatusPanel(holder, escapeHtml)}
    </section>`;
  }

  function automationSchedulerExecutionStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "loading") return "读取中";
    if (value === "submitting") return "执行中";
    if (value === "started") return "已开始";
    if (value === "published") return "已发布";
    if (value === "blocked") return "已拦截";
    if (value === "failed") return "失败";
    if (value === "skipped") return "已跳过";
    if (value === "executed") return "已记录";
    return value || "待处理";
  }

  function automationSchedulerExecutionActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.actionStatus);
    const error = clean(holder.actionError);
    const result = holder.actionResult || {};
    const execution = result.execution || {};
    if (!status || status === "idle") return "";
    const resultStatus = clean(execution.status || result.status || status);
    const detail = status === "submitting"
      ? "正在通过 Growth scheduler execution service 记录 Owner 显式执行。"
      : resultStatus === "published"
        ? `Scheduler execution 已发布：${clean(execution.executionId || execution.execution_id) || "execution"}。`
        : resultStatus === "blocked"
          ? `Scheduler execution 被门禁拦截：${clean(execution.reason || result.error || error) || "blocked"}。`
          : status === "executed"
            ? `Scheduler execution 已记录：${clean(execution.executionId || execution.execution_id) || "execution"}。`
            : error || clean(result.error) || "Scheduler execution 操作失败。";
    return `<div class="learning-card-generation-proposal-status" data-automation-scheduler-execution-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationSchedulerExecutionStatusText(resultStatus))}</em>
    </div>`;
  }

  function automationSchedulerExecutionRows(holder = {}, escapeHtml = defaultEscapeHtml) {
    const data = holder.data || {};
    const executions = asArray(data.executions).slice(0, 5);
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取 scheduler execution。</div>`;
    if (status === "failed") return `<div class="learning-card-generation-proposal-empty">Scheduler execution 读取失败：${escapeHtml(clean(holder.error) || "automation_scheduler_executions_failed")}</div>`;
    if (!executions.length) return `<div class="learning-card-generation-proposal-empty">暂无 scheduler execution。已投递 handoff 后，可以显式尝试执行一次。</div>`;
    return executions.map((execution) => {
      const executionId = clean(execution.executionId || execution.execution_id);
      const statusText = automationSchedulerExecutionStatusText(execution.status);
      const handoffId = clean(execution.handoffId || execution.handoff_id);
      const proposalId = clean(execution.proposalId || execution.proposal_id);
      const generatedTaskCardId = clean(execution.execution?.generatedTaskCardId || execution.execution?.generated_task_card_id);
      const reason = clean(execution.reason || execution.error || execution.execution?.reason);
      return `<div class="learning-card-generation-proposal-row" data-automation-scheduler-execution-row data-automation-scheduler-execution-id="${escapeHtml(executionId)}">
        <span>
          <strong>${escapeHtml(executionId || "scheduler execution")}</strong>
          <small>${escapeHtml(`handoff ${handoffId || "unknown"} · proposal ${proposalId || "unknown"}`)}</small>
          <small>${escapeHtml(generatedTaskCardId ? `generated card ${generatedTaskCardId}` : (reason || "默认禁用时会记录 blocked，不会发布。"))}</small>
        </span>
        <em>${escapeHtml(statusText)}</em>
      </div>`;
    }).join("");
  }

  function automationSchedulerExecutionHandoffRows(handoffsHolder = {}, executionsHolder = {}, escapeHtml = defaultEscapeHtml) {
    const handoffs = asArray(handoffsHolder.data?.handoffs)
      .filter((handoff) => {
        const deliveryStatus = clean(handoff.deliveryStatus || handoff.delivery_status || handoff.status);
        return deliveryStatus === "delivered";
      })
      .slice(0, 4);
    const busy = executionsHolder.actionStatus === "submitting";
    if (!handoffs.length) return `<div class="learning-card-generation-proposal-empty">没有可执行的已投递 handoff。</div>`;
    return handoffs.map((handoff) => {
      const handoffId = clean(handoff.handoffId || handoff.handoff_id);
      const digestId = clean(handoff.digestId || handoff.digest_id);
      const action = automationSchedulerExecutionActionFromHandoff(handoff);
      const proposalId = clean(action.proposalId || action.proposal_id || handoff.proposalId || handoff.proposal_id);
      const selectedItemId = clean(action.selectedItemId || action.selected_item_id || action.itemId || action.item_id);
      return `<div class="learning-card-generation-proposal-row" data-automation-scheduler-execution-handoff-row data-automation-action-handoff-id="${escapeHtml(handoffId)}">
        <span>
          <strong>${escapeHtml(handoffId || "delivered handoff")}</strong>
          <small>${escapeHtml(`digest ${digestId || "unknown"} · proposal ${proposalId || "missing"}`)}</small>
          <small>执行会重新检查 release / activation / runtime gates；默认禁用时只写 blocked 记录。</small>
        </span>
        <em>${escapeHtml(proposalId ? "可尝试" : "缺 proposal")}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-scheduler-execution-execute data-automation-action-handoff-id="${escapeHtml(handoffId)}" data-automation-proposal-id="${escapeHtml(proposalId)}" data-automation-selected-item-id="${escapeHtml(selectedItemId)}" ${busy || !handoffId || !proposalId ? "disabled" : ""}>执行一次</button>
        </div>
      </div>`;
    }).join("");
  }

  function automationSchedulerExecutionPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.automationSchedulerExecutions || {};
    const data = holder.data || {};
    const executions = asArray(data.executions);
    const published = executions.filter((item) => clean(item.status) === "published").length;
    const blocked = executions.filter((item) => clean(item.status) === "blocked").length;
    const failed = executions.filter((item) => clean(item.status) === "failed").length;
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    const reason = status === "loading"
      ? "正在读取 scheduler execution。"
      : status === "failed"
        ? clean(holder.error) || "automation_scheduler_executions_failed"
        : "Owner 显式执行只通过 scheduler execution service；默认配置会被门禁拦截。";
    return `<section class="learning-card-generation-proposals learning-card-generation-scheduler-executions" data-automation-scheduler-execution-panel data-automation-scheduler-execution-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>Scheduler 执行</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-scheduler-execution-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新执行"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>已发布</small><strong>${escapeHtml(String(published))}</strong></span>
        <span><small>已拦截</small><strong>${escapeHtml(String(blocked))}</strong></span>
        <span><small>失败</small><strong>${escapeHtml(String(failed))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationSchedulerExecutionHandoffRows(state.automationActionHandoffs || {}, holder, escapeHtml)}
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationSchedulerExecutionRows(holder, escapeHtml)}
      </div>
      ${automationSchedulerExecutionActionStatusPanel(holder, escapeHtml)}
    </section>`;
  }

  function automationSchedulerRunStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "loading") return "读取中";
    if (value === "submitting") return "运行中";
    if (value === "started") return "已开始";
    if (value === "completed") return "已完成";
    if (value === "partial") return "部分完成";
    if (value === "blocked") return "已拦截";
    if (value === "failed") return "失败";
    if (value === "skipped") return "已跳过";
    if (value === "ran") return "已记录";
    return value || "待处理";
  }

  function automationSchedulerRunActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.actionStatus);
    const error = clean(holder.actionError);
    const result = holder.actionResult || {};
    const run = result.run || {};
    if (!status || status === "idle") return "";
    const resultStatus = clean(run.status || result.status || status);
    const detail = status === "submitting"
      ? "正在通过 Growth scheduler run service 记录一次监督 tick。"
      : resultStatus === "completed"
        ? `Scheduler run 已完成：${clean(run.runId || run.run_id) || "run"}。`
        : resultStatus === "blocked"
          ? `Scheduler run 被门禁拦截：${clean(run.reason || result.error || error) || "blocked"}。`
          : status === "ran"
            ? `Scheduler run 已记录：${clean(run.runId || run.run_id) || "run"}。`
            : error || clean(result.error) || "Scheduler run 操作失败。";
    return `<div class="learning-card-generation-proposal-status" data-automation-scheduler-run-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationSchedulerRunStatusText(resultStatus))}</em>
    </div>`;
  }

  function automationSchedulerRunRows(holder = {}, escapeHtml = defaultEscapeHtml) {
    const data = holder.data || {};
    const runs = asArray(data.runs).slice(0, 5);
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取 scheduler run。</div>`;
    if (status === "failed") return `<div class="learning-card-generation-proposal-empty">Scheduler run 读取失败：${escapeHtml(clean(holder.error) || "automation_scheduler_runs_failed")}</div>`;
    if (!runs.length) return `<div class="learning-card-generation-proposal-empty">暂无 scheduler run。可以显式运行一次默认禁用的监督 tick。</div>`;
    return runs.map((run) => {
      const runId = clean(run.runId || run.run_id);
      const statusText = automationSchedulerRunStatusText(run.status);
      const summary = run.summary || {};
      const attempted = Number(summary.attemptedExecutions || summary.attempted_executions || asArray(run.executions).length || 0) || 0;
      const inspectedHandoffs = Number(summary.inspectedHandoffs || summary.inspected_handoffs || asArray(run.candidates).length || 0) || 0;
      const reason = clean(run.reason || run.error);
      return `<div class="learning-card-generation-proposal-row" data-automation-scheduler-run-row data-automation-scheduler-run-id="${escapeHtml(runId)}">
        <span>
          <strong>${escapeHtml(runId || "scheduler run")}</strong>
          <small>${escapeHtml(`handoffs ${inspectedHandoffs} · executions ${attempted}`)}</small>
          <small>${escapeHtml(reason || "默认禁用时会记录 blocked run，不会启动后台调度。")}</small>
        </span>
        <em>${escapeHtml(statusText)}</em>
      </div>`;
    }).join("");
  }

  function automationSchedulerRunPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.automationSchedulerRuns || {};
    const data = holder.data || {};
    const runs = asArray(data.runs);
    const completed = runs.filter((item) => clean(item.status) === "completed").length;
    const blocked = runs.filter((item) => clean(item.status) === "blocked").length;
    const failed = runs.filter((item) => clean(item.status) === "failed").length;
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    const busy = holder.actionStatus === "submitting";
    const reason = status === "loading"
      ? "正在读取 scheduler run。"
      : status === "failed"
        ? clean(holder.error) || "automation_scheduler_runs_failed"
        : "Scheduler run 是默认禁用的监督 tick；Owner 点击只会走服务门禁和审计记录。";
    return `<section class="learning-card-generation-proposals learning-card-generation-scheduler-runs" data-automation-scheduler-run-panel data-automation-scheduler-run-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>Scheduler Run</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-scheduler-run-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新 Run"}</button>
          <button type="button" data-automation-scheduler-run-once ${busy ? "disabled" : ""}>${busy ? "运行中" : "运行一次"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>已完成</small><strong>${escapeHtml(String(completed))}</strong></span>
        <span><small>已拦截</small><strong>${escapeHtml(String(blocked))}</strong></span>
        <span><small>失败</small><strong>${escapeHtml(String(failed))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationSchedulerRunRows(holder, escapeHtml)}
      </div>
      ${automationSchedulerRunActionStatusPanel(holder, escapeHtml)}
    </section>`;
  }

  function automationSchedulerWorkerTargetStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "proposed") return "待复核";
    if (value === "enabled") return "已复核";
    if (value === "disabled") return "已停用";
    if (value === "archived") return "已归档";
    if (value === "submitting") return "保存中";
    if (value === "created") return "已创建";
    if (value === "reviewed") return "已复核";
    if (value === "failed") return "失败";
    return value || "记录";
  }

  function automationSchedulerWorkerTargetActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.actionStatus);
    const error = clean(holder.actionError);
    const result = holder.actionResult || {};
    const target = result.target || {};
    const targetId = clean(target.targetId || result.targetId);
    if (!status || status === "idle") return "";
    const detail = status === "created"
      ? `Worker target 已创建${targetId ? `：${targetId}` : "，等待 Owner 复核。"}`
      : status === "reviewed"
        ? `Worker target 已记录为 ${automationSchedulerWorkerTargetStatusText(target.status)}${targetId ? `：${targetId}` : "。"}`
        : status === "submitting"
          ? "正在通过 Growth worker target service 写入。"
          : error || "Worker target 操作失败。";
    return `<div class="learning-card-generation-proposal-status" data-automation-scheduler-worker-target-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(automationSchedulerWorkerTargetStatusText(status))}</em>
    </div>`;
  }

  function automationSchedulerWorkerTargetRows(holder = {}, escapeHtml = defaultEscapeHtml) {
    const data = holder.data || {};
    const targets = asArray(data.targets).slice(0, 5);
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    if (status === "loading") return `<div class="learning-card-generation-proposal-empty">正在读取 worker target。</div>`;
    if (status === "failed") return `<div class="learning-card-generation-proposal-empty">Worker target 读取失败：${escapeHtml(clean(holder.error) || "automation_scheduler_worker_targets_failed")}</div>`;
    if (!targets.length) return `<div class="learning-card-generation-proposal-empty">暂无 worker target。可以先创建一个 proposed target，等待 Owner 复核。</div>`;
    return targets.map((target) => {
      const targetId = clean(target.targetId || target.target_id || target.workerTargetId || target.worker_target_id);
      const targetStatus = clean(target.status);
      const policy = target.policy || {};
      const readiness = target.readiness || {};
      const summary = target.target || {};
      const label = clean(summary.subject || target.subject || summary.domain || target.domain || "worker target");
      const nodes = asArray(summary.targetNodeIds || target.targetNodeIds).map(clean).filter(Boolean).slice(0, 3);
      const canEnable = targetStatus === "proposed" || targetStatus === "disabled";
      const canDisable = targetStatus === "proposed" || targetStatus === "enabled";
      const canArchive = targetStatus !== "archived";
      const busy = holder.actionStatus === "submitting";
      return `<div class="learning-card-generation-proposal-row" data-automation-scheduler-worker-target-row data-automation-scheduler-worker-target-id="${escapeHtml(targetId)}">
        <span>
          <strong>${escapeHtml(targetId || label)}</strong>
          <small>${escapeHtml(`${label} · ${clean(target.horizon || summary.horizon || "daily_plan")}`)}</small>
          <small>${escapeHtml(nodes.length ? `nodes ${nodes.join(" · ")}` : "reviewed target config only")}</small>
          <small>${escapeHtml(`productionSchedulingAllowed=${policy.productionSchedulingAllowed === true || readiness.productionSchedulingAllowed === true ? "true" : "false"}`)}</small>
        </span>
        <em>${escapeHtml(automationSchedulerWorkerTargetStatusText(targetStatus))}</em>
        ${canEnable || canDisable || canArchive ? `<div class="learning-card-generation-proposal-actions">
          ${canEnable ? `<button type="button" data-automation-scheduler-worker-target-review data-automation-scheduler-worker-target-id="${escapeHtml(targetId)}" data-automation-scheduler-worker-target-status="enabled" ${busy ? "disabled" : ""}>启用记录</button>` : ""}
          ${canDisable ? `<button type="button" data-automation-scheduler-worker-target-review data-automation-scheduler-worker-target-id="${escapeHtml(targetId)}" data-automation-scheduler-worker-target-status="disabled" ${busy ? "disabled" : ""}>停用</button>` : ""}
          ${canArchive ? `<button type="button" data-automation-scheduler-worker-target-review data-automation-scheduler-worker-target-id="${escapeHtml(targetId)}" data-automation-scheduler-worker-target-status="archived" ${busy ? "disabled" : ""}>归档</button>` : ""}
        </div>` : ""}
      </div>`;
    }).join("");
  }

  function automationSchedulerWorkerTargetPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.automationSchedulerWorkerTargets || {};
    const data = holder.data || {};
    const targets = asArray(data.targets);
    const proposed = targets.filter((item) => clean(item.status) === "proposed").length;
    const enabled = targets.filter((item) => clean(item.status) === "enabled").length;
    const disabled = targets.filter((item) => clean(item.status) === "disabled").length;
    const archived = targets.filter((item) => clean(item.status) === "archived").length;
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    const busy = holder.actionStatus === "submitting";
    const reason = status === "loading"
      ? "正在读取 worker target。"
      : status === "failed"
        ? clean(holder.error) || "automation_scheduler_worker_targets_failed"
        : "Worker target 是未来后台 worker 的 Owner 复核配置；创建和复核都不会启动 worker。";
    return `<section class="learning-card-generation-proposals learning-card-generation-worker-targets" data-automation-scheduler-worker-target-panel data-automation-scheduler-worker-target-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>Worker Target</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-scheduler-worker-target-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新 Target"}</button>
          <button type="button" data-automation-scheduler-worker-target-create ${busy ? "disabled" : ""}>${busy ? "创建中" : "创建 Target"}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>待复核</small><strong>${escapeHtml(String(proposed))}</strong></span>
        <span><small>已复核</small><strong>${escapeHtml(String(enabled))}</strong></span>
        <span><small>停用/归档</small><strong>${escapeHtml(String(disabled + archived))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${automationSchedulerWorkerTargetRows(holder, escapeHtml)}
      </div>
      ${automationSchedulerWorkerTargetActionStatusPanel(holder, escapeHtml)}
    </section>`;
  }

  function ownerAuditItems(ownerAudit = {}, key = "") {
    const bucket = ownerAudit[key] || {};
    return asArray(bucket.items || bucket.profileDeltas || bucket.corrections || bucket.planDrafts);
  }

  function ownerCorrectionStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "submitting") return "保存中";
    if (value === "submitted") return "已保存";
    if (value === "failed") return "失败";
    return "可记录";
  }

  function ownerReviewActionText(action = "") {
    const value = clean(action).toLowerCase();
    if (value === "mark_needs_repair") return "标记需修补";
    if (value === "mark_misconception") return "标记误解";
    if (value === "mark_stable") return "确认稳定";
    if (value === "mark_mastered") return "确认掌握";
    return "确认观察";
  }

  function ownerCorrectionTargetNodeIds(context = {}) {
    const ownerAudit = context.ownerAudit || {};
    const firstDelta = ownerAuditItems(ownerAudit, "profileDeltaAudit")[0] || {};
    const recommendation = context.nextCardRecommendation || {};
    const plan = context.suggestedPlan || {};
    const values = asArray(firstDelta.targetNodeIds).length
      ? firstDelta.targetNodeIds
      : asArray(recommendation.targetNodeIds).length
        ? recommendation.targetNodeIds
        : asArray(plan.targetNodeIds).length
          ? plan.targetNodeIds
          : [recommendation.targetNodeId || plan.targetNodeId].filter(Boolean);
    return values.map(clean).filter(Boolean).slice(0, 8);
  }

  function ownerAuditMetricRows(ownerAudit = {}, escapeHtml = defaultEscapeHtml) {
    const summary = ownerAudit.summary || {};
    const rows = [
      ["计划", summary.planDraftCount, summary.lastPlanAt],
      ["已发布", summary.publishedPlanCount, summary.lastPublishedAt],
      ["画像变化", summary.profileDeltaCount, summary.lastProfileDeltaAt],
      ["纠偏", summary.correctionCount, summary.lastCorrectionAt]
    ];
    return rows.map(([label, value, meta]) => `<span>
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(String(Number(value || 0) || 0))}</strong>
      <em>${escapeHtml(clean(meta) || "无记录")}</em>
    </span>`).join("");
  }

  function ownerPlanAuditRows(ownerAudit = {}, escapeHtml = defaultEscapeHtml) {
    const rows = ownerAuditItems(ownerAudit, "planAudit").slice(0, 2);
    if (!rows.length) return `<div class="learning-card-generation-owner-empty">暂无计划发布审计。</div>`;
    return rows.map((item) => {
      const selected = item.selectedItem || {};
      const label = clean(item.planDraftId || item.generatedTaskCardId || "计划");
      const detail = clean(selected.reason || item.planSummary || item.status || "summary-only");
      const meta = clean(item.generatedTaskCardId || selected.itemId || item.status || "记录");
      return `<div class="learning-card-generation-owner-row">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(meta)}</em>
      </div>`;
    }).join("");
  }

  function ownerProfileDeltaRows(ownerAudit = {}, escapeHtml = defaultEscapeHtml) {
    const rows = ownerAuditItems(ownerAudit, "profileDeltaAudit").slice(0, 3);
    if (!rows.length) return `<div class="learning-card-generation-owner-empty">暂无画像变化审计。</div>`;
    return rows.map((item) => {
      const firstCapability = asArray(item.changedCapabilities)[0] || {};
      const label = clean(item.profileDeltaId || item.evaluationId || "画像变化");
      const capability = clean(firstCapability.nodeId || firstCapability.targetNodeId || asArray(item.targetNodeIds)[0] || "");
      const after = clean(firstCapability.afterStatus || firstCapability.afterState || firstCapability.status || "");
      const detail = clean(item.summary?.reason || capability || "summary-only");
      return `<div class="learning-card-generation-owner-row">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(after || String(Number(item.changedCapabilityCount || 0) || 0))}</em>
      </div>`;
    }).join("");
  }

  function ownerCorrectionRows(ownerAudit = {}, escapeHtml = defaultEscapeHtml) {
    const rows = ownerAuditItems(ownerAudit, "profileCorrections").slice(0, 3);
    if (!rows.length) return `<div class="learning-card-generation-owner-empty">暂无 Owner 纠偏记录。</div>`;
    return rows.map((item) => {
      const label = clean(item.correctionId || item.profileDeltaId || "纠偏");
      const detail = clean(item.reason || item.note || asArray(item.targetNodeIds).join(" · ") || "summary-only");
      return `<div class="learning-card-generation-owner-row">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(clean(item.status) || ownerReviewActionText(item.reviewAction))}</em>
      </div>`;
    }).join("");
  }

  function ownerCorrectionStatusPanel(correction = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(correction.status);
    const result = correction.result || {};
    const correctionId = clean(result.correction?.correctionId || result.correctionId);
    const error = clean(correction.error);
    if (!status || status === "idle") return "";
    const detail = status === "submitted"
      ? `纠偏已写入证据账本${correctionId ? `：${correctionId}` : "。"}`
      : status === "submitting"
        ? "正在通过 Growth Owner correction service 写入。"
        : error || "纠偏写入失败。";
    return `<div class="learning-card-generation-correction-status" data-owner-correction-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(ownerCorrectionStatusText(status))}</em>
    </div>`;
  }

  function ownerAuditPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const ownerAudit = context.ownerAudit || {};
    const correction = state.ownerCorrection || {};
    const draft = clean(state.ownerCorrectionDraft);
    const action = clean(state.ownerCorrectionAction || "confirm_profile_delta");
    const targetNodeIds = ownerCorrectionTargetNodeIds(context);
    const disabled = correction.status === "submitting" || !targetNodeIds.length;
    return `<section class="learning-card-generation-owner-audit" data-card-generation-owner-audit data-owner-audit-available="${ownerAudit.available !== false}">
      <div class="learning-card-generation-owner-head">
        <span>
          <strong>审计与纠偏</strong>
          <small>计划、画像变化、纠偏记录和下一步证据摘要</small>
        </span>
        <em>${escapeHtml(ownerAudit.ok ? "已连接" : "待证据")}</em>
      </div>
      <div class="learning-card-generation-owner-grid">
        ${ownerAuditMetricRows(ownerAudit, escapeHtml)}
      </div>
      <div class="learning-card-generation-owner-columns">
        <div>
          <b>计划审计</b>
          ${ownerPlanAuditRows(ownerAudit, escapeHtml)}
        </div>
        <div>
          <b>画像变化</b>
          ${ownerProfileDeltaRows(ownerAudit, escapeHtml)}
        </div>
      </div>
      <div class="learning-card-generation-owner-corrections">
        <b>纠偏历史</b>
        ${ownerCorrectionRows(ownerAudit, escapeHtml)}
      </div>
      <form class="learning-card-generation-correction-form" data-card-generation-correction-form>
        <label>
          <span>Owner 纠偏</span>
          <select data-card-generation-correction-action>
            ${["confirm_profile_delta", "mark_needs_repair", "mark_misconception", "mark_stable", "mark_mastered"].map((item) => `<option value="${escapeHtml(item)}"${item === action ? " selected" : ""}>${escapeHtml(ownerReviewActionText(item))}</option>`).join("")}
          </select>
        </label>
        <textarea data-card-generation-correction-note rows="3" maxlength="260" placeholder="只写 summary-only 纠偏说明，不填写原始答案、transcript 或 prompt。">${escapeHtml(draft)}</textarea>
        <div class="learning-card-generation-correction-controls">
          <span>${escapeHtml(targetNodeIds.length ? `节点：${targetNodeIds.join(" · ")}` : "等待可纠偏的图谱节点")}</span>
          <button type="submit" class="primary" ${disabled ? "disabled" : ""}>${correction.status === "submitting" ? "保存中" : "保存纠偏"}</button>
        </div>
        ${ownerCorrectionStatusPanel(correction, escapeHtml)}
      </form>
    </section>`;
  }

  function firstCleanValue(...values) {
    for (const value of values) {
      const cleaned = clean(value);
      if (cleaned) return cleaned;
    }
    return "";
  }

  function firstCleanArray(...values) {
    for (const value of values) {
      const cleaned = asArray(value).map(clean).filter(Boolean);
      if (cleaned.length) return Array.from(new Set(cleaned)).slice(0, 12);
    }
    return [];
  }

  function cycleHistoryItemKey(cycle = {}, index = 0) {
    const selectors = cycle.selectors || {};
    return [
      selectors.taskCardId || cycle.taskCardId,
      selectors.evaluationId || cycle.evaluationId,
      selectors.profileDeltaId || cycle.profileDeltaId,
      selectors.planDraftId || cycle.planDraftId,
      selectors.correctionId || cycle.correctionId,
      index
    ].map(clean).filter(Boolean).join(":") || `cycle:${index}`;
  }

  function cycleSelectionPayload(cycle = {}) {
    const selectors = cycle.selectors || {};
    const targetNodeIds = firstCleanArray(
      selectors.targetNodeIds,
      cycle.targetNodeIds,
      cycle.nodeIds
    );
    return {
      plan_draft_id: firstCleanValue(selectors.planDraftId, cycle.planDraftId),
      task_card_id: firstCleanValue(selectors.taskCardId, cycle.taskCardId),
      evaluation_id: firstCleanValue(selectors.evaluationId, cycle.evaluationId),
      profile_delta_id: firstCleanValue(selectors.profileDeltaId, cycle.profileDeltaId),
      evidence_id: firstCleanValue(selectors.evidenceId, cycle.evidenceId),
      correction_id: firstCleanValue(selectors.correctionId, cycle.correctionId),
      source_id: firstCleanValue(selectors.sourceId, cycle.sourceId, selectors.evaluationId, cycle.evaluationId),
      target_node_ids: targetNodeIds
    };
  }

  function createCycleAuditQueryPayload({ context = {}, workspaceId = "", draftResult = {}, publishResult = {}, generatedResult = {}, selectedCycle = {} } = {}) {
    const ownerAudit = context.ownerAudit || {};
    const latestPlan = ownerAuditItems(ownerAudit, "planAudit")[0] || {};
    const firstDelta = ownerAuditItems(ownerAudit, "profileDeltaAudit")[0] || {};
    const firstCorrection = ownerAuditItems(ownerAudit, "profileCorrections")[0] || {};
    const plan = context.suggestedPlan || {};
    const recommendation = context.nextCardRecommendation || {};
    const defaults = context.generationDefaults || {};
    const planDraft = publishResult.planDraft || draftResult.planDraft || {};
    const generation = publishResult.generation || generatedResult || {};
    const published = generation.published || {};
    const selectedItem = selectedPlanItem(planDraft);
    const selectedCyclePayload = cycleSelectionPayload(selectedCycle || {});
    const targetNodeIds = firstCleanArray(
      selectedCyclePayload.target_node_ids,
      firstDelta.targetNodeIds,
      firstCorrection.targetNodeIds,
      selectedItem.targetNodeIds,
      planDraft.targetNodeIds,
      recommendation.targetNodeIds,
      plan.targetNodeIds,
      [recommendation.targetNodeId || plan.targetNodeId]
    );
    const payload = {
      workspace_id: firstCleanValue(workspaceId, context.target?.workspaceId),
      learner_id: firstCleanValue(context.target?.learnerId, workspaceId),
      program_id: firstCleanValue(context.programId, firstDelta.programId, latestPlan.programId, plan.programId, defaults.programId),
      plan_draft_id: firstCleanValue(selectedCyclePayload.plan_draft_id, planDraft.planDraftId, latestPlan.planDraftId),
      task_card_id: firstCleanValue(selectedCyclePayload.task_card_id, published.taskCardId, generation.taskCardId, generatedResult.taskCardId, planDraft.generatedTaskCardId, latestPlan.generatedTaskCardId, firstDelta.taskCardId, firstCorrection.taskCardId),
      evaluation_id: firstCleanValue(selectedCyclePayload.evaluation_id, firstDelta.evaluationId, firstCorrection.evaluationId),
      profile_delta_id: firstCleanValue(selectedCyclePayload.profile_delta_id, firstDelta.profileDeltaId, firstCorrection.profileDeltaId),
      evidence_id: firstCleanValue(selectedCyclePayload.evidence_id, firstCleanArray(firstDelta.evidenceIds, firstCorrection.evidenceIds)[0]),
      correction_id: firstCleanValue(selectedCyclePayload.correction_id, firstCorrection.correctionId),
      source_id: firstCleanValue(selectedCyclePayload.source_id, firstDelta.evaluationId, firstCorrection.evaluationId),
      target_node_ids: targetNodeIds,
      limit: 20
    };
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return clean(value);
    }));
  }

  function createCycleHistoryQueryPayload({ context = {}, workspaceId = "", selectedCycle = {} } = {}) {
    const plan = context.suggestedPlan || {};
    const defaults = context.generationDefaults || {};
    const provisioning = context.targetProvisioning || {};
    const graphOptions = graphOptionsForContext(context);
    const selected = cycleSelectionPayload(selectedCycle || {});
    const targetNodeIds = firstCleanArray(
      selected.target_node_ids,
      context.nextCardRecommendation?.targetNodeIds,
      plan.targetNodeIds,
      [context.nextCardRecommendation?.targetNodeId || plan.targetNodeId]
    );
    const payload = {
      workspace_id: firstCleanValue(workspaceId, context.target?.workspaceId),
      learner_id: firstCleanValue(context.target?.learnerId, workspaceId),
      program_id: firstCleanValue(context.programId, plan.programId, defaults.programId),
      domain_pack_id: firstCleanValue(provisioning.selectedDomainPackId, graphOptions.selectedDomainPackId, context.domainPackId, plan.domainPackId, defaults.domainPackId),
      domain: firstCleanValue(provisioning.selectedDomain, graphOptions.selectedDomain, plan.domain, context.domain, defaults.domain),
      subject: firstCleanValue(provisioning.selectedSubject, graphOptions.selectedSubject, plan.subject, context.subject, defaults.subject, plan.domain, context.domain),
      plan_draft_id: selected.plan_draft_id,
      task_card_id: selected.task_card_id,
      evaluation_id: selected.evaluation_id,
      profile_delta_id: selected.profile_delta_id,
      evidence_id: selected.evidence_id,
      correction_id: selected.correction_id,
      source_id: selected.source_id,
      target_node_ids: targetNodeIds,
      include_completeness: "false",
      limit: 8
    };
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return clean(value);
    }));
  }

  function cycleAuditHasAnchor(payload = {}) {
    return [
      payload.plan_draft_id,
      payload.task_card_id,
      payload.evaluation_id,
      payload.profile_delta_id,
      payload.evidence_id,
      payload.correction_id,
      payload.source_id
    ].some((value) => clean(value));
  }

  function cycleDrilldownStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "loading") return "读取中";
    if (value === "ready") return "已读取";
    if (value === "failed") return "失败";
    return "待读取";
  }

  function cycleTimelineTypeText(type = "") {
    const value = clean(type).toLowerCase();
    if (value === "plan") return "计划";
    if (value === "plan_publish_attempt") return "发布尝试";
    if (value === "evidence") return "评价证据";
    if (value === "profile_delta") return "画像变化";
    if (value === "correction") return "Owner 纠偏";
    return value || "记录";
  }

  function cycleFindingText(code = "") {
    const value = clean(code);
    const map = {
      plan_publication: "计划发布",
      publish_attempt_visibility: "发布尝试可见",
      evaluation_evidence: "评价证据",
      profile_delta_audit: "画像变化审计",
      partial_failures: "下游审计服务",
      privacy_projection: "隐私投影",
      owner_correction_optional: "Owner 纠偏",
      next_recommendation_optional: "下一张建议"
    };
    return map[value] || value || "检查项";
  }

  function cycleDrilldownTimelineRows(timeline = [], escapeHtml = defaultEscapeHtml) {
    const rows = asArray(timeline).slice(0, 6);
    if (!rows.length) return `<div class="learning-card-generation-cycle-empty">暂无单卡 timeline。完成提交和批改后再刷新。</div>`;
    return rows.map((entry) => {
      const label = cycleTimelineTypeText(entry.type);
      const id = clean(entry.id || entry.planDraftId || entry.taskCardId || entry.evaluationId || entry.profileDeltaId || entry.correctionId);
      const detail = clean(entry.summary || entry.error || entry.status || entry.at || "summary-only");
      const meta = clean(entry.status || entry.at || "记录");
      return `<div class="learning-card-generation-cycle-row" data-cycle-timeline-type="${escapeHtml(clean(entry.type))}">
        <span>
          <strong>${escapeHtml(label)}${id ? ` · ${escapeHtml(id)}` : ""}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(meta)}</em>
      </div>`;
    }).join("");
  }

  function cycleDrilldownFindingRows(findings = [], escapeHtml = defaultEscapeHtml) {
    const rows = asArray(findings).slice(0, 8);
    if (!rows.length) return `<div class="learning-card-generation-cycle-empty">暂无完整性检查结果。</div>`;
    return rows.map((item) => {
      const ok = item.ok !== false;
      return `<div class="learning-card-generation-cycle-finding" data-cycle-finding-ok="${ok ? "true" : "false"}">
        <span>
          <strong>${escapeHtml(cycleFindingText(item.code))}</strong>
          <small>${escapeHtml(item.remediation || item.code || "summary-only")}</small>
        </span>
        <em>${escapeHtml(ok ? "通过" : "待补齐")}</em>
      </div>`;
    }).join("");
  }

  function cycleHistoryRows(cycleHistory = {}, selectedCycleKey = "", escapeHtml = defaultEscapeHtml) {
    const cycles = asArray(cycleHistory.data?.cycles || cycleHistory.cycles).slice(0, 6);
    const status = clean(cycleHistory.status || (cycleHistory.data ? "ready" : "idle"));
    if (status === "loading") return `<div class="learning-card-generation-cycle-empty">正在读取历史周期。</div>`;
    if (status === "failed") return `<div class="learning-card-generation-cycle-empty">历史周期读取失败：${escapeHtml(clean(cycleHistory.error) || "cycle_history_failed")}</div>`;
    if (!cycles.length) return `<div class="learning-card-generation-cycle-empty">暂无可选择的历史周期。</div>`;
    return cycles.map((cycle, index) => {
      const key = cycleHistoryItemKey(cycle, index);
      const selectors = cycle.selectors || {};
      const counts = cycle.counts || {};
      const selected = key === selectedCycleKey;
      const title = firstCleanValue(selectors.taskCardId, cycle.taskCardId, selectors.evaluationId, cycle.evaluationId, `cycle ${index + 1}`);
      const detail = firstCleanValue(
        cycle.summary,
        selectors.planDraftId,
        selectors.profileDeltaId,
        selectors.correctionId,
        "summary-only history"
      );
      const meta = [
        Number(counts.evidence || 0) ? `${Number(counts.evidence || 0)} evidence` : "",
        Number(counts.profileDeltas || 0) ? `${Number(counts.profileDeltas || 0)} delta` : "",
        Number(counts.corrections || 0) ? `${Number(counts.corrections || 0)} correction` : ""
      ].filter(Boolean).join(" · ") || clean(cycle.updatedAt || cycle.createdAt || "history");
      return `<button type="button" class="learning-card-generation-cycle-history-row" data-card-generation-cycle-history-select data-cycle-history-key="${escapeHtml(key)}" data-cycle-history-selected="${selected ? "true" : "false"}">
        <span>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(meta)}</em>
      </button>`;
    }).join("");
  }

  function cycleDrilldownPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const drilldown = state.cycleDrilldown || {};
    const cycleHistory = state.cycleHistory || {};
    const selectedCycleKey = clean(cycleHistory.selectedCycleKey);
    const payload = createCycleAuditQueryPayload({
      context,
      workspaceId: state.selectedWorkspaceId || context.target?.workspaceId,
      draftResult: state.dailyLoopDraftResult || {},
      publishResult: state.dailyLoopPublishResult || {},
      generatedResult: state.generatedResult || {},
      selectedCycle: cycleHistory.selectedCycle || {}
    });
    const status = clean(drilldown.status || "idle");
    const audit = drilldown.audit || {};
    const completeness = drilldown.completeness || {};
    const summary = audit.summary || completeness.cycleAudit?.summary || {};
    const completenessSummary = completeness.summary || {};
    const missingRequired = asArray(completenessSummary.missingRequired);
    const timeline = asArray(audit.timeline).length ? audit.timeline : completeness.cycleAudit?.timeline;
    const anchor = firstCleanValue(payload.task_card_id, payload.evaluation_id, payload.plan_draft_id, payload.profile_delta_id, payload.evidence_id, payload.correction_id);
    const hasAnchor = cycleAuditHasAnchor(payload);
    const loading = status === "loading";
    const disabled = loading || !hasAnchor;
    const completenessLabel = completeness.complete === true
      ? "完整"
      : completeness.ok === true
        ? "待补齐"
        : "未确认";
    const reason = clean(drilldown.error)
      || (loading ? "正在读取 Growth 单卡审计和完整性检查。"
        : hasAnchor ? "读取某张卡从计划、评价到画像变化的 summary-only 证据。"
          : "等待已发布卡片或评价证据后读取。");
    return `<section class="learning-card-generation-cycle-drilldown" data-card-generation-cycle-drilldown data-cycle-drilldown-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-cycle-head">
        <span>
          <strong>单卡闭环审计</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <em>${escapeHtml(cycleDrilldownStatusText(status))}</em>
      </div>
      <div class="learning-card-generation-cycle-grid">
        <span><small>卡片</small><strong>${escapeHtml(anchor || "等待卡片")}</strong></span>
        <span><small>计划</small><strong>${escapeHtml(String(Number(summary.planDraftCount || 0) || 0))}</strong></span>
        <span><small>评价</small><strong>${escapeHtml(String(Number(summary.evidenceCount || 0) || 0))}</strong></span>
        <span><small>缺口</small><strong>${escapeHtml(String(missingRequired.length))}</strong></span>
      </div>
      <div class="learning-card-generation-cycle-actions">
        <span>${escapeHtml(completeness.readyForAutomation ? "审计完整，可作为后续自动化证据" : `完整性：${completenessLabel}`)}</span>
        <button type="button" class="primary" data-card-generation-cycle-audit-refresh ${disabled ? `disabled aria-disabled="true" data-card-generation-blocked-reason="${escapeHtml(hasAnchor ? "正在读取审计，请稍候。" : "还没有可读取的单卡 cycle anchor。")}"` : ""}>${loading ? "读取中" : "读取单卡审计"}</button>
      </div>
      <div class="learning-card-generation-cycle-history" data-card-generation-cycle-history data-cycle-history-status="${escapeHtml(cycleHistory.status || "idle")}">
        <div class="learning-card-generation-cycle-history-head">
          <span>历史周期</span>
          <button type="button" data-card-generation-cycle-history-refresh ${cycleHistory.status === "loading" ? "disabled" : ""}>${cycleHistory.status === "loading" ? "读取中" : "刷新历史"}</button>
        </div>
        <div class="learning-card-generation-cycle-history-list">
          ${cycleHistoryRows(cycleHistory, selectedCycleKey, escapeHtml)}
        </div>
      </div>
      <div class="learning-card-generation-cycle-columns">
        <div>
          <b>Timeline</b>
          ${cycleDrilldownTimelineRows(timeline, escapeHtml)}
        </div>
        <div>
          <b>Completeness</b>
          ${cycleDrilldownFindingRows(completeness.findings, escapeHtml)}
        </div>
      </div>
    </section>`;
  }

  function ownerAuditReviewDecisionText(decision = "") {
    const value = clean(decision).toLowerCase();
    if (value === "needs_follow_up") return "需跟进";
    if (value === "correction_recorded") return "已纠偏";
    if (value === "blocked") return "阻塞";
    return "接受画像";
  }

  function ownerAuditReviewStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "loading") return "读取中";
    if (value === "submitting") return "记录中";
    if (value === "reviewed" || value === "submitted") return "已记录";
    if (value === "needs_follow_up") return "需跟进";
    if (value === "corrected") return "已纠偏";
    if (value === "blocked") return "已阻塞";
    if (value === "failed") return "失败";
    return "待审核";
  }

  function ownerAuditReviewHasAnchor(payload = {}) {
    return [
      payload.plan_draft_id,
      payload.task_card_id,
      payload.evaluation_id,
      payload.profile_delta_id,
      payload.evidence_id,
      payload.correction_id,
      payload.source_id
    ].some((value) => clean(value));
  }

  function ownerAuditReviewRows(holder = {}, escapeHtml = defaultEscapeHtml) {
    const data = holder.data || {};
    const reviews = asArray(data.reviews).slice(0, 4);
    const status = clean(holder.status || (data.ok ? "ready" : "idle"));
    if (status === "loading") return `<div class="learning-card-generation-owner-empty">正在读取完成周期审核。</div>`;
    if (status === "failed") return `<div class="learning-card-generation-owner-empty">审核记录读取失败：${escapeHtml(clean(holder.error) || "owner_audit_review_failed")}</div>`;
    if (!reviews.length) return `<div class="learning-card-generation-owner-empty">暂无完成周期审核记录。</div>`;
    return reviews.map((review) => {
      const feedback = review.feedbackSummary || {};
      const audit = review.auditSummary || {};
      const recommendation = review.recommendation || {};
      const nextAction = review.nextAction || {};
      const label = firstCleanValue(review.reviewId, review.taskCardId, review.evaluationId, "审核记录");
      const detail = [
        feedback.readyForNextPlan ? "readyForNextPlan" : "",
        feedback.cycleComplete ? "cycleComplete" : "",
        recommendation.strategy ? `strategy:${recommendation.strategy}` : "",
        nextAction.action || review.status
      ].filter(Boolean).join(" · ") || "summary-only review";
      const meta = [
        ownerAuditReviewDecisionText(review.decision),
        Number(audit.passCheckCount || 0) ? `${Number(audit.passCheckCount || 0)} checks` : "",
        review.createdAt || review.updatedAt
      ].filter(Boolean).join(" · ");
      return `<div class="learning-card-generation-owner-row" data-owner-audit-review-row data-owner-audit-review-id="${escapeHtml(clean(review.reviewId))}">
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(detail)}</small>
        </span>
        <em>${escapeHtml(meta || ownerAuditReviewStatusText(review.status))}</em>
      </div>`;
    }).join("");
  }

  function ownerAuditReviewStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.actionStatus);
    const result = holder.actionResult || {};
    const review = result.review || {};
    const reviewId = clean(review.reviewId || result.reviewId);
    const decision = clean(result.decision || review.decision);
    const error = clean(holder.actionError);
    if (!status || status === "idle") return "";
    const detail = status === "reviewed" || status === "submitted"
      ? `完成周期审核已记录${reviewId ? `：${reviewId}` : "。"}`
      : status === "submitting"
        ? "正在通过 Growth Owner audit review service 写入。"
        : error || "完成周期审核未记录。";
    return `<div class="learning-card-generation-correction-status" data-owner-audit-review-action-status="${escapeHtml(status)}">
      <span>${escapeHtml(detail)}</span>
      <em>${escapeHtml(decision ? ownerAuditReviewDecisionText(decision) : ownerAuditReviewStatusText(status))}</em>
    </div>`;
  }

  function ownerAuditReviewPanel(context = {}, state = {}, escapeHtml = defaultEscapeHtml) {
    const holder = state.ownerAuditReviews || {};
    const note = clean(state.ownerAuditReviewDraft);
    const selectedCycle = state.cycleHistory?.selectedCycle || {};
    const payload = createOwnerAuditReviewQueryPayload({
      context,
      workspaceId: state.selectedWorkspaceId || context.target?.workspaceId,
      selectedCycle
    });
    const status = clean(holder.status || "idle");
    const busy = holder.actionStatus === "submitting";
    const hasAnchor = ownerAuditReviewHasAnchor(payload);
    const correctionReady = Boolean(clean(payload.correction_id));
    const selectedLabel = firstCleanValue(
      payload.task_card_id,
      payload.evaluation_id,
      payload.plan_draft_id,
      payload.profile_delta_id,
      payload.evidence_id,
      payload.correction_id
    );
    const reason = clean(holder.error)
      || (hasAnchor
        ? "Owner 对选中的完成周期做一次审核记录；服务端会先校验 profile feedback。"
        : "请先在历史周期里选择一条已完成周期，再记录审核。");
    const decisions = [
      ["accepted", "接受", "接受本次画像更新"],
      ["needs_follow_up", "跟进", "后续生成修补卡"],
      ["correction_recorded", "已纠偏", correctionReady ? "关联已有纠偏记录" : "需要先保存纠偏"],
      ["blocked", "阻塞", "记录依赖缺口"]
    ];
    return `<section class="learning-card-generation-owner-audit" data-owner-audit-review-panel data-owner-audit-review-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-owner-head">
        <span>
          <strong>完成周期审核</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <em>${escapeHtml(ownerAuditReviewStatusText(busy ? "submitting" : status))}</em>
      </div>
      <div class="learning-card-generation-owner-grid">
        <span><small>已记录</small><strong>${escapeHtml(String(Number(holder.data?.count || asArray(holder.data?.reviews).length || 0) || 0))}</strong><em>review rows</em></span>
        <span><small>选中周期</small><strong>${escapeHtml(selectedLabel || "未选择")}</strong><em>${escapeHtml(hasAnchor ? "可审核" : "待选择")}</em></span>
        <span><small>纠偏关联</small><strong>${escapeHtml(correctionReady ? "可用" : "无")}</strong><em>correction</em></span>
        <span><small>下一步</small><strong>${escapeHtml(clean(holder.actionResult?.nextAction?.action || holder.data?.reviews?.[0]?.nextAction?.action || "等待"))}</strong><em>summary-only</em></span>
      </div>
      <div class="learning-card-generation-owner-corrections">
        <b>审核记录</b>
        ${ownerAuditReviewRows(holder, escapeHtml)}
      </div>
      <form class="learning-card-generation-correction-form" data-owner-audit-review-form>
        <textarea data-owner-audit-review-note rows="2" maxlength="360" placeholder="可选：只写 summary-only Owner 备注，不填写原始答案、transcript 或 prompt。">${escapeHtml(note)}</textarea>
        <div class="learning-card-generation-correction-controls">
          <span>${escapeHtml(selectedLabel ? `周期：${selectedLabel}` : "等待选择历史周期")}</span>
          <button type="button" data-owner-audit-review-refresh ${status === "loading" ? "disabled" : ""}>${status === "loading" ? "读取中" : "刷新审核"}</button>
        </div>
        <div class="learning-card-generation-cycle-actions">
          ${decisions.map(([decision, label, title]) => {
            const blockedReason = !hasAnchor
              ? "请先选择一条完成周期。"
              : decision === "correction_recorded" && !correctionReady
                ? "记录已纠偏前，需要先保存 Owner 纠偏。"
                : "";
            const disabled = busy || Boolean(blockedReason);
            return `<button type="button" class="${decision === "accepted" ? "primary" : ""}" data-owner-audit-review-decision="${escapeHtml(decision)}" title="${escapeHtml(title)}" ${disabled ? `disabled aria-disabled="true" data-owner-audit-review-blocked-reason="${escapeHtml(blockedReason || "正在记录审核。")}"` : ""}>${escapeHtml(busy ? "记录中" : label)}</button>`;
          }).join("")}
        </div>
        ${ownerAuditReviewStatusPanel(holder, escapeHtml)}
      </form>
    </section>`;
  }

  function stageAssessmentPanel({ context = {}, state = {}, readiness = {}, plan = {}, escapeHtml = defaultEscapeHtml } = {}) {
    const stage = state.stageAssessment || {};
    const controls = stage.controls || context.stageCheckpointControls || {};
    const generated = state.generatedResult || state.dailyLoopPublishResult?.generation || {};
    const controlsSummary = controls.summary || {};
    const controlsReadiness = controls.readiness || {};
    const controlsEvidence = controlsReadiness.evidence || {};
    const activateAction = stageAssessmentAction(controls, "activate_stage_assessment");
    const result = stage.result || stage.eligibility || {};
    const reasonResult = (controlsReadiness.reason || controls.error)
      ? controlsReadiness
      : (result.reason || result.activationReason || result.cycle?.activationReason || result.error)
      ? result
      : stage.eligibility || result;
    const busy = stage.status === "checking" || stage.status === "activating";
    const controlsLoading = stage.controlsStatus === "loading";
    const controlsFailed = stage.controlsStatus === "failed" || controls.ok === false;
    const status = clean(controlsSummary.status || controlsReadiness.activationState || result.activationState || result.cycle?.status || stage.status);
    const readyForControls = Boolean(
      readiness.targetEnabled
      && readiness.workspaceProvisioned
      && readiness.learningGraphReady
      && readiness.historySummaryReady
      && clean(plan.targetNodeId)
    );
    const activationReady = Boolean(controls.ok === true && activateAction?.enabled === true);
    const canActivate = Boolean(activationReady && readiness.gatewayConfigured);
    const activationBlockedReason = clean(
      activateAction?.disabledReason
      || (!readyForControls ? "target_not_ready" : "")
      || (readiness.gatewayConfigured ? "" : "gateway_not_ready")
      || (!controls.ok ? "controls_not_loaded" : "")
    );
    const coverage = asArray(plan.targetNodeIds).length ? asArray(plan.targetNodeIds) : [plan.targetNodeId].filter(Boolean);
    const cooldownUntil = clean(controlsReadiness.cooldownUntil || result.cooldownUntil || result.cycle?.cooldownUntil);
    const publishedTaskCardId = clean(stage.result?.published?.taskCardId);
    const rubricPolicy = stageAssessmentRubricPolicy({ controls, context, generated });
    return `<section class="learning-card-generation-stage-assessment" data-stage-assessment-panel data-stage-assessment-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-stage-head">
        <span>
          <strong>阶段测评</strong>
          <small>${escapeHtml(stageAssessmentReasonText(reasonResult))}</small>
        </span>
        <em>${escapeHtml(stageAssessmentStatusText(status || stage.status))}</em>
      </div>
      <div class="learning-card-generation-stage-grid">
        <span><small>覆盖节点</small><strong>${escapeHtml(String(coverage.length || 0))}</strong></span>
        <span><small>近期轨迹</small><strong>${escapeHtml(String(Number(controlsSummary.recentTrajectoryCount ?? controlsEvidence.recentTrajectoryCount ?? 0) || 0))}</strong></span>
        <span><small>压力信号</small><strong>${escapeHtml(String(Number(controlsSummary.highPressureSignalCount ?? controlsEvidence.highPressureSignalCount ?? 0) || 0))}</strong></span>
      </div>
      ${cooldownUntil ? `<div class="learning-card-generation-stage-note">冷却至 ${escapeHtml(cooldownUntil.slice(0, 10))}</div>` : ""}
      ${stageAssessmentRubricPanel(rubricPolicy, escapeHtml)}
      <div class="learning-card-generation-stage-controls" data-stage-checkpoint-controls-status="${escapeHtml(stage.controlsStatus || (controls.ok ? "ready" : "idle"))}" data-stage-checkpoint-activate-enabled="${canActivate ? "true" : "false"}">
        <span>${escapeHtml(controlsLoading ? "正在读取 controls read model。" : controlsFailed ? (stage.controlsError || controls.error || "controls 读取失败。") : canActivate ? "Owner 可以显式生成一次正式阶段测评。" : stageAssessmentControlsReasonText(activationBlockedReason || controlsReadiness.reason))}</span>
        <em>${escapeHtml(controls.ok ? "controls" : controlsLoading ? "读取中" : "待检查")}</em>
      </div>
      ${stage.error ? `<div class="learning-error" data-stage-assessment-error>${escapeHtml(stage.error)}</div>` : ""}
      <div class="learning-card-generation-stage-actions">
        <button type="button" data-stage-assessment-check ${busy || controlsLoading || !readyForControls ? "disabled" : ""}>${controlsLoading ? "检查中" : "检查条件"}</button>
        <button type="button" class="primary" data-stage-assessment-activate ${busy || !canActivate ? "disabled" : ""} data-stage-assessment-blocked-reason="${escapeHtml(canActivate ? "" : stageAssessmentControlsReasonText(activationBlockedReason || controlsReadiness.reason))}">${busy ? "生成中" : "生成阶段测评"}</button>
      </div>
      ${publishedTaskCardId ? `<button type="button" class="learning-card-generation-open-card" data-learning-open-growth-task="${escapeHtml(publishedTaskCardId)}">打开阶段测评</button>` : ""}
    </section>`;
  }

  function structuredPreview(context = {}, escapeHtml = defaultEscapeHtml) {
    const plan = context.suggestedPlan || {};
    const policy = context.completionPolicy || {};
    const provisioning = context.targetProvisioning || {};
    const preview = {
      learningGraphPlan: plan.targetNodeId || "",
      targetProvisioning: {
        mode: provisioning.mode || "",
        domainPackId: provisioning.selectedDomainPackId || "",
        subject: provisioning.selectedSubject || ""
      },
      learnerSummary: "summary_only",
      learningProfile: "mastery_trajectory_projection",
      recentSignals: "bounded_experience_signals",
      cardSchema: "growth.learningCard.v1",
      completionPolicy: policy.mode || "daily_score_once"
    };
    return escapeHtml(JSON.stringify(preview, null, 2));
  }

  function generatedCardPreview(result = {}, escapeHtml = defaultEscapeHtml) {
    const draft = result.draft || {};
    const published = result.published || {};
    if (!draft.title && !published.taskCardId) {
      return `<div class="learning-coin-empty">生成成功后会在这里显示卡片预览。</div>`;
    }
    const flow = draft.teachingFlow || {};
    const steps = [
      ["微课", flow.microLesson?.instruction || flow.learningTarget],
      ["例题", flow.workedExample?.instruction],
      ["练习", flow.guidedPractice?.instruction || flow.quickCheck?.instruction]
    ].filter((item) => clean(item[1]));
    return `<article class="learning-card-generation-preview-card">
      <div class="learning-card-generation-preview-head">
        <span>
          <strong>${escapeHtml(draft.title || published.taskCardId || "新卡片")}</strong>
          <small>${escapeHtml(flow.learningTarget || "日常英语练习")}</small>
        </span>
        <em>已发布</em>
      </div>
      <div class="learning-card-generation-preview-meta">
        <b>一次批改</b><b>反思最多一次</b><b>无通过线</b>
      </div>
      <div class="learning-card-generation-flow">
        ${steps.map((step, index) => `<span><em>${index + 1}</em><strong>${escapeHtml(step[0])}</strong><small>${escapeHtml(step[1])}</small></span>`).join("")}
      </div>
      ${published.taskCardId ? `<button type="button" class="learning-card-generation-open-card" data-learning-open-growth-task="${escapeHtml(published.taskCardId)}">打开卡片</button>` : ""}
    </article>`;
  }

  function selectedPlanItem(planDraft = {}) {
    if (!planDraft || typeof planDraft !== "object") return {};
    const selectedItemId = clean(planDraft.selectedItemId);
    if (planDraft.selectedItem && clean(planDraft.selectedItem.itemId)) return planDraft.selectedItem;
    return asArray(planDraft.items).find((item) => clean(item.itemId) === selectedItemId) || asArray(planDraft.items)[0] || {};
  }

  function dailyLoopPlanPreview({ draftResult = {}, publishResult = {} } = {}, escapeHtml = defaultEscapeHtml) {
    const planDraft = publishResult.planDraft || draftResult.planDraft || {};
    const publishAttempt = publishResult.publishAttempt || planDraft.publishAttempt || {};
    const generation = publishResult.generation || {};
    const item = selectedPlanItem(planDraft);
    if (!clean(planDraft.planDraftId)) {
      return `<section class="learning-card-generation-plan-preview" data-card-generation-plan-preview>
        <div class="learning-card-generation-plan-head">
          <span>
            <strong>下一张计划</strong>
            <small>先规划，再由 Owner 明确发布。</small>
          </span>
          <em>未规划</em>
        </div>
        <div class="learning-coin-empty">点击“规划下一张”后会显示 plan draft 和候选计划项。</div>
      </section>`;
    }
    const itemTargetNodeIds = asArray(item.targetNodeIds).map(clean).filter(Boolean);
    const draftTargetNodeIds = asArray(planDraft.targetNodeIds).map(clean).filter(Boolean);
    const targets = itemTargetNodeIds.length ? itemTargetNodeIds : draftTargetNodeIds;
    const evidence = asArray(item.evidenceRequirements).map(clean).filter(Boolean);
    const publishedTaskCardId = clean(generation.published?.taskCardId || planDraft.generatedTaskCardId);
    const attemptStatus = clean(publishAttempt.status || (publishedTaskCardId ? "published" : planDraft.status));
    return `<section class="learning-card-generation-plan-preview" data-card-generation-plan-preview data-plan-draft-id="${escapeHtml(planDraft.planDraftId)}">
      <div class="learning-card-generation-plan-head">
        <span>
          <strong>下一张计划</strong>
          <small>${escapeHtml(planDraft.planSummary || item.reason || "summary-only plan draft")}</small>
        </span>
        <em>${escapeHtml(attemptStatus || "drafted")}</em>
      </div>
      <div class="learning-card-generation-plan-grid">
        <span><small>Plan draft</small><strong>${escapeHtml(planDraft.planDraftId)}</strong></span>
        <span><small>候选项</small><strong>${escapeHtml(String(Number(planDraft.itemCount || asArray(planDraft.items).length || 0) || 0))}</strong></span>
        <span><small>已发布</small><strong>${escapeHtml(publishedTaskCardId || "未发布")}</strong></span>
      </div>
      <div class="learning-card-generation-plan-row">
        <span>
          <strong>${escapeHtml(clean(item.itemId || planDraft.selectedItemId || "默认计划项"))}</strong>
          <small>${escapeHtml(item.reason || "根据学习闭环选择一张低压力日常卡。")}</small>
        </span>
        <em>${escapeHtml(clean(item.cardRole || "practice"))}</em>
      </div>
      <div class="learning-card-generation-plan-grid">
        <span><small>节点</small><strong>${escapeHtml(targets.join(" · ") || "未指定")}</strong></span>
        <span><small>难度</small><strong>${escapeHtml(clean(item.difficultyBand || "foundation"))}</strong></span>
        <span><small>证据</small><strong>${escapeHtml(evidence.join(" · ") || "short_answer")}</strong></span>
      </div>
      ${publishAttempt.error ? `<div class="learning-card-generation-plan-attempt">${escapeHtml(`发布尝试失败：${publishAttempt.error}`)}</div>` : ""}
    </section>`;
  }

  function errorPanel(state = {}, escapeHtml = defaultEscapeHtml) {
    const error = clean(state.error);
    if (!error) return "";
    return `<div class="learning-error" data-card-generation-error>${escapeHtml(error)}</div>`;
  }

  function generationBlockedReason({ state = {}, context = {}, readiness = {}, plan = {} } = {}) {
    if (state.status === "loading_context") return "正在加载生成上下文，请稍候。";
    if (!context || !Object.keys(context).length) return "生成上下文还没加载完成，请先刷新状态。";
    if (!readiness.targetEnabled || context.target?.enabled === false) return "请先在左侧选择凡凡，再生成卡片。";
    if (!readiness.workspaceProvisioned) return "学习者 workspace 尚未开通，暂不能生成卡片。";
    if (!readiness.learningGraphReady || !clean(plan.targetNodeId)) return "学习图谱目标尚未就绪，暂不能生成卡片。";
    if (!readiness.historySummaryReady) return "历史摘要尚未就绪，暂不能生成卡片。";
    if (!readiness.gatewayConfigured) return "Gateway authoring 尚未配置，暂不能生成卡片。";
    if (readiness.blockingOpenGeneration) return "已有生成任务正在处理，请稍后再试。";
    return "";
  }

  function dailyLoopDraftBlockedReason({ state = {}, context = {}, readiness = {}, plan = {} } = {}) {
    if (state.status === "loading_context") return "正在加载生成上下文，请稍候。";
    if (!context || !Object.keys(context).length) return "生成上下文还没加载完成，请先刷新状态。";
    if (!readiness.targetEnabled || context.target?.enabled === false) return "请先在左侧选择凡凡，再生成卡片。";
    if (!readiness.workspaceProvisioned) return "学习者 workspace 尚未开通，暂不能规划卡片。";
    if (!readiness.learningGraphReady || !clean(plan.targetNodeId)) return "学习图谱目标尚未就绪，暂不能规划卡片。";
    if (!readiness.historySummaryReady) return "历史摘要尚未就绪，暂不能规划卡片。";
    if (!(readiness.plannerContextReady ?? true)) return "Planner context 尚未就绪，暂不能规划卡片。";
    if (!(readiness.plannerGatewayConfigured ?? readiness.gatewayConfigured)) return "Planner Gateway 尚未配置，暂不能规划卡片。";
    if (readiness.blockingOpenGeneration) return "已有生成任务正在处理，请稍后再试。";
    return "";
  }

  function dailyLoopPublishBlockedReason({ state = {}, context = {}, readiness = {}, draftResult = {} } = {}) {
    const planDraft = draftResult.planDraft || {};
    if (state.status === "loading_context") return "正在加载生成上下文，请稍候。";
    if (!context || !Object.keys(context).length) return "生成上下文还没加载完成，请先刷新状态。";
    if (!clean(planDraft.planDraftId)) return "请先规划下一张，再发布卡片。";
    if (!clean(planDraft.selectedItemId || selectedPlanItem(planDraft).itemId)) return "计划草稿没有可发布的计划项。";
    if (!(readiness.authoringGatewayConfigured ?? readiness.gatewayConfigured)) return "Gateway authoring 尚未配置，暂不能发布卡片。";
    if (readiness.blockingOpenGeneration) return "已有生成任务正在处理，请稍后再试。";
    return "";
  }

  function dailyLoopAdvanceBlockedReason({ state = {}, context = {}, readiness = {}, plan = {} } = {}) {
    const draftBlocked = dailyLoopDraftBlockedReason({ state, context, readiness, plan });
    if (draftBlocked) return draftBlocked;
    if (!(readiness.authoringGatewayConfigured ?? readiness.gatewayConfigured)) return "Gateway authoring 尚未配置，暂不能生成卡片。";
    return "";
  }

  function primaryGenerationBlockedReason({ state = {}, context = {}, readiness = {}, plan = {} } = {}) {
    const loopBlocked = operatingLoopRunBlockedReason({ state, context });
    if (loopBlocked) return loopBlocked;
    const data = state.learningLoopState?.data || context.learningLoopState || {};
    const action = clean(data.nextAction?.action);
    if (action === "draft_daily_plan") return dailyLoopAdvanceBlockedReason({ state, context, readiness, plan });
    if (action === "publish_selected_plan_item") {
      if (readiness.blockingOpenGeneration) return "已有生成任务正在处理，请稍后再试。";
      if (!(readiness.authoringGatewayConfigured ?? readiness.gatewayConfigured)) return "Gateway authoring 尚未配置，暂不能生成卡片。";
      return "";
    }
    if (action === "review_stage_assessment") return "当前下一步是阶段测评，请使用闭环执行或阶段测评面板。";
    return "当前服务端 next action 不会直接生成日常卡。";
  }

  function progressStepRows(activeStep = "prepare", escapeHtml = defaultEscapeHtml) {
    const steps = [
      ["context", "整理上下文", "图谱、画像、近期信号"],
      ["planner", "起草计划", "Gateway 返回 plan draft"],
      ["validation", "校验草稿", "teachingFlow、图谱绑定、隐私扫描"],
      ["authoring", "生成卡片", "Gateway 返回 authoring draft"],
      ["publish", "发布卡片", "事务写入 Growth SQLite"]
    ];
    const activeIndex = Math.max(0, steps.findIndex(([id]) => id === clean(activeStep)));
    return steps.map(([id, label, detail], index) => {
      const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
      return `<span data-progress-step="${escapeHtml(id)}" data-progress-state="${state}">
        <em>${index + 1}</em>
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(detail)}</small>
      </span>`;
    }).join("");
  }

  function progressPanel(state = {}, escapeHtml = defaultEscapeHtml) {
    const visible = state.status === "generating" || state.status === "drafting" || state.status === "publishing" || state.status === "advancing";
    if (!visible) return "";
    const step = clean(state.progressStep || "context") || "context";
    const message = clean(state.progressMessage || "正在处理学习闭环，请稍等。");
    const title = state.status === "drafting"
      ? "正在规划下一张"
      : state.status === "publishing"
        ? "正在发布卡片"
        : state.status === "advancing"
          ? "正在生成卡片"
        : "正在生成卡片";
    return `<section class="learning-card-generation-progress" data-card-generation-progress role="status" aria-live="polite">
      <div class="learning-card-generation-progress-head">
        <span>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(message)}</small>
        </span>
        <em>${escapeHtml(statusText(state.status))}</em>
      </div>
      <div class="learning-card-generation-progress-steps">
        ${progressStepRows(step, escapeHtml)}
      </div>
    </section>`;
  }

  function createDailyEnglishGeneratePayload({ context = {}, workspaceId = "" } = {}) {
    const generationDefaults = context.generationDefaults || {};
    return {
      workspace_id: clean(workspaceId || context.target?.workspaceId),
      learner_id: clean(context.target?.learnerId || workspaceId),
      recipe_id: clean(context.selectedRecipeId || "daily_english_v1"),
      card_schema_version: clean(generationDefaults.cardSchemaVersion || "growth.card.authoring.v1")
    };
  }

  function dailyLoopScopeFromContext(context = {}, workspaceId = "", selection = {}) {
    const plan = context.suggestedPlan || {};
    const recommendation = context.nextCardRecommendation || {};
    const defaults = context.generationDefaults || {};
    const provisioning = context.targetProvisioning || {};
    const graphOptions = graphOptionsForContext(context);
    const draft = selectedProvisionDraft(context, selection);
    const targetNodeIds = asArray(recommendation.targetNodeIds).length
      ? asArray(recommendation.targetNodeIds)
      : asArray(plan.targetNodeIds).length
        ? asArray(plan.targetNodeIds)
        : [recommendation.targetNodeId || plan.targetNodeId].filter(Boolean);
    return {
      workspace_id: clean(workspaceId || context.target?.workspaceId),
      learner_id: clean(context.target?.learnerId || workspaceId),
      program_id: clean(context.programId || plan.programId || defaults.programId),
      recipe_id: clean(selection.recipeId || selection.recipe_id || context.selectedRecipeId || "daily_english_v1"),
      domain_pack_id: clean(draft.domainPackId || provisioning.selectedDomainPackId || graphOptions.selectedDomainPackId || context.domainPackId || plan.domainPackId || defaults.domainPackId),
      domain: clean(draft.domain || provisioning.selectedDomain || graphOptions.selectedDomain || recommendation.domain || plan.domain || context.domain || defaults.domain || "english"),
      subject: clean(draft.subject || provisioning.selectedSubject || graphOptions.selectedSubject || recommendation.subject || plan.subject || context.subject || defaults.subject || plan.domain || context.domain || "english"),
      horizon: clean(context.horizon || defaults.horizon || "daily_plan"),
      available_minutes: Number(defaults.availableMinutes || context.availableMinutes || 15) || 15,
      target_node_ids: targetNodeIds.map(clean).filter(Boolean).slice(0, 12),
      card_schema_version: clean(defaults.cardSchemaVersion || "growth.card.authoring.v1")
    };
  }

  function createDailyLoopDraftPayload({ context = {}, workspaceId = "", selection = {} } = {}) {
    const scope = dailyLoopScopeFromContext(context, workspaceId, selection);
    return Object.fromEntries(Object.entries(scope).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return clean(value);
    }));
  }

  function createDailyLoopAdvancePayload({ context = {}, workspaceId = "", selection = {} } = {}) {
    return createDailyLoopDraftPayload({ context, workspaceId, selection });
  }

  function createDailyLoopPublishPayload({ context = {}, workspaceId = "", draftResult = {}, selection = {} } = {}) {
    const scope = dailyLoopScopeFromContext(context, workspaceId, selection);
    const planDraft = draftResult.planDraft || {};
    const item = selectedPlanItem(planDraft);
    const targetNodeIds = asArray(item.targetNodeIds).length ? asArray(item.targetNodeIds) : asArray(planDraft.targetNodeIds);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      plan_draft_id: clean(planDraft.planDraftId),
      selected_item_id: clean(planDraft.selectedItemId || item.itemId),
      target_node_ids: targetNodeIds.map(clean).filter(Boolean).slice(0, 12)
    })).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return clean(value);
    }));
  }

  function createOperatingLoopRunQueryPayload({ context = {}, workspaceId = "" } = {}) {
    const scope = dailyLoopScopeFromContext(context, workspaceId, {});
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      limit: 5
    })).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return clean(value);
    }));
  }

  function createOperatingLoopAdvancePayload({ context = {}, workspaceId = "", state = {} } = {}) {
    const scope = dailyLoopScopeFromContext(context, workspaceId, state.targetProvisionDraft || {});
    const loopData = state.learningLoopState?.data || context.learningLoopState || {};
    const nextAction = loopData.nextAction || {};
    const action = clean(nextAction.action);
    const plan = context.suggestedPlan || {};
    const draftResult = state.dailyLoopDraftResult || {};
    const planDraft = draftResult.planDraft || {};
    const item = selectedPlanItem(planDraft);
    const coverage = firstCleanArray(
      plan.assessmentCoverageNodeIds,
      plan.assessmentCoverage,
      plan.targetNodeIds,
      scope.target_node_ids,
      [plan.targetNodeId]
    );
    const payload = Object.assign({}, scope, {
      action: "run_next",
      requested_by: "owner",
      plan_draft_id: clean(nextAction.planDraftId || planDraft.planDraftId),
      selected_item_id: clean(nextAction.itemId || planDraft.selectedItemId || item.itemId),
      task_card_id: clean(nextAction.taskCardId),
      target_node_ids: firstCleanArray(scope.target_node_ids, plan.targetNodeIds, [plan.targetNodeId]),
      assessment_coverage_node_ids: coverage
    });
    if (action === "review_stage_assessment") {
      payload.confirm_stage_assessment = true;
      payload.allow_stage_activation = true;
      payload.activation_reason = "owner_confirmed_checkpoint";
    }
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "boolean") return value === true;
      return clean(value);
    }));
  }

  function ownerAuditReviewScopeFromContext(context = {}, workspaceId = "", selectedCycle = {}) {
    const scope = dailyLoopScopeFromContext(context, workspaceId, {});
    const selected = cycleSelectionPayload(selectedCycle || {});
    const ownerAudit = context.ownerAudit || {};
    const firstDelta = ownerAuditItems(ownerAudit, "profileDeltaAudit")[0] || {};
    const latestPlan = ownerAuditItems(ownerAudit, "planAudit")[0] || {};
    const plan = context.suggestedPlan || {};
    const recommendation = context.nextCardRecommendation || {};
    const targetNodeIds = firstCleanArray(
      selected.target_node_ids,
      recommendation.targetNodeIds,
      plan.targetNodeIds,
      [recommendation.targetNodeId || plan.targetNodeId]
    );
    return Object.assign({}, scope, {
      program_id: firstCleanValue(scope.program_id, firstDelta.programId, latestPlan.programId),
      plan_draft_id: selected.plan_draft_id,
      task_card_id: selected.task_card_id,
      evaluation_id: selected.evaluation_id,
      profile_delta_id: selected.profile_delta_id,
      evidence_id: selected.evidence_id,
      correction_id: selected.correction_id,
      source_id: selected.source_id,
      target_node_ids: targetNodeIds
    });
  }

  function createOwnerAuditReviewQueryPayload({ context = {}, workspaceId = "", selectedCycle = {} } = {}) {
    const scope = ownerAuditReviewScopeFromContext(context, workspaceId, selectedCycle);
    return Object.fromEntries(Object.entries(Object.assign({}, scope, {
      limit: 5
    })).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return clean(value);
    }));
  }

  function createOwnerAuditReviewPayload({ context = {}, workspaceId = "", selectedCycle = {}, decision = "accepted", note = "" } = {}) {
    const scope = ownerAuditReviewScopeFromContext(context, workspaceId, selectedCycle);
    const payload = Object.assign({}, scope, {
      decision: clean(decision || "accepted"),
      owner_note: clean(note).slice(0, 360),
      requested_by: "owner",
      reviewed_by: "owner"
    });
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return clean(value);
    }));
  }

  function createOwnerCorrectionPayload({ context = {}, workspaceId = "", draft = {} } = {}) {
    const ownerAudit = context.ownerAudit || {};
    const firstDelta = ownerAuditItems(ownerAudit, "profileDeltaAudit")[0] || {};
    const planAudit = ownerAudit.planAudit || {};
    const latestPlan = ownerAuditItems(ownerAudit, "planAudit")[0] || {};
    const plan = context.suggestedPlan || {};
    const defaults = context.generationDefaults || {};
    const targetNodeIds = ownerCorrectionTargetNodeIds(context);
    const payload = {
      workspace_id: clean(workspaceId || context.target?.workspaceId),
      learner_id: clean(context.target?.learnerId || workspaceId),
      program_id: clean(context.programId || firstDelta.programId || latestPlan.programId || plan.programId || defaults.programId),
      domain_pack_id: clean(context.domainPackId || plan.domainPackId || defaults.domainPackId),
      domain: clean(plan.domain || context.domain || defaults.domain),
      subject: clean(plan.subject || context.subject || defaults.subject || plan.domain || context.domain),
      target_node_ids: targetNodeIds,
      review_action: clean(draft.reviewAction || "confirm_profile_delta"),
      reason: clean(draft.note || draft.reason).slice(0, 260),
      profile_delta_id: clean(draft.profileDeltaId || firstDelta.profileDeltaId),
      task_card_id: clean(draft.taskCardId || firstDelta.taskCardId || latestPlan.generatedTaskCardId || planAudit.generatedTaskCardId),
      evaluation_id: clean(draft.evaluationId || firstDelta.evaluationId),
      source_evidence_ids: asArray(firstDelta.evidenceIds).map(clean).filter(Boolean).slice(0, 12)
    };
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return clean(value);
    }));
  }

  function createTargetProvisionPayload({ context = {}, workspaceId = "", draft = {} } = {}) {
    const selected = selectedProvisionDraft(context, draft);
    const plan = context.suggestedPlan || {};
    const defaults = context.generationDefaults || {};
    const payload = {
      workspace_id: clean(workspaceId || context.target?.workspaceId),
      learner_id: clean(context.target?.learnerId || workspaceId),
      program_id: clean(context.programId || plan.programId || defaults.programId),
      domain_pack_id: clean(selected.domainPackId),
      domain: clean(selected.domain || plan.domain || defaults.domain),
      subject: clean(selected.subject || plan.subject || defaults.subject),
      status: "active",
      source: "owner"
    };
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => clean(value)));
  }

  function createStageAssessmentPayload({ context = {}, workspaceId = "", activationSource = "owner_manual" } = {}) {
    const plan = context.suggestedPlan || {};
    const coverage = asArray(plan.targetNodeIds).length ? asArray(plan.targetNodeIds) : [plan.targetNodeId].filter(Boolean);
    return {
      workspace_id: clean(workspaceId || context.target?.workspaceId),
      learner_id: clean(context.target?.learnerId || workspaceId),
      program_id: clean(context.programId || plan.programId || context.generationDefaults?.programId),
      domain_pack_id: clean(context.domainPackId || plan.domainPackId || context.generationDefaults?.domainPackId),
      domain: clean(plan.domain || context.domain || context.generationDefaults?.domain),
      subject: clean(plan.subject || context.subject || context.generationDefaults?.subject || plan.domain),
      subject_id: clean(plan.subject || plan.domain || "english"),
      capability_cluster_id: clean(plan.capabilityClusterId || plan.targetNodeId),
      target_node_id: clean(plan.targetNodeId || coverage[0]),
      assessment_coverage_node_ids: coverage,
      difficulty_band: "assessment",
      evidence_requirements: asArray(plan.evidenceRequirements),
      activation_source: clean(activationSource || "owner_manual"),
      activation_reason: clean(activationSource) === "owner_manual" ? "owner_manual" : "",
      generation_key: [
        "stage_assessment",
        clean(workspaceId || context.target?.workspaceId),
        coverage.join(",")
      ].filter(Boolean).join(":")
    };
  }

  function renderOwnerCardGenerationPanel(options = {}) {
    const escapeHtml = options.escapeHtml || defaultEscapeHtml;
    const state = options.state?.cardGeneration || {};
    const context = state.context || options.context || {};
    const readiness = context.readiness || {};
    const plan = context.suggestedPlan || {};
    const generated = state.generatedResult || {};
    const loading = state.status === "loading_context";
    const busy = state.status === "generating" || state.status === "drafting" || state.status === "publishing" || state.status === "advancing";
    const draftResult = state.dailyLoopDraftResult || {};
    const publishResult = state.dailyLoopPublishResult || {};
    const draftBlockedReason = busy ? "" : dailyLoopDraftBlockedReason({ state, context, readiness, plan });
    const publishBlockedReason = busy ? "" : dailyLoopPublishBlockedReason({ state, context, readiness, draftResult });
    const advanceBlockedReason = busy ? "" : primaryGenerationBlockedReason({ state, context, readiness, plan });
    const canDraft = Boolean(!busy && !draftBlockedReason);
    const canPublish = Boolean(!busy && !publishBlockedReason);
    const canAdvance = Boolean(!busy && !advanceBlockedReason);
    const draftClass = `${canDraft ? "" : "disabled"}`;
    const publishClass = `primary${canPublish ? "" : " disabled"}`;
    const advanceClass = `primary${canAdvance ? "" : " disabled"}`;
    const draftBlockedAttrs = !canDraft
      ? `data-card-generation-blocked-reason="${escapeHtml(draftBlockedReason)}" aria-disabled="true"`
      : "";
    const publishBlockedAttrs = !canPublish
      ? `data-card-generation-blocked-reason="${escapeHtml(publishBlockedReason)}" aria-disabled="true"`
      : "";
    const advanceBlockedAttrs = !canAdvance
      ? `data-card-generation-blocked-reason="${escapeHtml(advanceBlockedReason)}" aria-disabled="true"`
      : "";
    return `<section class="learning-card-generation-manager" data-card-generation-manager data-card-generation-status="${escapeHtml(state.status || "idle")}" aria-busy="${busy ? "true" : "false"}">
      <section class="learning-coin-panel learning-card-generation-intro">
        <div class="learning-section-heading">
          <h3>卡片生成</h3>
          <span>${escapeHtml(statusText(state.status))}</span>
        </div>
        <div class="learning-card-generation-kpis">
          ${historyFacts(context, escapeHtml)}
        </div>
        ${errorPanel(state, escapeHtml)}
      </section>
      ${progressPanel(state, escapeHtml)}

      <div class="learning-card-generation-layout">
        <section class="learning-coin-panel learning-card-generation-side">
          <div class="learning-section-heading">
            <h3>学习者</h3>
            <span>Owner</span>
          </div>
          <div class="learning-card-generation-target-list">
            ${targetRowsWithContext({ targets: options.viewTargets, context, currentWorkspaceId: options.workspaceId, escapeHtml })}
          </div>
        </section>

        <section class="learning-coin-panel learning-card-generation-main">
          <div class="learning-section-heading">
            <h3>生成设置</h3>
            <span>结构化输入</span>
          </div>
          ${loading ? `<div class="learning-growth-muted">正在加载生成上下文...</div>` : ""}
          <div class="learning-card-generation-recipes">
            ${recipeOptions(context, escapeHtml)}
          </div>
          <div class="learning-card-generation-readiness">
            ${readinessRows(context, escapeHtml)}
          </div>
          ${targetProvisioningPanel(context, state, escapeHtml)}
          ${learningLoopStatePanel(state, context, escapeHtml)}
          ${operatingLoopPanel(context, state, escapeHtml)}
          ${referenceChainPanel(context, state, options.workspaceId, escapeHtml)}
          ${automationCycleClosurePanel(context, state, escapeHtml)}
          ${automationProposalPanel(context, state, escapeHtml)}
          ${automationDigestPanel(context, state, escapeHtml)}
          ${automationFailurePolicyPanel(context, state, escapeHtml)}
          ${automationActionHandoffPanel(context, state, escapeHtml)}
          ${automationSchedulerExecutionPanel(context, state, escapeHtml)}
          ${automationSchedulerRunPanel(context, state, escapeHtml)}
          ${automationSchedulerWorkerTargetPanel(context, state, escapeHtml)}
          ${releaseWorkbenchPanel(context, state, escapeHtml)}
          ${learningProfilePanel(context, state, escapeHtml)}
          ${ownerAuditPanel(context, state, escapeHtml)}
          ${cycleDrilldownPanel(context, state, escapeHtml)}
          ${ownerAuditReviewPanel(context, state, escapeHtml)}
          ${stageAssessmentPanel({ context, state, readiness, plan, escapeHtml })}
          <div class="learning-card-generation-field-list">
            <div><span><strong>图谱目标</strong><small>${escapeHtml(plan.title || plan.targetNodeId || "未选择")}</small></span><em>${escapeHtml(plan.domain || "english")}</em></div>
            <div><span><strong>完成规则</strong><small>提交一次，批改一次，反思最多一次，不设通过线</small></span><em>daily</em></div>
            <div><span><strong>证据要求</strong><small>${escapeHtml(asArray(plan.evidenceRequirements).join(" · ") || "short_answer")}</small></span><em>摘要</em></div>
          </div>
          <pre class="learning-card-generation-structured">${structuredPreview(context, escapeHtml)}</pre>
          <div class="learning-card-generation-actions">
            <button type="button" data-card-generation-refresh>刷新状态</button>
            <button type="button" class="${advanceClass}" data-card-generation-advance ${advanceBlockedAttrs} ${state.status === "advancing" ? "disabled" : ""}>${state.status === "advancing" ? "正在生成" : "生成卡片"}</button>
            <button type="button" class="${draftClass}" data-card-generation-draft ${draftBlockedAttrs} ${state.status === "drafting" ? "disabled" : ""}>${state.status === "drafting" ? "正在规划" : "规划下一张"}</button>
            <button type="button" class="${publishClass}" data-card-generation-publish ${publishBlockedAttrs} ${state.status === "publishing" ? "disabled" : ""}>${state.status === "publishing" ? "正在发布" : "发布为卡片"}</button>
          </div>
        </section>

        <section class="learning-coin-panel learning-card-generation-preview">
          <div class="learning-section-heading">
            <h3>规划与发布</h3>
            <span>${generated.published?.taskCardId ? "已发布" : "等待生成"}</span>
          </div>
          ${dailyLoopPlanPreview({ draftResult, publishResult }, escapeHtml)}
          ${generatedCardPreview(generated, escapeHtml)}
          <div class="learning-card-generation-audit">
            <span>teachingFlow contract <em></em></span>
            <span>graph binding <em></em></span>
            <span>privacy scan <em></em></span>
            <span>SQLite transaction <em></em></span>
          </div>
        </section>
      </div>
    </section>`;
  }

  root.HermesGrowthCardGenerationUi = {
    createDailyEnglishGeneratePayload,
    createAutomationCycleClosurePayload,
    createAutomationProposalCreatePayload,
    createAutomationProposalDecisionPayload,
    createAutomationProposalPublishPayload,
    createAutomationProposalQueryPayload,
    createAutomationDigestCreatePayload,
    createAutomationDigestQueryPayload,
    createAutomationDigestReviewPayload,
    createAutomationFailurePolicyCreatePayload,
    createAutomationFailurePolicyQueryPayload,
    createAutomationFailurePolicyReviewPayload,
    createAutomationActionHandoffQueryPayload,
    createAutomationActionHandoffPayload,
    createAutomationActionHandoffDeliverPayload,
    createAutomationSchedulerExecutionQueryPayload,
    createAutomationSchedulerExecutionPayload,
    createAutomationSchedulerRunQueryPayload,
    createAutomationSchedulerRunPayload,
    createAutomationSchedulerWorkerTargetQueryPayload,
    createAutomationSchedulerWorkerTargetPayload,
    createAutomationSchedulerWorkerTargetReviewPayload,
    createRecommendationLifecycleDecisionPayload,
    createDailyLoopAdvancePayload,
    createDailyLoopDraftPayload,
    createDailyLoopPublishPayload,
    createOperatingLoopAdvancePayload,
    createOperatingLoopRunQueryPayload,
    createCycleAuditQueryPayload,
    createCycleHistoryQueryPayload,
    createOwnerAuditReviewPayload,
    createOwnerAuditReviewQueryPayload,
    createOwnerCorrectionPayload,
    createReleaseArtifactTemplateQueryPayload,
    createReleaseWorkbenchActionAuditQueryPayload,
    createReleaseStatusReadbackQueryPayload,
    createReleaseEvidenceLedgerQueryPayload,
    createReleaseLifecycleRecordsQueryPayload,
    createReleaseLifecycleRecordPayload,
    createReleasePackageBuildPayload,
    createReleaseWorkbenchActionPayload,
    createReferenceChainRequests,
    createTargetProvisionPayload,
    createStageAssessmentPayload,
    cycleHistoryItemKey,
    cycleAuditHasAnchor,
    ownerAuditReviewHasAnchor,
    isFanfanSampleTarget,
    renderOwnerCardGenerationPanel
  };
})(typeof window !== "undefined" ? window : globalThis);
