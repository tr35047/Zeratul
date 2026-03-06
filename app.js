(function () {
	"use strict";

	var CLOSE_THRESHOLD = 200;
	var MAX_EXPANSION_PACKS = 2;

	var RACE_CN = {
		'Protess': '星灵',
		'Zerg': '异虫',
		'Terran': '人族',
		'Neutral': '中立'
	};

	function raceName(race) {
		return RACE_CN[race] || race;
	}

	var PACK_REGISTRY = [
		{key: 'core', name: '核心', file: 'resource/data/core.js'},
		{key: 'pack1', name: '军备竞赛', file: 'resource/data/pack1.js'},
		{key: 'pack2', name: '作战计划', file: 'resource/data/pack2.js'},
		{key: 'pack3', name: '卷土重来', file: 'resource/data/pack3.js'},
		{key: 'pack4', name: '时不我待', file: 'resource/data/pack4.js'},
		{key: 'pack5', name: '重装上阵', file: 'resource/data/pack5.js'},
		{key: 'pack6', name: '穷兵黩武', file: 'resource/data/pack6.js'},
		{key: 'pack7', name: '一念之差', file: 'resource/data/pack7.js'},
		{key: 'pack9', name: '身经百战', file: 'resource/data/pack9.js'},
		{key: 'pack10', name: '比特狂潮', file: 'resource/data/pack10.js'},
		{key: 'packDuo1', name: '同卵双狗', file: 'resource/data/packDuo1.js'}
	];

	// Track which scripts have been injected
	var loadedScripts = {};

	function loadPackScript(entry) {
		return new Promise(function (resolve, reject) {
			// Already in global registry (cached from previous load)
			if (window._packData && window._packData[entry.key]) {
				resolve(window._packData[entry.key]);
				return;
			}
			// Already loading / loaded script tag
			if (loadedScripts[entry.key]) {
				// Script was injected but data might not be ready yet (unlikely but safe)
				var check = setInterval(function () {
					if (window._packData && window._packData[entry.key]) {
						clearInterval(check);
						resolve(window._packData[entry.key]);
					}
				}, 10);
				return;
			}
			loadedScripts[entry.key] = true;
			var script = document.createElement('script');
			script.src = entry.file;
			script.onload = function () {
				resolve(window._packData[entry.key]);
			};
			script.onerror = function () {
				reject(new Error('Failed to load ' + entry.file));
			};
			document.head.appendChild(script);
		});
	}

	var App = {
		state: {
			cards: [],
			guesses: [],
			sortBy: 'priority',
			selectedRace: 'Neutral',
			selectedLevel: '1',
			selectedCardId: '',
			enabledPacks: ['core']
		},

		init: function () {
			this.cacheEls();
			this.restoreState();
			this.bindEvents();
			this.renderPackToggles();
			this.reloadCards();
		},

		cacheEls: function () {
			this.els = {
				packToggles: document.getElementById('packToggles'),
				datasetInfo: document.getElementById('datasetInfo'),
				raceRow: document.getElementById('raceRow'),
				levelRow: document.getElementById('levelRow'),
				cardRow: document.getElementById('cardRow'),
				addGuessBtn: document.getElementById('addGuessBtn'),
				historyTableBody: document.querySelector('#historyTable tbody'),
				resetBtn: document.getElementById('resetBtn'),
				candidatesTableBody: document.querySelector('#candidatesTable tbody'),
				constraintSummary: document.getElementById('constraintSummary'),
				candidateStats: document.getElementById('candidateStats'),
				sortSelect: document.getElementById('sortSelect'),
				prophecyModal: document.getElementById('prophecyModal'),
				cancelProphecyBtn: document.getElementById('cancelProphecyBtn'),
				confirmProphecyBtn: document.getElementById('confirmProphecyBtn'),
				closeProphecyBtn: document.querySelector('#prophecyModal .close-btn'),
				feedbackRow: document.getElementById('feedbackRow')
			};
		},

		bindEvents: function () {
			var self = this;
			this.els.addGuessBtn.addEventListener('click', function () {
				self.addGuess();
			});
			this.els.feedbackRow.querySelectorAll('.feedback-btn').forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.els.feedbackRow.querySelectorAll('.feedback-btn').forEach(function (b) {
						b.classList.remove('selected');
					});
					btn.classList.add('selected');
				});
			});
			this.els.resetBtn.addEventListener('click', function () {
				if (confirm('确认清除全部记录？')) {
					self.state.guesses = [];
					self.persist();
					self.renderAll();
				}
			});
			this.els.sortSelect.addEventListener('change', function (e) {
				self.state.sortBy = e.target.value;
				self.persist();
				self.renderCandidates();
			});

			this.els.cancelProphecyBtn.addEventListener('click', function () {
				self.hideProphecyModal();
			});
			this.els.confirmProphecyBtn.addEventListener('click', function () {
				self.confirmProphecy();
			});
			this.els.closeProphecyBtn.addEventListener('click', function () {
				self.hideProphecyModal();
			});
			window.addEventListener('click', function (e) {
				if (e.target === self.els.prophecyModal) {
					self.hideProphecyModal();
				}
			});
		},

		// --- Async data loading via dynamic <script> ---

		reloadCards: function () {
			var self = this;
			this.els.datasetInfo.textContent = '加载中...';

			var toLoad = PACK_REGISTRY.filter(function (e) {
				return self.state.enabledPacks.indexOf(e.key) !== -1;
			});

			Promise.all(toLoad.map(function (e) {
				return loadPackScript(e);
			}))
				.then(function (datasets) {
					var cards = [];
					datasets.forEach(function (data) {
						var isCore = data.name === '核心';
						data.cards.forEach(function (c) {
							cards.push({
								id: c.id, race: c.race, level: c.level,
								number: c.number, value: c.value, isCoreSet: isCore
							});
						});
					});
					self.state.cards = cards;
					var names = datasets.map(function (d) {
						return d.name;
					}).join(', ');
					self.els.datasetInfo.textContent = ' 总卡牌数: ' + cards.length;
					self.renderAll();
				})
				.catch(function (err) {
					self.els.datasetInfo.textContent = '加载失败';
					console.error(err);
				});
		},

		// --- Pack toggles ---

		renderPackToggles: function () {
			var self = this;
			var html = PACK_REGISTRY.map(function (entry) {
				var isCore = entry.key === 'core';
				var isEnabled = self.state.enabledPacks.indexOf(entry.key) !== -1;
				var nonCoreCount = self.state.enabledPacks.filter(function (k) {
					return k !== 'core';
				}).length;
				var isDisabled = !isCore && !isEnabled && nonCoreCount >= MAX_EXPANSION_PACKS;
				return '<label class="' + (isDisabled ? 'disabled' : '') + '">' +
					'<input type="checkbox"' +
					(isEnabled ? ' checked' : '') +
					(isCore || isDisabled ? ' disabled' : '') +
					' data-pack="' + entry.key + '"> ' +
					entry.name + '</label>';
			}).join('');
			this.els.packToggles.innerHTML = html;

			this.els.packToggles.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
				cb.addEventListener('change', function () {
					var key = cb.dataset.pack;
					if (cb.checked) {
						if (self.state.enabledPacks.indexOf(key) === -1) {
							self.state.enabledPacks.push(key);
						}
					} else {
						self.state.enabledPacks = self.state.enabledPacks.filter(function (k) {
							return k !== key;
						});
					}
					self.state.guesses = [];
					self.persist();
					self.renderPackToggles();
					self.reloadCards();
				});
			});
		},

		// --- Guess logic ---

		addGuess: function () {
			var cardId = this.state.selectedCardId;
			if (!cardId) return;
			// 相同卡牌不能重复进场
			var isDuplicate = this.state.guesses.some(function (g) {
				return g.cardId === cardId;
			});
			if (isDuplicate) return;
			var feedback = this.els.feedbackRow.querySelector('.feedback-btn.selected').dataset.value;
			this.state.guesses.push({cardId: cardId, feedback: feedback});
			// 点击反馈动画
			var btn = this.els.addGuessBtn;
			btn.classList.add('btn-click-flash');
			setTimeout(function () { btn.classList.remove('btn-click-flash'); }, 400);
			this.persist();
			this.renderAll();
		},

		removeGuess: function (index) {
			this.state.guesses.splice(index, 1);
			this.persist();
			this.renderAll();
		},

		markProphecy: function () {
			this.els.prophecyModal.style.display = 'block';
		},

		hideProphecyModal: function () {
			this.els.prophecyModal.style.display = 'none';
		},

		confirmProphecy: function () {
			this.hideProphecyModal();
			this.state.guesses = [];
			this.persist();
			this.renderAll();
		},

		isClose: function (a, b) {
			return a.race === b.race || a.number === b.number || Math.abs(a.value - b.value) <= CLOSE_THRESHOLD;
		},

		candidateConsistent: function (candidate) {
			var cards = this.state.cards;
			for (var i = 0; i < this.state.guesses.length; i++) {
				var g = this.state.guesses[i];
				var picked = null;
				for (var j = 0; j < cards.length; j++) {
					if (cards[j].id === g.cardId) {
						picked = cards[j];
						break;
					}
				}
				if (!picked) return false;
				var close = this.isClose(picked, candidate);
				if (g.feedback === 'close' && !close) return false;
				if (g.feedback === 'not_close' && close) return false;
			}
			return true;
		},

		getCandidates: function () {
			var self = this;
			return this.state.cards.filter(function (c) {
				return c.isCoreSet && self.candidateConsistent(c);
			});
		},

		isValueDimPossible: function (closeValue, excludedValueCenters) {
			var lo = closeValue - CLOSE_THRESHOLD;
			var hi = closeValue + CLOSE_THRESHOLD;
			var intervals = [];
			for (var i = 0; i < excludedValueCenters.length; i++) {
				var elo = excludedValueCenters[i] - CLOSE_THRESHOLD;
				var ehi = excludedValueCenters[i] + CLOSE_THRESHOLD;
				if (elo <= hi && ehi >= lo) {
					intervals.push([Math.max(elo, lo), Math.min(ehi, hi)]);
				}
			}
			if (intervals.length === 0) return true;
			intervals.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
			var covered = lo - 1;
			for (var j = 0; j < intervals.length; j++) {
				if (intervals[j][0] > covered + 1) return true;
				if (intervals[j][1] > covered) covered = intervals[j][1];
			}
			return covered < hi;
		},

		buildConstraints: function (candidates) {
			var cards = this.state.cards;
			var guesses = this.state.guesses;
			var self = this;

			var closeCards = [];
			var notCloseCards = [];
			for (var i = 0; i < guesses.length; i++) {
				var g = guesses[i];
				var picked = null;
				for (var j = 0; j < cards.length; j++) {
					if (cards[j].id === g.cardId) { picked = cards[j]; break; }
				}
				if (!picked) continue;
				if (g.feedback === 'close') closeCards.push(picked);
				else notCloseCards.push(picked);
			}

			// Phase 1: exclusion sets from not_close
			var excludedRaces = {};
			var excludedNumbers = {};
			var excludedValueCenters = [];
			for (var n = 0; n < notCloseCards.length; n++) {
				var nc = notCloseCards[n];
				excludedRaces[nc.race] = true;
				excludedNumbers[nc.number] = true;
				excludedValueCenters.push(nc.value);
			}

			// Phase 2: constraint propagation
			var possibleRaces = null;
			var possibleNumbers = null;
			var possibleValueIntervals = null;

			var changed = true;
			var maxIter = 10;
			while (changed && maxIter-- > 0) {
				changed = false;
				for (var ci = 0; ci < closeCards.length; ci++) {
					var cc = closeCards[ci];
					var rp = !excludedRaces[cc.race] && (possibleRaces === null || !!possibleRaces[cc.race]);
					var np = !excludedNumbers[cc.number] && (possibleNumbers === null || !!possibleNumbers[cc.number]);
					var vp = self.isValueDimPossible(cc.value, excludedValueCenters);

					var possCount = (rp ? 1 : 0) + (np ? 1 : 0) + (vp ? 1 : 0);

					if (possCount === 1) {
						if (rp) {
							if (possibleRaces === null || !possibleRaces[cc.race]) {
								possibleRaces = {};
								possibleRaces[cc.race] = true;
								for (var ri = 0; ri < cards.length; ri++) {
									if (cards[ri].race !== cc.race) excludedRaces[cards[ri].race] = true;
								}
								changed = true;
							}
						}
						if (np) {
							if (possibleNumbers === null || !possibleNumbers[cc.number]) {
								possibleNumbers = {};
								possibleNumbers[cc.number] = true;
								for (var ni = 0; ni < cards.length; ni++) {
									if (cards[ni].number !== cc.number) excludedNumbers[cards[ni].number] = true;
								}
								changed = true;
							}
						}
						if (vp) {
							if (possibleValueIntervals === null) {
								possibleValueIntervals = [cc.value - CLOSE_THRESHOLD, cc.value + CLOSE_THRESHOLD];
								changed = true;
							}
						}
					}
				}
			}

			var closeAnalysis = [];
			for (var ai = 0; ai < closeCards.length; ai++) {
				var ac = closeCards[ai];
				var arP = !excludedRaces[ac.race] && (possibleRaces === null || !!possibleRaces[ac.race]);
				var anP = !excludedNumbers[ac.number] && (possibleNumbers === null || !!possibleNumbers[ac.number]);
				var avP = self.isValueDimPossible(ac.value, excludedValueCenters);
				closeAnalysis.push({
					card: ac,
					racePossible: arP,
					numberPossible: anP,
					valuePossible: avP
				});
			}

			// Phase 3: build candidate distributions for rarity weighting
			var raceCount = {};
			var numberCount = {};
			var totalCandidates = candidates.length;
			for (var di = 0; di < candidates.length; di++) {
				var dc = candidates[di];
				raceCount[dc.race] = (raceCount[dc.race] || 0) + 1;
				numberCount[dc.number] = (numberCount[dc.number] || 0) + 1;
			}
			var raceDistribution = {};
			var numberDistribution = {};
			for (var rk in raceCount) {
				raceDistribution[rk] = raceCount[rk] / totalCandidates;
			}
			for (var nk in numberCount) {
				numberDistribution[nk] = numberCount[nk] / totalCandidates;
			}

			// Value match ratio: for each close card's value, what fraction of candidates fall within threshold
			var valueMatchRatio = {};
			for (var vi = 0; vi < closeCards.length; vi++) {
				var cv = closeCards[vi].value;
				if (valueMatchRatio[cv] !== undefined) continue;
				var cnt = 0;
				for (var vj = 0; vj < candidates.length; vj++) {
					if (Math.abs(candidates[vj].value - cv) <= CLOSE_THRESHOLD) cnt++;
				}
				valueMatchRatio[cv] = totalCandidates > 0 ? cnt / totalCandidates : 0;
			}

			// Phase 4: build summary for constraint panel
			// Determine dimension status: locked / narrowed / unknown
			var raceSummary = {status: 'unknown', values: []};
			var numberSummary = {status: 'unknown', values: []};
			var valueSummary = {status: 'unknown', range: null};

			if (possibleRaces) {
				raceSummary.status = 'locked';
				raceSummary.values = Object.keys(possibleRaces);
			} else {
				// Collect races present in candidates
				var candRaces = {};
				for (var cri = 0; cri < candidates.length; cri++) {
					candRaces[candidates[cri].race] = true;
				}
				var allRaces = ['Protess', 'Zerg', 'Terran', 'Neutral'];
				var eliminated = allRaces.filter(function (r) { return !candRaces[r]; });
				if (eliminated.length > 0) {
					raceSummary.status = 'narrowed';
					raceSummary.values = Object.keys(candRaces);
					raceSummary.eliminated = eliminated;
				}
			}

			if (possibleNumbers) {
				numberSummary.status = 'locked';
				numberSummary.values = Object.keys(possibleNumbers).map(Number);
			} else {
				var candNums = {};
				for (var cni = 0; cni < candidates.length; cni++) {
					candNums[candidates[cni].number] = true;
				}
				var allNums = {};
				for (var ani = 0; ani < cards.length; ani++) {
					if (cards[ani].isCoreSet) allNums[cards[ani].number] = true;
				}
				var elimNums = Object.keys(allNums).filter(function (n) { return !candNums[n]; });
				if (elimNums.length > 0) {
					numberSummary.status = 'narrowed';
					numberSummary.values = Object.keys(candNums).map(Number).sort(function (a, b) { return a - b; });
				}
			}

			if (possibleValueIntervals) {
				valueSummary.status = 'locked';
				valueSummary.range = possibleValueIntervals;
			} else if (candidates.length > 0) {
				var minV = Infinity, maxV = -Infinity;
				for (var mvi = 0; mvi < candidates.length; mvi++) {
					if (candidates[mvi].value < minV) minV = candidates[mvi].value;
					if (candidates[mvi].value > maxV) maxV = candidates[mvi].value;
				}
				var coreMinV = Infinity, coreMaxV = -Infinity;
				for (var cmvi = 0; cmvi < cards.length; cmvi++) {
					if (cards[cmvi].isCoreSet) {
						if (cards[cmvi].value < coreMinV) coreMinV = cards[cmvi].value;
						if (cards[cmvi].value > coreMaxV) coreMaxV = cards[cmvi].value;
					}
				}
				if (minV > coreMinV || maxV < coreMaxV) {
					valueSummary.status = 'narrowed';
					valueSummary.range = [minV, maxV];
				}
			}

			return {
				closeAnalysis: closeAnalysis,
				closeCount: closeCards.length,
				hasCloseCards: closeCards.length > 0,
				totalCandidates: totalCandidates,
				raceDistribution: raceDistribution,
				numberDistribution: numberDistribution,
				valueMatchRatio: valueMatchRatio,
				summary: {
					race: raceSummary,
					number: numberSummary,
					value: valueSummary
				}
			};
		},

		calcPriority: function (candidate, constraints) {
			if (!constraints || !constraints.hasCloseCards) return {score: 0, dims: []};

			var closeAnalysis = constraints.closeAnalysis;
			var score = 0;
			var maxScore = 0;
			var dimHits = {race: 0, number: 0, value: 0};

			for (var i = 0; i < closeAnalysis.length; i++) {
				var obs = closeAnalysis[i];
				var a = obs.card;

				if (obs.racePossible) {
					maxScore += 1;
					if (candidate.race === a.race) {
						score += 1 - (constraints.raceDistribution[a.race] || 0);
						dimHits.race++;
					}
				}
				if (obs.numberPossible) {
					maxScore += 1;
					if (candidate.number === a.number) {
						score += 1 - (constraints.numberDistribution[a.number] || 0);
						dimHits.number++;
					}
				}
				if (obs.valuePossible) {
					maxScore += 1;
					if (Math.abs(candidate.value - a.value) <= CLOSE_THRESHOLD) {
						score += 1 - (constraints.valueMatchRatio[a.value] || 0);
						dimHits.value++;
					}
				}
			}

			var dims = [];
			if (dimHits.race > 0) dims.push({dim: '种族', count: dimHits.race});
			if (dimHits.number > 0) dims.push({dim: '单位数', count: dimHits.number});
			if (dimHits.value > 0) dims.push({dim: '价值', count: dimHits.value});

			var finalScore = maxScore > 0 ? Math.round(score / maxScore * 50) / 10 : 0;
			return {score: Math.min(5, Math.max(0, finalScore)), dims: dims};
		},

		// --- Rendering ---

		renderAll: function () {
			this.renderRaceLevelSelectors();
			this.renderCardButtons();
			this.renderHistory();
			this.renderCandidates();
		},

		renderRaceLevelSelectors: function () {
			var self = this;
			var racesSet = {};
			this.state.cards.forEach(function (c) {
				if (c.race) racesSet[c.race] = true;
			});
			var races = Object.keys(racesSet).sort();
			var selRace = this.state.selectedRace && racesSet[this.state.selectedRace] ? this.state.selectedRace : '';
			if (!selRace && races.length > 0) {
				selRace = races[0];
				this.state.selectedRace = selRace;
			}

			this.els.raceRow.innerHTML =
				races.map(function (r) {
					return '<button type="button" class="race-btn' + (r === selRace ? ' selected' : '') + '" data-race="' + r + '">' + raceName(r) + '</button>';
				}).join('');

			this.els.raceRow.querySelectorAll('button.race-btn').forEach(function (btn) {
				btn.onclick = function () {
					self.state.selectedRace = btn.dataset.race;
					self.renderRaceLevelSelectors();
					self.renderCardButtons();
				};
			});

			var levelsSet = {};
			this.state.cards.forEach(function (c) {
				if (!selRace || c.race === selRace) levelsSet[c.level] = true;
			});
			var levels = Object.keys(levelsSet).map(Number).sort(function (a, b) {
				return a - b;
			});
			var selLevel = this.state.selectedLevel && levelsSet[this.state.selectedLevel] ? this.state.selectedLevel : '';
			if (!selLevel && levels.length > 0) {
				selLevel = String(levels[0]);
				this.state.selectedLevel = selLevel;
			}

			this.els.levelRow.innerHTML =
				levels.map(function (l) {
					return '<button type="button" class="level-btn' + (String(l) === selLevel ? ' selected' : '') + '" data-level="' + l + '">' + l + '</button>';
				}).join('');

			this.els.levelRow.querySelectorAll('button.level-btn').forEach(function (btn) {
				btn.onclick = function () {
					self.state.selectedLevel = btn.dataset.level;
					self.renderRaceLevelSelectors();
					self.renderCardButtons();
				};
			});
		},

		renderCardButtons: function () {
			var self = this;
			if (!this.state.selectedRace || !this.state.selectedLevel) {
				this.els.cardRow.innerHTML = '';
				this.els.addGuessBtn.disabled = true;
				return;
			}
			var sr = this.state.selectedRace;
			var sl = this.state.selectedLevel;
			var cards = this.state.cards.filter(function (c) {
				return c.race === sr && String(c.level) === sl;
			}).sort(function (a, b) {
				return a.number - b.number || a.value - b.value;
			});

			var usedCardIds = {};
			this.state.guesses.forEach(function (g) { usedCardIds[g.cardId] = true; });

			this.els.cardRow.innerHTML = cards.map(function (c) {
				var used = usedCardIds[c.id];
				return '<button type="button" class="card-btn' + (c.id === self.state.selectedCardId ? ' selected' : '') + (used ? ' used' : '') + '" data-cardid="' + c.id + '"' + (used ? ' disabled' : '') + '>' + c.id + '</button>';
			}).join('');

			this.els.cardRow.querySelectorAll('button.card-btn').forEach(function (btn) {
				btn.onclick = function () {
					self.state.selectedCardId = btn.dataset.cardid;
					self.els.addGuessBtn.disabled = false;
					self.els.cardRow.querySelectorAll('button.card-btn').forEach(function (b) {
						b.classList.remove('selected');
					});
					btn.classList.add('selected');
				};
			});
		},

		renderHistory: function () {
			var self = this;
			var tbody = this.els.historyTableBody;
			var cards = this.state.cards;
			tbody.innerHTML = this.state.guesses.map(function (g, idx) {
				var c = null;
				for (var i = 0; i < cards.length; i++) {
					if (cards[i].id === g.cardId) {
						c = cards[i];
						break;
					}
				}
				if (!c) return '';
				var fb = g.feedback === 'close' ? '获得' : '没有';
				return '<tr>' +
					'<td>' + (idx + 1) + '</td>' +
					'<td>' + c.id + '</td>' +
					'<td>' + raceName(c.race) + '</td>' +
					'<td>' + c.level + '</td>' +
					'<td>' + c.number + '</td>' +
					'<td>' + c.value + '</td>' +
					'<td>' + fb + '</td>' +
					'<td class="action-cell">' +
					'<button class="danger btn-sm" data-action="remove" data-index="' + idx + '">移除</button>' +
					'</td></tr>';
			}).join('');

			tbody.querySelectorAll('button[data-action="remove"]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.removeGuess(Number(btn.dataset.index));
				});
			});
		},

		renderCandidates: function () {
			var self = this;
			var list = this.getCandidates();

			// Pre-calculate constraints once, pass to each calcPriority
			var constraints = this.buildConstraints(list);
			list.forEach(function (c) {
				var result = self.calcPriority(c, constraints);
				c._priority = result.score;
				c._dims = result.dims;
			});

			// Render constraint summary panel
			this.renderConstraintSummary(constraints);

			var sortBy = this.state.sortBy;
			list.sort(function (a, b) {
				if (sortBy === 'priority') {
					if (a._priority !== b._priority) return b._priority - a._priority;
					if (a.race !== b.race) return a.race.localeCompare(b.race);
					return a.value - b.value;
				}
				if (sortBy === 'race') {
					if (a.race !== b.race) return a.race.localeCompare(b.race);
					if (a.number !== b.number) return a.number - b.number;
					return a.value - b.value;
				}
				if (sortBy === 'number') {
					if (a.number !== b.number) return a.number - b.number;
					return a.value - b.value;
				}
				if (a.value !== b.value) return a.value - b.value;
				return a.race.localeCompare(b.race);
			});

			var guesses = this.state.guesses;
			var cards = this.state.cards;
			this.els.candidatesTableBody.innerHTML = list.map(function (c) {
				var hasClose = guesses.some(function (g) {
					var picked = null;
					for (var i = 0; i < cards.length; i++) {
						if (cards[i].id === g.cardId) {
							picked = cards[i];
							break;
						}
					}
					return picked && self.isClose(picked, c);
				});

				// Dimension badges
				var dimsHtml = '';
				if (c._dims.length > 0) {
					dimsHtml = c._dims.map(function (d) {
						var cls = d.dim === '种族' ? 'dim-race' : d.dim === '单位数' ? 'dim-number' : 'dim-value';
						return '<span class="dim-badge ' + cls + '">' + d.dim + '</span>';
					}).join('');
				} else {
					dimsHtml = '<span class="dim-none">-</span>';
				}

				// 5-block indicator
				var blocks = Math.round(c._priority);
				var blocksHtml = '';
				for (var bi = 0; bi < 5; bi++) {
					var blockCls = bi < blocks ? (blocks >= 4 ? 'block-high' : blocks >= 2 ? 'block-mid' : 'block-low') : 'block-empty';
					blocksHtml += '<span class="dist-block ' + blockCls + '"></span>';
				}

				return '<tr class="' + (hasClose ? 'close-signal' : '') + '">' +
					'<td>' + c.id + '</td>' +
					'<td>' + raceName(c.race) + '</td>' +
					'<td>' + c.number + '</td>' +
					'<td>' + c.value + '</td>' +
					'<td class="dims-cell">' + dimsHtml + '</td>' +
					'<td class="dist-cell"><div class="dist-blocks">' + blocksHtml + '</div></td>' +
					'<td class="action-cell">' +
					'<button class="prophecy-btn" data-action="prophecy">预言牌</button>' +
					'</td></tr>';
			}).join('');

			this.els.candidatesTableBody.querySelectorAll('button[data-action="prophecy"]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.markProphecy();
				});
			});

			var coreTotal = 0;
			cards.forEach(function (c) {
				if (c.isCoreSet) coreTotal++;
			});
			this.els.candidateStats.textContent = list.length + ' / ' + coreTotal;
		},

		renderConstraintSummary: function (constraints) {
			var el = this.els.constraintSummary;
			if (!constraints || !constraints.hasCloseCards) {
				if (this.state.guesses.length === 0) {
					el.innerHTML = '<div class="constraint-hint">进场卡牌后将显示约束推断</div>';
				} else {
					el.innerHTML = '<div class="constraint-hint">需要获得隐刀记录(奇数)才能推断维度</div>';
				}
				return;
			}

			if (constraints.totalCandidates === 0) {
				el.innerHTML = '<div class="constraint-hint constraint-warn">无可能候选牌，请检查记录是否有误</div>';
				return;
			}

			var s = constraints.summary;
			var html = '<div class="constraint-tags">';

			// Race
			var rCls = s.race.status === 'locked' ? 'constraint-locked' : s.race.status === 'narrowed' ? 'constraint-narrowed' : 'constraint-unknown';
			var rText = '种族: ';
			if (s.race.status === 'locked') {
				rText += s.race.values.map(function (r) { return RACE_CN[r] || r; }).join('/');
			} else if (s.race.status === 'narrowed') {
				rText += s.race.values.map(function (r) { return RACE_CN[r] || r; }).join('/');
			} else {
				rText += '未知';
			}
			html += '<span class="constraint-tag ' + rCls + '">' + rText + '</span>';

			// Number
			var nCls = s.number.status === 'locked' ? 'constraint-locked' : s.number.status === 'narrowed' ? 'constraint-narrowed' : 'constraint-unknown';
			var nText = '单位数: ';
			if (s.number.status === 'locked') {
				nText += s.number.values.join('/');
			} else if (s.number.status === 'narrowed') {
				var nums = s.number.values;
				if (nums.length <= 5) {
					nText += nums.join(', ');
				} else {
					nText += nums[0] + '~' + nums[nums.length - 1] + ' (' + nums.length + '种)';
				}
			} else {
				nText += '未知';
			}
			html += '<span class="constraint-tag ' + nCls + '">' + nText + '</span>';

			// Value
			var vCls = s.value.status === 'locked' ? 'constraint-locked' : s.value.status === 'narrowed' ? 'constraint-narrowed' : 'constraint-unknown';
			var vText = '价值: ';
			if (s.value.range) {
				vText += s.value.range[0] + ' ~ ' + s.value.range[1];
			} else {
				vText += '未知';
			}
			html += '<span class="constraint-tag ' + vCls + '">' + vText + '</span>';

			html += '</div>';
			el.innerHTML = html;
		},

		// --- Persistence ---

		persist: function () {
		},

		restoreState: function () {
		}
	};

	document.addEventListener('DOMContentLoaded', function () {
		App.init();
	});
})();
