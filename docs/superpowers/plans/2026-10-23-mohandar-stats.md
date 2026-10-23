# 莫汉达尔正式服数值调整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将正式服核心包中的“莫汉达尔”改为 4 单位、1400 战力，同时确保亚服数据不变。

**Architecture:** 沿用现有 JavaScript 数据包格式，直接调整正式服 `core.js` 中对应卡牌对象。回归测试分别加载正式服和亚服核心包，以锁定两服差异，避免未来误同步。

**Tech Stack:** 静态 JavaScript 数据文件、Node.js 内置 `node:test`、`assert`、`vm`。

## Global Constraints

- 仅修改正式服“莫汉达尔”的单位数和战力。
- 正式服目标值为 4 单位、1400 战力。
- 亚服继续保持 5 单位、1800 战力。
- 不修改版本号、更新日志或其他卡牌。

---

### Task 1: 锁定并更新两服莫汉达尔数据

**Files:**
- Modify: `tests/core-card-data.test.js`
- Modify: `resource/data/core.js`

**Interfaces:**
- Consumes: 两个数据文件分别写入的 `window._packData.core.cards` 数据数组。
- Produces: 正式服“莫汉达尔” `{number: 4, value: 1400}`，亚服仍为 `{number: 5, value: 1800}`。

- [x] **Step 1: 写入失败的回归测试**

在 `tests/core-card-data.test.js` 增加通用数据加载函数，并新增以下断言：

```js
function loadCards(relativePath, packKey) {
	const source = fs.readFileSync(path.join(__dirname, '..', ...relativePath), 'utf8');
	const context = {window: {}};
	vm.runInNewContext(source, context, {filename: relativePath.join('/')});
	return context.window._packData[packKey].cards;
}

test('Mohandar uses the official-only updated stats', () => {
	const official = loadCards(['resource', 'data', 'core.js'], 'core')
		.find((card) => card.id === '莫汉达尔');
	const yf = loadCards(['resource', 'yf', 'core_yf.js'], 'core')
		.find((card) => card.id === '莫汉达尔');

	assert.ok(official);
	assert.equal(official.number, 4);
	assert.equal(official.value, 1400);
	assert.ok(yf);
	assert.equal(yf.number, 5);
	assert.equal(yf.value, 1800);
});
```

- [x] **Step 2: 运行测试并确认按预期失败**

Run: `node --test tests/core-card-data.test.js`

Expected: FAIL，正式服 `official.number` 实际为 `5`，与期望值 `4` 不符。

- [x] **Step 3: 最小化更新正式服卡牌数据**

将 `resource/data/core.js` 中卡牌对象改为：

```js
{"id":"莫汉达尔","race":"Protess","level":5,"number":4,"value":1400},
```

不修改 `resource/yf/core_yf.js`。

- [x] **Step 4: 运行相关测试并确认通过**

Run: `node --test tests/core-card-data.test.js`

Expected: PASS，全部核心卡数据测试通过。

- [x] **Step 5: 运行完整验证**

Run: `node --check app.js`

Expected: 无输出并以状态码 0 结束。

Run: `node --test tests/*.test.js`

Expected: 所有测试通过，无失败。

Run: `git diff --check`

Expected: 无空白错误。

- [x] **Step 6: 提交实现**

```bash
git add tests/core-card-data.test.js resource/data/core.js
git commit -m "data: update official Mohandar stats"
```
