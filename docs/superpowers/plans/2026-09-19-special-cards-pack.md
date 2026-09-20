# Special Cards Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the level-zero Probe from Twin Dog, add the nine-card official-server Special Cards pack, show those cards in a separate entry-selector group, and exclude them from prophecy candidates and recommendations.

**Architecture:** Add `resource/data/packSpecial.js` as an ordinary official-server pack whose cards retain their real races. Add a small UMD module, `card-pool-logic.js`, that centralizes pack-key-based entry grouping and recommendation filtering; both the tracker and simulator call this module while their prophecy pools remain core-only.

**Tech Stack:** Static HTML, vanilla JavaScript, UMD modules, Node.js built-in test runner and assertions.

## Global Constraints

- Use the hard-coded pack key `packSpecial`; do not add a fake race or per-card grouping metadata.
- The pack label is `特殊卡牌`; the entry-selector group label is `特殊`.
- Preserve every special card's real `race` for history and prophecy matching.
- Append the special group after each interface's existing normal-race order without reordering those races.
- Apply the special entry group to both the tracker and simulator.
- Exclude all `packSpecial` cards from tracker recommendations.
- Keep tracker and simulator prophecy pools core-only.
- Change official-server data only; do not modify SDF or YF registries or data.
- Remove the level-zero Probe from `同卵双狗`.

---

### Task 1: Update official card-pack data

**Files:**
- Create: `resource/data/packSpecial.js`
- Create: `tests/special-card-data.test.js`
- Modify: `resource/data/packDuo1.js:3`

**Interfaces:**
- Consumes: Existing `window._packData[packKey] = {name, cards}` data format.
- Produces: `window._packData.packSpecial` with nine validated cards and a Twin Dog pack with no Probe or level-zero card.

- [ ] **Step 1: Write failing data tests**

Create `tests/special-card-data.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadPack(relativePath, packKey) {
	const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
	const context = {window: {}};
	vm.runInNewContext(source, context, {filename: relativePath});
	return context.window._packData[packKey];
}

test('Twin Dog contains no Probe or level-zero card', () => {
	const pack = loadPack('resource/data/packDuo1.js', 'packDuo1');
	assert.ok(pack.cards.every((card) => card.id !== '探机'));
	assert.ok(pack.cards.every((card) => card.level > 0));
});

test('Special Cards contains exactly the approved rare cards', () => {
	const pack = loadPack('resource/data/packSpecial.js', 'packSpecial');
	const actual = Object.fromEntries(pack.cards.map((card) => [card.id, {
		race: card.race,
		level: card.level,
		number: card.number,
		value: card.value
	}]));
	assert.equal(pack.name, '特殊卡牌');
	assert.deepEqual(actual, {
		'不法之徒': {race: 'Terran', level: 1, number: 1, value: 500},
		'母舰核心': {race: 'Protess', level: 1, number: 6, value: 450},
		'牛牛冲鸭': {race: 'Terran', level: 6, number: 1, value: 0},
		'斯旺舰队': {race: 'Terran', level: 6, number: 11, value: 4225},
		'cloudplayer': {race: 'Terran', level: 6, number: 5, value: 2075},
		'归天的加多宝': {race: 'Zerg', level: 6, number: 24, value: 4850},
		'入景随风': {race: 'Zerg', level: 6, number: 5, value: 2400},
		'酒馆后勤处': {race: 'Protess', level: 6, number: 3, value: 2400},
		'我叫小明': {race: 'Neutral', level: 6, number: 20, value: 800}
	});
});
```

- [ ] **Step 2: Run the data tests and verify RED**

Run:

```powershell
& 'C:\Users\wuaoz\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests\special-card-data.test.js
```

Expected: FAIL because Twin Dog still contains Probe and `resource/data/packSpecial.js` does not exist.

- [ ] **Step 3: Remove Probe and add the special pack**

Delete this record from `resource/data/packDuo1.js`:

```javascript
{"id":"探机","race":"Neutral","level":0,"number":6,"value":300},
```

Create `resource/data/packSpecial.js`:

```javascript
window._packData = window._packData || {};
window._packData["packSpecial"] = {"name":"特殊卡牌","cards":[
{"id":"不法之徒","race":"Terran","level":1,"number":1,"value":500},
{"id":"母舰核心","race":"Protess","level":1,"number":6,"value":450},
{"id":"牛牛冲鸭","race":"Terran","level":6,"number":1,"value":0},
{"id":"斯旺舰队","race":"Terran","level":6,"number":11,"value":4225},
{"id":"cloudplayer","race":"Terran","level":6,"number":5,"value":2075},
{"id":"归天的加多宝","race":"Zerg","level":6,"number":24,"value":4850},
{"id":"入景随风","race":"Zerg","level":6,"number":5,"value":2400},
{"id":"酒馆后勤处","race":"Protess","level":6,"number":3,"value":2400},
{"id":"我叫小明","race":"Neutral","level":6,"number":20,"value":800}
]};
```

- [ ] **Step 4: Run the data tests and verify GREEN**

Run the command from Step 2.

Expected: PASS, 2 tests and 0 failures.

- [ ] **Step 5: Commit the data change**

```powershell
git add -- resource/data/packDuo1.js resource/data/packSpecial.js tests/special-card-data.test.js
git commit -m "data: add special card pack"
```

---

### Task 2: Add tested pack-key grouping helpers

**Files:**
- Create: `card-pool-logic.js`
- Create: `tests/card-pool-logic.test.js`
- Modify: `index.html:309`

**Interfaces:**
- Consumes: Card objects with `race`, `level`, and runtime `packKey` fields.
- Produces: `window.ZeratulCardPoolLogic` and CommonJS exports:
  - `isSpecialCard(card, specialPackKey): boolean`
  - `appendSpecialGroup(normalGroups, cards, specialPackKey, specialGroup): string[]`
  - `filterEntryCards(cards, selectedGroup, specialPackKey, specialGroup): Card[]`
  - `getRecommendationPool(cards, usedIds, predictionLevels, specialPackKey): Card[]`

- [ ] **Step 1: Write failing helper tests**

Create `tests/card-pool-logic.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const logic = require('../card-pool-logic.js');

const cards = [
	{id: '普通人族', race: 'Terran', level: 1, packKey: 'core'},
	{id: '不法之徒', race: 'Terran', level: 1, packKey: 'packSpecial'},
	{id: '母舰核心', race: 'Protess', level: 1, packKey: 'packSpecial'},
	{id: '牛牛冲鸭', race: 'Terran', level: 6, packKey: 'packSpecial'}
];

test('special group is appended without reordering normal groups', () => {
	assert.deepEqual(
		logic.appendSpecialGroup(['Neutral', 'Protess', 'Terran'], cards, 'packSpecial', 'Special'),
		['Neutral', 'Protess', 'Terran', 'Special']
	);
	assert.deepEqual(
		logic.appendSpecialGroup(['Neutral', 'Protess', 'Terran'], cards.slice(0, 1), 'packSpecial', 'Special'),
		['Neutral', 'Protess', 'Terran']
	);
});

test('normal groups exclude special-pack cards while Special includes them', () => {
	assert.deepEqual(
		logic.filterEntryCards(cards, 'Terran', 'packSpecial', 'Special').map((card) => card.id),
		['普通人族']
	);
	assert.deepEqual(
		logic.filterEntryCards(cards, 'Special', 'packSpecial', 'Special').map((card) => card.id),
		['不法之徒', '母舰核心', '牛牛冲鸭']
	);
});

test('recommendation pool always excludes special-pack cards', () => {
	assert.deepEqual(
		logic.getRecommendationPool(cards, {}, [], 'packSpecial').map((card) => card.id),
		['普通人族']
	);
	assert.deepEqual(
		logic.getRecommendationPool(cards, {'普通人族': true}, [], 'packSpecial'),
		[]
	);
});
```

- [ ] **Step 2: Run helper tests and verify RED**

Run:

```powershell
& 'C:\Users\wuaoz\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests\card-pool-logic.test.js
```

Expected: FAIL because `card-pool-logic.js` does not exist.

- [ ] **Step 3: Implement the pure helper module**

Create `card-pool-logic.js`:

```javascript
(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	if (root) root.ZeratulCardPoolLogic = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

	function isSpecialCard(card, specialPackKey) {
		return !!card && card.packKey === specialPackKey;
	}

	function appendSpecialGroup(normalGroups, cards, specialPackKey, specialGroup) {
		var groups = (normalGroups || []).slice();
		var hasSpecial = (cards || []).some(function (card) {
			return isSpecialCard(card, specialPackKey);
		});
		if (hasSpecial && groups.indexOf(specialGroup) === -1) groups.push(specialGroup);
		return groups;
	}

	function filterEntryCards(cards, selectedGroup, specialPackKey, specialGroup) {
		return (cards || []).filter(function (card) {
			if (selectedGroup === specialGroup) return isSpecialCard(card, specialPackKey);
			return !isSpecialCard(card, specialPackKey) && card.race === selectedGroup;
		});
	}

	function getRecommendationPool(cards, usedIds, predictionLevels, specialPackKey) {
		var levels = Array.isArray(predictionLevels) ? predictionLevels : [];
		return (cards || []).filter(function (card) {
			if (isSpecialCard(card, specialPackKey)) return false;
			if (usedIds && usedIds[card.id]) return false;
			return levels.length === 0 || levels.indexOf(card.level) !== -1;
		});
	}

	return {
		isSpecialCard: isSpecialCard,
		appendSpecialGroup: appendSpecialGroup,
		filterEntryCards: filterEntryCards,
		getRecommendationPool: getRecommendationPool
	};
}));
```

- [ ] **Step 4: Load the helper before `app.js`**

Add this script between `prophecy-logic.js` and `app.js` in `index.html`:

```html
<script src="card-pool-logic.js?v=20260919"></script>
```

- [ ] **Step 5: Run helper tests and syntax checks**

```powershell
$node = 'C:\Users\wuaoz\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node --test tests\card-pool-logic.test.js
& $node --check card-pool-logic.js
```

Expected: 3 tests pass and syntax check exits successfully.

- [ ] **Step 6: Commit the helper module**

```powershell
git add -- card-pool-logic.js index.html tests/card-pool-logic.test.js
git commit -m "feat: add special card pool helpers"
```

---

### Task 3: Integrate the special pack into tracker and simulator

**Files:**
- Modify: `app.js:8-60`
- Modify: `app.js:912-955`
- Modify: `app.js:1145-1220`
- Modify: `app.js:1785-1830`
- Modify: `app.js:2078-2130`
- Modify: `index.html:311`
- Test: `tests/card-pool-logic.test.js`
- Create: `tests/special-card-integration.test.js`

**Interfaces:**
- Consumes: `window.ZeratulCardPoolLogic` from Task 2 and `window._packData.packSpecial` from Task 1.
- Produces: Official pack registration, `Special` selector behavior in both apps, and a recommendation pool that cannot contain special cards.

- [ ] **Step 1: Write a failing integration wiring test**

Create `tests/special-card-integration.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('official app registers and wires the special pack rules', () => {
	assert.match(appSource, /var SPECIAL_PACK_KEY = 'packSpecial'/);
	assert.match(appSource, /key: SPECIAL_PACK_KEY, name: '特殊卡牌', file: 'resource\/data\/packSpecial\.js'/);
	assert.match(appSource, /ZeratulCardPoolLogic\.getRecommendationPool/);
	assert.match(appSource, /ZeratulCardPoolLogic\.appendSpecialGroup/);
	assert.match(appSource, /ZeratulCardPoolLogic\.filterEntryCards/);
	assert.ok(indexHtml.indexOf('card-pool-logic.js') < indexHtml.indexOf('app.js'));
});
```

- [ ] **Step 2: Run the integration test and verify RED**

Run:

```powershell
& 'C:\Users\wuaoz\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests\special-card-integration.test.js
```

Expected: FAIL because `app.js` has not registered `packSpecial` or called the card-pool helpers.

- [ ] **Step 3: Register constants, labels, and the official pack**

In `app.js`, add:

```javascript
var SPECIAL_PACK_KEY = 'packSpecial';
var SPECIAL_GROUP = 'Special';
```

Extend `RACE_CN` without changing existing entries:

```javascript
'Special': '特殊'
```

Append this entry to official `PACK_REGISTRY` only:

```javascript
{key: SPECIAL_PACK_KEY, name: '特殊卡牌', file: 'resource/data/packSpecial.js'}
```

Set a new asset version so dynamic pack loads do not reuse stale data:

```javascript
var ASSET_VERSION = '20260919';
```

- [ ] **Step 4: Exclude the special pack from tracker recommendations**

Replace the inline recommendation-pool filter in `calcRecommendations()` with:

```javascript
var pool = window.ZeratulCardPoolLogic.getRecommendationPool(
	cards,
	usedIds,
	predictionLevels,
	SPECIAL_PACK_KEY
);
```

Do not change `getCandidates()`; its existing `c.isCoreSet` condition is the required prophecy-candidate guard.

- [ ] **Step 5: Apply special grouping to the tracker selector**

In `renderRaceLevelSelectors()`:

1. Build the existing alphabetically sorted normal-race list from cards whose `packKey !== SPECIAL_PACK_KEY`.
2. Call `appendSpecialGroup(normalGroups, this.state.cards, SPECIAL_PACK_KEY, SPECIAL_GROUP)`.
3. Use `filterEntryCards(this.state.cards, selRace, SPECIAL_PACK_KEY, SPECIAL_GROUP)` to derive levels.

In `renderCardButtons()`, replace direct `c.race === sr` filtering with:

```javascript
var cards = window.ZeratulCardPoolLogic.filterEntryCards(
	this.state.cards,
	sr,
	SPECIAL_PACK_KEY,
	SPECIAL_GROUP
).filter(function (card) {
	return String(card.level) === sl;
}).sort(function (a, b) {
	return a.number - b.number || a.value - b.value;
});
```

- [ ] **Step 6: Apply the same grouping to simulator selection**

Add simulator helpers that preserve the simulator's current normal-race order:

```javascript
getEntryGroups: function (cards) {
	var logic = window.ZeratulCardPoolLogic;
	var normalCards = (cards || []).filter(function (card) {
		return !logic.isSpecialCard(card, SPECIAL_PACK_KEY);
	});
	return logic.appendSpecialGroup(
		this.getRaces(normalCards),
		cards,
		SPECIAL_PACK_KEY,
		SPECIAL_GROUP
	);
},

getEntryCards: function (cards, selectedGroup) {
	return window.ZeratulCardPoolLogic.filterEntryCards(
		cards,
		selectedGroup,
		SPECIAL_PACK_KEY,
		SPECIAL_GROUP
	);
},
```

Use `getEntryGroups(cards)` in `ensureEntrySelection()` and `renderEntrySelectors()`. Use `getEntryCards(cards, this.state.selectedRace)` for level validation, selected-card validation, and card-button rendering.

Do not change `state.coreCards`, `pickNewProphecy()`, `getPredictPool()`, or `getCoreCardById()`.

- [ ] **Step 7: Bump the application script cache key**

Update the existing `app.js` script tag in `index.html` to:

```html
<script src="app.js?v=20260919"></script>
```

- [ ] **Step 8: Run focused automated verification**

```powershell
$node = 'C:\Users\wuaoz\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node --test tests\special-card-data.test.js tests\card-pool-logic.test.js tests\special-card-integration.test.js tests\core-card-data.test.js tests\prophecy-logic.test.js
& $node --check app.js
& $node --check card-pool-logic.js
& $node --check resource\data\packSpecial.js
& $node --check resource\data\packDuo1.js
git diff --check
```

Expected: All new data and helper tests pass. If the known pre-existing stylesheet cache assertion still expects `styles.css?v=20260726` while `index.html` uses `20260730`, report it separately and do not alter it as part of this feature.

- [ ] **Step 9: Commit the integration**

```powershell
git add -- app.js index.html tests/special-card-integration.test.js
git commit -m "feat: group special entry cards"
```

---

### Task 4: Update documentation and verify both interfaces

**Files:**
- Modify: `README.md:20-30`
- Modify: `README.md:190-230`

**Interfaces:**
- Consumes: Completed official pack registration and selector behavior.
- Produces: Accurate repository documentation and browser evidence for tracker and simulator behavior.

- [ ] **Step 1: Update README pack documentation**

Add `packSpecial` to the enabled official-pack list and directory tree. Add a data table row:

```markdown
| `packSpecial.js` | 特殊卡牌 | 9 | 启用 |
```

Update Twin Dog's card count from `7` to `6`, then recalculate the documented total script/card counts from the actual official data files rather than copying the prior totals.

- [ ] **Step 2: Run the complete automated checks**

Run the commands from Task 3 Step 8, plus:

```powershell
git diff --check
git status --short
```

Expected: No new failures, syntax errors, or whitespace errors. Document any unrelated pre-existing test failure precisely.

- [ ] **Step 3: Verify tracker behavior in a local browser**

Serve the repository at `http://127.0.0.1:8080/` and verify:

1. With `特殊卡牌` disabled, no `特殊` group is visible.
2. Enable `特殊卡牌`; `特殊` appears after all existing normal groups.
3. `特殊` level 1 shows only `不法之徒` and `母舰核心`; level 6 shows the seven confirmed champions.
4. Normal race groups do not show any of those nine cards.
5. Enter `不法之徒`; history displays its real race as `人族` and inference updates normally.
6. No special card appears in `精准预测` recommendations or `可能的预言牌`.
7. Disable the pack while `特殊` is selected; selection falls back safely and the special group disappears.

- [ ] **Step 4: Verify simulator behavior in the same browser**

1. Enable `特殊卡牌`; `特殊` appears last.
2. Confirm the same 2 level-one and 7 level-six cards.
3. Enter one special card and confirm its real race participates in knife matching.
4. Open the prophecy prediction modal and confirm no special card appears.
5. Confirm no browser console errors or warnings were introduced.

- [ ] **Step 5: Commit documentation**

```powershell
git add -- README.md
git commit -m "docs: document special cards pack"
```

- [ ] **Step 6: Request review and finish the branch**

Use `requesting-code-review` against `origin/main...HEAD`, address all Critical and Important findings, rerun focused verification, then use `finishing-a-development-branch` to present integration options.
