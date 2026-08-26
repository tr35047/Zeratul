const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCoreCards() {
	const source = fs.readFileSync(
		path.join(__dirname, '..', 'resource', 'data', 'core.js'),
		'utf8'
	);
	const context = {window: {}};
	vm.runInNewContext(source, context, {filename: 'resource/data/core.js'});
	return context.window._packData.core.cards;
}

test('official core cards match the updated in-game stats', () => {
	const cards = loadCoreCards();
	const expected = {
		'凶残巨兽': {race: 'Zerg', level: 3, number: 1, value: 500},
		'地雷禁区': {race: 'Terran', level: 3, number: 2, value: 300},
		'虚空大军': {race: 'Neutral', level: 3, number: 6, value: 950}
	};

	Object.keys(expected).forEach((cardId) => {
		const card = cards.find((candidate) => candidate.id === cardId);
		assert.ok(card, `missing ${cardId}`);
		assert.deepEqual(
			{
				race: card.race,
				level: card.level,
				number: card.number,
				value: card.value
			},
			expected[cardId]
		);
	});
});

test('official core card ids are unique and fields remain valid', () => {
	const cards = loadCoreCards();
	const ids = new Set();

	cards.forEach((card) => {
		assert.equal(typeof card.id, 'string');
		assert.ok(card.id.length > 0);
		assert.ok(!ids.has(card.id), `duplicate card id: ${card.id}`);
		ids.add(card.id);
		assert.ok(['Protess', 'Terran', 'Zerg', 'Neutral'].includes(card.race));
		assert.ok(Number.isInteger(card.level) && card.level > 0);
		assert.ok(Number.isInteger(card.number) && card.number >= 0);
		assert.ok(Number.isInteger(card.value) && card.value >= 0);
	});
});
