# “随机应变”正式服核心卡 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 向正式服核心包新增中立六本卡“随机应变”，数值为 5 单位、3000 战力，并确保亚服不包含该卡。

**Architecture:** 沿用现有核心包 JavaScript 数据格式，将新卡作为普通正式服核心卡写入 `window._packData.core.cards`。回归测试分别加载正式服与亚服核心数据，锁定字段和服务器范围；应用现有逻辑会自动让该卡进入记牌器、模拟器、预言池及推荐池。

**Tech Stack:** 静态 JavaScript 数据、Node.js 内置 `node:test`、`assert`、`vm`。

## Global Constraints

- 卡牌名为“随机应变”。
- 种族为中立（`Neutral`），等级为 6，单位数为 5，战力为 3000。
- 仅正式服核心包包含该卡，亚服不得出现。
- 该卡作为普通核心卡参与记牌器、模拟器、预言及推荐。
- 不修改版本号、更新日志或其他卡牌。

---

### Task 1: 新增正式服核心卡并锁定服务器范围

**Files:**
- Modify: `tests/core-card-data.test.js`
- Modify: `resource/data/core.js`

**Interfaces:**
- Consumes: 正式服和亚服文件中的 `window._packData.core.cards`。
- Produces: 正式服卡牌对象 `{"id":"随机应变","race":"Neutral","level":6,"number":5,"value":3000}`，亚服无同名卡。

- [ ] **Step 1: 写入失败的回归测试**

在 `tests/core-card-data.test.js` 追加：

```js
test('Adapt on the Fly is an official-only core card', () => {
	const official = loadCards(['resource', 'data', 'core.js'], 'core');
	const yf = loadCards(['resource', 'yf', 'core_yf.js'], 'core');
	const card = official.find((candidate) => candidate.id === '随机应变');

	assert.ok(card, 'missing 随机应变 from official core');
	assert.deepEqual(
		{
			race: card.race,
			level: card.level,
			number: card.number,
			value: card.value
		},
		{race: 'Neutral', level: 6, number: 5, value: 3000}
	);
	assert.equal(yf.some((candidate) => candidate.id === '随机应变'), false);
});
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `node --test tests/core-card-data.test.js`

Expected: FAIL，错误信息包含 `missing 随机应变 from official core`。

- [ ] **Step 3: 最小化新增正式服卡牌数据**

在 `resource/data/core.js` 的中立六本卡区域加入：

```js
{"id":"随机应变","race":"Neutral","level":6,"number":5,"value":3000},
```

不修改 `resource/yf/core_yf.js`。

- [ ] **Step 4: 运行相关测试并确认通过**

Run: `node --test tests/core-card-data.test.js`

Expected: PASS，核心卡数据测试全部通过。

- [ ] **Step 5: 运行完整验证**

Run: `node --check app.js`

Expected: 状态码 0。

Run: `node --test tests/*.test.js`

Expected: 所有测试通过，无失败。

Run: `git diff --check`

Expected: 无空白错误。

- [ ] **Step 6: 提交实现**

```bash
git add tests/core-card-data.test.js resource/data/core.js
git commit -m "data: add Adapt on the Fly core card"
```

### Task 2: 上传正式服核心卡更新

**Files:**
- No file changes.

**Interfaces:**
- Consumes: 已通过测试的当前分支提交。
- Produces: GitHub `origin/main` 与本地 `HEAD` 指向同一提交。

- [ ] **Step 1: 同步并验证快进关系**

Run: `git fetch origin && git merge-base --is-ancestor origin/main HEAD`

Expected: 状态码 0，说明可以普通快进推送。

- [ ] **Step 2: 推送至 GitHub main**

Run: `git push origin HEAD:main`

Expected: 普通快进成功，不使用强制推送。

- [ ] **Step 3: 回读远端提交**

Run: `git fetch origin && git rev-parse HEAD && git rev-parse origin/main`

Expected: 两个提交哈希完全一致。
