"use strict";

function createGrowthCardRetirementService({ cardRetirementRepository } = {}) {
  function planRegenerableCardRetirement(input = {}) {
    if (!cardRetirementRepository?.listRegenerableCards) {
      return { ok: false, error: "card_retirement_repository_missing" };
    }
    return cardRetirementRepository.listRegenerableCards(input);
  }

  function retireRegenerableCards(input = {}) {
    if (!cardRetirementRepository?.retireRegenerableCards) {
      return { ok: false, error: "card_retirement_repository_missing" };
    }
    return cardRetirementRepository.retireRegenerableCards(input);
  }

  return {
    planRegenerableCardRetirement,
    retireRegenerableCards
  };
}

module.exports = { createGrowthCardRetirementService };
