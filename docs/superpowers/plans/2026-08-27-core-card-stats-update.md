# 正式服核心卡数值更新实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将正式服核心包中凶残巨兽、地雷禁区和虚空大军的初始单位数与初始战力更新为游戏内卡面值。

**Architecture:** 保持现有 `window._packData` 静态数据结构不变，使用 Node.js `vm` 在隔离上下文中真实加载核心包脚本，并对目标卡数值及全包基本完整性建立回归测试。生产改动仅修改 `resource/data/core.js` 中三条记录。

**Tech Stack:** 原生 JavaScript、Node.js 内置 `node:test` / `assert` / `vm`、静态 HTML 页面。

## Global Constraints

- 仅修改正式服 `resource/data/core.js` 中三张目标卡的 `number` 和 `value`。
- 凶残巨兽更新为 `number: 1, value: 500`。
- 地雷禁区更新为 `number: 2, value: 300`。
- 虚空大军更新为 `number: 6, value: 950`。
- 保持卡牌名称、种族、等级和排列位置不变。
- 不修改 `resource/sdf/core_sdf.js` 或任何时代服数据。
- 不修改推理规则、界面或其他卡牌。

---

### Task 1: 核心包数据回归测试与数值修正

**Files:**
- Create: `tests/core-card-data.test.js`
- Modify: `resource/data/core.js:31`
- Modify: `resource/data/core.js:58`
- Modify: `resource/data/core.js:80`

**Interfaces:**
- Consumes: `window._packData.core.cards`，每张卡包含 `id`、`race`、`level`、`number`、`value`。
- Produces: 三张目标卡的校正数据，以及可重复执行的正式服核心包完整性测试。

- [ ] **Step 1: 写入目标数值与完整性失败测试**

创建 `tests/core-card-data.test.js`：

```js
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
```

- [ ] **Step 2: 运行测试并确认旧数据失败**

Run:

```powershell
node --test tests/core-card-data.test.js
```

Expected: `official core cards match the updated in-game stats` 失败，报告至少一张目标卡的 `number` 或 `value` 与预期不一致；完整性测试通过。

- [ ] **Step 3: 最小修改三条正式服数据**

在 `resource/data/core.js` 中保持其他字段和顺序不变，仅替换为：

```js
{"id":"凶残巨兽","race":"Zerg","level":3,"number":1,"value":500},
{"id":"地雷禁区","race":"Terran","level":3,"number":2,"value":300},
{"id":"虚空大军","race":"Neutral","level":3,"number":6,"value":950},
```

- [ ] **Step 4: 运行数据测试并确认通过**

Run:

```powershell
node --test tests/core-card-data.test.js
```

Expected: 2 tests pass, 0 fail。

- [ ] **Step 5: 运行项目全量自动验证**

Run:

```powershell
node --test tests/*.test.js
node --check app.js
node --check prophecy-logic.js
git diff --check
```

Expected: 所有测试通过，两份 JavaScript 语法检查退出码为 `0`，差异检查无错误。

- [ ] **Step 6: 在本地静态页面核对显示值**

启动或复用本地静态服务器，在桌面视口读取三张卡的候选表行，确认显示：

```text
凶残巨兽 / 异虫 / 1 / 500
地雷禁区 / 人族 / 2 / 300
虚空大军 / 中立 / 6 / 950
```

Expected: 页面无控制台错误，三张卡显示值与数据测试一致。

- [ ] **Step 7: 提交实现**

```powershell
git add tests/core-card-data.test.js resource/data/core.js
git commit -m "data: update core card starting stats"
```

---

### Task 2: 发布至 GitHub

**Files:**
- No file changes.

**Interfaces:**
- Consumes: 已验证的 `data/core-card-stats-2026-08-27` 分支。
- Produces: 指向 `main` 的 Pull Request 和合并后的正式服数据提交。

- [ ] **Step 1: 推送分支**

```powershell
git push -u origin data/core-card-stats-2026-08-27
```

Expected: 远程分支创建成功，本地分支开始跟踪同名远程分支。

- [ ] **Step 2: 创建 Pull Request**

创建目标为 `main`、来源为 `data/core-card-stats-2026-08-27` 的 Pull Request，说明三张卡的新旧数值、截图依据和验证命令。

Expected: PR 状态为 `OPEN` 且 `MERGEABLE`。

- [ ] **Step 3: 合并并回读远程状态**

在无冲突且检查通过时使用标准 merge commit 合并，保留功能分支，然后读取 PR 与远程 `main`。

Expected: PR 状态为 `MERGED`，`refs/heads/main` 指向返回的 merge commit。
