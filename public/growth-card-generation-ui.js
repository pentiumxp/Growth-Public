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
      ["Gateway authoring", readiness.gatewayConfigured, "SSE / JSON 输出进入 draft 校验"]
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

  function progressStepRows(activeStep = "prepare", escapeHtml = defaultEscapeHtml) {
    const steps = [
      ["prepare", "准备输入", "学习图谱、掌握度、近期信号"],
      ["gateway", "调用 Gateway", "等待模型返回 authoring draft"],
      ["validation", "校验草稿", "teachingFlow、图谱绑定、隐私扫描"],
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
    if (state.status !== "generating") return "";
    const step = clean(state.progressStep || "prepare") || "prepare";
    const message = clean(state.progressMessage || "正在生成卡片，请稍等。");
    return `<section class="learning-card-generation-progress" data-card-generation-progress role="status" aria-live="polite">
      <div class="learning-card-generation-progress-head">
        <span>
          <strong>正在生成卡片</strong>
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
    const plan = context.suggestedPlan || {};
    return {
      workspace_id: clean(workspaceId || context.target?.workspaceId),
      learner_id: clean(context.target?.learnerId || workspaceId),
      recipe_id: clean(context.selectedRecipeId || "daily_english_v1"),
      target_node_id: clean(plan.targetNodeId),
      target_node_ids: asArray(plan.targetNodeIds),
      card_role: clean(plan.cardRole || "practice"),
      difficulty_band: clean(plan.difficultyBand || "foundation"),
      evidence_requirements: asArray(plan.evidenceRequirements),
      card_schema_version: "growth.card.authoring.v1",
      generation_key: [
        clean(context.selectedRecipeId || "daily_english_v1"),
        clean(workspaceId || context.target?.workspaceId),
        clean(plan.targetNodeId)
      ].filter(Boolean).join(":"),
      completion_policy: {
        mode: "daily_score_once",
        evaluationAttempts: 1,
        reflectionAttempts: 1,
        completionAfter: "first_evaluation",
        rewardMode: "score_proportional",
        passScoreRequired: false
      }
    };
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
    const generating = state.status === "generating";
    const blockedReason = generating ? "" : generationBlockedReason({ state, context, readiness, plan });
    const canGenerate = Boolean(readiness.ready && plan.targetNodeId && !generating && !blockedReason);
    const submitBlocked = Boolean(!generating && !canGenerate);
    const submitClass = `primary${submitBlocked ? " disabled" : ""}`;
    const submitBlockedAttrs = submitBlocked
      ? `data-card-generation-blocked-reason="${escapeHtml(blockedReason)}" aria-disabled="true"`
      : "";
    return `<section class="learning-card-generation-manager" data-card-generation-manager data-card-generation-status="${escapeHtml(state.status || "idle")}" aria-busy="${generating ? "true" : "false"}">
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
          ${learningProfilePanel(context, escapeHtml)}
          ${stageAssessmentPanel({ context, state, readiness, plan, escapeHtml })}
          <div class="learning-card-generation-field-list">
            <div><span><strong>图谱目标</strong><small>${escapeHtml(plan.title || plan.targetNodeId || "未选择")}</small></span><em>${escapeHtml(plan.domain || "english")}</em></div>
            <div><span><strong>完成规则</strong><small>提交一次，批改一次，反思最多一次，不设通过线</small></span><em>daily</em></div>
            <div><span><strong>证据要求</strong><small>${escapeHtml(asArray(plan.evidenceRequirements).join(" · ") || "short_answer")}</small></span><em>摘要</em></div>
          </div>
          <pre class="learning-card-generation-structured">${structuredPreview(context, escapeHtml)}</pre>
          <div class="learning-card-generation-actions">
            <button type="button" data-card-generation-refresh>刷新状态</button>
            <button type="button" class="${submitClass}" data-card-generation-submit ${submitBlockedAttrs} ${generating ? "disabled" : ""}>${generating ? "正在生成" : "生成卡片"}</button>
          </div>
        </section>

        <section class="learning-coin-panel learning-card-generation-preview">
          <div class="learning-section-heading">
            <h3>卡片预览</h3>
            <span>${generated.published?.taskCardId ? "已发布" : "等待生成"}</span>
          </div>
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
    createStageAssessmentPayload,
    isFanfanSampleTarget,
    renderOwnerCardGenerationPanel
  };
})(typeof window !== "undefined" ? window : globalThis);
