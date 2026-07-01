(() => {
  const DATA = window.__VOCAB_DATA__ || { groups: [], mainCategories: [], stats: {} };
  const groupStoreKey = 'aiNovelVocabSite.groups.v3';
  const legacyCustomV2 = 'aiNovelVocabSite.custom.v2';
  const legacyCustomV1 = 'aiNovelVocabSite.custom.v1';
  const themeKey = 'aiNovelVocabSite.theme.v1';

  const state = {
    groups: loadGroups(),
    selected: [],
    activeCategory: DATA.mainCategories?.[0] || '综合词条',
    expandedAll: false,
    editMode: false,
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
    editModeBtn: $('#editModeBtn'),
    newGroupName: $('#newGroupName'),
    newGroupCategory: $('#newGroupCategory'),
    createGroupBtn: $('#createGroupBtn'),
    targetGroupSelect: $('#targetGroupSelect'),
    customInput: $('#customInput'),
    loadCustomBtn: $('#loadCustomBtn'),
    clearCustomInputBtn: $('#clearCustomInputBtn'),
    singleTagInput: $('#singleTagInput'),
    addSingleTagBtn: $('#addSingleTagBtn'),
    customList: $('#customList'),
    themeToggle: $('#themeToggle'),
    toast: $('#toast'),
    selectionHint: $('#selectionHint')
  };

  init();

  function init() {
    initTheme();
    renderTabs();
    renderGroups();
    renderSideTools();
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
        if (state.activeCategory === '搜索结果') state.activeCategory = getCategories()[0] || '综合词条';
        renderTabs();
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
    els.editModeBtn.addEventListener('click', () => {
      state.editMode = !state.editMode;
      renderGroups();
      toast(state.editMode ? '已进入编辑模式' : '已退出编辑模式');
    });
    els.createGroupBtn.addEventListener('click', createGroupFromSide);
    els.loadCustomBtn.addEventListener('click', importTextToTargetGroup);
    els.clearCustomInputBtn.addEventListener('click', () => { els.customInput.value = ''; });
    els.addSingleTagBtn.addEventListener('click', () => {
      const tag = els.singleTagInput.value.trim();
      if (!tag) return toast('请输入词条');
      addTagsToGroup(getTargetGroupId(), [tag]);
      els.singleTagInput.value = '';
    });
    els.targetGroupSelect.addEventListener('change', renderSideSummary);
    els.themeToggle.addEventListener('click', toggleTheme);
    $$('.side-tabs .tab').forEach(btn => btn.addEventListener('click', () => {
      $$('.side-tabs .tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.side-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === btn.dataset.side));
    }));
    els.promptOutput.addEventListener('input', syncSelectedFromManualOutput);
  }

  function getCategories() {
    return [...new Set([...(DATA.mainCategories || []), ...state.groups.map(g => g.mainCategory || '综合词条')])].filter(Boolean);
  }

  function visibleGroups() {
    return state.groups;
  }

  function renderTabs() {
    const cats = getCategories();
    if (state.activeCategory === '搜索结果' && !cats.includes('搜索结果')) cats.unshift('搜索结果');
    if (!cats.includes(state.activeCategory)) state.activeCategory = cats[0] || '综合词条';
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
        .map(g => ({ ...g, tags: g.tags.filter(t => matches(t, q) || matches(g.name, q) || matches(g.mainCategory, q)) }))
        .filter(g => g.tags.length || matches(g.name, q) || matches(g.mainCategory, q));
    } else if (state.activeCategory !== '搜索结果') {
      groups = groups.filter(g => g.mainCategory === state.activeCategory);
    }

    const totalTags = groups.reduce((sum, g) => sum + g.tags.length, 0);
    els.statLine.textContent = `${groups.length} 个词条组 · ${totalTags} 个可见词条`;
    els.expandAllBtn.textContent = state.expandedAll ? '全部折叠' : '全部展开';
    els.editModeBtn.textContent = state.editMode ? '退出编辑模式' : '编辑模式';
    els.editModeBtn.classList.toggle('active-edit', state.editMode);

    if (!groups.length) {
      els.groupsPanel.innerHTML = `<div class="empty-state">没有找到匹配的词条。</div>`;
      return;
    }

    els.groupsPanel.innerHTML = groups.map(g => {
      const shown = g.tags.slice(0, limit);
      const more = Math.max(0, g.tags.length - shown.length);
      const openAttr = state.expandedAll ? 'open' : '';
      const body = state.editMode ? editGroupBody(g, shown, more) : normalGroupBody(g, shown, more);
      return `<details class="group-card ${state.editMode ? 'is-editing' : ''}" ${openAttr}>
        <summary><span class="summary-left"><span>${escapeHtml(g.name)}</span></span><span class="group-meta">${g.tags.length}词</span></summary>
        ${body}
      </details>`;
    }).join('');

    bindTagButtons(els.groupsPanel);
    if (state.editMode) bindEditControls(els.groupsPanel);
  }

  function normalGroupBody(g, shown, more) {
    return `<div class="tag-grid">${shown.map(tagButton).join('')}${more ? `<span class="group-meta more-note">还有 ${more} 个，切换“每组显示”为全部可见</span>` : ''}</div>`;
  }

  function editGroupBody(g, shown, more) {
    return `<div class="group-edit-panel">
      <div class="group-edit-row">
        <label>词条组名称
          <input data-group-name="${escapeAttr(g.id)}" value="${escapeAttr(g.name)}" />
        </label>
        <label>分类
          <select data-group-category="${escapeAttr(g.id)}">${categoryOptions(g.mainCategory)}</select>
        </label>
        <button class="primary-btn small" data-save-group="${escapeAttr(g.id)}" type="button">保存词条组</button>
        <button class="danger-outline-btn small" data-delete-group="${escapeAttr(g.id)}" type="button">删除词条组</button>
      </div>
      <div class="group-add-row">
        <textarea data-new-tags="${escapeAttr(g.id)}" placeholder="新增词条：支持中文逗号、英文逗号、空格或换行分隔"></textarea>
        <button class="accent-btn small" data-add-tags="${escapeAttr(g.id)}" type="button">添加词条</button>
      </div>
      <div class="editable-tags library-edit-tags">
        ${shown.length ? shown.map((tag, idx) => editableTagRow(g.id, tag, idx)).join('') : '<div class="empty-state slim">这个词条组暂时没有词条。</div>'}
        ${more ? `<span class="group-meta more-note">还有 ${more} 个，切换“每组显示”为全部可编辑</span>` : ''}
      </div>
    </div>`;
  }

  function categoryOptions(selected) {
    return getCategories().filter(c => c !== '搜索结果').map(cat => `<option value="${escapeAttr(cat)}" ${cat === selected ? 'selected' : ''}>${escapeHtml(cat)}</option>`).join('');
  }

  function editableTagRow(groupId, tag, idx) {
    const key = `${groupId}::${idx}`;
    return `<span class="custom-row tag-edit-row">
      <input class="tag-edit-input" value="${escapeAttr(tag)}" data-edit-tag="${escapeAttr(key)}" aria-label="编辑词条" />
      <button class="ghost-btn small" data-save-tag="${escapeAttr(groupId)}" data-tag-index="${idx}" type="button">保存</button>
      <button class="danger-outline-btn small" data-del-tag="${escapeAttr(groupId)}" data-tag-index="${idx}" type="button">删除</button>
    </span>`;
  }

  function tagButton(t) {
    const et = escapeAttr(t);
    return `<span class="tag-item"><button class="tag-text" data-tag="${et}" title="加入：${et}" type="button">${escapeHtml(t)}</button></span>`;
  }

  function bindTagButtons(root) {
    $$('[data-tag]', root).forEach(btn => btn.addEventListener('click', () => addTag(btn.dataset.tag)));
  }

  function bindEditControls(root) {
    $$('[data-save-group]', root).forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.saveGroup;
      const name = $(`[data-group-name="${cssEscape(id)}"]`, root)?.value.trim();
      const category = $(`[data-group-category="${cssEscape(id)}"]`, root)?.value.trim();
      updateGroup(id, { name, mainCategory: category });
    }));
    $$('[data-delete-group]', root).forEach(btn => btn.addEventListener('click', () => {
      const group = findGroup(btn.dataset.deleteGroup);
      if (!group) return;
      if (!confirm(`确定删除词条组「${group.name}」？`)) return;
      state.groups = state.groups.filter(g => g.id !== group.id);
      saveGroups();
      renderAfterGroupChange();
      toast('已删除词条组');
    }));
    $$('[data-add-tags]', root).forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.addTags;
      const textarea = $(`[data-new-tags="${cssEscape(id)}"]`, root);
      const tags = splitInput(textarea?.value || '');
      if (!tags.length) return toast('请输入要添加的词条');
      addTagsToGroup(id, tags);
      if (textarea) textarea.value = '';
    }));
    $$('[data-save-tag]', root).forEach(btn => btn.addEventListener('click', () => {
      const groupId = btn.dataset.saveTag;
      const idx = Number(btn.dataset.tagIndex);
      const input = $(`[data-edit-tag="${cssEscape(`${groupId}::${idx}`)}"]`, root);
      updateTag(groupId, idx, input?.value.trim() || '');
    }));
    $$('[data-del-tag]', root).forEach(btn => btn.addEventListener('click', () => {
      deleteTag(btn.dataset.delTag, Number(btn.dataset.tagIndex));
    }));
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

  function createGroupFromSide() {
    const name = els.newGroupName.value.trim();
    const category = els.newGroupCategory.value || state.activeCategory || '自定义';
    if (!name) return toast('请输入词条组名称');
    const group = {
      id: makeUniqueId(`user-${Date.now()}-${slug(name)}`),
      name,
      mainCategory: category,
      tags: []
    };
    state.groups.push(group);
    saveGroups();
    state.activeCategory = category;
    renderAfterGroupChange(group.id);
    toast('已新增词条组');
  }

  function importTextToTargetGroup() {
    const text = els.customInput.value.trim();
    if (!text) return toast('请输入要导入的词条');
    const tags = splitInput(text);
    addTagsToGroup(getTargetGroupId(), tags);
  }

  function splitInput(text) {
    return [...new Set(String(text).split(/[，,;；\n\t ]+/).map(s => s.trim()).filter(Boolean))];
  }

  function addTagsToGroup(groupId, tags) {
    const group = findGroup(groupId);
    if (!group) return toast('请选择词条组');
    const before = group.tags.length;
    group.tags = [...new Set([...group.tags, ...tags])];
    saveGroups();
    renderAfterGroupChange(group.id);
    toast(`已添加 ${group.tags.length - before} 个新词条到「${group.name}」`);
  }

  function updateGroup(id, patch) {
    const group = findGroup(id);
    if (!group) return toast('找不到词条组');
    if (!patch.name) return toast('词条组名称不能为空');
    group.name = patch.name;
    group.mainCategory = patch.mainCategory || group.mainCategory || '综合词条';
    saveGroups();
    state.activeCategory = group.mainCategory;
    renderAfterGroupChange(group.id);
    toast('已保存词条组');
  }

  function updateTag(groupId, idx, value) {
    const group = findGroup(groupId);
    if (!group) return toast('找不到词条组');
    if (!value) return toast('词条不能为空');
    if (!group.tags[idx]) return toast('找不到词条');
    group.tags[idx] = value;
    group.tags = [...new Set(group.tags.map(t => String(t).trim()).filter(Boolean))];
    saveGroups();
    renderAfterGroupChange(group.id);
    toast('已更新词条');
  }

  function deleteTag(groupId, idx) {
    const group = findGroup(groupId);
    if (!group || !group.tags[idx]) return toast('找不到词条');
    group.tags.splice(idx, 1);
    saveGroups();
    renderAfterGroupChange(group.id);
    toast('已删除词条');
  }

  function renderSideTools(selectedId = els.targetGroupSelect?.value) {
    renderCategorySelect();
    renderTargetGroupSelect(selectedId);
    renderSideSummary();
  }

  function renderCategorySelect() {
    els.newGroupCategory.innerHTML = getCategories().filter(c => c !== '搜索结果').map(cat => `<option value="${escapeAttr(cat)}">${escapeHtml(cat)}</option>`).join('');
    if (getCategories().includes(state.activeCategory)) els.newGroupCategory.value = state.activeCategory;
  }

  function renderTargetGroupSelect(selectedId = '') {
    const groups = state.groups.slice().sort((a, b) => `${a.mainCategory}/${a.name}`.localeCompare(`${b.mainCategory}/${b.name}`, 'zh-Hans'));
    els.targetGroupSelect.innerHTML = groups.map(g => `<option value="${escapeAttr(g.id)}">${escapeHtml(g.mainCategory)} / ${escapeHtml(g.name)}（${g.tags.length}）</option>`).join('');
    if (selectedId && state.groups.some(g => g.id === selectedId)) els.targetGroupSelect.value = selectedId;
  }

  function renderSideSummary() {
    const group = findGroup(getTargetGroupId());
    if (!group) {
      els.customList.innerHTML = '<div class="empty-state slim">暂无词条组。</div>';
      return;
    }
    els.customList.innerHTML = `<div class="result-card">
      <div class="result-title">当前词条组：${escapeHtml(group.name)}</div>
      <p class="side-note">分类：${escapeHtml(group.mainCategory)} · ${group.tags.length} 个词条</p>
      <p class="side-note">需要修改名称、分类或删除词条时，请打开左侧「编辑模式」。</p>
    </div>`;
  }

  function getTargetGroupId() {
    return els.targetGroupSelect.value || state.groups[0]?.id || '';
  }

  function renderPanelSearch(q) {
    if (!q) {
      els.searchResults.innerHTML = '<div class="empty-state">输入关键词后显示结果。</div>';
      return;
    }
    const lq = q.toLowerCase();
    const results = visibleGroups()
      .map(g => ({ ...g, tags: g.tags.filter(t => matches(t, lq)).slice(0, 80) }))
      .filter(g => g.tags.length || matches(g.name, lq) || matches(g.mainCategory, lq));
    if (!results.length) {
      els.searchResults.innerHTML = '<div class="empty-state">没有搜索结果。</div>';
      return;
    }
    els.searchResults.innerHTML = results.slice(0, 20).map(g => `<div class="result-card"><div class="result-title">${escapeHtml(g.mainCategory)} / ${escapeHtml(g.name)} · ${g.tags.length}</div><div class="result-tags">${g.tags.map(tagButton).join('')}</div></div>`).join('');
    bindTagButtons(els.searchResults);
  }

  function renderAfterGroupChange(selectedId = getTargetGroupId()) {
    renderTabs();
    renderGroups(els.globalSearch.value.trim());
    renderSideTools(selectedId);
    renderPanelSearch(els.panelSearch.value.trim());
  }

  function findGroup(id) {
    return state.groups.find(g => g.id === id);
  }

  function loadGroups() {
    try {
      const saved = JSON.parse(localStorage.getItem(groupStoreKey) || 'null');
      if (Array.isArray(saved) && saved.length) return normalizeGroups(saved);
    } catch {}
    const groups = normalizeGroups(DATA.groups || []);
    const legacy = loadLegacyCustom();
    Object.entries(legacy).forEach(([name, tags]) => {
      groups.push({ id: makeBaseId(`custom-${name}`, groups.length), name, mainCategory: '自定义', tags });
    });
    return ensureUniqueIds(groups);
  }

  function normalizeGroups(rawGroups) {
    const groups = (rawGroups || []).map((g, i) => ({
      id: String(g.id || makeBaseId(g.name || 'group', i)),
      name: String(g.name || `词条组 ${i + 1}`).trim(),
      mainCategory: String(g.mainCategory || '综合词条').trim(),
      tags: [...new Set((g.tags || []).map(t => String(t).trim()).filter(Boolean))]
    })).filter(g => g.name);
    return ensureUniqueIds(groups);
  }

  function ensureUniqueIds(groups) {
    const seen = new Map();
    return groups.map((g, i) => {
      const base = g.id || makeBaseId(g.name, i);
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      return { ...g, id: count ? `${base}-${count + 1}` : base };
    });
  }

  function saveGroups() {
    localStorage.setItem(groupStoreKey, JSON.stringify(state.groups));
  }

  function loadLegacyCustom() {
    const out = {};
    [legacyCustomV2, legacyCustomV1].forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || 'null');
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          Object.entries(data).forEach(([name, tags]) => {
            if (!Array.isArray(tags)) return;
            out[name] = [...new Set([...(out[name] || []), ...tags.map(t => String(t).trim()).filter(Boolean)])];
          });
        }
      } catch {}
    });
    return out;
  }

  function makeUniqueId(base) {
    const clean = makeBaseId(base, state.groups.length);
    let id = clean;
    let n = 2;
    while (state.groups.some(g => g.id === id)) id = `${clean}-${n++}`;
    return id;
  }

  function makeBaseId(text, i) {
    return `${slug(text)}-${i}`.replace(/-+/g, '-').replace(/^-|-$/g, '') || `group-${i}`;
  }

  function slug(text) {
    return String(text || 'group').toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').slice(0, 48);
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
