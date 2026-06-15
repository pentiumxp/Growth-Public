"use strict";

function cleanString(value) {
  return String(value || "").trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  return Array.from(new Set(asArray(values).map(cleanString).filter(Boolean)));
}

function lower(value) {
  return cleanString(value).toLowerCase();
}

function unavailable(error, extra = {}) {
  return Object.assign({ ok: false, targetEnabled: false, error }, extra);
}

function isFanfanSampleTarget(input = {}) {
  const text = [
    input.workspaceId,
    input.learnerId,
    input.displayName,
    input.label
  ].map(cleanString).join(" ").toLowerCase();
  return /\bfan[\s_-]*fan\b/.test(text) || text.includes("fanfan") || text.includes("凡凡");
}

function publicDomainPackOption(option = {}) {
  return {
    domainPackId: cleanString(option.domainPackId || option.domain_pack_id),
    importId: cleanString(option.importId || option.import_id),
    domain: cleanString(option.domain),
    title: cleanString(option.title).slice(0, 160),
    sourceKind: cleanString(option.sourceKind || option.source_kind),
    version: cleanString(option.version),
    visibility: cleanString(option.visibility),
    importStatus: cleanString(option.importStatus || option.import_status),
    nodeCount: Number(option.nodeCount || option.node_count || 0) || 0,
    subjectCount: Number(option.subjectCount || option.subject_count || 0) || 0,
    subjects: uniqueStrings(option.subjects).slice(0, 24),
    updatedAt: cleanString(option.updatedAt || option.updated_at)
  };
}

function publicProvision(provision = null) {
  if (!provision) return null;
  return {
    provisionId: cleanString(provision.provisionId || provision.provision_id),
    workspaceId: cleanString(provision.workspaceId || provision.workspace_id),
    learnerId: cleanString(provision.learnerId || provision.learner_id),
    programId: cleanString(provision.programId || provision.program_id),
    domainPackId: cleanString(provision.domainPackId || provision.domain_pack_id),
    domain: cleanString(provision.domain),
    subject: cleanString(provision.subject),
    status: cleanString(provision.status),
    source: cleanString(provision.source),
    updatedAt: cleanString(provision.updatedAt || provision.updated_at)
  };
}

function subjectsForOption(option = {}) {
  return uniqueStrings(option.subjects).slice(0, 40);
}

function optionMatches(option = {}, input = {}) {
  const domainPackId = cleanString(input.domainPackId);
  const domain = lower(input.domain);
  const subject = lower(input.subject);
  if (domainPackId && cleanString(option.domainPackId) !== domainPackId) return false;
  if (domain && lower(option.domain) !== domain) return false;
  if (subject && !subjectsForOption(option).map(lower).includes(subject)) return false;
  return true;
}

function provisionMatches(provision = {}, option = {}, subject = "") {
  if (cleanString(provision.domainPackId) !== cleanString(option.domainPackId)) return false;
  const provisionDomain = lower(provision.domain);
  if (provisionDomain && provisionDomain !== lower(option.domain)) return false;
  const provisionSubject = lower(provision.subject);
  return !provisionSubject || !subject || provisionSubject === lower(subject);
}

function allowedSubjects(option = {}, provisions = []) {
  const optionSubjects = subjectsForOption(option);
  if (!provisions.length) return optionSubjects;
  const subjects = uniqueStrings(provisions
    .filter((provision) => cleanString(provision.domainPackId) === cleanString(option.domainPackId))
    .map((provision) => provision.subject)
  );
  if (!subjects.length) return optionSubjects;
  return optionSubjects.filter((subject) => subjects.map(lower).includes(lower(subject)));
}

function graphOptionsProjection(domainPacks = [], selected = {}) {
  const selectedPackId = cleanString(selected.domainPackId);
  const selectedSubject = cleanString(selected.subject);
  const selectedPack = domainPacks.find((option) => option.domainPackId === selectedPackId) || domainPacks[0] || null;
  const subjects = selectedPack ? subjectsForOption(selectedPack) : uniqueStrings(domainPacks.flatMap((option) => option.subjects));
  return {
    ok: true,
    available: domainPacks.length > 0,
    selectedDomainPackId: selectedPackId || cleanString(selectedPack?.domainPackId),
    selectedDomain: cleanString(selected.domain) || cleanString(selectedPack?.domain),
    selectedSubject: selectedSubject || subjects[0] || "",
    domainPacks: domainPacks.map(publicDomainPackOption),
    subjects: subjects.slice(0, 40)
  };
}

function createLearningTargetProvisioningService(options = {}) {
  const repository = options.repository || null;
  const graphRepository = options.graphRepository || null;
  const sampleTargetPredicate = options.sampleTargetPredicate || isFanfanSampleTarget;

  function domainPackOptions() {
    if (!graphRepository || typeof graphRepository.domainPackOptions !== "function") return [];
    try {
      return graphRepository.domainPackOptions({ limit: 100 }).map(publicDomainPackOption).filter((option) => option.domainPackId);
    } catch (_error) {
      return [];
    }
  }

  function activeProvisions(input = {}) {
    if (!repository || typeof repository.listProvisions !== "function") return [];
    try {
      return repository.listProvisions({
        workspaceId: input.workspaceId,
        learnerId: input.learnerId,
        programId: input.programId,
        status: "active",
        limit: 100
      }).map(publicProvision).filter((provision) => provision.domainPackId);
    } catch (_error) {
      return [];
    }
  }

  function selectDomainPack(optionsList = [], input = {}, provisions = []) {
    const requested = {
      domainPackId: cleanString(input.domainPackId || input.domain_pack_id),
      domain: cleanString(input.domain),
      subject: cleanString(input.subject)
    };
    const candidates = optionsList.filter((option) => {
      if (!provisions.length) return true;
      return provisions.some((provision) => provisionMatches(provision, option, requested.subject));
    });
    const matching = requested.domainPackId || requested.domain || requested.subject
      ? candidates.find((option) => optionMatches(option, requested))
      : candidates[0];
    return matching || null;
  }

  function validateTargetNodes(input = {}, selected = {}) {
    const nodeIds = uniqueStrings(input.targetNodeIds || input.target_node_ids || input.nodeIds || input.node_ids);
    if (!nodeIds.length) return { ok: true, targetNodeIds: [] };
    if (!graphRepository || typeof graphRepository.nodesByIds !== "function") {
      return unavailable("learning_target_node_validation_unavailable");
    }
    const nodes = graphRepository.nodesByIds({ nodeIds });
    const found = new Set(nodes.map((node) => cleanString(node.nodeId)));
    const missing = nodeIds.filter((nodeId) => !found.has(nodeId));
    if (missing.length) return unavailable("learning_target_node_not_found", { missingTargetNodeIds: missing });
    const selectedDomainPackId = cleanString(selected.domainPackId);
    const selectedDomain = lower(selected.domain);
    const selectedSubject = lower(selected.subject);
    const mismatched = nodes.filter((node) => {
      if (selectedDomainPackId && cleanString(node.domainPackId) !== selectedDomainPackId) return true;
      if (selectedDomain && lower(node.domain) && lower(node.domain) !== selectedDomain) return true;
      if (selectedSubject && lower(node.subject) && lower(node.subject) !== selectedSubject) return true;
      return false;
    });
    if (mismatched.length) {
      return unavailable("learning_target_node_not_in_provision", {
        mismatchedTargetNodeIds: mismatched.map((node) => cleanString(node.nodeId)).filter(Boolean)
      });
    }
    return { ok: true, targetNodeIds: nodeIds };
  }

  function resolveSelection(input = {}) {
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
    const programId = cleanString(input.programId || input.program_id);
    if (!workspaceId) return unavailable("learning_target_workspace_required");
    const optionsList = domainPackOptions();
    const provisions = activeProvisions({ workspaceId, learnerId, programId });
    const sample = sampleTargetPredicate({ workspaceId, learnerId, displayName: input.displayName, label: input.label });
    if (!provisions.length && !sample) {
      return unavailable("learning_target_not_provisioned", {
        workspaceId,
        learnerId,
        graphOptions: graphOptionsProjection([], {})
      });
    }
    if (!optionsList.length) {
      return unavailable("learning_domain_pack_options_unavailable", {
        workspaceId,
        learnerId,
        graphOptions: graphOptionsProjection([], {})
      });
    }
    const selectedPack = selectDomainPack(optionsList, input, provisions);
    if (!selectedPack) {
      return unavailable("learning_domain_pack_not_provisioned", {
        workspaceId,
        learnerId,
        graphOptions: graphOptionsProjection(optionsList, {})
      });
    }
    const packProvisions = provisions.filter((provision) => provisionMatches(provision, selectedPack, input.subject));
    const subjects = allowedSubjects(selectedPack, packProvisions);
    const requestedSubject = cleanString(input.subject);
    if (requestedSubject && subjects.length && !subjects.map(lower).includes(lower(requestedSubject))) {
      return unavailable("learning_subject_not_provisioned", {
        workspaceId,
        learnerId,
        graphOptions: graphOptionsProjection([Object.assign({}, selectedPack, { subjects })], {
          domainPackId: selectedPack.domainPackId,
          domain: selectedPack.domain
        })
      });
    }
    const selectedSubject = requestedSubject || subjects[0] || "";
    const selected = {
      domainPackId: selectedPack.domainPackId,
      domain: cleanString(input.domain) || selectedPack.domain,
      subject: selectedSubject
    };
    const nodeValidation = validateTargetNodes(input, selected);
    if (!nodeValidation.ok) {
      return Object.assign({}, nodeValidation, {
        workspaceId,
        learnerId,
        graphOptions: graphOptionsProjection([Object.assign({}, selectedPack, { subjects })], selected)
      });
    }
    return {
      ok: true,
      targetEnabled: true,
      source: "growth-learning-target-provisioning-service",
      mode: provisions.length ? "explicit_provision" : "sample_default",
      workspaceId,
      learnerId,
      programId,
      selectedDomainPackId: selected.domainPackId,
      selectedDomain: selected.domain,
      selectedSubject: selected.subject,
      selectedTargetNodeIds: nodeValidation.targetNodeIds,
      provision: publicProvision(packProvisions[0] || null),
      graphOptions: graphOptionsProjection([Object.assign({}, selectedPack, { subjects })], selected)
    };
  }

  function provisionDomainPack(input = {}) {
    if (!repository || typeof repository.upsertProvision !== "function") {
      return unavailable("learning_target_provision_repository_unavailable");
    }
    const workspaceId = cleanString(input.workspaceId || input.workspace_id);
    const learnerId = cleanString(input.learnerId || input.learner_id || workspaceId);
    const domainPackId = cleanString(input.domainPackId || input.domain_pack_id);
    const subject = cleanString(input.subject);
    const optionsList = domainPackOptions();
    const selectedPack = optionsList.find((option) => option.domainPackId === domainPackId);
    if (!workspaceId || !domainPackId) return unavailable("learning_target_provision_scope_required");
    if (!selectedPack) return unavailable("learning_domain_pack_not_found");
    const subjects = subjectsForOption(selectedPack);
    if (subject && subjects.length && !subjects.map(lower).includes(lower(subject))) {
      return unavailable("learning_subject_not_found", {
        graphOptions: graphOptionsProjection([selectedPack], { domainPackId, domain: selectedPack.domain })
      });
    }
    const saved = repository.upsertProvision({
      workspaceId,
      learnerId,
      programId: input.programId || input.program_id,
      domainPackId,
      domain: cleanString(input.domain) || selectedPack.domain,
      subject,
      status: input.status || "active",
      source: input.source || "owner",
      policy: {
        summaryOnly: true,
        requestedBy: cleanString(input.requestedBy || input.requested_by),
        allowedSubjects: subject ? [subject] : subjects
      }
    });
    if (!saved?.ok) return saved || unavailable("learning_target_provision_save_failed");
    return {
      ok: true,
      source: "growth-learning-target-provisioning-service",
      provision: publicProvision(saved.provision),
      graphOptions: graphOptionsProjection([selectedPack], {
        domainPackId,
        domain: selectedPack.domain,
        subject: subject || subjects[0] || ""
      })
    };
  }

  return {
    provisionDomainPack,
    resolveSelection
  };
}

module.exports = {
  createLearningTargetProvisioningService,
  isFanfanSampleTarget,
  publicDomainPackOption
};
