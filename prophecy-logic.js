(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	if (root) root.ZeratulProphecyLogic = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

	function isPlainObject(value) {
		return value !== null && typeof value === 'object' && !Array.isArray(value);
	}

	function cloneValidCounts(counts, validLookup) {
		var result = {};
		if (!isPlainObject(counts)) return result;
		Object.keys(counts).forEach(function (cardId) {
			var count = counts[cardId];
			if (validLookup && !validLookup[cardId]) return;
			if (Number.isInteger(count) && count > 0) result[cardId] = count;
		});
		return result;
	}

	function normalizeCounts(counts, validIds) {
		var validLookup = {};
		(validIds || []).forEach(function (cardId) {
			if (typeof cardId === 'string' && cardId) validLookup[cardId] = true;
		});
		return cloneValidCounts(counts, validLookup);
	}

	function incrementCount(counts, cardId) {
		var result = cloneValidCounts(counts);
		if (typeof cardId === 'string' && cardId) {
			result[cardId] = (result[cardId] || 0) + 1;
		}
		return result;
	}

	function decrementCount(counts, cardId) {
		var result = cloneValidCounts(counts);
		if (!result[cardId]) return result;
		if (result[cardId] === 1) delete result[cardId];
		else result[cardId]--;
		return result;
	}

	function calculateRefreshCount(card, coreCards, counts, isClose) {
		if (!card || typeof isClose !== 'function') return 0;
		var normalized = cloneValidCounts(counts);
		var cardById = {};
		(coreCards || []).forEach(function (coreCard) {
			if (coreCard && typeof coreCard.id === 'string') cardById[coreCard.id] = coreCard;
		});

		return Object.keys(normalized).reduce(function (total, cardId) {
			var prophecy = cardById[cardId];
			return total + (prophecy && isClose(card, prophecy) ? normalized[cardId] : 0);
		}, 0);
	}

	function compareRecommendations(a, b) {
		return b.infoGain - a.infoGain ||
			b.refreshCount - a.refreshCount ||
			a.poolIndex - b.poolIndex;
	}

	function uniqueStrings(values, validator) {
		var seen = {};
		return (Array.isArray(values) ? values : []).filter(function (value) {
			if (typeof value !== 'string' || !value || seen[value]) return false;
			if (validator && !validator(value)) return false;
			seen[value] = true;
			return true;
		});
	}

	function normalizeStoredState(value, allowedPackKeys) {
		if (!isPlainObject(value) || value.version !== 1) return null;
		var allowed = {};
		(allowedPackKeys || []).forEach(function (key) { allowed[key] = true; });
		var guesses = [];
		var guessedIds = {};
		(Array.isArray(value.guesses) ? value.guesses : []).forEach(function (guess) {
			if (!isPlainObject(guess) || typeof guess.cardId !== 'string' || !guess.cardId) return;
			if (guess.feedback !== 'close' && guess.feedback !== 'not_close') return;
			if (guessedIds[guess.cardId]) return;
			guessedIds[guess.cardId] = true;
			guesses.push({cardId: guess.cardId, feedback: guess.feedback});
		});

		var seenLevels = {};
		var predictionLevels = (Array.isArray(value.predictionLevels) ? value.predictionLevels : [])
			.filter(function (level) {
				if (!Number.isInteger(level) || level < 1 || level > 6 || seenLevels[level]) return false;
				seenLevels[level] = true;
				return true;
			});

		return {
			enabledPacks: uniqueStrings(value.enabledPacks, function (key) { return !!allowed[key]; }),
			knownProphecyCounts: cloneValidCounts(value.knownProphecyCounts),
			guesses: guesses,
			excludedCardIds: uniqueStrings(value.excludedCardIds),
			predictionLevels: predictionLevels
		};
	}

	return {
		normalizeCounts: normalizeCounts,
		incrementCount: incrementCount,
		decrementCount: decrementCount,
		calculateRefreshCount: calculateRefreshCount,
		compareRecommendations: compareRecommendations,
		normalizeStoredState: normalizeStoredState
	};
}));
