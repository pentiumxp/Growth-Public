function e(e){return String(e??``).trim()}function t({location:t,document:n}={}){let r=new URL(t?.href||`http://127.0.0.1/`),i=r.searchParams.get(`embedded`)===`1`||r.searchParams.get(`homeAiEmbedded`)===`1`||!!n?.body?.dataset?.homeAiEmbedded,a=e(r.searchParams.get(`workspace_id`)||r.searchParams.get(`workspaceId`)||n?.body?.dataset?.workspaceId);return{mode:i?`embedded`:`standalone`,embedded:i,workspaceId:a}}function n(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function r(e){return String(e??``).trim()}function i(e){return r(e).toLowerCase().replace(/[-\s]+/g,`_`)}function a(e){return Array.isArray(e)?e:[]}function o(...e){for(let t of e){let e=r(t);if(e)return e}return``}function s(...e){for(let t of e){let e=a(t).map(r).filter(Boolean);if(e.length)return Array.from(new Set(e)).slice(0,12)}return[]}function c(e={}){let t=e.selectors||{},n=s(t.targetNodeIds,e.targetNodeIds,e.nodeIds);return{plan_draft_id:o(t.planDraftId,e.planDraftId),task_card_id:o(t.taskCardId,e.taskCardId),evaluation_id:o(t.evaluationId,e.evaluationId),profile_delta_id:o(t.profileDeltaId,e.profileDeltaId),evidence_id:o(t.evidenceId,e.evidenceId),correction_id:o(t.correctionId,e.correctionId),source_id:o(t.sourceId,e.sourceId,t.evaluationId,e.evaluationId),target_node_ids:n}}function l(e=``){let t=r(e).toLowerCase();return t===`draft_daily_plan`?`起草日常计划`:t===`publish_selected_plan_item`?`发布已选计划`:t===`review_stage_assessment`?`检查阶段测评`:t===`complete_active_stage_assessment`?`完成阶段测评`:t===`complete_cycle_audit`?`补齐审计`:t===`provision_learning_target`?`开通学习目标`:t===`import_or_select_learning_graph`?`选择学习图谱`:t===`configure_planner_gateway`?`配置 Planner`:t===`refresh_learning_context`?`刷新学习上下文`:t===`owner_review`?`Owner 检查`:t||`等待状态`}function u(e=[],t=`暂无记录`,i=n){let o=a(e).slice(0,3);return o.length?o.map(e=>{let t=r(e.nodeId||e.targetNodeId||e.strategy||e.signalType||`记录`),n=r(e.summary||e.performanceSummary||e.reason||e.status||``),a=Number(e.score||0)||0,o=r(e.signalType||e.strategy||e.status||(a?`${a}`:``));return`<div class="learning-card-generation-profile-row">
        <span>
          <strong>${i(t)}</strong>
          <small>${i(n||`summary-only`)}</small>
        </span>
        <em>${i(o||`摘要`)}</em>
      </div>`}).join(``):`<div class="learning-card-generation-profile-empty">${i(t)}</div>`}function d(e={}){let t=r(e.recommendationMode),n=r(e.selectionMode);return t===`trajectory`?`评价轨迹`:t===`profile_strategy`?`画像策略`:n===`recommendation`?`推荐`:n===`strategy`?`画像策略`:n===`graph_suggestion`?`图谱建议`:n===`explicit`?`Owner 指定`:`策略`}function f(e=``){let t=r(e).toLowerCase();return t===`accepted`?`已生成`:t===`superseded`?`已替换`:t===`skipped`?`已跳过`:t===`expired`?`已过期`:t===`pending`?`待生成`:t||`记录`}function p(e=``){let t=r(e).toLowerCase();return t===`submitting`?`记录中`:t===`reviewed`?`已记录`:t===`failed`?`失败`:t||`待操作`}function m(e={},t=n){let i=r(e.actionStatus),a=r(e.actionError),o=(e.actionResult||{}).recommendation||{};if(!i||i===`idle`)return``;let s=i===`reviewed`?`推荐已记录为 ${f(o.status)}。`:i===`submitting`?`正在通过 Growth recommendation lifecycle service 写入。`:a||`推荐状态写入失败。`;return`<div class="learning-card-generation-lifecycle-status" data-recommendation-lifecycle-action-status="${t(i)}">
      <span>${t(s)}</span>
      <em>${t(p(i))}</em>
    </div>`}function h(e={},t={},i=n){let o=a(e.recommendationLifecycle).slice(0,4),s=t.recommendationLifecycle||{},c=s.actionStatus===`submitting`;if(!o.length)return`<div class="learning-card-generation-lifecycle" data-card-generation-lifecycle>
        <div class="learning-card-generation-lifecycle-head">
          <span>
            <strong>推荐闭环</strong>
            <small>等待生成和评价后形成记录</small>
          </span>
          <em>暂无</em>
        </div>
      </div>`;let l=o.map(e=>{let t=r(a(e.targetNodeIds).map(r).filter(Boolean)[0]||e.strategy||e.trajectoryId||e.sourceTaskCardId||e.taskCardId||`推荐`),n=r(e.status),o=n===`pending`,s=r(e.trajectoryId||e.id),l=r(e.sourceTaskCardId||e.taskCardId||e.source_task_card_id||e.task_card_id),u=r(e.sourceEvaluationId||e.evaluationId||e.source_evaluation_id||e.evaluation_id),d=r(e.generatedTaskCardId||e.supersededByTrajectoryId||e.sourceEvaluationId||e.sourceTaskCardId||e.taskCardId),p=r(e.reason)||d||`summary-only`,m=[r(e.strategy),d].filter(Boolean).join(` · `);return`<div class="learning-card-generation-lifecycle-row" data-recommendation-lifecycle-status="${i(n)}">
        <span>
          <strong>${i(t)}</strong>
          <small>${i(p)}</small>
        </span>
        <em>${i(f(n))}</em>
        ${m?`<small>${i(m)}</small>`:``}
        ${o?`<div class="learning-card-generation-lifecycle-actions">
          <button type="button"
            data-recommendation-lifecycle-review
            data-recommendation-lifecycle-trajectory-id="${i(s)}"
            data-recommendation-lifecycle-source-task-card-id="${i(l)}"
            data-recommendation-lifecycle-source-evaluation-id="${i(u)}"
            data-recommendation-lifecycle-status="skipped"
            ${c?`disabled`:``}>${c?`记录中`:`跳过`}</button>
          <button type="button"
            data-recommendation-lifecycle-review
            data-recommendation-lifecycle-trajectory-id="${i(s)}"
            data-recommendation-lifecycle-source-task-card-id="${i(l)}"
            data-recommendation-lifecycle-source-evaluation-id="${i(u)}"
            data-recommendation-lifecycle-status="expired"
            ${c?`disabled`:``}>过期</button>
        </div>`:``}
      </div>`}).join(``);return`<div class="learning-card-generation-lifecycle" data-card-generation-lifecycle>
      <div class="learning-card-generation-lifecycle-head">
        <span>
          <strong>推荐闭环</strong>
          <small>待生成 / 已生成 / 已替换 摘要</small>
        </span>
        <em>${i(String(o.length))}</em>
      </div>
      ${l}
      ${m(s,i)}
    </div>`}function g(e={},t={},i=n){let o=e.nextCardRecommendation||{},s=o.ok!==!1&&r(o.strategy)?o:t||{},c=a(o.targetNodeIds).length?a(o.targetNodeIds):a(s.targetNodeIds),l=r(o.targetNodeId||c[0]||e.suggestedPlan?.targetNodeId||`未选择`),u=r(s.strategy||`stabilize`),f=r(s.cardRole||e.suggestedPlan?.cardRole||`practice`),p=r(s.difficultyBand||e.suggestedPlan?.difficultyBand||`foundation`),m=r(s.reason||e.suggestedPlan?.strategyReason)||`根据当前图谱目标生成一张日常英语练习卡。`;return`<div class="learning-card-generation-recommendation" data-card-generation-recommendation data-recommendation-mode="${i(r(o.recommendationMode||o.selectionMode||``))}">
      <div class="learning-card-generation-recommendation-head">
        <span>
          <strong>下一张建议</strong>
          <small>${i(d(o))}</small>
        </span>
        <em>${i(u)}</em>
      </div>
      <div class="learning-card-generation-recommendation-grid">
        <span><small>目标</small><strong>${i(l)}</strong></span>
        <span><small>角色</small><strong>${i(f)}</strong></span>
        <span><small>难度</small><strong>${i(p)}</strong></span>
      </div>
      <p>${i(m)}</p>
    </div>`}function _(e={},t={},i=n){let a=e.learningProfile||{},o=a.nextCardStrategy||e.nextCardStrategy||{},s=a.summary||{};return`<section class="learning-card-generation-profile" data-card-generation-profile>
      <div class="learning-card-generation-profile-head">
        <span>
          <strong>学习画像</strong>
          <small>${a.ok!==!1&&a.available!==!1?`掌握度、信号和轨迹摘要`:`等待评价后形成画像`}</small>
        </span>
        <em>${i(r(o.strategy)||`stabilize`)}</em>
      </div>
      <div class="learning-card-generation-profile-metrics">
        <span><small>弱点</small><strong>${i(String(Number(s.weaknessCount||0)||0))}</strong></span>
        <span><small>强项</small><strong>${i(String(Number(s.strengthCount||0)||0))}</strong></span>
        <span><small>信号</small><strong>${i(String(Number(s.recentExperienceSignalCount||0)||0))}</strong></span>
      </div>
      <div class="learning-card-generation-profile-columns">
        <div>
          <b>需要加强</b>
          ${u(a.weaknesses,`暂无明显弱点`,i)}
        </div>
        <div>
          <b>近期轨迹</b>
          ${u(a.recentTrajectory,`暂无轨迹`,i)}
        </div>
      </div>
      ${h(e,t,i)}
      ${g(e,o,i)}
    </section>`}function v(e=``){let t=r(e).toLowerCase();return t===`loading`?`读取中`:t===`failed`?`读取失败`:t===`pass`||t===`ready`||t===`ready_for_next_plan`?`可进入下一轮`:t===`blocked`?`待补齐`:t===`missing`?`无完成周期`:t||`待读取`}function y(e=``){let t=r(e).toLowerCase();return t===`draft_daily_plan`?`起草下一张`:t===`owner_review`?`Owner 审核`:t===`produce_completed_daily_cycle`?`完成一轮练习`:t===`complete_cycle_audit`?`补齐审计`:l(t)}function b(e={},t=n){let i=e.summary||{},o=e.evidence||{},s=e.profile||{},c=e.profileDelta||{},l=e.recommendation||{},u=e.loopState||{},d=u.reward||{},f=e.ownerReviewSignal||e.ownerReview||{};return[{key:`evidence`,title:`证据`,detail:`${Number(i.evidenceCount??o.count??0)||0} 条 summary-only evidence`,meta:a(i.evidenceSourceTypes||o.sourceTypes).slice(0,3).join(` · `)||`daily`},{key:`profile_delta`,title:`画像变化`,detail:`${Number(i.profileDeltaCount??c.count??0)||0} 条 delta`,meta:r(i.latestProfileDeltaId||c.latestProfileDeltaId||`profile`)},{key:`reward`,title:`成长币`,detail:`${Number(i.totalRewardCoins??d.totalRewardCoins??0)||0} coins`,meta:`${Number(i.rewardSettlementCount??d.rewardSettlementCount??0)||0} settlements`},{key:`recommendation`,title:`下一推荐`,detail:y(i.nextAction||u.nextAction?.action),meta:r(i.recommendationStrategy||l.strategy||l.targetNodeId||`strategy`)},{key:`owner_review`,title:`Owner 审核`,detail:r(f.latestDecision||f.summary?.latestDecision||f.status||`未审核`),meta:`${Number(f.reviewCount||f.summary?.reviewCount||0)||0} reviews`},{key:`profile`,title:`画像状态`,detail:`${Number(i.profileEvidenceCount??s.evidenceCount??0)||0} evidence`,meta:`${Number(i.profileWeaknessCount??s.weaknessCount??0)||0} weak`}].map(e=>`<div class="learning-card-generation-profile-feedback-row" data-profile-feedback-row="${t(e.key)}">
      <span>
        <strong>${t(e.title)}</strong>
        <small>${t(e.detail)}</small>
      </span>
      <em>${t(e.meta)}</em>
    </div>`).join(``)}function x(e={},t={},i=n){let s=t.profileFeedback||{},l=s.data||e.profileFeedback||{},u=l.summary||{},d=s.status===`loading`?`loading`:s.status===`failed`?`failed`:r(l.status||s.status||`idle`),f=d===`loading`,p=d===`failed`||l.ok===!1,m=a(u.missingRequired||l.missingRequired),h=c(t.cycleHistory?.selectedCycle||{}),g=o(h.task_card_id,h.evaluation_id,h.profile_delta_id,l.selectedCycle?.cycleId,l.target?.taskCardId),_=p?r(s.error||l.error||`profile_feedback_unavailable`):f?`正在读取完成周期的证据、画像变化、奖励和下一推荐。`:l.ok?`本轮练习反馈来自 Growth profile-feedback service。`:`选择一个已完成周期，或让服务只读选择最新 completed cycle。`,x=!!(u.readyForNextPlan||l.readyForNextPlan);return`<section class="learning-card-generation-profile-feedback" data-profile-feedback-panel data-profile-feedback-status="${i(d||`idle`)}">
      <div class="learning-card-generation-profile-feedback-head">
        <span>
          <strong>画像反馈</strong>
          <small>${i(_)}</small>
        </span>
        <em>${i(v(p?`failed`:x?`pass`:d))}</em>
      </div>
      <div class="learning-card-generation-profile-feedback-grid">
        <span><small>完成周期</small><strong>${i(g||r(l.selectedCycle?.cycleId)||`自动选择`)}</strong></span>
        <span><small>证据</small><strong>${i(String(Number(u.evidenceCount||0)||0))}</strong></span>
        <span><small>画像变化</small><strong>${i(String(Number(u.profileDeltaCount||0)||0))}</strong></span>
        <span><small>下一步</small><strong>${i(y(u.nextAction||l.loopState?.nextAction?.action))}</strong></span>
      </div>
      <div class="learning-card-generation-profile-feedback-actions">
        <span>${i(m.length?`待补齐：${m.slice(0,4).join(` · `)}`:x?`已具备进入下一轮计划的 summary-only 证据。`:`还没有完成周期反馈。`)}</span>
        <button type="button" data-profile-feedback-refresh ${f?`disabled`:``}>${f?`读取中`:`刷新反馈`}</button>
      </div>
      <div class="learning-card-generation-profile-feedback-list">
        ${b(l,i)}
      </div>
    </section>`}function S(e){return Array.isArray(e)?e:[]}function C(e=``){let t=r(e).toLowerCase();return t===`loading`?`读取中`:t===`failed`?`读取失败`:t===`ready_to_draft`?`可起草`:t===`ready_to_publish`?`可发布`:t===`stage_checkpoint_ready`?`测评就绪`:t===`stage_checkpoint_active`?`测评进行中`:t===`audit_incomplete`?`补审计`:t===`blocked`?`阻塞`:t===`needs_owner_review`?`需检查`:t||`未读取`}function w(e=``){let t=r(e);return t.startsWith(`next_strategy:`)?`下一张策略：${t.slice(14)}`:{daily_plan_ready:`可以根据当前画像起草一张低压力日常卡。`,validated_plan_ready:`已有验证过的计划项，可以由 Owner 明确发布。`,stage_checkpoint_ready:`近期证据满足阶段测评检查条件。`,stage_checkpoint_active:`已有正式阶段测评卡进行中，先完成这张卡再生成下一步。`,cycle_audit_incomplete:`上一轮学习证据还没有补齐审计闭环。`,target_not_enabled:`当前学习目标还未开通。`,learning_graph_not_ready:`学习图谱目标尚未就绪。`,planner_context_not_ready:`学习上下文还未就绪。`,planner_gateway_not_ready:`Planner Gateway 尚未配置。`,no_safe_automatic_action:`没有安全的自动下一步，需要 Owner 检查。`}[t]||t||`状态来自 Growth learning-loop state，只包含 summary-only 证据。`}function ee(e={},t={},i=n){let a=e.learningLoopState||{},o=a.data||t.learningLoopState||{},s=a.status===`loading`,c=a.status===`failed`,u=c?`failed`:s?`loading`:r(o.status||a.status),d=o.nextAction||{},f=o.profile||{},p=o.audit||{},m=o.stageAssessment||{},h=o.summary||{},g=l(d.action),_=r(m.generatedTaskCardId||d.taskCardId),v=c?r(a.error)||`learning_loop_state_unavailable`:s?`正在读取 daily-loop preview、画像、审计和阶段测评摘要。`:w(d.reason);return`<section class="learning-card-generation-loop-state" data-learning-loop-state-panel data-learning-loop-state-status="${i(u||`idle`)}">
      <div class="learning-card-generation-loop-head">
        <span>
          <strong>学习闭环</strong>
          <small>${i(v)}</small>
        </span>
        <em>${i(C(u))}</em>
      </div>
      <div class="learning-card-generation-loop-grid">
        <span><small>下一步</small><strong>${i(g)}</strong></span>
        <span><small>弱点</small><strong>${i(String(Number(h.weaknessCount??f.weaknessCount??0)||0))}</strong></span>
        <span><small>审计缺口</small><strong>${i(String(S(h.missingRequired||p.missingRequired).length))}</strong></span>
        <span><small>阶段测评</small><strong>${i(m.eligible?`可检查`:C(m.status||`dormant`))}</strong></span>
      </div>
      ${r(m.status)===`active`&&_?`<div class="learning-card-generation-loop-action">
        <span>阶段测评进行中</span>
        <button type="button" class="learning-card-generation-open-card" data-learning-open-growth-task="${i(_)}">打开阶段测评</button>
      </div>`:``}
    </section>`}function te(e){return Array.isArray(e)?e:[]}function ne(e={}){if(!e||typeof e!=`object`)return{};let t=r(e.selectedItemId);return e.selectedItem&&r(e.selectedItem.itemId)?e.selectedItem:te(e.items).find(e=>r(e.itemId)===t)||te(e.items)[0]||{}}function re({state:e={},context:t={}}={}){if(e.status===`loading_context`)return`正在加载生成上下文，请稍候。`;if(!t||!Object.keys(t).length)return`生成上下文还没加载完成，请先刷新状态。`;let n=(e.learningLoopState?.data||t.learningLoopState||{}).nextAction||{},i=r(n.action);return i?n.enabled===!1?w(n.reason):[`draft_daily_plan`,`publish_selected_plan_item`,`review_stage_assessment`].includes(i)?``:`当前 next action 需要在对应面板单独处理。`:`还没有可执行的服务端 next action。`}function ie({state:e={},context:t={},readiness:n={},plan:i={}}={}){return e.status===`loading_context`?`正在加载生成上下文，请稍候。`:!t||!Object.keys(t).length?`生成上下文还没加载完成，请先刷新状态。`:!n.targetEnabled||t.target?.enabled===!1?`请先在左侧选择凡凡，再生成卡片。`:n.workspaceProvisioned?!n.learningGraphReady||!r(i.targetNodeId)?`学习图谱目标尚未就绪，暂不能规划卡片。`:n.historySummaryReady?n.plannerContextReady??!0?n.plannerGatewayConfigured??n.gatewayConfigured?n.blockingOpenGeneration?`已有生成任务正在处理，请稍后再试。`:``:`Planner Gateway 尚未配置，暂不能规划卡片。`:`Planner context 尚未就绪，暂不能规划卡片。`:`历史摘要尚未就绪，暂不能规划卡片。`:`学习者 workspace 尚未开通，暂不能规划卡片。`}function ae({state:e={},context:t={},readiness:n={},draftResult:i={}}={}){let a=i.planDraft||{};return e.status===`loading_context`?`正在加载生成上下文，请稍候。`:!t||!Object.keys(t).length?`生成上下文还没加载完成，请先刷新状态。`:r(a.planDraftId)?r(a.selectedItemId||ne(a).itemId)?n.authoringGatewayConfigured??n.gatewayConfigured?n.blockingOpenGeneration?`已有生成任务正在处理，请稍后再试。`:``:`Gateway authoring 尚未配置，暂不能发布卡片。`:`计划草稿没有可发布的计划项。`:`请先规划下一张，再发布卡片。`}function oe({state:e={},context:t={},readiness:n={},plan:r={}}={}){return ie({state:e,context:t,readiness:n,plan:r})||(n.authoringGatewayConfigured??n.gatewayConfigured?``:`Gateway authoring 尚未配置，暂不能生成卡片。`)}function se({state:e={},context:t={},readiness:n={},plan:i={}}={}){let a=re({state:e,context:t});if(a)return a;let o=r((e.learningLoopState?.data||t.learningLoopState||{}).nextAction?.action);return o===`draft_daily_plan`?oe({state:e,context:t,readiness:n,plan:i}):o===`publish_selected_plan_item`?n.blockingOpenGeneration?`已有生成任务正在处理，请稍后再试。`:n.authoringGatewayConfigured??n.gatewayConfigured?``:`Gateway authoring 尚未配置，暂不能生成卡片。`:o===`review_stage_assessment`?`当前下一步是阶段测评，请使用闭环执行或阶段测评面板。`:`当前服务端 next action 不会直接生成日常卡。`}function ce(e=``,t=n){let i=r(e);return i?`disabled data-card-generation-blocked-reason="${t(i)}" aria-disabled="true"`:``}function le({state:e={},plan:t={},canAdvance:r=!1,canDraft:i=!1,canPublish:a=!1,advanceClass:o=``,draftClass:s=``,publishClass:c=``,advanceBlockedAttrs:l=``,draftBlockedAttrs:u=``,publishBlockedAttrs:d=``,escapeHtml:f=n}={}){return`<section class="learning-card-generation-action-panel" data-card-generation-action-panel>
      <div class="learning-card-generation-action-head">
        <span>
          <strong>生成操作</strong>
          <small>先确认目标和画像，再生成/规划/发布。</small>
        </span>
        <em>${f(r||i||a?`可操作`:`待补齐`)}</em>
      </div>
      <div class="learning-card-generation-field-list learning-card-generation-action-facts">
        <div><span><strong>图谱目标</strong><small>${f(t.title||t.targetNodeId||`未选择`)}</small></span><em>${f(t.domain||`english`)}</em></div>
        <div><span><strong>完成规则</strong><small>提交一次，批改一次，反思最多一次，不设通过线</small></span><em>daily</em></div>
        <div><span><strong>证据要求</strong><small>${f(te(t.evidenceRequirements).join(` · `)||`short_answer`)}</small></span><em>摘要</em></div>
      </div>
      <div class="learning-card-generation-actions">
        <button type="button" data-card-generation-refresh>刷新状态</button>
        <button type="button" class="${o}" data-card-generation-advance ${l} ${e.status===`advancing`?`disabled`:``}>${e.status===`advancing`?`正在生成`:`生成卡片`}</button>
        <button type="button" class="${s}" data-card-generation-draft ${u} ${e.status===`drafting`?`disabled`:``}>${e.status===`drafting`?`正在规划`:`规划下一张`}</button>
        <button type="button" class="${c}" data-card-generation-publish ${d} ${e.status===`publishing`?`disabled`:``}>${e.status===`publishing`?`正在发布`:`发布为卡片`}</button>
      </div>
    </section>`}function ue(e=``){let t=r(e);return t===`loading_context`?`加载中`:t===`drafting`?`规划中`:t===`drafted`?`已规划`:t===`advancing`?`生成中`:t===`publishing`?`发布中`:t===`generating`?`生成中`:t===`published`?`已发布`:t===`failed`?`失败`:`待生成`}function de(e=`prepare`,t=n){let i=[[`context`,`整理上下文`,`图谱、画像、近期信号`],[`planner`,`起草计划`,`Gateway 返回 plan draft`],[`validation`,`校验草稿`,`teachingFlow、图谱绑定、隐私扫描`],[`authoring`,`生成卡片`,`Gateway 返回 authoring draft`],[`publish`,`发布卡片`,`事务写入 Growth SQLite`]],a=Math.max(0,i.findIndex(([t])=>t===r(e)));return i.map(([e,n,r],i)=>{let o=i<a?`done`:i===a?`active`:`pending`;return`<span data-progress-step="${t(e)}" data-progress-state="${o}">
        <em>${i+1}</em>
        <strong>${t(n)}</strong>
        <small>${t(r)}</small>
      </span>`}).join(``)}function fe(e={},t=n){if(!(e.status===`generating`||e.status===`drafting`||e.status===`publishing`||e.status===`advancing`))return``;let i=r(e.progressStep||`context`)||`context`,a=r(e.progressMessage||`正在处理学习闭环，请稍等。`);return`<section class="learning-card-generation-progress" data-card-generation-progress role="status" aria-live="polite">
      <div class="learning-card-generation-progress-head">
        <span>
          <strong>${t(e.status===`drafting`?`正在规划下一张`:e.status===`publishing`?`正在发布卡片`:(e.status,`正在生成卡片`))}</strong>
          <small>${t(a)}</small>
        </span>
        <em>${t(ue(e.status))}</em>
      </div>
      <div class="learning-card-generation-progress-steps">
        ${de(i,t)}
      </div>
    </section>`}var pe=Object.freeze([`weixin_stephen`,`weixin_fanfan`]);function me(e={}){let t=[e.workspaceId,e.growthWorkspaceId,e.learnerId,e.displayName,e.label].map(r).join(` `).toLowerCase();return/\bfan[\s_-]*fan\b/.test(t)||t.includes(`fanfan`)||t.includes(`凡凡`)}function he(e={}){return e?.enabled===!0||e?.targetEnabled===!0?!0:me(e)}function ge(e=[],t=``){return(Array.isArray(e)?e:[]).find(e=>r(e.workspaceId)===r(t))||null}function _e(e=[],t=pe){return r((Array.isArray(e)?e:[]).find(he)?.workspaceId||t[0])}function ve({viewTargets:e=[],currentWorkspaceId:t=``}={}){let n=ge(e,t);return!!(n&&he(n))}function ye({pageState:e={},viewTargets:t=[],currentWorkspaceId:n=``,sampleWorkspaceIds:i=pe}={}){return r(e.cardGeneration?.selectedWorkspaceId)||r(e.cardGeneration?.context?.target?.workspaceId)||(e.auth?.isOwner&&!ve({viewTargets:t,currentWorkspaceId:n})?_e(t,i):r(n))}function be({pageState:e={},viewTargets:t=[],currentWorkspaceId:n=``,sampleWorkspaceIds:i=pe}={}){let a=ye({pageState:e,viewTargets:t,currentWorkspaceId:n,sampleWorkspaceIds:i}),o=e.cardGeneration?.context?.target||null;if(r(o?.workspaceId)===a&&o?.enabled===!0)return!0;let s=ge(t,a)||(r(o?.workspaceId)===a?o:null)||{workspaceId:a};return!!(s&&he(s))}function xe(e={},t={}){let n=e.targetProvisioning||{},i=n.graphOptions||e.graphOptions||{},a=r(t.domainPackId||t.domain_pack_id||n.selectedDomainPackId||i.selectedDomainPackId||e.domainPackId),o=Array.isArray(i.domainPacks)?i.domainPacks:[],s=o.find(e=>r(e.domainPackId||e.domain_pack_id)===a)||o[0]||{},c=Array.isArray(s.subjects)&&s.subjects.length?s.subjects:Array.isArray(i.subjects)?i.subjects:[];return{domainPackId:a||r(s.domainPackId||s.domain_pack_id),domain:r(t.domain||n.selectedDomain||i.selectedDomain||s.domain||e.domain),subject:r(t.subject||n.selectedSubject||i.selectedSubject||c[0]||e.subject),recipeId:r(t.recipeId||t.recipe_id||e.selectedRecipeId),status:r(t.status||`idle`),result:t.result||null,error:r(t.error),packs:o,subjects:c.map(r).filter(Boolean).slice(0,40),pack:s}}function Se(e={}){return xe(e.cardGeneration?.context||{},e.cardGeneration?.targetProvisionDraft||{})}function Ce(e){return Array.isArray(e)?e:[]}function we(e=``){let t=r(e).toLowerCase();return t===`sample_default`?`sample`:t===`explicit_provision`?`已开通`:t===`not_provisioned`?`未开通`:t||`未确认`}function Te(e=``){let t=r(e);return{learning_target_not_provisioned:`该学习者还没有开通这个学习目标。`,learning_domain_pack_options_unavailable:`当前没有可用的知识图谱 domain pack。`,learning_domain_pack_not_provisioned:`该 domain pack 尚未为这个学习者开通。`,learning_domain_pack_not_found:`选择的 domain pack 不存在。`,learning_subject_not_provisioned:`该科目尚未为这个学习者开通。`,learning_subject_not_found:`选择的科目不在这个 domain pack 中。`,learning_target_node_not_in_provision:`选择的图谱节点不属于已开通范围。`,learning_target_workspace_required:`缺少目标学习者 workspace。`,learning_target_provision_repository_unavailable:`目标开通仓库不可用。`}[t]||t||`目标开通状态来自 Growth provisioning service。`}function Ee(e=``){let t=r(e).toLowerCase();return t===`loading`?`加载中`:t===`submitting`?`开通中`:t===`submitted`?`已开通`:t===`failed`?`失败`:`待确认`}function De(e=[],t=``,i={},a=n){let o=Ce(e).filter(e=>r(e.workspaceId));if(!o.length)return`<div class="learning-coin-empty">暂无可选学习者。</div>`;let s=r(t),c=i.target||{},l=i.targetProvisioning||{};return o.map(e=>{let t=r(e.workspaceId),n=s?t===s:!!e.current,i=r(c.workspaceId)===t,o=!!(e.targetEnabled||e.enabled||me(e)||i&&c.enabled),u=i?r(l.mode):``,d=o?we(u||(me(e)?`sample_default`:`explicit_provision`)):`可开通`;return`<button type="button" class="learning-card-generation-target${n?` active`:``}${o?``:` needs-provision`}"
        data-card-generation-target="${a(t)}">
        <span>
          <strong>${a(e.label||t)}</strong>
          <small>${a(t)}${o?` · ${d}`:` · 需开通`}</small>
        </span>
        <em>${a(d)}</em>
      </button>`}).join(``)}function Oe({targets:e=[],context:t={},currentWorkspaceId:i=``,escapeHtml:a=n}={}){let o=Ce(e).filter(e=>r(e.workspaceId)),s=t.target||{},c=r(s.workspaceId);return c&&!o.some(e=>r(e.workspaceId)===c)&&o.push({workspaceId:c,learnerId:s.learnerId,displayName:s.displayName,label:s.displayName||c,enabled:s.enabled,current:c===r(i)}),De(o,i,t,a)}function ke(e={},t={},i=n){let a=e.targetProvisioning||{},o=xe(e,t.targetProvisionDraft||{}),s=r(t.targetProvisionDraft?.status||`idle`),c=a.targetEnabled===!0||e.target?.enabled===!0,l=s===`loading`||s===`submitting`,u=o.packs.map(e=>{let t=r(e.domainPackId||e.domain_pack_id),n=r(e.title||e.domain||t);return`<option value="${i(t)}"${t===o.domainPackId?` selected`:``}>${i(n)}</option>`}).join(``),d=o.subjects.map(e=>`<option value="${i(e)}"${e===o.subject?` selected`:``}>${i(e)}</option>`).join(``),f=!!(o.domainPackId&&o.subject&&!l),p=r(t.targetProvisionDraft?.error)||(c?`${we(a.mode)} · ${o.domainPackId||`domain pack`} · ${o.subject||`subject`}`:Te(a.error||`learning_target_not_provisioned`));return`<section class="learning-card-generation-provisioning" data-card-generation-target-provisioning data-target-provisioning-enabled="${c?`true`:`false`}">
      <div class="learning-card-generation-provisioning-head">
        <span>
          <strong>学习目标</strong>
          <small>${i(p)}</small>
        </span>
        <em>${i(c?`可规划`:Ee(s))}</em>
      </div>
      <div class="learning-card-generation-provisioning-grid">
        <label>
          <span>Domain pack</span>
          <select data-card-generation-domain-pack ${l||!o.packs.length?`disabled`:``}>
            ${u||`<option value="">暂无 domain pack</option>`}
          </select>
        </label>
        <label>
          <span>Subject</span>
          <select data-card-generation-subject ${l||!o.subjects.length?`disabled`:``}>
            ${d||`<option value="">暂无 subject</option>`}
          </select>
        </label>
      </div>
      <div class="learning-card-generation-provisioning-actions">
        <span>${i(c?`选择会刷新上下文，规划仍由服务端决定图谱节点。`:`Owner 需要先显式开通该学习者的目标范围。`)}</span>
        <button type="button" data-card-generation-apply-target ${l||!o.domainPackId?`disabled`:``}>应用选择</button>
        <button type="button" class="primary" data-card-generation-provision-target ${f?``:`disabled`}>${l?`处理中`:c?`更新开通`:`开通目标`}</button>
      </div>
    </section>`}function Ae(e){return Array.isArray(e)?e:[]}function je(e={},t=n){let r=e.readiness||{},i=e.graph||{},a=e.targetProvisioning||{},o=a.targetEnabled?`${we(a.mode)} · ${a.selectedSubject||a.selectedDomain||`默认目标`}`:Te(a.error||`learning_target_not_provisioned`);return[[`学习目标`,r.targetEnabled,o],[`学习图谱`,r.learningGraphReady,`${Number(i.nodeCount||0)} 节点 / ${Number(i.edgeCount||0)} 关系`],[`历史摘要`,r.historySummaryReady,`只读取卡片、评价、反思和掌握度摘要`],[`Planner context`,r.plannerContextReady??r.learningGraphReady,`图谱、画像和近期信号摘要`],[`Planner Gateway`,r.plannerGatewayConfigured??r.gatewayConfigured,`只通过 Gateway 起草学习计划`],[`Gateway authoring`,r.authoringGatewayConfigured??r.gatewayConfigured,`SSE / JSON 输出进入 draft 校验`],[`Gateway evaluation`,r.evaluationGatewayConfigured,`批改 draft 先校验再写入画像`]].map(([e,n,r])=>`<div class="learning-card-generation-readiness-row" data-ready="${n?`true`:`false`}">
      <span><strong>${t(e)}</strong><small>${t(r)}</small></span>
      <em>${n?`通过`:`待处理`}</em>
    </div>`).join(``)}function Me(e={},t=n){let i=r(e.selectedRecipeId||`daily_english_v1`);return Ae(e.recipes).map(e=>{let n=r(e.id),a=n===i,o=e.durationMinutes?`${e.durationMinutes.min||10}-${e.durationMinutes.max||15} 分钟`:`10-15 分钟`;return`<div class="learning-card-generation-recipe${a?` active`:``}" data-card-generation-recipe="${t(n)}">
        <strong>${t(e.label||n)}</strong>
        <small>${t(`${o} · 低压力`)}</small>
      </div>`}).join(``)}function Ne(e={},t=n){let r=e.historySummary?.learnerSummary||{},i=e.learningProfile?.summary||{};return[[`近期卡片`,r.recentCardCount],[`已完成`,r.completedRecentCardCount],[`画像点`,i.masteryStateCount??e.historySummary?.masteryStateCount],[`轨迹`,i.recentTrajectoryCount??e.historySummary?.recentTrajectoryCount]].map(([e,n])=>`<span><small>${t(e)}</small><strong>${t(String(Number(n||0)||0))}</strong></span>`).join(``)}function T(e){return Array.isArray(e)?e:[]}function E(...e){for(let t of e){let e=r(t);if(e)return e}return``}function Pe(...e){for(let t of e){let e=T(t).map(r).filter(Boolean);if(e.length)return Array.from(new Set(e)).slice(0,12)}return[]}function Fe(e={},t=``){let n=e[t]||{};return T(n.items||n.profileDeltas||n.corrections||n.planDrafts)}function Ie(e={},t=0){let n=e.selectors||{};return[n.taskCardId||e.taskCardId,n.evaluationId||e.evaluationId,n.profileDeltaId||e.profileDeltaId,n.planDraftId||e.planDraftId,n.correctionId||e.correctionId,t].map(r).filter(Boolean).join(`:`)||`cycle:${t}`}function Le({context:e={},workspaceId:t=``,draftResult:n={},publishResult:i={},generatedResult:a={},selectedCycle:o={}}={}){let s=e.ownerAudit||{},l=Fe(s,`planAudit`)[0]||{},u=Fe(s,`profileDeltaAudit`)[0]||{},d=Fe(s,`profileCorrections`)[0]||{},f=e.suggestedPlan||{},p=e.nextCardRecommendation||{},m=e.generationDefaults||{},h=i.planDraft||n.planDraft||{},g=i.generation||a||{},_=g.published||{},v=ne(h),y=c(o||{}),b=Pe(y.target_node_ids,u.targetNodeIds,d.targetNodeIds,v.targetNodeIds,h.targetNodeIds,p.targetNodeIds,f.targetNodeIds,[p.targetNodeId||f.targetNodeId]),x={workspace_id:E(t,e.target?.workspaceId),learner_id:E(e.target?.learnerId,t),program_id:E(e.programId,u.programId,l.programId,f.programId,m.programId),plan_draft_id:E(y.plan_draft_id,h.planDraftId,l.planDraftId),task_card_id:E(y.task_card_id,_.taskCardId,g.taskCardId,a.taskCardId,h.generatedTaskCardId,l.generatedTaskCardId,u.taskCardId,d.taskCardId),evaluation_id:E(y.evaluation_id,u.evaluationId,d.evaluationId),profile_delta_id:E(y.profile_delta_id,u.profileDeltaId,d.profileDeltaId),evidence_id:E(y.evidence_id,Pe(u.evidenceIds,d.evidenceIds)[0]),correction_id:E(y.correction_id,d.correctionId),source_id:E(y.source_id,u.evaluationId,d.evaluationId),target_node_ids:b,limit:20};return Object.fromEntries(Object.entries(x).filter(([,e])=>Array.isArray(e)?e.length>0:r(e)))}function Re(e={}){return[e.plan_draft_id,e.task_card_id,e.evaluation_id,e.profile_delta_id,e.evidence_id,e.correction_id,e.source_id].some(e=>r(e))}function ze(e=``){let t=r(e).toLowerCase();return t===`loading`?`读取中`:t===`ready`?`已读取`:t===`failed`?`失败`:`待读取`}function Be(e=``){let t=r(e).toLowerCase();return t===`plan`?`计划`:t===`plan_publish_attempt`?`发布尝试`:t===`evidence`?`评价证据`:t===`profile_delta`?`画像变化`:t===`correction`?`Owner 纠偏`:t||`记录`}function Ve(e=``){let t=r(e);return{plan_publication:`计划发布`,publish_attempt_visibility:`发布尝试可见`,evaluation_evidence:`评价证据`,profile_delta_audit:`画像变化审计`,partial_failures:`下游审计服务`,privacy_projection:`隐私投影`,owner_correction_optional:`Owner 纠偏`,next_recommendation_optional:`下一张建议`}[t]||t||`检查项`}function He(e=[],t=n){let i=T(e).slice(0,6);return i.length?i.map(e=>{let n=Be(e.type),i=r(e.id||e.planDraftId||e.taskCardId||e.evaluationId||e.profileDeltaId||e.correctionId),a=r(e.summary||e.error||e.status||e.at||`summary-only`),o=r(e.status||e.at||`记录`);return`<div class="learning-card-generation-cycle-row" data-cycle-timeline-type="${t(r(e.type))}">
        <span>
          <strong>${t(n)}${i?` · ${t(i)}`:``}</strong>
          <small>${t(a)}</small>
        </span>
        <em>${t(o)}</em>
      </div>`}).join(``):`<div class="learning-card-generation-cycle-empty">暂无单卡 timeline。完成提交和批改后再刷新。</div>`}function Ue(e=[],t=n){let r=T(e).slice(0,8);return r.length?r.map(e=>{let n=e.ok!==!1;return`<div class="learning-card-generation-cycle-finding" data-cycle-finding-ok="${n?`true`:`false`}">
        <span>
          <strong>${t(Ve(e.code))}</strong>
          <small>${t(e.remediation||e.code||`summary-only`)}</small>
        </span>
        <em>${t(n?`通过`:`待补齐`)}</em>
      </div>`}).join(``):`<div class="learning-card-generation-cycle-empty">暂无完整性检查结果。</div>`}function We(e={},t=``,i=n){let a=T(e.data?.cycles||e.cycles).slice(0,6),o=r(e.status||(e.data?`ready`:`idle`));return o===`loading`?`<div class="learning-card-generation-cycle-empty">正在读取历史周期。</div>`:o===`failed`?`<div class="learning-card-generation-cycle-empty">历史周期读取失败：${i(r(e.error)||`cycle_history_failed`)}</div>`:a.length?a.map((e,n)=>{let a=Ie(e,n),o=e.selectors||{},s=e.counts||{},c=a===t,l=E(o.taskCardId,e.taskCardId,o.evaluationId,e.evaluationId,`cycle ${n+1}`),u=E(e.summary,o.planDraftId,o.profileDeltaId,o.correctionId,`summary-only history`),d=[Number(s.evidence||0)?`${Number(s.evidence||0)} evidence`:``,Number(s.profileDeltas||0)?`${Number(s.profileDeltas||0)} delta`:``,Number(s.corrections||0)?`${Number(s.corrections||0)} correction`:``].filter(Boolean).join(` · `)||r(e.updatedAt||e.createdAt||`history`);return`<button type="button" class="learning-card-generation-cycle-history-row" data-card-generation-cycle-history-select data-cycle-history-key="${i(a)}" data-cycle-history-selected="${c?`true`:`false`}">
        <span>
          <strong>${i(l)}</strong>
          <small>${i(u)}</small>
        </span>
        <em>${i(d)}</em>
      </button>`}).join(``):`<div class="learning-card-generation-cycle-empty">暂无可选择的历史周期。</div>`}function Ge(e={},t={},i=n){let a=t.cycleDrilldown||{},o=t.cycleHistory||{},s=r(o.selectedCycleKey),c=Le({context:e,workspaceId:t.selectedWorkspaceId||e.target?.workspaceId,draftResult:t.dailyLoopDraftResult||{},publishResult:t.dailyLoopPublishResult||{},generatedResult:t.generatedResult||{},selectedCycle:o.selectedCycle||{}}),l=r(a.status||`idle`),u=a.audit||{},d=a.completeness||{},f=u.summary||d.cycleAudit?.summary||{},p=T((d.summary||{}).missingRequired),m=T(u.timeline).length?u.timeline:d.cycleAudit?.timeline,h=E(c.task_card_id,c.evaluation_id,c.plan_draft_id,c.profile_delta_id,c.evidence_id,c.correction_id),g=Re(c),_=l===`loading`,v=_||!g,y=d.complete===!0?`完整`:d.ok===!0?`待补齐`:`未确认`,b=r(a.error)||(_?`正在读取 Growth 单卡审计和完整性检查。`:g?`读取某张卡从计划、评价到画像变化的 summary-only 证据。`:`等待已发布卡片或评价证据后读取。`);return`<section class="learning-card-generation-cycle-drilldown" data-card-generation-cycle-drilldown data-cycle-drilldown-status="${i(l||`idle`)}">
      <div class="learning-card-generation-cycle-head">
        <span>
          <strong>单卡闭环审计</strong>
          <small>${i(b)}</small>
        </span>
        <em>${i(ze(l))}</em>
      </div>
      <div class="learning-card-generation-cycle-grid">
        <span><small>卡片</small><strong>${i(h||`等待卡片`)}</strong></span>
        <span><small>计划</small><strong>${i(String(Number(f.planDraftCount||0)||0))}</strong></span>
        <span><small>评价</small><strong>${i(String(Number(f.evidenceCount||0)||0))}</strong></span>
        <span><small>缺口</small><strong>${i(String(p.length))}</strong></span>
      </div>
      <div class="learning-card-generation-cycle-actions">
        <span>${i(d.readyForAutomation?`审计完整，可作为后续自动化证据`:`完整性：${y}`)}</span>
        <button type="button" class="primary" data-card-generation-cycle-audit-refresh ${v?`disabled aria-disabled="true" data-card-generation-blocked-reason="${i(g?`正在读取审计，请稍候。`:`还没有可读取的单卡 cycle anchor。`)}"`:``}>${_?`读取中`:`读取单卡审计`}</button>
      </div>
      <div class="learning-card-generation-cycle-history" data-card-generation-cycle-history data-cycle-history-status="${i(o.status||`idle`)}">
        <div class="learning-card-generation-cycle-history-head">
          <span>历史周期</span>
          <button type="button" data-card-generation-cycle-history-refresh ${o.status===`loading`?`disabled`:``}>${o.status===`loading`?`读取中`:`刷新历史`}</button>
        </div>
        <div class="learning-card-generation-cycle-history-list">
          ${We(o,s,i)}
        </div>
      </div>
      <div class="learning-card-generation-cycle-columns">
        <div>
          <b>Timeline</b>
          ${He(m,i)}
        </div>
        <div>
          <b>Completeness</b>
          ${Ue(d.findings,i)}
        </div>
      </div>
    </section>`}function D(e){return Array.isArray(e)?e:[]}function Ke(...e){for(let t of e){let e=r(t);if(e)return e}return``}function qe(...e){for(let t of e){let e=D(t).map(r).filter(Boolean);if(e.length)return Array.from(new Set(e)).slice(0,12)}return[]}function Je(e={}){return(e.targetProvisioning||{}).graphOptions||e.graphOptions||{}}function Ye(e={},t=``){let n=e.suggestedPlan||{},i=e.generationDefaults||{},a=e.targetProvisioning||{},o=Je(e);return{workspace_id:r(t||e.target?.workspaceId),learner_id:r(e.target?.learnerId||t),program_id:r(e.programId||n.programId||i.programId),domain_pack_id:r(a.selectedDomainPackId||o.selectedDomainPackId||e.domainPackId||n.domainPackId||i.domainPackId),domain:r(a.selectedDomain||o.selectedDomain||n.domain||e.domain||i.domain),subject:r(a.selectedSubject||o.selectedSubject||n.subject||e.subject||i.subject||n.domain||e.domain),horizon:r(e.horizon||i.horizon||`daily_plan`)}}function Xe({context:e={},workspaceId:t=``,selectedCycle:n={}}={}){let i=e.suggestedPlan||{},a=e.generationDefaults||{},o=e.nextCardRecommendation||{},s=Ye(e,t),l=c(n||{}),u=qe(l.target_node_ids,o.targetNodeIds,i.targetNodeIds,[o.targetNodeId||i.targetNodeId]),d=Object.assign({},s,{available_minutes:Ke(a.availableMinutes,e.availableMinutes,15),low_pressure:!0,requested_by:`owner`,source_plan_draft_id:l.plan_draft_id,source_task_card_id:l.task_card_id,source_evaluation_id:l.evaluation_id,profile_delta_id:l.profile_delta_id,evidence_id:l.evidence_id,correction_id:l.correction_id,source_id:l.source_id,source_target_node_ids:l.target_node_ids,target_node_ids:u});return Object.fromEntries(Object.entries(d).filter(([,e])=>Array.isArray(e)?e.length>0:r(e)))}function Ze(e=``){let t=r(e).toLowerCase();return t===`loading`?`读取中`:t===`proposed`?`待复核`:t===`accepted`?`已接受`:t===`skipped`?`已跳过`:t===`expired`?`已过期`:t===`superseded`?`已替代`:t===`publishing`?`发布中`:t===`published`?`已发布`:t===`created`?`已生成`:t===`blocked`?`已阻塞`:t===`failed`?`失败`:t||`待建议`}function Qe(e={},t=n){let i=r(e.actionStatus),a=r(e.actionError),o=(e.actionResult||{}).proposal||{};if(!i||i===`idle`)return``;let s=o.execution||{},c=i===`published`?`建议已发布${r(s.generatedTaskCardId)?`：${r(s.generatedTaskCardId)}`:`。`}`:i===`created`?`已生成自动化建议${r(o.proposalId||o.proposal_id)?`：${r(o.proposalId||o.proposal_id)}`:`。`}`:i===`reviewed`?`建议已记录为 ${Ze(o.status)}。`:i===`submitting`?`正在通过 Growth automation proposal service 写入。`:a||`建议操作失败。`;return`<div class="learning-card-generation-proposal-status" data-automation-proposal-action-status="${t(i)}">
      <span>${t(c)}</span>
      <em>${t(Ze(i))}</em>
    </div>`}function $e(e={},t=n){let i=e.data||{},a=D(i.proposals).slice(0,5),o=r(e.status||(i.ok?`ready`:`idle`)),s=e.actionStatus===`submitting`;return o===`loading`?`<div class="learning-card-generation-proposal-empty">正在读取自动化建议。</div>`:o===`failed`?`<div class="learning-card-generation-proposal-empty">自动化建议读取失败：${t(r(e.error)||`automation_proposals_failed`)}</div>`:a.length?a.map(e=>{let n=r(e.proposalId||e.proposal_id),i=r((e.execution||{}).status),a=r(e.status)===`proposed`,o=r(e.status)===`accepted`&&i!==`published`,c=D(e.targetNodeIds||e.target_node_ids).map(r).filter(Boolean),l=r(e.proposalSummary||n||`下一张建议`),u=r(e.rationale?.plan?.reason||e.rationale?.plan?.selectedItemId||e.planDraftId||`summary-only proposal`),d=[r(e.status),i,r(e.planDraftId)].filter(Boolean).join(` · `)||`proposal`;return`<div class="learning-card-generation-proposal-row" data-automation-proposal-row data-automation-proposal-id="${t(n)}">
        <span>
          <strong>${t(l)}</strong>
          <small>${t(u)}</small>
          <small>${t(c.join(` · `)||`bounded graph target`)}</small>
        </span>
        <em>${t(d)}</em>
        <div class="learning-card-generation-proposal-actions">
          ${[`accepted`,`skipped`,`expired`,`superseded`].map(e=>{let r=s?`建议操作正在写入。`:a?``:`只有待复核建议可以记录决策。`,i=e===`accepted`?`接受`:e===`skipped`?`跳过`:e===`expired`?`过期`:`替代`;return`<button type="button" class="${r?`disabled`:``}" data-automation-proposal-review data-automation-proposal-id="${t(n)}" data-automation-proposal-status="${t(e)}" ${r?`aria-disabled="true" data-automation-proposal-blocked-reason="${t(r)}"`:``}>${t(i)}</button>`}).join(``)}
          <button type="button" class="primary${s||!o?` disabled`:``}" data-automation-proposal-publish data-automation-proposal-id="${t(n)}" ${s||!o?`aria-disabled="true" data-automation-proposal-blocked-reason="${t(s?`建议操作正在写入。`:i===`published`?`建议已经发布。`:`只有已接受且未发布的建议可以发布。`)}"`:``}>${s&&o?`发布中`:i===`published`?`已发布`:`发布`}</button>
        </div>
      </div>`}).join(``):`<div class="learning-card-generation-proposal-empty">暂无可复核的自动化建议。完成一张卡并生成 proposal 后会显示在这里。</div>`}function et(e={},t={},i=n){let a=t.automationProposals||{},o=a.data||{},s=D(o.proposals),c=s.filter(e=>r(e.status)===`proposed`).length,l=s.filter(e=>r(e.status)===`accepted`).length,u=s.filter(e=>r(e.execution?.status)===`published`).length,d=r(a.status||(o.ok?`ready`:`idle`)),f=t.cycleHistory?.selectedCycle||{},p=Xe({context:e,workspaceId:t.selectedWorkspaceId||e.target?.workspaceId,selectedCycle:f}),m=Re({plan_draft_id:p.source_plan_draft_id,task_card_id:p.source_task_card_id,evaluation_id:p.source_evaluation_id,profile_delta_id:p.profile_delta_id,evidence_id:p.evidence_id,correction_id:p.correction_id,source_id:p.source_id}),h=a.actionStatus===`submitting`,g=d===`loading`?`正在读取 Owner 可复核的下一张建议。`:d===`failed`?r(a.error)||`automation_proposals_failed`:c?`Owner 需要复核 AI 建议后再发布。`:m?`可从选中的完整周期生成下一张建议。`:`没有待复核建议；请选择一个完整历史周期后生成 proposal。`;return`<section class="learning-card-generation-proposals" data-automation-proposal-panel data-automation-proposal-status="${i(d||`idle`)}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>自动化建议</strong>
          <small>${i(g)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" class="${h||!m?`disabled`:``}" data-automation-proposal-create ${h||!m?`aria-disabled="true" data-automation-proposal-blocked-reason="${i(m?`建议操作正在写入。`:`请先在历史周期里选择一个完整周期。`)}"`:``}>${h&&m?`生成中`:`生成建议`}</button>
          <button type="button" data-automation-proposal-refresh ${d===`loading`?`disabled`:``}>${d===`loading`?`读取中`:`刷新建议`}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>待复核</small><strong>${i(String(c))}</strong></span>
        <span><small>已接受</small><strong>${i(String(l))}</strong></span>
        <span><small>已发布</small><strong>${i(String(u))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${$e(a,i)}
      </div>
      ${Qe(a,i)}
    </section>`}function tt(e=``){let t=r(e).toLowerCase();return t===`loading`?`读取中`:t===`pending`?`待复核`:t===`reviewed`?`已复核`:t===`archived`?`已归档`:t===`superseded`?`已替代`:t===`created`?`已生成`:t===`failed`?`失败`:t||`待摘要`}function nt(e={},t=n){let i=r(e.actionStatus),a=r(e.actionError),o=(e.actionResult||{}).digest||{};if(!i||i===`idle`)return``;let s=i===`created`?`Digest 已生成，等待 Owner 复核。`:i===`reviewed`?`Digest 已记录为 ${tt(o.status)}。`:i===`submitting`?`正在通过 Growth automation digest service 写入。`:a||`Digest 操作失败。`;return`<div class="learning-card-generation-proposal-status" data-automation-digest-action-status="${t(i)}">
      <span>${t(s)}</span>
      <em>${t(tt(i))}</em>
    </div>`}function rt(e={},t=n){let i=e.data||{},a=D(i.digests).slice(0,5),o=r(e.status||(i.ok?`ready`:`idle`)),s=e.actionStatus===`submitting`;return o===`loading`?`<div class="learning-card-generation-proposal-empty">正在读取自动化 digest。</div>`:o===`failed`?`<div class="learning-card-generation-proposal-empty">自动化 digest 读取失败：${t(r(e.error)||`automation_digests_failed`)}</div>`:a.length?a.map(e=>{let n=r(e.digestId||e.digest_id),i=r(e.status),a=i===`pending`,o=e.summary||{},c=D(e.requiredActions||e.required_actions),l=D(e.blocked),u=D(e.candidates),d=c[0]||{},f=l[0]||{},p=r(n||`自动化 digest`),m=r(d.proposalId||d.proposal_id||f.reason||f.decision||e.createdAt||e.created_at||`summary-only digest`),h=[`would ${Number(o.wouldPublish||o.would_publish||0)||0}`,`blocked ${Number(o.blocked||0)||0}`,`skipped ${Number(o.skipped||0)||0}`,`actions ${Number(o.requiredActions||o.required_actions||c.length||0)||0}`].join(` · `),g=r(e.subject||e.domain||e.domainPackId||e.domain_pack_id||`bounded scope`);return`<div class="learning-card-generation-proposal-row" data-automation-digest-row data-automation-digest-id="${t(n)}">
        <span>
          <strong>${t(p)}</strong>
          <small>${t(m)}</small>
          <small>${t(`${g} · ${h}`)}</small>
          ${u.length?`<small>${t(`候选 ${u.length} · 手动发布，不自动执行`)}</small>`:``}
        </span>
        <em>${t(i||`digest`)}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-digest-review data-automation-digest-id="${t(n)}" data-automation-digest-status="reviewed" ${s||!a?`disabled`:``}>复核</button>
          <button type="button" data-automation-digest-review data-automation-digest-id="${t(n)}" data-automation-digest-status="archived" ${s||!a?`disabled`:``}>归档</button>
          <button type="button" data-automation-digest-review data-automation-digest-id="${t(n)}" data-automation-digest-status="superseded" ${s||!a?`disabled`:``}>替代</button>
        </div>
      </div>`}).join(``):`<div class="learning-card-generation-proposal-empty">暂无自动化 digest。生成并接受 proposal 后，后端 dry-run digest 会显示在这里。</div>`}function it(e={},t={},i=n){let a=t.automationDigests||{},o=a.data||{},s=D(o.digests),c=s.filter(e=>r(e.status)===`pending`).length,l=s.filter(e=>r(e.status)===`reviewed`).length,u=s.reduce((e,t={})=>e+D(t.requiredActions||t.required_actions).length,0),d=r(a.status||(o.ok?`ready`:`idle`)),f=a.actionStatus===`submitting`,p=d===`loading`?`正在读取自动化 digest。`:d===`failed`?r(a.error)||`automation_digests_failed`:c?`Owner 可以复核 digest，但不会自动发布或通知。`:`暂无待复核 digest；可以从当前 dry-run 摘要生成一条待复核 digest。`;return`<section class="learning-card-generation-proposals learning-card-generation-digests" data-automation-digest-panel data-automation-digest-status="${i(d||`idle`)}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>自动化 Digest</strong>
          <small>${i(p)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-digest-create ${f?`disabled`:``}>${f?`生成中`:`生成 Digest`}</button>
          <button type="button" data-automation-digest-refresh ${d===`loading`?`disabled`:``}>${d===`loading`?`读取中`:`刷新 Digest`}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>待复核</small><strong>${i(String(c))}</strong></span>
        <span><small>已复核</small><strong>${i(String(l))}</strong></span>
        <span><small>手动动作</small><strong>${i(String(u))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${rt(a,i)}
      </div>
      ${nt(a,i)}
    </section>`}function at(e=``){let t=r(e).toLowerCase();return t===`loading`?`读取中`:t===`draft`?`草稿`:t===`active`?`已激活`:t===`archived`?`已归档`:t===`superseded`?`已替代`:t===`created`?`已创建`:t===`reviewed`?`已复核`:t===`failed`?`失败`:t===`failure_policy_ready`?`策略已就绪`:t===`missing_active_failure_policy`?`缺少激活策略`:t||`待策略`}function ot(e={},t=n){let i=r(e.actionStatus),a=r(e.actionError),o=(e.actionResult||{}).policy||{};if(!i||i===`idle`)return``;let s=i===`created`?`失败策略已创建：${r(o.policyId||o.policy_id)||`failure policy`}。`:i===`reviewed`?`失败策略已记录为 ${at(o.status)}。`:i===`submitting`?`正在通过 Growth failure policy service 写入。`:a||`失败策略操作失败。`;return`<div class="learning-card-generation-proposal-status" data-automation-failure-policy-action-status="${t(i)}">
      <span>${t(s)}</span>
      <em>${t(at(i))}</em>
    </div>`}function st(e={},t=n){let i=e.data||{},a=D(i.policies).slice(0,5),o=r(e.status||(i.ok?`ready`:`idle`)),s=e.actionStatus===`submitting`;return o===`loading`?`<div class="learning-card-generation-proposal-empty">正在读取 failure policy。</div>`:o===`failed`?`<div class="learning-card-generation-proposal-empty">Failure policy 读取失败：${t(r(e.error)||`automation_failure_policies_failed`)}</div>`:a.length?a.map(e=>{let n=r(e.policyId||e.policy_id),i=r(e.status),a=n&&i===`draft`,o=e.failurePolicy||e.failure_policy||{},c=e.rollbackPolicy||e.rollback_policy||{},l=o.visibleFailureRequired!==!1,u=o.retryRequiresOwner!==!1,d=c.transactionalPublishRequired!==!1,f=[l?`visible failure`:`hidden failure blocked`,u?`Owner retry`:`retry policy disabled`,d?`transactional publish`:`transaction not proven`].join(` · `);return`<div class="learning-card-generation-proposal-row" data-automation-failure-policy-row data-automation-failure-policy-id="${t(n)}">
        <span>
          <strong>${t(n||`failure policy`)}</strong>
          <small>${t(f)}</small>
          <small>激活策略只满足监督自动化前置条件，不开启调度。</small>
        </span>
        <em>${t(at(i))}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-failure-policy-review data-automation-failure-policy-id="${t(n)}" data-automation-failure-policy-status="active" ${s||!a?`disabled`:``}>激活</button>
          <button type="button" data-automation-failure-policy-review data-automation-failure-policy-id="${t(n)}" data-automation-failure-policy-status="archived" ${s||!a?`disabled`:``}>归档</button>
          <button type="button" data-automation-failure-policy-review data-automation-failure-policy-id="${t(n)}" data-automation-failure-policy-status="superseded" ${s||!a?`disabled`:``}>替代</button>
        </div>
      </div>`}).join(``):`<div class="learning-card-generation-proposal-empty">暂无 failure policy。创建并激活后，action handoff 才有失败可见性前置条件。</div>`}function ct(e={},t={},i=n){let a=t.automationFailurePolicies||{},o=a.data||{},s=D(o.policies),c=o.readiness||{},l=s.filter(e=>r(e.status)===`active`).length,u=s.filter(e=>r(e.status)===`draft`).length,d=c.readyForWritefulAutomationPrerequisite===!0,f=r(a.status||(o.ok?`ready`:`idle`)),p=a.actionStatus===`submitting`,m=f===`loading`?`正在读取 failure policy。`:f===`failed`?r(a.error)||`automation_failure_policies_failed`:d?`失败可见性和 Owner retry 策略已激活；调度仍保持关闭。`:`需要创建并激活 failure policy，才能进入 action handoff / scheduler 前置检查。`;return`<section class="learning-card-generation-proposals learning-card-generation-failure-policies" data-automation-failure-policy-panel data-automation-failure-policy-status="${i(f||`idle`)}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>失败策略</strong>
          <small>${i(m)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-failure-policy-create ${p?`disabled`:``}>${p?`创建中`:`创建策略`}</button>
          <button type="button" data-automation-failure-policy-refresh ${f===`loading`?`disabled`:``}>${f===`loading`?`读取中`:`刷新策略`}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>就绪</small><strong>${i(d?`1`:`0`)}</strong></span>
        <span><small>草稿</small><strong>${i(String(u))}</strong></span>
        <span><small>激活</small><strong>${i(String(l))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${st(a,i)}
      </div>
      ${ot(a,i)}
    </section>`}function lt(e=``){let t=r(e).toLowerCase();return t===`loading`?`读取中`:t===`pending_delivery`?`待投递`:t===`not_delivered`?`未投递`:t===`delivered`?`已投递`:t===`delivery_failed`?`投递失败`:t===`delivery_pending`?`投递待定`:t===`created`?`已创建`:t===`failed`?`失败`:t||`待处理`}function ut(e={},t=n){let i=r(e.actionStatus),a=r(e.actionError),o=e.actionResult||{},s=o.handoff||{};if(!i||i===`idle`)return``;let c=r(o.deliveryStatus||s.deliveryStatus||s.delivery_status||s.status),l=i===`created`?`Handoff 已创建：${r(s.handoffId||s.handoff_id)||`action handoff`}。`:i===`delivered`?`Handoff 投递状态：${lt(c)}。`:i===`submitting`?`正在通过 Growth action handoff service 写入。`:a||`Handoff 操作失败。`;return`<div class="learning-card-generation-proposal-status" data-automation-action-handoff-action-status="${t(i)}">
      <span>${t(l)}</span>
      <em>${t(lt(i))}</em>
    </div>`}function dt(e={},t=n){let i=e.data||{},a=D(i.handoffs).slice(0,5),o=r(e.status||(i.ok?`ready`:`idle`)),s=e.actionStatus===`submitting`;return o===`loading`?`<div class="learning-card-generation-proposal-empty">正在读取 action handoff。</div>`:o===`failed`?`<div class="learning-card-generation-proposal-empty">Action handoff 读取失败：${t(r(e.error)||`automation_action_handoffs_failed`)}</div>`:a.length?a.map(e=>{let n=r(e.handoffId||e.handoff_id),i=r(e.digestId||e.digest_id),a=r(e.deliveryStatus||e.delivery_status||e.status),o=e.actionSummary||e.action_summary||{},c=D(e.actions),l=D(e.blocked),u=Number(o.requiredActions||o.required_actions||c.length||0)||0,d=Number(o.blocked||l.length||0)||0,f=n&&a!==`delivered`;return`<div class="learning-card-generation-proposal-row" data-automation-action-handoff-row data-automation-action-handoff-id="${t(n)}">
        <span>
          <strong>${t(n||`action handoff`)}</strong>
          <small>${t(`digest ${i||`unknown`} · actions ${u} · blocked ${d}`)}</small>
          <small>投递只创建平台 action metadata，不发布卡片、不调度。</small>
        </span>
        <em>${t(lt(a))}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-action-handoff-deliver data-automation-action-handoff-id="${t(n)}" ${s||!f?`disabled`:``}>投递</button>
        </div>
      </div>`}).join(``):`<div class="learning-card-generation-proposal-empty">暂无 action handoff。复核 digest 后，可以创建平台提醒元数据。</div>`}function ft(e={},t={},i=n){let a=D(e.data?.digests).filter(e=>r(e.status)===`reviewed`).slice(0,4),o=D(t.data?.handoffs),s=new Set(o.map(e=>r(e.digestId||e.digest_id)).filter(Boolean)),c=t.actionStatus===`submitting`;return a.length?a.map(e=>{let t=r(e.digestId||e.digest_id),n=e.summary||{},a=s.has(t),o=Number(n.requiredActions||n.required_actions||D(e.requiredActions||e.required_actions).length||0)||0;return`<div class="learning-card-generation-proposal-row" data-automation-action-handoff-digest-row data-automation-digest-id="${i(t)}">
        <span>
          <strong>${i(t||`reviewed digest`)}</strong>
          <small>${i(`已复核 digest · required actions ${o}`)}</small>
        </span>
        <em>${i(a?`已建 handoff`:`可创建`)}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-action-handoff-create data-automation-digest-id="${i(t)}" ${c||a||!t?`disabled`:``}>创建 Handoff</button>
        </div>
      </div>`}).join(``):`<div class="learning-card-generation-proposal-empty">没有可创建 handoff 的已复核 digest。</div>`}function pt(e={},t={},i=n){let a=t.automationActionHandoffs||{},o=a.data||{},s=D(o.handoffs),c=s.filter(e=>r(e.deliveryStatus||e.delivery_status||e.status)!==`delivered`).length,l=s.filter(e=>r(e.deliveryStatus||e.delivery_status||e.status)===`delivered`).length,u=s.filter(e=>r(e.deliveryStatus||e.delivery_status)===`delivery_failed`).length,d=r(a.status||(o.ok?`ready`:`idle`)),f=d===`loading`?`正在读取 action handoff。`:d===`failed`?r(a.error)||`automation_action_handoffs_failed`:c?`Owner 可以投递平台 action metadata；仍不会发布或调度。`:`从已复核 digest 创建 handoff，作为平台提醒前的 Growth 记录。`;return`<section class="learning-card-generation-proposals learning-card-generation-action-handoffs" data-automation-action-handoff-panel data-automation-action-handoff-status="${i(d||`idle`)}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>行动 Handoff</strong>
          <small>${i(f)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-action-handoff-refresh ${d===`loading`?`disabled`:``}>${d===`loading`?`读取中`:`刷新 Handoff`}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>待投递</small><strong>${i(String(c))}</strong></span>
        <span><small>已投递</small><strong>${i(String(l))}</strong></span>
        <span><small>失败</small><strong>${i(String(u))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${ft(t.automationDigests||{},a,i)}
      </div>
      <div class="learning-card-generation-proposal-list">
        ${dt(a,i)}
      </div>
      ${ut(a,i)}
    </section>`}function O(e){return Array.isArray(e)?e:[]}function mt(e={}){let t=O(e.actions);return t.find((e={})=>r(e.proposalId||e.proposal_id))||t[0]||{}}function ht(e=``){let t=r(e).toLowerCase();return t===`loading`?`读取中`:t===`submitting`?`执行中`:t===`started`?`已开始`:t===`published`?`已发布`:t===`blocked`?`已拦截`:t===`failed`?`失败`:t===`skipped`?`已跳过`:t===`executed`?`已记录`:t||`待处理`}function gt(e={},t=n){let i=r(e.actionStatus),a=r(e.actionError),o=e.actionResult||{},s=o.execution||{};if(!i||i===`idle`)return``;let c=r(s.status||o.status||i),l=i===`submitting`?`正在通过 Growth scheduler execution service 记录 Owner 显式执行。`:c===`published`?`Scheduler execution 已发布：${r(s.executionId||s.execution_id)||`execution`}。`:c===`blocked`?`Scheduler execution 被门禁拦截：${r(s.reason||o.error||a)||`blocked`}。`:i===`executed`?`Scheduler execution 已记录：${r(s.executionId||s.execution_id)||`execution`}。`:a||r(o.error)||`Scheduler execution 操作失败。`;return`<div class="learning-card-generation-proposal-status" data-automation-scheduler-execution-action-status="${t(i)}">
      <span>${t(l)}</span>
      <em>${t(ht(c))}</em>
    </div>`}function _t(e={},t=n){let i=e.data||{},a=O(i.executions).slice(0,5),o=r(e.status||(i.ok?`ready`:`idle`));return o===`loading`?`<div class="learning-card-generation-proposal-empty">正在读取 scheduler execution。</div>`:o===`failed`?`<div class="learning-card-generation-proposal-empty">Scheduler execution 读取失败：${t(r(e.error)||`automation_scheduler_executions_failed`)}</div>`:a.length?a.map(e=>{let n=r(e.executionId||e.execution_id),i=ht(e.status),a=r(e.handoffId||e.handoff_id),o=r(e.proposalId||e.proposal_id),s=r(e.execution?.generatedTaskCardId||e.execution?.generated_task_card_id),c=r(e.reason||e.error||e.execution?.reason);return`<div class="learning-card-generation-proposal-row" data-automation-scheduler-execution-row data-automation-scheduler-execution-id="${t(n)}">
        <span>
          <strong>${t(n||`scheduler execution`)}</strong>
          <small>${t(`handoff ${a||`unknown`} · proposal ${o||`unknown`}`)}</small>
          <small>${t(s?`generated card ${s}`:c||`默认禁用时会记录 blocked，不会发布。`)}</small>
        </span>
        <em>${t(i)}</em>
      </div>`}).join(``):`<div class="learning-card-generation-proposal-empty">暂无 scheduler execution。已投递 handoff 后，可以显式尝试执行一次。</div>`}function vt(e={},t={},i=n){let a=O(e.data?.handoffs).filter(e=>r(e.deliveryStatus||e.delivery_status||e.status)===`delivered`).slice(0,4),o=t.actionStatus===`submitting`;return a.length?a.map(e=>{let t=r(e.handoffId||e.handoff_id),n=r(e.digestId||e.digest_id),a=mt(e),s=r(a.proposalId||a.proposal_id||e.proposalId||e.proposal_id),c=r(a.selectedItemId||a.selected_item_id||a.itemId||a.item_id);return`<div class="learning-card-generation-proposal-row" data-automation-scheduler-execution-handoff-row data-automation-action-handoff-id="${i(t)}">
        <span>
          <strong>${i(t||`delivered handoff`)}</strong>
          <small>${i(`digest ${n||`unknown`} · proposal ${s||`missing`}`)}</small>
          <small>执行会重新检查 release / activation / runtime gates；默认禁用时只写 blocked 记录。</small>
        </span>
        <em>${i(s?`可尝试`:`缺 proposal`)}</em>
        <div class="learning-card-generation-proposal-actions">
          <button type="button" data-automation-scheduler-execution-execute data-automation-action-handoff-id="${i(t)}" data-automation-proposal-id="${i(s)}" data-automation-selected-item-id="${i(c)}" ${o||!t||!s?`disabled`:``}>执行一次</button>
        </div>
      </div>`}).join(``):`<div class="learning-card-generation-proposal-empty">没有可执行的已投递 handoff。</div>`}function yt(e={},t={},i=n){let a=t.automationSchedulerExecutions||{},o=a.data||{},s=O(o.executions),c=s.filter(e=>r(e.status)===`published`).length,l=s.filter(e=>r(e.status)===`blocked`).length,u=s.filter(e=>r(e.status)===`failed`).length,d=r(a.status||(o.ok?`ready`:`idle`)),f=d===`loading`?`正在读取 scheduler execution。`:d===`failed`?r(a.error)||`automation_scheduler_executions_failed`:`Owner 显式执行只通过 scheduler execution service；默认配置会被门禁拦截。`;return`<section class="learning-card-generation-proposals learning-card-generation-scheduler-executions" data-automation-scheduler-execution-panel data-automation-scheduler-execution-status="${i(d||`idle`)}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>Scheduler 执行</strong>
          <small>${i(f)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-scheduler-execution-refresh ${d===`loading`?`disabled`:``}>${d===`loading`?`读取中`:`刷新执行`}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>已发布</small><strong>${i(String(c))}</strong></span>
        <span><small>已拦截</small><strong>${i(String(l))}</strong></span>
        <span><small>失败</small><strong>${i(String(u))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${vt(t.automationActionHandoffs||{},a,i)}
      </div>
      <div class="learning-card-generation-proposal-list">
        ${_t(a,i)}
      </div>
      ${gt(a,i)}
    </section>`}function bt(e=``){let t=r(e).toLowerCase();return t===`loading`?`读取中`:t===`submitting`?`运行中`:t===`started`?`已开始`:t===`completed`?`已完成`:t===`partial`?`部分完成`:t===`blocked`?`已拦截`:t===`failed`?`失败`:t===`skipped`?`已跳过`:t===`ran`?`已记录`:t||`待处理`}function xt(e={},t=n){let i=r(e.actionStatus),a=r(e.actionError),o=e.actionResult||{},s=o.run||{};if(!i||i===`idle`)return``;let c=r(s.status||o.status||i),l=i===`submitting`?`正在通过 Growth scheduler run service 记录一次监督 tick。`:c===`completed`?`Scheduler run 已完成：${r(s.runId||s.run_id)||`run`}。`:c===`blocked`?`Scheduler run 被门禁拦截：${r(s.reason||o.error||a)||`blocked`}。`:i===`ran`?`Scheduler run 已记录：${r(s.runId||s.run_id)||`run`}。`:a||r(o.error)||`Scheduler run 操作失败。`;return`<div class="learning-card-generation-proposal-status" data-automation-scheduler-run-action-status="${t(i)}">
      <span>${t(l)}</span>
      <em>${t(bt(c))}</em>
    </div>`}function St(e={},t=n){let i=e.data||{},a=O(i.runs).slice(0,5),o=r(e.status||(i.ok?`ready`:`idle`));return o===`loading`?`<div class="learning-card-generation-proposal-empty">正在读取 scheduler run。</div>`:o===`failed`?`<div class="learning-card-generation-proposal-empty">Scheduler run 读取失败：${t(r(e.error)||`automation_scheduler_runs_failed`)}</div>`:a.length?a.map(e=>{let n=r(e.runId||e.run_id),i=bt(e.status),a=e.summary||{},o=Number(a.attemptedExecutions||a.attempted_executions||O(e.executions).length||0)||0,s=Number(a.inspectedHandoffs||a.inspected_handoffs||O(e.candidates).length||0)||0,c=r(e.reason||e.error);return`<div class="learning-card-generation-proposal-row" data-automation-scheduler-run-row data-automation-scheduler-run-id="${t(n)}">
        <span>
          <strong>${t(n||`scheduler run`)}</strong>
          <small>${t(`handoffs ${s} · executions ${o}`)}</small>
          <small>${t(c||`默认禁用时会记录 blocked run，不会启动后台调度。`)}</small>
        </span>
        <em>${t(i)}</em>
      </div>`}).join(``):`<div class="learning-card-generation-proposal-empty">暂无 scheduler run。可以显式运行一次默认禁用的监督 tick。</div>`}function Ct(e={},t={},i=n){let a=t.automationSchedulerRuns||{},o=a.data||{},s=O(o.runs),c=s.filter(e=>r(e.status)===`completed`).length,l=s.filter(e=>r(e.status)===`blocked`).length,u=s.filter(e=>r(e.status)===`failed`).length,d=r(a.status||(o.ok?`ready`:`idle`)),f=a.actionStatus===`submitting`,p=d===`loading`?`正在读取 scheduler run。`:d===`failed`?r(a.error)||`automation_scheduler_runs_failed`:`Scheduler run 是默认禁用的监督 tick；Owner 点击只会走服务门禁和审计记录。`;return`<section class="learning-card-generation-proposals learning-card-generation-scheduler-runs" data-automation-scheduler-run-panel data-automation-scheduler-run-status="${i(d||`idle`)}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>Scheduler Run</strong>
          <small>${i(p)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-scheduler-run-refresh ${d===`loading`?`disabled`:``}>${d===`loading`?`读取中`:`刷新 Run`}</button>
          <button type="button" data-automation-scheduler-run-once ${f?`disabled`:``}>${f?`运行中`:`运行一次`}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>已完成</small><strong>${i(String(c))}</strong></span>
        <span><small>已拦截</small><strong>${i(String(l))}</strong></span>
        <span><small>失败</small><strong>${i(String(u))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${St(a,i)}
      </div>
      ${xt(a,i)}
    </section>`}function wt(e=``){let t=r(e).toLowerCase();return t===`proposed`?`待复核`:t===`enabled`?`已复核`:t===`disabled`?`已停用`:t===`archived`?`已归档`:t===`submitting`?`保存中`:t===`created`?`已创建`:t===`reviewed`?`已复核`:t===`failed`?`失败`:t||`记录`}function Tt(e={},t=n){let i=r(e.actionStatus),a=r(e.actionError),o=e.actionResult||{},s=o.target||{},c=r(s.targetId||o.targetId);if(!i||i===`idle`)return``;let l=i===`created`?`Worker target 已创建${c?`：${c}`:`，等待 Owner 复核。`}`:i===`reviewed`?`Worker target 已记录为 ${wt(s.status)}${c?`：${c}`:`。`}`:i===`submitting`?`正在通过 Growth worker target service 写入。`:a||`Worker target 操作失败。`;return`<div class="learning-card-generation-proposal-status" data-automation-scheduler-worker-target-action-status="${t(i)}">
      <span>${t(l)}</span>
      <em>${t(wt(i))}</em>
    </div>`}function Et(e={},t=n){let i=e.data||{},a=O(i.targets).slice(0,5),o=r(e.status||(i.ok?`ready`:`idle`));return o===`loading`?`<div class="learning-card-generation-proposal-empty">正在读取 worker target。</div>`:o===`failed`?`<div class="learning-card-generation-proposal-empty">Worker target 读取失败：${t(r(e.error)||`automation_scheduler_worker_targets_failed`)}</div>`:a.length?a.map(n=>{let i=r(n.targetId||n.target_id||n.workerTargetId||n.worker_target_id),a=r(n.status),o=n.policy||{},s=n.readiness||{},c=n.target||{},l=r(c.subject||n.subject||c.domain||n.domain||`worker target`),u=O(c.targetNodeIds||n.targetNodeIds).map(r).filter(Boolean).slice(0,3),d=a===`proposed`||a===`disabled`,f=a===`proposed`||a===`enabled`,p=a!==`archived`,m=e.actionStatus===`submitting`;return`<div class="learning-card-generation-proposal-row" data-automation-scheduler-worker-target-row data-automation-scheduler-worker-target-id="${t(i)}">
        <span>
          <strong>${t(i||l)}</strong>
          <small>${t(`${l} · ${r(n.horizon||c.horizon||`daily_plan`)}`)}</small>
          <small>${t(u.length?`nodes ${u.join(` · `)}`:`reviewed target config only`)}</small>
          <small>${t(`productionSchedulingAllowed=${o.productionSchedulingAllowed===!0||s.productionSchedulingAllowed===!0?`true`:`false`}`)}</small>
        </span>
        <em>${t(wt(a))}</em>
        ${d||f||p?`<div class="learning-card-generation-proposal-actions">
          ${d?`<button type="button" data-automation-scheduler-worker-target-review data-automation-scheduler-worker-target-id="${t(i)}" data-automation-scheduler-worker-target-status="enabled" ${m?`disabled`:``}>启用记录</button>`:``}
          ${f?`<button type="button" data-automation-scheduler-worker-target-review data-automation-scheduler-worker-target-id="${t(i)}" data-automation-scheduler-worker-target-status="disabled" ${m?`disabled`:``}>停用</button>`:``}
          ${p?`<button type="button" data-automation-scheduler-worker-target-review data-automation-scheduler-worker-target-id="${t(i)}" data-automation-scheduler-worker-target-status="archived" ${m?`disabled`:``}>归档</button>`:``}
        </div>`:``}
      </div>`}).join(``):`<div class="learning-card-generation-proposal-empty">暂无 worker target。可以先创建一个 proposed target，等待 Owner 复核。</div>`}function Dt(e={},t={},i=n){let a=t.automationSchedulerWorkerTargets||{},o=a.data||{},s=O(o.targets),c=s.filter(e=>r(e.status)===`proposed`).length,l=s.filter(e=>r(e.status)===`enabled`).length,u=s.filter(e=>r(e.status)===`disabled`).length,d=s.filter(e=>r(e.status)===`archived`).length,f=r(a.status||(o.ok?`ready`:`idle`)),p=a.actionStatus===`submitting`,m=f===`loading`?`正在读取 worker target。`:f===`failed`?r(a.error)||`automation_scheduler_worker_targets_failed`:`Worker target 是未来后台 worker 的 Owner 复核配置；创建和复核都不会启动 worker。`;return`<section class="learning-card-generation-proposals learning-card-generation-worker-targets" data-automation-scheduler-worker-target-panel data-automation-scheduler-worker-target-status="${i(f||`idle`)}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>Worker Target</strong>
          <small>${i(m)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-scheduler-worker-target-refresh ${f===`loading`?`disabled`:``}>${f===`loading`?`读取中`:`刷新 Target`}</button>
          <button type="button" data-automation-scheduler-worker-target-create ${p?`disabled`:``}>${p?`创建中`:`创建 Target`}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>待复核</small><strong>${i(String(c))}</strong></span>
        <span><small>已复核</small><strong>${i(String(l))}</strong></span>
        <span><small>停用/归档</small><strong>${i(String(u+d))}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${Et(a,i)}
      </div>
      ${Tt(a,i)}
    </section>`}function Ot(e){return Array.isArray(e)?e:[]}function kt(e=``){let t=r(e);return{run_learning_loop_next:`执行学习闭环下一步`,prepare_cycle_closure:`准备复核包`,advance_review:`推进复核链`,deliver_action_handoff:`投递 Handoff`,collect_platform_action_evidence:`收集平台证据`,complete_learner_cycle:`完成一张日常卡`,refresh_closed_loop_context:`刷新闭环上下文`}[t]||t||`待读取`}function At(e=``){let t=r(e).toLowerCase();return t===`loading`?`读取中`:t===`ready_for_next_learning_action`?`可生成`:t===`ready_for_cycle_closure`?`可准备`:t===`ready_for_review_advancement`?`可推进`:t===`ready_for_action_handoff_delivery`?`可投递`:t===`ready_for_platform_action_evidence`?`待证据`:t===`learner_cycle_required`?`待完成`:t===`blocked`?`已阻塞`:t===`failed`?`失败`:t===`ready`?`已读取`:t||`待读取`}function jt(e={},t=n){let i=r(e.actionStatus);if(!i||i===`idle`)return``;let a=e.actionResult||{},o=i===`running`?`正在执行 action-plan 指向的现有 Growth 服务动作。`:i===`executed`?`下一步动作已完成，正在刷新闭环读数。`:r(e.actionError||a.error)||`闭环下一步执行失败。`;return`<div class="learning-card-generation-proposal-status" data-automation-closed-loop-action-status="${t(i)}">
      <span>${t(o)}</span>
      <em>${t(i===`running`?`执行中`:i===`executed`?`已执行`:i===`blocked`?`已阻塞`:`失败`)}</em>
    </div>`}function Mt(e=[],t=n){let i=Ot(e).slice(0,5);return i.length?i.map((e={})=>{let n=r(e.key),i=r(e.status||(e.ok?`ready`:`missing`)),a=r(e.error||e.nextAction||e.policyId||e.digest?.digestId||e.handoff?.handoffId||e.selectorDiscoveryStatus||`summary-only`);return`<div class="learning-card-generation-proposal-row" data-automation-closed-loop-phase="${t(n)}" data-automation-closed-loop-phase-ok="${e.ok===!1?`false`:`true`}">
        <span>
          <strong>${t(e.label||n||`阶段`)}</strong>
          <small>${t(a)}</small>
        </span>
        <em>${t(i)}</em>
      </div>`}).join(``):`<div class="learning-card-generation-proposal-empty">暂无阶段读数。</div>`}function Nt(e={},t={},i=n){let a=t.automationClosedLoopActionPlan||{},o=a.data||{},s=o.nextAction||{},c=o.summary||{},l=o.automationReadiness||{},u=r(a.status||o.status||`idle`),d=r(s.key||c.nextAction),f=r(a.actionStatus)===`running`,p=[`run_learning_loop_next`,`prepare_cycle_closure`,`advance_review`,`deliver_action_handoff`].includes(d),m=u===`loading`?`正在读取闭环下一步。`:u===`failed`?r(a.error)||`closed_loop_action_plan_failed`:d?p?``:`当前下一步需要在对应面板或学习卡里完成。`:`还没有可执行的下一步。`,h=!f&&!m,g=u===`loading`?`正在读取 operating loop、完成周期、digest、失败策略和 handoff。`:u===`failed`?r(a.error)||`闭环计划读取失败。`:r(s.reason)||`由 Growth 服务返回一个 Owner 可执行的下一步。`;return`<section class="learning-card-generation-proposals learning-card-generation-closed-loop-plan" data-automation-closed-loop-action-plan-panel data-automation-closed-loop-action-plan-status="${i(u)}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>闭环下一步</strong>
          <small>${i(g)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" data-automation-closed-loop-action-plan-refresh ${u===`loading`?`disabled`:``}>${u===`loading`?`读取中`:`刷新计划`}</button>
          <button type="button" class="primary${h?``:` disabled`}" data-automation-closed-loop-action-run data-automation-closed-loop-action-key="${i(d)}" ${h?``:`aria-disabled="true" data-automation-closed-loop-blocked-reason="${i(m)}"`}>${f?`执行中`:i(kt(d))}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>下一步</small><strong>${i(kt(d))}</strong></span>
        <span><small>状态</small><strong>${i(At(u))}</strong></span>
        <span><small>完成周期</small><strong>${l.completedCycleReady?`就绪`:`待完成`}</strong></span>
        <span><small>Digest</small><strong>${l.digestPresent?l.digestReviewed?`已复核`:`待复核`:`暂无`}</strong></span>
        <span><small>失败策略</small><strong>${l.failurePolicyReady?`就绪`:`待确认`}</strong></span>
        <span><small>Handoff</small><strong>${l.handoffPresent?l.handoffDelivered?`已投递`:`待投递`:`暂无`}</strong></span>
      </div>
      <div class="learning-card-generation-proposal-list">
        ${Mt(o.phases,i)}
      </div>
      ${jt(a,i)}
    </section>`}function Pt(e=``){let t=r(e).toLowerCase();return t===`submitting`?`准备中`:t===`prepared`?`已准备`:t===`proposal_ready`?`建议已准备`:t===`digest_pending`||t===`pending`?`Digest 待复核`:t===`reviewed`?`已复核`:t===`delivered`?`已投递`:t===`blocked`?`已阻塞`:t===`failed`?`失败`:t||`待准备`}function Ft(e={},t=n){let i=r(e.actionStatus),a=r(e.actionError),o=e.actionResult||{},s=o.summary||{};if(!i||i===`idle`)return``;let c=i===`prepared`?`复核包已准备：${r(s.proposalId)||`proposal`} / ${r(s.digestId)||`digest`}。`:i===`submitting`?`正在从完成周期准备 proposal 和 digest。`:a||r(o.error)||`闭环复核包准备失败。`;return`<div class="learning-card-generation-proposal-status" data-automation-cycle-closure-action-status="${t(i)}">
      <span>${t(c)}</span>
      <em>${t(Pt(i))}</em>
    </div>`}function It(e={},t={},i=n){let a=t.automationCycleClosure||{},o=a.actionResult||{},s=o.summary||{},c=Ot(o.stages),l=o.selectedCycle||t.cycleHistory?.selectedCycle||{},u=r(s.selectedCycleId||l.cycleId||l.cycle_id),d=r(s.proposalId||o.proposal?.proposalId||o.proposal?.proposal_id),f=r(s.digestId||o.digest?.digestId||o.digest?.digest_id),p=r(a.actionStatus)===`submitting`,m=r(a.actionStatus||o.status||`idle`),h=c.filter((e={})=>e.ok===!1).map((e={})=>r(e.name)).filter(Boolean),g=r(a.actionError)||r(o.error)||(d||f?`已把完成周期转成 Owner 可复核的下一张建议和 dry-run digest。`:`默认自动选择最新完成周期；只准备复核包，不发布卡片、不启动 scheduler。`);return`<section class="learning-card-generation-proposals learning-card-generation-cycle-closure" data-automation-cycle-closure-panel data-automation-cycle-closure-status="${i(m)}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>闭环复核包</strong>
          <small>${i(g)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" class="primary${p?` disabled`:``}" data-automation-cycle-closure-prepare ${p?`disabled`:``}>${p?`准备中`:`准备复核包`}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>完成周期</small><strong>${i(u||`auto`)}</strong></span>
        <span><small>Proposal</small><strong>${i(d||`待生成`)}</strong></span>
        <span><small>Digest</small><strong>${i(f||`待生成`)}</strong></span>
      </div>
      ${h.length?`<div class="learning-card-generation-proposal-empty">阻塞阶段：${i(h.join(` · `))}</div>`:``}
      ${Ft(a,i)}
    </section>`}function Lt(e=``){let t=r(e).toLowerCase();return t===`submitting`?`推进中`:t===`advanced`?`已推进`:t===`reviewed`?`已复核`:t===`handoff_ready`||t===`pending_delivery`||t===`not_delivered`?`Handoff 就绪`:t===`execution_blocked`||t===`blocked`?`已阻塞`:t===`published`?`已发布`:t===`failed`?`失败`:t||`待推进`}function Rt(e={},t=n){let i=r(e.actionStatus),a=r(e.actionError),o=e.actionResult||{},s=o.summary||{};if(!i||i===`idle`)return``;let c=i===`advanced`?`复核链已推进：${r(s.digestId)||`digest`} / ${r(s.handoffId)||`handoff`}。`:i===`submitting`?`正在复核 digest、校验失败策略并创建 handoff。`:a||r(o.error)||`复核链推进失败。`;return`<div class="learning-card-generation-proposal-status" data-automation-review-advancement-action-status="${t(i)}">
      <span>${t(c)}</span>
      <em>${t(Lt(i))}</em>
    </div>`}function zt(e={},t={},i=n){let a=t.automationReviewAdvancement||{},o=a.actionResult||{},s=o.summary||{},c=Ot(o.stages),l=r(a.actionStatus)===`submitting`,u=r(a.actionStatus||o.status||`idle`),d=r(s.digestId||o.digest?.digestId||o.digest?.digest_id),f=r(s.policyId||o.failurePolicy?.policyId||o.failurePolicy?.policy_id),p=r(s.handoffId||o.handoff?.handoffId||o.handoff?.handoff_id),m=c.filter((e={})=>e.ok===!1).map((e={})=>r(e.name)).filter(Boolean),h=r(a.actionError)||r(o.error)||(p?`已完成 Owner 复核链，等待后续显式投递或执行。`:`复核 digest，补齐失败策略并创建 handoff；默认不投递、不执行。`);return`<section class="learning-card-generation-proposals learning-card-generation-review-advancement" data-automation-review-advancement-panel data-automation-review-advancement-status="${i(u)}">
      <div class="learning-card-generation-proposal-head">
        <span>
          <strong>复核链推进</strong>
          <small>${i(h)}</small>
        </span>
        <div class="learning-card-generation-proposal-head-actions">
          <button type="button" class="primary${l?` disabled`:``}" data-automation-review-advancement-advance ${l?`disabled`:``}>${l?`推进中`:`推进复核链`}</button>
        </div>
      </div>
      <div class="learning-card-generation-proposal-grid">
        <span><small>Digest</small><strong>${i(d||`auto`)}</strong></span>
        <span><small>失败策略</small><strong>${i(f||`待确认`)}</strong></span>
        <span><small>Handoff</small><strong>${i(p||`待创建`)}</strong></span>
      </div>
      ${m.length?`<div class="learning-card-generation-proposal-empty">阻塞阶段：${i(m.join(` · `))}</div>`:``}
      ${Rt(a,i)}
    </section>`}function k(e){return Array.isArray(e)?e:[]}function Bt(...e){for(let t of e){let e=r(t);if(e)return e}return``}function Vt(...e){for(let t of e){let e=k(t).map(r).filter(Boolean);if(e.length)return Array.from(new Set(e)).slice(0,12)}return[]}function Ht(e={}){return(e.targetProvisioning||{}).graphOptions||e.graphOptions||{}}function Ut(e={},t=``){let n=e[t]||{};return k(n.items||n.profileDeltas||n.corrections||n.planDrafts)}function Wt(e=``){let t=r(e).toLowerCase();return t===`submitting`?`保存中`:t===`submitted`?`已保存`:t===`failed`?`失败`:`可记录`}function Gt(e=``){let t=r(e).toLowerCase();return t===`mark_needs_repair`?`标记需修补`:t===`mark_misconception`?`标记误解`:t===`mark_stable`?`确认稳定`:t===`mark_mastered`?`确认掌握`:`确认观察`}function Kt(e={}){let t=Ut(e.ownerAudit||{},`profileDeltaAudit`)[0]||{},n=e.nextCardRecommendation||{},i=e.suggestedPlan||{};return(k(t.targetNodeIds).length?t.targetNodeIds:k(n.targetNodeIds).length?n.targetNodeIds:k(i.targetNodeIds).length?i.targetNodeIds:[n.targetNodeId||i.targetNodeId].filter(Boolean)).map(r).filter(Boolean).slice(0,8)}function qt(e={},t=n){let i=e.summary||{};return[[`计划`,i.planDraftCount,i.lastPlanAt],[`已发布`,i.publishedPlanCount,i.lastPublishedAt],[`画像变化`,i.profileDeltaCount,i.lastProfileDeltaAt],[`纠偏`,i.correctionCount,i.lastCorrectionAt]].map(([e,n,i])=>`<span>
      <small>${t(e)}</small>
      <strong>${t(String(Number(n||0)||0))}</strong>
      <em>${t(r(i)||`无记录`)}</em>
    </span>`).join(``)}function Jt(e={},t=n){let i=Ut(e,`planAudit`).slice(0,2);return i.length?i.map(e=>{let n=e.selectedItem||{},i=r(e.planDraftId||e.generatedTaskCardId||`计划`),a=r(n.reason||e.planSummary||e.status||`summary-only`),o=r(e.generatedTaskCardId||n.itemId||e.status||`记录`);return`<div class="learning-card-generation-owner-row">
        <span>
          <strong>${t(i)}</strong>
          <small>${t(a)}</small>
        </span>
        <em>${t(o)}</em>
      </div>`}).join(``):`<div class="learning-card-generation-owner-empty">暂无计划发布审计。</div>`}function Yt(e={},t=n){let i=Ut(e,`profileDeltaAudit`).slice(0,3);return i.length?i.map(e=>{let n=k(e.changedCapabilities)[0]||{},i=r(e.profileDeltaId||e.evaluationId||`画像变化`),a=r(n.nodeId||n.targetNodeId||k(e.targetNodeIds)[0]||``),o=r(n.afterStatus||n.afterState||n.status||``),s=r(e.summary?.reason||a||`summary-only`);return`<div class="learning-card-generation-owner-row">
        <span>
          <strong>${t(i)}</strong>
          <small>${t(s)}</small>
        </span>
        <em>${t(o||String(Number(e.changedCapabilityCount||0)||0))}</em>
      </div>`}).join(``):`<div class="learning-card-generation-owner-empty">暂无画像变化审计。</div>`}function Xt(e={},t=n){let i=Ut(e,`profileCorrections`).slice(0,3);return i.length?i.map(e=>{let n=r(e.correctionId||e.profileDeltaId||`纠偏`),i=r(e.reason||e.note||k(e.targetNodeIds).join(` · `)||`summary-only`);return`<div class="learning-card-generation-owner-row">
        <span>
          <strong>${t(n)}</strong>
          <small>${t(i)}</small>
        </span>
        <em>${t(r(e.status)||Gt(e.reviewAction))}</em>
      </div>`}).join(``):`<div class="learning-card-generation-owner-empty">暂无 Owner 纠偏记录。</div>`}function Zt(e={},t=n){let i=r(e.status),a=e.result||{},o=r(a.correction?.correctionId||a.correctionId),s=r(e.error);if(!i||i===`idle`)return``;let c=i===`submitted`?`纠偏已写入证据账本${o?`：${o}`:`。`}`:i===`submitting`?`正在通过 Growth Owner correction service 写入。`:s||`纠偏写入失败。`;return`<div class="learning-card-generation-correction-status" data-owner-correction-status="${t(i)}">
      <span>${t(c)}</span>
      <em>${t(Wt(i))}</em>
    </div>`}function Qt(e={},t={},i=n){let a=e.ownerAudit||{},o=t.ownerCorrection||{},s=r(t.ownerCorrectionDraft),c=r(t.ownerCorrectionAction||`confirm_profile_delta`),l=Kt(e),u=o.status===`submitting`||!l.length;return`<section class="learning-card-generation-owner-audit" data-card-generation-owner-audit data-owner-audit-available="${a.available!==!1}">
      <div class="learning-card-generation-owner-head">
        <span>
          <strong>审计与纠偏</strong>
          <small>计划、画像变化、纠偏记录和下一步证据摘要</small>
        </span>
        <em>${i(a.ok?`已连接`:`待证据`)}</em>
      </div>
      <div class="learning-card-generation-owner-grid">
        ${qt(a,i)}
      </div>
      <div class="learning-card-generation-owner-columns">
        <div>
          <b>计划审计</b>
          ${Jt(a,i)}
        </div>
        <div>
          <b>画像变化</b>
          ${Yt(a,i)}
        </div>
      </div>
      <div class="learning-card-generation-owner-corrections">
        <b>纠偏历史</b>
        ${Xt(a,i)}
      </div>
      <form class="learning-card-generation-correction-form" data-card-generation-correction-form>
        <label>
          <span>Owner 纠偏</span>
          <select data-card-generation-correction-action>
            ${[`confirm_profile_delta`,`mark_needs_repair`,`mark_misconception`,`mark_stable`,`mark_mastered`].map(e=>`<option value="${i(e)}"${e===c?` selected`:``}>${i(Gt(e))}</option>`).join(``)}
          </select>
        </label>
        <textarea data-card-generation-correction-note rows="3" maxlength="260" placeholder="只写 summary-only 纠偏说明，不填写原始答案、transcript 或 prompt。">${i(s)}</textarea>
        <div class="learning-card-generation-correction-controls">
          <span>${i(l.length?`节点：${l.join(` · `)}`:`等待可纠偏的图谱节点`)}</span>
          <button type="submit" class="primary" ${u?`disabled`:``}>${o.status===`submitting`?`保存中`:`保存纠偏`}</button>
        </div>
        ${Zt(o,i)}
      </form>
    </section>`}function $t(e={},t=``,n={}){let i=e.suggestedPlan||{},a=e.nextCardRecommendation||{},o=e.generationDefaults||{},s=e.targetProvisioning||{},c=Ht(e),l=xe(e,n),u=k(a.targetNodeIds).length?k(a.targetNodeIds):k(i.targetNodeIds).length?k(i.targetNodeIds):[a.targetNodeId||i.targetNodeId].filter(Boolean);return{workspace_id:r(t||e.target?.workspaceId),learner_id:r(e.target?.learnerId||t),program_id:r(e.programId||i.programId||o.programId),recipe_id:r(n.recipeId||n.recipe_id||e.selectedRecipeId||`daily_english_v1`),domain_pack_id:r(l.domainPackId||s.selectedDomainPackId||c.selectedDomainPackId||e.domainPackId||i.domainPackId||o.domainPackId),domain:r(l.domain||s.selectedDomain||c.selectedDomain||a.domain||i.domain||e.domain||o.domain||`english`),subject:r(l.subject||s.selectedSubject||c.selectedSubject||a.subject||i.subject||e.subject||o.subject||i.domain||e.domain||`english`),horizon:r(e.horizon||o.horizon||`daily_plan`),available_minutes:Number(o.availableMinutes||e.availableMinutes||15)||15,target_node_ids:u.map(r).filter(Boolean).slice(0,12),card_schema_version:r(o.cardSchemaVersion||`growth.card.authoring.v1`)}}function en(e={},t=``,n={}){let r=$t(e,t,{}),i=c(n||{}),a=e.ownerAudit||{},o=Ut(a,`profileDeltaAudit`)[0]||{},s=Ut(a,`planAudit`)[0]||{},l=e.suggestedPlan||{},u=e.nextCardRecommendation||{},d=Vt(i.target_node_ids,u.targetNodeIds,l.targetNodeIds,[u.targetNodeId||l.targetNodeId]);return Object.assign({},r,{program_id:Bt(r.program_id,o.programId,s.programId),plan_draft_id:i.plan_draft_id,task_card_id:i.task_card_id,evaluation_id:i.evaluation_id,profile_delta_id:i.profile_delta_id,evidence_id:i.evidence_id,correction_id:i.correction_id,source_id:i.source_id,target_node_ids:d})}function tn({context:e={},workspaceId:t=``,selectedCycle:n={}}={}){let i=en(e,t,n);return Object.fromEntries(Object.entries(Object.assign({},i,{limit:5})).filter(([,e])=>Array.isArray(e)?e.length>0:r(e)))}function nn(e=``){let t=r(e).toLowerCase();return t===`needs_follow_up`?`需跟进`:t===`correction_recorded`?`已纠偏`:t===`blocked`?`阻塞`:`接受画像`}function rn(e=``){let t=r(e).toLowerCase();return t===`loading`?`读取中`:t===`submitting`?`记录中`:t===`reviewed`||t===`submitted`?`已记录`:t===`needs_follow_up`?`需跟进`:t===`corrected`?`已纠偏`:t===`blocked`?`已阻塞`:t===`failed`?`失败`:`待审核`}function an(e={}){return[e.plan_draft_id,e.task_card_id,e.evaluation_id,e.profile_delta_id,e.evidence_id,e.correction_id,e.source_id].some(e=>r(e))}function on(e={},t=n){let i=e.data||{},a=k(i.reviews).slice(0,4),o=r(e.status||(i.ok?`ready`:`idle`));return o===`loading`?`<div class="learning-card-generation-owner-empty">正在读取完成周期审核。</div>`:o===`failed`?`<div class="learning-card-generation-owner-empty">审核记录读取失败：${t(r(e.error)||`owner_audit_review_failed`)}</div>`:a.length?a.map(e=>{let n=e.feedbackSummary||{},i=e.auditSummary||{},a=e.recommendation||{},o=e.nextAction||{},s=Bt(e.reviewId,e.taskCardId,e.evaluationId,`审核记录`),c=[n.readyForNextPlan?`readyForNextPlan`:``,n.cycleComplete?`cycleComplete`:``,a.strategy?`strategy:${a.strategy}`:``,o.action||e.status].filter(Boolean).join(` · `)||`summary-only review`,l=[nn(e.decision),Number(i.passCheckCount||0)?`${Number(i.passCheckCount||0)} checks`:``,e.createdAt||e.updatedAt].filter(Boolean).join(` · `);return`<div class="learning-card-generation-owner-row" data-owner-audit-review-row data-owner-audit-review-id="${t(r(e.reviewId))}">
        <span>
          <strong>${t(s)}</strong>
          <small>${t(c)}</small>
        </span>
        <em>${t(l||rn(e.status))}</em>
      </div>`}).join(``):`<div class="learning-card-generation-owner-empty">暂无完成周期审核记录。</div>`}function sn(e={},t=n){let i=r(e.actionStatus),a=e.actionResult||{},o=a.review||{},s=r(o.reviewId||a.reviewId),c=r(a.decision||o.decision),l=r(e.actionError);if(!i||i===`idle`)return``;let u=i===`reviewed`||i===`submitted`?`完成周期审核已记录${s?`：${s}`:`。`}`:i===`submitting`?`正在通过 Growth Owner audit review service 写入。`:l||`完成周期审核未记录。`;return`<div class="learning-card-generation-correction-status" data-owner-audit-review-action-status="${t(i)}">
      <span>${t(u)}</span>
      <em>${t(c?nn(c):rn(i))}</em>
    </div>`}function cn(e={},t={},i=n){let a=t.ownerAuditReviews||{},o=r(t.ownerAuditReviewDraft),s=t.cycleHistory?.selectedCycle||{},c=tn({context:e,workspaceId:t.selectedWorkspaceId||e.target?.workspaceId,selectedCycle:s}),l=r(a.status||`idle`),u=a.actionStatus===`submitting`,d=an(c),f=!!r(c.correction_id),p=Bt(c.task_card_id,c.evaluation_id,c.plan_draft_id,c.profile_delta_id,c.evidence_id,c.correction_id),m=r(a.error)||(d?`Owner 对选中的完成周期做一次审核记录；服务端会先校验 profile feedback。`:`请先在历史周期里选择一条已完成周期，再记录审核。`),h=[[`accepted`,`接受`,`接受本次画像更新`],[`needs_follow_up`,`跟进`,`后续生成修补卡`],[`correction_recorded`,`已纠偏`,f?`关联已有纠偏记录`:`需要先保存纠偏`],[`blocked`,`阻塞`,`记录依赖缺口`]];return`<section class="learning-card-generation-owner-audit" data-owner-audit-review-panel data-owner-audit-review-status="${i(l||`idle`)}">
      <div class="learning-card-generation-owner-head">
        <span>
          <strong>完成周期审核</strong>
          <small>${i(m)}</small>
        </span>
        <em>${i(rn(u?`submitting`:l))}</em>
      </div>
      <div class="learning-card-generation-owner-grid">
        <span><small>已记录</small><strong>${i(String(Number(a.data?.count||k(a.data?.reviews).length||0)||0))}</strong><em>review rows</em></span>
        <span><small>选中周期</small><strong>${i(p||`未选择`)}</strong><em>${i(d?`可审核`:`待选择`)}</em></span>
        <span><small>纠偏关联</small><strong>${i(f?`可用`:`无`)}</strong><em>correction</em></span>
        <span><small>下一步</small><strong>${i(r(a.actionResult?.nextAction?.action||a.data?.reviews?.[0]?.nextAction?.action||`等待`))}</strong><em>summary-only</em></span>
      </div>
      <div class="learning-card-generation-owner-corrections">
        <b>审核记录</b>
        ${on(a,i)}
      </div>
      <form class="learning-card-generation-correction-form" data-owner-audit-review-form>
        <textarea data-owner-audit-review-note rows="2" maxlength="360" placeholder="可选：只写 summary-only Owner 备注，不填写原始答案、transcript 或 prompt。">${i(o)}</textarea>
        <div class="learning-card-generation-correction-controls">
          <span>${i(p?`周期：${p}`:`等待选择历史周期`)}</span>
          <button type="button" data-owner-audit-review-refresh ${l===`loading`?`disabled`:``}>${l===`loading`?`读取中`:`刷新审核`}</button>
        </div>
        <div class="learning-card-generation-cycle-actions">
          ${h.map(([e,t,n])=>{let r=d?e===`correction_recorded`&&!f?`记录已纠偏前，需要先保存 Owner 纠偏。`:``:`请先选择一条完成周期。`,a=u||!!r;return`<button type="button" class="${e===`accepted`?`primary`:``}" data-owner-audit-review-decision="${i(e)}" title="${i(n)}" ${a?`disabled aria-disabled="true" data-owner-audit-review-blocked-reason="${i(r||`正在记录审核。`)}"`:``}>${i(u?`记录中`:t)}</button>`}).join(``)}
        </div>
        ${sn(a,i)}
      </form>
    </section>`}function ln(e){return Array.isArray(e)?e:[]}function A(...e){for(let t of e){let e=r(t);if(e)return e}return``}function un(e=``){let t=r(e);return{program:`学习项目`,task_card:`卡片`,submission:`提交`,evaluation:`批改`,reflection:`反思`,mastery_profile:`画像`,learning_graph_plan:`图谱计划`,plan_draft:`计划草稿`,profile_feedback:`画像闭环`}[t]||t||`引用`}function j(e,t,n,i=``,a=``){let o=r(t),s=r(n);if(!o||!s)return;let c=`${o}:${s}`;e.some(e=>e.key===c)||e.push({key:c,objectType:o,objectId:s,label:r(i)||un(o),reason:r(a)||`owner_loop`})}function dn({context:e={},state:t={},workspaceId:n=``}={}){let r=[],i=e.target||{},a=e.suggestedPlan||{},o=e.generationDefaults||{},s=t.dailyLoopDraftResult||{},c=t.dailyLoopPublishResult||{},l=t.generatedResult||c.generation||{},u=s.planDraft||c.planDraft||l.planDraft||{},d=l.published||c.published||{},f=l.learningGraphPlan||c.learningGraphPlan||s.learningGraphPlan||{},p=t.cycleHistory?.selectedCycle||{},m=p.selectors||{},h=ln(t.cycleDrilldown?.audit?.timeline);j(r,`mastery_profile`,A(i.learnerId,n,e.workspaceId),`学习画像`,`profile_basis`),j(r,`program`,A(e.programId,a.programId,o.programId,u.programId),`学习项目`,`scope`),j(r,`learning_graph_plan`,A(f.learningGraphPlanId,l.learningGraphPlanId,c.learningGraphPlanId,a.learningGraphPlanId),`图谱计划`,`graph_plan`),j(r,`plan_draft`,A(u.planDraftId,m.planDraftId,p.planDraftId),`计划草稿`,`plan_draft`);let g=A(d.taskCardId,l.taskCardId,c.taskCardId,m.taskCardId,p.taskCardId),_=A(m.evaluationId,p.evaluationId);j(r,`task_card`,g,`学习卡片`,`published_card`),j(r,`evaluation`,_,`批改证据`,`cycle_audit`);let v=A(m.taskCardId,p.taskCardId,g);j(r,`profile_feedback`,v?`task_card:${v}`:_?`evaluation:${_}`:``,`画像闭环`,`profile_feedback`);for(let e of h)if(j(r,`task_card`,A(e.taskCardId),`审计卡片`,`cycle_timeline`),j(r,`evaluation`,A(e.evaluationId),`审计批改`,`cycle_timeline`),r.length>=8)break;return r.slice(0,8)}function fn(e={},t=n){let i=e.display||{},a=e.summary||{},o=e.ok!==!1,s=r(i.title||a.title||e.label||un(e.objectType)),c=r(i.subtitle||a.subtitle||e.error||e.reason||e.referenceId||`summary-only`);return`<div class="learning-card-generation-reference-row" data-reference-object-type="${t(r(e.objectType))}" data-reference-object-id="${t(r(e.objectId))}" data-reference-ok="${o?`true`:`false`}">
      <span>
        <strong>${t(s)}</strong>
        <small>${t(c)}</small>
      </span>
      <em>${t(o?un(e.objectType):`不可读`)}</em>
    </div>`}function pn(e={},t={},i=``,a=n){let o=t.referenceChain||{},s=o.objectTypes||e.referenceObjectTypes||{},c=ln(o.summaries||e.referenceSummaries),l=ln(o.requests).length?ln(o.requests):dn({context:e,state:t,workspaceId:i}),u=o.status===`loading`,d=o.status===`failed`,f=d?`failed`:u?`loading`:r(o.status||(c.length?`ready`:`idle`)),p=Number(s.referenceContractObjectTypeCount||ln(s.objectTypes).length||0)||0,m=c.length?c.slice(0,8).map(e=>fn(e,a)).join(``):l.length?l.slice(0,8).map(e=>fn(Object.assign({},e,{ok:o.status!==`failed`,display:{title:e.label,subtitle:e.objectId}}),a)).join(``):`<div class="learning-card-generation-reference-empty">等待计划、卡片或审计记录形成后显示引用。</div>`,h=d?r(o.error)||`reference_chain_failed`:u?`正在读取 Growth Reference Contract summary。`:`${p||8} 类 summary-only 引用，当前链路 ${c.length||l.length} 项。`;return`<section class="learning-card-generation-reference-chain" data-reference-chain-panel data-reference-chain-status="${a(f)}">
      <div class="learning-card-generation-reference-head">
        <span>
          <strong>闭环引用</strong>
          <small>${a(h)}</small>
        </span>
        <button type="button" data-reference-chain-refresh ${u?`disabled`:``}>${a(u?`读取中`:`刷新引用`)}</button>
      </div>
      <div class="learning-card-generation-reference-grid">
        <span><small>对象类型</small><strong>${a(String(p||8))}</strong></span>
        <span><small>当前引用</small><strong>${a(String(c.length||l.length||0))}</strong></span>
        <span><small>隐私</small><strong>summary-only</strong></span>
      </div>
      <div class="learning-card-generation-reference-list">
        ${m}
      </div>
    </section>`}function M(e){return Array.isArray(e)?e:[]}function mn(e=``){let t=r(e).toLowerCase();return t===`checking`?`检查中`:t===`activating`?`生成中`:t===`eligible`?`可激活`:t===`active`?`已激活`:t===`cooldown`?`冷却中`:t===`dormant`?`暂不建议`:t===`failed`?`失败`:`未检查`}function hn(e={}){let t=r(e.reason||e.activationReason||e.cycle?.activationReason||e.error);return{enough_recent_practice:`近期练习证据足够，可以生成一次阶段测评。`,challenge_ready:`学习者信号显示可以尝试挑战。`,recent_high_pressure_signal:`近期有压力信号，先降低难度或修补前置点。`,insufficient_recent_practice:`近期普通卡证据不足，建议先继续日常练习。`,stage_assessment_cooldown_active:`同一能力簇仍在冷却期。`,stage_assessment_recently_completed:`近期已完成正式测评，暂不需要重复。`}[t]||t||`先检查近期轨迹和掌握度摘要。`}function gn(e=``){let t=r(e);return{stage_assessment_not_eligible:`当前还不适合生成正式测评，先继续日常练习。`,stage_assessment_cooldown_active:`同一能力簇仍在冷却期。`,stage_assessment_already_active:`已经有一张阶段测评在进行中。`,insufficient_recent_practice:`近期普通卡证据不足，建议先继续日常练习。`,recent_high_pressure_signal:`近期有压力信号，先保持低压力练习。`,controls_not_loaded:`先读取阶段测评控制状态。`,gateway_not_ready:`Gateway 尚未准备好，暂不能生成正式测评。`,target_not_ready:`学习目标、图谱或历史摘要尚未就绪。`}[t]||t||`阶段测评由 controls read model 决定是否开放。`}function _n(e={},t=``){return M(e.actions).find(e=>r(e.key)===t)||null}function vn({controls:e={},context:t={},generated:n={}}={}){let i=e.rubricPolicy||t.stageCheckpointRubricPolicy||n.rubricPolicy||n.draft?.rubricPolicy||n.published?.rubricPolicy||null;return i&&typeof i==`object`?i:M(t.rubricCatalog).find(e=>r(e.cardRole)===`stage_assessment`)||null}function yn(e=null,t=n){if(!e||typeof e!=`object`)return``;let i=r(e.policyId),a=M(e.rubricDimensions).length?M(e.rubricDimensions):M(e.dimensionIds).map(e=>({dimensionId:e,label:e})),o=M(e.evidenceKeys).length?M(e.evidenceKeys).map(r).filter(Boolean):M(e.evidenceMapping).map(e=>r(e.evidenceKey)).filter(Boolean),s=e.assessmentPolicy||{},c=s.expectedDurationMinutes||{},l=Number(c.min||0)&&Number(c.max||0)?`${Number(c.min)}-${Number(c.max)} 分钟`:`25-30 分钟`,u=a.slice(0,4).map(e=>{let n=r(e.dimensionId||e);return`<span>
        <strong>${t(r(e.label)||n)}</strong>
        <small>${t(n)}</small>
      </span>`}).join(``);return`<div class="learning-card-generation-stage-rubric" data-stage-assessment-rubric data-stage-assessment-rubric-policy-id="${t(i)}">
      <div class="learning-card-generation-stage-rubric-head">
        <span>
          <strong>测评规则</strong>
          <small>${t(i||`formal_assessment`)}</small>
        </span>
        <em>${t(r(s.completionPolicy)||`formal_assessment`)}</em>
      </div>
      <div class="learning-card-generation-stage-rubric-grid">
        <span><small>批改</small><strong>${t(String(Number(s.evaluationAttempts||1)||1))} 次</strong></span>
        <span><small>反思</small><strong>${t(String(Number(s.reflectionAttempts||1)||1))} 次</strong></span>
        <span><small>时长</small><strong>${t(l)}</strong></span>
      </div>
      <div class="learning-card-generation-stage-rubric-dimensions">
        ${u||`<span><strong>维度待读取</strong><small>summary-only</small></span>`}
      </div>
      ${o.length?`<div class="learning-card-generation-stage-rubric-evidence">证据：${t(o.slice(0,6).join(` · `))}</div>`:``}
    </div>`}function bn({context:e={},state:t={},readiness:i={},plan:a={},escapeHtml:o=n}={}){let s=t.stageAssessment||{},c=s.controls||e.stageCheckpointControls||{},l=t.generatedResult||t.dailyLoopPublishResult?.generation||{},u=c.summary||{},d=c.readiness||{},f=d.evidence||{},p=_n(c,`activate_stage_assessment`),m=s.result||s.eligibility||{},h=d.reason||c.error?d:m.reason||m.activationReason||m.cycle?.activationReason||m.error?m:s.eligibility||m,g=s.status===`checking`||s.status===`activating`,_=s.controlsStatus===`loading`,v=s.controlsStatus===`failed`||c.ok===!1,y=r(u.status||d.activationState||m.activationState||m.cycle?.status||s.status),b=!!(i.targetEnabled&&i.workspaceProvisioned&&i.learningGraphReady&&i.historySummaryReady&&r(a.targetNodeId)),x=!!(c.ok===!0&&p?.enabled===!0&&i.gatewayConfigured),S=r(p?.disabledReason||(b?``:`target_not_ready`)||(i.gatewayConfigured?``:`gateway_not_ready`)||(c.ok?``:`controls_not_loaded`)),C=M(a.targetNodeIds).length?M(a.targetNodeIds):[a.targetNodeId].filter(Boolean),w=r(d.cooldownUntil||m.cooldownUntil||m.cycle?.cooldownUntil),ee=r(s.result?.published?.taskCardId),te=vn({controls:c,context:e,generated:l});return`<section class="learning-card-generation-stage-assessment" data-stage-assessment-panel data-stage-assessment-status="${o(y||`idle`)}">
      <div class="learning-card-generation-stage-head">
        <span>
          <strong>阶段测评</strong>
          <small>${o(hn(h))}</small>
        </span>
        <em>${o(mn(y||s.status))}</em>
      </div>
      <div class="learning-card-generation-stage-grid">
        <span><small>覆盖节点</small><strong>${o(String(C.length||0))}</strong></span>
        <span><small>近期轨迹</small><strong>${o(String(Number(u.recentTrajectoryCount??f.recentTrajectoryCount??0)||0))}</strong></span>
        <span><small>压力信号</small><strong>${o(String(Number(u.highPressureSignalCount??f.highPressureSignalCount??0)||0))}</strong></span>
      </div>
      ${w?`<div class="learning-card-generation-stage-note">冷却至 ${o(w.slice(0,10))}</div>`:``}
      ${yn(te,o)}
      <div class="learning-card-generation-stage-controls" data-stage-checkpoint-controls-status="${o(s.controlsStatus||(c.ok?`ready`:`idle`))}" data-stage-checkpoint-activate-enabled="${x?`true`:`false`}">
        <span>${o(_?`正在读取 controls read model。`:v?s.controlsError||c.error||`controls 读取失败。`:x?`Owner 可以显式生成一次正式阶段测评。`:gn(S||d.reason))}</span>
        <em>${o(c.ok?`controls`:_?`读取中`:`待检查`)}</em>
      </div>
      ${s.error?`<div class="learning-error" data-stage-assessment-error>${o(s.error)}</div>`:``}
      <div class="learning-card-generation-stage-actions">
        <button type="button" data-stage-assessment-check ${g||_||!b?`disabled`:``}>${_?`检查中`:`检查条件`}</button>
        <button type="button" class="primary" data-stage-assessment-activate ${g||!x?`disabled`:``} data-stage-assessment-blocked-reason="${o(x?``:gn(S||d.reason))}">${g?`生成中`:`生成阶段测评`}</button>
      </div>
      ${ee?`<button type="button" class="learning-card-generation-open-card" data-learning-open-growth-task="${o(ee)}">打开阶段测评</button>`:``}
    </section>`}function N(e){return Array.isArray(e)?e:[]}function P(e=``){let t=r(e).toLowerCase();return t===`loading`?`读取中`:t===`ready`||t===`pass`||t===`ready_for_release_review`?`可记录`:t===`recording`?`记录中`:t===`recorded`?`已记录`:t===`blocked`?`有缺口`:t===`failed`?`失败`:t||`待检查`}function xn(e=``){let t=r(e).toLowerCase();return t===`release_evidence`?`记录证据`:t===`release_approval`?`记录审批`:t===`release_evidence_collection`?`收集证据`:t===`release_decision`?`记录决策`:t===`release_activation`?`记录激活`:t===`runtime_enablement`?`记录启用`:t===`release_package`?`需要包体`:`查看`}function Sn(e=``){let t=r(e).toLowerCase();return t===`listed`?`已读取`:t===`recorded`?`已记录`:t===`blocked`?`已阻塞`:t===`failed`?`失败`:t===`loading`?`读取中`:P(t)}function Cn(e=``){return[`release_evidence`,`release_approval`,`release_evidence_collection`,`release_decision`,`release_package`,`release_activation`,`runtime_enablement`].includes(r(e).toLowerCase())}function wn(e={}){let t=e.packageResult||{},n=e.packageCandidate||t.package||t.releasePackage||t.release_package;return n&&typeof n==`object`?n:null}function Tn(e=[],t=n){let i=N(e).slice(0,5);return i.length?i.map((e={})=>{let n=r(e.actionAuditId||e.action_audit_id),i=r(e.endpointKey||e.endpoint_key),a=r(e.actionKey||e.action_key),o=r(e.recordId||e.record_id),s=r(e.recordStatus||e.record_status),c=[i,a,o?`record:${o}`:``,s].filter(Boolean).join(` · `)||`summary-only audit`;return`<div class="learning-card-generation-release-row" data-release-workbench-action-audit-row data-release-workbench-action-audit-id="${t(n)}">
        <span>
          <strong>${t(n||a||i||`action audit`)}</strong>
          <small>${t(r(e.error)||c)}</small>
        </span>
        <em>${t(Sn(e.status))}</em>
      </div>`}).join(``):`<div class="learning-card-generation-release-empty">暂无 release action audit。</div>`}function En(e={},t={},i=n){let a=t.releaseWorkbenchActionAudits||{},o=a.data||e.releaseWorkbenchActionAudits||{},s=N(o.actionAudits||o.action_audits),c=a.status===`loading`,l=a.status===`failed`,u=l?`failed`:c?`loading`:r(o.status||a.status||`idle`),d=l?r(a.error)||`release_workbench_action_audits_unavailable`:c?`正在读取 release workbench action audit。`:`${Number(o.actionAuditCount??s.length??0)||0} 条 summary-only action audit。`;return`<div class="learning-card-generation-release-action-audits" data-release-workbench-action-audits-panel data-release-workbench-action-audits-status="${i(u)}">
      <div class="learning-card-generation-release-head">
        <span>
          <strong>操作审计</strong>
          <small>${i(d)}</small>
        </span>
        <button type="button" data-release-workbench-action-audits-refresh ${c?`disabled`:``}>${i(c?`刷新中`:`刷新`)}</button>
      </div>
      <div class="learning-card-generation-release-grid">
        <span><small>Audit</small><strong>${i(String(Number(o.actionAuditCount??s.length??0)||0))}</strong></span>
        <span><small>状态</small><strong>${i(Sn(u))}</strong></span>
        <span><small>权限</small><strong>Owner</strong></span>
      </div>
      <div class="learning-card-generation-release-actions">
        ${Tn(s,i)}
      </div>
    </div>`}function Dn(e={},t=n){let i=r(e.actionStatus),a=r(e.actionError),o=e.actionResult||{},s=o.actionRecord||{};if(!i||i===`idle`)return``;let c=i===`recorded`?`已写入 ${r(o.endpointKey||s.endpointKey||`release`)} 记录${r(s.recordId)?`：${r(s.recordId)}`:`。`}`:i===`recording`?`正在写入 release workbench 摘要记录。`:a||`记录失败。`;return`<div class="learning-card-generation-release-status" data-release-workbench-action-status="${t(i)}">
      <span>${t(c)}</span>
      <em>${t(P(i))}</em>
    </div>`}function On(e={},t=n){let i=r(e.packageStatus),a=r(e.packageError),o=e.packageResult||{},s=wn(e);if(!i||i===`idle`)return``;let c=s?.summary||o.summary||{},l=r(s?.packageId||s?.package_id||s?.id||c.packageId||c.package_id),u=r(s?.status||c.status||o.status||i),d=Number(s?.stepCount??c.stepCount??(Array.isArray(s?.steps)?s.steps.length:0))||0,f=i===`building`?`正在构建 summary-only release package candidate。`:i===`ready`?`包候选已构建${l?`：${l}`:`。`}${u?` · ${u}`:``}${d?` · ${d} steps`:``}`:i===`blocked`?`包候选仍阻塞${u?`：${u}`:`。`}${a?` · ${a}`:``}`:a||`包候选构建失败。`;return`<div class="learning-card-generation-release-status" data-release-package-status="${t(i)}">
      <span>${t(f)}</span>
      <em>${t(P(i))}</em>
    </div>`}function kn(e={},t={},i=n){let a=r(e.endpointKey||e.endpoint_key),o=r(e.key||e.actionKey||e.action_key),s=t.packageStatus===`building`,c=t.actionStatus===`recording`,l=wn(t),u=l?c?`正在记录上一条 release action。`:``:`先构建 summary-only release package candidate，再记录 package。`;return`<div class="learning-card-generation-release-row" data-release-workbench-action-row data-release-workbench-endpoint="${i(a||`unsupported`)}">
      <span>
        <strong>${i(r(e.label)||o||`Record release package`)}</strong>
        <small>${i(r(e.source||e.action||`build package candidate before recording`))}</small>
      </span>
      <div class="learning-card-generation-release-row-actions">
        <button type="button"
          data-release-package-build
          data-release-workbench-action-key="${i(o)}"
          data-release-workbench-endpoint-key="${i(a)}"
          ${s||c?`disabled`:``}>${i(s?`构建中`:`构建包候选`)}</button>
        <button type="button"
          data-release-workbench-action
          data-release-workbench-action-key="${i(o)}"
          data-release-workbench-endpoint-key="${i(a)}"
          ${u?`data-release-workbench-blocked-reason="${i(u)}"`:``}
          ${!l||s||c?`disabled`:``}>${i(c?`记录中`:`记录包`)}</button>
      </div>
    </div>`}function An(e=[],t={},i=n){let a=t.actionStatus===`recording`;return e.length?e.slice(0,6).map(e=>{let n=r(e.endpointKey||e.endpoint_key),o=r(e.key||e.actionKey||e.action_key);if(n===`release_package`)return kn(e,t,i);let s=Cn(n),c=a||!s,l=e.externalActionRequired?`先在 Growth 外确认配置，再记录摘要`:r(e.source||e.action||`release workbench`),u=s?a?`正在记录上一条 release action。`:``:`当前界面只支持 evidence、approval、evidence collection、activation 和 runtime enablement。`;return`<div class="learning-card-generation-release-row" data-release-workbench-action-row data-release-workbench-endpoint="${i(n||`unsupported`)}">
        <span>
          <strong>${i(r(e.label)||o||xn(n))}</strong>
          <small>${i(l)}</small>
        </span>
        <button type="button"
          data-release-workbench-action
          data-release-workbench-action-key="${i(o)}"
          data-release-workbench-endpoint-key="${i(n)}"
          ${u?`data-release-workbench-blocked-reason="${i(u)}"`:``}
          ${c?`disabled`:``}>${i(a&&s?`记录中`:xn(n))}</button>
      </div>`}).join(``):`<div class="learning-card-generation-release-empty">暂无需要 Owner 记录的 release action。</div>`}function jn(e={},t={},i={}){let a=i.escapeHtml||n,o=i.renderers||{},s=t.releaseWorkbench||{},c=s.data||e.releaseWorkbench||{},l=c.releaseWorkbench||c,u=s.status===`loading`,d=s.status===`failed`,f=d?`failed`:u?`loading`:r(l.status||c.status||s.status),p=N(l.ownerActions||l.owner_actions),m=l.inventory||c.releaseInventory||{},h=N(l.missingEvidenceKeys).length?l.missingEvidenceKeys:l.missingCheckKeys,g=l.nextAction||p[0]||{},_=d?r(s.error)||`release_workbench_unavailable`:u?`正在读取 release readiness、controls、dashboard 和 inventory 摘要。`:r(g.label||g.action||`Owner 可以按缺口记录 release evidence。`);return`<section class="learning-card-generation-release-workbench" data-release-workbench-panel data-release-workbench-status="${a(f||`idle`)}">
      <div class="learning-card-generation-release-head">
        <span>
          <strong>发布工作台</strong>
          <small>${a(_)}</small>
        </span>
        <em>${a(P(f))}</em>
      </div>
      <div class="learning-card-generation-release-grid">
        <span><small>待处理</small><strong>${a(String(Number(l.ownerActionCount??p.length??0)||0))}</strong></span>
        <span><small>证据缺口</small><strong>${a(String(N(h).length))}</strong></span>
        <span><small>审批缺口</small><strong>${a(String(N(l.missingApprovalKeys).length))}</strong></span>
        <span><small>记录缺口</small><strong>${a(String(N(l.missingRecordKinds||m.missingRecordKinds).length))}</strong></span>
      </div>
      ${o.releaseArtifactTemplatePanel?.(e,t,a)||``}
      ${En(e,t,a)}
      ${o.releaseStatusReadbacksPanel?.(e,t,a)||``}
      ${o.releaseEvidenceLedgerPanel?.(e,t,a)||``}
      ${o.releaseLifecycleRecordsPanel?.(e,t,a)||``}
      <div class="learning-card-generation-release-actions">
        ${An(p,s,a)}
      </div>
      ${On(s,a)}
      ${Dn(s,a)}
    </section>`}function Mn(e,...t){return typeof e==`function`?e(...t):``}function Nn({key:e=``,title:t=``,subtitle:i=``,status:a=``,body:o=``,open:s=!1,escapeHtml:c=n}={}){return`<details class="learning-card-generation-disclosure" data-card-generation-disclosure="${c(r(e))}" ${s?`open`:``}>
      <summary>
        <span>
          <strong>${c(t)}</strong>
          <small>${c(i)}</small>
        </span>
        <em>${c(a)}</em>
      </summary>
      <div class="learning-card-generation-disclosure-body">
        ${o}
      </div>
    </details>`}function Pn(e={},t={},i={}){let a=i.escapeHtml||n,o=i.workspaceId||``,s=i.renderers||{},c=r(t.profileFeedback?.status||e.profileFeedback?.status||`画像`),l=r(t.automationClosedLoopActionPlan?.status||e.automationClosedLoopActionPlan?.status||`闭环`),u=r(t.releaseWorkbench?.status||e.releaseWorkbench?.status||`发布`),d=s.learningProfilePanel||_,f=s.profileFeedbackPanel||x,p=s.referenceChainPanel||pn,m=s.cycleDrilldownPanel||Ge,h=s.ownerAuditPanel||Qt,g=s.ownerAuditReviewPanel||cn,y=s.automationClosedLoopActionPlanPanel||Nt,b=s.automationCycleClosurePanel||It,S=s.automationReviewAdvancementPanel||zt,C=s.automationProposalPanel||et,w=s.automationDigestPanel||it,ee=s.automationFailurePolicyPanel||ct,te=s.automationActionHandoffPanel||pt,ne=s.automationSchedulerExecutionPanel||yt,re=s.automationSchedulerRunPanel||Ct,ie=s.automationSchedulerWorkerTargetPanel||Dt,ae=s.stageAssessmentPanel||((e,t,n)=>bn({context:e,state:t,readiness:e.readiness||{},plan:e.suggestedPlan||{},escapeHtml:n})),oe=s.releaseWorkbenchPanel||((e,t,n)=>jn(e,t,{escapeHtml:n}));return`<section class="learning-card-generation-secondary-readbacks" data-card-generation-secondary-readbacks>
      ${Nn({key:`profile`,title:`画像与证据`,subtitle:`能力画像、画像反馈、引用链、周期审计和 Owner 复核。`,status:v(c),body:[d(e,t,a),f(e,t,a),p(e,t,o,a),h(e,t,a),m(e,t,a),g(e,t,a)].join(``),escapeHtml:a})}
      ${Nn({key:`automation`,title:`闭环与自动化`,subtitle:`下一步建议、运行历史、阶段考核、提案、摘要、失败策略、交付和调度。`,status:P(l),body:[y(e,t,a),Mn(s.operatingLoopPanel,e,t,a),ae(e,t,a),b(e,t,a),S(e,t,a),C(e,t,a),w(e,t,a),ee(e,t,a),te(e,t,a),ne(e,t,a),re(e,t,a),ie(e,t,a)].join(``),escapeHtml:a})}
      ${Nn({key:`release`,title:`发布与审计`,subtitle:`发布工作台、证据记录和 release closure 操作。`,status:P(u),body:oe(e,t,a),escapeHtml:a})}
    </section>`}function Fn(e){return Array.isArray(e)?e:[]}function In(e={},t=n){let i=r(e.error);return i?`<div class="learning-error" data-card-generation-error>${t(i)}</div>`:``}function Ln(e={},t=n){let r=e.suggestedPlan||{},i=e.completionPolicy||{},a=e.targetProvisioning||{},o={learningGraphPlan:r.targetNodeId||``,targetProvisioning:{mode:a.mode||``,domainPackId:a.selectedDomainPackId||``,subject:a.selectedSubject||``},learnerSummary:`summary_only`,learningProfile:`mastery_trajectory_projection`,recentSignals:`bounded_experience_signals`,cardSchema:`growth.learningCard.v1`,completionPolicy:i.mode||`daily_score_once`};return t(JSON.stringify(o,null,2))}function Rn(e={},t=n){let i=e.draft||{},a=e.published||{};if(!i.title&&!a.taskCardId)return`<div class="learning-coin-empty">生成成功后会在这里显示卡片预览。</div>`;let o=i.teachingFlow||{},s=[[`微课`,o.microLesson?.instruction||o.learningTarget],[`例题`,o.workedExample?.instruction],[`练习`,o.guidedPractice?.instruction||o.quickCheck?.instruction]].filter(e=>r(e[1]));return`<article class="learning-card-generation-preview-card">
      <div class="learning-card-generation-preview-head">
        <span>
          <strong>${t(i.title||a.taskCardId||`新卡片`)}</strong>
          <small>${t(o.learningTarget||`日常英语练习`)}</small>
        </span>
        <em>已发布</em>
      </div>
      <div class="learning-card-generation-preview-meta">
        <b>一次批改</b><b>反思最多一次</b><b>无通过线</b>
      </div>
      <div class="learning-card-generation-flow">
        ${s.map((e,n)=>`<span><em>${n+1}</em><strong>${t(e[0])}</strong><small>${t(e[1])}</small></span>`).join(``)}
      </div>
      ${a.taskCardId?`<button type="button" class="learning-card-generation-open-card" data-learning-open-growth-task="${t(a.taskCardId)}">打开卡片</button>`:``}
    </article>`}function zn({draftResult:e={},publishResult:t={}}={},i=n){let a=t.planDraft||e.planDraft||{},o=t.publishAttempt||a.publishAttempt||{},s=t.generation||{},c=ne(a);if(!r(a.planDraftId))return`<section class="learning-card-generation-plan-preview" data-card-generation-plan-preview>
        <div class="learning-card-generation-plan-head">
          <span>
            <strong>下一张计划</strong>
            <small>先规划，再由 Owner 明确发布。</small>
          </span>
          <em>未规划</em>
        </div>
        <div class="learning-coin-empty">点击“规划下一张”后会显示 plan draft 和候选计划项。</div>
      </section>`;let l=Fn(c.targetNodeIds).map(r).filter(Boolean),u=Fn(a.targetNodeIds).map(r).filter(Boolean),d=l.length?l:u,f=Fn(c.evidenceRequirements).map(r).filter(Boolean),p=r(s.published?.taskCardId||a.generatedTaskCardId),m=r(o.status||(p?`published`:a.status));return`<section class="learning-card-generation-plan-preview" data-card-generation-plan-preview data-plan-draft-id="${i(a.planDraftId)}">
      <div class="learning-card-generation-plan-head">
        <span>
          <strong>下一张计划</strong>
          <small>${i(a.planSummary||c.reason||`summary-only plan draft`)}</small>
        </span>
        <em>${i(m||`drafted`)}</em>
      </div>
      <div class="learning-card-generation-plan-grid">
        <span><small>Plan draft</small><strong>${i(a.planDraftId)}</strong></span>
        <span><small>候选项</small><strong>${i(String(Number(a.itemCount||Fn(a.items).length||0)||0))}</strong></span>
        <span><small>已发布</small><strong>${i(p||`未发布`)}</strong></span>
      </div>
      <div class="learning-card-generation-plan-row">
        <span>
          <strong>${i(r(c.itemId||a.selectedItemId||`默认计划项`))}</strong>
          <small>${i(c.reason||`根据学习闭环选择一张低压力日常卡。`)}</small>
        </span>
        <em>${i(r(c.cardRole||`practice`))}</em>
      </div>
      <div class="learning-card-generation-plan-grid">
        <span><small>节点</small><strong>${i(d.join(` · `)||`未指定`)}</strong></span>
        <span><small>难度</small><strong>${i(r(c.difficultyBand||`foundation`))}</strong></span>
        <span><small>证据</small><strong>${i(f.join(` · `)||`short_answer`)}</strong></span>
      </div>
      ${o.error?`<div class="learning-card-generation-plan-attempt">${i(`发布尝试失败：${o.error}`)}</div>`:``}
    </section>`}function Bn({state:e={},context:t={}}={}){let n=t.readiness||{},r=t.suggestedPlan||{},i=[`generating`,`drafting`,`publishing`,`advancing`].includes(e.status),a=e.dailyLoopDraftResult||{},o=i?``:ie({state:e,context:t,readiness:n,plan:r}),s=i?``:ae({state:e,context:t,readiness:n,draftResult:a}),c=i?``:se({state:e,context:t,readiness:n,plan:r}),l=!i&&!o,u=!i&&!s,d=!i&&!c;return{busy:i,canAdvance:d,canDraft:l,canPublish:u,advanceClass:`primary${d?``:` disabled`}`,draftClass:`${l?``:`disabled`}`,publishClass:`primary${u?``:` disabled`}`,advanceBlockedReason:c,draftBlockedReason:o,publishBlockedReason:s}}function Vn(e={}){let t=e.escapeHtml||n,r=e.state?.cardGeneration||{},i=r.context||e.context||{};i.readiness;let a=i.suggestedPlan||{},o=r.generatedResult||{},s=r.status===`loading_context`,c=Bn({state:r,context:i}),l=r.dailyLoopDraftResult||{},u=r.dailyLoopPublishResult||{};return`<section class="learning-card-generation-manager" data-card-generation-manager data-card-generation-status="${t(r.status||`idle`)}" aria-busy="${c.busy?`true`:`false`}">
      <section class="learning-coin-panel learning-card-generation-intro">
        <div class="learning-section-heading">
          <h3>卡片生成</h3>
          <span>${t(ue(r.status))}</span>
        </div>
        <div class="learning-card-generation-kpis">
          ${Ne(i,t)}
        </div>
        ${In(r,t)}
      </section>
      ${fe(r,t)}

      <div class="learning-card-generation-layout">
        <section class="learning-coin-panel learning-card-generation-side">
          <div class="learning-section-heading">
            <h3>学习者</h3>
            <span>Owner</span>
          </div>
          <div class="learning-card-generation-target-list">
            ${Oe({targets:e.viewTargets,context:i,currentWorkspaceId:e.workspaceId,escapeHtml:t})}
          </div>
        </section>

        <section class="learning-coin-panel learning-card-generation-main">
          <div class="learning-section-heading">
            <h3>生成设置</h3>
            <span>结构化输入</span>
          </div>
          ${s?`<div class="learning-growth-muted">正在加载生成上下文...</div>`:``}
          <div class="learning-card-generation-recipes">
            ${Me(i,t)}
          </div>
          <div class="learning-card-generation-readiness">
            ${je(i,t)}
          </div>
          ${ke(i,r,t)}
          ${le({state:r,plan:a,canAdvance:c.canAdvance,canDraft:c.canDraft,canPublish:c.canPublish,advanceClass:c.advanceClass,draftClass:c.draftClass,publishClass:c.publishClass,advanceBlockedAttrs:ce(c.advanceBlockedReason,t),draftBlockedAttrs:ce(c.draftBlockedReason,t),publishBlockedAttrs:ce(c.publishBlockedReason,t),escapeHtml:t})}
          ${ee(r,i,t)}
          ${Pn(i,r,{escapeHtml:t,workspaceId:e.workspaceId,renderers:e.renderers||{}})}
        </section>

        <section class="learning-coin-panel learning-card-generation-preview">
          <div class="learning-section-heading">
            <h3>规划与发布</h3>
            <span>${o.published?.taskCardId?`已发布`:`等待生成`}</span>
          </div>
          ${zn({draftResult:l,publishResult:u},t)}
          ${Rn(o,t)}
          ${Nn({key:`structured-preview`,title:`结构化输入`,subtitle:`给 Owner 审计的摘要，不作为主流程阅读负担。`,status:`摘要`,body:`<pre class="learning-card-generation-structured">${Ln(i,t)}</pre>
              <div class="learning-card-generation-audit">
                <span>teachingFlow contract <em></em></span>
                <span>graph binding <em></em></span>
                <span>privacy scan <em></em></span>
                <span>SQLite transaction <em></em></span>
              </div>`,escapeHtml:t})}
        </section>
      </div>
    </section>`}function Hn(e={}){return e.cardGeneration&&typeof e.cardGeneration==`object`?e.cardGeneration:{}}function Un(e={}){return e.auth&&typeof e.auth==`object`?e.auth:{}}function Wn(e={}){return{activeTab:r(e.learningGrowthActiveTab||`overview`)||`overview`,boardLane:r(e.learningGrowthBoardLane),selectedTaskCardId:r(e.selectedLearningTaskCardId),settingsTaskId:r(e.learningGrowthSettingsTaskId),historyTaskCardId:r(e.learningGrowthHistoryTaskCardId),settingsOpen:e.learningGrowthSettingsOpen===!0,routeState:e.learningGrowthRouteState||null}}function Gn(e={},{viewTargets:t=[],currentWorkspaceId:n=``,sampleWorkspaceIds:r}={}){return ye({pageState:e,viewTargets:t,currentWorkspaceId:n,sampleWorkspaceIds:r})}function Kn(e={},{viewTargets:t=[],currentWorkspaceId:n=``,sampleWorkspaceIds:r}={}){return be({pageState:e,viewTargets:t,currentWorkspaceId:n,sampleWorkspaceIds:r})}function qn(e={}){return Se(e)}function Jn(e={},t={}){let n=Hn(e),i=Wn(e),a=Gn(e,t);return{isOwner:Un(e).isOwner===!0,route:i,cardGeneration:n,workspaceId:a,targetEnabled:Kn(e,t),targetProvisionSelection:qn(e),context:n.context||null,status:r(n.status||`idle`)||`idle`,error:r(n.error)}}function Yn(e){return Array.isArray(e)?e:[]}function Xn(e=``,t=``){let n=r(e);return n===`all`?`全部`:n===`today`?`今日`:n===`ready`?`当前`:n===`waiting_ai`?`等待 AI`:n===`evaluation_failed`?`批改失败`:n===`needs_revision`?`待修订`:n===`reflection_required`?`待复盘`:n===`locked_until`?`锁定`:n===`completed_recent`?`最近完成`:t||n||`任务`}function Zn(e=``){let t=r(e);return t===`all`?`暂无成长卡片`:t===`today`?`今日没有待处理任务`:t===`reflection_required`?`没有待复盘卡片`:t===`evaluation_failed`?`没有需处理的批改失败`:t===`completed_recent`?`暂无最近完成卡片`:`没有当前任务`}function Qn(e={}){let t=r(e.nextAction||e.primaryAction);return t===`submit`?`未提交`:t===`waiting_feedback`?`已提交，等待 AI`:t===`revise`?`需要修订`:t===`spoken_reflection`?`需要复盘`:t===`complete`?`已完成`:r(e.status)||t||`待处理`}function $n(e={}){let t=e.rewardPolicy||{},n=Number(e.rewardCapCoins||t.maxCoins||t.rewardCapCoins||100);return Number.isFinite(n)&&n>0?Math.round(n):100}function er(e={}){let t=e.latestRewardSettlement||e.rewardSettlement||null,n=Number(t?.coinAmount||0),i=Number.isFinite(n)&&n>0?Math.round(n):0,a=r(t?.status);return i&&a===`settled`?`已得 ${i} 金币`:i&&(a===`ready`||a===`pending_review`)?`待结算 ${i} 金币`:`奖励 ${$n(e)} 金币`}function F(e={}){let t=r(e.openedAt||e.generatedAt||e.availableAt||e.createdAt||e.plannedDate);if(!t)return``;let n=Date.parse(t);if(Number.isFinite(n)){let e=new Date(n),t=e=>String(e).padStart(2,`0`);return`${e.getFullYear()}-${t(e.getMonth()+1)}-${t(e.getDate())} ${t(e.getHours())}:${t(e.getMinutes())}`}let i=t.replace(`T`,` `);return i.length>16?i.slice(0,16):i}function tr(e={}){let t=r(e.status||e.executionStatus||e.laneId||e.nextAction||e.primaryAction).toLowerCase();return[`completed`,`complete`,`done`,`settled`,`completed_recent`].includes(t)}function nr(e={}){let t=r(e.rewardDecay?.severity);return t===`warning`?` is-reward-warning`:t===`danger`?` is-reward-danger`:``}function rr(e={},t=0,i=n){let a=r(e.artifactDirectoryPath);return!t||!a?``:`<button type="button" class="learning-growth-board-artifact-link" data-learning-growth-artifact-link data-directory-path-open data-directory-path="${i(a)}" data-directory-label="${i(e.title||`交付目录`)}" aria-label="打开交付目录" title="打开交付目录"><span class="learning-growth-board-artifact-icon" aria-hidden="true"></span></button>`}function ir(e={},t=n){let i=r(e.taskCardId||e.id);return i?`<button type="button" class="learning-growth-board-history-link" data-learning-open-growth-history="${t(i)}" data-workspace-id="${t(e.workspaceId||``)}" aria-label="查看同系列历史卡片" title="查看同系列历史卡片"><span aria-hidden="true"></span></button>`:``}function ar(e={},t={}){let i=t.escapeHtml||n,a=r(e.taskCardId||e.id),o=r(e.workspaceId||t.workspaceId),s=e.latestEvaluation||{},c=Number(s.score),l=Number.isFinite(c)&&c>0?`${Math.round(c)} 分`:``,u=Number(e.artifactCount||0),d=tr(e)?``:F(e);return`<article class="learning-growth-board-card${nr(e)}" data-learning-executable-task-id="${i(a)}" data-learning-open-growth-task="${i(a)}" data-workspace-id="${i(o)}">
      <div class="learning-growth-board-card-head">
        <button type="button" class="learning-growth-board-card-title" data-learning-open-growth-task="${i(a)}" data-workspace-id="${i(o)}">
          <strong>${i(e.title||a||`学习任务`)}</strong>
          <small data-learning-growth-board-card-reward="${i(a)}">${i(er(e))}</small>
        </button>
        <span>${i(Qn(e))}</span>
      </div>
      ${e.instructionPreview?`<p class="learning-growth-board-card-preview">${i(e.instructionPreview)}</p>`:``}
      <div class="learning-growth-board-card-meta">
        ${e.activityType?`<small>${i(e.activityType)}</small>`:``}
        ${d?`<small>${i(d)}</small>`:``}
        ${l?`<small>${i(l)}</small>`:``}
        ${rr(e,u,i)}
        ${ir(e,i)}
      </div>
    </article>`}function or(e={},t={}){let n=Yn(e.cards),i=new Map(n.map(e=>[r(e.taskCardId||e.id),e])),a=Yn(e.lanes).map(e=>{let t=Yn(e.cards).map(e=>i.get(r(e))).filter(Boolean);return Object.assign({},e,{id:r(e.id),count:Number(e.count??t.length)||t.length,laneCards:t})});return r(t.activeGrowthBoardLane)===`all`&&a.unshift({id:`all`,title:`All`,cards:n.map(e=>r(e.taskCardId||e.id)).filter(Boolean),count:n.length,laneCards:n}),a}function sr(e=[],t=``){let n=r(t);if(e.some(e=>e.id===n))return n;let i=e.filter(e=>e.count>0),a=i.length?i:e;return a.find(e=>e.count>0)?.id||a[0]?.id||``}function cr(e={},t={}){let i=t.escapeHtml||n,a=or(e,t);if(!a.length)return`<section class="learning-growth-board"><div class="learning-coin-empty">暂无成长任务。</div></section>`;let o=a.filter(e=>e.count>0),s=o.length?o:a,c=r(t.activeGrowthBoardLane),l=a.find(e=>e.id===c);l&&!s.some(e=>e.id===c)&&s.unshift(l);let u=sr(s,c);return`<section class="learning-growth-board" data-learning-growth-board>
      <div class="learning-growth-board-status-filter" role="tablist" aria-label="成长任务状态">
        ${s.map(e=>{let t=e.id===u;return`<button type="button" class="learning-growth-board-status-chip${t?` active`:``}" role="tab" aria-selected="${t?`true`:`false`}" data-learning-growth-board-filter="${i(e.id)}">
            <strong>${i(Xn(e.id,e.title))}</strong>
            <span>${i(String(e.count))}</span>
          </button>`}).join(``)}
      </div>
      <div class="learning-growth-board-lanes" data-growth-board-active-lane="${i(u)}">
        ${s.map(e=>{let n=e.id===u;return`<section class="learning-growth-board-lane${n?` active`:``}" data-growth-board-lane="${i(e.id)}" data-learning-growth-board-panel="${i(e.id)}"${n?``:` hidden`}>
            ${e.laneCards.length?e.laneCards.map(e=>ar(e,t)).join(``):`<div class="learning-growth-board-empty">${i(Zn(e.id))}</div>`}
          </section>`}).join(``)}
      </div>
    </section>`}function lr(e={},t={}){let n=e.route||{},r=e.board||e.overview?.board||e.model?.overview?.board||{};return cr(r,{activeGrowthBoardLane:t.activeGrowthBoardLane||n.boardLane||e.learningGrowthBoardLane,workspaceId:t.currentWorkspaceId||e.currentWorkspaceId||r.workspace_id||r.workspaceId})}function I(e,t){return`${r(e)}:${r(t)}`}function ur(e){return Array.isArray(e)?e.filter(e=>r(e)).slice(0,6):[]}function dr(e={}){return r(e.taskCardId||e.id)}function fr(e={},t={}){let n=r(e?.url);return n?typeof t.resolveGrowthAudioUrl==`function`?t.resolveGrowthAudioUrl(n,t.workspaceId):n:``}function pr(e={}){let t=Number(e.score);if(!Number.isFinite(t))return`未返回确定分数`;let n=Number(e.maxScore||e.totalScore||100),r=Number.isFinite(n)&&n>0?n:100;return`确定分数 ${Number.isInteger(t)?String(t):t.toFixed(1).replace(/\.0$/,``)}/${Number.isInteger(r)?String(r):r.toFixed(1).replace(/\.0$/,``)}`}function mr(e={},t=`录音`,r={}){let i=r.escapeHtml||n,a=fr(e,r);if(!a)return``;let o=Number(e.durationMs||0);return`<div class="learning-growth-submission-audio" data-learning-growth-audio-evidence>
      <strong>${i(t+(Number.isFinite(o)&&o>0?` · ${Math.round(o/1e3)} 秒`:``))}</strong>
      <audio controls preload="metadata" src="${i(a)}" data-learning-growth-saved-audio></audio>
      <small class="learning-growth-audio-error" data-learning-growth-audio-error hidden>录音暂时无法播放：当前浏览器不支持这个音频格式，或音频返回未通过校验。</small>
    </div>`}function hr(e={},t=`submission`){let n=r(e.status),i=n===`ready`&&e.url,a=n===`unsupported`,o=Number(e.elapsedMs||0);return e.message||(n===`recording`?`录音中 ${Math.max(1,Math.round(o/1e3))} 秒`:n===`requesting`?`正在请求麦克风`:n===`stopping`?`正在保存录音`:i?`录音已准备`:a?`当前浏览器不支持录音`:`可选：录一段音频作为证据`)}function gr(e={},t=`submission`,i={}){let a=i.escapeHtml||n,o=dr(e),s=(i.state||{}).learningGrowthRecordings?.[I(o,t)]||{},c=r(s.status),l=c===`requesting`||c===`recording`||c===`stopping`,u=c===`ready`&&s.url,d=u&&!s.playbackError,f=c===`unsupported`,p=t===`reflection`?`反思录音`:`作答录音`,m=c===`recording`?`停止录音`:u?`重新录音`:`开始录音`;return`<div class="todo-reading-recorder learning-growth-card-recorder" data-learning-growth-recorder="${a(o)}" data-record-kind="${a(t)}">
      <div class="todo-reading-recorder-actions">
        <button type="button" data-learning-growth-record-toggle="${a(o)}" data-record-kind="${a(t)}" ${f||l&&c!==`recording`?`disabled`:``}>${a(m)}</button>
        ${u?`<button type="button" data-learning-growth-record-clear="${a(o)}" data-record-kind="${a(t)}">清除</button>`:``}
      </div>
      <span class="learning-native-growth-submission-state" data-learning-growth-record-status>${a(p)}：${a(hr(s,t))}</span>
      ${d?`<audio controls preload="metadata" src="${a(s.url)}" data-learning-growth-record-playback="${a(o)}" data-record-kind="${a(t)}"></audio>`:``}
    </div>`}function _r(e={},t={}){let r=t.escapeHtml||n,i=e.latestSubmission||null;if(!i)return``;let a=i.submittedAt?` · ${r(i.submittedAt)}`:``,o=[],s=Number(i.textCharCount||i.charCount||0),c=Number(i.wordCount||0);return Number.isFinite(c)&&c>0&&o.push(`${c} 词`),Number.isFinite(s)&&s>0&&o.push(`${s} 字符`),`<div class="todo-learning-growth-status" data-learning-growth-submission-status>
      <strong>作答已提交${a}${r(o.length?` · ${o.join(` / `)}`:``)}</strong>
      <p>这张日常卡只批改一次。批改完成后按实际分数记录学习证据，不要求反复改到某个分数。</p>
      ${mr(i.audio,`作答录音`,t)}
    </div>`}function vr(e,t,r={}){let i=r.escapeHtml||n,a=ur(t);return a.length?`<div class="todo-learning-growth-feedback-list"><strong>${i(e)}</strong><ul>${a.map(e=>`<li>${i(e)}</li>`).join(``)}</ul></div>`:``}function yr(e={},t=!1,i={}){let a=i.escapeHtml||n,o=r(e.status).toLowerCase(),s=[],c=Number(e.attemptCount||0);c>0&&s.push(`已尝试 ${c} 次`),o===`retry`&&e.availableAt&&s.push(`下次处理 ${e.availableAt}`),o===`processing`&&e.leaseUntil&&s.push(`处理中，租约到 ${e.leaseUntil}`);let l=e.lastOwnerReview||null;return t&&l?.reviewedAt&&s.push(`Owner 已在 ${l.reviewedAt} 重新加入队列`),t&&e.lastError&&s.push(`错误摘要：${r(e.lastError).slice(0,120)}`),s.length?`<p class="learning-native-growth-submission-state">${a(s.join(` · `))}</p>`:``}function br(e={},t={}){let i=t.escapeHtml||n,a=dr(e),o=e.latestSubmission||null,s=e.latestEvaluation||null,c=e.latestEvaluationJob||null,l=r(c?.status).toLowerCase()===`failed`,u=t.state||{},d=!!(u.auth?.isOwner||t.isOwner),f=!!u.learningGrowthEvaluationBusy?.[a],p=u.learningGrowthInteractionMessages?.[I(a,`evaluation`)]||``,m=r(e.workspaceId||t.workspaceId);if(!o&&!s)return``;if(!s){if(l){let e=d?`<button type="button" class="learning-growth-secondary-action" data-learning-growth-evaluation-retry="${i(a)}" data-workspace-id="${i(m)}" ${f?`disabled`:``}>${f?`处理中`:`重新批改`}</button>`:``;return`<div class="todo-learning-growth-evaluation is-failed" data-learning-growth-evaluation-panel="${i(a)}">
          <div class="todo-learning-growth-evaluation-head"><strong>批改未完成</strong><span class="todo-learning-growth-score-pill">需要处理</span></div>
          <p>${i(p||`作答已保存，但系统批改多次未完成。请稍后刷新状态，或让 Owner 检查后再处理。`)}</p>
          ${yr(c,d,t)}
          <div class="learning-growth-teaching-actions"><button type="button" data-learning-growth-evaluation-refresh="${i(a)}" ${f?`disabled`:``}>${f?`刷新中`:`刷新状态`}</button>${e}</div>
        </div>`}return`<div class="todo-learning-growth-evaluation" data-learning-growth-evaluation-panel="${i(a)}">
        <div class="todo-learning-growth-evaluation-head"><strong>等待批改</strong><span class="todo-learning-growth-score-pill">一次批改</span></div>
        <p>${i(p||`作答已保存，系统会处理一次批改。也可以手动刷新批改状态。`)}</p>
        ${yr(c,d,t)}
        <div class="learning-growth-teaching-actions"><button type="button" data-learning-growth-evaluation-refresh="${i(a)}" ${f?`disabled`:``}>${f?`刷新中`:`刷新批改`}</button></div>
      </div>`}let h=s.feedbackSections&&typeof s.feedbackSections==`object`?s.feedbackSections:{},g=ur(s.remainingWeaknesses).length?s.remainingWeaknesses:h.remainingWeaknesses;return`<div class="todo-learning-growth-evaluation" data-learning-growth-evaluation-panel="${i(a)}">
      <div class="todo-learning-growth-evaluation-head"><strong>批改已完成</strong><span class="todo-learning-growth-score-pill">${i(pr(s))}</span></div>
      <p>${i(s.summary||`本次作答已经记录为学习证据。`)}</p>
      ${vr(`做得好的地方`,h.strengths||s.strengths,t)}
      ${vr(`还可以练的点`,g,t)}
      ${vr(`下一次练习`,h.nextPractice||s.revisionRequirements,t)}
      ${p?`<p class="learning-native-growth-submission-state">${i(p)}</p>`:``}
    </div>`}function xr(e={}){return r(e.taskCardId||e.id)}function Sr(e={},t={}){let r=t.escapeHtml||n,i=e.latestReflection||null;return i?`<div class="todo-learning-growth-reflection-status" data-learning-growth-reflection-status>
      <strong>反思已提交${i.submittedAt?` · ${r(i.submittedAt)}`:``}</strong>
      <p>${r(i.summary||`反思已经作为学习证据保存，不会触发第二次批改。`)}</p>
      ${mr(i.audio,`反思录音`,t)}
    </div>`:``}function Cr(e={},t={}){let r=t.escapeHtml||n,i=xr(e),a=t.state||{},o=a.learningGrowthReflectionDrafts?.[i]||{},s=!!a.learningGrowthReflectionBusy?.[i],c=a.learningGrowthInteractionMessages?.[I(i,`reflection`)]||``;return`<form class="todo-learning-growth-reflection learning-native-growth-submission-form" data-learning-growth-reflection-form="${r(i)}" data-workspace-id="${r(t.workspaceId||e.workspaceId||``)}">
      <strong>反思一次</strong>
      <p>可以用一句话或一段录音说清楚：哪里做得好、哪里下次继续练。反思只保存学习证据，不影响本卡分数。</p>
      <textarea class="input learning-native-growth-submission-input" rows="3" maxlength="2000" data-learning-growth-reflection-text="${r(i)}" placeholder="写下反思，或者只提交录音。">${r(o.text||``)}</textarea>
      ${gr(e,`reflection`,t)}
      ${c?`<p class="learning-native-growth-submission-state">${r(c)}</p>`:``}
      <div class="learning-growth-teaching-actions"><button type="submit" ${s?`disabled`:``}>${s?`提交中`:`提交反思`}</button></div>
    </form>`}function wr(e={},t={}){return e.latestEvaluation?e.latestReflection?Sr(e,t):Cr(e,t):``}function Tr(e){return Array.isArray(e)?e.filter(e=>r(e)):[]}function Er(e={}){return r(e.taskCardId||e.id)}function Dr(e={}){let t=e.rewardPolicy||{},n=Number(e.rewardCapCoins||t.maxCoins||t.rewardCapCoins||100);return Number.isFinite(n)&&n>0?Math.round(n):100}function Or(e={}){let t=e.latestRewardSettlement||e.rewardSettlement||null,n=Number(t?.coinAmount||t?.coins||0);return Number.isFinite(n)&&n>0?Math.round(n):0}function kr(e={},t={},i={}){let a=i.escapeHtml||n,o=Er(e);if(r(e.status).toLowerCase()!==`completed`)return``;let s=e.experienceSummary&&typeof e.experienceSummary==`object`?e.experienceSummary:{},c=t.learningGrowthExperienceSignalSubmitted?.[o]||``,l=t.learningGrowthExperienceSignalBusy?.[o]||``,u=r(s.latestSignalType||c),d=t.learningGrowthInteractionMessages?.[I(o,`experience`)]||``,f=Tr(e.targetNodeIds||s.targetNodeIds),p=f.join(` `),m=!f.length,h=[[`too_easy`,`太简单`],[`right_level`,`正合适`],[`too_hard`,`有点难`]],g=u?`难度感受已记录到成长画像输入。`:m?`这张卡缺少图谱节点绑定，暂时不能写入难度感受。`:`选择一项，下一张卡会参考这个信号。`;return`<div class="learning-growth-experience-actions" data-learning-growth-experience-actions="${a(o)}" data-learning-growth-experience-mode="active">
      ${h.map(([t,n])=>{let r=l===t,i=u===t||r;return`<button type="button" class="${i?`is-selected`:``}${r?` is-pending`:``}" data-learning-growth-experience-signal="${a(o)}" data-signal-type="${a(t)}" data-workspace-id="${a(e.workspaceId||``)}" data-target-node-ids="${a(p)}" aria-current="${i?`true`:`false`}" ${l||m?`disabled`:``}>${a(r?`记录中`:n)}</button>`}).join(``)}
      <small data-learning-growth-experience-note>${a(d||g)}</small>
    </div>`}function Ar(e={},t={},i={}){let a=i.escapeHtml||n,o=e.experienceSummary||{},s=Or(e),c=Dr(e),l=r(e.status).toLowerCase()===`completed`;return!l&&!o.latestAt&&!o.lastCompletionAt?``:`<section class="learning-growth-teaching-feedback" data-learning-growth-teaching-feedback>
      <strong>${a(l?`本卡已完成`:`学习反馈已记录`)}</strong>
      <p>${a(s?`已按本次分数结算 ${s} / ${c} 金币；这张卡只作为低压力学习证据，不当作正式能力测验。`:`最高 ${c} 金币，按本次分数比例结算；这张卡不当作正式能力测验。`)}</p>
      ${l?`<p class="learning-growth-experience-prompt">${a(`完成后可以记录难度感受，用来帮助下一张卡调节难度。`)}</p>${kr(e,t,i)}`:``}
    </section>`}function jr(e){return Array.isArray(e)?e.filter(e=>r(e)).slice(0,8):[]}function Mr(e={}){return r(e.taskCardId||e.id)}function Nr(e={},t={}){let n=t.flow||e.flow||e.teachingFlow||{};return n.quickCheck||n.check||e.quickCheck||{}}function Pr(e={},t={}){let n=Mr(e),i=t.learningGrowthSubmissionDrafts?.[n]||t.learningGrowthTeachingDrafts?.[n]||{};return r(i.submissionText||i.text||i.value)}function Fr(e=null,t={}){if(!e)return``;let i=t.escapeHtml||n,a=!!e.ok,o=r(e.message)||(a?`已达到提交要求。`:`请补充作答内容后再提交。`);return`<p class="todo-learning-growth-submit-requirement ${a?`is-ready`:`is-short`}">${i(o)}</p>`}function Ir(e={},t={}){let i=t.escapeHtml||n,a=t.state||{},o=Mr(e),s=Nr(e,t),c=!!e.latestSubmission,l=r(e.status).toLowerCase()===`completed`,u=!!a.learningGrowthSubmissionBusy?.[o],d=a.learningGrowthInteractionMessages?.[I(o,`submission`)]||``,f=jr(s.completionCriteria),p=r(s.instruction||e.instruction||`提交你的作答。`),m=Pr(e,a),h=r(t.workspaceId||e.workspaceId);return`<form class="learning-growth-teaching-check-form learning-native-growth-submission-form" data-learning-growth-teaching-check-form="${i(o)}" data-learning-growth-submission-form="${i(o)}" data-workspace-id="${i(h)}">
      <h4>提交作答</h4>
      <p>${i(p)}</p>
      ${f.length?`<ul>${f.map(e=>`<li>${i(e)}</li>`).join(``)}</ul>`:``}
      ${c?``:`<textarea class="input learning-native-growth-submission-input" rows="4" maxlength="4000" data-learning-growth-teaching-draft="${i(o)}" data-field="submissionText" placeholder="写下你的作答。">${i(m)}</textarea>`}
      ${c?``:gr(e,`submission`,t)}
      ${d?`<p class="learning-native-growth-submission-state">${i(d)}</p>`:``}
      ${Fr(t.validation,t)}
      ${c||l?``:`<div class="learning-growth-teaching-actions"><button type="submit" ${u?`disabled`:``}>${u?`提交中`:`提交作答`}</button></div>`}
    </form>`}function Lr(e={},t={}){return`<section class="learning-growth-teaching-section learning-growth-daily-submit-panel" data-learning-growth-teaching-section="submit" data-learning-growth-card-interaction="${(t.escapeHtml||n)(Mr(e))}">
      ${Ir(e,t)}
      ${_r(e,t)}
      ${br(e,t)}
      ${wr(e,t)}
      ${Ar(e,t.state||{},t)}
    </section>`}function L(e,t=6){return Array.isArray(e)?e.filter(e=>r(e)).slice(0,t):[]}function R(e){return e&&typeof e==`object`?e:{}}function Rr(e={}){return r(e.taskCardId||e.id||e.cardId)}function zr(e={}){let t=r(e.cardRole||e.card_role||e.learningGrowthCardRole).toLowerCase().replace(/[-\s]+/g,`_`);return[`teaching`,`practice`,`integration_practice`,`stage_assessment`].includes(t)?t:(r(e.taskCardType||e.task_card_type||e.taskModel?.taskCardType).toLowerCase(),r(e.activityType||e.taskModel?.activityType).toLowerCase(),`stage_assessment`)}function Br(e=``){return e===`teaching`?`教学卡`:e===`practice`?`练习卡`:e===`integration_practice`?`综合练习`:e===`stage_assessment`?`能力测验`:`成长卡`}function Vr(e={}){return!!(e.teachingFlow||e.flow||e.quickCheck||e.lesson||e.guidedPractice||e.cardRole||e.learningGrowthCardRole)}function Hr(e={}){let t=R(e.taskModel||e.learningTaskModel),n=R(e.teachingFlow||e.flow),i=R(n.lesson||e.lesson),a=R(n.microLesson),o=R(n.workedExample||e.workedExample),s=R(n.guidedPractice||e.guidedPractice),c=R(n.quickCheck||e.quickCheck),l=L(o.steps,5),u=typeof n.microLesson==`string`?n.microLesson:r(a.explanation||a.summary||a.text),d=L(i.examples,4).length?L(i.examples,4):l.length?l.map(e=>[e?.label,e?.text].filter(Boolean).join(`: `)):L(e.deliverables||t.deliverables,4),f=L(c.completionCriteria,5).length?L(c.completionCriteria,5):L(e.acceptance||t.acceptance,5);return{learningTarget:r(n.learningTarget||i.learningTarget||e.learningTarget||t.learningTarget),prerequisites:L(n.prerequisites||e.prerequisites||t.prerequisites,5),lesson:{title:r(i.title||e.title||`学习重点`),explanation:r(i.explanation||u||e.learnerInstruction||e.instruction||t.learnerInstruction||e.summary||`先看讲解，再做一个很小的检查。`),whyItMatters:r(n.whyItMatters||n.why),keyPoints:L(a.keyPoints,5),examples:d,workedExample:{instruction:r(o.instruction),steps:l}},guidedPractice:{instruction:r(s.instruction||s.prompt||e.guidedPracticePrompt||`照着讲解做一小步，不需要一次写得很完整。`),hints:L(s.hints,4)},quickCheck:{instruction:r(c.instruction||c.prompt||`用 1-3 句话说明你刚才学会了什么，或者写一个最小答案。`),completionCriteria:f},tooHardFallback:r(n.tooHardFallback||e.tooHardFallback),evidenceToRecord:L(n.evidenceToRecord||e.evidenceToRecord,4),difficultyBasis:r(n.difficultyBasis||e.difficultyBasis),supportLevel:r(n.supportLevel||e.supportLevel)}}function Ur(e={}){return e.latestReflection?`反思已记录`:e.latestEvaluation?`批改已完成`:r(e.latestEvaluationJob?.status).toLowerCase()===`failed`?`批改未完成`:e.latestSubmission?`等待批改`:`待作答`}function Wr(e=``,t={}){let r=t.escapeHtml||n;return`<span class="learning-growth-role-badge is-${r(e)}">${r(Br(e))}</span>`}function Gr(e=``,t={}){let i=t.escapeHtml||n,a=r(e);if(!a)return``;let o=`分享学习卡图片`;return`<button type="button" class="learning-growth-card-share-button" data-learning-growth-card-share="${i(a)}" aria-label="${i(o)}" title="${i(o)}">分享</button>`}function Kr(e={},t={}){let i=t.escapeHtml||n,a=!!e.latestSubmission,o=!!e.latestEvaluation,s=r(e.latestEvaluationJob?.status).toLowerCase()===`failed`,c=!!e.latestReflection;return`<div class="learning-growth-daily-flow" data-learning-growth-daily-flow>
      ${[[`submit`,`提交`,a?`done`:`current`,a?`已提交`:`待提交`],[`evaluate`,`批改`,o?`done`:s||a?`current`:`pending`,o?`已完成`:s?`需要处理`:a?`处理中`:`待提交后`],[`reflect`,`反思`,c?`done`:o?`current`:`pending`,c?`已记录`:o?`待反思`:`待批改后`]].map(([e,t,n,r])=>`<span class="is-${i(n)}" data-learning-growth-flow-step="${i(e)}"><b>${i(t)}</b><small>${i(r)}</small></span>`).join(``)}
    </div>`}function qr(e={},t={},r={}){let i=r.escapeHtml||n,a=Dr(e),o=Or(e),s=e.latestEvaluation?pr(e.latestEvaluation):``,c=[t.supportLevel,t.difficultyBasis].filter(Boolean).join(` · `);return`<section class="learning-growth-answer-reward learning-growth-daily-score-policy" data-learning-growth-daily-score-policy>
      <div class="learning-growth-answer-reward-head">
        <h4>学习流程</h4>
        <strong>${i(Ur(e))}</strong>
      </div>
      <div class="learning-growth-answer-reward-grid">
        <span><b>1 次</b><small>提交作答</small></span>
        <span><b>1 次</b><small>系统批改</small></span>
        <span><b>1 次</b><small>学习反思</small></span>
        <span><b>${i(s||`待评分`)}</b><small>${i(o?`已结算 ${o} 金币`:`${a} 金币上限`)}</small></span>
      </div>
      <p>这张日常卡按提交、批改、反思三步完成。每一步只保留一个输入位置；批改只运行一次，并按一次批改结果打分，不要求达到固定通过线。</p>
      ${c?`<p class="learning-growth-daily-support">${i(c)}</p>`:``}
    </section>`}function Jr(e={},t={}){let r=t.escapeHtml||n;return`<section class="learning-growth-teaching-section" data-learning-growth-teaching-section="lesson">
      <h4>学习目标</h4>
      <p>${r(e.learningTarget||e.lesson?.title||`学习重点`)}</p>
      ${e.prerequisites?.length?`<div class="learning-growth-teaching-hints" data-learning-growth-prerequisites>${e.prerequisites.map(e=>`<span>${r(e)}</span>`).join(``)}</div>`:``}
      <h4>讲解</h4>
      ${e.lesson?.whyItMatters?`<p class="learning-growth-teaching-why">${r(e.lesson.whyItMatters)}</p>`:``}
      <p>${r(e.lesson?.explanation||``)}</p>
      ${e.lesson?.keyPoints?.length?`<ul>${e.lesson.keyPoints.map(e=>`<li>${r(e)}</li>`).join(``)}</ul>`:``}
      ${e.lesson?.workedExample?.steps?.length?`<div class="learning-growth-teaching-worked-example">
        ${e.lesson.workedExample.instruction?`<strong>${r(e.lesson.workedExample.instruction)}</strong>`:``}
        ${e.lesson.workedExample.steps.map(e=>`<article><b>${r(e.label||``)}</b><p>${r(e.text||``)}</p></article>`).join(``)}
      </div>`:``}
      ${e.lesson?.examples?.length?`<ul>${e.lesson.examples.map(e=>`<li>${r(e)}</li>`).join(``)}</ul>`:``}
    </section>`}function Yr(e={},t={},r={},i={}){let a=i.escapeHtml||n;return`<section class="learning-growth-teaching-section" data-learning-growth-teaching-section="guided_practice">
      <h4>跟着做一小步</h4>
      <p>${a(t.guidedPractice?.instruction||`照着讲解做一小步，不需要一次写得很完整。`)}</p>
      ${t.guidedPractice?.hints?.length?`<div class="learning-growth-teaching-hints">${t.guidedPractice.hints.map(e=>`<span>${a(e)}</span>`).join(``)}</div>`:``}
      <p class="learning-native-growth-submission-state">这里先看提示和例子；需要写下来的内容统一放到下面的提交框。</p>
    </section>`}function Xr(e={},t={}){let i=t.escapeHtml||n,a=Rr(e),o=zr(e),s=Hr(e),c=t.state||{},l=Object.assign({},c.learningGrowthTeachingDrafts?.[a]||{}),u=e.expectedDurationMinutes||{},d=Number(u.min||e.plannedMinutes||10),f=Number(u.max||Math.max(d,15)),p=r(t.workspaceId||e.workspaceId);return`<section class="learning-growth-answer-card learning-growth-card-detail-shell learning-growth-teaching-card" data-learning-growth-answer-card data-learning-growth-teaching-card="${i(a)}" data-learning-growth-card-role="${i(o)}" data-learning-executable-task-id="${i(a)}">
      <div class="learning-growth-card-detail-hero learning-growth-teaching-hero">
        <div class="learning-growth-teaching-head learning-growth-card-detail-head">
          <div>${Wr(o,t)}<span>${i(`约 ${d||10}-${f||15} 分钟`)}</span><span>${i(`${Dr(e)} 金币`)}</span></div>
          <div class="learning-growth-card-detail-actions">${Gr(a,t)}<button type="button" class="learning-settings-back" data-learning-close-growth-task>返回看板</button></div>
        </div>
        <h3>${i(e.title||`学习卡`)}</h3>
      </div>
      ${Kr(e,t)}
      ${qr(e,s,t)}
      ${Jr(s,t)}
      ${Yr(e,s,l,t)}
      ${Lr(e,Object.assign({},t,{flow:s,state:c,workspaceId:p}))}
    </section>`}function Zr(e){return Array.isArray(e)?e:[]}function Qr(e={}){let t=e.taskModel||e.learningTaskModel||{};return t&&typeof t==`object`?t:{}}function $r(e,t){let n=Number(e);return Number.isFinite(n)&&n>0?Math.round(n):t}function ei(e=[],t=``,n=`updatedAt`){let i=r(t),a=Zr(e).filter(e=>r(e?.taskCardId)===i);return a.length?a.slice().sort((e,t)=>String(t?.[n]||t?.updatedAt||t?.createdAt||``).localeCompare(String(e?.[n]||e?.updatedAt||e?.createdAt||``)))[0]:null}function ti(e={}){let t=Qr(e),n=r(t.activityType).toLowerCase(),i=r(t.skillId||e.skillId||Zr(e.skillIds)[0]).toLowerCase();return n===`speaking`||n===`pronunciation`||i===`english_speaking_retell`||i===`english_pronunciation_shadowing`}function ni(e={},t={}){let n=t.growthTaskUi||null;return n&&typeof n.submissionPrompt==`function`?n.submissionPrompt({},Object.assign({learningTaskModel:Qr(e)},e)):`写下本次学习任务作答，提交后由 AI 批改并生成反馈。`}function ri(e={},t={}){let n=t.growthTaskUi||null;if(n&&typeof n.submissionGuard==`function`)return n.submissionGuard(Object.assign({learningTaskModel:Qr(e)},e),{});let i=r(Qr(e).activityType).toLowerCase(),a={writing:{minWords:80,minChars:300},reading:{minWords:50,minChars:250},listening:{minWords:35,minChars:180},speaking:{minWords:45,minChars:220},pronunciation:{minWords:20,minChars:100},vocabulary:{minWords:40,minChars:220},grammar:{minWords:35,minChars:180},rewriting:{minWords:70,minChars:380},presentation:{minWords:60,minChars:320},weekly_challenge:{minWords:80,minChars:450}}[i]||{minWords:40,minChars:200};return Object.assign({activityType:i||`default`,stage:`draft`},a)}function ii(e={},t={}){let n=t.growthTaskUi||null;return n&&typeof n.submissionRequirementLabel==`function`?n.submissionRequirementLabel(e):`至少 ${$r(e.minWords,0)} 个英文词 / ${$r(e.minChars,0)} 个有效字符`}function ai(e={}){let t=new Map;return Zr(e.structuredResponses).forEach((e,n)=>{let i=r(e?.questionId||e?.id||`q${n+1}`);i&&t.set(i,e)}),t}function oi(e={}){let t=Qr(e);return(Array.isArray(e.questionItems)?e.questionItems:Array.isArray(t.questionItems)?t.questionItems:Array.isArray(t.questions)?t.questions:[]).map((e,t)=>{let n=r(e?.id||`q${t+1}`),i=r(e?.type||e?.questionType).toLowerCase(),a=Array.isArray(e?.choices)?e.choices:[];return Object.assign({},e,{id:n,type:i===`single_choice`?`multiple_choice`:i,choices:a})}).filter(e=>e.id&&(e.stem||e.body||e.prompt||e.title||e.question||e.choices.length))}function si(e={},t={}){let i=t.escapeHtml||n,a=oi(e);if(!a.length)return``;let o=ai(e.latestSubmission||{});return`<div class="learning-native-growth-questions" data-learning-native-growth-questions>
      ${a.map((e,t)=>{let n=r(e.id||`q${t+1}`),a=r(e.type||`written`),s=r(e.title||`第 ${t+1} 题`),c=r(e.stem||e.body||e.prompt||e.question),l=o.get(n)||{};if(a===`multiple_choice`){let t=Zr(e.choices).map((e,t)=>{let a=r(e?.id||e?.value||String.fromCharCode(65+t)),o=r(e?.label||a),s=r(e?.text||e?.content||e?.label||a),c=r(l.choice)===a?` checked`:``;return`<label class="learning-native-growth-choice">
              <input type="radio" name="learning-growth-${i(n)}" value="${i(a)}" data-learning-native-growth-question-choice="${i(n)}"${c}>
              <span><b>${i(o)}</b>${i(s===o?``:` ${s}`)}</span>
            </label>`}).join(``);return`<fieldset class="learning-native-growth-question" data-learning-native-growth-question="${i(n)}" data-question-type="multiple_choice" data-question-title="${i(s)}">
            <legend>${i(s)}</legend>
            ${c?`<p>${i(c)}</p>`:``}
            <div class="learning-native-growth-choice-list">${t}</div>
            <label class="learning-native-growth-reason-label">
              <span>${i(e.reasonLabel||`简短理由`)}</span>
              <textarea class="input learning-native-growth-question-reason" rows="2" maxlength="1200" data-learning-native-growth-question-reason="${i(n)}" placeholder="${i(e.reasonPlaceholder||`写 1-2 句理由`)}">${i(l.reason||``)}</textarea>
            </label>
          </fieldset>`}return`<fieldset class="learning-native-growth-question" data-learning-native-growth-question="${i(n)}" data-question-type="written" data-question-title="${i(s)}">
          <legend>${i(s)}</legend>
          ${c?`<p>${i(c)}</p>`:``}
          <textarea class="input learning-native-growth-question-response" rows="5" maxlength="5000" data-learning-native-growth-question-response="${i(n)}" placeholder="${i(e.responsePlaceholder||`写出关键推理过程`)}">${i(l.response||``)}</textarea>
        </fieldset>`}).join(``)}
    </div>`}function ci(e=``,t={}){let n=t.state?.learningNativeGrowthSubmissionRecorders?.[e]||{};return n.status===`requesting`?`正在请求麦克风权限...`:n.status===`recording`?`正在录音`:n.status===`stopping`?`正在生成复述录音...`:n.status===`ready`?`已录好复述`:n.status===`unsupported`?`当前浏览器不支持直接录音。`:n.status===`error`?n.error||`复述录音不可用，请重试。`:`阅读上方材料后，用英语录音复述。提交后会先转写，再进入 AI 批改。`}function li(e=``,t={}){let n=t.state?.learningNativeGrowthSubmissionRecorders?.[e]||{};return n.status===`requesting`?`正在请求麦克风权限...`:n.status===`recording`?`正在录音`:n.status===`stopping`?`正在生成复盘录音...`:n.status===`ready`?`已录好复盘`:n.status===`unsupported`?`当前浏览器不支持直接录音。`:n.status===`error`?n.error||`复盘录音不可用，请重试。`:`阅读 AI 反馈后，录一段复盘，说明错误、修改原因和下次练习方向。`}function ui(e={},t={}){let i=t.escapeHtml||n,a=r(e.taskCardId),o=t.state?.learningNativeGrowthSubmissionRecorders?.[a]||{},s=r(o.status),c=s===`ready`&&o.url,l=s===`recording`,u=s===`requesting`||s===`stopping`;return`<div class="learning-native-growth-recorder" data-learning-native-growth-recorder="${i(a)}">
      <div class="learning-native-growth-recorder-status" data-learning-native-growth-record-status="${i(a)}">${i(ci(a,t))}</div>
      ${c?`<audio controls preload="metadata" src="${i(o.url)}"></audio>`:``}
      <div class="learning-program-task-actions learning-native-growth-recorder-actions">
        ${l?`<button type="button" data-learning-native-growth-record-stop="${i(a)}">停止录音</button>`:`<button type="button" data-learning-native-growth-record-start="${i(a)}" ${u?`disabled`:``}>${c?`重新录音`:`开始录音`}</button>`}
        ${c||l||s===`error`?`<button type="button" data-learning-native-growth-record-cancel="${i(a)}">清除</button>`:``}
      </div>
    </div>`}function di(e={},t={}){let i=t.escapeHtml||n,a=r(e.taskCardId),o=t.state?.learningNativeGrowthSubmissionRecorders?.[a]||{},s=r(o.status),c=s===`ready`&&o.url,l=s===`recording`,u=s===`requesting`||s===`stopping`;return`<div class="learning-native-growth-recorder" data-learning-native-growth-reflection-recorder="${i(a)}">
      <div class="learning-native-growth-recorder-status" data-learning-native-growth-reflection-record-status="${i(a)}">${i(li(a,t))}</div>
      ${c?`<audio controls preload="metadata" src="${i(o.url)}"></audio>`:``}
      <div class="learning-program-task-actions learning-native-growth-recorder-actions">
        ${l?`<button type="button" data-learning-native-growth-reflection-record-stop="${i(a)}">停止录音</button>`:`<button type="button" data-learning-native-growth-reflection-record-start="${i(a)}" ${u?`disabled`:``}>${c?`重新录复盘`:`开始录复盘`}</button>`}
        ${c||l||s===`error`?`<button type="button" data-learning-native-growth-reflection-record-cancel="${i(a)}">清除</button>`:``}
      </div>
    </div>`}function fi(e={}){let t=r(e?.status).toLowerCase(),n=r(e?.nextStep||e?.reflectionGate?.nextStep).toLowerCase();if(t===`reflection_required`||n===`spoken_reflection_required`||e?.reflectionRequired===!0)return!0;if(t!==`draft_feedback`&&n!==`rewrite_and_reflect`)return!1;let i=Number(e?.score),a=Number(e?.finalPassingScore||e?.passingScore||80)||80;return Number.isFinite(i)&&i>=a}function pi(e={},t={}){let n=r(e.taskCardId),i=e.latestReflection||ei(t.taskReflections||[],n,`submittedAt`),a=e.latestEvaluation||ei(t.evaluations||[],n,`createdAt`),o=e.latestSubmission||ei(t.taskSubmissions||[],n,`submittedAt`);if(r(e.status).toLowerCase()===`completed`||r(i?.status).toLowerCase()===`accepted`)return`complete`;if(fi(a))return`spoken_reflection`;if([`needs_repair`,`needs_revision`].includes(r(a?.status)))return`revise`;if(a?.passed||[`passed`,`completed`,`complete`].includes(r(a?.status)))return`complete`;let s=r(e.nativeState?.nextAction);return s&&s!==`submit`?s:r(o?.status)?`waiting_feedback`:s||`submit`}function mi(e=null,t={}){let i=t.escapeHtml||n;if(!e)return``;let a=r(e.status);return`<div class="learning-native-growth-submission-state${a===`accepted`?` is-ready`:``}" data-learning-native-growth-reflection-result>
      ${i(e.summary||(a===`rejected`?`上次复盘未通过，请重新录音复盘。`:`复盘已提交。`))}
    </div>`}function hi(e={},t={}){let i=t.escapeHtml||n,a=r(e.taskCardId);if(!a)return``;let o=ri(e,t),s=ti(e),c=s?``:si(e,t),l=r(e.workspaceId),u=r(e.nativeState?.nextAction||pi(e,t.programsData||{})),d=r(e.latestSubmission?.displayText||e.latestSubmission?.text),f=!!t.state?.learningNativeGrowthSubmissionSubmitting?.[a],p=!!(t.state?.learningGrowthAnswerEditing?.[a]||t.state?.learningNativeGrowthAnswerEditing?.[a]),m=r(e.latestEvaluation?.status),h=!!(e.latestEvaluation&&m&&m!==`pending`),g=e.latestReflection||e.nativeState?.latestReflection||null,_=r(g?.status).toLowerCase()===`rejected`,v=t.hideNativeGrowthDetailButton?``:`<button type="button" data-learning-open-growth-task="${i(a)}" data-workspace-id="${i(l)}">查看任务详情</button>`,y=f?s?`正在发送录音，服务端确认前尚未保存；请保持本页面打开。`:`正在发送作答，服务端确认前尚未保存；请保持本页面打开。`:u===`spoken_reflection`&&_?`上次复盘未通过，需要重新录音复盘`:{submit:`待作答`,waiting_feedback:`已提交，等待 AI 批改`,revise:`需要修改后再提交`,spoken_reflection:`需要录音或文字复盘`,complete:`已完成`}[u]||``;return u===`complete`?`<div class="learning-native-growth-submission-state is-ready">${i(y||`已完成`)}</div>`:u===`revise`&&h&&!p&&!f?`<div class="learning-native-growth-revision-collapsed" data-learning-native-growth-revision-collapsed="${i(a)}">
        <p>${i(y||`需要修改后再提交`)}</p>
        <button type="button" data-learning-native-growth-edit-answer="${i(a)}">修改答案</button>
        ${v}
      </div>`:u===`spoken_reflection`?`<form class="learning-native-growth-submission-form" data-learning-native-growth-reflection-form="${i(a)}" data-task-card-id="${i(a)}">
        ${mi(g,t)}
        <p class="learning-native-growth-prompt">阅读 AI 反馈后，用自己的话说明本次主要错误、修改原因和下次练习方向。</p>
        ${di(e,t)}
        <div class="learning-native-growth-submission-state" data-learning-native-growth-reflection-state="${i(a)}">${i(y)}</div>
        <div class="learning-program-task-actions">
          <button type="submit" data-learning-submit-native-growth-reflection="${i(a)}">提交录音复盘</button>
          ${v}
        </div>
      </form>`:`<form class="learning-native-growth-submission-form" data-learning-native-growth-submission-form="${i(a)}" data-task-card-id="${i(a)}" data-workspace-id="${i(l)}" data-min-words="${i(String(o.minWords||0))}" data-min-chars="${i(String(o.minChars||0))}" data-requires-audio="${s?`1`:`0`}">
      <p class="learning-native-growth-prompt">${i(ni(e,t))}</p>
      ${y?`<div class="learning-native-growth-submission-state">${i(y)}</div>`:``}
      ${s?ui(e,t):c||`<textarea class="input learning-native-growth-submission-input" name="text" rows="4" maxlength="12000" data-learning-native-growth-submission-input="${i(a)}" placeholder="在这里直接写作答，提交后等待 AI 批改">${i(d)}</textarea>
      <div class="todo-learning-growth-submit-requirement" data-learning-native-growth-submission-count="${i(a)}">${i(ii(o,t))}</div>`}
      <div class="learning-program-task-actions">
        <button type="submit" data-learning-submit-native-growth="${i(a)}" ${f?`disabled`:``}>${s?`提交录音给 AI 批改`:`提交给 AI 批改`}</button>
        ${v}
      </div>
      <div class="learning-native-growth-submission-state" data-learning-native-growth-submission-state="${i(a)}" aria-live="polite"></div>
    </form>`}function z(e){return Array.isArray(e)?e:[]}function gi(e={}){return!!(e.state?.auth?.isOwner||e.isOwner)}function _i(e={}){let t=e.taskModel||e.learningTaskModel||{};return t&&typeof t==`object`?t:{}}function vi(e,t){let n=Number(e);return Number.isFinite(n)&&n>0?Math.round(n):t}function yi(e=``){return{english_reading_comprehension:`阅读`,english_listening_input:`听力`,english_speaking_retell:`口语复述`,english_pronunciation_shadowing:`发音跟读`,english_short_writing:`写作`,english_vocabulary_active_use:`词汇活用`,english_grammar_in_expression:`语法表达`,english_presentation:`演讲项目`}[e]||e}function bi(e=[]){return z(e).map(e=>yi(e)).join(` / `)}function xi(e=``,t={}){let n=r(e);return n===`planned`?`待执行`:n===`published`?gi(t)?`已下发`:`待执行`:n===`active`?`进行中`:n===`completed`?`已完成`:n===`needs_review`?`待复盘`:n===`review_required`?gi(t)?`待家长审核`:`待确认`:n===`blocked`?gi(t)?`已拦截`:`暂不可执行`:n||`待执行`}function Si(e=[],t=``,n=`updatedAt`){let i=r(t),a=z(e).filter(e=>r(e?.taskCardId)===i);return a.length?a.slice().sort((e,t)=>String(t?.[n]||t?.updatedAt||t?.createdAt||``).localeCompare(String(e?.[n]||e?.updatedAt||e?.createdAt||``)))[0]:null}function Ci(e={}){let t=e.rewardPolicy||{};return{maxCoins:vi(e.rewardCapCoins||t.maxCoins||t.rewardCapCoins,100),minCoins:vi(t.minCoins,40),accuracyBonusMax:vi(t.accuracyBonusMax,30),timelinessBonusMax:vi(t.timelinessBonusMax,15),interactionBonusMax:vi(t.interactionBonusMax,15)}}function wi(e={}){return r(e.settledAt||e.updatedAt||e.createdAt)}function Ti(e=[],t={}){let n=r(t.taskCardId),i=r(t.latestEvaluation?.evaluationId),a=null;return z(e).forEach(e=>{let t=n&&r(e?.taskCardId)===n,o=i&&r(e?.evaluationId)===i;!t&&!o||(!a||wi(e)>wi(a))&&(a=e)}),a}function Ei(e=null){let t=Number(e?.coinAmount||0),n=Number.isFinite(t)&&t>0?Math.round(t):0,i=r(e?.status);return n&&i===`settled`?`已得 ${n} 金币`:n&&(i===`ready`||i===`pending_review`)?`待结算 ${n} 金币`:``}function Di(e={}){let t=Number(e.score);if(!Number.isFinite(t))return``;let n=Number(e.maxScore||e.totalScore||100),r=Number.isFinite(n)&&n>0?n:100;return`确定分数 ${Number.isInteger(t)?String(t):t.toFixed(1).replace(/\.0$/,``)}/${Number.isInteger(r)?String(r):r.toFixed(1).replace(/\.0$/,``)}`}function Oi(e=``,t={}){let n=r(e);if(!n)return``;if(typeof t.formatTime==`function`){let e=r(t.formatTime(n));if(e)return e}let i=new Date(n);return Number.isNaN(i.getTime())?n:i.toLocaleString([],{month:`2-digit`,day:`2-digit`,hour:`2-digit`,minute:`2-digit`})}function ki(e=``,t=``,r={}){return`<div class="learning-growth-section-head">
      <h4>${(r.escapeHtml||n)(e)}</h4>
      ${t?`<div class="learning-growth-section-head-actions">${t}</div>`:``}
    </div>`}function Ai(e={},t={}){let n=[e.totalEvaluationCount,e.evaluationCount,t.totalEvaluationCount,t.evaluationCount,Array.isArray(t.reportHistory)?t.reportHistory.length:0,Array.isArray(e.learningGrowthReportHistory)?e.learningGrowthReportHistory.length:0].map(e=>Number(e)).find(e=>Number.isFinite(e)&&e>0);return Math.max(1,Math.round(n||1))}function ji(e={},t={}){return r(e.artifactDirectoryPath||e.reportDirectoryPath||e.deliverableDirectoryPath||t.artifactDirectoryPath||t.reportDirectoryPath)}function Mi(e=``){let t=r(e);return t?/([?&])format=mp3(?:&|$)/i.test(t)?t:`${t}${t.includes(`?`)?`&`:`?`}format=mp3`:``}function Ni(e={}){let t=e.audio||e.raw?.audio||null;if(!t||typeof t!=`object`)return null;let n=Mi(t.url||t.href);return n?{url:n,name:r(t.name||`原始录音`),mime:r(t.mime||`audio/webm`),size:Number(t.size||0)||0}:null}function Pi(e={}){let t=e.audio||e.raw?.audio||null;if(!t||typeof t!=`object`)return null;let n=Mi(t.url||t.href);return n?{url:n,name:r(t.name||`复盘录音`),mime:r(t.mime||`audio/webm`),size:Number(t.size||0)||0}:null}function Fi(e={},t={}){let n=r(e.taskCardId),i=e.latestSubmission||Si(t.taskSubmissions||[],n,`submittedAt`);if(!i)return null;let a=z(i.structuredResponses),o=r(i.displayText||i.text);return Object.assign({},i,{audio:Ni(i),displayText:o,structuredResponses:a})}function Ii(e=[],t=``,n=`submittedAt`){let i=r(t);return z(e).filter(e=>r(e?.taskCardId)===i).slice().sort((e,t)=>String(t?.[n]||t?.updatedAt||t?.createdAt||``).localeCompare(String(e?.[n]||e?.updatedAt||e?.createdAt||``)))}function Li(e={},t={}){let i=t.escapeHtml||n,a=z(e.structuredResponses),o=r(e.displayText),s=Ni(e),c=Oi(e.submittedAt||e.createdAt||e.updatedAt,t),l=ki(`上次提交`,c?`<span class="learning-growth-submission-time" data-learning-growth-submission-time>${i(`提交 ${c}`)}</span>`:``,t);return!a.length&&!o&&!s?`<section class="learning-growth-answer-submission" data-learning-growth-previous-submission>
        ${l}
        <p>已有提交记录，但此次早期记录未保留可回显的结构化作答。</p>
      </section>`:`<section class="learning-growth-answer-submission" data-learning-growth-previous-submission>
      ${l}
      ${s?`<div class="learning-growth-submission-audio" data-learning-growth-submission-audio>
        <strong>${i(s.name)}</strong>
        <audio controls preload="metadata" src="${i(s.url)}"></audio>
      </div>`:``}
      ${a.length?`<div class="learning-growth-previous-responses">
        ${a.map((e,t)=>{let n=e.title||e.questionId||`Q${t+1}`,r=e.choice?`<b>${i(e.choice)}</b>`:``,a=e.response||e.reason||``;return`<article class="learning-growth-previous-response">
            <strong>${i(n)}</strong>
            ${r?`<p>${r}</p>`:``}
            ${a?`<p>${i(a)}</p>`:``}
          </article>`}).join(``)}
      </div>`:``}
      ${o&&!a.length?`<details class="learning-growth-submission-transcript" ${s?``:`open`}><summary>查看转写内容</summary><p>${i(o)}</p></details>`:``}
    </section>`}function Ri(e={},t={},i={}){let a=i.escapeHtml||n,o=r(e.taskCardId);if(!o)return``;let s=Ii(t.taskSubmissions||[],o,`submittedAt`).map(e=>Object.assign({},e,{audio:Ni(e),evidenceType:`submission`})).filter(e=>e.audio),c=Ii(t.taskReflections||[],o,`submittedAt`).map(e=>Object.assign({},e,{audio:Pi(e),evidenceType:`reflection`})).filter(e=>e.audio),l=s.concat(c).sort((e,t)=>String(t.submittedAt||t.updatedAt||t.createdAt||``).localeCompare(String(e.submittedAt||e.updatedAt||e.createdAt||``)));if(!l.length)return``;let u=(e,t)=>{if(e.evidenceType===`reflection`)return`复盘录音 ${c.length-c.indexOf(e)}`;let n=Number(e.attemptNo||0);return n?`第 ${n} 次提交录音`:`提交录音 ${t+1}`};return`<section class="learning-growth-audio-evidence" data-learning-growth-audio-evidence>
      ${ki(`录音证据`,`<span>${a(String(l.length))}</span>`,i)}
      <div class="learning-growth-audio-evidence-list">
        ${l.map((e,t)=>{let n=Oi(e.submittedAt||e.createdAt||e.updatedAt,i);return`<article class="learning-growth-audio-evidence-item" data-learning-growth-audio-evidence-item="${a(e.submissionId||e.reflectionId||String(t+1))}">
            <div>
              <strong>${a(u(e,t))}</strong>
              <small>${a([n,e.status||``].filter(Boolean).join(` / `))}</small>
            </div>
            <audio controls preload="metadata" src="${a(e.audio.url)}"></audio>
          </article>`}).join(``)}
      </div>
    </section>`}function zi(e={},t={},i={}){let a=i.growthTaskUi||null;if(a&&typeof a.renderFeedbackHistory==`function`)return a.renderFeedbackHistory(e,t);let o=i.escapeHtml||n,s=r(t.status||(t.passed?`passed`:`needs_revision`)),c=Di(t),l=r(t.summary||t.feedbackSummary||t.resultSummary);return`<div class="todo-learning-growth-outcome is-${o(s)}">
      <strong>${o(c||s||`待修订`)}</strong>
      ${l?`<p>${o(l)}</p>`:``}
    </div>`}function Bi(e={},t={},r={}){let i=r.escapeHtml||n,a=Ai(e,t),o=ji(e,t),s=`批改：${a}次`,c=Oi(t.createdAt||t.completedAt||t.updatedAt,r),l=o?`<button type="button" class="learning-growth-board-artifact-link learning-growth-feedback-directory-link" data-learning-growth-feedback-directory-link data-directory-path-open data-directory-path="${i(o)}" data-directory-label="${i(e.title||`批改目录`)}" aria-label="打开批改目录" title="打开批改目录"><span class="learning-growth-board-artifact-icon" aria-hidden="true"></span></button>`:``,u=`<span class="learning-growth-feedback-meta"><span class="learning-growth-feedback-count" data-learning-growth-feedback-count>${i(s)}</span>${l}</span>`;return ki(`最近批改`,`${c?`<span class="learning-growth-feedback-time" data-learning-growth-feedback-time>${i(c)}</span>`:``}${u}`,r)}function Vi(e={},t={},i={}){let a=i.escapeHtml||n,o=e.feedbackSections||{},s=z(e.revisionRequirements),c=z(o.strengths),l=z(o.focusAreas),u=z(o.rewriteChecklist),d=z(o.reflectionPrompts),f=z(o.criterionFeedback),p=z(o.sentenceFeedback),m=r(o.finalConclusion||e.finalConclusion),h=r(o.nextPractice||e.nextPractice),g=r(o.parentNote||e.parentNote);if(!s.length&&!c.length&&!l.length&&!u.length&&!d.length&&!f.length&&!p.length&&!m&&!h&&!g)return``;let _=(e,t)=>t.length?`<div class="learning-growth-feedback-detail-list"><h5>${a(e)}</h5><ul>${t.map(e=>`<li>${a(e)}</li>`).join(``)}</ul></div>`:``,v=(e,t)=>t?`<article class="learning-growth-feedback-detail-note"><strong>${a(e)}</strong><p>${a(t)}</p></article>`:``;return`<div class="learning-growth-answer-feedback-detail" data-learning-growth-feedback-detail>
      <h4>详细批改</h4>
      ${v(`总结`,m)}
      ${_(`需修订`,s)}
      ${_(`已做到`,c)}
      ${_(`需要关注`,l)}
      ${_(`修改清单`,u)}
      ${f.length?`<div class="learning-growth-feedback-criteria">
        ${f.map(e=>`<article>
          <strong>${a(e.dimension||`批改维度`)}</strong>
          ${e.observation?`<p><b>观察</b>${a(` ${e.observation}`)}</p>`:``}
          ${e.action?`<p><b>修改</b>${a(` ${e.action}`)}</p>`:``}
        </article>`).join(``)}
      </div>`:``}
      ${p.length?`<div class="learning-growth-feedback-criteria">
        ${p.map(e=>`<article>
          <strong>${a(e.evidence||e.issue||`细节反馈`)}</strong>
          ${e.issue?`<p><b>问题</b>${a(` ${e.issue}`)}</p>`:``}
          ${e.whyItMatters?`<p><b>原因</b>${a(` ${e.whyItMatters}`)}</p>`:``}
          ${e.fix?`<p><b>修改</b>${a(` ${e.fix}`)}</p>`:``}
          ${e.example?`<p><b>示例</b>${a(` ${e.example}`)}</p>`:``}
        </article>`).join(``)}
      </div>`:``}
      ${_(`复盘提示`,d)}
      ${v(`下一步练习`,h)}
      ${v(`家长备注`,g)}
    </div>`}function Hi(e={},t={}){let r=t.escapeHtml||n,i=Ci(e),a=Ei(e.latestRewardSettlement||e.rewardSettlement||null);return`<section class="learning-growth-answer-reward" data-learning-task-reward-policy>
      <div class="learning-growth-answer-reward-head">
        <h4>奖励机制</h4>
        <strong>${a?r(a):`奖励 ${r(String(i.maxCoins))} 金币`}</strong>
      </div>
      ${a?`<p class="learning-growth-answer-reward-settlement" data-learning-task-reward-settlement>${r(a)}</p>`:``}
      <div class="learning-growth-answer-reward-grid">
        <span><b>${r(String(i.minCoins))}%</b><small>通过基础权重</small></span>
        <span><b>${r(String(i.accuracyBonusMax))}%</b><small>准确度权重</small></span>
        <span><b>${r(String(i.timelinessBonusMax))}%</b><small>按时权重</small></span>
        <span><b>${r(String(i.interactionBonusMax))}%</b><small>修改互动权重</small></span>
      </div>
      <p>上面数字是奖励比例，最终金币数按本卡上限折算；证据不足或超出自动结算阈值时需要 Owner 复核。</p>
    </section>`}function Ui(e={},t={}){let i=e.learningGrowthSequenceDecision||e.sequenceDecision||null;if(!i||typeof i!=`object`)return``;let a=t.escapeHtml||n,o={repair:`修补`,stabilize:`巩固`,stretch:`拓展`,transfer:`迁移`},s=r(i.strategy),c=bi(i.targetSkillIds||[]).slice(0,140),l=r(i.reason),u=[o[s]||s,i.difficultyBand,i.gradeReference,c].filter(Boolean);return!u.length&&!l?``:`<section class="learning-growth-answer-reward" data-learning-growth-sequence-decision>
      <div class="learning-growth-answer-reward-head">
        <h4>下一卡策略</h4>
        <strong>${a(o[s]||s||`按能力画像推进`)}</strong>
      </div>
      ${u.length?`<div class="learning-growth-answer-card-meta">${u.map(e=>`<span>${a(String(e))}</span>`).join(``)}</div>`:``}
      ${l?`<p>${a(l)}</p>`:``}
    </section>`}function Wi(e={}){let t=_i(e),n=t.readingMaterial||e.readingMaterial||{},i=r(n.passage||n.text||n.content),a=r(n.title||`原始阅读材料`);if(!i){let n=r(e.learnerInstruction||e.instruction||t.learnerInstruction).match(/(?:Reading material|Reading passage|Passage|Article)\s*:\s*([\s\S]+)$/i);if(n){i=r(n[1]);let e=i.indexOf(`
`),t=e>=0?i.slice(0,e).trim():``;t&&t.length<=120&&(a=t,i=i.slice(e+1).trim())}}return i?{title:a,passage:i,meta:[n.cefr,n.wordCount?`${n.wordCount} words`:``,n.estimatedReadingMinutes?`${n.estimatedReadingMinutes} min`:``].filter(Boolean)}:null}function Gi(e={},t={}){let r=Wi(e);if(!r)return``;let i=t.escapeHtml||n;return`<details class="learning-growth-answer-instruction learning-growth-reading-material" data-learning-growth-reading-material>
      <summary>查看原始阅读材料</summary>
      <article>
        <h4>${i(r.title)}</h4>
        ${r.meta.length?`<div class="learning-growth-reading-material-meta">${r.meta.map(e=>`<span>${i(e)}</span>`).join(``)}</div>`:``}
        <p>${i(r.passage)}</p>
      </article>
    </details>`}function Ki(e={},t=``,r={}){let i=r.escapeHtml||n;return t?e.latestEvaluation?`<details class="learning-growth-answer-instruction learning-growth-answer-instruction-collapsed" data-learning-growth-task-prompt-collapsed>
        <summary>查看题目要求</summary>
        <p>${i(t)}</p>
      </details>`:`<section class="learning-growth-answer-instruction"><h4>任务要求</h4><p>${i(t)}</p></section>`:``}function qi(e={},t={}){if(!gi(t))return``;let i=t.escapeHtml||n,a=r(e.taskCardId),o=r(e.status).toLowerCase();return!a||[`completed`,`archived`,`blocked`].includes(o)?``:`<details class="learning-growth-owner-menu" data-learning-growth-owner-menu>
      <summary aria-label="更多操作" title="更多操作">&#8942;</summary>
      <div class="learning-growth-owner-menu-panel">
        <button type="button" data-learning-growth-manual-pass="${i(a)}">手工通过</button>
      </div>
    </details>`}function Ji(e=``,t={}){let i=t.escapeHtml||n,a=r(e);return a?`<button type="button" class="learning-growth-card-share-button" data-learning-growth-card-share="${i(a)}" aria-label="${i(`分享学习卡图片`)}" title="${i(`分享学习卡图片`)}">分享</button>`:``}function Yi(e={},t={},i={}){let a=i.escapeHtml||n,o=r(e.taskCardId);if(!o)return`<div class="learning-coin-empty">未找到这张学习卡。</div>`;let s=_i(e),c=bi(e.skillIds||s.skillTargets||[]).slice(0,120),l=Fi(e,t),u=e.latestEvaluation||Si(t.evaluations||[],o,`createdAt`),d=e.latestReflection||Si(t.taskReflections||[],o,`submittedAt`),f=e.latestRewardSettlement||Ti(t.rewardSettlements||[],{taskCardId:o,latestEvaluation:u}),p=z(t.taskSubmissions).filter(e=>r(e?.taskCardId)===o).length,m=z(t.evaluations).filter(e=>r(e?.taskCardId)===o).length,h=[e.plannedDate,e.plannedMinutes?`${e.plannedMinutes} min`:``,c].filter(Boolean),g=r(e.learnerInstruction||e.instruction||s.learnerInstruction||e.instructionPreview||e.summary),_=Object.assign({},e,{source:r(e.source)||`learning-growth`,nativeState:Object.assign({},e.nativeState||{},{nextAction:pi(e,t)}),latestSubmission:l,latestEvaluation:u,latestReflection:d,latestRewardSettlement:f,totalSubmissionCount:Number(e.totalSubmissionCount||0)||p||void 0,totalEvaluationCount:Number(e.totalEvaluationCount||0)||m||void 0});return`<section class="learning-growth-answer-card learning-growth-card-detail-shell" data-learning-growth-answer-card data-learning-executable-task-id="${a(o)}">
      <div class="learning-growth-card-detail-hero">
        <div class="learning-growth-answer-card-head learning-growth-card-detail-head">
          <div>
            <span>答题卡</span>
            <h3>${a(e.title||o||`学习任务`)}</h3>
          </div>
          <div class="learning-growth-answer-card-status learning-growth-card-detail-actions">
            <strong>${a(xi(e.status,i))}</strong>
            ${Ji(o,i)}
            ${qi(_,i)}
            <button type="button" class="learning-settings-back" data-learning-close-growth-task>返回看板</button>
          </div>
        </div>
        ${h.length?`<div class="learning-growth-answer-card-meta learning-growth-card-detail-meta">${h.map(e=>`<span>${a(e)}</span>`).join(``)}</div>`:``}
      </div>
      ${Hi(_,i)}
      ${Ui(_,i)}
      ${Gi(_,i)}
      ${l?Li(l,i):``}
      ${Ri(_,t,i)}
      ${u?`<section class="learning-growth-answer-feedback">${Bi(_,u,i)}${zi(_,u,i)}${Vi(u,_,i)}</section>`:``}
      ${Ki(_,g,i)}
      ${hi(_,Object.assign({},i,{hideNativeGrowthDetailButton:!0,programsData:t}))}
    </section>`}function Xi(e={}){return!!(e.source===`learning-growth`||e.nativeState||e.latestSubmission||e.latestEvaluation||e.latestReflection||z(e.questionItems).length||z(_i(e).questionItems).length||z(_i(e).questions).length)}Object.freeze({title:`English fast improvement sprint`,goalSummary:`Build a low-pressure daily English plan with reading, listening, speaking, writing, vocabulary, and grammar practice.`,domain:`english`,durationDays:60,daysPerWeek:5,minutesPerDay:35,timeOfDay:`19:30`,focusAreas:[`english_reading_comprehension`,`english_listening_input`,`english_speaking_retell`,`english_pronunciation_shadowing`,`english_short_writing`,`english_vocabulary_active_use`,`english_grammar_in_expression`]}),Object.freeze([`english_reading_comprehension`,`english_listening_input`,`english_speaking_retell`,`english_pronunciation_shadowing`,`english_short_writing`,`english_vocabulary_active_use`,`english_grammar_in_expression`,`english_presentation`]);function Zi(e){return Array.isArray(e)?e:[]}function Qi(e={}){return r(e.taskCardId||e.id||e.cardId)}function $i(e={}){return Zi(e.board?.cards||e.overview?.board?.cards||e.model?.overview?.board?.cards)}function ea(e={}){let t=e.overview?.programs||e.model?.overview?.programs||e.programs||{};return Zi(t.taskCards||t.tasks||t.cards)}function ta(e={}){let t=e.cardDetails||e.overview?.cardDetails||e.model?.overview?.cardDetails||{};return Object.values(t).filter(Boolean)}function na(e={}){return e.overview?.programs||e.model?.overview?.programs||e.programs||{}}function ra(e={},t={}){return r(t.selectedGrowthTaskCardId||e.selectedLearningTaskCardId||e.route?.selectedTaskCardId||e.learningGrowthRouteState?.cardId)}function ia(e={},t=``){let n=r(t);return n&&$i(e).concat(ea(e)).concat(ta(e)).find(e=>Qi(e)===n)||null}function aa(e={}){let t=e.taskModel||e.learningTaskModel||{};return r(e.goalSummary||t.goalSummary||Zi(e.acceptance||t.acceptance)[0]||e.learnerInstruction||e.instruction||t.learnerInstruction||e.instructionPreview||e.summary||e.description)}function oa(e={}){return[e.activityType,e.skillId,e.domain,e.plannedMinutes?`${e.plannedMinutes} min`:``,F(e)?`开放 ${F(e)}`:``].map(r).filter(Boolean)}function sa(e=``,t=n){return`<div class="learning-growth-view learning-growth-task-focus" data-learning-product="fanfan-growth" data-learning-growth-task-focus="${t(e)}">
      <div class="learning-coin-empty">这张任务卡已更新或不在当前状态里。</div>
    </div>`}function ca(e={},t={}){let r=t.escapeHtml||n,i=Qi(e),a=oa(e),o=e.latestEvaluation||{},s=Number(o.score),c=Number.isFinite(s)&&s>0?`${Math.round(s)} 分`:``,l=aa(e);return`<section class="learning-growth-answer-card learning-growth-card-detail-shell" data-learning-growth-answer-card data-learning-executable-task-id="${r(i)}">
      <div class="learning-growth-card-detail-hero">
        <div class="learning-growth-answer-card-head learning-growth-card-detail-head">
          <div>
            <span>学习卡</span>
            <h3>${r(e.title||i||`学习任务`)}</h3>
          </div>
          <div class="learning-growth-answer-card-status learning-growth-card-detail-actions">
            <strong>${r(Qn(e))}</strong>
            <button type="button" class="learning-settings-back" data-learning-close-growth-task>返回看板</button>
          </div>
        </div>
        ${a.length?`<div class="learning-growth-answer-card-meta learning-growth-card-detail-meta">${a.map(e=>`<span>${r(e)}</span>`).join(``)}</div>`:``}
      </div>
      <section class="learning-coin-panel learning-growth-card-detail-summary" data-learning-growth-card-detail-summary>
        <div class="learning-section-heading">
          <h3>任务摘要</h3>
          <span>${r(er(e))}</span>
        </div>
        <p class="learning-growth-muted">${r(l||`暂无目标摘要。`)}</p>
        <div class="learning-settings-task-detail-grid">
          <span><small>状态</small><strong>${r(Qn(e))}</strong></span>
          <span><small>奖励</small><strong>${r(er(e))}</strong></span>
          <span><small>评分</small><strong>${r(c||`未评分`)}</strong></span>
        </div>
      </section>
    </section>`}function la(e={},t={}){let r=t.escapeHtml||n,i=ra(e,t),a=ia(e,i);if(!a)return sa(i,r);let o=t.renderers?.cardDetailView||t.renderers?.cardDetail,s=typeof o==`function`?o(a,t):Vr(a)?Xr(a,t):Xi(a)?Yi(a,na(e),t):ca(a,t);return`<div class="learning-growth-view learning-growth-task-focus" data-learning-product="fanfan-growth" data-learning-growth-task-focus="${r(i)}">
      ${s}
    </div>`}function ua(e){return Array.isArray(e)?e:[]}function da(e={}){return e.overview||e.model?.overview||{}}function fa(e={}){return e.learningGrowthRouteState||e.route?.routeState||{}}function pa(e={},t={}){return t.isOwner===!0||e.auth?.isOwner===!0}function ma(e={},t={},n=7){let r=Number(t[`averageCoins${n}d`]||t[`coinsAverage${n}d`]||e.growth?.[`averageCoins${n}d`]||0);return Number.isFinite(r)?Math.round(r):0}function ha(e={},t={}){return r(e.learner?.displayName||t.learnerId||e.learner?.id||`Learner`)}function ga(e={},t={}){return r(e.learner?.workspaceId||t.currentWorkspaceId||t.workspaceId)}function _a(e=[]){return ua(e).filter(e=>r(e?.workspaceId))}function va(e={},t={}){if(!pa(e,t))return``;let i=t.escapeHtml||n,a=_a(t.viewTargets||e.viewTargets||e.growthViewTargets),o=ga(da(e),t);return a.length<2?``:`<details class="learning-growth-owner-menu" data-growth-view-target-menu>
      <summary aria-label="切换执行者">...</summary>
      <div class="learning-growth-owner-menu-panel">
        ${a.map(e=>{let t=r(e.workspaceId),n=!!(e.current||t===o);return`<button type="button" data-growth-view-target="${i(t)}" ${n?`disabled`:``}>
            ${i(e.label||t)}
          </button>`}).join(``)}
      </div>
    </details>`}function ya(e={},t={}){let i=t.escapeHtml||n,a=r(e.status);if(a!==`empty`&&a!==`unavailable`)return``;let o=r(e.route),s=e.emptyTitle||e.title||`暂无可执行内容`,c=e.emptyBody||e.body||`这个入口当前没有可打开的学习状态。`,l=r(e.code);return`<section class="learning-coin-panel learning-growth-route-notice" data-growth-route-state="${i(o)}" data-growth-route-status="${i(a)}">
      <div class="learning-section-heading">
        <h3>${i(s)}</h3>
        <span>${i(e.label||o||`入口`)}</span>
      </div>
      <p class="learning-growth-muted">${i(c)}</p>
      ${l?`<small class="learning-growth-muted">${i(l)}</small>`:``}
    </section>`}function ba(e={},t={}){let r=t.escapeHtml||n,i=da(e),a=i.module||{},o=i.metrics||{},s=t.coins||i.coins||{},c=ha(i,t),l=Number(s.balances?.availableCoins||0),u=Number(o.totalEarnedCoins||s.growth?.totalEarnedCoins||s.balances?.earnedCoins||l||0),d=String(Number.isFinite(u)?Math.round(u):0),f=pa(e,t)?`<span class="learning-growth-owner-actions">
        ${va(e,t)}
        <button type="button" class="learning-growth-owner-settings-button" data-learning-growth-open-settings>管理</button>
      </span>`:``;return`<section class="learning-growth-board-summary" data-learning-growth-board-summary>
      <div class="learning-growth-board-summary-head">
        <span class="learning-growth-board-summary-title">
          <strong>${r(a.title||`成长`)}</strong>
          <small>${r(c)}</small>
        </span>
        ${f}
      </div>
      <div class="learning-growth-board-summary-metrics" aria-label="成长概览">
        <span><small>执行者</small><b>${r(c)}</b></span>
        <span><small>累计金币</small><b>${r(d)}</b></span>
        <span><small>7日均值</small><b>${r(String(ma(s,o,7)))}</b></span>
        <span><small>30日均值</small><b>${r(String(ma(s,o,30)))}</b></span>
      </div>
    </section>`}function xa(e={},t={}){return`<div class="learning-growth-view learning-growth-board-page" data-learning-product="fanfan-growth" data-learning-role="${pa(e,t)?`owner`:`executor`}" data-learning-growth-owner-workspace-page>
      ${ba(e,t)}
      ${ya(fa(e),t)}
      ${lr(e,t)}
    </div>`}function Sa(e={}){return e.state&&typeof e.state==`object`?e.state:{}}function Ca(e={}){return!!(e.isOwner===!0||Sa(e).auth?.isOwner)}function wa(e={},t={}){return t.coins||e.coins||e.overview?.coins||e.model?.overview?.coins||e.learningCoins||{}}function B(e){let t=Number(e||0);return`${Number.isFinite(t)?t:0} 金币`}function Ta(e){if(e==null||e===``)return`人民币规则待设置`;let t=Number(e);return Number.isFinite(t)?`￥${(t/100).toFixed(2)}`:`人民币规则待设置`}function Ea(e={},t={}){let r=t.escapeHtml||n,i=Ca(t),a=Array.isArray(e.rewards)?e.rewards:[];if(!a.length)return`<div class="learning-coin-empty">${i?`奖励池还没有配置。`:`暂无可申请的奖励。`}</div>`;let o=Number(e.balances?.availableCoins||0);return a.map(e=>{let t=o>=Number(e.coinCost||0);return`<article class="learning-reward-card">
        <div class="learning-reward-main">
          <div class="learning-reward-title">${r(e.title||`奖励`)}</div>
          ${e.description?`<div class="learning-reward-description">${r(e.description)}</div>`:``}
        </div>
        <div class="learning-reward-meta">
          <span>${r(B(e.coinCost))}</span>
          ${i?`<span>${r(Ta(e.rmbCents))}</span>`:``}
        </div>
        <button class="learning-coin-primary" type="button" data-learning-redeem="${r(e.id)}" ${t?``:`disabled`}>${t?`申请兑换`:`金币不足`}</button>
      </article>`}).join(``)}function Da(e={},t={}){let i=t.escapeHtml||n,a=typeof t.formatTime==`function`?t.formatTime:e=>String(e||``),o=Ca(t),s=Array.isArray(e.ledger)?e.ledger:[];return s.length?s.map(e=>{let t=Number(e.coinDelta||0)>=0,n=o?[e.sourceType,e.sourceId,a(e.createdAt)].map(r).filter(Boolean).join(` · `):[a(e.createdAt)].map(r).filter(Boolean).join(` · `);return`<div class="learning-ledger-row">
        <div>
          <div class="learning-ledger-title">${i(e.reason||e.type||`金币记录`)}</div>
          <div class="learning-ledger-meta">${i(n)}</div>
        </div>
        <div class="learning-ledger-amount ${t?`positive`:`negative`}">${t?`+`:``}${i(B(e.coinDelta))}</div>
      </div>`}).join(``):`<div class="learning-coin-empty">暂无金币流水。</div>`}function Oa(e={},t={}){let i=t.escapeHtml||n,a=typeof t.formatTime==`function`?t.formatTime:e=>String(e||``),o=Array.isArray(e.redemptions)?e.redemptions:[];return o.length?o.map(e=>`<div class="learning-redemption-row">
      <div>
        <div class="learning-ledger-title">${i(e.rewardTitle||e.rewardId||`兑换申请`)}</div>
        <div class="learning-ledger-meta">${i([e.status,a(e.requestedAt)].map(r).filter(Boolean).join(` · `))}</div>
      </div>
      <div class="learning-ledger-amount negative">${i(B(e.coinCost))}</div>
    </div>`).join(``):`<div class="learning-coin-empty">暂无兑换申请。</div>`}function ka(e={},t={}){let r=t.escapeHtml||n,i=Ca(t),a=e.bestRewardProgress||null,o=Array.isArray(e.rewardProgress)?e.rewardProgress:[],s=a?[a].concat(o.filter(e=>e?.id!==a.id)).slice(0,4):o;return s.length?s.map(e=>{let t=Math.max(0,Math.min(100,Number(e.progressPct||0))),n=e.affordable?`可兑换`:`还差 ${B(e.remainingCoins)}`;return`<div class="learning-growth-reward">
        <div class="learning-growth-reward-top">
          <strong>${r(e.title||e.id||`奖励`)}</strong>
          <span>${r(n)}</span>
        </div>
        <div class="learning-growth-progress" aria-label="${r(`${t}%`)}"><span style="width:${t}%"></span></div>
        <div class="learning-ledger-meta">${r(i?`${B(e.coinCost)} · ${Ta(e.rmbCents)}`:B(e.coinCost))}</div>
      </div>`}).join(``):`<div class="learning-coin-empty">配置奖励后会显示兑换进度。</div>`}function Aa(e={},t={}){let r=t.escapeHtml||n,i=e.growth||{},a=e.balances||{},o=i.level||{},s=o.current||{},c=o.next||null,l=s.title?`Lv.${s.level} ${s.title}`:`Lv.1 新手探索者`,u=c?`距离 Lv.${c.level} ${c.title} 还差 ${B(o.toNextLevelCoins)}`:`已达到当前最高等级`,d=Math.max(0,Math.min(100,Number(o.progressPct||0)));return`<section class="learning-coin-panel learning-growth-panel" data-learning-growth-coins="profile">
      <div class="learning-section-heading">
        <h3>成长档案</h3>
        <span>历史累计</span>
      </div>
      <div class="learning-growth-summary">
        <div class="learning-growth-level">
          <div class="learning-coin-eyebrow">${r(l)}</div>
          <strong>${r(B(i.totalEarnedCoins))}</strong>
          <div class="learning-growth-progress" aria-label="${r(`${d}%`)}"><span style="width:${d}%"></span></div>
          <small>${r(u)}</small>
        </div>
        <div class="learning-growth-metrics">
          <span><strong>${r(B(i.totalEarnedCoins))}</strong><small>历史累计</small></span>
          <span><strong>${r(B(a.availableCoins))}</strong><small>当前可用</small></span>
          <span><strong>${r(String(i.streakDays||0))} 天</strong><small>连续获得</small></span>
        </div>
      </div>
      <div class="learning-growth-rewards">
        <div class="learning-section-heading compact"><h3>兑换进度</h3><span>按差额排序</span></div>
        ${ka(i,t)}
      </div>
    </section>`}function ja(e={}){return Ca(e)?`<section class="learning-coin-panel learning-coin-owner-panel" data-learning-growth-coins="owner">
      <div class="learning-section-heading">
        <h3>奖励池</h3>
        <span>Owner</span>
      </div>
      <form id="learningRewardForm" class="learning-reward-form">
        <input id="learningRewardTitle" class="input" type="text" placeholder="奖励名称" autocomplete="off">
        <input id="learningRewardCost" class="input" type="number" min="1" step="1" placeholder="金币">
        <input id="learningRewardRmb" class="input" type="number" min="0" step="0.01" placeholder="人民币，可留空">
        <textarea id="learningRewardDescription" class="input" rows="2" placeholder="说明，可留空"></textarea>
        <button class="learning-coin-primary" type="submit">保存奖励</button>
      </form>
    </section>`:``}function Ma(e={},t={}){let i=t.escapeHtml||n,a=Ca(Object.assign({},t,{state:e})),o=wa(e,t),s=o.balances||{},c=r(a?o.studentId||t.learnerId||e.overview?.learner?.workspaceId||t.currentWorkspaceId:t.learnerName||o.displayName||e.overview?.learner?.displayName||`成长档案`),l=t.loading?`<div class="learning-coin-loading">正在刷新成长数据...</div>`:``,u=t.error?`<div class="automation-error">${i(t.error)}</div>`:``;return`<section class="learning-growth-coin-section" data-learning-growth-module="coins" data-learning-growth-rewards-page>
      <div class="learning-section-heading">
        <h3>金币与奖励</h3>
        <span>激励记录</span>
      </div>
      <section class="learning-coin-hero">
        <div>
          <div class="learning-coin-eyebrow">${i(c)}</div>
          <h2>${i(B(s.availableCoins))}</h2>
          <p>${i(a?`金币只作为学习任务的激励、兑换和奖励池管理凭证。`:`金币只作为学习任务的激励与兑换凭证。`)}</p>
        </div>
        <div class="learning-coin-stats">
          <span><strong>${i(B(s.heldCoins))}</strong><small>冻结中</small></span>
          <span><strong>${i(B(s.earnedCoins))}</strong><small>累计获得</small></span>
          <span><strong>${i(B(s.spentCoins))}</strong><small>${a?`已结算`:`已使用`}</small></span>
        </div>
      </section>
      ${l}
      ${u}
      ${Aa(o,Object.assign({},t,{state:e}))}
      <section class="learning-coin-panel" data-learning-growth-coins="rewards">
        <div class="learning-section-heading">
          <h3>兑换</h3>
          <span>${i(a?o.settlement?.currency||`CNY`:`学习奖励`)}</span>
        </div>
        <div class="learning-reward-list">${Ea(o,Object.assign({},t,{state:e}))}</div>
      </section>
      <section class="learning-coin-grid">
        <div class="learning-coin-panel" data-learning-growth-coins="ledger">
          <div class="learning-section-heading"><h3>金币流水</h3><span>最近记录</span></div>
          ${Da(o,Object.assign({},t,{state:e}))}
        </div>
        <div class="learning-coin-panel" data-learning-growth-coins="redemptions">
          <div class="learning-section-heading"><h3>兑换申请</h3><span>${a?`审核状态`:`申请状态`}</span></div>
          ${Oa(o,Object.assign({},t,{state:e}))}
        </div>
      </section>
      ${ja(Object.assign({},t,{state:e}))}
    </section>`}function Na(e){return Array.isArray(e)?e:[]}function Pa(e={}){return e.overview||e.model?.overview||{}}function Fa(e={}){return e.programs||{}}function Ia(e={}){return e.learningGrowthRouteState||e.route?.routeState||{}}function La(e={},t={}){let n=r(t.activeTab||e.learningGrowthActiveTab||e.route?.activeTab);return{settings:`overview`,"new-task":`tasks`,"reward-settlement":`rewards`,"ai-summary":`ai-analysis`,generate:`generation`,"card-generation":`generation`}[n]||n||`overview`}function Ra(e={},t={}){return r(e.learner?.displayName||e.learner?.id||t.learnerId||t.currentWorkspaceId)}function za(e={}){let t=new Map,n=e=>{let n=r(e?.taskCardId||e?.id);n&&!t.has(n)&&t.set(n,e)};Na(e.board?.cards).forEach(n);let i=Fa(e);return Na(i.taskCards||i.tasks||i.cards).forEach(n),Array.from(t.values()).slice(0,80)}function Ba(e={},t=``){let n=r(t);return za(e).find(e=>r(e.taskCardId||e.id)===n)||null}function Va(e={}){return r(e.templateId||e.taskModel?.templateId||e.skillId||e.title||e.taskCardId||e.id)}function Ha(e={}){return r(e.title||e.templateId||e.taskModel?.templateId||e.skillId||e.taskCardId||e.id||`任务系列`)}function Ua(e={},t={}){let n=Va(t);return za(e).filter(e=>Va(e)===n).sort((e,t)=>{let n=Date.parse(e.completedAt||e.updatedAt||e.createdAt||e.openedAt||``)||0;return(Date.parse(t.completedAt||t.updatedAt||t.createdAt||t.openedAt||``)||0)-n})}function Wa(e=[]){return e.filter(e=>/complete|completed|done/i.test(r(e.status||e.nextAction))).length}function Ga(e={},t={},n=7){let r=Number(t[`averageCoins${n}d`]||t[`coinsAverage${n}d`]||e.growth?.[`averageCoins${n}d`]||0);return Number.isFinite(r)?Math.round(r):0}function Ka(e={},t={}){let i=t.escapeHtml||n,a=r(e.status);if(a!==`empty`&&a!==`unavailable`)return``;let o=r(e.route),s=e.emptyTitle||e.title||`暂无可执行内容`,c=e.emptyBody||e.body||`这个入口当前没有可打开的学习状态。`,l=r(e.code);return`<section class="learning-coin-panel learning-growth-route-notice" data-growth-route-state="${i(o)}" data-growth-route-status="${i(a)}">
      <div class="learning-section-heading">
        <h3>${i(s)}</h3>
        <span>${i(e.label||o||`入口`)}</span>
      </div>
      <p class="learning-growth-muted">${i(c)}</p>
      ${l?`<small class="learning-growth-muted">${i(l)}</small>`:``}
    </section>`}function qa(e={},t={}){let r=t.escapeHtml||n,i=za(e),a=Wa(i),o=i.length-a,s=t.coins||e.coins||{},c=s.growth||{},l=s.balances||{},u=Fa(e).launchOperations?.counts||{},d=Number(c.totalEarnedCoins||l.earnedCoins||0);return`<section class="learning-settings-overview" data-learning-settings-overview>
      <div class="learning-settings-kpi-grid">
        <span><small>执行者</small><strong>${r(Ra(e,t)||`执行者`)}</strong></span>
        <span><small>当前任务</small><strong>${r(String(o))}</strong></span>
        <span><small>已完成</small><strong>${r(String(a||u.completedTasks||0))}</strong></span>
        <span><small>累计金币</small><strong>${r(String(Math.round(d||0)))}</strong></span>
        <span><small>7日均值</small><strong>${r(String(Ga(s,e.metrics||{},7)))}</strong></span>
        <span><small>30日均值</small><strong>${r(String(Ga(s,e.metrics||{},30)))}</strong></span>
        <span><small>待结算</small><strong>${r(String(u.pendingRewardSettlements||0))}</strong></span>
      </div>
    </section>`}function Ja(e={},t={}){let i=t.escapeHtml||n,a=za(e);if(!a.length)return`<div class="learning-coin-empty">暂无任务。</div>`;let o=r(e.learner?.workspaceId||t.currentWorkspaceId||t.workspaceId);return`<section class="learning-coin-panel learning-settings-task-list" data-learning-settings-task-list>
      <div class="learning-section-heading">
        <h3>当前任务</h3>
        <span>${i(String(a.length))}</span>
      </div>
      <div class="learning-settings-task-rows">
        ${a.map(e=>{let t=r(e.taskCardId||e.id),n=F(e),a=[e.templateId||e.taskModel?.templateId||``,e.status||e.nextAction||``,n?`开放 ${n}`:``].map(r).filter(Boolean).join(` / `);return`<button type="button" class="learning-settings-task-row" data-learning-open-settings-task="${i(t)}" data-workspace-id="${i(r(e.workspaceId||o))}">
            <span>
              <strong>${i(e.title||t)}</strong>
              <small>${i(a)}</small>
            </span>
            <em>查看</em>
          </button>`}).join(``)}
      </div>
    </section>`}function Ya(e={},t={},i={}){let a=i.escapeHtml||n,o=r(t.learningGrowthSettingsTaskId||t.route?.settingsTaskId||i.settingsTaskId),s=Ba(e,o);if(!s)return`<section class="learning-coin-panel learning-settings-task-detail" data-learning-settings-task-detail>
        <button type="button" class="learning-settings-back" data-learning-settings-task-back>返回任务列表</button>
        <div class="learning-coin-empty">这项任务已更新或不在当前列表里。</div>
      </section>`;let c=Ua(e,s),l=Wa(c),u=c.slice(0,6),d=s.learningGrowthGenerationReport?.goal||s.learningGrowthJitGeneration?.goal||s.learningGrowthJitGeneration?.decision||s.nextRecommendation||`建议在 AI分析 标签刷新学习总结后，再决定下一张卡的方向。`;return`<section class="learning-coin-panel learning-settings-task-detail" data-learning-settings-task-detail>
      <button type="button" class="learning-settings-back" data-learning-settings-task-back>返回任务列表</button>
      <div class="learning-section-heading">
        <h3>${a(s.title||o)}</h3>
        <span>${a(s.status||s.nextAction||`未定`)}</span>
      </div>
      <div class="learning-settings-task-detail-grid">
        <span><small>系列</small><strong>${a(Ha(s))}</strong></span>
        <span><small>已生成</small><strong>${a(String(c.length))}</strong></span>
        <span><small>已完成</small><strong>${a(String(l))}</strong></span>
        <span><small>奖励</small><strong>${a(String($n(s)))}</strong></span>
      </div>
      <div class="learning-settings-task-detail-block">
        <h4>目标</h4>
        <p>${a(aa(s)||`暂无目标摘要。`)}</p>
      </div>
      <div class="learning-settings-task-detail-block">
        <h4>当前状态</h4>
        <p>${a([s.activityType||``,s.skillId||``,F(s)?`开放 ${F(s)}`:``].filter(Boolean).join(` / `)||`暂无状态摘要。`)}</p>
      </div>
      <div class="learning-settings-task-detail-block">
        <h4>已生成卡片</h4>
        ${u.length?u.map(e=>`<p>${a([e.title||e.taskCardId||e.id,e.status||e.nextAction||``,F(e)?`开放 ${F(e)}`:``].filter(Boolean).join(` / `))}</p>`).join(``):`<p>暂无卡片记录。</p>`}
      </div>
      <div class="learning-settings-task-detail-block">
        <h4>后续建议</h4>
        <p>${a(d)}</p>
      </div>
    </section>`}function Xa(e={},t={}){let i=t.escapeHtml||n,a=t.coins||e.coins||{},o=a.growth||{},s=a.balances||{},c=Na(Fa(e).rewardSettlements).filter(e=>r(e.status)===`settled`),l=c.reduce((e,t)=>e+(Number(t.coinAmount)||0),0),u=c.length?Math.round(l/c.length):0;return`<section class="learning-coin-panel learning-settings-reward-stats" data-learning-settings-reward-stats>
      <div class="learning-section-heading">
        <h3>奖励统计</h3>
        <span>执行者</span>
      </div>
      <div class="learning-settings-reward-rows">
        <span><small>累计金币</small><strong>${i(String(Math.round(Number(o.totalEarnedCoins||s.earnedCoins||0)||0)))}</strong></span>
        <span><small>7日均值</small><strong>${i(String(Ga(a,e.metrics||{},7)))}</strong></span>
        <span><small>30日均值</small><strong>${i(String(Ga(a,e.metrics||{},30)))}</strong></span>
        <span><small>已结算次数</small><strong>${i(String(c.length))}</strong></span>
        <span><small>平均每次</small><strong>${i(String(u))}</strong></span>
      </div>
    </section>`}function Za(e=[],t=``,r={}){let i=r.escapeHtml||n,a=e.filter(e=>e&&e.html);if(!a.length)return``;let o=a.some(e=>e.id===t)?t:a[0].id;return`<section class="learning-program-section learning-program-parent-admin learning-growth-settings-tabs" data-learning-growth-module="programs" data-learning-growth-category="parent-admin" data-learning-growth-owner-management>
      <section class="learning-growth-tabs" data-learning-growth-tabs>
        <div class="learning-growth-tab-list" role="tablist" aria-label="复用的平台能力">
          ${a.map(e=>`<button type="button" role="tab" data-learning-growth-tab="${i(e.id)}" aria-selected="${e.id===o?`true`:`false`}" class="${e.id===o?`active`:``}">${i(e.label)}</button>`).join(``)}
        </div>
        ${a.map(e=>`<section class="learning-growth-tab-panel${e.id===o?` active`:``}" data-learning-growth-tab-panel="${i(e.id)}" role="tabpanel"${e.id===o?``:` hidden`}>
          ${e.html}
        </section>`).join(``)}
      </section>
    </section>`}function Qa(e={},t={}){let r=t.escapeHtml||n,i=t.overview||Pa(e),a=Ra(i,t);if(!a)return`<div class="learning-growth-view learning-growth-settings-page" data-learning-role="owner" data-learning-growth-settings-page>
      <section class="learning-coin-panel learning-settings-empty" data-learning-settings-no-learner>
        <div class="learning-section-heading">
          <h3>成长设置</h3>
          <span>未选择执行者</span>
        </div>
        <p class="learning-growth-muted">当前还没有可用于成长计划的执行者。请先创建或选择执行者工作区，再配置学习范围、任务和奖励规则。</p>
      </section>
    </div>`;let o=La(e,t),s=Ka(Ia(e),t),c=t.renderers?.ownerGenerationPanel||Vn,l=typeof c==`function`?c({state:e,workspaceId:e.cardGeneration?.selectedWorkspaceId||t.currentWorkspaceId||i.learner?.workspaceId||``,viewTargets:t.viewTargets||e.viewTargets||[],renderers:t.renderers||{}}):``,u=Za([{id:`overview`,label:`总览`,html:qa(i,t)},{id:`tasks`,label:`任务`,html:e.learningGrowthSettingsTaskId?Ya(i,e,t):Ja(i,t)},{id:`rewards`,label:`奖励`,html:Xa(i,t)},{id:`generation`,label:`生成`,html:l}],o,t);return`<div class="learning-growth-view learning-growth-settings-page" data-learning-product="fanfan-growth" data-learning-role="owner" data-learning-growth-settings-page>
      <section class="learning-growth-owner-settings-toolbar">
        <button type="button" data-learning-growth-close-settings>返回看板</button>
        <span>Owner 管理 · ${r(a)}</span>
      </section>
      ${s}
      ${u}
    </div>`}function $a(e){return Array.isArray(e)?e:[]}function eo(e={},t={}){return $a(t.viewTargets).length?t.viewTargets:$a(e.viewTargets||e.growthViewTargets)}function to(e={},t={},n={}){return e.workspaceId||n.currentWorkspaceId||t.currentWorkspaceId||``}function no(e={},t={}){let r=eo(e,t),i=Jn(e,{currentWorkspaceId:t.currentWorkspaceId||e.currentWorkspaceId||``,viewTargets:r,sampleWorkspaceIds:t.sampleWorkspaceIds}),a=to(i,e,t);return`<section class="growth-vite-bootstrap growth-vite-shell" data-growth-vite-bootstrap="true" data-growth-vite-shell="true" data-growth-vite-active-tab="${n(i.route.activeTab)}">
    ${Vn({state:e,workspaceId:a,viewTargets:r,renderers:t.renderers||{}})}
  </section>`}function ro(e={}){return`<section class="growth-vite-bootstrap" data-growth-vite-bootstrap="true">
    <h1>成长</h1>
    <p data-growth-vite-mode>${n((e.context||{}).mode||`standalone`)}</p>
  </section>`}function io(e={}){return!!(e.board||e.overview?.board||e.model?.overview?.board)}function ao(e={},t={},r=``){return`<section class="growth-vite-bootstrap growth-vite-shell" data-growth-vite-bootstrap="true" data-growth-vite-shell="true" data-growth-vite-active-tab="${n(t.route.activeTab)}">
      ${r}
    </section>`}function oo(e={},t={}){let n=Jn(e,{currentWorkspaceId:t.currentWorkspaceId||e.currentWorkspaceId||``,viewTargets:eo(e,t),sampleWorkspaceIds:t.sampleWorkspaceIds}),r=n.isOwner||t.isOwner===!0;return r&&n.route.settingsOpen?ao(e,n,Qa(e,{coins:t.coins,currentWorkspaceId:t.currentWorkspaceId||e.currentWorkspaceId||``,renderers:t.renderers||{},viewTargets:eo(e,t)})):r&&n.route.activeTab===`generation`?no(e,t):n.route.activeTab===`rewards`?ao(e,n,Ma(e,{coins:t.coins,currentWorkspaceId:t.currentWorkspaceId||e.currentWorkspaceId||``,isOwner:r})):ra(e,t)?ao(e,n,la(e,{currentWorkspaceId:t.currentWorkspaceId||e.currentWorkspaceId||``,renderers:t.renderers||{}})):io(e)?ao(e,n,xa(e,{activeGrowthBoardLane:n.route.boardLane,coins:t.coins,currentWorkspaceId:t.currentWorkspaceId||e.currentWorkspaceId||``,isOwner:r,viewTargets:eo(e,t)})):ro(e)}function so(e,t={},n={}){e&&(e.innerHTML=oo(t,n))}function co({root:e=null,location:n,document:r}={}){let i={booted:!1,context:t({location:n,document:r})};function a(){return i.booted=!0,e&&so(e,i),o()}function o(){return{booted:i.booted,context:i.context}}return{bootstrap:a,state:o}}function V(e){return Array.isArray(e)?e:[]}function lo(...e){for(let t of e){let e=r(t);if(e)return e}return``}function uo(...e){for(let t of e){let e=V(t).map(r).filter(Boolean);if(e.length)return Array.from(new Set(e)).slice(0,12)}return[]}function H(e={}){return Object.fromEntries(Object.entries(e).filter(([,e])=>Array.isArray(e)?e.length>0:e&&typeof e==`object`||typeof e==`boolean`?!0:r(e)))}function fo(e={}){return(e.targetProvisioning||{}).graphOptions||e.graphOptions||{}}function po(e={},t={}){let n=e.targetProvisioning||{},i=fo(e),a=r(t.domainPackId||t.domain_pack_id||n.selectedDomainPackId||i.selectedDomainPackId||e.domainPackId),o=V(i.domainPacks),s=o.find(e=>r(e.domainPackId||e.domain_pack_id)===a)||o[0]||{},c=V(s.subjects).length?V(s.subjects):V(i.subjects);return{domainPackId:a||r(s.domainPackId||s.domain_pack_id),domain:r(t.domain||n.selectedDomain||i.selectedDomain||s.domain||e.domain),subject:r(t.subject||n.selectedSubject||i.selectedSubject||c[0]||e.subject)}}function mo(e={},t=``,n={}){let i=e.suggestedPlan||{},a=e.nextCardRecommendation||{},o=e.generationDefaults||{},s=e.targetProvisioning||{},c=fo(e),l=po(e,n),u=V(a.targetNodeIds).length?V(a.targetNodeIds):V(i.targetNodeIds).length?V(i.targetNodeIds):[a.targetNodeId||i.targetNodeId].filter(Boolean);return{workspace_id:r(t||e.target?.workspaceId),learner_id:r(e.target?.learnerId||t),program_id:r(e.programId||i.programId||o.programId),recipe_id:r(n.recipeId||n.recipe_id||e.selectedRecipeId||`daily_english_v1`),domain_pack_id:r(l.domainPackId||s.selectedDomainPackId||c.selectedDomainPackId||e.domainPackId||i.domainPackId||o.domainPackId),domain:r(l.domain||s.selectedDomain||c.selectedDomain||a.domain||i.domain||e.domain||o.domain||`english`),subject:r(l.subject||s.selectedSubject||c.selectedSubject||a.subject||i.subject||e.subject||o.subject||i.domain||e.domain||`english`),horizon:r(e.horizon||o.horizon||`daily_plan`),available_minutes:Number(o.availableMinutes||e.availableMinutes||15)||15,target_node_ids:u.map(r).filter(Boolean).slice(0,12),card_schema_version:r(o.cardSchemaVersion||`growth.card.authoring.v1`)}}function ho({context:e={},workspaceId:t=``,state:n={}}={}){let i=mo(e,t,n.targetProvisionDraft||{}),a=(n.learningLoopState?.data||e.learningLoopState||{}).nextAction||{},o=r(a.action),s=e.suggestedPlan||{},c=(n.dailyLoopDraftResult||{}).planDraft||{},l=ne(c),u=uo(s.assessmentCoverageNodeIds,s.assessmentCoverage,s.targetNodeIds,i.target_node_ids,[s.targetNodeId]),d={...i,action:`run_next`,requested_by:`owner`,plan_draft_id:r(a.planDraftId||c.planDraftId),selected_item_id:r(a.itemId||c.selectedItemId||l.itemId),task_card_id:r(a.taskCardId),target_node_ids:uo(i.target_node_ids,s.targetNodeIds,[s.targetNodeId]),assessment_coverage_node_ids:u};return o===`review_stage_assessment`&&(d.confirm_stage_assessment=!0,d.allow_stage_activation=!0,d.activation_reason=`owner_confirmed_checkpoint`),Object.fromEntries(Object.entries(d).filter(([,e])=>Array.isArray(e)?e.length>0:typeof e==`boolean`?e===!0:r(e)))}function U(e={},t=``){let n=e.suggestedPlan||{},i=e.generationDefaults||{},a=e.targetProvisioning||{},o=fo(e);return{workspace_id:r(t||e.target?.workspaceId),learner_id:r(e.target?.learnerId||t),program_id:r(e.programId||n.programId||i.programId),domain_pack_id:r(a.selectedDomainPackId||o.selectedDomainPackId||e.domainPackId||n.domainPackId||i.domainPackId),domain:r(a.selectedDomain||o.selectedDomain||n.domain||e.domain||i.domain),subject:r(a.selectedSubject||o.selectedSubject||n.subject||e.subject||i.subject||n.domain||e.domain),horizon:r(e.horizon||i.horizon||`daily_plan`)}}function go({context:e={},workspaceId:t=``,selectedCycle:n={}}={}){let r=e.suggestedPlan||{},i=e.generationDefaults||{},a=e.nextCardRecommendation||{},o=c(n||{}),s=uo(o.target_node_ids,a.targetNodeIds,r.targetNodeIds,[a.targetNodeId||r.targetNodeId]);return H({...U(e,t),available_minutes:lo(i.availableMinutes,e.availableMinutes,15),low_pressure:!0,requested_by:`owner`,source_plan_draft_id:o.plan_draft_id,source_task_card_id:o.task_card_id,source_evaluation_id:o.evaluation_id,profile_delta_id:o.profile_delta_id,evidence_id:o.evidence_id,correction_id:o.correction_id,source_id:o.source_id,source_target_node_ids:o.target_node_ids,target_node_ids:s})}function _o({context:e={},workspaceId:t=``,selectedCycle:n={}}={}){return H({...go({context:e,workspaceId:t,selectedCycle:n}),auto_select_latest_completed_cycle:!0,accept_proposal:!0,create_digest:!0,review_digest:!1,create_handoff:!1,deliver_handoff:!1,requested_by:`owner`})}function vo({context:e={},workspaceId:t=``,selectedCycle:n={}}={}){return H({..._o({context:e,workspaceId:t,selectedCycle:n}),prepare_review_packet:!0,review_digest:!0,ensure_failure_policy:!0,create_handoff:!0,deliver_handoff:!1,attempt_execution:!1,requested_by:`owner`})}function yo(e=``){let t=r(e).toLowerCase();return t===`accepted`?`Owner accepted supervised next-card proposal.`:t===`expired`?`Owner expired stale supervised next-card proposal.`:t===`superseded`?`Owner superseded supervised next-card proposal.`:`Owner skipped supervised next-card proposal.`}function bo({context:e={},workspaceId:t=``,proposal:n={},status:i=``,reason:a=``}={}){let o=r(i);return H({...U(e,t),status:o,reason:r(a)||yo(o),reviewed_by:`owner`,proposal_id:r(n.proposalId||n.proposal_id)})}function xo({context:e={},workspaceId:t=``,proposal:n={}}={}){let i=e.generationDefaults||{},a=r(n.proposalId||n.proposal_id);return H({...U(e,t),proposal_id:a,generation_key:[`automation_proposal`,a,r(n.planDraftId||n.plan_draft_id)].filter(Boolean).join(`:`),card_schema_version:r(i.cardSchemaVersion||`growth.card.authoring.v1`),requested_by:`owner`})}function So(e=``){let t=r(e).toLowerCase();return t===`reviewed`?`Owner reviewed automation digest without publishing.`:t===`archived`?`Owner archived automation digest without publishing.`:t===`superseded`?`Owner superseded automation digest without publishing.`:`Owner reviewed automation digest.`}function Co({context:e={},workspaceId:t=``,digest:n={},status:i=``}={}){let a=r(i),o=V(n.requiredActions).map((e={})=>r(e.candidateId||e.candidate_id)).filter(Boolean);return H({...U(e,t),digest_id:r(n.digestId||n.digest_id),status:a,selected_candidate_ids:o,reason:So(a),reviewed_by:`owner`})}function wo({context:e={},workspaceId:t=``}={}){return H({...U(e,t),limit:6,requested_by:`owner`})}function To({context:e={},workspaceId:t=``}={}){return H({...U(e,t),policy_version:`growth.learningAutomationFailurePolicy.v1`,policy:{schemaVersion:`growth.learningAutomationPolicy.v1`,summaryOnly:!0,ownerReviewRequired:!0,digestReviewRequired:!0,actionHandoffRequiredBeforeScheduling:!0,writefulSchedulingAllowed:!1},rollback_policy:{schemaVersion:`growth.learningAutomationFailurePolicy.rollback.v1`,summaryOnly:!0,transactionalPublishRequired:!0,partialPublishBehavior:`service_transaction_rollback`,proposalExecutionFailure:`record_bounded_execution_failure_owner_retry`,actionHandoffFailure:`no_learning_write_visible_owner_retry`,retryRequiresOwner:!0,maxAutomaticRetries:0},failure_policy:{schemaVersion:`growth.learningAutomationFailurePolicy.failure.v1`,summaryOnly:!0,visibleFailureRequired:!0,ownerReviewRequired:!0,retryRequiresOwner:!0,maxAutomaticRetries:0,writefulSchedulingAllowed:!1},requested_by:`owner`})}function Eo({context:e={},workspaceId:t=``,policy:n={},status:i=``}={}){let a=r(i);return H({...U(e,t),policy_id:r(n.policyId||n.policy_id),status:a,reason:a===`active`?`Owner activated failure policy for supervised automation readiness; writeful scheduling remains disabled.`:`Owner marked failure policy ${a||`reviewed`}; no scheduler permission changed.`,note:a===`active`?`Visible failure and Owner retry policy activated.`:`Owner reviewed failure policy without enabling scheduling.`,reviewed_by:`owner`})}function Do({context:e={},workspaceId:t=``,digest:n={}}={}){let i=r(n.digestId||n.digest_id);return H({...U(e,t),digest_id:i,summary:`Owner requested bounded action handoff for reviewed digest ${i||`digest`}.`,requested_by:`owner`})}function Oo({context:e={},workspaceId:t=``,handoff:n={}}={}){return H({...U(e,t),handoff_id:r(n.handoffId||n.handoff_id),requested_by:`owner`})}function ko(e={}){let t=V(e.actions);return t.find((e={})=>r(e.proposalId||e.proposal_id))||t[0]||{}}function Ao({context:e={},workspaceId:t=``,handoff:n={}}={}){let i=U(e,t),a=e.generationDefaults||{},o=ko(n),s=r(n.handoffId||n.handoff_id),c=r(o.proposalId||o.proposal_id||n.proposalId||n.proposal_id),l=r(o.planDraftId||o.plan_draft_id||n.planDraftId||n.plan_draft_id),u=r(o.selectedItemId||o.selected_item_id||o.itemId||o.item_id||n.selectedItemId||n.selected_item_id);return H({...i,handoff_id:s,digest_id:r(n.digestId||n.digest_id),policy_id:r(n.policyId||n.policy_id),proposal_id:c,plan_draft_id:l,selected_item_id:u,execution_mode:`owner_explicit_once`,generation_key:[`scheduler_execution`,s,c,l,u].filter(Boolean).join(`:`),card_schema_version:r(a.cardSchemaVersion||`growth.card.authoring.v1`),requested_by:`owner`})}function jo({context:e={},workspaceId:t=``,target:n={},status:i=``}={}){let a=r(n.targetId||n.target_id||n.workerTargetId||n.worker_target_id),o=r(i);return H({...U(e,t),target_id:a,status:o,reason:o===`enabled`?`Owner reviewed target for future scheduler worker evidence; production scheduling remains disabled.`:`Owner marked worker target ${o||`reviewed`}; no worker started.`,reviewed_by:`owner`})}function Mo({context:e={},workspaceId:t=``}={}){let n=U(e,t),i=e.generationDefaults||{};return H({...n,run_mode:`background_supervised_tick`,limit:5,generation_key:[`scheduler_run`,r(n.workspace_id),r(n.domain),r(n.subject),r(n.horizon)].filter(Boolean).join(`:`),card_schema_version:r(i.cardSchemaVersion||`growth.card.authoring.v1`),requested_by:`owner`})}function No({context:e={},workspaceId:t=``}={}){let n=U(e,t),r=e.suggestedPlan||{},i=e.nextCardRecommendation||{},a=uo(i.targetNodeIds,r.targetNodeIds,[i.targetNodeId||r.targetNodeId]);return H({...n,target_node_ids:a,limit:5,policy:{schemaVersion:`growth.learningAutomationSchedulerWorkerTarget.policy.v1`,summaryOnly:!0,workerMode:`background_worker_tick`,schedulerRunMode:`background_supervised_tick`,ownerReviewRequired:!0,targetProvisioningRequired:!0,actionHandoffRequiredBeforeScheduling:!0,productionSchedulingAllowed:!1,maxActionsPerTick:5},requested_by:`owner`})}function Po({context:e={},workspaceId:t=``,recommendation:n={},status:i=``}={}){let a=e.suggestedPlan||{},o=e.generationDefaults||{},s=r(i);return H({workspace_id:r(t||n.workspaceId||n.workspace_id||e.target?.workspaceId),learner_id:r(e.target?.learnerId||n.learnerId||n.learner_id||t),program_id:r(e.programId||n.programId||n.program_id||a.programId||o.programId),trajectory_id:r(n.trajectoryId||n.trajectory_id||n.id),task_card_id:r(n.sourceTaskCardId||n.source_task_card_id||n.taskCardId||n.task_card_id),source_evaluation_id:r(n.sourceEvaluationId||n.source_evaluation_id||n.evaluationId||n.evaluation_id),status:s,reason_code:s===`expired`?`owner_expired_stale_recommendation`:`owner_skipped_low_pressure`,reviewed_by:`owner`})}function Fo(e={}){return(!e.cardGeneration||typeof e.cardGeneration!=`object`)&&(e.cardGeneration={}),e.cardGeneration}function Io(e={}){return Fo(e).context||null}function Lo(e={},t=``){let n=Fo(e),i=n.context||{};return r(n.selectedWorkspaceId||i.target?.workspaceId||t)}function Ro(e={},t=!1){let n={status:`loading`,data:e.data||null,error:``};return t&&(n.actionStatus=e.actionStatus||`idle`,n.actionResult=e.actionResult||null,n.actionError=e.actionError||``),n}function zo(e,t={},n=!1,r=`ready`,i=``){let a={status:r,data:e,error:i};return n&&(a.actionStatus=t.actionStatus||`idle`,a.actionResult=t.actionResult||null,a.actionError=t.actionError||``),a}function Bo(e,t={},n=!1){return zo(t.data||null,t,n,`failed`,e?.message||String(e))}function Vo(e={},t={},n=``,r){n&&(e.context=Object.assign({},e.context||t,{[n]:r}))}function Ho(e={}){let t=(e.releaseWorkbench||{}).data||e.context?.releaseWorkbench||{};return t.releaseWorkbench||t||{}}function Uo(e={},t=``,n=``){let i=Ho(e),a=Array.isArray(i.ownerActions)?i.ownerActions:[],o=r(t),s=r(n);return a.find((e={})=>r(e.endpointKey||e.endpoint_key)===o&&r(e.key||e.actionKey||e.action_key)===s)||a.find((e={})=>r(e.endpointKey||e.endpoint_key)===o)||null}function Wo(e={}){let t=e.packageResult||{},n=e.packageCandidate||t.package||t.releasePackage||t.release_package;return n&&typeof n==`object`?n:null}function W(e=[],t=``,n=[]){let i=r(t);return(Array.isArray(e)?e:[]).find((e={})=>n.some(t=>r(e[t])===i))||null}function G(e={},t=``,n=``){let r=(e[t]||{}).data||{};return Array.isArray(r[n])?r[n]:[]}function Go(e={}){let t=e.context||{};return Array.isArray(t.recommendationLifecycle)?t.recommendationLifecycle:[]}function Ko(e={},t={}){let n=t.dataset||{},i=r(n.recommendationLifecycleTrajectoryId),a=r(n.recommendationLifecycleSourceTaskCardId),o=r(n.recommendationLifecycleSourceEvaluationId);return Go(e).find((e={})=>i&&r(e.trajectoryId||e.trajectory_id||e.id)===i||a&&r(e.sourceTaskCardId||e.source_task_card_id||e.taskCardId||e.task_card_id)===a||o&&r(e.sourceEvaluationId||e.source_evaluation_id||e.evaluationId||e.evaluation_id)===o)||{trajectoryId:i,sourceTaskCardId:a,sourceEvaluationId:o}}function K(e={}){return Object.fromEntries(Object.entries(e).filter(([,e])=>Array.isArray(e)?e.length>0:e&&typeof e==`object`?!0:r(e)||e===!0))}function qo(e){return Array.isArray(e)?e:[]}function q(e={},t=``){let n=e.suggestedPlan||{},i=e.generationDefaults||{},a=e.releaseWorkbench||{},o=(a.releaseWorkbench||a).inventory||e.releaseInventory||{};return{workspace_id:r(t||e.target?.workspaceId),learner_id:r(e.target?.learnerId||t),program_id:r(e.programId||n.programId||i.programId),domain_pack_id:r(e.domainPackId||n.domainPackId||i.domainPackId),domain:r(n.domain||e.domain||i.domain),subject:r(n.subject||e.subject||i.subject||n.domain||e.domain),horizon:r(e.horizon||i.horizon||`daily_plan`),collection_run_id:r(e.collectionRunId||o.latestCollectionRunId)}}function Jo({context:e={},workspaceId:t=``}={}){return K(q(e,t))}function Yo({context:e={},workspaceId:t=``}={}){return K({...q(e,t),limit:5})}function Xo({context:e={},workspaceId:t=``}={}){return K({...q(e,t),limit:4,activation_record_limit:5,runtime_enablement_record_limit:5})}function Zo({context:e={},workspaceId:t=``}={}){return K({...q(e,t),limit:8})}function Qo({context:e={},workspaceId:t=``}={}){return K({...q(e,t),limit:5})}function $o({context:e={},workspaceId:t=``,recordKind:n=``}={}){let i=r(n),a={...q(e,t),requested_by:`owner`,recorded_by:`owner`,activation_gates:[`writeful_execution`],note:`Owner recorded summary-only release lifecycle readback from Growth UI.`,evidence:{schemaVersion:`growth.releaseLifecycleRecord.ownerUiEvidence.v1`,summaryOnly:!0,recordKind:i,source:`growth_owner_generation_ui`}};return i===`preflight`&&(a.allow_write_preflight=!0,a.created_by=`owner`,delete a.recorded_by,delete a.activation_gates,delete a.note,delete a.evidence),i===`activation`&&(a.activation_decision={schemaVersion:`growth.learningAutomationReleaseActivation.decision.v1`,summaryOnly:!0,decision:`approved_for_config_enablement`,recordOnly:!0,advisoryOnly:!0}),i===`runtime`&&(a.enablement_decision={schemaVersion:`growth.learningAutomationRuntimeEnablement.decision.v1`,summaryOnly:!0,decision:`ready_for_manual_runtime_config_enablement`,recordOnly:!0,advisoryOnly:!0}),K(a)}function es({context:e={},workspaceId:t=``,action:n={}}={}){let i=n.preparationRoute?.body||n.route?.body||{},a=r(n.key||n.actionKey||n.action_key||i.record_kind||`release_package`);return K({...q(e,t),requested_by:`owner`,action_key:a,action:{key:a,action:r(n.action),endpointKey:r(n.endpointKey||n.endpoint_key),source:r(n.source),summaryOnly:!0},tasks:qo(i.tasks||[`planner_readiness`,`scheduler_dry_run`]).map(r).filter(Boolean),required_task_ids:qo(i.required_task_ids||i.requiredTaskIds||[`planner_readiness`,`scheduler_dry_run`]).map(r).filter(Boolean),activation_gates:qo(i.activation_gates||i.activationGates||[`writeful_execution`]).map(r).filter(Boolean),write_collection_run:i.write_collection_run===!0||i.writeCollectionRun===!0||i.record_collection_run===!0||i.recordCollectionRun===!0,write_package_record:i.write_package_record===!0||i.writePackageRecord===!0||i.record_package===!0||i.recordPackage===!0})}var ts=Object.freeze([`central_visual_evidence_json`,`mobile_visual_evidence_json`,`release_status_readback_json`,`release_evidence_ledger_json`,`release_action_audit_json`,`release_lifecycle_records_json`]);function ns({context:e={},workspaceId:t=``,action:n={},releasePackage:i=null}={}){let a=r(n.endpointKey||n.endpoint_key),o=n.route?.body||{},s=r(n.key||n.actionKey||o.evidence_key||o.check_key||o.approval_key),c={...q(e,t),endpoint_key:a,action_key:s,requested_by:`owner`,action:{key:s,action:r(n.action),endpointKey:a,source:r(n.source),summaryOnly:!0}};if(a===`release_evidence`&&(c.evidence_key=r(o.evidence_key||o.check_key||s),c.check_key=r(o.check_key||o.evidence_key||s)),a===`release_approval`&&(c.approval_key=r(o.approval_key||o.config_gate||s),c.config_gate=r(o.config_gate||o.approval_key||s),c.status=`active`),a===`release_evidence_collection`){c.tasks=qo(o.tasks||[`learning_loop_state`]).map(r).filter(Boolean),c.required_task_ids=qo(o.required_task_ids||o.requiredTaskIds||c.tasks).map(r).filter(Boolean),c.write_collection_run=o.write_collection_run===!0||o.writeCollectionRun===!0||o.record_collection_run===!0||o.recordCollectionRun===!0,c.write_release_evidence_records=o.write_release_evidence_records===!0||o.writeReleaseEvidenceRecords===!0||o.record_release_evidence_records===!0||o.recordReleaseEvidenceRecords===!0,(o.auto_select_completed_cycle===!0||o.autoSelectCompletedCycle===!0)&&(c.auto_select_completed_cycle=!0),(o.auto_select_latest_completed_cycle===!0||o.autoSelectLatestCompletedCycle===!0)&&(c.auto_select_latest_completed_cycle=!0),c.central_visual_evidence_file=r(o.central_visual_evidence_file||o.centralVisualEvidenceFile);for(let e of ts)c[e]=r(o[e])}return a===`release_package`&&i&&typeof i==`object`&&(c.release_package=i),a===`release_decision`&&(c.status=r(o.status||`approved`),c.decision_summary=o.decision_summary&&typeof o.decision_summary==`object`?o.decision_summary:{summaryOnly:!0},c.collection_run_id=r(o.collection_run_id||o.collectionRunId||c.collection_run_id),(o.auto_select_latest_ready_collection_run===!0||o.autoSelectLatestReadyCollectionRun===!0)&&(c.auto_select_latest_ready_collection_run=!0)),(a===`release_activation`||a===`runtime_enablement`)&&(c.activation_gates=qo(o.activation_gates||o.activationGates||[`writeful_execution`]).map(r).filter(Boolean)),K(c)}function rs({api:e={},render:t,state:n={},runReadback:i,runActionSlot:a,releaseActionContext:o,refreshReleaseWorkbench:s}={}){return{refreshReleaseArtifactTemplate(t={}){return i({slot:`releaseArtifactTemplate`,contextKey:`releaseArtifactTemplate`,createPayload:Jo,fetchResult:({targetWorkspaceId:t,context:n})=>e.fetchGrowthReleaseArtifactTemplate(t,n),options:t.options||{}})},refreshReleaseWorkbenchActionAudits(t={}){return i({slot:`releaseWorkbenchActionAudits`,contextKey:`releaseWorkbenchActionAudits`,createPayload:Yo,fetchResult:({payload:t,targetWorkspaceId:n})=>e.fetchGrowthReleaseWorkbenchActionAudits(t,n),options:t.options||{}})},refreshReleaseStatusReadbacks(t={}){return i({slot:`releaseStatusReadbacks`,contextKey:`releaseStatusReadbacks`,createPayload:Xo,fetchResult:({payload:t,targetWorkspaceId:n})=>e.fetchGrowthReleaseStatusReadbacks(t,n),options:t.options||{}})},refreshReleaseEvidenceLedger(t={}){return i({slot:`releaseEvidenceLedger`,contextKey:`releaseEvidenceLedger`,createPayload:Zo,fetchResult:({payload:t,targetWorkspaceId:n})=>e.fetchGrowthReleaseEvidenceLedger(t,n),options:t.options||{}})},refreshReleaseLifecycleRecords(t={}){return i({slot:`releaseLifecycleRecords`,contextKey:`releaseLifecycleRecords`,actionSlots:!0,createPayload:Qo,fetchResult:({payload:t,targetWorkspaceId:n})=>e.fetchGrowthReleaseLifecycleRecords(t,n),options:t.options||{}})},async recordReleaseLifecycleRecordFromUi(i={}){let{cardGeneration:a,context:c,targetWorkspaceId:l}=o(),u=r(i.dataset?.releaseLifecycleRecord),d=a.releaseLifecycleRecords||{};a.releaseLifecycleRecords=Object.assign({},d,{actionStatus:`recording`,actionResult:d.actionResult||null,actionError:``}),typeof t==`function`&&t(n);try{let r=$o({context:c,workspaceId:l,recordKind:u}),i;if(u===`preflight`)i=await e.recordGrowthReleasePreflightReport(r,l);else if(u===`activation`)i=await e.recordGrowthReleaseActivation(r,l);else if(u===`runtime`)i=await e.recordGrowthRuntimeEnablement(r,l);else throw Error(`release_lifecycle_record_kind_unsupported`);return a.releaseLifecycleRecords=Object.assign({},a.releaseLifecycleRecords,{actionStatus:`recorded`,actionResult:i,actionError:``}),await s(l,c),typeof t==`function`&&t(n),i}catch(e){return a.releaseLifecycleRecords=Object.assign({},a.releaseLifecycleRecords,{actionStatus:`failed`,actionError:e?.message||String(e)}),typeof t==`function`&&t(n),null}},async buildReleasePackageFromUi(i={}){let{cardGeneration:a,context:s,targetWorkspaceId:c}=o(),l=Uo(a,i.dataset?.releaseWorkbenchEndpointKey,i.dataset?.releaseWorkbenchActionKey);if(!l)throw Error(`release_workbench_action_not_found`);let u=a.releaseWorkbench||{};a.releaseWorkbench=Object.assign({},u,{packageStatus:`building`,packageResult:u.packageResult||null,packageCandidate:u.packageCandidate||null,packageError:``}),typeof t==`function`&&t(n);try{let i=es({context:s,workspaceId:c,action:l}),o=await e.buildGrowthReleasePackage(i,c),u=o?.package||o?.releasePackage||o?.release_package||null,d=u?o?.ok===!1?`blocked`:`ready`:`blocked`;return a.releaseWorkbench=Object.assign({},a.releaseWorkbench,{packageStatus:d,packageResult:o,packageCandidate:u,packageError:o?.ok===!1?r(o.error)||`release_package_candidate_blocked`:``}),typeof t==`function`&&t(n),o}catch(e){return a.releaseWorkbench=Object.assign({},a.releaseWorkbench,{packageStatus:`failed`,packageError:e?.message||String(e)}),typeof t==`function`&&t(n),null}},async recordReleaseWorkbenchActionFromUi(i={}){let a=r(i.dataset?.releaseWorkbenchBlockedReason),{cardGeneration:c,context:l,targetWorkspaceId:u}=o();if(a)return c.releaseWorkbench=Object.assign({},c.releaseWorkbench||{},{actionStatus:`failed`,actionError:a}),typeof t==`function`&&t(n),null;let d=Uo(c,i.dataset?.releaseWorkbenchEndpointKey,i.dataset?.releaseWorkbenchActionKey);if(!d)throw Error(`release_workbench_action_not_found`);let f=c.releaseWorkbench||{};c.releaseWorkbench=Object.assign({},f,{actionStatus:`recording`,actionResult:f.actionResult||null,actionError:``}),typeof t==`function`&&t(n);try{let a=ns({context:l,workspaceId:u,action:d,releasePackage:r(i.dataset?.releaseWorkbenchEndpointKey)===`release_package`?Wo(c.releaseWorkbench):null}),o=await e.recordGrowthReleaseWorkbenchAction(a,u);return c.releaseWorkbench=Object.assign({},c.releaseWorkbench,{actionStatus:`recorded`,actionResult:o,actionError:``}),await s(u,l),typeof t==`function`&&t(n),o}catch(e){return c.releaseWorkbench=Object.assign({},c.releaseWorkbench,{actionStatus:`failed`,actionError:e?.message||String(e)}),typeof t==`function`&&t(n),null}}}}function is({state:e={},api:t={},render:n,getCurrentWorkspaceId:i=()=>``,isOwner:a=()=>!0,payloadBuilders:o={},refreshers:s={}}={}){async function c({slot:t,contextKey:r,actionSlots:o=!1,createPayload:s,fetchResult:c,statusFromResult:l,options:u={}}={}){let d=Fo(e),f=Io(e);if(!a()||!f)return null;let p=Lo(e,i()),m=d[t]||{};d[t]=Ro(m,o),!u.silent&&typeof n==`function`&&n(e);try{let i=await c({payload:typeof s==`function`?s({context:f,workspaceId:p,state:d}):null,targetWorkspaceId:p,context:f});return d[t]=zo(i,m,o,typeof l==`function`?l(i).status:`ready`,typeof l==`function`?l(i).error:``),Vo(d,f,r,i),!u.silent&&typeof n==`function`&&n(e),i}catch(r){return d[t]=Bo(r,m,o),!u.silent&&typeof n==`function`&&n(e),null}}async function l(e,t){typeof s.refreshReleaseWorkbench==`function`&&await s.refreshReleaseWorkbench(e,t)}async function u(e,t){typeof s.refreshAutomationStack==`function`&&await s.refreshAutomationStack(e,t)}async function d(e,t){typeof s.refreshRecommendationLifecycle==`function`&&await s.refreshRecommendationLifecycle(e,t)}async function f(e={}){typeof s.refreshOwnerCycleDrilldown==`function`&&await s.refreshOwnerCycleDrilldown(e)}async function p(e,t,n={}){typeof s.refreshOperatingLoopRuns==`function`&&await s.refreshOperatingLoopRuns(e,t,n)}async function m(e,t,n={}){typeof s.refreshProfileFeedback==`function`&&await s.refreshProfileFeedback(e,t,n)}async function h(e,t,n={}){typeof s.refreshAutomationActionHandoffs==`function`&&await s.refreshAutomationActionHandoffs(e,t,n)}async function g(e,t,n={}){typeof s.refreshAutomationClosedLoopActionPlan==`function`&&await s.refreshAutomationClosedLoopActionPlan(e,t,n)}function _(e={},t=``){return W(G(e,`automationActionHandoffs`,`handoffs`),t,[`handoffId`,`handoff_id`])}async function v(e=``,t={}){let n={run_learning_loop_next:s.advanceOperatingLoopFromUi||s.advanceOperatingLoop,prepare_cycle_closure:s.prepareAutomationCycleClosureFromUi||s.prepareAutomationCycleClosure,advance_review:s.advanceAutomationReviewFromUi||s.advanceAutomationReview}[e];if(typeof n!=`function`)throw Error(`${e||`automation_closed_loop_action`}_handler_unavailable`);return n(t)}async function y(e=``,{cardGeneration:n,context:r,targetWorkspaceId:i}={}){let a=_(n,e);if(a||(await h(i,r,{silent:!0}),a=_(n,e)),!a)throw Error(`automation_action_handoff_id_required`);let o=Oo({context:r,workspaceId:i,handoff:a});return t.deliverGrowthAutomationActionHandoff(e,o,i)}async function b(t,n){if(typeof s.clearDetailCache==`function`&&s.clearDetailCache(),typeof s.loadCurrentWorkspace==`function`)try{await s.loadCurrentWorkspace()}catch(e){n.automationProposals=Object.assign({},n.automationProposals||{},{actionError:`建议已处理，但刷新列表失败：${e?.message||String(e)}`})}typeof s.refreshCardGenerationContextAfterPublish==`function`&&await s.refreshCardGenerationContextAfterPublish(t,{errorPrefix:`建议已处理，但`}),await u(t,n.context||Io(e)),await f({silent:!0})}async function x(t,n){if(typeof s.clearDetailCache==`function`&&s.clearDetailCache(),typeof s.loadCurrentWorkspace==`function`)try{await s.loadCurrentWorkspace()}catch(e){n.error=`闭环已执行，但刷新列表失败：${e?.message||String(e)}`}typeof s.refreshCardGenerationContextAfterPublish==`function`&&await s.refreshCardGenerationContextAfterPublish(t,{errorPrefix:`闭环已执行，但`});let r=n.context||Io(e);await p(t,r,{silent:!0}),await f({silent:!0}),await m(t,r,{silent:!0})}function S(){let t=Fo(e),n=Io(e);if(!n)throw Error(`card_generation_context_required`);return{cardGeneration:t,context:n,targetWorkspaceId:Lo(e,i())}}async function C({slot:t,submittingStatus:r=`submitting`,successStatus:i=`ready`,actionErrorFromResult:a,action:o,afterSuccess:s,afterFailure:c}={}){let{cardGeneration:l,context:u,targetWorkspaceId:d}=S(),f=l[t]||{};l[t]=Object.assign({},f,{actionStatus:r,actionResult:f.actionResult||null,actionError:``}),typeof n==`function`&&n(e);try{let r=await o({cardGeneration:l,context:u,targetWorkspaceId:d}),c=typeof i==`function`?i(r):i,f=typeof a==`function`?a(r):``;return l[t]=Object.assign({},l[t],{actionStatus:c,actionResult:r,actionError:f}),typeof s==`function`&&await s({cardGeneration:l,context:u,targetWorkspaceId:d,result:r}),typeof n==`function`&&n(e),r}catch(r){return l[t]=Object.assign({},l[t],{actionStatus:`failed`,actionError:r?.message||String(r)}),typeof c==`function`&&await c({cardGeneration:l,context:u,targetWorkspaceId:d,error:r}),typeof n==`function`&&n(e),null}}let w={...rs({api:t,render:n,state:e,runReadback:c,runActionSlot:C,releaseActionContext:S,refreshReleaseWorkbench:l}),refreshProfileFeedback(e={}){let n=o.createProfileFeedbackQueryPayload;return c({slot:`profileFeedback`,contextKey:`profileFeedback`,createPayload({context:e,workspaceId:t,state:r}){if(typeof n!=`function`)throw Error(`profile_feedback_payload_builder_unavailable`);return n({context:e,workspaceId:t,selectedCycle:r.cycleHistory?.selectedCycle||{}})},fetchResult:({payload:e,targetWorkspaceId:n})=>t.fetchGrowthProfileFeedback(e,n),statusFromResult(e={}){return e.ok===!1?{status:r(e.status||`blocked`),error:r(e.error||`profile_feedback_blocked`)}:{status:`ready`,error:``}},options:e.options||{}})},async advanceOperatingLoopFromUi(){let{cardGeneration:i,context:a,targetWorkspaceId:o}=S(),c=i.operatingLoop||{};i.status=`advancing`,i.error=``,i.progressStep=`context`,i.progressMessage=`正在通过服务端闭环 Facade 执行当前 next action。`,i.operatingLoop=Object.assign({},c,{actionStatus:`running`,actionResult:c.actionResult||null,actionError:``}),typeof n==`function`&&n(e),typeof s.scheduleCardGenerationProgress==`function`&&s.scheduleCardGenerationProgress(`advance`);try{let c=ho({context:a,workspaceId:o,state:i}),l=await t.advanceLearningOperatingLoop(c,o);typeof s.clearCardGenerationProgressTimers==`function`&&s.clearCardGenerationProgressTimers();let u=l.actionResult||{},d=l.summary||{},f=r(d.taskCardId||u.taskCardId),p=r(d.planDraftId||u.planDraftId),m=r(u.selectedItemId||u.selected_item_id);return i.status=l.ok?`published`:`failed`,i.operatingLoop=Object.assign({},i.operatingLoop||{},{actionStatus:l.ok?`executed`:r(l.status||`failed`),actionResult:l,actionError:l.ok?``:r(l.error||`operating_loop_advance_failed`)}),(p||f)&&(i.dailyLoopPublishResult={ok:l.ok===!0,operation:`operating_loop_advance`,planDraft:{planDraftId:p,selectedItemId:m,generatedTaskCardId:f},generation:f?{published:{taskCardId:f}}:null,publishAttempt:{status:l.status||(l.ok?`executed`:`failed`),error:l.error||``}},i.generatedResult=f?{published:{taskCardId:f}}:i.generatedResult),i.progressStep=`done`,i.progressMessage=l.ok?`闭环执行完成，正在刷新状态。`:`闭环执行未完成，请查看错误。`,await x(o,i),typeof n==`function`&&n(e),l}catch(t){return typeof s.clearCardGenerationProgressTimers==`function`&&s.clearCardGenerationProgressTimers(),i.status=`failed`,i.error=t?.message||String(t),i.progressStep=`failed`,i.progressMessage=`闭环执行失败。`,i.operatingLoop=Object.assign({},i.operatingLoop||c,{actionStatus:`failed`,actionError:t?.message||String(t)}),typeof n==`function`&&n(e),null}},prepareAutomationCycleClosureFromUi(){return C({slot:`automationCycleClosure`,successStatus(e={}){return e.ok?`prepared`:`failed`},actionErrorFromResult(e={}){return e.ok?``:r(e.error||`automation_cycle_closure_prepare_failed`)},async action({cardGeneration:e,context:n,targetWorkspaceId:r}){let i=_o({context:n,workspaceId:r,selectedCycle:e.cycleHistory?.selectedCycle||{}});return t.prepareGrowthAutomationCycleClosure(i,r)},async afterSuccess({targetWorkspaceId:e,context:t}){await u(e,t),await f({silent:!0})}})},advanceAutomationReviewFromUi(){return C({slot:`automationReviewAdvancement`,successStatus(e={}){return e.ok?`advanced`:`failed`},actionErrorFromResult(e={}){return e.ok?``:r(e.error||`automation_review_advancement_failed`)},async action({cardGeneration:e,context:n,targetWorkspaceId:r}){let i=vo({context:n,workspaceId:r,selectedCycle:e.cycleHistory?.selectedCycle||{}});return t.advanceGrowthAutomationReview(i,r)},async afterSuccess({targetWorkspaceId:e,context:t}){await u(e,t),await l(e,t),await f({silent:!0})}})},async runAutomationClosedLoopActionPlanFromUi(t={}){let{cardGeneration:i,context:a,targetWorkspaceId:o}=S(),s=i.automationClosedLoopActionPlan||{},c=s.data||{},l=c.nextAction||{},u=r(t.dataset?.automationClosedLoopActionKey||l.key||c.summary?.nextAction),d=r(t.dataset?.automationClosedLoopBlockedReason);if(d)return i.automationClosedLoopActionPlan=Object.assign({},s,{actionStatus:`blocked`,actionError:d}),typeof n==`function`&&n(e),null;i.automationClosedLoopActionPlan=Object.assign({},s,{actionStatus:`running`,actionResult:s.actionResult||null,actionError:``}),typeof n==`function`&&n(e);try{if(u===`deliver_action_handoff`){let e=r(l.body?.handoff_id||l.body?.handoffId);if(!e)throw Error(`automation_action_handoff_id_required`);await y(e,{cardGeneration:i,context:a,targetWorkspaceId:o})}else if(u===`run_learning_loop_next`&&typeof w.advanceOperatingLoopFromUi==`function`)await w.advanceOperatingLoopFromUi();else if(u===`prepare_cycle_closure`&&typeof w.prepareAutomationCycleClosureFromUi==`function`)await w.prepareAutomationCycleClosureFromUi();else if(u===`advance_review`&&typeof w.advanceAutomationReviewFromUi==`function`)await w.advanceAutomationReviewFromUi();else if([`run_learning_loop_next`,`prepare_cycle_closure`,`advance_review`].includes(u))await v(u,{cardGeneration:i,context:a,targetWorkspaceId:o,state:e});else throw Error(`automation_closed_loop_action_not_supported_in_owner_panel`);return await g(o,a,{silent:!0}),i.automationClosedLoopActionPlan=Object.assign({},i.automationClosedLoopActionPlan||{},{actionStatus:`executed`,actionResult:{ok:!0,actionKey:u},actionError:``}),typeof n==`function`&&n(e),i.automationClosedLoopActionPlan.actionResult}catch(t){return i.automationClosedLoopActionPlan=Object.assign({},i.automationClosedLoopActionPlan||s,{actionStatus:`failed`,actionError:t?.message||String(t)}),typeof n==`function`&&n(e),null}},reviewAutomationProposalFromUi(e={}){return C({slot:`automationProposals`,successStatus:`reviewed`,async action({cardGeneration:n,context:i,targetWorkspaceId:a}){let o=r(e.dataset?.automationProposalId),s=r(e.dataset?.automationProposalStatus),c=W(G(n,`automationProposals`,`proposals`),o,[`proposalId`,`proposal_id`]);if(!c)throw Error(`automation_proposal_not_found`);let l=bo({context:i,workspaceId:a,proposal:c,status:s});return t.reviewGrowthAutomationProposal(o,l,a)},afterSuccess:({targetWorkspaceId:e,context:t})=>u(e,t)})},createAutomationProposalFromUi(){return C({slot:`automationProposals`,successStatus(e={}){return e.ok?`created`:`failed`},actionErrorFromResult(e={}){return e.ok?``:r(e.error||`automation_proposal_create_failed`)},async action({cardGeneration:e,context:n,targetWorkspaceId:r}){let i=go({context:n,workspaceId:r,selectedCycle:e.cycleHistory?.selectedCycle||{}});return t.createGrowthAutomationProposal(i,r)},afterSuccess:({targetWorkspaceId:e,context:t})=>u(e,t)})},publishAutomationProposalFromUi(e={}){return C({slot:`automationProposals`,successStatus(e={}){return e.ok?`published`:`failed`},actionErrorFromResult(e={}){return e.ok?``:r(e.error||`automation_proposal_publish_failed`)},async action({cardGeneration:n,context:i,targetWorkspaceId:a}){let o=r(e.dataset?.automationProposalId),s=W(G(n,`automationProposals`,`proposals`),o,[`proposalId`,`proposal_id`]);if(!s)throw Error(`automation_proposal_not_found`);let c=xo({context:i,workspaceId:a,proposal:s});return t.publishGrowthAutomationProposal(o,c,a)},afterSuccess:({cardGeneration:e,targetWorkspaceId:t})=>b(t,e)})},reviewAutomationDigestFromUi(e={}){return C({slot:`automationDigests`,successStatus:`reviewed`,async action({cardGeneration:n,context:i,targetWorkspaceId:a}){let o=r(e.dataset?.automationDigestId),s=r(e.dataset?.automationDigestStatus),c=W(G(n,`automationDigests`,`digests`),o,[`digestId`,`digest_id`]);if(!c)throw Error(`automation_digest_not_found`);let l=Co({context:i,workspaceId:a,digest:c,status:s});return t.reviewGrowthAutomationDigest(o,l,a)},afterSuccess:({targetWorkspaceId:e,context:t})=>u(e,t)})},createAutomationDigestFromUi(){return C({slot:`automationDigests`,successStatus(e={}){return e.ok?`created`:`failed`},actionErrorFromResult(e={}){return e.ok?``:r(e.error||`automation_digest_create_failed`)},async action({context:e,targetWorkspaceId:n}){let r=wo({context:e,workspaceId:n});return t.createGrowthAutomationDigest(r,n)},afterSuccess:({targetWorkspaceId:e,context:t})=>u(e,t)})},reviewAutomationFailurePolicyFromUi(e={}){return C({slot:`automationFailurePolicies`,successStatus:`reviewed`,async action({cardGeneration:n,context:i,targetWorkspaceId:a}){let o=r(e.dataset?.automationFailurePolicyId),s=r(e.dataset?.automationFailurePolicyStatus),c=W(G(n,`automationFailurePolicies`,`policies`),o,[`policyId`,`policy_id`]);if(!c)throw Error(`automation_failure_policy_not_found`);let l=Eo({context:i,workspaceId:a,policy:c,status:s});return t.reviewGrowthAutomationFailurePolicy(o,l,a)},afterSuccess:({targetWorkspaceId:e,context:t})=>u(e,t)})},createAutomationFailurePolicyFromUi(){return C({slot:`automationFailurePolicies`,successStatus(e={}){return e.ok?`created`:`failed`},actionErrorFromResult(e={}){return e.ok?``:r(e.error||`automation_failure_policy_create_failed`)},async action({context:e,targetWorkspaceId:n}){let r=To({context:e,workspaceId:n});return t.createGrowthAutomationFailurePolicy(r,n)},afterSuccess:({targetWorkspaceId:e,context:t})=>u(e,t)})},createAutomationActionHandoffFromUi(e={}){return C({slot:`automationActionHandoffs`,successStatus:`created`,async action({cardGeneration:n,context:i,targetWorkspaceId:a}){let o=r(e.dataset?.automationDigestId),s=W(G(n,`automationDigests`,`digests`),o,[`digestId`,`digest_id`]);if(!s)throw Error(`automation_digest_not_found`);let c=Do({context:i,workspaceId:a,digest:s});return t.createGrowthAutomationActionHandoff(c,a)},afterSuccess:({targetWorkspaceId:e,context:t})=>u(e,t)})},deliverAutomationActionHandoffFromUi(e={}){return C({slot:`automationActionHandoffs`,successStatus:`delivered`,async action({cardGeneration:n,context:i,targetWorkspaceId:a}){let o=r(e.dataset?.automationActionHandoffId),s=W(G(n,`automationActionHandoffs`,`handoffs`),o,[`handoffId`,`handoff_id`]);if(!s)throw Error(`automation_action_handoff_not_found`);let c=Oo({context:i,workspaceId:a,handoff:s});return t.deliverGrowthAutomationActionHandoff(o,c,a)},afterSuccess:({targetWorkspaceId:e,context:t})=>u(e,t)})},executeAutomationSchedulerOnceFromUi(e={}){return C({slot:`automationSchedulerExecutions`,successStatus:`executed`,async action({cardGeneration:n,context:i,targetWorkspaceId:a}){let o=r(e.dataset?.automationActionHandoffId),s=W(G(n,`automationActionHandoffs`,`handoffs`),o,[`handoffId`,`handoff_id`]);if(!s)throw Error(`automation_action_handoff_not_found`);let c=Ao({context:i,workspaceId:a,handoff:s});return t.executeGrowthAutomationSchedulerOnce(c,a)},afterSuccess:({targetWorkspaceId:e,context:t})=>u(e,t),afterFailure:({targetWorkspaceId:e,context:t})=>u(e,t)})},runAutomationSchedulerOnceFromUi(){return C({slot:`automationSchedulerRuns`,successStatus:`ran`,async action({context:e,targetWorkspaceId:n}){let r=Mo({context:e,workspaceId:n});return t.runGrowthAutomationSchedulerOnce(r,n)},afterSuccess:({targetWorkspaceId:e,context:t})=>u(e,t),afterFailure:({targetWorkspaceId:e,context:t})=>u(e,t)})},createAutomationSchedulerWorkerTargetFromUi(){return C({slot:`automationSchedulerWorkerTargets`,successStatus:`created`,async action({context:e,targetWorkspaceId:n}){let r=No({context:e,workspaceId:n});return t.createGrowthAutomationSchedulerWorkerTarget(r,n)},afterSuccess:({targetWorkspaceId:e,context:t})=>u(e,t),afterFailure:({targetWorkspaceId:e,context:t})=>u(e,t)})},reviewAutomationSchedulerWorkerTargetFromUi(e={}){return C({slot:`automationSchedulerWorkerTargets`,successStatus:`reviewed`,async action({cardGeneration:n,context:i,targetWorkspaceId:a}){let o=r(e.dataset?.automationSchedulerWorkerTargetId),s=r(e.dataset?.automationSchedulerWorkerTargetStatus),c=W(G(n,`automationSchedulerWorkerTargets`,`targets`),o,[`targetId`,`target_id`,`workerTargetId`,`worker_target_id`]);if(!c)throw Error(`automation_scheduler_worker_target_not_found`);let l=jo({context:i,workspaceId:a,target:c,status:s});return t.reviewGrowthAutomationSchedulerWorkerTarget(o,l,a)},afterSuccess:({targetWorkspaceId:e,context:t})=>u(e,t)})},reviewRecommendationLifecycleFromUi(e={}){return C({slot:`recommendationLifecycle`,successStatus:`reviewed`,async action({cardGeneration:n,context:i,targetWorkspaceId:a}){let o=r(e.dataset?.recommendationLifecycleStatus),s=Po({context:i,workspaceId:a,recommendation:Ko(n,e),status:o});return t.reviewGrowthRecommendationLifecycle(s,a)},afterSuccess:({targetWorkspaceId:e,context:t})=>d(e,t)})}};return w}var as=new Set([`build_release_package`,`create_automation_action_handoff`,`deliver_automation_action_handoff`,`execute_automation_scheduler_once`,`publish_automation_proposal`,`record_release_lifecycle_record`,`record_release_workbench_action`,`review_automation_digest`,`review_automation_failure_policy`,`review_automation_proposal`,`review_automation_scheduler_worker_target`,`review_recommendation_lifecycle`]);function J(e={}){return Object.fromEntries(Object.entries(e).filter(([,e])=>r(e)))}function os(e={}){let t=r(e.action);return t===`record_release_workbench_action`?J({releaseWorkbenchAction:e.actionKey||e.endpointKey||`record`,releaseWorkbenchActionKey:e.actionKey,releaseWorkbenchEndpointKey:e.endpointKey,releaseWorkbenchBlockedReason:e.blockedReason||e.reason}):t===`build_release_package`?J({releasePackageBuild:e.actionKey||e.endpointKey||`build`,releaseWorkbenchActionKey:e.actionKey,releaseWorkbenchEndpointKey:e.endpointKey}):t===`record_release_lifecycle_record`?J({releaseLifecycleRecord:e.recordKind}):t===`review_automation_proposal`||t===`publish_automation_proposal`?J({automationProposalId:e.proposalId,automationProposalStatus:e.status,automationProposalReview:t===`review_automation_proposal`?e.status:``,automationProposalPublish:t===`publish_automation_proposal`?e.proposalId||`publish`:``}):t===`review_automation_digest`?J({automationDigestId:e.digestId,automationDigestStatus:e.status,automationDigestReview:e.status}):t===`review_automation_failure_policy`?J({automationFailurePolicyId:e.policyId,automationFailurePolicyStatus:e.status,automationFailurePolicyReview:e.status}):t===`create_automation_action_handoff`?J({automationDigestId:e.digestId,automationActionHandoffCreate:e.digestId||`create`}):t===`deliver_automation_action_handoff`?J({automationActionHandoffId:e.handoffId,automationActionHandoffDeliver:e.handoffId||`deliver`}):t===`execute_automation_scheduler_once`?J({automationActionHandoffId:e.handoffId,automationSchedulerExecutionId:e.executionId,automationSchedulerExecutionExecute:e.executionId||e.handoffId||`execute`}):t===`review_automation_scheduler_worker_target`?J({automationSchedulerWorkerTargetId:e.targetId,automationSchedulerWorkerTargetStatus:e.status,automationSchedulerWorkerTargetReview:e.status}):t===`review_recommendation_lifecycle`?J({recommendationLifecycleReview:e.recommendationId||e.trajectoryId||e.sourceTaskCardId||e.sourceEvaluationId,recommendationLifecycleStatus:e.status,recommendationLifecycleTrajectoryId:e.trajectoryId||e.recommendationId,recommendationLifecycleSourceTaskCardId:e.sourceTaskCardId,recommendationLifecycleSourceEvaluationId:e.sourceEvaluationId}):{}}function ss(e={}){return as.has(r(e.action))}function cs(e={}){return{disabled:e.disabled===!0,dataset:os(e)}}function ls(e={}){return ss(e)?[cs(e)]:[e]}var us={load_card_generation_context:{handler:`loadCardGenerationContext`,failureTarget:`cardGeneration`},refresh_card_generation_context:{handler:`refreshCardGenerationContext`,failureTarget:`cardGeneration`},select_card_generation_recipe:{handler:`selectCardGenerationRecipe`,failureTarget:`targetProvisionDraft`},select_domain_pack:{handler:`selectCardGenerationDomainPack`,failureTarget:`targetProvisionDraft`},select_subject:{handler:`selectCardGenerationSubject`,failureTarget:`targetProvisionDraft`},apply_target_selection:{handler:`applyTargetSelection`,failureTarget:`targetProvisionDraft`},provision_target:{handler:`provisionTargetDomainPack`,failureTarget:`targetProvisionDraft`},advance_operating_loop:{handler:`advanceOperatingLoopFromUi`,failureTarget:`operatingLoop`},draft_daily_loop:{handler:`draftDailyLoopFromUi`,failureTarget:`cardGeneration`},publish_daily_loop:{handler:`publishDailyLoopFromUi`,failureTarget:`cardGeneration`},update_owner_correction_note:{handler:`updateOwnerCorrectionNote`,failureTarget:`ownerCorrection`},update_owner_correction_action:{handler:`updateOwnerCorrectionAction`,failureTarget:`ownerCorrection`},submit_owner_correction:{handler:`submitOwnerCorrectionFromUi`,failureTarget:`ownerCorrection`},update_owner_audit_review_note:{handler:`updateOwnerAuditReviewNote`,failureTarget:`ownerAuditReviews`},refresh_owner_audit_reviews:{handler:`refreshOwnerAuditReviews`,failureTarget:`ownerAuditReviews`},record_owner_audit_review:{handler:`recordOwnerAuditReviewFromUi`,failureTarget:`ownerAuditReviews`},refresh_cycle_drilldown:{handler:`refreshOwnerCycleDrilldownFromUi`,failureTarget:`cycleDrilldown`},refresh_cycle_history:{handler:`refreshCycleHistoryFromUi`,failureTarget:`cycleHistory`},select_cycle_history:{handler:`selectCycleHistoryItem`,failureTarget:`cycleHistory`},refresh_profile_feedback:{handler:`refreshProfileFeedback`,failureTarget:`profileFeedback`},refresh_reference_chain:{handler:`refreshReferenceChain`,failureTarget:`referenceChain`},refresh_operating_loop_runs:{handler:`refreshOperatingLoopRuns`,failureTarget:`operatingLoop`},record_release_workbench_action:{handler:`recordReleaseWorkbenchActionFromUi`,failureTarget:`releaseWorkbench`},build_release_package:{handler:`buildReleasePackageFromUi`,failureTarget:`releaseWorkbench`},refresh_release_artifact_template:{handler:`refreshReleaseArtifactTemplate`,failureTarget:`releaseArtifactTemplate`},refresh_release_workbench_action_audits:{handler:`refreshReleaseWorkbenchActionAudits`,failureTarget:`releaseWorkbenchActionAudits`},refresh_release_status_readbacks:{handler:`refreshReleaseStatusReadbacks`,failureTarget:`releaseStatusReadbacks`},refresh_release_evidence_ledger:{handler:`refreshReleaseEvidenceLedger`,failureTarget:`releaseEvidenceLedger`},refresh_release_lifecycle_records:{handler:`refreshReleaseLifecycleRecords`,failureTarget:`releaseLifecycleRecords`},record_release_lifecycle_record:{handler:`recordReleaseLifecycleRecordFromUi`,failureTarget:`releaseLifecycleRecords`},refresh_automation_closed_loop_action_plan:{handler:`refreshAutomationClosedLoopActionPlan`,failureTarget:`automationClosedLoopActionPlan`},run_automation_closed_loop_action_plan:{handler:`runAutomationClosedLoopActionPlanFromUi`,failureTarget:`automationClosedLoopActionPlan`},prepare_automation_cycle_closure:{handler:`prepareAutomationCycleClosureFromUi`,failureTarget:`automationCycleClosure`},advance_automation_review:{handler:`advanceAutomationReviewFromUi`,failureTarget:`automationReviewAdvancement`},refresh_automation_proposals:{handler:`refreshAutomationProposals`,failureTarget:`automationProposals`},create_automation_proposal:{handler:`createAutomationProposalFromUi`,failureTarget:`automationProposals`},review_automation_proposal:{handler:`reviewAutomationProposalFromUi`,failureTarget:`automationProposals`},publish_automation_proposal:{handler:`publishAutomationProposalFromUi`,failureTarget:`automationProposals`},refresh_automation_digests:{handler:`refreshAutomationDigests`,failureTarget:`automationDigests`},create_automation_digest:{handler:`createAutomationDigestFromUi`,failureTarget:`automationDigests`},review_automation_digest:{handler:`reviewAutomationDigestFromUi`,failureTarget:`automationDigests`},refresh_automation_failure_policies:{handler:`refreshAutomationFailurePolicies`,failureTarget:`automationFailurePolicies`},create_automation_failure_policy:{handler:`createAutomationFailurePolicyFromUi`,failureTarget:`automationFailurePolicies`},review_automation_failure_policy:{handler:`reviewAutomationFailurePolicyFromUi`,failureTarget:`automationFailurePolicies`},refresh_automation_action_handoffs:{handler:`refreshAutomationActionHandoffs`,failureTarget:`automationActionHandoffs`},create_automation_action_handoff:{handler:`createAutomationActionHandoffFromUi`,failureTarget:`automationActionHandoffs`},deliver_automation_action_handoff:{handler:`deliverAutomationActionHandoffFromUi`,failureTarget:`automationActionHandoffs`},refresh_automation_scheduler_executions:{handler:`refreshAutomationSchedulerExecutions`,failureTarget:`automationSchedulerExecutions`},execute_automation_scheduler_once:{handler:`executeAutomationSchedulerOnceFromUi`,failureTarget:`automationSchedulerExecutions`},refresh_automation_scheduler_runs:{handler:`refreshAutomationSchedulerRuns`,failureTarget:`automationSchedulerRuns`},run_automation_scheduler_once:{handler:`runAutomationSchedulerOnceFromUi`,failureTarget:`automationSchedulerRuns`},refresh_automation_scheduler_worker_targets:{handler:`refreshAutomationSchedulerWorkerTargets`,failureTarget:`automationSchedulerWorkerTargets`},create_automation_scheduler_worker_target:{handler:`createAutomationSchedulerWorkerTargetFromUi`,failureTarget:`automationSchedulerWorkerTargets`},review_automation_scheduler_worker_target:{handler:`reviewAutomationSchedulerWorkerTargetFromUi`,failureTarget:`automationSchedulerWorkerTargets`},review_recommendation_lifecycle:{handler:`reviewRecommendationLifecycleFromUi`,failureTarget:`recommendationLifecycle`},refresh_stage_checkpoint_controls:{handler:`refreshStageCheckpointControlsFromUi`,failureTarget:`stageAssessment`},activate_stage_assessment:{handler:`activateStageAssessmentFromUi`,failureTarget:`stageAssessment`}};function ds(e=``){return us[r(e)]||null}async function fs(e={},t={},n={}){let i=ds(r(e.action));if(!i){let t={status:`unhandled`,action:e,reason:`unknown_action`,failureTarget:`cardGeneration`};return typeof n.onUnhandled==`function`&&n.onUnhandled(t),t}let a=Object.assign({route:i},e);if(e.ignored){let t={status:`ignored`,action:a,reason:r(e.reason)||`ignored`,failureTarget:i.failureTarget};return typeof n.onIgnored==`function`&&n.onIgnored(t),t}if(e.blocked){let t={status:`blocked`,action:a,reason:r(e.blockedReason),failureTarget:i.failureTarget};return typeof n.onBlocked==`function`&&n.onBlocked(t),t}let o=t[i.handler];if(typeof o!=`function`){let e={status:`unhandled`,action:a,reason:`missing_handler`,handler:i.handler,failureTarget:i.failureTarget};return typeof n.onUnhandled==`function`&&n.onUnhandled(e),e}try{let e=await o(...(typeof n.handlerArgsForAction==`function`?n.handlerArgsForAction:ls)(a));return{status:`handled`,action:a,handler:i.handler,failureTarget:i.failureTarget,value:e}}catch(e){let t={status:`failed`,action:a,handler:i.handler,failureTarget:i.failureTarget,error:e?.message||String(e)};if(typeof n.onError==`function`&&n.onError(t,e),n.rethrow===!0)throw e;return t}}function ps(e={}){return(!e.cardGeneration||typeof e.cardGeneration!=`object`)&&(e.cardGeneration={}),e.cardGeneration}function ms(e={},t={}){let n=ps(e);if(t.action===`update_owner_correction_note`)return n.ownerCorrectionDraft=r(t.note),!0;if(t.action===`update_owner_correction_action`)return n.ownerCorrectionAction=r(t.reviewAction)||`confirm_profile_delta`,!0;if(t.action===`update_owner_audit_review_note`)return n.ownerAuditReviewDraft=r(t.note),!0;if(t.action===`select_domain_pack`){let e=r(t.domainPackId),i=n.targetProvisionDraft||{},a=xe(n.context||{},{domainPackId:e,recipeId:i.recipeId||i.recipe_id});return n.targetProvisionDraft=Object.assign({},i,{domainPackId:e,domain:r(a.pack?.domain||i.domain),subject:a.subject||r(i.subject),status:`idle`,error:``}),!0}return t.action===`select_subject`?(n.targetProvisionDraft=Object.assign({},n.targetProvisionDraft||{},{subject:r(t.subject),status:`idle`,error:``}),!0):!1}function hs(e={},t={}){let n=ps(e);if(t.action!==`select_card_generation_recipe`)return!1;let i=r(t.recipeId);return i?(n.targetProvisionDraft=Object.assign({},n.targetProvisionDraft||{},{domainPackId:``,domain:``,subject:``,recipeId:i,status:`loading`,error:``}),!0):!1}function gs(e={}){let t=e.cycleHistory||{};return Array.isArray(t.data?.cycles)?t.data.cycles:Array.isArray(t.cycles)?t.cycles:[]}function _s(e={},t=``){let n=ps(e),i=r(t),a=gs(n),o=a.findIndex((e,t)=>Ie(e,t)===i),s=o>=0?a[o]:null;return n.cycleHistory=Object.assign({},n.cycleHistory||{},{selectedCycleKey:s?i:``,selectedCycle:s,error:s?``:`未找到可选择的历史周期。`}),s||(n.cycleDrilldown=Object.assign({},n.cycleDrilldown||{},{status:`failed`,error:n.cycleHistory.error||`未找到可选择的历史周期。`})),s}var Y=`cardGeneration`,vs=new Set([`automationActionHandoffs`,`automationClosedLoopActionPlan`,`automationCycleClosure`,`automationDigests`,`automationFailurePolicies`,`automationProposals`,`automationReviewAdvancement`,`automationSchedulerExecutions`,`automationSchedulerRuns`,`automationSchedulerWorkerTargets`,`ownerAuditReviews`,`operatingLoop`,`recommendationLifecycle`,`releaseLifecycleRecords`,`releaseWorkbench`]),ys=new Set([`build_release_package`]),bs=new Set([`refresh_stage_checkpoint_controls`]),xs=Object.freeze([`refresh_cycle_drilldown`,`refresh_reference_chain`,`refresh_owner_audit_reviews`,`refresh_profile_feedback`,`refresh_automation_closed_loop_action_plan`]);function Ss(e={}){return r(e.error||e.reason||e.action?.blockedReason)||`action_failed`}function Cs(e={},t=``,n={}){let i=r(t);return!i||i===Y?(Object.assign(e,n),e):(e[i]=Object.assign({},e[i]||{},n),e[i])}function ws(e=``,t={}){let n=t.status===`blocked`?`blocked`:`failed`,i=Ss(t),a=r(e),o=r(t.action?.action);return a===Y?{status:n,error:i,progressStep:n===`failed`?`failed`:``,progressMessage:n===`failed`?`操作失败。`:``}:a===`releaseWorkbench`&&ys.has(o)?{packageStatus:n,packageError:i}:a===`stageAssessment`&&bs.has(o)?{controlsStatus:n,controlsError:i,status:n===`failed`?`failed`:`idle`,error:i}:vs.has(a)?{actionStatus:n,actionError:i}:{status:n,error:i}}function Ts(e={},t={}){let n=ps(e),i=r(t.failureTarget)||Y,a=ws(i,t);return i===Y&&t.status===`blocked`&&(a.status=n.context?`ready`:`idle`,a.progressStep=``,a.progressMessage=``),Cs(n,i,a),n.lastAction={status:t.status||`failed`,action:r(t.action?.action),target:i,handler:r(t.handler),reason:Ss(t)},{target:i,patch:a,state:e}}function Es(e={},t={}){return ms(e,t)}function Ds(e={},t={}){return hs(e,t)}function Os(e={},t=``){return _s(e,t)}function ks(e={}){return xs.map(t=>({feature:`card_generation`,action:t,preventDefault:!0,sourceAction:r(e.action)||`select_cycle_history`,cycleHistoryKey:r(e.cycleHistoryKey),options:{silent:!0}}))}async function As(e={},t={},n={}){return(await Promise.allSettled(ks(e).map(e=>fs(e,t,n)))).map(e=>e.status===`fulfilled`?e.value:{status:`failed`,error:e.reason?.message||String(e.reason||`cycle_history_cascade_failed`)})}function js(e={},t={}){let n=ps(e);return n.lastAction={status:`handled`,action:r(t.action?.action),target:r(t.failureTarget)||Y,handler:r(t.handler)},e}function Ms({state:e={},handlers:t={},render:n}={}){async function r(r={}){if(r.action===`select_cycle_history`){let i=Os(e,r.cycleHistoryKey);if(typeof n==`function`&&n(e),!i)return{status:`handled`,action:r,handler:`localCycleHistorySelection`,failureTarget:`cycleHistory`,value:{ok:!1,selectedCycle:null}};let a=await As(r,t,{onBlocked(t){Ts(e,t)},onUnhandled(t){Ts(e,t)},onError(t){Ts(e,t)}});return js(e,{status:`handled`,action:r,handler:`localCycleHistorySelection`,failureTarget:`cycleHistory`}),typeof n==`function`&&n(e),{status:`handled`,action:r,handler:`localCycleHistorySelection`,failureTarget:`cycleHistory`,value:{ok:!0,selectedCycle:i,cascade:a}}}if(Es(e,r))return typeof n==`function`&&n(e),{status:`handled`,action:r,handler:`localDraftState`,failureTarget:Y,value:{ok:!0,localOnly:!0}};Ds(e,r)&&typeof n==`function`&&n(e);let i=await fs(r,t,{onBlocked(t){Ts(e,t)},onUnhandled(t){Ts(e,t)},onError(t){Ts(e,t)}});return i.status===`handled`&&js(e,i),i.status!==`ignored`&&typeof n==`function`&&n(e),i}return{state:e,handleCardGenerationAction:r}}var Ns=`[data-card-generation-target].[data-card-generation-refresh].[data-card-generation-recipe].[data-card-generation-apply-target].[data-card-generation-provision-target].[data-card-generation-advance].[data-card-generation-draft].[data-card-generation-publish].[data-owner-audit-review-refresh].[data-owner-audit-review-decision].[data-card-generation-cycle-audit-refresh].[data-card-generation-cycle-history-refresh].[data-card-generation-cycle-history-select].[data-profile-feedback-refresh].[data-reference-chain-refresh].[data-automation-closed-loop-action-plan-refresh].[data-automation-closed-loop-action-run].[data-operating-loop-refresh].[data-operating-loop-run-next].[data-release-workbench-action].[data-release-package-build].[data-release-artifact-template-refresh].[data-release-workbench-action-audits-refresh].[data-release-status-readbacks-refresh].[data-release-evidence-ledger-refresh].[data-release-lifecycle-records-refresh].[data-release-lifecycle-record].[data-automation-cycle-closure-prepare].[data-automation-review-advancement-advance].[data-automation-proposal-refresh].[data-automation-proposal-create].[data-automation-proposal-review].[data-automation-proposal-publish].[data-automation-digest-refresh].[data-automation-digest-create].[data-automation-digest-review].[data-automation-failure-policy-refresh].[data-automation-failure-policy-create].[data-automation-failure-policy-review].[data-automation-action-handoff-refresh].[data-automation-action-handoff-create].[data-automation-action-handoff-deliver].[data-automation-scheduler-execution-refresh].[data-automation-scheduler-execution-execute].[data-automation-scheduler-run-refresh].[data-automation-scheduler-run-once].[data-automation-scheduler-worker-target-refresh].[data-automation-scheduler-worker-target-create].[data-automation-scheduler-worker-target-review].[data-recommendation-lifecycle-review].[data-stage-assessment-check].[data-stage-assessment-activate]`.split(`.`),Ps=[`[data-card-generation-domain-pack]`,`[data-card-generation-subject]`,`[data-card-generation-correction-note]`,`[data-owner-audit-review-note]`,`[data-card-generation-correction-action]`],Fs=[`[data-card-generation-correction-form]`];function X(e={},t=``){return Object.prototype.hasOwnProperty.call(e,t)}function Is(e={},t=[]){for(let n of t){let t=r(e[n]);if(t)return t}return``}function Z(e,t={}){return Object.assign({feature:`card_generation`,action:e,preventDefault:!0},t)}function Ls(e,t=`disabled`,n={}){return Z(e,Object.assign({ignored:!0,reason:t},n))}function Rs(e,t=``,n={}){return Z(e,Object.assign({blocked:!0,blockedReason:r(t)},n))}function Q(e,t,n={}){return t?Ls(e,`disabled`,n):Z(e,n)}function zs(e={}){return Is(e,[`releaseLifecycleRecord`,`releaseLifecycleRecordKind`,`releaseLifecycleKind`])}function Bs(e={},t={}){let n=t.disabled===!0,i=r(t.value);if(X(e,`cardGenerationTarget`))return Z(`load_card_generation_context`,{workspaceId:r(e.cardGenerationTarget)});if(X(e,`cardGenerationRefresh`))return Z(`refresh_card_generation_context`);if(X(e,`cardGenerationRecipe`))return Z(`select_card_generation_recipe`,{recipeId:r(e.cardGenerationRecipe)});if(X(e,`cardGenerationDomainPack`))return Z(`select_domain_pack`,{domainPackId:i||r(e.cardGenerationDomainPack)});if(X(e,`cardGenerationSubject`))return Z(`select_subject`,{subject:i||r(e.cardGenerationSubject)});if(X(e,`cardGenerationApplyTarget`))return Q(`apply_target_selection`,n);if(X(e,`cardGenerationProvisionTarget`))return Q(`provision_target`,n);if(X(e,`cardGenerationAdvance`)||X(e,`cardGenerationDraft`)||X(e,`cardGenerationPublish`)){let t=X(e,`cardGenerationAdvance`)?`advance_operating_loop`:X(e,`cardGenerationPublish`)?`publish_daily_loop`:`draft_daily_loop`,i=r(e.cardGenerationBlockedReason);return i?Rs(t,i):Q(t,n)}if(X(e,`cardGenerationCorrectionNote`))return Z(`update_owner_correction_note`,{note:i});if(X(e,`cardGenerationCorrectionAction`))return Z(`update_owner_correction_action`,{reviewAction:i||r(e.cardGenerationCorrectionAction)});if(X(e,`cardGenerationCorrectionForm`))return Z(`submit_owner_correction`);if(X(e,`ownerAuditReviewNote`))return Z(`update_owner_audit_review_note`,{note:i});if(X(e,`ownerAuditReviewRefresh`))return Q(`refresh_owner_audit_reviews`,n);if(X(e,`ownerAuditReviewDecision`)){let t=`record_owner_audit_review`,i=r(e.ownerAuditReviewBlockedReason);return i?Rs(t,i,{decision:r(e.ownerAuditReviewDecision)}):Q(t,n,{decision:r(e.ownerAuditReviewDecision)})}if(X(e,`cardGenerationCycleAuditRefresh`)){let t=`refresh_cycle_drilldown`,i=r(e.cardGenerationBlockedReason);return i?Rs(t,i):Q(t,n)}if(X(e,`cardGenerationCycleHistoryRefresh`))return Q(`refresh_cycle_history`,n);if(X(e,`cardGenerationCycleHistorySelect`))return Z(`select_cycle_history`,{cycleHistoryKey:r(e.cycleHistoryKey||e.cardGenerationCycleHistorySelect)});if(X(e,`profileFeedbackRefresh`))return Q(`refresh_profile_feedback`,n);if(X(e,`referenceChainRefresh`))return Q(`refresh_reference_chain`,n);if(X(e,`operatingLoopRefresh`))return Q(`refresh_operating_loop_runs`,n);if(X(e,`operatingLoopRunNext`)){let t=`advance_operating_loop`,i=r(e.operatingLoopBlockedReason);return i?Rs(t,i):Q(t,n)}if(X(e,`releaseWorkbenchAction`)){let t=r(e.releaseWorkbenchBlockedReason),i={actionKey:r(e.releaseWorkbenchActionKey),endpointKey:r(e.releaseWorkbenchEndpointKey)};return n&&!t?Ls(`record_release_workbench_action`):t?Rs(`record_release_workbench_action`,t,i):Z(`record_release_workbench_action`,i)}if(X(e,`releasePackageBuild`))return Q(`build_release_package`,n,{actionKey:r(e.releaseWorkbenchActionKey),endpointKey:r(e.releaseWorkbenchEndpointKey)});if(X(e,`releaseArtifactTemplateRefresh`))return Q(`refresh_release_artifact_template`,n);if(X(e,`releaseWorkbenchActionAuditsRefresh`))return Q(`refresh_release_workbench_action_audits`,n);if(X(e,`releaseStatusReadbacksRefresh`))return Q(`refresh_release_status_readbacks`,n);if(X(e,`releaseEvidenceLedgerRefresh`))return Q(`refresh_release_evidence_ledger`,n);if(X(e,`releaseLifecycleRecordsRefresh`))return Q(`refresh_release_lifecycle_records`,n);if(X(e,`releaseLifecycleRecord`))return Q(`record_release_lifecycle_record`,n,{recordKind:zs(e)});if(X(e,`automationClosedLoopActionPlanRefresh`))return Q(`refresh_automation_closed_loop_action_plan`,n);if(X(e,`automationClosedLoopActionRun`))return Q(`run_automation_closed_loop_action_plan`,n,{phaseIndex:r(e.automationClosedLoopPhaseIndex)});if(X(e,`automationCycleClosurePrepare`))return Q(`prepare_automation_cycle_closure`,n);if(X(e,`automationReviewAdvancementAdvance`))return Q(`advance_automation_review`,n);if(X(e,`automationProposalRefresh`))return Q(`refresh_automation_proposals`,n);if(X(e,`automationProposalCreate`)||X(e,`automationProposalReview`)||X(e,`automationProposalPublish`)){let t=X(e,`automationProposalCreate`)?`create_automation_proposal`:X(e,`automationProposalPublish`)?`publish_automation_proposal`:`review_automation_proposal`,i=r(e.automationProposalBlockedReason),a={proposalId:r(e.automationProposalId),status:r(e.automationProposalReview)};return i?Rs(t,i,a):Q(t,n,a)}return X(e,`automationDigestRefresh`)?Q(`refresh_automation_digests`,n):X(e,`automationDigestCreate`)?Q(`create_automation_digest`,n):X(e,`automationDigestReview`)?Q(`review_automation_digest`,n,{digestId:r(e.automationDigestId),status:r(e.automationDigestReview)}):X(e,`automationFailurePolicyRefresh`)?Q(`refresh_automation_failure_policies`,n):X(e,`automationFailurePolicyCreate`)?Q(`create_automation_failure_policy`,n):X(e,`automationFailurePolicyReview`)?Q(`review_automation_failure_policy`,n,{policyId:r(e.automationFailurePolicyId),status:r(e.automationFailurePolicyReview)}):X(e,`automationActionHandoffRefresh`)?Q(`refresh_automation_action_handoffs`,n):X(e,`automationActionHandoffCreate`)?Q(`create_automation_action_handoff`,n,{digestId:r(e.automationDigestId)}):X(e,`automationActionHandoffDeliver`)?Q(`deliver_automation_action_handoff`,n,{handoffId:r(e.automationActionHandoffId)}):X(e,`automationSchedulerExecutionRefresh`)?Q(`refresh_automation_scheduler_executions`,n):X(e,`automationSchedulerExecutionExecute`)?Q(`execute_automation_scheduler_once`,n,{handoffId:r(e.automationActionHandoffId),executionId:r(e.automationSchedulerExecutionId)}):X(e,`automationSchedulerRunRefresh`)?Q(`refresh_automation_scheduler_runs`,n):X(e,`automationSchedulerRunOnce`)?Q(`run_automation_scheduler_once`,n):X(e,`automationSchedulerWorkerTargetRefresh`)?Q(`refresh_automation_scheduler_worker_targets`,n):X(e,`automationSchedulerWorkerTargetCreate`)?Q(`create_automation_scheduler_worker_target`,n):X(e,`automationSchedulerWorkerTargetReview`)?Q(`review_automation_scheduler_worker_target`,n,{targetId:r(e.automationSchedulerWorkerTargetId),status:r(e.automationSchedulerWorkerTargetReview)}):X(e,`recommendationLifecycleReview`)?Q(`review_recommendation_lifecycle`,n,{recommendationId:r(e.recommendationLifecycleReview),status:r(e.recommendationLifecycleStatus)}):X(e,`stageAssessmentCheck`)?Q(`refresh_stage_checkpoint_controls`,n):X(e,`stageAssessmentActivate`)?Q(`activate_stage_assessment`,n):null}function Vs(e=``){return e===`click`?Ns.join(`, `):e===`change`||e===`input`?Ps.join(`, `):e===`submit`?Fs.join(`, `):``}function Hs(e={},t=``){if(!t)return null;let n=e.target||null;return n?typeof n.closest==`function`?n.closest(t):typeof n.matches==`function`&&n.matches(t)?n:null:null}function Us(e={}){let t=Hs(e,Vs(e.type));return!t||!t.dataset?null:Bs(t.dataset,{disabled:t.disabled===!0,value:`value`in t?t.value:``})}function Ws({root:e=null,dispatch:t}={}){if(!e||typeof e.addEventListener!=`function`||typeof t!=`function`)return()=>{};let n=[`click`,`change`,`input`,`submit`].map(n=>{let r=e=>{let n=Us(e);n&&(n.preventDefault&&typeof e.preventDefault==`function`&&e.preventDefault(),t(n,e))};return e.addEventListener(n,r),[n,r]});return()=>{typeof e.removeEventListener==`function`&&n.forEach(([t,n])=>{e.removeEventListener(t,n)})}}var Gs=[`audio/webm;codecs=opus`,`audio/webm`,`audio/mp4`,`audio/ogg;codecs=opus`,`audio/ogg`];function Ks(e={},t=``){let n=e.MediaRecorder;if(!n||typeof n.isTypeSupported!=`function`)return!1;try{return n.isTypeSupported(t)}catch{return!1}}function qs(e={},t=``){if(!e.document||typeof e.document.createElement!=`function`)return``;try{let n=e.document.createElement(`audio`);return!n||typeof n.canPlayType!=`function`?``:r(n.canPlayType(t))}catch{return``}}function Js(e={},t=``){let n=qs(e,t);return n===`probably`||n===`maybe`}function Ys(e={}){let t=e.MediaRecorder;if(!t||typeof t.isTypeSupported!=`function`)return``;let n=Gs.filter(t=>Ks(e,t));return n.find(t=>Js(e,t))||n[0]||``}function Xs(e={},t=``){return qs(e,t)===`unsupported`?`录音已保存，但当前浏览器不能直接回放此音频格式。请重新录音；如果仍失败，可以先提交文字作答。`:``}function Zs(e=``){let t=r(e).toLowerCase();return t.includes(`mp4`)?`m4a`:t.includes(`ogg`)?`ogg`:`webm`}function Qs(e=``,t=`submission`){return I(e,t||`submission`)}function $s(e={}){try{e.stream&&typeof e.stream.getTracks==`function`&&e.stream.getTracks().forEach(e=>e.stop())}catch{}}function ec(e={},t={}){let n=e.URL||globalThis.URL;if(t.url&&n&&typeof n.revokeObjectURL==`function`)try{n.revokeObjectURL(t.url)}catch{}}function tc(e=`submission`,t=``,n=()=>Date.now()){return`growth-${r(e)||`audio`}-${n()}.${Zs(t)}`}function nc({root:e=globalThis,state:t={},render:n,now:i=()=>Date.now(),readBlobAsBase64:a}={}){t.learningGrowthRecordings=t.learningGrowthRecordings||{};function o(){typeof n==`function`&&n(t)}function s(n=``,r=`submission`){let i=Qs(n,r),a=t.learningGrowthRecordings[i];if(a){if(a.timerId&&typeof e.clearInterval==`function`&&e.clearInterval(a.timerId),a.recorder&&a.status===`recording`&&typeof a.recorder.stop==`function`)try{a.recorder.stop()}catch{}$s(a),ec(e,a),delete t.learningGrowthRecordings[i]}}function c(){Object.keys(t.learningGrowthRecordings||{}).forEach(e=>{let t=e.lastIndexOf(`:`);s(e.slice(0,t),e.slice(t+1))})}async function l(n=``,a=`submission`){let c=r(n),l=r(a)||`submission`,u=Qs(c,l),d=e.MediaRecorder;if(!d||!e.navigator?.mediaDevices||typeof e.navigator.mediaDevices.getUserMedia!=`function`){t.learningGrowthRecordings[u]={status:`unsupported`,message:`当前浏览器不支持录音`},o();return}s(c,l),t.learningGrowthRecordings[u]={status:`requesting`,message:`正在请求麦克风`},o();try{let n=await e.navigator.mediaDevices.getUserMedia({audio:!0}),r=Ys(e),a=new d(n,r?{mimeType:r}:void 0),s=[],c=i(),f={status:`recording`,message:`录音中`,recorder:a,stream:n,chunks:s,mimeType:a.mimeType||r||`audio/webm`,startedAt:c,elapsedMs:0};t.learningGrowthRecordings[u]=f,a.addEventListener(`dataavailable`,(e={})=>{e.data&&e.data.size>0&&s.push(e.data)}),a.addEventListener(`stop`,()=>{f.timerId&&typeof e.clearInterval==`function`&&e.clearInterval(f.timerId),$s(f);let t=Math.max(0,i()-c),n=new(e.Blob||globalThis.Blob)(s,{type:f.mimeType}),r=n.size>0?Xs(e,f.mimeType||n.type):``;ec(e,f);let a=e.URL||globalThis.URL;Object.assign(f,{status:n.size>0?`ready`:`error`,message:n.size>0?r||`录音已准备`:`录音为空，请重新录`,blob:n.size>0?n:null,url:n.size>0&&a&&typeof a.createObjectURL==`function`?a.createObjectURL(n):``,playbackError:!!r,durationMs:t,elapsedMs:t,name:tc(l,f.mimeType,i),recorder:null,stream:null,timerId:0}),o()}),f.timerId=typeof e.setInterval==`function`?e.setInterval(()=>{f.elapsedMs=Math.max(0,i()-c),o()},1e3):0,a.start(),o()}catch(e){t.learningGrowthRecordings[u]={status:`error`,message:e?.message||`录音启动失败`},o()}}function u(e=``,n=`submission`){let r=Qs(e,n),i=t.learningGrowthRecordings[r];if(!(!i||i.status!==`recording`||!i.recorder)){i.status=`stopping`,i.message=`正在保存录音`;try{i.recorder.stop()}catch(e){i.status=`error`,i.message=e?.message||`录音停止失败`,$s(i)}o()}}function d(e=``,n=`submission`){let r=Qs(e,n),i=t.learningGrowthRecordings[r];!i||i.status!==`ready`||i.playbackError||(i.playbackError=!0,i.message=`录音已保存，但当前浏览器无法回放。请重新录音；如果再次失败，可以先提交文字作答。`,o())}function f(e=``,n=`submission`){let r=Qs(e,n);if(t.learningGrowthRecordings[r]?.status===`recording`){u(e,n);return}l(e,n).catch(e=>{t.learningGrowthRecordings[r]={status:`error`,message:e?.message||String(e)},o()})}async function p(e={},t=`submission`){if(!e.blob)return null;if(typeof a!=`function`)throw Error(`audio_blob_reader_unavailable`);return{dataBase64:await a(e.blob),name:e.name||tc(t,e.mimeType,i),mime:e.mimeType||e.blob.type||`audio/webm`,durationMs:Number(e.durationMs||e.elapsedMs||0)||0}}return{audioPayloadFromRecording:p,clearAllRecordings:c,clearRecording:s,handleRecordingPlaybackError:d,startRecording:l,stopRecording:u,toggleRecording:f}}function rc(e){return Array.isArray(e)?e:[]}function ic(e={}){return r(e.taskCardId||e.id)}function ac(e={},t=``){let n=r(t);if(!n)return null;let i=e.overview||{},a=i.programs||{};return[].concat(rc(a.taskCards),rc(a.executableTasks),rc(i.board?.cards)).find((e={})=>ic(e)===n)||null}function oc({taskCardId:e=``,explicitWorkspaceId:t=``,model:n={},state:i={},getCurrentWorkspaceId:a=()=>``}={}){let o=ac(n,e);return r(t)||r(o?.workspaceId)||r(i.cardGeneration?.selectedWorkspaceId)||r(i.cardGeneration?.context?.target?.workspaceId)||r(a())}function sc(e={},t=``,n=``,i=``){let a=I(t,n);return!a||a===`:`?e:(e.learningGrowthInteractionMessages=e.learningGrowthInteractionMessages||{},e.learningGrowthInteractionMessages[a]=r(i),e)}function cc(e={},t=``,n=!1){let i=r(t);return e.learningGrowthSubmissionBusy=e.learningGrowthSubmissionBusy||{},e.learningGrowthTeachingCheckBusy=e.learningGrowthTeachingCheckBusy||{},e.learningGrowthSubmissionBusy[i]=!!n,e.learningGrowthTeachingCheckBusy[i]=!!n,e}function lc(e={},t=``,n=!1){let i=r(t);return e.learningGrowthReflectionBusy=e.learningGrowthReflectionBusy||{},e.learningGrowthReflectionBusy[i]=!!n,e}function uc(e={},t=``,n=!1){let i=r(t);return e.learningGrowthEvaluationBusy=e.learningGrowthEvaluationBusy||{},e.learningGrowthEvaluationBusy[i]=!!n,e}function dc({text:e=``,audio:t=null}={}){let n=r(e);if(!n&&!t)return{ok:!1,error:`submission_content_required`,payload:null};let i={text:n,author:`learner`,stage:`final`,source:`growth-plugin-card-ui`};return t&&(i.audio=t),{ok:!0,error:``,payload:i}}function fc({text:e=``,audio:t=null}={}){let n=r(e);if(!n&&!t)return{ok:!1,error:`reflection_content_required`,payload:null};let i={text:n,author:`learner`,source:`growth-plugin-card-ui`};return t&&(i.audio=t),{ok:!0,error:``,payload:i}}function pc(e={}){let t=Array.isArray(e.targetNodeIds)?e.targetNodeIds.map(r).filter(Boolean):r(e.targetNodeIds).split(/\s+/).map(r).filter(Boolean);return{taskCardId:r(e.taskCardId),signalType:r(e.signalType),workspaceId:r(e.workspaceId),targetNodeIds:t}}function mc(e={}){let t=pc(e);return!t.taskCardId||!t.signalType?{ok:!1,error:`experience_signal_target_required`,payload:null,normalized:t}:{ok:!0,error:``,normalized:t,payload:{signalType:t.signalType,targetNodeIds:t.targetNodeIds,source:`growth-plugin-card-ui`}}}function hc({result:e={},taskCardId:t=``,workspaceId:n=``,model:i={},viewModel:a={},resolveWorkspaceId:o}={}){if(!e.card||!i.detailCache||typeof i.detailCache.set!=`function`)return null;let s=typeof a.normalizeCard==`function`?a.normalizeCard(Object.assign({},e.card,{workspaceId:e.card.workspaceId||e.card.workspace_id||n})):Object.assign({},e.card,{workspaceId:e.card.workspaceId||e.card.workspace_id||n}),c=r(s.taskCardId||s.id||t),l=`${r(typeof o==`function`?o(t,n):n)}:${c}`;return i.detailCache.set(l,s),{cacheKey:l,card:s}}function gc(e={},t=``){return e.CSS&&typeof e.CSS.escape==`function`?e.CSS.escape(String(t||``)):String(t||``).replace(/["\\]/g,`\\$&`)}function _c(e=globalThis){return function(t){return new Promise((n,r)=>{let i=e.FileReader||globalThis.FileReader;if(!i){r(Error(`audio_blob_reader_unavailable`));return}let a=new i;a.onerror=()=>r(a.error||Error(`audio_read_failed`)),a.onload=()=>{let e=String(a.result||``);n(e.includes(`,`)?e.slice(e.indexOf(`,`)+1):e)},a.readAsDataURL(t)})}}function vc(e=``,t={},n={},i={}){let a=r(e),o=n.learningGrowthTeachingDrafts?.[a]||n.learningGrowthSubmissionDrafts?.[a]||{},s=gc(i,a),c=t.querySelector?.(`[data-learning-growth-teaching-draft="${s}"][data-field="submissionText"]`),l=t.querySelector?.(`[data-learning-growth-teaching-draft="${s}"][data-field="quickCheckText"]`);return r(c?.value||o.submissionText||l?.value||o.quickCheckText)}function yc(e=``,t={},n={},i={}){let a=r(e),o=gc(i,a),s=t.querySelector?.(`[data-learning-growth-reflection-text="${o}"]`);return r(s?.value||n.learningGrowthReflectionDrafts?.[a]?.text)}function bc({root:e=globalThis,state:t={},model:n={},viewModel:i={},api:a={},render:o,refreshCard:s,getCurrentWorkspaceId:c=()=>``,audioController:l=null,readBlobAsBase64:u}={}){t.learningGrowthInteractionMessages=t.learningGrowthInteractionMessages||{},t.learningGrowthRecordings=t.learningGrowthRecordings||{},t.learningGrowthTeachingDrafts=t.learningGrowthTeachingDrafts||{},t.learningGrowthReflectionDrafts=t.learningGrowthReflectionDrafts||{};function d(){typeof o==`function`&&o(t)}function f(e=``,r=``){return oc({taskCardId:e,explicitWorkspaceId:r,model:n,state:t,getCurrentWorkspaceId:c})}function p(e=``,n=``,r=``){sc(t,e,n,r)}let m=l||nc({root:e,state:t,render:o,readBlobAsBase64:u||_c(e)});function h(e={},t=``,r=``){return hc({result:e,taskCardId:t,workspaceId:r,model:n,viewModel:i,resolveWorkspaceId:f})}async function g(e=``,t=``){typeof s==`function`&&await s(e,t)}async function _(e=``,n=``){let i=r(e);if(!i)return null;let o=f(i,n);uc(t,i,!0),p(i,`evaluation`,`正在请求一次批改处理。`),d();try{await a.processGrowthEvaluations?.(o,3),p(i,`evaluation`,`批改状态已刷新。`)}catch(e){p(i,`evaluation`,`批改暂未完成：${e?.message||String(e)}`)}finally{uc(t,i,!1)}return await g(i,o),{taskCardId:i,workspaceId:o}}async function v(e=``,n=``){let i=r(e);if(!i)return null;let o=f(i,n);uc(t,i,!0),p(i,`evaluation`,`正在重新加入批改队列。`),d();try{await a.retryGrowthEvaluation?.({task_card_id:i,reason:`owner_retry_from_growth_ui`},o),p(i,`evaluation`,`已重新加入批改队列，正在刷新批改状态。`)}catch(e){return p(i,`evaluation`,`重新批改失败：${e?.message||String(e)}`),null}finally{uc(t,i,!1),d()}return _(i,o)}async function y(n={}){let i=r(n.dataset?.learningGrowthSubmissionForm||n.dataset?.learningGrowthTeachingCheckForm);if(!i)return null;let o=f(i,n.dataset?.workspaceId),s=t.learningGrowthRecordings?.[I(i,`submission`)]||{},c=await m.audioPayloadFromRecording(s,`submission`),l=dc({text:vc(i,n,t,e),audio:c});if(!l.ok)return p(i,`submission`,`请先写一点作答，或录一段作答音频。`),d(),null;cc(t,i,!0),p(i,`submission`,`正在提交作答。`),d();try{let e=await a.submitGrowthCardEvidence?.(i,l.payload,o);return h(e||{},i,o),p(i,`submission`,`作答已提交，正在刷新批改。`),await _(i,o),m.clearRecording(i,`submission`),e||null}catch(e){return p(i,`submission`,e?.message||String(e)),d(),null}finally{cc(t,i,!1),d()}}async function b(n={}){let i=r(n.dataset?.learningGrowthReflectionForm);if(!i)return null;let o=f(i,n.dataset?.workspaceId),s=t.learningGrowthRecordings?.[I(i,`reflection`)]||{},c=await m.audioPayloadFromRecording(s,`reflection`),l=fc({text:yc(i,n,t,e),audio:c});if(!l.ok)return p(i,`reflection`,`请先写一句反思，或录一段反思音频。`),d(),null;lc(t,i,!0),p(i,`reflection`,`正在提交反思。`),d();try{let e=await a.submitGrowthCardReflection?.(i,l.payload,o);return h(e||{},i,o),m.clearRecording(i,`reflection`),delete t.learningGrowthReflectionDrafts[i],p(i,`reflection`,`反思已提交。`),await g(i,o),e||null}catch(e){return p(i,`reflection`,e?.message||String(e)),d(),null}finally{lc(t,i,!1),d()}}async function x(e={}){let n=mc(e),r=n.normalized||{};if(!n.ok)return null;let i=r.taskCardId,o=f(i,r.workspaceId);t.learningGrowthExperienceSignalBusy=t.learningGrowthExperienceSignalBusy||{},t.learningGrowthExperienceSignalSubmitted=t.learningGrowthExperienceSignalSubmitted||{},t.learningGrowthExperienceSignalBusy[i]=r.signalType,p(i,`experience`,`正在记录难度感受。`),d();try{let e=await a.submitGrowthExperienceSignal?.(i,n.payload,o);return t.learningGrowthExperienceSignalSubmitted[i]=r.signalType,p(i,`experience`,`难度感受已记录。`),await g(i,o),e||null}catch(e){return p(i,`experience`,e?.message||String(e)),d(),null}finally{t.learningGrowthExperienceSignalBusy[i]=``,d()}}return Object.assign({},m,{mergeCardFromWriteResult:h,refreshEvaluation:_,retryEvaluation:v,setMessage:p,submitEvidence:y,submitExperienceSignal:x,submitReflection:b,workspaceIdForTaskCard:f})}var xc=[`[data-learning-growth-teaching-draft]`,`[data-learning-growth-reflection-text]`],Sc=[`[data-learning-growth-record-toggle]`,`[data-learning-growth-record-clear]`,`[data-learning-growth-evaluation-refresh]`,`[data-learning-growth-evaluation-retry]`,`[data-learning-growth-experience-signal]`],Cc=[`[data-learning-growth-submission-form]`,`[data-learning-growth-reflection-form]`],wc=[`[data-learning-growth-record-playback]`,`[data-learning-growth-saved-audio]`];function Tc(e=``){return e===`click`?Sc.join(`, `):e===`input`?xc.join(`, `):e===`submit`?Cc.join(`, `):e===`error`?wc.join(`, `):``}function Ec(e={},t=``){if(!t)return null;let n=e.target||null;return n?typeof n.closest==`function`?n.closest(t):typeof n.matches==`function`&&n.matches(t)?n:null:null}function Dc(e={}){let t=Ec(e,Tc(e.type));if(!t||!t.dataset)return null;let n=t.dataset,i=`value`in t?t.value:``;return e.type===`input`&&n.learningGrowthTeachingDraft?{type:`teachingDraftInput`,taskCardId:r(n.learningGrowthTeachingDraft),field:r(n.field),value:i,preventDefault:!1}:e.type===`input`&&n.learningGrowthReflectionText?{type:`reflectionDraftInput`,taskCardId:r(n.learningGrowthReflectionText),value:i,preventDefault:!1}:e.type===`click`&&n.learningGrowthRecordToggle?{type:`recordToggle`,taskCardId:r(n.learningGrowthRecordToggle),kind:r(n.recordKind)||`submission`,preventDefault:!0}:e.type===`click`&&n.learningGrowthRecordClear?{type:`recordClear`,taskCardId:r(n.learningGrowthRecordClear),kind:r(n.recordKind)||`submission`,preventDefault:!0}:e.type===`click`&&n.learningGrowthEvaluationRefresh?{type:`evaluationRefresh`,taskCardId:r(n.learningGrowthEvaluationRefresh),preventDefault:!0}:e.type===`click`&&n.learningGrowthEvaluationRetry?{type:`evaluationRetry`,taskCardId:r(n.learningGrowthEvaluationRetry),workspaceId:r(n.workspaceId),preventDefault:!0}:e.type===`click`&&n.learningGrowthExperienceSignal?{type:`experienceSignal`,taskCardId:r(n.learningGrowthExperienceSignal),signalType:r(n.signalType),workspaceId:r(n.workspaceId),targetNodeIds:r(n.targetNodeIds).split(/\s+/).filter(Boolean),preventDefault:!0}:e.type===`submit`&&n.learningGrowthSubmissionForm?{type:`submitEvidence`,taskCardId:r(n.learningGrowthSubmissionForm),element:t,preventDefault:!0}:e.type===`submit`&&n.learningGrowthReflectionForm?{type:`submitReflection`,taskCardId:r(n.learningGrowthReflectionForm),element:t,preventDefault:!0}:e.type===`error`&&n.learningGrowthRecordPlayback?{type:`recordPlaybackError`,taskCardId:r(n.learningGrowthRecordPlayback),kind:r(n.recordKind)||`submission`,preventDefault:!1}:e.type===`error`&&n.learningGrowthSavedAudio?{type:`savedAudioPlaybackError`,element:t,preventDefault:!1}:null}function $(e,t){typeof e==`function`&&e(t)}function Oc(e={},t=``,n=``,r=null){typeof e.setMessage==`function`&&e.setMessage(t,n,r?.message||String(r||``))}async function kc(e={},{state:t={},controller:n={},render:r}={}){if(!e||!e.type)return null;if(e.type===`teachingDraftInput`)return!e.taskCardId||!e.field?null:(t.learningGrowthTeachingDrafts=t.learningGrowthTeachingDrafts||{},t.learningGrowthTeachingDrafts[e.taskCardId]=Object.assign({},t.learningGrowthTeachingDrafts[e.taskCardId]||{},{[e.field]:e.value}),e);if(e.type===`reflectionDraftInput`)return e.taskCardId?(t.learningGrowthReflectionDrafts=t.learningGrowthReflectionDrafts||{},t.learningGrowthReflectionDrafts[e.taskCardId]=Object.assign({},t.learningGrowthReflectionDrafts[e.taskCardId]||{},{text:e.value}),e):null;if(e.type===`recordToggle`)return n.toggleRecording?.(e.taskCardId,e.kind),e;if(e.type===`recordClear`)return n.clearRecording?.(e.taskCardId,e.kind),$(r,t),e;if(e.type===`recordPlaybackError`)return n.handleRecordingPlaybackError?.(e.taskCardId,e.kind),e;if(e.type===`savedAudioPlaybackError`){let t=(e.element?.closest?.(`[data-learning-growth-audio-evidence]`))?.querySelector?.(`[data-learning-growth-audio-error]`);return t&&(t.hidden=!1),e}if(e.type===`submitEvidence`){try{await n.submitEvidence?.(e.element)}catch(i){Oc(n,e.taskCardId,`submission`,i),$(r,t)}return e}if(e.type===`evaluationRefresh`){try{await n.refreshEvaluation?.(e.taskCardId)}catch(i){Oc(n,e.taskCardId,`evaluation`,i),$(r,t)}return e}if(e.type===`evaluationRetry`){try{await n.retryEvaluation?.(e.taskCardId,e.workspaceId)}catch(i){Oc(n,e.taskCardId,`evaluation`,i),$(r,t)}return e}if(e.type===`submitReflection`){try{await n.submitReflection?.(e.element)}catch(i){Oc(n,e.taskCardId,`reflection`,i),$(r,t)}return e}if(e.type===`experienceSignal`){try{await n.submitExperienceSignal?.({taskCardId:e.taskCardId,signalType:e.signalType,workspaceId:e.workspaceId,targetNodeIds:e.targetNodeIds})}catch(i){Oc(n,e.taskCardId,`experience`,i),$(r,t)}return e}return null}function Ac({root:e=null,state:t={},controller:n={},render:r,dispatch:i}={}){if(!e||typeof e.addEventListener!=`function`)return()=>{};let a=[`input`,`click`,`submit`,`error`].map(a=>{let o=e=>{let a=Dc(e);if(!a)return;a.preventDefault&&typeof e.preventDefault==`function`&&e.preventDefault();let o=typeof i==`function`?i(a,e):kc(a,{state:t,controller:n,render:r});return o&&typeof o.catch==`function`?o.catch(e=>{Oc(n,a.taskCardId,`interaction`,e),$(r,t)}):o};return e.addEventListener(a,o,a===`error`?!0:void 0),[a,o]});return()=>{typeof e.removeEventListener==`function`&&a.forEach(([t,n])=>{e.removeEventListener(t,n,t===`error`?!0:void 0)})}}var jc=`growth`,Mc=`__hermesGrowthNavigation`,Nc=`growth.plugin.navigation`,Pc=`growth.plugin.back_result`;function Fc(e={}){return{selectedLearningTaskCardId:r(e.selectedLearningTaskCardId),learningGrowthHistoryTaskCardId:r(e.learningGrowthHistoryTaskCardId),learningGrowthSettingsTaskId:r(e.learningGrowthSettingsTaskId),learningGrowthSettingsOpen:!!e.learningGrowthSettingsOpen,learningGrowthActiveTab:r(e.learningGrowthActiveTab)||`overview`,learningGrowthBoardLane:r(e.learningGrowthBoardLane)}}function Ic(e={}){return r(e.selectedLearningTaskCardId)?{name:`card-detail`,depth:1,cardId:r(e.selectedLearningTaskCardId)}:r(e.learningGrowthHistoryTaskCardId)?{name:`card-history`,depth:1,cardId:r(e.learningGrowthHistoryTaskCardId)}:e.learningGrowthSettingsOpen?{name:`owner-settings`,depth:1,tab:r(e.learningGrowthActiveTab)||`overview`}:{name:`root`,depth:0,tab:r(e.learningGrowthActiveTab)||`overview`}}function Lc({pageState:e={},renderShell:t,historyRef:n=globalThis.history,locationRef:i=globalThis.location,parentRef:a=globalThis.parent,windowRef:o=globalThis}={}){function s(){return Fc(e)}function c(e=s()){return Ic(e)}function l(e=s()){return c(e).depth>0}function u(e=``){return{[Mc]:!0,pluginId:jc,reason:r(e),routeState:s()}}function d(e=``){if(!n||typeof n.replaceState!=`function`)return!1;try{return n.replaceState(u(e),``,i?.href||``),!0}catch{return!1}}function f(e=``){if(!n||typeof n.pushState!=`function`)return!1;try{return n.pushState(u(e),``,i?.href||``),!0}catch{return!1}}function p(e){let t=a&&a!==o?a:null;if(!t||typeof t.postMessage!=`function`)return!1;try{return t.postMessage(e,`*`),!0}catch{return!1}}function m(e=``){let t=c(s());return p({type:Nc,version:1,pluginId:jc,canGoBack:t.depth>0,route:t,reason:r(e)})}function h(e,t=``){let n=c(s());return p({type:Pc,version:1,pluginId:jc,handled:!!e,canGoBack:n.depth>0,route:n,reason:r(t)})}function g(t={}){e.selectedLearningTaskCardId=r(t.selectedLearningTaskCardId),e.learningGrowthHistoryTaskCardId=r(t.learningGrowthHistoryTaskCardId),e.learningGrowthSettingsTaskId=r(t.learningGrowthSettingsTaskId),e.learningGrowthSettingsOpen=!!t.learningGrowthSettingsOpen,e.learningGrowthActiveTab=r(t.learningGrowthActiveTab)||`overview`,e.learningGrowthBoardLane=r(t.learningGrowthBoardLane)}function _(){return l()?(e.selectedLearningTaskCardId=``,e.learningGrowthHistoryTaskCardId=``,e.learningGrowthSettingsTaskId=``,e.learningGrowthSettingsOpen=!1,!0):!1}function v(e=`host_back`){let n=_();return n&&(d(e),typeof t==`function`&&t()),h(n,e),n||m(e),n}function y(e={}){e.data?.type===`hermes.plugin.back`&&v(`host_back`)}function b(e={}){if(e.state&&e.state.__hermesGrowthNavigation){g(e.state.routeState||{}),typeof t==`function`&&t();return}_()&&typeof t==`function`&&t()}function x(){o&&typeof o.addEventListener==`function`&&(o.addEventListener(`message`,y),o.addEventListener(`popstate`,b)),d(`init`),m(`init`)}function S(){o&&typeof o.removeEventListener==`function`&&(o.removeEventListener(`message`,y),o.removeEventListener(`popstate`,b))}return{applySnapshot:g,bind:x,canGoBack:l,clearSecondaryView:_,emitBackResult:h,emitNavigation:m,handleBack:v,handleMessage:y,handlePopState:b,historyState:u,pushHistory:f,replaceHistory:d,routeFromState:c,snapshot:s,unbind:S}}function Rc(e={}){return r(e.taskCardId||e.id)}function zc(e){return Array.isArray(e)?e:e&&typeof e==`object`?Object.entries(e).filter(([,e])=>e===!0||e===`true`||e===1).map(([e])=>e):r(e)?r(e).split(/[\s,|]+/):[]}function Bc(e,t){zc(t).forEach(t=>{let n=i(t);n&&((n===`submit_work`||n===`submit`||n===`can_submit`||n===`can_revise`)&&e.add(`submit_work`),(n===`review`||n===`reflect`||n===`reflection`||n===`can_reflect`)&&e.add(`review`),(n===`stage_assessment`||n===`formal_assessment`||n===`assessment`)&&e.add(`stage_assessment`),(n===`rewards`||n===`coins`||n===`learning_coins`)&&e.add(`rewards`))})}function Vc(e={}){let t=new Set;Bc(t,e.routeCapabilities),Bc(t,e.actionCapabilities),Bc(t,e.availableActions),Bc(t,e.capabilities);let n=e.actions&&typeof e.actions==`object`?e.actions:{},a=i(e.laneId),o=i(e.nextAction),s=i(e.primaryAction||n.primaryAction),c=i(e.cardRole||e.card_role||e.learningGrowthCardRole),l=i(e.taskCardType||e.task_card_type||e.taskModel?.taskCardType),u=i(e.completionPolicy?.mode||e.completion_policy?.mode||e.taskModel?.completionPolicy?.mode);return(n.canSubmit===!0||o===`submit`||o===`revise`||s===`submit`||s===`revise`)&&t.add(`submit_work`),(n.canReflect===!0||o===`spoken_reflection`||s===`reflect`||a===`reflection_required`)&&t.add(`review`),(c===`stage_assessment`||u===`formal_assessment`||a===`stage_assessment`||l===`assessment`||r(e.stageAssessmentCycleId||e.stage_assessment_cycle_id)||e.stageAssessment&&typeof e.stageAssessment==`object`)&&t.add(`stage_assessment`),t}function Hc(e,t){return Vc(e).has(t)}var Uc=Object.freeze({today_tasks:{label:`今日任务`,target:`board_lane`,laneId:`today`,emptyTitle:`今日没有待处理任务`,emptyBody:`看板已切到「今日」；如果没有卡片，表示当前没有今日计划任务。`},cards:{label:`成长卡片`,target:`board_all`,laneId:`all`,emptyTitle:`暂无成长卡片`,emptyBody:`已进入全部卡片列表；有卡片后会在这里按状态展示。`},submit_work:{label:`提交作业`,target:`card_with_capability`,emptyTitle:`暂无可提交作业`,emptyBody:`当前没有处于提交或修订状态的成长卡片。`},review:{label:`复盘`,target:`reflection_card_or_owner_analysis`,emptyTitle:`暂无需复盘卡片`,emptyBody:`当前没有处于复盘状态的卡片；完成批改后会出现一次反思入口。`},stage_assessment:{label:`阶段测评`,target:`formal_assessment_card_or_owner_generation`,emptyTitle:`暂无已激活的阶段测评`,emptyBody:`阶段测评需要先由 Owner 在生成页检查并激活；激活后会打开正式测评卡。`},rewards:{label:`奖励/通宝`,target:`owner_rewards`,emptyTitle:`奖励由 Owner 管理`,emptyBody:`当前执行者看板不提供奖励管理页；可通过卡片和金币流水查看学习奖励结果。`}});function Wc(e={}){return[...Array.isArray(e.overview?.board?.cards)?e.overview.board.cards:[],...Array.isArray(e.overview?.programs?.taskCards)?e.overview.programs.taskCards:[],...Array.isArray(e.overview?.programs?.executableTasks)?e.overview.programs.executableTasks:[]].filter((e,t,n)=>{let r=Rc(e);return r&&n.findIndex(e=>Rc(e)===r)===t})}function Gc(e,t={}){let n=Wc(t);return(e===`submit_work`||e===`review`||e===`stage_assessment`)&&n.find(t=>Hc(t,e))||null}function Kc(e,t,n={}){let r=Uc[e]||{};return{route:e,label:r.label||e,target:r.target||``,status:t,emptyTitle:r.emptyTitle||``,emptyBody:r.emptyBody||``,laneId:r.laneId||``,...n}}function qc(e,t,n=`selected`,r={}){return{kind:`board`,route:e,laneId:t||Uc[e]?.laneId||``,status:n,routeState:Kc(e,n,r)}}function Jc(e,t,n=`selected`,r={}){return{kind:`owner_tab`,route:e,tabId:t||`overview`,status:n,routeState:Kc(e,n,r)}}function Yc(e,t={}){return qc(e,t.laneId||`all`,`empty`,{code:`growth_route_${e}_empty`,...t})}function Xc({pluginRoute:e=``,pluginItemId:t=``,pageState:n={},model:i={}}={}){let a=r(e),o=r(t);if(!a)return{kind:`none`,handled:!1};if(a===`settings`)return{kind:`owner_settings`,handled:!1,settingsOpen:!!n.auth?.isOwner,routeState:Kc(a,n.auth?.isOwner?`selected`:`unavailable`,{label:`设置`,target:`owner_settings`,emptyTitle:`设置需要 Owner 权限`,emptyBody:`请切换到 Owner 视角后再打开成长设置。`})};if(a===`rewards`)return n.auth?.isOwner?Jc(a,`rewards`):qc(a,`all`,`unavailable`,{code:`growth_route_rewards_owner_only`});if(a===`generation`||a===`generate`||a===`card-generation`||a===`generate_cards`)return n.auth?.isOwner?Jc(`generate_cards`,`generation`):qc(`generate_cards`,`all`,`unavailable`,{label:`生成卡片`,target:`owner_generation`,emptyTitle:`生成卡片需要 Owner 权限`,emptyBody:`学习者视角只能执行已发布的卡片。`});if(a===`review`){if(n.auth?.isOwner)return Jc(a,`ai-analysis`);let e=Gc(a,i);if(e){let t=Rc(e);return{kind:`open_card`,handled:!0,taskCardId:t,routeState:Kc(a,`matched`,{taskCardId:t})}}return Yc(a,{laneId:`reflection_required`})}if(a===`submit_work`||a===`stage_assessment`){let e=Gc(a,i);if(e){let t=Rc(e);return{kind:`open_card`,handled:!0,taskCardId:t,routeState:Kc(a,`matched`,{taskCardId:t})}}return a===`stage_assessment`&&n.auth?.isOwner?Jc(a,`generation`,`unavailable`,{code:`growth_route_stage_assessment_not_active`}):Yc(a,{laneId:a===`submit_work`?`today`:`all`})}return a===`card`&&o?{kind:`open_card`,handled:!0,taskCardId:o,routeState:Kc(a,`matched`,{label:`成长卡片`,target:`card_detail`,taskCardId:o})}:a===`today_tasks`?qc(a,`today`):a===`cards`?qc(a,`all`):{kind:`unknown`,handled:!1,route:a}}function Zc(e={},t=``,n=``,r={}){let i=Uc[t]||{};e.learningGrowthRouteState={route:t,label:i.label||t,target:i.target||``,status:n,emptyTitle:i.emptyTitle||``,emptyBody:i.emptyBody||``,laneId:i.laneId||``,...r}}function Qc(e={},t={}){e.selectedLearningTaskCardId=``,e.learningGrowthHistoryTaskCardId=``,e.learningGrowthSettingsTaskId=``,e.learningGrowthSettingsOpen=!1,e.learningGrowthActiveTab=`overview`,e.learningGrowthBoardLane=r(t.laneId),e.learningGrowthRouteState=t.routeState||null}function $c(e={},t={}){e.selectedLearningTaskCardId=``,e.learningGrowthHistoryTaskCardId=``,e.learningGrowthSettingsTaskId=``,e.learningGrowthSettingsOpen=!0,e.learningGrowthActiveTab=r(t.tabId)||`overview`,e.learningGrowthRouteState=t.routeState||null}function el(e={},t={}){e.learningGrowthSettingsOpen=!!t.settingsOpen,e.learningGrowthRouteState=t.routeState||null}function tl(e={},t={}){return t.kind===`owner_settings`?(el(e,t),!0):t.kind===`owner_tab`?($c(e,t),!0):t.kind===`board`?(Qc(e,t),!0):t.kind===`open_card`?(e.learningGrowthRouteState=t.routeState||null,!0):t.kind===`unknown`?(Zc(e,t.route||``,`unknown`),!0):!1}function nl({pluginRoute:e=``,pluginItemId:t=``,pageState:n={},model:r={},openCard:i}={}){function a(){return Wc(r)}function o(e=``){return Gc(e,r)}async function s(){let a=Xc({pluginRoute:e,pluginItemId:t,pageState:n,model:r});return!a||a.kind===`none`?!1:(tl(n,a),a.kind===`open_card`?(typeof i==`function`&&await i(a.taskCardId),!0):!1)}return{allTaskCards:a,applyInitialPluginRoute:s,cardCapabilities:Vc,firstTaskCardForRoute:o,hasRouteCapability:Hc}}function rl(){return{cardGeneration:{}}}function il(e=rl()){let t=e&&typeof e==`object`?e:rl(),n=new Set;function r(){return t}function i(e=`state_changed`){let t=r();for(let r of Array.from(n))r(t,e);return t}function a(e,n=`state_mutated`){return typeof e==`function`&&e(t),i(n)}function o(e,n={},r=`state_reduced`){let a=typeof e==`function`?e(t,n):!1;return a&&i(r),{changed:!!a,state:t}}function s(e,...n){return typeof e==`function`?e(t,...n):void 0}function c(e){return typeof e==`function`?(n.add(e),()=>{n.delete(e)}):()=>{}}return{getState:r,mutate:a,notify:i,reduce:o,select:s,subscribe:c}}function al(e={}){let t=Array.isArray(e.cards)?e.cards:[],n=e.summary||{},i=Number(n.completed??t.filter(e=>/complete|completed|done/i.test(r(e.status||e.nextAction))).length),a=Number(n.active??t.length-i),o=t.reduce((e,t)=>e+(Number(t.latestRewardSettlement?.coinAmount||0)||0),0);return{totalCards:Number(n.total??t.length)||t.length,activeTasks:Number.isFinite(a)?a:0,completedTasks:Number.isFinite(i)?i:0,totalEarnedCoins:o,sevenDayCoins:0,thirtyDayCoins:0}}function ol({getWorkspaceId:e=()=>``,learnerLabel:t=()=>`Owner`}={}){function n(t={}){let n=r(t.taskCardId||t.id);return Object.assign({},t,{id:n,taskCardId:n,workspaceId:r(t.workspaceId||e()),title:r(t.title)||n||`学习任务`,status:r(t.status||t.nextAction||t.primaryAction||`published`),nextAction:r(t.nextAction||t.primaryAction||`submit`),nativeState:Object.assign({},t.nativeState||{},{nextAction:r(t.nextAction||t.primaryAction||`submit`)}),rewardPolicy:Object.assign({maxCoins:Number(t.rewardCapCoins||100)||100},t.rewardPolicy||{}),taskModel:Object.assign({},t.taskModel||{},{learnerInstruction:r(t.learnerInstruction||t.instruction||t.instructionPreview),goalSummary:r(t.goalSummary||t.instructionPreview)})})}function i(e={}){let t=(Array.isArray(e.cards)?e.cards:[]).map(n),i=new Set(t.map(e=>e.taskCardId)),a=(Array.isArray(e.lanes)?e.lanes:[]).map(e=>{let t=(Array.isArray(e.cards)?e.cards:[]).map(r).filter(e=>i.has(e));return Object.assign({},e,{id:r(e.id||e.title||`active`),title:r(e.title||e.id||`Active`),cards:t,count:Number(e.count??t.length)||t.length})}).filter(e=>e.cards.length||e.count);return Object.assign({},e,{cards:t,lanes:a,summary:Object.assign({},e.summary||{},al({cards:t,summary:e.summary||{}}))})}function a(n={},r={}){let a=i(r),o=al(a),s=a.cards,c=e();return{ok:!0,source:r.source||n.source||`growth-plugin`,learner:{id:c||`owner`,workspaceId:c||`owner`,displayName:t()},module:{title:`成长`,status:n.stage||`plugin_sqlite`},metrics:o,coins:{balances:{availableCoins:o.totalEarnedCoins,earnedCoins:o.totalEarnedCoins},growth:{totalEarnedCoins:o.totalEarnedCoins,sevenDayCoins:o.sevenDayCoins,thirtyDayCoins:o.thirtyDayCoins},rewards:[],ledger:[],redemptions:[]},board:a,programs:{taskCards:s,executableTasks:s,rewardSettlements:s.map(e=>e.latestRewardSettlement).filter(Boolean),interactionSessions:[],launchOperations:{counts:{completedTasks:o.completedTasks,pendingRewardSettlements:0,pendingParentReviews:0,pendingPlanReviews:0}}},launchOperations:{counts:{completedTasks:o.completedTasks,pendingRewardSettlements:0,pendingParentReviews:0,pendingPlanReviews:0}},platformCapabilities:[],capabilities:[],nextModules:[]}}return{makeOverview:a,normalizeBoard:i,normalizeCard:n}}function sl(){return{cardGeneration:{}}}function cl({root:e=null,state:t=sl(),store:n=null,api:r={},renderView:i=so,getCurrentWorkspaceId:a=()=>``,isOwner:o=()=>!0,viewTargets:s=[],renderers:c={},payloadBuilders:l={},refreshers:u={},cardInteraction:d={},navigation:f={},routing:p={},handlers:m={}}={}){let h=()=>{},g=null,_=n||il(t),v=_.getState(),y=d.viewModel||ol({getWorkspaceId:a,learnerLabel:()=>`Owner`});function b(e={}){if(typeof s==`function`){let t=s(e);return Array.isArray(t)?t:[]}return Array.isArray(s)&&s.length?s:Array.isArray(e.viewTargets||e.growthViewTargets)?e.viewTargets||e.growthViewTargets:[]}function x(t=_.getState(),n=`render`){return typeof i==`function`&&i(e,t,{currentWorkspaceId:a(),isOwner:o(),renderers:c,viewTargets:b(t)}),_.notify(n),t}let S=is({state:v,api:r,render:x,getCurrentWorkspaceId:a,isOwner:o,payloadBuilders:l,refreshers:u}),C=Object.assign({},S,m),w=Ms({state:v,handlers:C,render:x}),ee=bc({root:e,state:v,model:d.model||v,viewModel:y,api:r,render:x,refreshCard:d.refreshCard||u.refreshCard,getCurrentWorkspaceId:a,audioController:d.audioController||null,readBlobAsBase64:d.readBlobAsBase64});function te(){return f===!1?null:(f.createController||Lc)({pageState:v,renderShell:()=>x(_.getState(),`navigation`),historyRef:f.historyRef,locationRef:f.locationRef,parentRef:f.parentRef,windowRef:f.windowRef})}let ne=p===!1?null:p.controller||nl({pluginRoute:p.pluginRoute,pluginItemId:p.pluginItemId,pageState:v,model:p.model||v.model||{},openCard:p.openCard});function re(e={}){return w.handleCardGenerationAction(e)}function ie(){h(),g&&typeof g.unbind==`function`&&g.unbind();let n=Ws({root:e,dispatch:re}),r=Ac({root:e,state:v,controller:ee,render:x});return g=te(),g&&typeof g.bind==`function`&&g.bind(),h=()=>{n(),r(),g&&typeof g.unbind==`function`&&g.unbind()},x(t),oe}function ae(){h(),h=()=>{}}let oe={cardInteractionController:ee,controller:w,dispatch:re,getState:_.getState,handlers:C,mount:ie,navigationController:()=>g,render:x,routeController:ne,select:_.select,state:v,store:_,unmount:ae,viewModel:y};return oe}function ll({document:e}={}){let t=e?.getElementById?.(`growth-vite-root`)||null;if(t)return{mode:`bootstrap`,root:t};let n=e?.getElementById?.(`growth-root`)||null;return n?.dataset?.growthViteRuntime===`enabled`?{mode:`runtime`,root:n}:{mode:`disabled`,root:null}}function ul({document:e=globalThis.document,location:t=globalThis.location,appFactory:n=co,runtimeAdapterFactory:r=cl,state:i,api:a,renderView:o,getCurrentWorkspaceId:s,isOwner:c,payloadBuilders:l,refreshers:u,handlers:d}={}){let f=ll({document:e});if(f.mode===`runtime`){let e=r({root:f.root,state:i,api:a,renderView:o,getCurrentWorkspaceId:s,isOwner:c,payloadBuilders:l,refreshers:u,handlers:d});return e.mount(),{mode:`runtime`,root:f.root,runtime:e,app:null}}let p=n({root:f.mode===`bootstrap`?f.root:null,location:t,document:e}),m=p.bootstrap();return{mode:f.mode,root:f.root,runtime:null,app:p,state:m}}var dl=ul();dl.runtime||dl.app;
//# sourceMappingURL=growth.Ce5FKlWI.js.map