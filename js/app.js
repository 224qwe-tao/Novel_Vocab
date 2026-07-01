(() => {
  const DATA = window.__VOCAB_DATA__ || { groups: [], mainCategories: [], stats: {} };
  const groupStoreKey = 'aiNovelVocabSite.groups.v10';
  const categoryStoreKey = 'aiNovelVocabSite.categories.v10';
  const oldGroupStoreKeys = ['aiNovelVocabSite.groups.v3'];
  const oldCategoryStoreKeys = ['aiNovelVocabSite.categories.v1'];
  const legacyCustomV2 = 'aiNovelVocabSite.custom.v2';
  const legacyCustomV1 = 'aiNovelVocabSite.custom.v1';
  const themeKey = 'aiNovelVocabSite.theme.v1';

  const initialGroups = loadGroups();
  const initialCategories = loadCategories(initialGroups);
  const state = {
    groups: initialGroups,
    categories: initialCategories,
    selected: [],
    activeCategory: initialCategories[0] || '综合词条',
    expandedAll: false,
    editingGroupId: ''
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const els = {
    categoryTabs: $('#categoryTabs'),
    groupsPanel: $('#groupsPanel'),
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
    newCategoryName: $('#newCategoryName'),
    createCategoryBtn: $('#createCategoryBtn'),
    categoryManageSelect: $('#categoryManageSelect'),
    renameCategoryInput: $('#renameCategoryInput'),
    saveCategoryBtn: $('#saveCategoryBtn'),
    deleteCategoryBtn: $('#deleteCategoryBtn'),
    newGroupName: $('#newGroupName'),
    newGroupCategory: $('#newGroupCategory'),
    createGroupBtn: $('#createGroupBtn'),
    customList: $('#customList'),
    themeToggle: $('#themeToggle'),
    toast: $('#toast'),
    groupEditModal: $('#groupEditModal'),
    modalGroupName: $('#modalGroupName'),
    modalGroupCategory: $('#modalGroupCategory'),
    modalGroupTags: $('#modalGroupTags'),
    modalSaveGroupBtn: $('#modalSaveGroupBtn'),
    modalDeleteGroupBtn: $('#modalDeleteGroupBtn'),
    outputExpandBtn: $('#outputExpandBtn'),
    outputShrinkBtn: $('#outputShrinkBtn'),
    outputFullscreen: $('#outputFullscreen'),
    promptOutputLarge: $('#promptOutputLarge')
  };

  init();

  function init() {
    initTheme();
    renderTabs();
    renderGroups();
    renderSideTools();
    bindEvents();
  }

  function bindEvents() {
    els.copyBtn.addEventListener('click', copyOutput);
    els.clearBtn.addEventListener('click', () => {
      state.selected = [];
      els.promptOutput.value = '';
      if (els.promptOutputLarge) els.promptOutputLarge.value = '';
      toast('已清空输出');
    });
    els.separatorSelect.addEventListener('change', () => toast(els.separatorSelect.value === '' ? '已切换为无分隔符模式' : '已更新分隔符，之后点击词条会使用新的分隔符'));
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
    els.createCategoryBtn.addEventListener('click', createCategoryFromSide);
    els.categoryManageSelect.addEventListener('change', () => {
      els.renameCategoryInput.value = els.categoryManageSelect.value || '';
    });
    els.saveCategoryBtn.addEventListener('click', renameCategoryFromSide);
    els.deleteCategoryBtn.addEventListener('click', deleteSelectedCategoryFromSide);
    els.createGroupBtn.addEventListener('click', createGroupFromSide);
    els.themeToggle.addEventListener('click', toggleTheme);
    $$('.side-tabs .tab').forEach(btn => btn.addEventListener('click', () => {
      $$('.side-tabs .tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.side-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.panel === btn.dataset.side));
    }));
    els.promptOutput.addEventListener('input', syncLargeFromSmall);
    els.outputExpandBtn.addEventListener('click', openOutputFullscreen);
    els.outputShrinkBtn.addEventListener('click', closeOutputFullscreen);
    els.promptOutputLarge.addEventListener('input', syncSmallFromLarge);
    els.outputFullscreen.addEventListener('click', (e) => {
      if (e.target === els.outputFullscreen) closeOutputFullscreen();
    });

    $$('[data-close-modal]').forEach(el => el.addEventListener('click', closeGroupEditor));
    els.modalSaveGroupBtn.addEventListener('click', saveGroupEditor);
    els.modalDeleteGroupBtn.addEventListener('click', deleteGroupFromModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.outputFullscreen.classList.contains('hidden')) closeOutputFullscreen();
      if (e.key === 'Escape' && !els.groupEditModal.classList.contains('hidden')) closeGroupEditor();
    });
  }

  function getCategories() {
    return uniqueClean([
      ...(state.categories || []),
      ...state.groups.map(g => g.mainCategory || '综合词条')
    ]).filter(c => c && c !== '搜索结果');
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
      renderSideTools();
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

    if (!groups.length) {
      els.groupsPanel.innerHTML = `<div class="empty-state">没有找到匹配的词条。</div>`;
      return;
    }

    els.groupsPanel.innerHTML = groups.map(g => {
      const shown = g.tags.slice(0, limit);
      const more = Math.max(0, g.tags.length - shown.length);
      const openAttr = state.expandedAll ? 'open' : '';
      return `<details class="group-card" ${openAttr}>
        <summary>
          <span class="summary-left"><span class="group-title">${escapeHtml(g.name)}</span></span>
          <span class="summary-actions">
            <span class="group-meta">${g.tags.length}词</span>
            <button class="ghost-btn small group-edit-btn" data-open-editor="${escapeAttr(g.id)}" type="button">编辑</button>
          </span>
        </summary>
        ${normalGroupBody(g, shown, more)}
      </details>`;
    }).join('');

    bindTagButtons(els.groupsPanel);
    bindGroupEditorButtons(els.groupsPanel);
  }

  function normalGroupBody(g, shown, more) {
    return `<div class="tag-grid">${shown.map(tagButton).join('')}${more ? `<span class="group-meta more-note">还有 ${more} 个，切换“每组显示”为全部可见</span>` : ''}</div>`;
  }

  function tagButton(t) {
    const et = escapeAttr(t);
    return `<span class="tag-item"><button class="tag-text" data-tag="${et}" title="加入：${et}" type="button">${escapeHtml(t)}</button></span>`;
  }

  function bindTagButtons(root) {
    $$('[data-tag]', root).forEach(btn => btn.addEventListener('click', () => addTag(btn.dataset.tag)));
  }

  function bindGroupEditorButtons(root) {
    $$('[data-open-editor]', root).forEach(btn => btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openGroupEditor(btn.dataset.openEditor);
    }));
  }

  function openGroupEditor(groupId) {
    const group = findGroup(groupId);
    if (!group) return toast('找不到词条组');
    state.editingGroupId = group.id;
    els.modalGroupName.value = group.name;
    els.modalGroupCategory.innerHTML = categoryOptions(group.mainCategory);
    els.modalGroupCategory.value = group.mainCategory;
    els.modalGroupTags.value = group.tags.join('\n');
    els.groupEditModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    setTimeout(() => els.modalGroupName.focus(), 40);
  }

  function closeGroupEditor() {
    state.editingGroupId = '';
    els.groupEditModal.classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  function saveGroupEditor() {
    const group = findGroup(state.editingGroupId);
    if (!group) return toast('找不到词条组');
    const name = els.modalGroupName.value.trim();
    const category = els.modalGroupCategory.value.trim() || group.mainCategory || '综合词条';
    const tags = splitModalTags(els.modalGroupTags.value);
    if (!name) return toast('词条组名称不能为空');
    group.name = name;
    group.mainCategory = category;
    group.tags = tags;
    if (!state.categories.includes(category)) state.categories.push(category);
    state.categories = uniqueClean(state.categories);
    saveGroups();
    saveCategories();
    state.activeCategory = category;
    const selectedId = group.id;
    closeGroupEditor();
    renderAfterGroupChange(selectedId);
    toast('已保存词条组内容');
  }

  function deleteGroupFromModal() {
    const group = findGroup(state.editingGroupId);
    if (!group) return toast('找不到词条组');
    if (!confirm(`确定删除词条组「${group.name}」？`)) return;
    state.groups = state.groups.filter(g => g.id !== group.id);
    saveGroups();
    closeGroupEditor();
    renderAfterGroupChange();
    toast('已删除词条组');
  }

  function categoryOptions(selected) {
    const cats = getCategories();
    if (selected && !cats.includes(selected)) cats.push(selected);
    return cats.map(cat => `<option value="${escapeAttr(cat)}" ${cat === selected ? 'selected' : ''}>${escapeHtml(cat)}</option>`).join('');
  }

  function addTag(text) {
    const tag = String(text || '').trim();
    if (!tag) return;
    const sep = els.separatorSelect.value.replace('\\n', '\n');
    const current = els.promptOutput.value.trim();
    els.promptOutput.value = current ? `${current}${sep}${tag}` : tag;
    syncLargeFromSmall();
    toast('已加入输出');
  }

  function updateOutput() {
    // 兼容旧流程：当前版本直接写入输出框。
    syncLargeFromSmall();
  }

  function openOutputFullscreen() {
    els.promptOutputLarge.value = els.promptOutput.value;
    els.outputFullscreen.classList.remove('hidden');
    els.outputFullscreen.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => els.promptOutputLarge.focus(), 30);
  }

  function closeOutputFullscreen() {
    els.promptOutput.value = els.promptOutputLarge.value;
    els.outputFullscreen.classList.add('hidden');
    els.outputFullscreen.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    els.promptOutput.focus();
  }

  function syncLargeFromSmall() {
    if (els.promptOutputLarge && !els.outputFullscreen.classList.contains('hidden')) {
      els.promptOutputLarge.value = els.promptOutput.value;
    }
  }

  function syncSmallFromLarge() {
    els.promptOutput.value = els.promptOutputLarge.value;
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


  function createCategoryFromSide() {
    const name = els.newCategoryName.value.trim();
    if (!name) return toast('请输入分类名称');
    if (getCategories().includes(name)) return toast('这个分类已经存在');
    state.categories.push(name);
    state.categories = uniqueClean(state.categories);
    saveCategories();
    state.activeCategory = name;
    els.newCategoryName.value = '';
    renderAfterGroupChange();
    toast('已新增分类');
  }

  function renameCategoryFromSide() {
    const oldName = els.categoryManageSelect.value;
    const newName = els.renameCategoryInput.value.trim();
    if (!oldName) return toast('请选择分类');
    if (!newName) return toast('分类名称不能为空');
    if (oldName === newName) return toast('分类名称没有变化');
    if (getCategories().includes(newName) && !confirm(`分类「${newName}」已经存在，是否将「${oldName}」合并到该分类？`)) return;

    state.groups.forEach(g => {
      if (g.mainCategory === oldName) g.mainCategory = newName;
    });
    state.categories = uniqueClean(state.categories.map(cat => cat === oldName ? newName : cat));
    if (!state.categories.includes(newName)) state.categories.push(newName);
    saveGroups();
    saveCategories();
    state.activeCategory = newName;
    renderAfterGroupChange();
    toast('已修改分类名称');
  }

  function deleteSelectedCategoryFromSide() {
    const name = els.categoryManageSelect.value;
    if (!name) return toast('请选择分类');
    const groupCount = state.groups.filter(g => g.mainCategory === name).length;
    const confirmText = groupCount
      ? `确定删除分类「${name}」？该分类下的 ${groupCount} 个词条组也会一并删除。`
      : `确定删除分类「${name}」？`;
    if (!confirm(confirmText)) return;
    state.groups = state.groups.filter(g => g.mainCategory !== name);
    state.categories = state.categories.filter(cat => cat !== name);
    if (!state.categories.length) state.categories.push('综合词条');
    saveGroups();
    saveCategories();
    if (state.activeCategory === name) state.activeCategory = getCategories()[0] || '综合词条';
    renderAfterGroupChange();
    toast(groupCount ? `已删除分类及 ${groupCount} 个词条组` : '已删除分类');
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
    if (!state.categories.includes(category)) state.categories.push(category);
    state.categories = uniqueClean(state.categories);
    saveGroups();
    saveCategories();
    state.activeCategory = category;
    renderAfterGroupChange(group.id);
    openGroupEditor(group.id);
    toast('已新增词条组，可在弹窗中加入词条');
  }

  function splitModalTags(text) {
    return uniqueClean(String(text).split(/[，,;；\n\t]+/));
  }

  function uniqueClean(items) {
    return [...new Set(items.map(s => String(s).trim()).filter(Boolean))];
  }

  function renderSideTools(selectedId = '') {
    renderCategorySelect();
    renderCategoryManager();
    renderSideSummary(selectedId);
  }

  function renderCategorySelect() {
    const cats = getCategories();
    els.newGroupCategory.innerHTML = cats.map(cat => `<option value="${escapeAttr(cat)}">${escapeHtml(cat)}</option>`).join('');
    if (cats.includes(state.activeCategory)) els.newGroupCategory.value = state.activeCategory;
  }

  function renderCategoryManager() {
    const cats = getCategories();
    const previous = els.categoryManageSelect.value || state.activeCategory || cats[0] || '';
    els.categoryManageSelect.innerHTML = cats.map(cat => `<option value="${escapeAttr(cat)}">${escapeHtml(cat)}</option>`).join('');
    if (cats.includes(previous)) els.categoryManageSelect.value = previous;
    else if (cats.length) els.categoryManageSelect.value = cats[0];
    els.renameCategoryInput.value = els.categoryManageSelect.value || '';
  }

  function renderSideSummary() {
    const cats = getCategories();
    if (!cats.length) {
      els.customList.innerHTML = '<div class="empty-state slim">暂无分类。</div>';
      return;
    }
    els.customList.innerHTML = `<div class="result-card">
      <div class="result-title">分类列表</div>
      <div class="category-count-list">
        ${cats.map(cat => {
          const count = state.groups.filter(g => g.mainCategory === cat).length;
          return `<button class="ghost-btn small category-jump" data-jump-category="${escapeAttr(cat)}" type="button">${escapeHtml(cat)} · ${count} 组</button>`;
        }).join('')}
      </div>
      <p class="side-note">新增或修改分类后，会同步更新上方分类分页。要修改词条组内容，请点击左侧词条组旁的「编辑」。</p>
    </div>`;
    $$('[data-jump-category]', els.customList).forEach(btn => btn.addEventListener('click', () => {
      state.activeCategory = btn.dataset.jumpCategory;
      els.globalSearch.value = '';
      renderTabs();
      renderGroups();
      renderSideTools();
    }));
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

  function renderAfterGroupChange(selectedId = '') {
    renderTabs();
    renderGroups(els.globalSearch.value.trim());
    renderSideTools(selectedId);
    renderPanelSearch(els.panelSearch.value.trim());
  }

  function findGroup(id) {
    return state.groups.find(g => g.id === id);
  }

  function loadGroups() {
    const baseGroups = normalizeGroups(DATA.groups || []);
    const saved = readStoredArray(groupStoreKey) || oldGroupStoreKeys.map(readStoredArray).find(Array.isArray);
    if (Array.isArray(saved) && saved.length) {
      return mergeDefaultAndSavedGroups(baseGroups, normalizeGroups(saved));
    }
    const groups = [...baseGroups];
    const legacy = loadLegacyCustom();
    Object.entries(legacy).forEach(([name, tags]) => {
      groups.push({ id: makeBaseId(`custom-${name}`, groups.length), name, mainCategory: '自定义', tags });
    });
    return ensureUniqueIds(groups);
  }

  function loadCategories(groups) {
    const saved = readStoredArray(categoryStoreKey) || oldCategoryStoreKeys.map(readStoredArray).find(Array.isArray) || [];
    return uniqueClean([
      ...(DATA.mainCategories || []),
      ...saved,
      ...groups.map(g => g.mainCategory || '综合词条'),
      '自定义'
    ]);
  }

  function readStoredArray(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || 'null');
      return Array.isArray(data) ? data : null;
    } catch {
      return null;
    }
  }

  function mergeDefaultAndSavedGroups(defaultGroups, savedGroups) {
    const byId = new Map();
    defaultGroups.forEach(g => byId.set(g.id, g));
    savedGroups.forEach(g => byId.set(g.id, g));
    return ensureUniqueIds(Array.from(byId.values()));
  }

  function normalizeGroups(rawGroups) {
    const groups = (rawGroups || []).map((g, i) => ({
      id: String(g.id || makeBaseId(g.name || 'group', i)),
      name: String(g.name || `词条组 ${i + 1}`).trim(),
      mainCategory: String(g.mainCategory || '综合词条').trim(),
      tags: uniqueClean(g.tags || [])
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

  function saveCategories() {
    localStorage.setItem(categoryStoreKey, JSON.stringify(state.categories));
  }

  function loadLegacyCustom() {
    const out = {};
    [legacyCustomV2, legacyCustomV1].forEach(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || 'null');
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          Object.entries(data).forEach(([name, tags]) => {
            if (!Array.isArray(tags)) return;
            out[name] = uniqueClean([...(out[name] || []), ...tags]);
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
