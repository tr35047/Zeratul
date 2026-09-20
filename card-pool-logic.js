(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) {
		module.exports = api;
	}
	if (root) {
		root.ZeratulCardPoolLogic = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

	function isSpecialCard(card, specialPackKey) {
		return Boolean(card) && card.packKey === specialPackKey;
	}

	function appendSpecialGroup(normalGroups, cards, specialPackKey, specialGroup) {
		var groups = normalGroups.slice();
		var hasSpecialCards = cards.some(function (card) {
			return isSpecialCard(card, specialPackKey);
		});
		if (hasSpecialCards && groups.indexOf(specialGroup) === -1) {
			groups.push(specialGroup);
		}
		return groups;
	}

	function filterEntryCards(cards, selectedGroup, specialPackKey, specialGroup) {
		return cards.filter(function (card) {
			if (selectedGroup === specialGroup) {
				return isSpecialCard(card, specialPackKey);
			}
			return !isSpecialCard(card, specialPackKey) && card.race === selectedGroup;
		});
	}

	function getRecommendationPool(cards, usedIds, predictionLevels, specialPackKey) {
		return cards.filter(function (card) {
			if (isSpecialCard(card, specialPackKey)) return false;
			if (usedIds[card.id]) return false;
			return predictionLevels.length === 0 || predictionLevels.indexOf(card.level) !== -1;
		});
	}

	return {
		isSpecialCard: isSpecialCard,
		appendSpecialGroup: appendSpecialGroup,
		filterEntryCards: filterEntryCards,
		getRecommendationPool: getRecommendationPool
	};
});
