function buildSidebar() {
  const chapterCounts = {};
  const levelCounts = {};
  const kindCounts = {};
  const familyCounts = {};
  RECORDS.forEach(r => {
    const ch = "ch"+r.chapter;
    chapterCounts[ch] = (chapterCounts[ch]||0)+1;
    r.present_in_books.forEach(l => levelCounts[l] = (levelCounts[l]||0)+1);
    kindCounts[r.kind] = (kindCounts[r.kind]||0)+1;
    const fam = r.family_denomination_canonical;
    if(fam) familyCounts[fam] = (familyCounts[fam]||0)+1;
  });

  // Sort families by count desc, take top 20
  const topFamilies = Object.entries(familyCounts).sort((a,b)=>b[1]-a[1]).slice(0,20);

  document.getElementById('sidebarContent').innerHTML = `
    <div class="filter-section">
      <div class="filter-title" onclick="toggleFS(this)">🔎 Search <span class="toggle">▾</span></div>
      <div class="filter-body" id="fs-search">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="searchBoxSidebar" placeholder="Name, code, family…" oninput="setSearch(this.value)">
        </div>
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-title" onclick="toggleFS(this)">📚 Chapter <span class="toggle">▾</span></div>
      <div class="filter-body" id="fs-chapters">
        <div class="filter-actions"><a href="#" onclick="setAll('chapters', true, event)">All</a> | <a href="#" onclick="setAll('chapters', false, event)">None</a></div>
        ${Object.entries(CHAPTER_TITLES).filter(([ch])=>chapterCounts[ch]).map(([ch,title])=>`
          <label class="filter-row">
            <input type="checkbox" onchange="toggleFilter('chapters','${ch}',this.checked)" ${filters.chapters.has(ch) ? 'checked' : ''}>
            <span style="width:10px;height:10px;border-radius:50%;background:${CHAPTER_COLOR[ch]};flex-shrink:0;display:inline-block;"></span>
            <span class="fr-label" style="font-size:11.5px">${title}</span>
            <span class="fr-count">${chapterCounts[ch]||0}</span>
          </label>`).join('')}
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-title" onclick="toggleFS(this)">🎓 CEFR Level <span class="toggle">▾</span></div>
      <div class="filter-body" id="fs-levels">
        <div class="filter-actions"><a href="#" onclick="setAll('levels', true, event)">All</a> | <a href="#" onclick="setAll('levels', false, event)">None</a></div>
        ${LEVELS.map(l=>`
          <label class="filter-row">
            <input type="checkbox" onchange="toggleFilter('levels','${l}',this.checked)" ${filters.levels.has(l) ? 'checked' : ''}>
            <span class="level-dot" style="background:${LEVEL_COLOR[l]}"></span>
            <span class="fr-label">${l}</span>
            <span class="fr-count">${levelCounts[l]||0}</span>
          </label>`).join('')}
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-title" onclick="toggleFS(this)">🏷 Kind <span class="toggle">▾</span></div>
      <div class="filter-body" id="fs-kinds">
        <div class="filter-actions"><a href="#" onclick="setAll('kinds', true, event)">All</a> | <a href="#" onclick="setAll('kinds', false, event)">None</a></div>
        ${['leaf','family','container','family_with_direct_content'].filter(k=>kindCounts[k]).map(k=>`
          <label class="filter-row">
            <input type="checkbox" onchange="toggleFilter('kinds','${k}',this.checked)" ${filters.kinds.has(k) ? 'checked' : ''}>
            <span class="fr-label">
              <span class="kind-badge kind-${k.split('_')[0]}">${k}</span>
            </span>
            <span class="fr-count">${kindCounts[k]||0}</span>
          </label>`).join('')}
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-title" onclick="toggleFS(this)">⚡ Attributes <span class="toggle">▾</span></div>
      <div class="filter-body" id="fs-attrs">
        <div class="filter-actions"><a href="#" onclick="setAll('attrs', true, event)">All</a> | <a href="#" onclick="setAll('attrs', false, event)">None</a></div>
        <label class="filter-row">
          <input type="checkbox" onchange="toggleFilter('asterisked','yes',this.checked)" ${filters.asterisked.has('yes') ? 'checked' : ''}>
          <span class="fr-label">⭐ Asterisked</span>
          <span class="fr-count">${RECORDS.filter(r=>r.anyAsterisk).length}</span>
        </label>
        <label class="filter-row">
          <input type="checkbox" onchange="toggleFilter('asterisked','no',this.checked)" ${filters.asterisked.has('no') ? 'checked' : ''}>
          <span class="fr-label">Not asterisked</span>
          <span class="fr-count">${RECORDS.filter(r=>!r.anyAsterisk).length}</span>
        </label>
        <label class="filter-row">
          <input type="checkbox" onchange="toggleFilter('hasLinks','yes',this.checked)" ${filters.hasLinks.has('yes') ? 'checked' : ''}>
          <span class="fr-label">Has links</span>
          <span class="fr-count">${RECORDS.filter(r=>r.link_count>0).length}</span>
        </label>
        <label class="filter-row">
          <input type="checkbox" onchange="toggleFilter('hasLinks','no',this.checked)" ${filters.hasLinks.has('no') ? 'checked' : ''}>
          <span class="fr-label">No links</span>
          <span class="fr-count">${RECORDS.filter(r=>r.link_count===0).length}</span>
        </label>
        <label class="filter-row">
          <input type="checkbox" onchange="toggleAllLevels(this.checked)" ${filters.levels.has('_all4') ? 'checked' : ''}>
          <span class="fr-label">All 4 levels</span>
          <span class="fr-count">${RECORDS.filter(r=>r.present_in_books.length===4).length}</span>
        </label>
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-title" onclick="toggleFS(this)">👨‍👩‍👧 Family (Top 20) <span class="toggle">▾</span></div>
      <div class="filter-body collapsed" id="fs-families">
        <div class="filter-actions"><a href="#" onclick="setAll('families', true, event)">All</a> | <a href="#" onclick="setAll('families', false, event)">None</a></div>
        ${topFamilies.map(([fam,cnt])=>`
          <label class="filter-row">
            <input type="checkbox" onchange="toggleFilter('families','${CSS.escape(fam)}',this.checked)" data-family="${fam.replace(/"/g,'&quot;')}" ${filters.families.has(fam) ? 'checked' : ''}>
            <span class="fr-label" style="font-size:11px" title="${fam}">${fam.length>30?fam.slice(0,28)+'…':fam}</span>
            <span class="fr-count">${cnt}</span>
          </label>`).join('')}
      </div>
    </div>
  `;
}

function toggleFS(el) {
  const body = el.nextElementSibling;
  body.classList.toggle('collapsed');
  el.querySelector('.toggle').textContent = body.classList.contains('collapsed') ? '▸' : '▾';
}

function toggleFilter(type, val, checked) {
  // For families, find by data-family attribute
  if(type === 'families') {
    // val is CSS escaped, find actual value
    const allChecks = document.querySelectorAll('[data-family]');
    if(checked) {
      allChecks.forEach(ch => { if(ch.checked) filters.families.add(ch.getAttribute('data-family')); });
    } else {
      allChecks.forEach(ch => { if(!ch.checked) { const fam = ch.getAttribute('data-family'); filters.families.delete(fam); }});
      // rebuild from checked
      filters.families.clear();
      allChecks.forEach(ch => { if(ch.checked) filters.families.add(ch.getAttribute('data-family')); });
    }
  } else {
    if(checked) filters[type].add(val);
    else filters[type].delete(val);
  }
  page = 1;
  applyFilters();
}

function setAll(group, checkAll, event) {
  event.preventDefault();
  event.stopPropagation();
  
  const container = document.getElementById('fs-' + group);
  if (!container) return;
  const cbs = container.querySelectorAll('input[type="checkbox"]');
  
  // Visually check/uncheck them
  cbs.forEach(cb => cb.checked = checkAll);
  
  // Bulk update the sets
  if (checkAll) {
    if (group === 'chapters') filters.chapters = new Set(Object.keys(CHAPTER_TITLES));
    if (group === 'levels') {
      filters.levels = new Set(LEVELS);
      filters.levels.add('_all4'); // If there is an '_all4' checkbox
    }
    if (group === 'kinds') filters.kinds = new Set(['leaf','family','container','family_with_direct_content']);
    if (group === 'attrs') {
      filters.asterisked = new Set(['yes', 'no']);
      filters.hasLinks = new Set(['yes', 'no']);
      filters.levels.add('_all4');
    }
    if (group === 'families') {
      cbs.forEach(cb => filters.families.add(cb.getAttribute('data-family')));
    }
  } else {
    if (group === 'attrs') {
      filters.asterisked.clear();
      filters.hasLinks.clear();
      filters.levels.delete('_all4');
    } else if (group === 'levels') {
      filters.levels.clear();
    } else {
      filters[group].clear();
    }
  }
  
  page = 1;
  applyFilters();
}

function toggleAllLevels(checked) {
  if(checked) filters.levels = new Set(['_all4']);
  else filters.levels.delete('_all4');
  applyFilters();
}

function setSearch(v) {
  filters.search = v.toLowerCase();
  page = 1;
  const sb1 = document.getElementById('searchBox');
  const sb2 = document.getElementById('searchBoxSidebar');
  if(sb1 && sb1.value !== v) sb1.value = v;
  if(sb2 && sb2.value !== v) sb2.value = v;
  applyFilters();
}

function clearAllFilters() {
  filters = { 
    search:"", 
    chapters:new Set(Object.keys(CHAPTER_TITLES)), 
    levels:new Set(LEVELS), 
    kinds:new Set(['leaf','family','container','family_with_direct_content']), 
    asterisked:new Set(['yes','no']), 
    hasLinks:new Set(['yes','no']), 
    families:new Set() 
  };
  document.querySelectorAll('#sidebarContent input[type=checkbox]').forEach(c=> {
    // We shouldn't blindly uncheck them all here since they might be rebuilt by applyFilters -> buildSidebar...
    // Actually applyFilters doesn't rebuild sidebar!
    // But we want to check the ones that should be checked!
  });
  
  // Actually, we'll let buildSidebar handle checking when we rebuild it, 
  // or we can just call buildSidebar() inside clearAllFilters() so it fully refreshes!
  const sb = document.getElementById('searchBox');
  if(sb) sb.value = '';
  const sb2 = document.getElementById('searchBoxSidebar');
  if(sb2) sb2.value = '';
  page = 1;
  buildSidebar();
  applyFilters();
}

function applyFilters() {
  renderTable();
  if(activeTab === 'network') buildNetworkData();
  if(activeTab === 'radial') drawRadial();
  updateResultCount();
}

function filteredRecords() {
  return RECORDS.filter(r => {
    if(filters.search) {
      const hay = ((r.denomination_canonical||'') + ' ' + (r.section_code||'') + ' ' + (r.family_denomination_canonical||'')).toLowerCase();
      if(!hay.includes(filters.search)) return false;
    }
    
    if(!filters.chapters.has('ch'+r.chapter)) return false;
    
    if(filters.levels.has('_all4')) {
      if(r.present_in_books.length < 4) return false;
    } else {
      if(!r.present_in_books.some(l => filters.levels.has(l))) return false;
    }
    
    if(!filters.kinds.has(r.kind)) return false;
    
    const hasAst = r.anyAsterisk;
    if(!filters.asterisked.has(hasAst ? 'yes' : 'no')) return false;

    const hasLnk = r.link_count > 0;
    if(!filters.hasLinks.has(hasLnk ? 'yes' : 'no')) return false;
    
    if(filters.families.size > 0) {
      if(!filters.families.has(r.family_denomination_canonical)) return false;
    }
    
    return true;
  });
}

function updateResultCount() {
  const fr = filteredRecords();
  const rc = document.getElementById('resultCount');
  if(rc) rc.textContent = `${fr.length} of ${RECORDS.length} concepts`;
  const sb = document.getElementById('statusBadgeCount');
  if(sb) sb.textContent = fr.length;
}
