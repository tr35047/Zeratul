const test = require('node:test');
const assert = require('node:assert/strict');

const logic = require('../card-pool-logic.js');

const cards = [
	{id: '核心人族', race: 'Terran', level: 1, packKey: 'core'},
	{id: '普通异虫', race: 'Zerg', level: 2, packKey: 'pack2'},
	{id: '不法之徒', race: 'Terran', level: 1, packKey: 'packSpecial'},
	{id: '母舰核心', race: 'Protess', level: 1, packKey: 'packSpecial'}
];

test('special cards are identified only by their pack key', () => {
	assert.equal(logic.isSpecialCard(cards[2], 'packSpecial'), true);
	assert.equal(logic.isSpecialCard(cards[0], 'packSpecial'), false);
});

test('special group is appended only when special cards are loaded', () => {
	assert.deepEqual(
		logic.appendSpecialGroup(['Terran', 'Zerg'], cards, 'packSpecial', 'Special'),
		['Terran', 'Zerg', 'Special']
	);
	assert.deepEqual(
		logic.appendSpecialGroup(['Terran', 'Zerg'], cards.slice(0, 2), 'packSpecial', 'Special'),
		['Terran', 'Zerg']
	);
});

test('entry groups separate special cards from their real races', () => {
	assert.deepEqual(
		logic.filterEntryCards(cards, 'Terran', 'packSpecial', 'Special').map((card) => card.id),
		['核心人族']
	);
	assert.deepEqual(
		logic.filterEntryCards(cards, 'Special', 'packSpecial', 'Special').map((card) => card.id),
		['不法之徒', '母舰核心']
	);
});

test('recommendation pool excludes used, filtered-level, and special cards', () => {
	assert.deepEqual(
		logic.getRecommendationPool(cards, {'普通异虫': true}, [1], 'packSpecial').map((card) => card.id),
		['核心人族']
	);
});
