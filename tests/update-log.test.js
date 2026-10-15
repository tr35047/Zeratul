const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const updateModalStart = indexHtml.indexOf('<div id="updateModal"');
const updateModalEnd = indexHtml.indexOf('<div id="benefitModal"', updateModalStart);

assert.ok(updateModalStart >= 0, 'missing update modal');
assert.ok(updateModalEnd > updateModalStart, 'missing update modal boundary');

const updateModalHtml = indexHtml.slice(updateModalStart, updateModalEnd);

test('update modal shows only the approved V3.1.5 release notes', () => {
	const updateTags = Array.from(
		updateModalHtml.matchAll(/<span class="update-tag [^"]+">([^<]+)<\/span>/g),
		(match) => match[1]
	);

	assert.match(indexHtml, /<h1>Zeratul V3\.1\.5<\/h1>/);
	assert.equal((updateModalHtml.match(/<h2>V3\.1\.5 更新日志<\/h2>/g) || []).length, 1);
	assert.deepEqual(updateTags, ['永久地址', '卡牌更新', '重要提示', '作者「寄」语']);
	assert.match(updateModalHtml, /https:\/\/zeratul-fizkx016x\.maozi\.io\//);
	assert.match(updateModalHtml, /新增“嘉年庆典”拓展包：及时支援、暗色血裔、重置与决定、问了没啊/);
	assert.match(updateModalHtml, /“凶猛巨兽”更名为“利维坦”/);
	assert.match(updateModalHtml, /class="info-tips update-warning">切换拓展包时清空预言记录/);
	assert.match(updateModalHtml, /生活不易, 冰冰叹气/);
	assert.match(updateModalHtml, /如果这个工具有帮助的话, 求点点关注/);
	assert.match(updateModalHtml, /右上角的福利中可以领取雷神50小时加速/);
	assert.doesNotMatch(updateModalHtml, /V3\.1\.[1-4]|预言功能|特殊卡牌|亚服支持|支持记录已猜中的预言牌及重复次数|推荐区显示可触发的免费刷新次数/);
	assert.match(stylesCss, /\.update-warning\s*{[^}]*color:\s*#ff6b6b;/s);
});
