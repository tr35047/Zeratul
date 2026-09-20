const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadPack(packKey) {
	const source = fs.readFileSync(
		path.join(__dirname, '..', 'resource', 'data', `${packKey}.js`),
		'utf8'
	);
	const context = {window: {}};
	vm.runInNewContext(source, context, {filename: `resource/data/${packKey}.js`});
	return context.window._packData[packKey];
}

test('special pack contains the confirmed official-server cards', () => {
	const data = loadPack('packSpecial');
	const actual = Array.from(data.cards, (card) => ({...card}));
	assert.equal(data.name, '特殊卡牌');
	assert.deepEqual(actual, [
		{id: '不法之徒', race: 'Terran', level: 1, number: 1, value: 500},
		{id: '母舰核心', race: 'Protess', level: 1, number: 6, value: 450},
		{id: '牛牛冲鸭', race: 'Terran', level: 6, number: 1, value: 0},
		{id: '斯旺舰队', race: 'Terran', level: 6, number: 11, value: 4225},
		{id: 'cloudplayer', race: 'Terran', level: 6, number: 5, value: 2075},
		{id: '归天的加多宝', race: 'Zerg', level: 6, number: 24, value: 4850},
		{id: '入景随风', race: 'Zerg', level: 6, number: 5, value: 2400},
		{id: '酒馆后勤处', race: 'Protess', level: 6, number: 3, value: 2400},
		{id: '我叫小明', race: 'Neutral', level: 6, number: 20, value: 800}
	]);
});

test('duo pack no longer contains the level-zero probe', () => {
	const data = loadPack('packDuo1');
	assert.equal(data.cards.some((card) => card.id === '探机'), false);
});
