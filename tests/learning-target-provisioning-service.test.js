const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { createLearningTargetProvisioningService } = require("../src/services/learning-target-provisioning-service");
const { createGrowthLearningSqliteStore } = require("../src/stores/growth-learning-sqlite-store");

function tempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "learning-target-provisioning-"));
  return path.join(dir, "growth-learning.sqlite3");
}

function graphRepository() {
  return {
    domainPackOptions() {
      return [{
        domainPackId: "uk_hk_curriculum_foundation",
        importId: "kg_import_20260527_fanfan_uk_hk_igcse_a_level_v1",
        domain: "science",
        title: "UK/HK Curriculum Foundation",
        sourceKind: "seed",
        version: "2026-05-27-v1",
        visibility: "private",
        importStatus: "validated_seed",
        nodeCount: 2,
        subjectCount: 2,
        subjects: ["science", "physics"],
        rawJson: "RAW GRAPH JSON MUST NOT PROJECT"
      }, {
        domainPackId: "english_foundation",
        domain: "english",
        title: "English Foundation",
        subjects: ["english"],
        nodeCount: 1
      }];
    },
    nodesByIds({ nodeIds }) {
      const nodes = {
        kg_science_fair_test: {
          nodeId: "kg_science_fair_test",
          domainPackId: "uk_hk_curriculum_foundation",
          domain: "science",
          subject: "science"
        },
        kg_physics_force: {
          nodeId: "kg_physics_force",
          domainPackId: "uk_hk_curriculum_foundation",
          domain: "science",
          subject: "physics"
        },
        kg_english_main_idea: {
          nodeId: "kg_english_main_idea",
          domainPackId: "english_foundation",
          domain: "english",
          subject: "english"
        }
      };
      return nodeIds.map((nodeId) => nodes[nodeId]).filter(Boolean);
    }
  };
}

function createService() {
  const store = createGrowthLearningSqliteStore({ dbPath: tempDbPath() });
  const service = createLearningTargetProvisioningService({
    repository: store.domainPackProvisionRepository,
    graphRepository: graphRepository()
  });
  return { service, store };
}

test("target provisioning keeps Fanfan sample enabled without explicit provisions", () => {
  const { service } = createService();

  const result = service.resolveSelection({
    workspaceId: "weixin_stephen",
    learnerId: "fanfan",
    displayName: "凡凡",
    domainPackId: "uk_hk_curriculum_foundation",
    subject: "science",
    targetNodeIds: ["kg_science_fair_test"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.targetEnabled, true);
  assert.equal(result.mode, "sample_default");
  assert.equal(result.selectedDomainPackId, "uk_hk_curriculum_foundation");
  assert.equal(result.selectedSubject, "science");
  assert.equal(JSON.stringify(result).includes("RAW GRAPH JSON"), false);
});

test("target provisioning blocks non-sample learners until a domain pack is provisioned", () => {
  const { service } = createService();

  const denied = service.resolveSelection({
    workspaceId: "weixin_other",
    learnerId: "other",
    displayName: "Other",
    domainPackId: "uk_hk_curriculum_foundation",
    subject: "science"
  });

  assert.equal(denied.ok, false);
  assert.equal(denied.targetEnabled, false);
  assert.equal(denied.error, "learning_target_not_provisioned");
});

test("target provisioning enables arbitrary learners through summary-only provision rows", () => {
  const { service, store } = createService();

  const provisioned = service.provisionDomainPack({
    workspaceId: "weixin_alice",
    learnerId: "alice",
    domainPackId: "uk_hk_curriculum_foundation",
    subject: "science",
    requestedBy: "owner"
  });

  assert.equal(provisioned.ok, true);
  assert.equal(provisioned.provision.workspaceId, "weixin_alice");
  assert.equal(provisioned.provision.subject, "science");

  const saved = store.domainPackProvisionRepository.listProvisions({
    workspaceId: "weixin_alice",
    learnerId: "alice",
    status: "active"
  });
  assert.equal(saved.length, 1);
  assert.equal(JSON.stringify(saved).includes("token"), false);

  const allowed = service.resolveSelection({
    workspaceId: "weixin_alice",
    learnerId: "alice",
    domainPackId: "uk_hk_curriculum_foundation",
    subject: "science",
    targetNodeIds: ["kg_science_fair_test"]
  });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.mode, "explicit_provision");
  assert.equal(allowed.graphOptions.subjects.length, 1);
  assert.equal(allowed.graphOptions.subjects[0], "science");

  const wrongSubject = service.resolveSelection({
    workspaceId: "weixin_alice",
    learnerId: "alice",
    domainPackId: "uk_hk_curriculum_foundation",
    subject: "physics",
    targetNodeIds: ["kg_physics_force"]
  });
  assert.equal(wrongSubject.ok, false);
  assert.equal(wrongSubject.error, "learning_domain_pack_not_provisioned");

  const wrongNode = service.resolveSelection({
    workspaceId: "weixin_alice",
    learnerId: "alice",
    domainPackId: "uk_hk_curriculum_foundation",
    subject: "science",
    targetNodeIds: ["kg_english_main_idea"]
  });
  assert.equal(wrongNode.ok, false);
  assert.equal(wrongNode.error, "learning_target_node_not_in_provision");
});

test("target provisioning supports cross-subject domain packs with subject-domain selections", () => {
  const store = createGrowthLearningSqliteStore({ dbPath: tempDbPath() });
  const service = createLearningTargetProvisioningService({
    repository: store.domainPackProvisionRepository,
    graphRepository: {
      domainPackOptions() {
        return [{
          domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
          importId: "kg_import_20260527_fanfan_uk_hk_igcse_a_level_v1",
          domain: "cross_subject_curriculum",
          title: "Fanfan Cambridge pathway",
          sourceKind: "official_syllabus_seed",
          version: "2026-05-27-v1",
          visibility: "private_seed",
          importStatus: "validated_seed",
          nodeCount: 294,
          subjectCount: 9,
          subjects: ["cross_subject", "english", "mathematics", "science"]
        }];
      },
      nodesByIds({ nodeIds }) {
        const nodes = {
          kg_lower_secondary_science: {
            nodeId: "kg_lower_secondary_science",
            domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
            domain: "science",
            subject: "science"
          }
        };
        return nodeIds.map((nodeId) => nodes[nodeId]).filter(Boolean);
      }
    }
  });

  const provisioned = service.provisionDomainPack({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
    domain: "science",
    subject: "science",
    requestedBy: "owner"
  });
  assert.equal(provisioned.ok, true);
  assert.equal(provisioned.provision.domain, "science");
  assert.equal(provisioned.provision.subject, "science");

  const resolved = service.resolveSelection({
    workspaceId: "weixin_fanfan",
    learnerId: "fanfan",
    domainPackId: "domain_pack_fanfan_cambridge_pathway_v1",
    domain: "science",
    subject: "science",
    targetNodeIds: ["kg_lower_secondary_science"]
  });
  assert.equal(resolved.ok, true);
  assert.equal(resolved.mode, "explicit_provision");
  assert.equal(resolved.selectedDomain, "science");
  assert.equal(resolved.selectedSubject, "science");
  assert.deepEqual(resolved.selectedTargetNodeIds, ["kg_lower_secondary_science"]);
});
