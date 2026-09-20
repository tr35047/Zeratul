const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('official registry exposes the special card pack', () => {
	assert.match(appSource, /key:\s*'packSpecial',\s*name:\s*'特殊卡牌',\s*file:\s*'resource\/data\/packSpecial\.js'/);
});

test('page loads card pool logic before the app with current cache keys', () => {
	const logicIndex = indexSource.indexOf('card-pool-logic.js?v=20260919');
	const appIndex = indexSource.indexOf('app.js?v=20260919');
	assert.ok(logicIndex >= 0);
	assert.ok(appIndex > logicIndex);
});

test('app uses special grouping and recommendation filtering helpers', () => {
	assert.match(appSource, /SPECIAL_PACK_KEY\s*=\s*'packSpecial'/);
	assert.match(appSource, /SPECIAL_GROUP\s*=\s*'Special'/);
	assert.match(appSource, /appendSpecialGroup/);
	assert.match(appSource, /filterEntryCards/);
	assert.match(appSource, /getRecommendationPool/);
});
