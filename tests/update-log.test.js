const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('update modal shows only the approved V3.1.2 release notes', () => {
	assert.match(indexHtml, /V3\.1\.2 更新日志/);
	assert.match(indexHtml, /永久地址/);
	assert.match(indexHtml, /支持记录已猜中的预言牌及重复次数/);
	assert.match(indexHtml, /推荐区显示可触发的免费刷新次数/);
	assert.match(indexHtml, /推荐排序优先信息增益，再比较刷新次数/);
	assert.match(indexHtml, /切换拓展包时清空预言记录/);
	assert.match(indexHtml, /凶残巨兽：单位数 1，战力 500/);
	assert.match(indexHtml, /地雷禁区：单位数 2，战力 300/);
	assert.match(indexHtml, /虚空大军：单位数 6，战力 950/);
	assert.match(indexHtml, /作者「寄」语/);
	assert.doesNotMatch(indexHtml, /V3\.1\.1 更新日志/);
	assert.doesNotMatch(indexHtml, /修复卡牌价值等于200时判定失败问题/);
});
