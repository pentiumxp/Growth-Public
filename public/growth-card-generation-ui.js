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

  function readinessRows(context = {}, escapeHtml = defaultEscapeHtml) {
    const readiness = context.readiness || {};
    const graph = context.graph || {};
    const rows = [
      ["学习者已开通", readiness.workspaceProvisioned, context.target?.enabled ? "凡凡 sample 已启用" : "当前只开放凡凡 sample"],
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

  function targetRows(targets = [], currentWorkspaceId = "", escapeHtml = defaultEscapeHtml) {
    const rows = asArray(targets).filter((target) => clean(target.workspaceId));
    if (!rows.length) return `<div class="learning-coin-empty">暂无可选学习者。</div>`;
    const activeWorkspaceId = clean(currentWorkspaceId);
    return rows.map((target) => {
      const workspaceId = clean(target.workspaceId);
      const active = activeWorkspaceId ? workspaceId === activeWorkspaceId : Boolean(target.current);
      const enabled = isFanfanSampleTarget(target);
      return `<button type="button" class="learning-card-generation-target${active ? " active" : ""}${enabled ? "" : " disabled"}"
        data-card-generation-target="${escapeHtml(workspaceId)}" ${enabled ? "" : "disabled"}>
        <span>
          <strong>${escapeHtml(target.label || workspaceId)}</strong>
          <small>${escapeHtml(workspaceId)}${enabled ? " · sample" : " · 稍后开放"}</small>
        </span>
        <em>${enabled ? "可生成" : "稍后"}</em>
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
    return targetRows(rows, currentWorkspaceId, escapeHtml);
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

  function recommendationLifecyclePanel(context = {}, escapeHtml = defaultEscapeHtml) {
    const rows = asArray(context.recommendationLifecycle).slice(0, 4);
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
      const label = clean(targets[0] || item.strategy || item.trajectoryId || item.taskCardId || "推荐");
      const status = clean(item.status);
      const resultId = clean(item.generatedTaskCardId || item.supersededByTrajectoryId || item.sourceEvaluationId || item.taskCardId);
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

  function learningProfilePanel(context = {}, escapeHtml = defaultEscapeHtml) {
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
      ${recommendationLifecyclePanel(context, escapeHtml)}
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

  function stageAssessmentPanel({ context = {}, state = {}, readiness = {}, plan = {}, escapeHtml = defaultEscapeHtml } = {}) {
    const stage = state.stageAssessment || {};
    const result = stage.result || stage.eligibility || {};
    const reasonResult = (result.reason || result.activationReason || result.cycle?.activationReason || result.error)
      ? result
      : stage.eligibility || result;
    const busy = stage.status === "checking" || stage.status === "activating";
    const status = clean(result.activationState || result.cycle?.status || stage.status);
    const readyForRequest = Boolean(
      readiness.targetEnabled
      && readiness.workspaceProvisioned
      && readiness.learningGraphReady
      && readiness.historySummaryReady
      && readiness.gatewayConfigured
      && clean(plan.targetNodeId)
    );
    const coverage = asArray(plan.targetNodeIds).length ? asArray(plan.targetNodeIds) : [plan.targetNodeId].filter(Boolean);
    const cooldownUntil = clean(result.cooldownUntil || result.cycle?.cooldownUntil);
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
        <span><small>奖励上限</small><strong>300</strong></span>
        <span><small>完成规则</small><strong>formal</strong></span>
      </div>
      ${cooldownUntil ? `<div class="learning-card-generation-stage-note">冷却至 ${escapeHtml(cooldownUntil.slice(0, 10))}</div>` : ""}
      ${stage.error ? `<div class="learning-error" data-stage-assessment-error>${escapeHtml(stage.error)}</div>` : ""}
      <div class="learning-card-generation-stage-actions">
        <button type="button" data-stage-assessment-check ${busy || !readyForRequest ? "disabled" : ""}>检查条件</button>
        <button type="button" class="primary" data-stage-assessment-activate ${busy || !readyForRequest ? "disabled" : ""}>生成阶段测评</button>
      </div>
      ${publishedTaskCardId ? `<button type="button" class="learning-card-generation-open-card" data-learning-open-growth-task="${escapeHtml(publishedTaskCardId)}">打开阶段测评</button>` : ""}
    </section>`;
  }

  function structuredPreview(context = {}, escapeHtml = defaultEscapeHtml) {
    const plan = context.suggestedPlan || {};
    const policy = context.completionPolicy || {};
    const preview = {
      learningGraphPlan: plan.targetNodeId || "",
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

  function dailyLoopScopeFromContext(context = {}, workspaceId = "") {
    const plan = context.suggestedPlan || {};
    const recommendation = context.nextCardRecommendation || {};
    const defaults = context.generationDefaults || {};
    const targetNodeIds = asArray(recommendation.targetNodeIds).length
      ? asArray(recommendation.targetNodeIds)
      : asArray(plan.targetNodeIds).length
        ? asArray(plan.targetNodeIds)
        : [recommendation.targetNodeId || plan.targetNodeId].filter(Boolean);
    return {
      workspace_id: clean(workspaceId || context.target?.workspaceId),
      learner_id: clean(context.target?.learnerId || workspaceId),
      program_id: clean(context.programId || plan.programId || defaults.programId),
      domain_pack_id: clean(context.domainPackId || plan.domainPackId || defaults.domainPackId),
      domain: clean(recommendation.domain || plan.domain || context.domain || defaults.domain || "english"),
      subject: clean(recommendation.subject || plan.subject || context.subject || defaults.subject || plan.domain || context.domain || "english"),
      horizon: clean(context.horizon || defaults.horizon || "daily_plan"),
      available_minutes: Number(defaults.availableMinutes || context.availableMinutes || 15) || 15,
      target_node_ids: targetNodeIds.map(clean).filter(Boolean).slice(0, 12),
      card_schema_version: clean(defaults.cardSchemaVersion || "growth.card.authoring.v1")
    };
  }

  function createDailyLoopDraftPayload({ context = {}, workspaceId = "" } = {}) {
    const scope = dailyLoopScopeFromContext(context, workspaceId);
    return Object.fromEntries(Object.entries(scope).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return clean(value);
    }));
  }

  function createDailyLoopPublishPayload({ context = {}, workspaceId = "", draftResult = {} } = {}) {
    const scope = dailyLoopScopeFromContext(context, workspaceId);
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

  function createStageAssessmentPayload({ context = {}, workspaceId = "", activationSource = "owner_manual" } = {}) {
    const plan = context.suggestedPlan || {};
    const coverage = asArray(plan.targetNodeIds).length ? asArray(plan.targetNodeIds) : [plan.targetNodeId].filter(Boolean);
    return {
      workspace_id: clean(workspaceId || context.target?.workspaceId),
      learner_id: clean(context.target?.learnerId || workspaceId),
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
          ${learningLoopStatePanel(state, context, escapeHtml)}
          ${learningProfilePanel(context, escapeHtml)}
          ${ownerAuditPanel(context, state, escapeHtml)}
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
    createDailyLoopDraftPayload,
    createDailyLoopPublishPayload,
    createOwnerCorrectionPayload,
    createStageAssessmentPayload,
    isFanfanSampleTarget,
    renderOwnerCardGenerationPanel
  };
})(typeof window !== "undefined" ? window : globalThis);
