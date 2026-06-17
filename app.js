(function () {
	"use strict";

	var CLOSE_THRESHOLD = 200;
	var MAX_EXPANSION_PACKS = 100;
	var ASSET_VERSION = '20260612';

	var RACE_CN = {
		'Protess': '星灵',
		'Zerg': '异虫',
		'Terran': '人族',
		'Neutral': '中立'
	};

	function raceName(race) {
		return RACE_CN[race] || race;
	}

	function escapeHtml(value) {
		return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
			return ({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;'
			})[ch];
		});
	}

	function versionedAsset(file) {
		return file + (file.indexOf('?') === -1 ? '?' : '&') + 'v=' + ASSET_VERSION;
	}

	var RACE_ORDER = ['Protess', 'Zerg', 'Terran', 'Neutral'];

	function sortRaces(a, b) {
		var ai = RACE_ORDER.indexOf(a);
		var bi = RACE_ORDER.indexOf(b);
		if (ai === -1) ai = RACE_ORDER.length;
		if (bi === -1) bi = RACE_ORDER.length;
		return ai - bi || String(a).localeCompare(String(b));
	}

	var PACK_REGISTRY = [
		{key: 'core', name: '核心', file: 'resource/data/core.js'},
		// {key: 'pack1', name: '军备竞赛', file: 'resource/data/pack1.js'},
		{key: 'pack2', name: '作战计划', file: 'resource/data/pack2.js'},
		// {key: 'pack3', name: '卷土重来', file: 'resource/data/pack3.js'},
		{key: 'pack4', name: '时不我待', file: 'resource/data/pack4.js'},
		{key: 'pack5', name: '重装上阵', file: 'resource/data/pack5.js'},
		{key: 'pack6', name: '穷兵黩武', file: 'resource/data/pack6.js'},
		{key: 'pack7', name: '一念之差', file: 'resource/data/pack7.js'},
		{key: 'pack9', name: '身经百战', file: 'resource/data/pack9.js'},
		{key: 'pack10', name: '比特狂潮', file: 'resource/data/pack10.js'},
		{key: 'pack11', name: '中世纪集市', file: 'resource/data/pack11.js'},
		{key: 'packDuo1', name: '同卵双狗', file: 'resource/data/packDuo1.js'}
	];

	var SDF_PACK_REGISTRY = [
		{key: 'core_sdf', name: '核心', file: 'resource/sdf/core_sdf.js'},
		{key: 'pack1_sdf', name: '军备竞赛', file: 'resource/sdf/pack1_sdf.js'},
		{key: 'pack2_sdf', name: '作战计划', file: 'resource/sdf/pack2_sdf.js'},
		{key: 'pack3_sdf', name: '重装上阵', file: 'resource/sdf/pack3_sdf.js'},
		{key: 'pack4_sdf', name: '穷兵黩武', file: 'resource/sdf/pack4_sdf.js'},
		{key: 'pack5_sdf', name: '一念之差', file: 'resource/sdf/pack5_sdf.js'},
		{key: 'pack6_sdf', name: '身经百战', file: 'resource/sdf/pack6_sdf.js'},
		{key: 'pack7_sdf', name: '暗影渐生', file: 'resource/sdf/pack7_sdf.js'},
		{key: 'pack8_sdf', name: '拉克希尔', file: 'resource/sdf/pack8_sdf.js'},
		{key: 'pack9_sdf', name: '历久弥新', file: 'resource/sdf/pack9_sdf.js'}
	];

	var APP_PACK_MODES = {
		official: {coreKey: 'core', packs: PACK_REGISTRY},
		sdf: {coreKey: 'core_sdf', packs: SDF_PACK_REGISTRY}
	};

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
			script.src = versionedAsset(entry.file);
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
			sortBy: 'race',
			selectedRace: 'Neutral',
			selectedLevel: '1',
			selectedCardId: '',
			serverMode: 'official',
			enabledPacks: ['core'],
			predictionLevels: [],
			sidebarCollapsed: false,
			excludedCardIds: []
		},

		init: function () {
			var self = this;
			this.cacheEls();
			this.restoreState();
			this.bindEvents();
			this.renderServerModeToggle();
			this.renderPackToggles();
			this.restoreSidebarState();
			this.reloadCards();
			this.initUpdateModal();
			this.initBenefitModal();
			window.addEventListener('resize', function () {
				self.updateToggleIcon();
			});
		},

		cacheEls: function () {
			this.els = {
				serverModeToggle: document.getElementById('serverModeToggle'),
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
				feedbackRow: document.getElementById('feedbackRow'),
				predictionStatus: document.getElementById('predictionStatus'),
				predictionRecommendations: document.getElementById('predictionRecommendations'),
				predictionLevelFilter: document.getElementById('predictionLevelFilter'),
				sidebarToggle: document.getElementById('sidebarToggle'),
				sidebar: document.querySelector('.sidebar'),
				updateModal: document.getElementById('updateModal'),
				updateNotifyBtn: document.getElementById('updateNotifyBtn'),
				closeUpdateModal: document.getElementById('closeUpdateModal'),
				dismissTodayBtn: document.getElementById('dismissTodayBtn'),
				closeUpdateBtn: document.getElementById('closeUpdateBtn'),
				benefitModal: document.getElementById('benefitModal'),
				benefitCopyBtns: document.querySelectorAll('#benefitModal .benefit-copy-btn'),
				benefitNotifyBtn: document.getElementById('benefitNotifyBtn'),
				closeBenefitModal: document.getElementById('closeBenefitModal'),
				dismissBenefitTodayBtn: document.getElementById('dismissBenefitTodayBtn'),
				closeBenefitBtn: document.getElementById('closeBenefitBtn')
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
					self.state.excludedCardIds = [];
					self.persist();
					self.renderAll();
				}
			});
			this.els.sortSelect.addEventListener('change', function (e) {
				self.state.sortBy = e.target.value;
				self.persist();
				self.renderCandidates();
			});
			this.els.serverModeToggle.querySelectorAll('button[data-server-mode]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.switchServerMode(btn.dataset.serverMode);
				});
			});

			this.els.sidebarToggle.addEventListener('click', function () {
				self.toggleSidebar();
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

		// --- Update modal ---

		initUpdateModal: function () {
			var self = this;
			var today = new Date().toISOString().slice(0, 10);
			var dismissed = '';
			try { dismissed = localStorage.getItem('zeratul_update_dismissed') || ''; } catch (e) {}

			if (dismissed !== today) {
				this.els.updateModal.style.display = 'block';
			}

			this.els.updateNotifyBtn.addEventListener('click', function () {
				self.els.updateModal.style.display = 'block';
			});
			this.els.closeUpdateModal.addEventListener('click', function () {
				self.els.updateModal.style.display = 'none';
			});
			this.els.closeUpdateBtn.addEventListener('click', function () {
				self.els.updateModal.style.display = 'none';
			});
			this.els.dismissTodayBtn.addEventListener('click', function () {
				try { localStorage.setItem('zeratul_update_dismissed', today); } catch (e) {}
				self.els.updateModal.style.display = 'none';
			});
			window.addEventListener('click', function (e) {
				if (e.target === self.els.updateModal) {
					self.els.updateModal.style.display = 'none';
				}
			});
		},

		initBenefitModal: function () {
			var self = this;
			var today = new Date().toISOString().slice(0, 10);

			this.els.benefitNotifyBtn.addEventListener('click', function () {
				self.els.benefitModal.style.display = 'block';
			});
			this.els.closeBenefitModal.addEventListener('click', function () {
				self.els.benefitModal.style.display = 'none';
			});
			this.els.closeBenefitBtn.addEventListener('click', function () {
				self.els.benefitModal.style.display = 'none';
			});
			this.els.dismissBenefitTodayBtn.addEventListener('click', function () {
				try { localStorage.setItem('zeratul_benefit_dismissed', today); } catch (e) {}
				self.els.benefitModal.style.display = 'none';
			});
			this.els.benefitCopyBtns.forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.copyBenefitCode(btn);
				});
			});
			window.addEventListener('click', function (e) {
				if (e.target === self.els.benefitModal) {
					self.els.benefitModal.style.display = 'none';
				}
			});
		},

		copyBenefitCode: function (btn) {
			var self = this;
			var text = btn.dataset.copy || '';
			if (!text) return;

			var onSuccess = function () {
				var originalText = btn.textContent;
				btn.textContent = '已复制';
				btn.disabled = true;
				setTimeout(function () {
					btn.textContent = originalText;
					btn.disabled = false;
				}, 1200);
			};

			if (navigator.clipboard && window.isSecureContext) {
				navigator.clipboard.writeText(text).then(onSuccess).catch(function () {
					self.fallbackCopyText(text, onSuccess);
				});
				return;
			}

			this.fallbackCopyText(text, onSuccess);
		},

		fallbackCopyText: function (text, onSuccess) {
			var input = document.createElement('textarea');
			input.value = text;
			input.setAttribute('readonly', '');
			input.style.position = 'fixed';
			input.style.opacity = '0';
			document.body.appendChild(input);
			input.select();
			try {
				document.execCommand('copy');
				onSuccess();
			} catch (e) {}
			document.body.removeChild(input);
		},

		// --- Sidebar collapse ---

		toggleSidebar: function () {
			this.state.sidebarCollapsed = !this.state.sidebarCollapsed;
			this.els.sidebar.classList.toggle('collapsed', this.state.sidebarCollapsed);
			this.updateToggleIcon();
			try { localStorage.setItem('zeratul_sidebar_collapsed', this.state.sidebarCollapsed ? '1' : '0'); } catch (e) {}
		},

		updateToggleIcon: function () {
			var icon = this.els.sidebarToggle.querySelector('.sidebar-toggle-icon');
			var isMobile = window.innerWidth <= 768;
			if (this.state.sidebarCollapsed) {
				icon.textContent = isMobile ? '▼' : '▶';
				this.els.sidebarToggle.title = '展开卡包选择';
			} else {
				icon.textContent = isMobile ? '▲' : '◀';
				this.els.sidebarToggle.title = '收起卡包选择';
			}
		},

		restoreSidebarState: function () {
			try {
				var saved = localStorage.getItem('zeratul_sidebar_collapsed');
				if (saved === '1') {
					this.state.sidebarCollapsed = true;
					// 跳过动画直接设置
					this.els.sidebar.classList.add('no-transition');
					this.els.sidebar.classList.add('collapsed');
					this.els.sidebar.offsetHeight; // force reflow
					this.els.sidebar.classList.remove('no-transition');
					this.updateToggleIcon();
				}
			} catch (e) {}
		},

		getPackMode: function () {
			return APP_PACK_MODES[this.state.serverMode] ? this.state.serverMode : 'official';
		},

		getPackModeConfig: function () {
			return APP_PACK_MODES[this.getPackMode()];
		},

		getPackRegistry: function () {
			return this.getPackModeConfig().packs;
		},

		getCorePackKey: function () {
			return this.getPackModeConfig().coreKey;
		},

		normalizeEnabledPacks: function () {
			var registry = this.getPackRegistry();
			var coreKey = this.getCorePackKey();
			var available = {};
			var used = {};
			registry.forEach(function (entry) {
				available[entry.key] = true;
			});
			this.state.enabledPacks = this.state.enabledPacks.filter(function (key) {
				if (!available[key] || used[key]) return false;
				used[key] = true;
				return true;
			});
			if (this.state.enabledPacks.indexOf(coreKey) === -1) {
				this.state.enabledPacks.unshift(coreKey);
			}
		},

		switchServerMode: function (mode) {
			if (!APP_PACK_MODES[mode] || this.getPackMode() === mode) return;
			this.state.serverMode = mode;
			this.state.enabledPacks = [this.getCorePackKey()];
			this.state.guesses = [];
			this.state.excludedCardIds = [];
			this.state.predictionLevels = [];
			this.state.selectedRace = '';
			this.state.selectedLevel = '';
			this.state.selectedCardId = '';
			this.els.addGuessBtn.disabled = true;
			this.persist();
			this.renderServerModeToggle();
			this.renderPackToggles();
			this.reloadCards();
		},

		renderServerModeToggle: function () {
			var mode = this.getPackMode();
			this.els.serverModeToggle.querySelectorAll('button[data-server-mode]').forEach(function (btn) {
				btn.classList.toggle('selected', btn.dataset.serverMode === mode);
			});
		},

		// --- Async data loading via dynamic <script> ---

		reloadCards: function () {
			var self = this;
			this.normalizeEnabledPacks();
			this.setDatasetInfo('加载中...');

			var toLoad = this.getPackRegistry().filter(function (e) {
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
					self.setDatasetInfo('');
					self.renderAll();
				})
				.catch(function (err) {
					self.setDatasetInfo('加载失败');
					console.error(err);
				});
		},

		setDatasetInfo: function (text) {
			if (this.els.datasetInfo) {
				this.els.datasetInfo.textContent = text;
			}
		},

		// --- Pack toggles ---

		renderPackToggles: function () {
			var self = this;
			this.normalizeEnabledPacks();
			var registry = this.getPackRegistry();
			var coreKey = this.getCorePackKey();
			var html = registry.map(function (entry) {
				var isCore = entry.key === coreKey;
				var isEnabled = self.state.enabledPacks.indexOf(entry.key) !== -1;
				var nonCoreCount = self.state.enabledPacks.filter(function (k) {
					return k !== coreKey;
				}).length;
				var isDisabled = !isCore && !isEnabled && nonCoreCount >= MAX_EXPANSION_PACKS;
				return '<label class="' + (isDisabled ? 'disabled' : '') + '">' +
					'<input type="checkbox"' +
					(isEnabled ? ' checked' : '') +
					(isCore || isDisabled ? ' disabled' : '') +
					' data-pack="' + entry.key + '"> ' +
					escapeHtml(entry.name) + '</label>';
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
					self.state.excludedCardIds = [];
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

		excludeCandidate: function (cardId) {
			if (this.state.excludedCardIds.indexOf(cardId) === -1) {
				this.state.excludedCardIds.push(cardId);
				this.persist();
				this.renderAll();
			}
		},

		restoreCandidate: function (cardId) {
			this.state.excludedCardIds = this.state.excludedCardIds.filter(function (id) {
				return id !== cardId;
			});
			this.persist();
			this.renderAll();
		},

		restoreAllExcluded: function () {
			this.state.excludedCardIds = [];
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
			this.state.excludedCardIds = [];
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
				return c.isCoreSet && self.state.excludedCardIds.indexOf(c.id) === -1 && self.candidateConsistent(c);
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

		// --- Prediction ---

		calcRecommendations: function (candidates) {
			var self = this;
			var cards = this.state.cards;
			var guesses = this.state.guesses;
			var predictionLevels = this.state.predictionLevels;

			// All usable cards (from enabled packs, excluding already guessed)
			var usedIds = {};
			for (var i = 0; i < guesses.length; i++) {
				usedIds[guesses[i].cardId] = true;
			}
			var pool = cards.filter(function (c) {
				if (usedIds[c.id]) return false;
				if (predictionLevels.length > 0 && predictionLevels.indexOf(c.level) === -1) return false;
				return true;
			});

			var results = [];
			for (var pi = 0; pi < pool.length; pi++) {
				var p = pool[pi];
				var closeCount = 0;
				for (var ci = 0; ci < candidates.length; ci++) {
					if (self.isClose(p, candidates[ci])) closeCount++;
				}
				var notCloseCount = candidates.length - closeCount;
				var total = candidates.length;
				var infoGain = 0;
				if (total > 0 && closeCount > 0 && notCloseCount > 0) {
					var p1 = closeCount / total;
					var p2 = notCloseCount / total;
					infoGain = -p1 * Math.log2(p1) - p2 * Math.log2(p2);
				}
				results.push({card: p, infoGain: infoGain, closeCount: closeCount, notCloseCount: notCloseCount});
			}

			results = results.filter(function (r) {
				return r.infoGain > 0;
			});
			results.sort(function (a, b) {
				return b.infoGain - a.infoGain;
			});
			return results.slice(0, 10);
		},

		renderPrediction: function () {
			var self = this;
			var candidates = this.getCandidates();
			var statusEl = this.els.predictionStatus;
			var recEl = this.els.predictionRecommendations;

			var coreTotal = 0;
			this.state.cards.forEach(function (c) {
				if (c.isCoreSet) coreTotal++;
			});

			if (this.state.guesses.length === 0) {
				statusEl.innerHTML =
					'<div class="prediction-progress-info">' +
					'<span>候选 <strong>' + candidates.length + '</strong> / ' + coreTotal + '</span>' +
					'</div>' +
					'<div class="prediction-progress-bar"><div class="prediction-progress-fill" style="width:0%"></div></div>';
				recEl.innerHTML = '<div class="prediction-hint">请先进场一张卡牌，获得隐刀反馈后开始推荐</div>';
				this.els.predictionLevelFilter.innerHTML = '';
				return;
			}

			if (candidates.length === 0) {
				statusEl.innerHTML = '<div class="prediction-warn">无候选牌，请检查记录</div>';
				recEl.innerHTML = '';
				this.els.predictionLevelFilter.innerHTML = '';
				return;
			}

			if (candidates.length === 1) {
				var c = candidates[0];
				statusEl.innerHTML = '';
				recEl.innerHTML =
					'<div class="prediction-confirmed">' +
					'<div class="prediction-confirmed-label">预言牌已锁定</div>' +
					'<div class="prediction-confirmed-card">' + c.id + '</div>' +
					'<div class="prediction-confirmed-info">' +
					raceName(c.race) + ' · ' + c.number + '单位 · ' + c.value + '价值' +
					'</div></div>';
				this.els.predictionLevelFilter.innerHTML = '';
				return;
			}

			// |S| > 1: show convergence progress + recommendations
			var steps = Math.ceil(Math.log2(candidates.length));
			var pct = coreTotal > 0 ? Math.round((1 - candidates.length / coreTotal) * 100) : 0;
			statusEl.innerHTML =
				'<div class="prediction-progress-info">' +
				'<span>候选 <strong>' + candidates.length + '</strong> / ' + coreTotal + '</span>' +
				'<span>预计还需 <strong>' + steps + '</strong> 步</span>' +
				'</div>' +
				'<div class="prediction-progress-bar"><div class="prediction-progress-fill" style="width:' + pct + '%"></div></div>';

			// Render level filter buttons
			var levelSet = {};
			var allPool = this.state.cards;
			var usedIds = {};
			for (var ui = 0; ui < this.state.guesses.length; ui++) {
				usedIds[this.state.guesses[ui].cardId] = true;
			}
			for (var li = 0; li < allPool.length; li++) {
				if (!usedIds[allPool[li].id]) levelSet[allPool[li].level] = true;
			}
			var availLevels = Object.keys(levelSet).map(Number).sort(function (a, b) { return a - b; });
			var predLvls = this.state.predictionLevels;
			var allSel = predLvls.length === 0 ? ' selected' : '';
			var filterHtml = '<button type="button" class="pred-level-btn' + allSel + '" data-level="all">全部</button>';
			filterHtml += availLevels.map(function (lv) {
				var sel = predLvls.length === 1 && predLvls[0] === lv ? ' selected' : '';
				return '<button type="button" class="pred-level-btn' + sel + '" data-level="' + lv + '">' + lv + '</button>';
			}).join('');
			this.els.predictionLevelFilter.innerHTML = filterHtml;

			this.els.predictionLevelFilter.querySelectorAll('.pred-level-btn').forEach(function (btn) {
				btn.addEventListener('click', function () {
					if (btn.dataset.level === 'all') {
						self.state.predictionLevels = [];
					} else {
						self.state.predictionLevels = [Number(btn.dataset.level)];
					}
					self.renderPrediction();
				});
			});

			var recs = this.calcRecommendations(candidates);
			if (recs.length === 0) {
				recEl.innerHTML = '<div class="prediction-hint">无可推荐牌</div>';
				return;
			}

			var maxRecs = window.innerWidth <= 768 ? 8 : recs.length;
			if (recs.length > maxRecs) recs = recs.slice(0, maxRecs);

			var html = '<div class="prediction-rec-title">推荐进场牌</div><div class="prediction-rec-grid">';
			for (var i = 0; i < recs.length; i++) {
				var r = recs[i];
				var gainPct = Math.round(r.infoGain * 100);
				html += '<div class="prediction-rec-item">' +
					'<span class="prediction-rec-rank">#' + (i + 1) + '</span>' +
					'<div class="prediction-rec-body">' +
					'<div class="prediction-rec-name">' + r.card.id + '</div>' +
					'<div class="prediction-rec-meta">' +
					raceName(r.card.race) + ' · Lv' + r.card.level +
					'</div>' +
					'<div class="prediction-rec-split">' +
					'<span class="prediction-split-close">奇数→剩' + r.closeCount + '</span>' +
					'<span class="prediction-split-not">偶数→剩' + r.notCloseCount + '</span>' +
					'</div>' +
					'</div>' +
					'<div class="prediction-rec-gain">' +
					'<div class="prediction-gain-value">' + gainPct + '%</div>' +
					'<div class="prediction-gain-label">信息增益</div>' +
					'</div>' +
					'<button class="prediction-rec-use" data-cardid="' + r.card.id + '" data-race="' + r.card.race + '" data-level="' + r.card.level + '">选用</button>' +
					'</div>';
			}
			html += '</div>';
			recEl.innerHTML = html;

			recEl.querySelectorAll('.prediction-rec-use').forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.state.selectedRace = btn.dataset.race;
					self.state.selectedLevel = btn.dataset.level;
					self.state.selectedCardId = btn.dataset.cardid;
					self.els.addGuessBtn.disabled = false;
					self.renderRaceLevelSelectors();
					self.renderCardButtons();
				});
			});
		},

		// --- Rendering ---

		renderAll: function () {
			this.renderRaceLevelSelectors();
			this.renderCardButtons();
			this.renderHistory();
			this.renderCandidates();
			this.renderPrediction();
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
			var hasSelectedCard = cards.some(function (c) {
				return c.id === self.state.selectedCardId;
			});
			if (!hasSelectedCard) {
				this.state.selectedCardId = '';
			}

			var usedCardIds = {};
			this.state.guesses.forEach(function (g) { usedCardIds[g.cardId] = true; });
			if (usedCardIds[this.state.selectedCardId]) {
				this.state.selectedCardId = '';
			}

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
			this.els.addGuessBtn.disabled = !this.state.selectedCardId;
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

				return '<tr class="' + (hasClose ? 'close-signal' : '') + '">' +
					'<td>' + c.id + '</td>' +
					'<td>' + raceName(c.race) + '</td>' +
					'<td>' + c.number + '</td>' +
					'<td>' + c.value + '</td>' +
					'<td class="dims-cell">' + dimsHtml + '</td>' +
					'<td class="action-cell">' +
					'<button class="prophecy-btn" data-action="prophecy">预言牌</button>' +
					'<button class="exclude-btn" data-action="exclude" data-cardid="' + c.id + '">排除</button>' +
					'</td></tr>';
			}).join('');

			this.els.candidatesTableBody.querySelectorAll('button[data-action="prophecy"]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.markProphecy();
				});
			});
			this.els.candidatesTableBody.querySelectorAll('button[data-action="exclude"]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.excludeCandidate(btn.dataset.cardid);
				});
			});

			var coreTotal = 0;
			cards.forEach(function (c) {
				if (c.isCoreSet) coreTotal++;
			});
			var excludedCount = this.state.excludedCardIds.length;
			this.els.candidateStats.textContent = list.length + '/' + coreTotal;

			// 恢复全部按钮
			var restoreBtn = document.getElementById('restoreAllBtn');
			if (restoreBtn) {
				if (excludedCount > 0) {
					restoreBtn.style.display = '';
					restoreBtn.onclick = function () { self.restoreAllExcluded(); };
				} else {
					restoreBtn.style.display = 'none';
				}
			}
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

	var ViewRouter = {
		init: function () {
			this.cacheEls();
			if (!this.els.mainApp || !this.els.simulatorApp) return;
			this.bindEvents();
			this.applyHash();
		},

		cacheEls: function () {
			this.els = {
				mainApp: document.getElementById('mainApp'),
				simulatorApp: document.getElementById('simulatorApp'),
				mainViewBtn: document.getElementById('mainViewBtn'),
				simulatorViewBtn: document.getElementById('simulatorViewBtn')
			};
		},

		bindEvents: function () {
			var self = this;
			this.els.mainViewBtn.addEventListener('click', function () {
				if (window.location.hash) {
					window.history.pushState('', document.title, window.location.pathname + window.location.search);
				}
				self.show('main');
			});
			this.els.simulatorViewBtn.addEventListener('click', function () {
				if (window.location.hash !== '#simulator') {
					window.location.hash = 'simulator';
				} else {
					self.show('simulator');
				}
			});
			window.addEventListener('hashchange', function () {
				self.applyHash();
			});
		},

		applyHash: function () {
			this.show(window.location.hash === '#simulator' ? 'simulator' : 'main');
		},

		show: function (view) {
			var isSimulator = view === 'simulator';
			this.els.mainApp.hidden = isSimulator;
			this.els.simulatorApp.hidden = !isSimulator;
			this.els.mainViewBtn.classList.toggle('selected', !isSimulator);
			this.els.simulatorViewBtn.classList.toggle('selected', isSimulator);
		}
	};

	var Simulator = {
		state: {
			cards: [],
			coreCards: [],
			serverMode: 'official',
			enabledPacks: ['core'],
			selectedRace: '',
			selectedLevel: '',
			selectedCardId: '',
			prophecyCardId: '',
			attempts: 0,
			history: [],
			solvedProphecies: [],
			predictRace: 'all',
			predictLevel: 'all',
			predictCardId: ''
		},
		loadToken: 0,

		init: function () {
			this.cacheEls();
			if (!this.els.root) return;
			this.bindEvents();
			this.renderServerModeToggle();
			this.renderPackToggles();
			this.reloadCards();
		},

		cacheEls: function () {
			this.els = {
				root: document.getElementById('simulatorApp'),
				serverModeToggle: document.getElementById('simServerModeToggle'),
				packToggles: document.getElementById('simPackToggles'),
				prophecyState: document.getElementById('simProphecyState'),
				attemptCount: document.getElementById('simAttemptCount'),
				raceRow: document.getElementById('simRaceRow'),
				levelRow: document.getElementById('simLevelRow'),
				cardRow: document.getElementById('simCardRow'),
				enterBtn: document.getElementById('simEnterBtn'),
				restartBtn: document.getElementById('simRestartBtn'),
				predictBtn: document.getElementById('simPredictBtn'),
				historyStats: document.getElementById('simHistoryStats'),
				historyList: document.getElementById('simHistoryList'),
				solvedList: document.getElementById('simSolvedList'),
				predictModal: document.getElementById('simPredictModal'),
				closePredictModal: document.getElementById('closeSimPredictModal'),
				cancelPredictBtn: document.getElementById('cancelSimPredictBtn'),
				confirmPredictBtn: document.getElementById('confirmSimPredictBtn'),
				predictRaceRow: document.getElementById('simPredictRaceRow'),
				predictLevelRow: document.getElementById('simPredictLevelRow'),
				predictCardGrid: document.getElementById('simPredictCardGrid'),
				toast: document.getElementById('simulatorToast')
			};
		},

		bindEvents: function () {
			var self = this;
			this.els.enterBtn.addEventListener('click', function () {
				self.addEntry();
			});
			this.els.restartBtn.addEventListener('click', function () {
				self.restartGame();
			});
			this.els.predictBtn.addEventListener('click', function () {
				self.openPredictModal();
			});
			this.els.serverModeToggle.querySelectorAll('button[data-sim-server-mode]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.switchServerMode(btn.dataset.simServerMode);
				});
			});
			this.els.closePredictModal.addEventListener('click', function () {
				self.hidePredictModal();
			});
			this.els.cancelPredictBtn.addEventListener('click', function () {
				self.hidePredictModal();
			});
			this.els.confirmPredictBtn.addEventListener('click', function () {
				self.confirmPrediction();
			});
			window.addEventListener('click', function (e) {
				if (e.target === self.els.predictModal) {
					self.hidePredictModal();
				}
			});
		},

		getPackMode: function () {
			return APP_PACK_MODES[this.state.serverMode] ? this.state.serverMode : 'official';
		},

		getPackModeConfig: function () {
			return APP_PACK_MODES[this.getPackMode()];
		},

		getPackRegistry: function () {
			return this.getPackModeConfig().packs;
		},

		getCorePackKey: function () {
			return this.getPackModeConfig().coreKey;
		},

		normalizeEnabledPacks: function () {
			var registry = this.getPackRegistry();
			var coreKey = this.getCorePackKey();
			var available = {};
			var used = {};
			registry.forEach(function (entry) {
				available[entry.key] = true;
			});
			this.state.enabledPacks = this.state.enabledPacks.filter(function (key) {
				if (!available[key] || used[key]) return false;
				used[key] = true;
				return true;
			});
			if (this.state.enabledPacks.indexOf(coreKey) === -1) {
				this.state.enabledPacks.unshift(coreKey);
			}
		},

		resetSession: function () {
			this.state.history = [];
			this.state.solvedProphecies = [];
			this.state.attempts = 0;
			this.state.prophecyCardId = '';
			this.state.selectedRace = '';
			this.state.selectedLevel = '';
			this.state.selectedCardId = '';
			this.state.predictRace = 'all';
			this.state.predictLevel = 'all';
			this.state.predictCardId = '';
		},

		switchServerMode: function (mode) {
			if (!APP_PACK_MODES[mode] || this.getPackMode() === mode) return;
			this.state.serverMode = mode;
			this.state.enabledPacks = [this.getCorePackKey()];
			this.state.cards = [];
			this.state.coreCards = [];
			this.resetSession();
			this.hidePredictModal();
			this.renderServerModeToggle();
			this.renderPackToggles();
			this.reloadCards();
		},

		renderServerModeToggle: function () {
			var mode = this.getPackMode();
			this.els.serverModeToggle.querySelectorAll('button[data-sim-server-mode]').forEach(function (btn) {
				btn.classList.toggle('selected', btn.dataset.simServerMode === mode);
			});
		},

		reloadCards: function () {
			var self = this;
			var token = ++this.loadToken;
			this.normalizeEnabledPacks();
			this.renderStatus();

			var coreKey = this.getCorePackKey();
			var toLoad = this.getPackRegistry().filter(function (entry) {
				return self.state.enabledPacks.indexOf(entry.key) !== -1;
			});

			Promise.all(toLoad.map(function (entry) {
				return loadPackScript(entry);
			}))
				.then(function (datasets) {
					if (token !== self.loadToken) return;
					var cards = [];
					datasets.forEach(function (data, index) {
						var entry = toLoad[index];
						var isCore = entry.key === coreKey;
						data.cards.forEach(function (c) {
							cards.push({
								id: c.id,
								race: c.race,
								level: Number(c.level),
								number: Number(c.number),
								value: Number(c.value),
								packKey: entry.key,
								packName: entry.name,
								isCoreSet: isCore
							});
						});
					});
					self.state.cards = cards;
					self.state.coreCards = cards.filter(function (c) {
						return c.isCoreSet;
					});
					if (!self.getCoreCardById(self.state.prophecyCardId)) {
						self.pickNewProphecy();
					}
					self.ensureEntrySelection();
					self.renderAll();
				})
				.catch(function (err) {
					if (token !== self.loadToken) return;
					self.renderAll();
					self.showToast('加载失败');
					console.error(err);
				});
		},

		renderPackToggles: function () {
			var self = this;
			this.normalizeEnabledPacks();
			var coreKey = this.getCorePackKey();
			this.els.packToggles.innerHTML = this.getPackRegistry().map(function (entry) {
				var isCore = entry.key === coreKey;
				var checked = self.state.enabledPacks.indexOf(entry.key) !== -1;
				return '<label>' +
					'<input type="checkbox" data-sim-pack="' + entry.key + '"' +
					(checked ? ' checked' : '') +
					(isCore ? ' disabled' : '') +
					'> ' + escapeHtml(entry.name) +
					'</label>';
			}).join('');

			this.els.packToggles.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
				cb.addEventListener('change', function () {
					var key = cb.dataset.simPack;
					if (cb.checked && self.state.enabledPacks.indexOf(key) === -1) {
						self.state.enabledPacks.push(key);
					}
					if (!cb.checked) {
						self.state.enabledPacks = self.state.enabledPacks.filter(function (k) {
							return k !== key;
						});
					}
					self.resetSession();
					self.reloadCards();
				});
			});
		},

		restartGame: function () {
			this.state.history = [];
			this.state.solvedProphecies = [];
			this.state.attempts = 0;
			this.state.prophecyCardId = '';
			this.state.selectedCardId = '';
			this.state.predictCardId = '';
			this.pickNewProphecy();
			this.ensureEntrySelection();
			this.renderAll();
		},

		pickNewProphecy: function () {
			var solved = {};
			this.state.solvedProphecies.forEach(function (item) {
				solved[item.cardId] = true;
			});
			var pool = this.state.coreCards.filter(function (card) {
				return !solved[card.id];
			});
			if (pool.length === 0) {
				this.state.prophecyCardId = '';
				this.state.attempts = 0;
				return;
			}
			var index = Math.floor(Math.random() * pool.length);
			this.state.prophecyCardId = pool[index].id;
			this.state.attempts = 0;
		},

		ensureEntrySelection: function () {
			var cards = this.state.cards;
			if (cards.length === 0) {
				this.state.selectedRace = '';
				this.state.selectedLevel = '';
				this.state.selectedCardId = '';
				return;
			}

			var races = this.getRaces(cards);
			if (races.indexOf(this.state.selectedRace) === -1) {
				this.state.selectedRace = races[0] || '';
			}

			var levelCards = cards.filter(function (c) {
				return c.race === this.state.selectedRace;
			}, this);
			var levels = this.getLevels(levelCards);
			if (levels.indexOf(Number(this.state.selectedLevel)) === -1) {
				this.state.selectedLevel = levels.length > 0 ? String(levels[0]) : '';
			}

			var enteredCardIds = this.getEnteredCardIds();
			var selectedExists = cards.some(function (c) {
				return !enteredCardIds[c.id] &&
					c.id === this.state.selectedCardId &&
					c.race === this.state.selectedRace &&
					String(c.level) === String(this.state.selectedLevel);
			}, this);
			if (!selectedExists) {
				this.state.selectedCardId = '';
			}
		},

		getRaces: function (cards) {
			var set = {};
			cards.forEach(function (card) {
				if (card.race) set[card.race] = true;
			});
			return Object.keys(set).sort(sortRaces);
		},

		getLevels: function (cards) {
			var set = {};
			cards.forEach(function (card) {
				set[card.level] = true;
			});
			return Object.keys(set).map(Number).sort(function (a, b) {
				return a - b;
			});
		},

		cardSort: function (a, b) {
			return sortRaces(a.race, b.race) ||
				a.level - b.level ||
				a.number - b.number ||
				a.value - b.value ||
				a.id.localeCompare(b.id);
		},

		getCardById: function (cardId) {
			for (var i = 0; i < this.state.cards.length; i++) {
				if (this.state.cards[i].id === cardId) return this.state.cards[i];
			}
			return null;
		},

		getCoreCardById: function (cardId) {
			for (var i = 0; i < this.state.coreCards.length; i++) {
				if (this.state.coreCards[i].id === cardId) return this.state.coreCards[i];
			}
			return null;
		},

		getEnteredCardIds: function () {
			var ids = {};
			this.state.history.forEach(function (item) {
				ids[item.cardId] = true;
			});
			return ids;
		},

		matchesProphecy: function (card, prophecy) {
			if (!card || !prophecy) return false;
			return card.race === prophecy.race ||
				card.number === prophecy.number ||
				Math.abs(card.value - prophecy.value) < CLOSE_THRESHOLD;
		},

		calcKnifeCount: function (card) {
			var self = this;
			var total = 0;
			var current = this.getCoreCardById(this.state.prophecyCardId);
			if (this.matchesProphecy(card, current)) {
				total += 1;
			}
			this.state.solvedProphecies.forEach(function (item) {
				var prophecy = self.getCoreCardById(item.cardId);
				if (self.matchesProphecy(card, prophecy)) {
					total += 2;
				}
			});
			return total;
		},

		addEntry: function () {
			var card = this.getCardById(this.state.selectedCardId);
			if (!card) return;
			if (this.getEnteredCardIds()[card.id]) {
				this.state.selectedCardId = '';
				this.renderEntrySelectors();
				return;
			}
			var knifeCount = this.calcKnifeCount(card);
			this.state.history.push({
				cardId: card.id,
				knifeCount: knifeCount
			});
			this.renderAll();
		},

		openPredictModal: function () {
			if (!this.state.prophecyCardId) {
				this.showToast('已完成');
				return;
			}
			this.state.predictRace = 'all';
			this.state.predictLevel = 'all';
			this.state.predictCardId = '';
			this.els.predictModal.style.display = 'block';
			this.renderPredictModal();
		},

		hidePredictModal: function () {
			this.els.predictModal.style.display = 'none';
		},

		getPredictPool: function () {
			var solved = {};
			this.state.solvedProphecies.forEach(function (item) {
				solved[item.cardId] = true;
			});
			return this.state.coreCards.filter(function (card) {
				return !solved[card.id];
			}).sort(this.cardSort);
		},

		renderPredictModal: function () {
			var self = this;
			var pool = this.getPredictPool();
			var races = this.getRaces(pool);
			var raceHtml = '<button type="button" class="race-btn' +
				(this.state.predictRace === 'all' ? ' selected' : '') +
				'" data-race="all">全部</button>';
			raceHtml += races.map(function (race) {
				return '<button type="button" class="race-btn' +
					(self.state.predictRace === race ? ' selected' : '') +
					'" data-race="' + escapeHtml(race) + '">' +
					escapeHtml(raceName(race)) +
					'</button>';
			}).join('');
			this.els.predictRaceRow.innerHTML = raceHtml;

			var raceFiltered = pool.filter(function (card) {
				return self.state.predictRace === 'all' || card.race === self.state.predictRace;
			});
			var levels = this.getLevels(raceFiltered);
			if (this.state.predictLevel !== 'all' && levels.indexOf(Number(this.state.predictLevel)) === -1) {
				this.state.predictLevel = 'all';
			}
			var levelHtml = '<button type="button" class="level-btn' +
				(this.state.predictLevel === 'all' ? ' selected' : '') +
				'" data-level="all">全部</button>';
			levelHtml += levels.map(function (level) {
				return '<button type="button" class="level-btn' +
					(String(level) === String(self.state.predictLevel) ? ' selected' : '') +
					'" data-level="' + level + '">' + level + '</button>';
			}).join('');
			this.els.predictLevelRow.innerHTML = levelHtml;

			var cards = raceFiltered.filter(function (card) {
				return self.state.predictLevel === 'all' || String(card.level) === String(self.state.predictLevel);
			}).sort(this.cardSort);
			var selectedInList = cards.some(function (card) {
				return card.id === self.state.predictCardId;
			});
			if (!selectedInList) {
				this.state.predictCardId = '';
			}

			if (cards.length === 0) {
				this.els.predictCardGrid.innerHTML = '<div class="simulator-empty">暂无卡牌</div>';
			} else {
				this.els.predictCardGrid.innerHTML = cards.map(function (card) {
					return '<button type="button" class="simulator-predict-card' +
						(card.id === self.state.predictCardId ? ' selected' : '') +
						'" data-cardid="' + escapeHtml(card.id) + '">' +
						'<span>' + escapeHtml(card.id) + '</span>' +
						'<small>' + escapeHtml(raceName(card.race)) + ' Lv' + card.level + '</small>' +
						'</button>';
				}).join('');
			}
			this.els.confirmPredictBtn.disabled = !this.state.predictCardId;

			this.els.predictRaceRow.querySelectorAll('button[data-race]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.state.predictRace = btn.dataset.race;
					self.state.predictCardId = '';
					self.renderPredictModal();
				});
			});
			this.els.predictLevelRow.querySelectorAll('button[data-level]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.state.predictLevel = btn.dataset.level;
					self.state.predictCardId = '';
					self.renderPredictModal();
				});
			});
			this.els.predictCardGrid.querySelectorAll('button[data-cardid]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.state.predictCardId = btn.dataset.cardid;
					self.renderPredictModal();
				});
			});
		},

		confirmPrediction: function () {
			var guessed = this.getCoreCardById(this.state.predictCardId);
			var current = this.getCoreCardById(this.state.prophecyCardId);
			if (!guessed || !current) return;

			this.state.attempts += 1;
			this.hidePredictModal();

			if (guessed.id === current.id) {
				var message = '预言成功！ 预言牌：' + current.id;
				this.state.solvedProphecies.push({
					cardId: current.id,
					attempts: this.state.attempts
				});
				this.state.history = [];
				this.state.selectedCardId = '';
				this.state.predictCardId = '';
				this.launchFireworks();
				this.pickNewProphecy();
				this.ensureEntrySelection();
				this.renderAll();
				this.showToast(message, true);
				return;
			}

			this.state.predictCardId = '';
			this.renderAll();
			this.showToast('很遗憾，你猜错了...');
		},

		renderAll: function () {
			this.ensureEntrySelection();
			this.renderStatus();
			this.renderEntrySelectors();
			this.renderHistory();
			this.renderSolved();
		},

		renderStatus: function () {
			if (!this.els.prophecyState) return;
			var prophecyText = this.state.prophecyCardId ? '已生成' : '已完成';
			if (this.state.coreCards.length === 0) {
				prophecyText = '加载中';
			}
			this.els.prophecyState.textContent = prophecyText;
			this.els.attemptCount.textContent = this.state.attempts + ' 次';
			this.els.predictBtn.disabled = !this.state.prophecyCardId;
		},

		renderEntrySelectors: function () {
			var self = this;
			var races = this.getRaces(this.state.cards);
			this.els.raceRow.innerHTML = races.map(function (race) {
				return '<button type="button" class="race-btn' +
					(race === self.state.selectedRace ? ' selected' : '') +
					'" data-race="' + escapeHtml(race) + '">' +
					escapeHtml(raceName(race)) +
					'</button>';
			}).join('');
			this.els.raceRow.querySelectorAll('button[data-race]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.state.selectedRace = btn.dataset.race;
					self.state.selectedLevel = '';
					self.state.selectedCardId = '';
					self.ensureEntrySelection();
					self.renderEntrySelectors();
				});
			});

			var raceCards = this.state.cards.filter(function (card) {
				return card.race === self.state.selectedRace;
			});
			var levels = this.getLevels(raceCards);
			this.els.levelRow.innerHTML = levels.map(function (level) {
				return '<button type="button" class="level-btn' +
					(String(level) === String(self.state.selectedLevel) ? ' selected' : '') +
					'" data-level="' + level + '">' + level + '</button>';
			}).join('');
			this.els.levelRow.querySelectorAll('button[data-level]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.state.selectedLevel = btn.dataset.level;
					self.state.selectedCardId = '';
					self.renderEntrySelectors();
				});
			});

			var cards = raceCards.filter(function (card) {
				return String(card.level) === String(self.state.selectedLevel);
			}).sort(this.cardSort);
			var enteredCardIds = this.getEnteredCardIds();
			this.els.cardRow.innerHTML = cards.map(function (card) {
				var used = enteredCardIds[card.id];
				return '<button type="button" class="card-btn' +
					(card.id === self.state.selectedCardId ? ' selected' : '') +
					(used ? ' used' : '') +
					'" data-cardid="' + escapeHtml(card.id) + '"' +
					(used ? ' disabled' : '') + '>' +
					escapeHtml(card.id) +
					'</button>';
			}).join('');
			this.els.cardRow.querySelectorAll('button[data-cardid]').forEach(function (btn) {
				btn.addEventListener('click', function () {
					self.state.selectedCardId = btn.dataset.cardid;
					self.renderEntrySelectors();
				});
			});
			this.els.enterBtn.disabled = !this.state.selectedCardId;
		},

		renderHistory: function () {
			var self = this;
			this.els.historyStats.textContent = this.state.history.length + ' 条';
			if (this.state.history.length === 0) {
				this.els.historyList.innerHTML = '<div class="simulator-empty">暂无记录</div>';
				return;
			}
			this.els.historyList.innerHTML = this.state.history.map(function (item, index) {
				var card = self.getCardById(item.cardId);
				if (!card) return '';
				return '<article class="simulator-history-card">' +
					'<div class="simulator-history-card-head">' +
					'<span class="simulator-history-index">#' + (index + 1) + '</span>' +
					'<strong>' + escapeHtml(card.id) + '</strong>' +
					'<span class="simulator-history-knife">隐刀x' + item.knifeCount + '</span>' +
					'</div>' +
					'<div class="simulator-history-meta">' +
					'<span><small>种族</small>' + escapeHtml(raceName(card.race)) + '</span>' +
					'<span><small>等级</small>Lv' + card.level + '</span>' +
					'<span><small>单位</small>' + card.number + '</span>' +
					'<span><small>价值</small>' + card.value + '</span>' +
					'</div>' +
					'</article>';
			}).join('');
		},

		renderSolved: function () {
			var self = this;
			if (this.state.solvedProphecies.length === 0) {
				this.els.solvedList.innerHTML = '<div class="simulator-empty">暂无记录</div>';
				return;
			}
			this.els.solvedList.innerHTML = this.state.solvedProphecies.map(function (item) {
				var card = self.getCoreCardById(item.cardId);
				if (!card) return '';
				return '<div class="simulator-solved-item">' +
					'<strong>' + escapeHtml(card.id) + '</strong>' +
					'<span>' + item.attempts + ' 次</span>' +
					'<small>' + escapeHtml(raceName(card.race)) + ' Lv' + card.level + '</small>' +
					'</div>';
			}).join('');
		},

		showToast: function (message, success) {
			var el = this.els.toast;
			if (!el) return;
			window.clearTimeout(this.toastTimer);
			el.textContent = message;
			el.classList.toggle('success', !!success);
			el.classList.add('show');
			this.toastTimer = window.setTimeout(function () {
				el.classList.remove('show');
			}, 2200);
		},

		launchFireworks: function () {
			var colors = ['#00e5ff', '#f0d060', '#b47aff', '#e8f0fe'];
			var layer = document.createElement('div');
			layer.className = 'fireworks-layer';
			for (var i = 0; i < 42; i++) {
				var spark = document.createElement('span');
				spark.className = 'firework-spark';
				var angle = Math.random() * Math.PI * 2;
				var distance = 80 + Math.random() * 220;
				spark.style.setProperty('--x', Math.cos(angle) * distance + 'px');
				spark.style.setProperty('--y', Math.sin(angle) * distance + 'px');
				spark.style.setProperty('--c', colors[i % colors.length]);
				spark.style.left = (35 + Math.random() * 30) + '%';
				spark.style.top = (30 + Math.random() * 30) + '%';
				spark.style.animationDelay = (Math.random() * 160) + 'ms';
				layer.appendChild(spark);
			}
			document.body.appendChild(layer);
			window.setTimeout(function () {
				if (layer.parentNode) {
					layer.parentNode.removeChild(layer);
				}
			}, 1200);
		}
	};

	document.addEventListener('DOMContentLoaded', function () {
		App.init();
		Simulator.init();
		ViewRouter.init();
	});
})();
