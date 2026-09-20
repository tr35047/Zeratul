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

test('update modal shows only the approved V3.1.4 release notes', () => {
	const updateTags = Array.from(
		updateModalHtml.matchAll(/<span class="update-tag [^"]+">([^<]+)<\/span>/g),
		(match) => match[1]
	);

	assert.match(indexHtml, /<h1>Zeratul V3\.1\.4<\/h1>/);
	assert.equal((updateModalHtml.match(/<h2>V3\.1\.4 更新日志<\/h2>/g) || []).length, 1);
	assert.deepEqual(updateTags, ['永久地址', '预言功能', '特殊卡牌', '作者「寄」语']);
	assert.match(updateModalHtml, /https:\/\/zeratul-fizkx016x\.maozi\.io\//);
	assert.match(updateModalHtml, /支持记录已猜中的预言牌及重复次数/);
	assert.match(updateModalHtml, /推荐区显示可触发的免费刷新次数/);
	assert.match(updateModalHtml, /class="info-tips update-warning">切换拓展包时清空预言记录/);
	assert.match(updateModalHtml, /特殊包包含“英雄专属卡”和“特典卡”/);
	assert.match(updateModalHtml, /进场选择中以独立“特殊”分组显示/);
	assert.match(updateModalHtml, /特殊卡不会成为预言牌或出现在推荐中/);
	assert.match(updateModalHtml, /“同卵双狗”移除 0 本探机/);
	assert.match(updateModalHtml, /生活不易, 冰冰叹气/);
	assert.match(updateModalHtml, /如果这个工具有帮助的话, 求点点关注/);
	assert.match(updateModalHtml, /右上角的福利中可以领取雷神50小时加速/);
	assert.doesNotMatch(updateModalHtml, /V3\.1\.[123]|亚服支持|增加了对亚服版本的支持|推荐排序优先信息增益，再比较刷新次数|时代服|正式服|模拟器|优化精准预测算法|修复卡牌价值等于200时判定失败问题/);
	assert.match(stylesCss, /\.update-warning\s*{[^}]*color:\s*#ff6b6b;/s);
});
