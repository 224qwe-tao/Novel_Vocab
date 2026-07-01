(() => {
  const DATA = window.__VOCAB_DATA__ || { groups: [], mainCategories: [], sources: [], stats: {} };
  const storeKey = 'aiNovelVocabSite.custom.v2';
  const legacyStoreKey = 'aiNovelVocabSite.custom.v1';
  const themeKey = 'aiNovelVocabSite.theme.v1';
  const state = {
    selected: [],
    activeCategory: DATA.mainCategories?.[0] || '综合词条',
    custom: loadCustom(),
    expandedAll: false,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const els = {
    categoryTabs: $('#categoryTabs'),
    groupsPanel: $('#groupsPanel'),
    selectedChips: $('#selectedChips'),
    promptOutput: $('#promptOutput'),
    copyBtn: $('#copyBtn'),
    clearBtn: $('#clearBtn'),
    separatorSelect: $('#separatorSelect'),
    globalSearch: $('#globalSearch'),
    panelSearch: $('#panelSearch'),
    searchResults: $('#searchResults'),
    statLine: $('#statLine'),
    limitSelect: $('#limitSelect'),
    expandAllBtn: $('#expandAllBtn'),
    newGroupName: $('#newGroupName'),
    createGroupBtn: $('#createGroupBtn'),
    targetGroupSelect: $('#targetGroupSelect'),
    customInput: $('#customInput'),
    loadCustomBtn: $('#loadCustomBtn'),
    clearCustomInputBtn: $('#clearCustomInputBtn'),
    singleTagInput: $('#singleTagInput'),
    addSingleTagBtn: $('#addSingleTagBtn'),
    customList: $('#customList'),
    importCustomBtn: $('#importCustomBtn'),
    importCustomFile: $('#importCustomFile'),
    themeToggle: $('#themeToggle'),
    toast: $('#toast'),
    selectionHint: $('#selectionHint')
  };

  init();

  function init() {
    initTheme();
    ensureInitialCustomGroup();
    renderTabs();
    renderGroups();
    renderCustomTools();
    bindEvents();
    updateOutput();
  }

  function bindEvents() {
    els.copyBtn.addEventListener('click', copyOutput);
    els.clearBtn.addEventListener('click', () => {
      state.selected = [];
      updateOutput();
      toast('已清空输出');
    });
    els.separatorSelect.addEventListener('change', updateOutput);
    els.globalSearch.addEventListener('input', debounce(() => {
      const q = els.globalSearch.value.trim();
      if (!q) {
        renderGroups();
        return;
      }
      state.activeCategory = '搜索结果';
      renderTabs();
      renderGroups(q);
    }, 120));
    els.panelSearch.addEventListener('input', debounce(() => renderPanelSearch(els.panelSearch.value.trim()), 120));
    els.limitSelect.addEventListener('change', renderGroups);
    els.expandAllBtn.addEventListener('click', () => {
      state.expandedAll = !state.expandedAll;
      renderGroups();
    });
    els.createGroupBtn.addEventListener('click', createCustomGroup);
    els.loadCustomBtn.addEventListener('click', importCustomText);
    els.clearCustomInputBtn.addEventListener('click', () => { els.customInput.value = ''; });
    els.addSingleTagBtn.addEventListener('click', () => {
      const tag = els.singleTagInput.value.trim();
      if (!tag) return toast('请输入词条');
      addCustomTags(getTargetGroupName(), [tag]);
      els.singleTagInput.value = '';
    });
    els.importCustomBtn.addEventListener('click', () => els.importCustomFile.click());
    els.importCustomFile.addEventListener('change', importCustomJson);
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
      id: `custom-${i}`,
      name,
      mainCategory: '自定义',
      sourceTitle: '本地自定义',
      sourceUrl: '',
      r18: false,
      tags
    }));
    return base.concat(customGroups);
  }

  function visibleGroups() {
    return allGroups();
  }

  function renderTabs() {
    const cats = [...new Set([...(DATA.mainCategories || []), '自定义'])].filter(Boolean);
    if (state.activeCategory === '搜索结果' && !cats.includes('搜索结果')) cats.unshift('搜索结果');
    els.categoryTabs.innerHTML = cats.map(cat => `<button class="tab ${cat === state.activeCategory ? 'active' : ''}" data-cat="${escapeAttr(cat)}" type="button">${escapeHtml(cat)}</button>`).join('');
    $$('.tab', els.categoryTabs).forEach(btn => btn.addEventListener('click', () => {
      state.activeCategory = btn.dataset.cat;
      els.globalSearch.value = '';
      renderTabs();
      renderGroups();
    }));
  }

  function renderGroups(searchTerm = '') {
    const q = (searchTerm || '').toLowerCase();
    const limit = Number(els.limitSelect.value || 80);
    let groups = visibleGroups();

    if (q) {
      groups = groups
        .map(g => ({ ...g, tags: g.tags.filter(t => matches(t, q) || matches(g.name, q) || matches(g.sourceTitle, q)) }))
        .filter(g => g.tags.length || matches(g.name, q) || matches(g.sourceTitle, q));
    } else if (state.activeCategory !== '搜索结果') {
      groups = groups.filter(g => g.mainCategory === state.activeCategory);
    }

    const totalTags = groups.reduce((sum, g) => sum + g.tags.length, 0);
    els.statLine.textContent = `${groups.length} 个词条组 · ${totalTags} 个可见词条`;
    els.expandAllBtn.textContent = state.expandedAll ? '全部折叠' : '全部展开';

    if (!groups.length) {
      els.groupsPanel.innerHTML = `<div class="empty-state">没有找到匹配的词条。</div>`;
      return;
    }

    els.groupsPanel.innerHTML = groups.map(g => {
      const shown = g.tags.slice(0, limit);
      const more = Math.max(0, g.tags.length - shown.length);
      const openAttr = state.expandedAll ? 'open' : '';
      return `<details class="group-card" ${openAttr}>
        <summary><span class="summary-left"><span>${escapeHtml(g.name)}</span></span><span class="group-meta">${g.tags.length}词 · ${escapeHtml(g.sourceTitle || '')}</span></summary>
        <div class="tag-grid">${shown.map(tagButton).join('')}${more ? `<span class="group-meta more-note">还有 ${more} 个，切换“每组显示”为全部可见</span>` : ''}</div>
      </details>`;
    }).join('');
    bindTagButtons(els.groupsPanel);
  }

  function tagButton(t) {
    const et = escapeAttr(t);
    return `<span class="tag-item"><button class="tag-text" data-tag="${et}" title="加入：${et}" type="button">${escapeHtml(t)}</button></span>`;
  }

  function bindTagButtons(root) {
    $$('[data-tag]', root).forEach(btn => btn.addEventListener('click', () => addTag(btn.dataset.tag)));
  }

  function addTag(text) {
    state.selected.push(text);
    updateOutput();
  }

  function updateOutput() {
    const sep = els.separatorSelect.value.replace('\\n', '\n');
    els.promptOutput.value = state.selected.join(sep);
    els.selectedChips.innerHTML = state.selected.map((text, idx) => (
      `<span class="selected-chip"><span class="chip-text">${escapeHtml(text)}</span><button class="chip-remove" type="button" data-remove="${idx}" title="移除">×</button></span>`
    )).join('');
    $$('[data-remove]', els.selectedChips).forEach(btn => btn.addEventListener('click', () => {
      state.selected.splice(Number(btn.dataset.remove), 1);
      updateOutput();
    }));
    els.selectionHint.textContent = state.selected.length ? `已选择 ${state.selected.length} 个词条。` : '点击下方词条后会加入这里。';
  }

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

  function syncSelectedFromManualOutput() {
    els.selectionHint.textContent = '输出框已手动编辑；继续点击词条会追加到选择区。';
  }

  function ensureInitialCustomGroup() {
    if (!Object.keys(state.custom).length) {
      state.custom = { '我的词条': [] };
      saveCustom();
    }
  }

  function getTargetGroupName() {
    const selected = els.targetGroupSelect.value;
    if (selected) return selected;
    const fallback = els.newGroupName.value.trim() || '我的词条';
    if (!state.custom[fallback]) state.custom[fallback] = [];
    saveCustom();
    renderCustomTools(fallback);
    return fallback;
  }

  function createCustomGroup() {
    const name = els.newGroupName.value.trim();
    if (!name) return toast('请输入词条组名称');
    if (state.custom[name]) return toast('该词条组已存在');
    state.custom[name] = [];
    saveCustom();
    renderTabs();
    renderGroups();
    renderCustomTools(name);
    toast('已新增词条组');
  }

  function importCustomText() {
    const text = els.customInput.value.trim();
    if (!text) return toast('请输入要导入的词条');
    const tags = splitInput(text);
    addCustomTags(getTargetGroupName(), tags);
  }

  function splitInput(text) {
    return [...new Set(text.split(/[，,;；\n\t ]+/).map(s => s.trim()).filter(Boolean))];
  }

  function addCustomTags(groupName, tags) {
    const name = groupName || '我的词条';
    if (!state.custom[name]) state.custom[name] = [];
    const merged = new Set(state.custom[name]);
    tags.forEach(t => merged.add(t));
    state.custom[name] = [...merged];
    saveCustom();
    renderTabs();
    renderGroups();
    renderCustomTools(name);
    toast(`已添加 ${tags.length} 个词条到「${name}」`);
  }

  function renderCustomTools(selectedName = els.targetGroupSelect?.value) {
    renderTargetGroupSelect(selectedName);
    renderCustomList();
  }

  function renderTargetGroupSelect(selectedName = '') {
    const names = Object.keys(state.custom);
    els.targetGroupSelect.innerHTML = names.map(name => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join('');
    if (selectedName && state.custom[selectedName]) els.targetGroupSelect.value = selectedName;
  }

  function renderCustomList() {
    const entries = Object.entries(state.custom);
    if (!entries.length) {
      els.customList.innerHTML = '<div class="empty-state">暂无自定义词条组。</div>';
      return;
    }

    els.customList.innerHTML = entries.map(([cat, tags]) => `
      <details class="result-card custom-group-editor" open>
        <summary>
          <span>${escapeHtml(cat)} · ${tags.length}</span>
        </summary>
        <div class="rename-row">
          <input value="${escapeAttr(cat)}" data-rename-input="${escapeAttr(cat)}" aria-label="修改词条组名称" />
          <button class="ghost-btn small" data-rename-group="${escapeAttr(cat)}" type="button">保存名称</button>
          <button class="danger-outline-btn small" data-delete-group="${escapeAttr(cat)}" type="button">删除词条组</button>
        </div>
        <div class="result-tags editable-tags">
          ${tags.length ? tags.map(t => editableTagRow(cat, t)).join('') : '<div class="empty-state slim">这个词条组暂时没有词条。</div>'}
        </div>
      </details>
    `).join('');

    $$('[data-rename-group]', els.customList).forEach(btn => btn.addEventListener('click', () => {
      const oldName = btn.dataset.renameGroup;
      const input = $(`[data-rename-input="${cssEscape(oldName)}"]`, els.customList);
      renameCustomGroup(oldName, input?.value.trim() || '');
    }));

    $$('[data-delete-group]', els.customList).forEach(btn => btn.addEventListener('click', () => {
      const name = btn.dataset.deleteGroup;
      if (!confirm(`确定删除词条组「${name}」？`)) return;
      delete state.custom[name];
      if (!Object.keys(state.custom).length) state.custom = { '我的词条': [] };
      saveCustom();
      renderTabs();
      renderGroups();
      renderCustomTools();
    }));

    $$('[data-save-tag]', els.customList).forEach(btn => btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      const oldTag = btn.dataset.oldTag;
      const input = $(`[data-edit-tag="${cssEscape(cat)}::${cssEscape(oldTag)}"]`, els.customList);
      updateCustomTag(cat, oldTag, input?.value.trim() || '');
    }));

    $$('[data-del-tag]', els.customList).forEach(btn => btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      const tag = btn.dataset.delTag;
      state.custom[cat] = (state.custom[cat] || []).filter(t => t !== tag);
      saveCustom();
      renderGroups();
      renderCustomTools(cat);
    }));
  }

  function editableTagRow(cat, tag) {
    const key = `${cat}::${tag}`;
    return `<span class="custom-row">
      <input class="tag-edit-input" value="${escapeAttr(tag)}" data-edit-tag="${escapeAttr(key)}" aria-label="编辑词条" />
      <button class="ghost-btn small" data-save-tag="1" data-cat="${escapeAttr(cat)}" data-old-tag="${escapeAttr(tag)}" type="button">保存</button>
      <button class="danger-outline-btn small" data-del-tag="${escapeAttr(tag)}" data-cat="${escapeAttr(cat)}" type="button">删除</button>
    </span>`;
  }

  function renameCustomGroup(oldName, newName) {
    if (!newName) return toast('请输入新的词条组名称');
    if (oldName === newName) return toast('词条组名称未改变');
    const oldTags = state.custom[oldName] || [];
    const next = {};
    Object.entries(state.custom).forEach(([name, tags]) => {
      if (name === oldName) return;
      next[name] = tags;
    });
    next[newName] = [...new Set([...(next[newName] || []), ...oldTags])];
    state.custom = next;
    saveCustom();
    renderTabs();
    renderGroups();
    renderCustomTools(newName);
    toast('已修改词条组名称');
  }

  function updateCustomTag(cat, oldTag, newTag) {
    if (!newTag) return toast('词条不能为空');
    const tags = state.custom[cat] || [];
    const updated = tags.map(t => t === oldTag ? newTag : t);
    state.custom[cat] = [...new Set(updated)];
    saveCustom();
    renderGroups();
    renderCustomTools(cat);
    toast('已更新词条');
  }

  function loadCustom() {
    try {
      const current = JSON.parse(localStorage.getItem(storeKey) || 'null');
      if (current && typeof current === 'object' && !Array.isArray(current)) return normalizeCustom(current);
      const legacy = JSON.parse(localStorage.getItem(legacyStoreKey) || 'null');
      if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) return normalizeCustom(legacy);
      return {};
    } catch {
      return {};
    }
  }

  function normalizeCustom(data) {
    const clean = {};
    Object.entries(data || {}).forEach(([cat, tags]) => {
      if (!cat || !Array.isArray(tags)) return;
      clean[cat] = [...new Set(tags.map(t => String(t).trim()).filter(Boolean))];
    });
    return clean;
  }

  function saveCustom() {
    localStorage.setItem(storeKey, JSON.stringify(state.custom));
  }

  function importCustomJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = normalizeCustom(JSON.parse(reader.result));
        Object.entries(data).forEach(([cat, tags]) => addCustomTags(cat, tags));
      } catch (err) {
        toast('JSON格式不正确');
      }
      e.target.value = '';
    };
    reader.readAsText(file, 'utf-8');
  }

  function renderPanelSearch(q) {
    if (!q) {
      els.searchResults.innerHTML = '<div class="empty-state">输入关键词后显示结果。</div>';
      return;
    }
    const lq = q.toLowerCase();
    const results = visibleGroups()
      .map(g => ({ ...g, tags: g.tags.filter(t => matches(t, lq)).slice(0, 80) }))
      .filter(g => g.tags.length);
    if (!results.length) {
      els.searchResults.innerHTML = '<div class="empty-state">没有搜索结果。</div>';
      return;
    }
    els.searchResults.innerHTML = results.slice(0, 20).map(g => `<div class="result-card"><div class="result-title">${escapeHtml(g.name)} · ${g.tags.length}</div><div class="result-tags">${g.tags.map(tagButton).join('')}</div></div>`).join('');
    bindTagButtons(els.searchResults);
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
  function cssEscape(s) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(s);
    return String(s).replace(/(["\\#.;?+*~':!^$[\]()=>|/@])/g, '\\$1');
  }
  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => els.toast.classList.remove('show'), 1800);
  }
})();
