const test = require('node:test');
const assert = require('node:assert/strict');
const logic = require('../prophecy-logic.js');

test('normalizeCounts keeps positive integer counts for valid cards', () => {
	assert.deepEqual(
		logic.normalizeCounts(
			{Oracle: 2, Invalid: 3, Negative: -1, Fraction: 1.5},
			['Oracle', 'Carrier']
		),
		{Oracle: 2}
	);
});

test('incrementCount and decrementCount preserve duplicate counts without mutation', () => {
	const original = {Oracle: 2};
	const incremented = logic.incrementCount(original, 'Oracle');
	const decremented = logic.decrementCount(incremented, 'Oracle');
	const removed = logic.decrementCount({Oracle: 1}, 'Oracle');

	assert.deepEqual(original, {Oracle: 2});
	assert.deepEqual(incremented, {Oracle: 3});
	assert.deepEqual(decremented, {Oracle: 2});
	assert.deepEqual(removed, {});
});

test('duplicate prophecies contribute independently to refresh count', () => {
	const entered = {id: 'Probe', race: 'Protess', number: 1, value: 100};
	const core = [
		{id: 'Oracle', race: 'Protess', number: 9, value: 900},
		{id: 'Marine', race: 'Terran', number: 1, value: 100}
	];

	const count = logic.calculateRefreshCount(
		entered,
		core,
		{Oracle: 2, Marine: 1},
		function (a, b) {
			return a.race === b.race || a.number === b.number || Math.abs(a.value - b.value) <= 200;
		}
	);

	assert.equal(count, 3);
});

test('information gain wins before refresh count', () => {
	const highGain = {infoGain: 0.9, refreshCount: 0, poolIndex: 1};
	const highRefresh = {infoGain: 0.8, refreshCount: 20, poolIndex: 0};
	assert.ok(logic.compareRecommendations(highGain, highRefresh) < 0);
});

test('refresh count breaks equal information gain ties', () => {
	const highRefresh = {infoGain: 0.8, refreshCount: 3, poolIndex: 1};
	const lowRefresh = {infoGain: 0.8, refreshCount: 1, poolIndex: 0};
	assert.ok(logic.compareRecommendations(highRefresh, lowRefresh) < 0);
});

test('pool order breaks ties when both metrics match', () => {
	const first = {infoGain: 0.8, refreshCount: 3, poolIndex: 2};
	const later = {infoGain: 0.8, refreshCount: 3, poolIndex: 7};
	assert.ok(logic.compareRecommendations(first, later) < 0);
});

test('normalizeStoredState rejects an unknown version', () => {
	assert.equal(logic.normalizeStoredState({version: 2}, ['core']), null);
});

test('normalizeStoredState keeps only safe supported values', () => {
	const restored = logic.normalizeStoredState({
		version: 1,
		enabledPacks: ['core', 'pack2', 'missing', 'pack2'],
		knownProphecyCounts: {Oracle: 2, Bad: -1},
		guesses: [
			{cardId: 'Probe', feedback: 'close'},
			{cardId: 'Marine', feedback: 'not_close'},
			{cardId: 4, feedback: 'close'},
			{cardId: 'Bad', feedback: 'unknown'}
		],
		excludedCardIds: ['Oracle', 7, 'Oracle'],
		predictionLevels: [1, 2, 2, 0, 7, '3']
	}, ['core', 'pack2']);

	assert.deepEqual(restored, {
		enabledPacks: ['core', 'pack2'],
		knownProphecyCounts: {Oracle: 2},
		guesses: [
			{cardId: 'Probe', feedback: 'close'},
			{cardId: 'Marine', feedback: 'not_close'}
		],
		excludedCardIds: ['Oracle'],
		predictionLevels: [1, 2]
	});
});
