# 嘉年庆典 V3.1.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为正式服新增“嘉年庆典”普通拓展包、将正式服“凶猛巨兽”更名为“利维坦”，并发布精简的 V3.1.5 更新日志。

**Architecture:** 延续现有 `window._packData` 数据文件与正式服 `PACK_REGISTRY` 动态加载机制，不引入新逻辑分支。“嘉年庆典”作为普通拓展包自然进入记牌器、模拟器与推荐池；核心限定机制继续保证它不会进入预言池。

**Tech Stack:** 原生 HTML、CSS、JavaScript，Node.js 内置测试运行器。

## Global Constraints

- 只修改正式服卡牌数据，不修改 `resource/yf` 或 `resource/sdf`。
- 卡包键名固定为 `pack12`，显示名固定为“嘉年庆典”。
- 页面版本固定为 `V3.1.5`。
- 更新日志只保留永久地址、卡牌更新、红色清空提示和作者「寄」语。
- 完整测试通过后以普通快进方式推送到 GitHub `main`，禁止强推。

---

### Task 1: 新卡包与正式服更名

**Files:**
- Create: `resource/data/pack12.js`
- Modify: `resource/data/core.js`
- Modify: `app.js`
- Create: `tests/carnival-card-data.test.js`

**Interfaces:**
- Consumes: `window._packData[packKey] = {name, cards}` 数据格式与 `PACK_REGISTRY`。
- Produces: `window._packData.pack12` 以及正式服核心卡 `利维坦`。

- [ ] **Step 1: 写入失败的数据测试**

```js
test('carnival pack contains the confirmed cards', () => {
	assert.deepEqual(loadPack('pack12').cards, [
		{id: '及时支援', race: 'Terran', level: 2, number: 6, value: 300},
		{id: '暗色血裔', race: 'Neutral', level: 3, number: 1, value: 500},
		{id: '重置与决定', race: 'Protess', level: 4, number: 7, value: 2450},
		{id: '问了没啊', race: 'Zerg', level: 6, number: 16, value: 775}
	]);
});

test('only official core renames the level-six beast', () => {
	assert.ok(loadPack('core', 'resource/data').cards.some((card) => card.id === '利维坦'));
	assert.ok(loadPack('core', 'resource/yf', 'core_yf.js').cards.some((card) => card.id === '凶猛巨兽'));
	assert.ok(loadPack('core_sdf', 'resource/sdf').cards.some((card) => card.id === '凶猛巨兽'));
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/carnival-card-data.test.js`

Expected: 因 `resource/data/pack12.js` 不存在且正式服仍使用旧名称而失败。

- [ ] **Step 3: 添加卡包、注册表与更名**

```js
window._packData["pack12"] = {"name":"嘉年庆典","cards":[
{"id":"及时支援","race":"Terran","level":2,"number":6,"value":300},
{"id":"暗色血裔","race":"Neutral","level":3,"number":1,"value":500},
{"id":"重置与决定","race":"Protess","level":4,"number":7,"value":2450},
{"id":"问了没啊","race":"Zerg","level":6,"number":16,"value":775}
]};
```

在正式服 `PACK_REGISTRY` 中加入：

```js
{key: 'pack12', name: '嘉年庆典', file: 'resource/data/pack12.js'}
```

将 `resource/data/core.js` 中唯一的 `"id":"凶猛巨兽"` 改为 `"id":"利维坦"`，其他字段不变。

- [ ] **Step 4: 运行数据测试并确认通过**

Run: `node --test tests/carnival-card-data.test.js tests/core-card-data.test.js`

Expected: 全部通过。

- [ ] **Step 5: 提交数据变更**

```bash
git add app.js resource/data/core.js resource/data/pack12.js
git add -f tests/carnival-card-data.test.js
git commit -m "data: add carnival expansion pack"
```

### Task 2: V3.1.5 页面与更新日志

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `tests/update-log.test.js`
- Modify: `tests/prophecy-logic.test.js`

**Interfaces:**
- Consumes: `.update-warning` 红色提示样式。
- Produces: V3.1.5 标题、缓存版本和批准的四个更新日志区块。

- [ ] **Step 1: 将更新日志测试改为 V3.1.5 预期**

```js
assert.match(indexHtml, /<h1>Zeratul V3\.1\.5<\/h1>/);
assert.deepEqual(updateTags, ['永久地址', '卡牌更新', '重要提示', '作者「寄」语']);
assert.match(updateModalHtml, /新增“嘉年庆典”拓展包：及时支援、暗色血裔、重置与决定、问了没啊/);
assert.match(updateModalHtml, /“凶猛巨兽”更名为“利维坦”/);
assert.match(updateModalHtml, /class="info-tips update-warning">切换拓展包时清空预言记录/);
```

- [ ] **Step 2: 运行更新日志测试并确认失败**

Run: `node --test tests/update-log.test.js tests/prophecy-logic.test.js`

Expected: 因页面仍为 V3.1.4 且保留旧区块而失败。

- [ ] **Step 3: 更新页面标题、日志与缓存版本**

```html
<h1>Zeratul V3.1.5</h1>
<span class="update-tag tag-new">卡牌更新</span>
<span class="info-tips">新增“嘉年庆典”拓展包：及时支援、暗色血裔、重置与决定、问了没啊</span>
<span class="info-tips">“凶猛巨兽”更名为“利维坦”</span>
<span class="update-tag tag-new">重要提示</span>
<span class="info-tips update-warning">切换拓展包时清空预言记录</span>
```

将 `ASSET_VERSION`、`styles.css`、`card-pool-logic.js` 和 `app.js` 的查询版本统一更新为 `20261015`。

- [ ] **Step 4: 运行日志测试并确认通过**

Run: `node --test tests/update-log.test.js tests/prophecy-logic.test.js`

Expected: 全部通过。

- [ ] **Step 5: 提交 V3.1.5 页面变更**

```bash
git add app.js index.html tests/update-log.test.js tests/prophecy-logic.test.js
git commit -m "docs: publish V3.1.5 release notes"
```

### Task 3: 文档、浏览器验证与发布

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: 已注册的 `pack12` 与 V3.1.5 页面。
- Produces: 与实际数据一致的项目文档及已验证的 GitHub `main`。

- [ ] **Step 1: 更新 README**

将版本改为 V3.1.5，将 `pack12` 加入可选列表和目录树；数据包统计改为 14 个脚本、161 张仓库卡牌，正式服改为 12 个数据包、153 张可加载卡牌。

- [ ] **Step 2: 运行完整自动化验证**

Run: `node --check app.js && node --test tests/*.test.js && git diff --check`

Expected: 所有测试通过、语法检查通过且无空白错误。

- [ ] **Step 3: 浏览器验证两套入口**

在本地静态服务器验证：

- 正式服卡包列表出现“嘉年庆典”，亚服不出现。
- 记牌器启用后四张卡分别出现在人族 2 本、中立 3 本、星灵 4 本、异虫 6 本。
- 模拟器启用后同样显示四张卡。
- 核心异虫 6 本显示“利维坦”，候选预言表也显示“利维坦”。
- 更新日志为 V3.1.5，仅包含批准的四个区块，提示文字为红色。
- 控制台没有错误或警告。

- [ ] **Step 4: 提交文档**

```bash
git add README.md
git commit -m "docs: document carnival expansion pack"
```

- [ ] **Step 5: 发布到 main**

```bash
git fetch origin
git rev-list --left-right --count origin/main...HEAD
git push origin HEAD:main
git fetch origin
git rev-parse origin/main
```

Expected: 推送为普通快进，`origin/main` 与 `HEAD` 指向同一提交。
