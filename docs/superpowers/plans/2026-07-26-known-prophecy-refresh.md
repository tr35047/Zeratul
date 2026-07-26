# Known Prophecy Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record repeated known prophecies, persist the official-server game state, and show expected free refreshes in recommendation results without weakening information-gain priority.

**Architecture:** Add a small dependency-free UMD module for deterministic prophecy count, refresh, persistence validation, and recommendation comparison logic. Keep DOM orchestration in the existing `App` IIFE, and add focused markup/styles for the known-prophecy panel and named confirmation modal.

**Tech Stack:** Native HTML, CSS, ES5-compatible JavaScript, Node.js built-in `node:test`, browser `localStorage`.

## Global Constraints

- Preserve the existing static-site architecture: no package manager, framework, bundler, backend, or third-party dependency.
- Prophecies come only from the official core pack and duplicate prophecy cards count independently.
- Show free-refresh counts only in the right-side recommendation area.
- Sort recommendations lexicographically by information gain descending, refresh count descending, then original pool order.
- Changing any expansion pack clears known prophecies, guesses, and manual exclusions.
- Hide era-server controls without deleting era-server code or data.
- Work locally only; do not push to GitHub.

---

### Task 1: Pure prophecy logic and tests

**Files:**
- Create: `prophecy-logic.js`
- Create: `tests/prophecy-logic.test.js`

**Interfaces:**
- Produces `ZeratulProphecyLogic.normalizeCounts(counts, validIds)`.
- Produces `incrementCount(counts, cardId)` and `decrementCount(counts, cardId)` without mutating input.
- Produces `calculateRefreshCount(card, coreCards, counts, isClose)`.
- Produces `compareRecommendations(a, b)` using `infoGain`, `refreshCount`, and `poolIndex`.
- Produces `normalizeStoredState(value, allowedPackKeys)` for safe persistence restoration.

- [ ] **Step 1: Write failing unit tests**

Create tests using `node:test` for invalid count removal, duplicate increment/decrement, duplicate refresh accumulation, lexicographic recommendation ordering, stable pool ordering, and malformed persisted data.

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const logic = require('../prophecy-logic.js');

test('duplicate prophecies contribute independently', () => {
  const entered = {id: 'Probe', race: 'Protess', number: 1, value: 100};
  const core = [{id: 'Oracle', race: 'Protess', number: 9, value: 900}];
  const count = logic.calculateRefreshCount(
    entered,
    core,
    {Oracle: 2},
    (a, b) => a.race === b.race
  );
  assert.equal(count, 2);
});

test('information gain wins before refresh count', () => {
  const highGain = {infoGain: 0.9, refreshCount: 0, poolIndex: 1};
  const highRefresh = {infoGain: 0.8, refreshCount: 20, poolIndex: 0};
  assert.ok(logic.compareRecommendations(highGain, highRefresh) < 0);
});
```

- [ ] **Step 2: Verify tests fail**

Run: `node --test tests/prophecy-logic.test.js`

Expected: FAIL because `prophecy-logic.js` does not exist.

- [ ] **Step 3: Implement the UMD logic module**

Expose the same API to Node tests and `window.ZeratulProphecyLogic`. Validate objects with own properties, retain only positive integer counts for valid core IDs, calculate repeated refresh totals, and normalize persisted arrays and pack keys without throwing.

```js
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ZeratulProphecyLogic = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function compareRecommendations(a, b) {
    return b.infoGain - a.infoGain ||
      b.refreshCount - a.refreshCount ||
      a.poolIndex - b.poolIndex;
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
```

- [ ] **Step 4: Run tests and commit**

Run: `node --test tests/prophecy-logic.test.js`

Expected: all tests PASS.

Commit: `test: add prophecy refresh logic coverage`

---

### Task 2: App state, confirmation flow, and persistence

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Test: `tests/prophecy-logic.test.js`

**Interfaces:**
- Consumes `window.ZeratulProphecyLogic` from Task 1.
- Adds `App.state.knownProphecyCounts` and `App.state.pendingProphecyId`.
- Adds `App.removeKnownProphecy(cardId)`, `clearKnownProphecies()`, `normalizeLoadedState()`, `persist()`, and `restoreState()`.

- [ ] **Step 1: Add persistence validation tests**

Cover wrong versions, malformed JSON-shaped values, invalid packs, invalid counts, non-array guesses, invalid feedback values, exclusions, and numeric recommendation levels.

```js
test('normalizes persisted state without trusting malformed fields', () => {
  const restored = logic.normalizeStoredState({
    version: 1,
    enabledPacks: ['core', 'missing'],
    knownProphecyCounts: {Oracle: 2, Bad: -1},
    guesses: [{cardId: 'Probe', feedback: 'close'}, {cardId: 4, feedback: 'x'}],
    excludedCardIds: ['Oracle', 7],
    predictionLevels: [1, 2, 2, 9]
  }, ['core', 'pack2']);
  assert.deepEqual(restored.enabledPacks, ['core']);
  assert.deepEqual(restored.guesses, [{cardId: 'Probe', feedback: 'close'}]);
  assert.deepEqual(restored.predictionLevels, [1, 2]);
});
```

- [ ] **Step 2: Load the logic module before `app.js`**

Add `<script src="prophecy-logic.js?v=20260726"></script>` immediately before the existing application script.

- [ ] **Step 3: Record the selected candidate**

Give each candidate button `data-cardid`, pass it to `markProphecy(cardId)`, show the selected card name in the modal, and make `confirmProphecy()` increment the count before clearing only `guesses` and `excludedCardIds`.

```js
markProphecy: function (cardId) {
  this.state.pendingProphecyId = cardId;
  this.els.prophecyCardName.textContent = cardId;
  this.els.prophecyModal.style.display = 'block';
},

confirmProphecy: function () {
  var logic = window.ZeratulProphecyLogic;
  this.state.knownProphecyCounts = logic.incrementCount(
    this.state.knownProphecyCounts,
    this.state.pendingProphecyId
  );
  this.state.pendingProphecyId = '';
  this.state.guesses = [];
  this.state.excludedCardIds = [];
  this.hideProphecyModal();
  this.persist();
  this.renderAll();
}
```

- [ ] **Step 4: Implement versioned localStorage**

Use key `zeratul_game_state_v1`. Save version `1`, enabled packs, guesses, exclusions, known counts, and prediction levels. Catch storage and JSON errors. After card loading, remove guesses/exclusions that reference unloaded cards and normalize known counts against official core IDs.

- [ ] **Step 5: Clear the whole game on pack changes**

In the existing pack-toggle handler, clear `knownProphecyCounts`, `guesses`, and `excludedCardIds` before persisting and reloading. Keep the normal reset button scoped to guesses/exclusions only.

- [ ] **Step 6: Run tests and commit**

Run: `node --test tests/prophecy-logic.test.js`

Expected: all tests PASS.

Commit: `feat: persist repeated known prophecies`

---

### Task 3: Known prophecy panel and era control hiding

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`

**Interfaces:**
- Adds cached DOM nodes `knownProphecies`, `clearKnownPropheciesBtn`, and `prophecyCardName`.
- Adds `App.renderKnownProphecies()` and invokes it from `renderAll()`.

- [ ] **Step 1: Add compact markup**

Place `#knownProphecies` before the prediction level filter. Include a compact heading and a hidden clear button. Add `#prophecyCardName` to the confirmation text so the user sees the exact selected card.

```html
<div id="knownProphecies" class="known-prophecies"></div>
```

- [ ] **Step 2: Render aggregated counts and removal controls**

Render only official core cards, sorted by core order. Each row shows `card name xN` and an icon-only remove button with an accessible label/title. Removing decrements one occurrence; clearing all requires `window.confirm`.

- [ ] **Step 3: Style desktop and mobile states**

Add restrained panel styles with maximum width protection, wrapping card names, fixed-size remove controls, and mobile layout rules. Hide both `.server-mode-toggle` elements with CSS while leaving DOM and JavaScript intact.

```css
.server-mode-toggle { display: none; }
.known-prophecy-remove { width: 28px; height: 28px; }
```

- [ ] **Step 4: Syntax check and commit**

Run: `node --check app.js && node --check prophecy-logic.js`

Expected: both files parse successfully.

Commit: `feat: add known prophecy management panel`

---

### Task 4: Refresh-aware recommendations

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Test: `tests/prophecy-logic.test.js`

**Interfaces:**
- Consumes `calculateRefreshCount()` and `compareRecommendations()`.
- Extends each recommendation with `refreshCount` and `poolIndex`.

- [ ] **Step 1: Add complete ordering tests**

Test equal information gain with different refresh counts and equal metrics with different pool indexes.

- [ ] **Step 2: Calculate refresh count per recommendation**

For every pool card, calculate refreshes against official core cards and repeated `knownProphecyCounts`. Store the original `pi` as `poolIndex`, then sort with `compareRecommendations`.

```js
var refreshCount = logic.calculateRefreshCount(
  p,
  this.state.cards.filter(function (card) { return card.isCoreSet; }),
  this.state.knownProphecyCounts,
  function (a, b) { return self.isClose(a, b); }
);
```

- [ ] **Step 3: Render the metric only in recommendations**

Add a secondary `免费刷新 xN` label inside each recommendation item. Do not alter the central card-selection buttons. Keep information gain visually dominant.

- [ ] **Step 4: Run unit tests and commit**

Run: `node --test tests/prophecy-logic.test.js`

Expected: all tests PASS.

Commit: `feat: rank recommendations with refresh tie breaker`

---

### Task 5: End-to-end browser verification and documentation

**Files:**
- Modify: `README.md`
- Modify if defects are found: `app.js`, `styles.css`, `index.html`, `prophecy-logic.js`

**Interfaces:**
- Verifies the complete user workflow under a static server.

- [ ] **Step 1: Update project documentation**

Document repeated known prophecy tracking, free-refresh recommendation labels, local persistence, official-server focus, and `node --test tests/prophecy-logic.test.js`.

- [ ] **Step 2: Run automated verification**

Run:

```powershell
node --test tests/prophecy-logic.test.js
node --check app.js
node --check prophecy-logic.js
```

Expected: all tests pass and both syntax checks exit `0`.

- [ ] **Step 3: Start the local static server**

Run: `python -m http.server 8080`

Expected: server listens on `http://127.0.0.1:8080/`.

- [ ] **Step 4: Verify desktop and mobile workflows**

Using the in-app browser, verify at 1440x900 and 390x844:

1. Era-server controls are hidden.
2. A candidate confirmation shows its name.
3. Confirming the same prophecy twice displays `x2`.
4. Removing once displays `x1`.
5. Recommendations show free-refresh counts and remain information-gain ordered.
6. Reload restores the state.
7. Changing a pack clears known prophecies and current inference.
8. No text overlaps, clipping, blank panels, or console errors occur.

- [ ] **Step 5: Commit final verified state**

Commit: `docs: document known prophecy workflow`
