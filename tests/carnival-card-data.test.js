const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadPack(relativePath, dataKey) {
	const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
	const context = {window: {}};
	vm.runInNewContext(source, context, {filename: relativePath});
	return context.window._packData[dataKey];
}

test('carnival pack contains the confirmed cards', () => {
	const data = loadPack('resource/data/pack12.js', 'pack12');
	const cards = Array.from(data.cards, (card) => ({...card}));

	assert.equal(data.name, '嘉年庆典');
	assert.deepEqual(cards, [
		{id: '及时支援', race: 'Terran', level: 2, number: 6, value: 300},
		{id: '暗色血裔', race: 'Neutral', level: 3, number: 1, value: 500},
		{id: '重置与决定', race: 'Protess', level: 4, number: 7, value: 2450},
		{id: '问了没啊', race: 'Zerg', level: 6, number: 16, value: 775}
	]);
});

test('only official core renames the level-six beast', () => {
	const officialCards = loadPack('resource/data/core.js', 'core').cards;
	const yfCards = loadPack('resource/yf/core_yf.js', 'core').cards;
	const sdfCards = loadPack('resource/sdf/core_sdf.js', 'core_sdf').cards;

	assert.ok(officialCards.some((card) => card.id === '利维坦'));
	assert.equal(officialCards.some((card) => card.id === '凶猛巨兽'), false);
	assert.ok(yfCards.some((card) => card.id === '凶猛巨兽'));
	assert.ok(sdfCards.some((card) => card.id === '凶猛巨兽'));
});

test('carnival pack is registered only for the official server', () => {
	const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
	const officialStart = appSource.indexOf('var PACK_REGISTRY');
	const sdfStart = appSource.indexOf('var SDF_PACK_REGISTRY');
	const yfStart = appSource.indexOf('var YF_PACK_REGISTRY');
	const modesStart = appSource.indexOf('var APP_PACK_MODES');
	const officialRegistry = appSource.slice(officialStart, sdfStart);
	const sdfRegistry = appSource.slice(sdfStart, yfStart);
	const yfRegistry = appSource.slice(yfStart, modesStart);

	assert.match(officialRegistry, /key:\s*'pack12',\s*name:\s*'嘉年庆典',\s*file:\s*'resource\/data\/pack12\.js'/);
	assert.doesNotMatch(sdfRegistry, /pack12|嘉年庆典/);
	assert.doesNotMatch(yfRegistry, /pack12|嘉年庆典/);
});
