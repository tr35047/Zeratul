const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const updateModalStart = indexHtml.indexOf('<div id="updateModal"');
const updateModalEnd = indexHtml.indexOf('<div id="benefitModal"', updateModalStart);

assert.ok(updateModalStart >= 0, 'missing update modal');
assert.ok(updateModalEnd > updateModalStart, 'missing update modal boundary');

const updateModalHtml = indexHtml.slice(updateModalStart, updateModalEnd);

test('update modal shows only the approved V3.1.2 release notes', () => {
	const updateTags = Array.from(
		updateModalHtml.matchAll(/<span class="update-tag [^"]+">([^<]+)<\/span>/g),
		(match) => match[1]
	);

	assert.equal((updateModalHtml.match(/<h2>V3\.1\.2 更新日志<\/h2>/g) || []).length, 1);
	assert.deepEqual(updateTags, ['永久地址', '预言功能', '卡牌调整', '作者「寄」语']);
	assert.match(updateModalHtml, /支持记录已猜中的预言牌及重复次数/);
	assert.match(updateModalHtml, /推荐区显示可触发的免费刷新次数/);
	assert.match(updateModalHtml, /推荐排序优先信息增益，再比较刷新次数/);
	assert.match(updateModalHtml, /切换拓展包时清空预言记录/);
	assert.match(updateModalHtml, /凶残巨兽：单位数 1，战力 500/);
	assert.match(updateModalHtml, /地雷禁区：单位数 2，战力 300/);
	assert.match(updateModalHtml, /虚空大军：单位数 6，战力 950/);
	assert.doesNotMatch(updateModalHtml, /V3\.1\.1|时代服|正式服|模拟器|优化精准预测算法|修复卡牌价值等于200时判定失败问题/);
});
