(function registerGrowthCardGenerationUi(root) {
  function clean(value) {
    return String(value ?? "").trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

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

  function learningLoopStatusText(status = "") {
    const value = clean(status).toLowerCase();
    if (value === "loading") return "读取中";
    if (value === "failed") return "读取失败";
    if (value === "ready_to_draft") return "可起草";
    if (value === "ready_to_publish") return "可发布";
    if (value === "stage_checkpoint_ready") return "测评就绪";
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
    if (value === "release_activation") return "记录激活";
    if (value === "runtime_enablement") return "记录启用";
    if (value === "release_package") return "需要包体";
    return "查看";
  }

  function releaseWorkbenchSupportedEndpoint(endpointKey = "") {
    return ["release_evidence", "release_approval", "release_activation", "runtime_enablement"].includes(clean(endpointKey).toLowerCase());
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

  function createReleaseWorkbenchActionPayload({ context = {}, workspaceId = "", action = {} } = {}) {
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

  function releaseWorkbenchActionRows(actions = [], holder = {}, escapeHtml = defaultEscapeHtml) {
    const busy = holder.actionStatus === "recording";
    if (!actions.length) return `<div class="learning-card-generation-release-empty">暂无需要 Owner 记录的 release action。</div>`;
    return actions.slice(0, 6).map((action) => {
      const endpointKey = clean(action.endpointKey || action.endpoint_key);
      const actionKey = clean(action.key || action.actionKey || action.action_key);
      const supported = releaseWorkbenchSupportedEndpoint(endpointKey);
      const disabled = busy || !supported;
      const detail = action.externalActionRequired
        ? "先在 Growth 外确认配置，再记录摘要"
        : clean(action.source || action.action || "release workbench");
      const disabledReason = !supported
        ? "当前界面只支持 evidence、approval、activation 和 runtime enablement。"
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
      <div class="learning-card-generation-release-actions">
        ${releaseWorkbenchActionRows(actions, holder, escapeHtml)}
      </div>
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
          <button type="button" data-automation-proposal-review data-automation-proposal-id="${escapeHtml(proposalId)}" data-automation-proposal-status="accepted" ${busy || !isProposed ? "disabled" : ""}>接受</button>
          <button type="button" data-automation-proposal-review data-automation-proposal-id="${escapeHtml(proposalId)}" data-automation-proposal-status="skipped" ${busy || !isProposed ? "disabled" : ""}>跳过</button>
          <button type="button" data-automation-proposal-review data-automation-proposal-id="${escapeHtml(proposalId)}" data-automation-proposal-status="expired" ${busy || !isProposed ? "disabled" : ""}>过期</button>
          <button type="button" data-automation-proposal-review data-automation-proposal-id="${escapeHtml(proposalId)}" data-automation-proposal-status="superseded" ${busy || !isProposed ? "disabled" : ""}>替代</button>
          <button type="button" class="primary" data-automation-proposal-publish data-automation-proposal-id="${escapeHtml(proposalId)}" ${busy || !canPublish ? "disabled" : ""}>${busy && canPublish ? "发布中" : executionStatus === "published" ? "已发布" : "发布"}</button>
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
          <button type="button" data-automation-proposal-create ${busy || !hasSelectedSource ? `disabled aria-disabled="true" data-automation-proposal-blocked-reason="${escapeHtml(hasSelectedSource ? "建议操作正在写入。" : "请先在历史周期里选择一个完整周期。")}"` : ""}>${busy && hasSelectedSource ? "生成中" : "生成建议"}</button>
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
    if (value === "failed") return "失败";
    return value || "待摘要";
  }

  function automationDigestActionStatusPanel(holder = {}, escapeHtml = defaultEscapeHtml) {
    const status = clean(holder.actionStatus);
    const error = clean(holder.actionError);
    const result = holder.actionResult || {};
    const digest = result.digest || {};
    if (!status || status === "idle") return "";
    const detail = status === "reviewed"
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
    const reason = status === "loading"
      ? "正在读取自动化 digest。"
      : status === "failed"
        ? clean(holder.error) || "automation_digests_failed"
        : pendingCount
          ? "Owner 可以复核 digest，但不会自动发布或通知。"
          : "暂无待复核 digest；刷新只读取已持久化摘要。";
    return `<section class="learning-card-generation-proposals learning-card-generation-digests" data-automation-digest-panel data-automation-digest-status="${escapeHtml(status || "idle")}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>自动化 Digest</strong>
          <small>${escapeHtml(reason)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
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

  function stageAssessmentPanel({ context = {}, state = {}, readiness = {}, plan = {}, escapeHtml = defaultEscapeHtml } = {}) {
    const stage = state.stageAssessment || {};
    const controls = stage.controls || context.stageCheckpointControls || {};
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
    const visible = state.status === "generating" || state.status === "drafting" || state.status === "publishing";
    if (!visible) return "";
    const step = clean(state.progressStep || "context") || "context";
    const message = clean(state.progressMessage || "正在处理学习闭环，请稍等。");
    const title = state.status === "drafting"
      ? "正在规划下一张"
      : state.status === "publishing"
        ? "正在发布卡片"
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
    const busy = state.status === "generating" || state.status === "drafting" || state.status === "publishing";
    const draftResult = state.dailyLoopDraftResult || {};
    const publishResult = state.dailyLoopPublishResult || {};
    const draftBlockedReason = busy ? "" : dailyLoopDraftBlockedReason({ state, context, readiness, plan });
    const publishBlockedReason = busy ? "" : dailyLoopPublishBlockedReason({ state, context, readiness, draftResult });
    const canDraft = Boolean(!busy && !draftBlockedReason);
    const canPublish = Boolean(!busy && !publishBlockedReason);
    const draftClass = `${canDraft ? "" : "disabled"}`;
    const publishClass = `primary${canPublish ? "" : " disabled"}`;
    const draftBlockedAttrs = !canDraft
      ? `data-card-generation-blocked-reason="${escapeHtml(draftBlockedReason)}" aria-disabled="true"`
      : "";
    const publishBlockedAttrs = !canPublish
      ? `data-card-generation-blocked-reason="${escapeHtml(publishBlockedReason)}" aria-disabled="true"`
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
          ${automationProposalPanel(context, state, escapeHtml)}
          ${automationDigestPanel(context, state, escapeHtml)}
          ${releaseWorkbenchPanel(context, state, escapeHtml)}
          ${learningProfilePanel(context, state, escapeHtml)}
          ${ownerAuditPanel(context, state, escapeHtml)}
          ${cycleDrilldownPanel(context, state, escapeHtml)}
          ${stageAssessmentPanel({ context, state, readiness, plan, escapeHtml })}
          <div class="learning-card-generation-field-list">
            <div><span><strong>图谱目标</strong><small>${escapeHtml(plan.title || plan.targetNodeId || "未选择")}</small></span><em>${escapeHtml(plan.domain || "english")}</em></div>
            <div><span><strong>完成规则</strong><small>提交一次，批改一次，反思最多一次，不设通过线</small></span><em>daily</em></div>
            <div><span><strong>证据要求</strong><small>${escapeHtml(asArray(plan.evidenceRequirements).join(" · ") || "short_answer")}</small></span><em>摘要</em></div>
          </div>
          <pre class="learning-card-generation-structured">${structuredPreview(context, escapeHtml)}</pre>
          <div class="learning-card-generation-actions">
            <button type="button" data-card-generation-refresh>刷新状态</button>
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
    createAutomationProposalCreatePayload,
    createAutomationProposalDecisionPayload,
    createAutomationProposalPublishPayload,
    createAutomationProposalQueryPayload,
    createAutomationDigestQueryPayload,
    createAutomationDigestReviewPayload,
    createRecommendationLifecycleDecisionPayload,
    createDailyLoopDraftPayload,
    createDailyLoopPublishPayload,
    createCycleAuditQueryPayload,
    createCycleHistoryQueryPayload,
    createOwnerCorrectionPayload,
    createReleaseWorkbenchActionPayload,
    createTargetProvisionPayload,
    createStageAssessmentPayload,
    cycleHistoryItemKey,
    cycleAuditHasAnchor,
    isFanfanSampleTarget,
    renderOwnerCardGenerationPanel
  };
})(typeof window !== "undefined" ? window : globalThis);
