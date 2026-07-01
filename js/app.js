(() => {
  const DATA = window.__VOCAB_DATA__ || { groups: [], mainCategories: [], sources: [], stats: {} };
  const storeKey = 'aiNovelVocabSite.custom.v1';
  const themeKey = 'aiNovelVocabSite.theme.v1';
  const state = {
    selected: [],
    activeCategory: DATA.mainCategories?.[0] || '综合词条',
    weightModeIndex: 0,
    weightModes: [
      { key: 'novelai', label: '加权：{ } / [ ]', up: (t, level = 1) => `${'{'.repeat(level)}${t}${'}'.repeat(level)}`, down: (t, level = 1) => `${'['.repeat(level)}${t}${']'.repeat(level)}` },
    ],
    custom: loadCustom(),
    showR18: true,
    expandedAll: false,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const els = {
    categoryTabs: $('#categoryTabs'), groupsPanel: $('#groupsPanel'), selectedChips: $('#selectedChips'),
    promptOutput: $('#promptOutput'), copyBtn: $('#copyBtn'), clearBtn: $('#clearBtn'),
    weightModeLabel: $('#weightModeLabel'), dedupeBtn: $('#dedupeBtn'), separatorSelect: $('#separatorSelect'),
    globalSearch: $('#globalSearch'), panelSearch: $('#panelSearch'), searchResults: $('#searchResults'),
    statLine: $('#statLine'), limitSelect: $('#limitSelect'), expandAllBtn: $('#expandAllBtn'), showR18: $('#showR18'),
    customCategory: $('#customCategory'), customInput: $('#customInput'), loadCustomBtn: $('#loadCustomBtn'),
    clearCustomInputBtn: $('#clearCustomInputBtn'), singleTagInput: $('#singleTagInput'), addSingleTagBtn: $('#addSingleTagBtn'),
    customList: $('#customList'), exportCustomBtn: $('#exportCustomBtn'), importCustomBtn: $('#importCustomBtn'),
    importCustomFile: $('#importCustomFile'), wipeCustomBtn: $('#wipeCustomBtn'), randomCategory: $('#randomCategory'),
    randomCount: $('#randomCount'), randomReplace: $('#randomReplace'), randomBtn: $('#randomBtn'), randomPreview: $('#randomPreview'),
    themeToggle: $('#themeToggle'), toast: $('#toast'), selectionHint: $('#selectionHint')
  };

  init();

  function init() {
    initTheme();
    renderTabs();
    renderRandomCategories();
    renderGroups();
    renderCustomList();
    bindEvents();
    updateOutput();
  }

  function bindEvents() {
    els.copyBtn.addEventListener('click', copyOutput);
    els.clearBtn.addEventListener('click', () => { state.selected = []; updateOutput(); toast('已清空输出'); });
    els.dedupeBtn.addEventListener('click', dedupeSelection);
    els.separatorSelect.addEventListener('change', updateOutput);
    els.globalSearch.addEventListener('input', debounce(() => {
      const q = els.globalSearch.value.trim();
      if (!q) { renderGroups(); return; }
      state.activeCategory = '搜索结果';
      renderTabs();
      renderGroups(q);
    }, 120));
    els.panelSearch.addEventListener('input', debounce(() => renderPanelSearch(els.panelSearch.value.trim()), 120));
    els.limitSelect.addEventListener('change', renderGroups);
    els.expandAllBtn.addEventListener('click', () => { state.expandedAll = !state.expandedAll; renderGroups(); });
    els.showR18.addEventListener('change', () => { state.showR18 = els.showR18.checked; renderGroups(); renderRandomCategories(); });
    els.loadCustomBtn.addEventListener('click', importCustomText);
    els.clearCustomInputBtn.addEventListener('click', () => { els.customInput.value = ''; });
    els.addSingleTagBtn.addEventListener('click', () => {
      const tag = els.singleTagInput.value.trim();
      if (!tag) return toast('请输入词条');
      addCustomTags(els.customCategory.value.trim() || '我的词条', [tag]);
      els.singleTagInput.value = '';
    });
    els.exportCustomBtn.addEventListener('click', exportCustom);
    els.importCustomBtn.addEventListener('click', () => els.importCustomFile.click());
    els.importCustomFile.addEventListener('change', importCustomJson);
    els.wipeCustomBtn.addEventListener('click', wipeCustom);
    els.randomBtn.addEventListener('click', randomGenerate);
    els.themeToggle.addEventListener('click', toggleTheme);
    $$('.side-tabs .tab').forEach(btn => btn.addEventListener('click', () => {
      $$('.side-tabs .tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.side-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === btn.dataset.side));
    }));
    els.promptOutput.addEventListener('input', syncSelectedFromManualOutput);
  }

  function allGroups(includeCustom = true) {
    const base = DATA.groups || [];
    if (!includeCustom) return base;
    const customGroups = Object.entries(state.custom).map(([name, tags], i) => ({
      id: `custom-${i}`, name, mainCategory: '自定义', sourceTitle: '浏览器自定义', sourceUrl: '', r18: false, tags
    }));
    return base.concat(customGroups);
  }

  function visibleGroups() {
    return allGroups().filter(g => state.showR18 || !g.r18);
  }

  function renderTabs() {
    const cats = [...new Set([...(DATA.mainCategories || []), '自定义'])].filter(Boolean);
    if (state.activeCategory === '搜索结果' && !cats.includes('搜索结果')) cats.unshift('搜索结果');
    els.categoryTabs.innerHTML = cats.map(cat => `<button class="tab ${cat === state.activeCategory ? 'active' : ''}" data-cat="${escapeAttr(cat)}" type="button">${escapeHtml(cat)}</button>`).join('');
    $$('.tab', els.categoryTabs).forEach(btn => btn.addEventListener('click', () => {
      state.activeCategory = btn.dataset.cat;
      els.globalSearch.value = '';
      renderTabs(); renderGroups();
    }));
  }

  function renderGroups(searchTerm = '') {
    updateModeLabel();
    const q = (searchTerm || '').toLowerCase();
    const limit = Number(els.limitSelect.value || 80);
    let groups = visibleGroups();
    if (q) {
      groups = groups.map(g => ({ ...g, tags: g.tags.filter(t => matches(t, q) || matches(g.name, q) || matches(g.sourceTitle, q)) }))
        .filter(g => g.tags.length || matches(g.name, q) || matches(g.sourceTitle, q));
    } else if (state.activeCategory !== '搜索结果') {
      groups = groups.filter(g => g.mainCategory === state.activeCategory);
    }
    const totalTags = groups.reduce((sum, g) => sum + g.tags.length, 0);
    els.statLine.textContent = `${groups.length} 个词条组 · ${totalTags} 个可见词条 · 内置去重词条 ${DATA.stats?.uniqueTagCount || 0} 个`;
    els.expandAllBtn.textContent = state.expandedAll ? '全部折叠' : '全部展开';
    if (!groups.length) {
      els.groupsPanel.innerHTML = `<div class="empty-state">没有找到匹配的词条。</div>`;
      return;
    }
    els.groupsPanel.innerHTML = groups.map((g, idx) => {
      const shown = g.tags.slice(0, limit);
      const more = Math.max(0, g.tags.length - shown.length);
      const openAttr = state.expandedAll ? 'open' : '';
      return `<details class="group-card" ${openAttr}>
        <summary><span class="summary-left"><span>${escapeHtml(g.name)}</span></span><span class="group-meta">${g.tags.length}词 · ${escapeHtml(g.sourceTitle || '')}</span></summary>
        <div class="tag-grid">${shown.map(tagButton).join('')}${more ? `<span class="group-meta">还有 ${more} 个，切换“每组显示”为全部可见</span>` : ''}</div>
      </details>`;
    }).join('');
    bindTagButtons(els.groupsPanel);
  }

  function tagButton(t) {
    const et = escapeAttr(t);
    return `<span class="tag-item"><button class="tag-text" data-tag="${et}" title="加入：${et}" type="button">${escapeHtml(t)}</button></span>`;
  }

  function bindTagButtons(root) {
    $$('[data-tag]', root).forEach(btn => btn.addEventListener('click', () => {
      addTag(btn.dataset.tag, 0);
    }));
  }

  function addTag(text, weight = 0) {
    state.selected.push({ text, weight });
    updateOutput();
  }

  function updateOutput() {
    const sep = els.separatorSelect.value.replace('\\n', '\n');
    const mode = state.weightModes[state.weightModeIndex];
    els.promptOutput.value = state.selected.map(item => formatTag(item.text, item.weight, mode)).join(sep);
    els.selectedChips.innerHTML = state.selected.map((item, idx) => {
      const weightClass = item.weight > 0 ? 'is-up' : item.weight < 0 ? 'is-down' : '';
      const weightText = item.weight > 0 ? '已加权' : item.weight < 0 ? '已降权' : '未加权';
      return `<span class="selected-chip ${weightClass}" title="${weightText}"><button class="chip-adjust" type="button" data-adjust="${idx}" data-delta="1" title="加权">+</button><button class="chip-adjust" type="button" data-adjust="${idx}" data-delta="-1" title="降权">−</button><span class="chip-text">${escapeHtml(item.text)}</span><button class="chip-remove" type="button" data-remove="${idx}" title="移除">🗑</button></span>`;
    }).join('');
    $$('[data-adjust]', els.selectedChips).forEach(btn => btn.addEventListener('click', () => {
      adjustWeight(Number(btn.dataset.adjust), Number(btn.dataset.delta));
    }));
    $$('[data-remove]', els.selectedChips).forEach(btn => btn.addEventListener('click', () => {
      state.selected.splice(Number(btn.dataset.remove), 1); updateOutput();
    }));
    els.selectionHint.textContent = state.selected.length ? `已选择 ${state.selected.length} 个词条。` : '点击下方词条后会加入这里。';
  }

  function adjustWeight(index, delta) {
    const item = state.selected[index];
    if (!item) return;
    // 再次点击相同方向会回到未加权；点击相反方向会切换方向。
    if (delta > 0) item.weight = item.weight > 0 ? 0 : 1;
    if (delta < 0) item.weight = item.weight < 0 ? 0 : -1;
    updateOutput();
  }

  function formatTag(text, weight, mode) {
    const level = Math.max(1, Math.abs(Number(weight) || 0));
    if (weight > 0) return mode.up(text, level);
    if (weight < 0) return mode.down(text, level);
    return text;
  }

  function updateModeLabel() { els.weightModeLabel.textContent = state.weightModes[state.weightModeIndex].label; }

  async function copyOutput() {
    const val = els.promptOutput.value.trim();
    if (!val) return toast('没有可复制的内容');
    try {
      await navigator.clipboard.writeText(val);
      toast('已复制到剪贴板');
    } catch (e) {
      els.promptOutput.select();
      document.execCommand('copy');
      toast('已复制');
    }
  }

  function dedupeSelection() {
    const seen = new Set();
    state.selected = state.selected.filter(item => {
      const key = `${item.text}|${item.weight}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    updateOutput(); toast('已去除重复词条');
  }

  function syncSelectedFromManualOutput() {
    // Manual editing is allowed; it does not overwrite chips to avoid accidental parsing errors.
    els.selectionHint.textContent = '输出框已手动编辑；继续点击词条会追加到选择区。';
  }

  function importCustomText() {
    const text = els.customInput.value.trim();
    if (!text) return toast('请输入要导入的词条');
    const tags = splitInput(text);
    addCustomTags(els.customCategory.value.trim() || '我的词条', tags);
  }

  function splitInput(text) {
    return [...new Set(text.split(/[，,;；\n\t ]+/).map(s => s.trim()).filter(Boolean))];
  }

  function addCustomTags(category, tags) {
    if (!state.custom[category]) state.custom[category] = [];
    const merged = new Set(state.custom[category]);
    tags.forEach(t => merged.add(t));
    state.custom[category] = [...merged];
    saveCustom(); renderCustomList(); renderTabs(); renderGroups(); renderRandomCategories();
    toast(`已添加 ${tags.length} 个自定义词条`);
  }

  function renderCustomList() {
    const entries = Object.entries(state.custom);
    if (!entries.length) {
      els.customList.innerHTML = '<div class="empty-state">暂无自定义词条。</div>';
      return;
    }
    els.customList.innerHTML = entries.map(([cat, tags]) => `<div class="result-card"><div class="result-title">${escapeHtml(cat)} · ${tags.length}</div><div class="result-tags">${tags.map(t => `<span class="custom-row"><span>${escapeHtml(t)}</span><button class="danger-outline-btn" data-del-cat="${escapeAttr(cat)}" data-del-tag="${escapeAttr(t)}" type="button">删除</button></span>`).join('')}</div></div>`).join('');
    $$('[data-del-tag]', els.customList).forEach(btn => btn.addEventListener('click', () => {
      const cat = btn.dataset.delCat, tag = btn.dataset.delTag;
      state.custom[cat] = (state.custom[cat] || []).filter(t => t !== tag);
      if (!state.custom[cat].length) delete state.custom[cat];
      saveCustom(); renderCustomList(); renderGroups(); renderRandomCategories();
    }));
  }

  function loadCustom() {
    try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch { return {}; }
  }
  function saveCustom() { localStorage.setItem(storeKey, JSON.stringify(state.custom)); }

  function exportCustom() {
    const blob = new Blob([JSON.stringify(state.custom, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'ai-novel-custom-vocab.json'; a.click();
    URL.revokeObjectURL(a.href);
  }

  function importCustomJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        Object.entries(data).forEach(([cat, tags]) => Array.isArray(tags) && addCustomTags(cat, tags));
      } catch (err) { toast('JSON格式不正确'); }
      e.target.value = '';
    };
    reader.readAsText(file, 'utf-8');
  }

  function wipeCustom() {
    if (!confirm('确定删除本浏览器保存的所有自定义词条？')) return;
    state.custom = {}; saveCustom(); renderCustomList(); renderTabs(); renderGroups(); renderRandomCategories(); toast('已删除自定义词条');
  }

  function renderPanelSearch(q) {
    if (!q) { els.searchResults.innerHTML = '<div class="empty-state">输入关键词后显示结果。</div>'; return; }
    const lq = q.toLowerCase();
    const results = visibleGroups().map(g => ({ ...g, tags: g.tags.filter(t => matches(t, lq)).slice(0, 80) })).filter(g => g.tags.length);
    if (!results.length) { els.searchResults.innerHTML = '<div class="empty-state">没有搜索结果。</div>'; return; }
    els.searchResults.innerHTML = results.slice(0, 20).map(g => `<div class="result-card"><div class="result-title">${escapeHtml(g.name)} · ${g.tags.length}</div><div class="result-tags">${g.tags.map(tagButton).join('')}</div></div>`).join('');
    bindTagButtons(els.searchResults);
  }

  function renderRandomCategories() {
    const cats = ['全部', ...new Set(visibleGroups().map(g => g.mainCategory))];
    els.randomCategory.innerHTML = cats.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join('');
  }

  function randomGenerate() {
    const cat = els.randomCategory.value;
    const count = Math.max(1, Math.min(80, Number(els.randomCount.value || 8)));
    let pool = visibleGroups().filter(g => cat === '全部' || g.mainCategory === cat).flatMap(g => g.tags);
    pool = [...new Set(pool)];
    if (!pool.length) return toast('该分类没有可随机的词条');
    shuffle(pool);
    const picked = pool.slice(0, count);
    if (els.randomReplace.checked) state.selected = [];
    picked.forEach(t => state.selected.push({ text: t, weight: 0 }));
    updateOutput();
    els.randomPreview.innerHTML = `<div class="result-card"><div class="result-title">本次随机</div><div class="result-tags">${picked.map(tagButton).join('')}</div></div>`;
    bindTagButtons(els.randomPreview);
    toast(`已随机生成 ${picked.length} 个词条`);
  }


  function initTheme() {
    const saved = localStorage.getItem(themeKey);
    if (saved === 'dark') document.body.classList.add('dark');
    els.themeToggle.textContent = document.body.classList.contains('dark') ? '浅色模式' : '深色模式';
  }
  function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem(themeKey, document.body.classList.contains('dark') ? 'dark' : 'light');
    els.themeToggle.textContent = document.body.classList.contains('dark') ? '浅色模式' : '深色模式';
  }

  function matches(text, q) { return String(text).toLowerCase().includes(q); }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
  function escapeAttr(s) { return escapeHtml(s).replace(/'/g, '&#39;'); }
  function debounce(fn, wait) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); }; }
  function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  function toast(msg) { els.toast.textContent = msg; els.toast.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => els.toast.classList.remove('show'), 1800); }
})();
