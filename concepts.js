
/* ============================================================
   CONSTANTS & STATE
============================================================ */
const LEVELS = ["A1","A2","B1","B2"];
const LEVEL_COLOR = {
  A1: '#3f7d5c',
  A2: '#5a8f3f',
  B1: '#c08a2e',
  B2: '#b3502d'
};
const CHAPTER_TITLES = {
  ch1:"1 · Orientation", ch2:"2 · CEFR Descriptors", ch3:"3 · Functions",
  ch4:"4 · Notions", ch5:"5 · Grammar", ch6:"6 · Lexicon",
  ch8:"8 · Orthography", ch9:"9 · Sociocultural", ch10:"10 · Strategies"
};
const CHAPTER_COLOR = {
  ch1: '#3b6fd4',
  ch2: '#2aa39a',
  ch3: '#e8743b',
  ch4: '#9b59b6',
  ch5: '#d94f70',
  ch6: '#27955a',
  ch8: '#c39b1e',
  ch9: '#5d6bd0',
  ch10: '#0d99a8'
};
const CHAPTER_GLOW = {
  ch1: "rgba(59, 111, 212, 0.4)",
  ch2: "rgba(42, 163, 154, 0.4)",
  ch3: "rgba(232, 116, 59, 0.4)",
  ch4: "rgba(155, 89, 182, 0.4)",
  ch5: "rgba(217, 79, 112, 0.4)",
  ch6: "rgba(39, 149, 90, 0.4)",
  ch8: "rgba(195, 155, 30, 0.4)",
  ch9: "rgba(93, 107, 208, 0.4)",
  ch10: "rgba(13, 153, 168, 0.4)"
};
const KIND_COLOR = {
  leaf: "#3b6fd4",
  family: "#2d6a8f",
  container: "#6c7689",
  family_with_direct_content: "#9b59b6"
};

let ROOT = null;
let RECORDS = [];
let filters = {
  search: "",
  chapters: new Set(),
  levels: new Set(),
  kinds: new Set(),
  asterisked: new Set(),
  hasLinks: new Set(),
  families: new Set(),
};
let sortState = { col:"section_code", dir:"asc" };
let page = 1;
const PAGE_SIZE = 60;

// Network
let NET = { nodes:[], edges:[], sim:null, zoom:1, panX:0, panY:0, dragging:null, panning:false, lastMx:0, lastMy:0, hovered:null, selected:null, animFrame:null };
let pathMode = null; // 'from' | 'to'
let pathFrom = null, pathTo = null;
let pathHighlight = new Set(); // set of node keys on path

// Radial
let radialMode = "chapter";
let radialSel = null;

/* ============================================================
   FILE LOADING (FETCH BACKEND)
============================================================ */
function loadData() {
  const btn = document.getElementById('fetchBtn');
  if(btn) {
    btn.disabled = true;
    btn.textContent = 'Loading...';
  }
  fetch('http://localhost:8000/concept_map_for_lesson_generation.json')
    .then(res => {
      if(!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(data => {
      ROOT = data;
      buildRecords();
      initUI();
      notify(`✅ Loaded ${RECORDS.length} concepts`);
      if(btn) {
        btn.textContent = 'Data Loaded';
      }
    })
    .catch(err => {
      alert("Failed to fetch JSON: " + err.message);
      if(btn) {
        btn.disabled = false;
        btn.textContent = 'Fetch Data from Backend';
      }
    });
}

function buildRecords() {
  RECORDS = [];
  const concepts = ROOT.concepts || {};
  for(const [chKey, items] of Object.entries(concepts)) {
    for(const [recKey, c] of Object.entries(items)) {
      const linksOut = countLinks(c.links_to_concepts_per_book);
      const linksIn = countLinks(c.linked_from_per_book);
      RECORDS.push({
        chKey, recKey,
        section_code: c.section_code || recKey,
        chapter: c.chapter || parseInt(chKey.replace('ch','')),
        kind: c.kind || "leaf",
        denomination_canonical: c.denomination_canonical || (c.category_left_col?.A1 || c.strategy_label?.A1 || "—"),
        family_denomination_canonical: c.family_denomination_canonical || "",
        present_in_books: c.present_in_books || [],
        absent_in_books: c.absent_in_books || [],
        anyAsterisk: Object.values(c.is_asterisked_per_book || {}).some(v=>v),
        link_count: linksOut + linksIn,
        linksOut, linksIn,
        _raw: c
      });
    }
  }
}

function countLinks(obj) {
  if(!obj) return 0;
  return Object.values(obj).reduce((s,arr)=> s + (Array.isArray(arr) ? arr.length : 0), 0);
}

function initUI() {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('sidebar').style.display = '';
  document.getElementById('mainContent').style.display = '';
  document.getElementById('headerTabs').style.display = '';
  document.getElementById('statusBadge').textContent = `${RECORDS.length} concepts`;
  document.getElementById('statusBadge').classList.add('loaded');
  document.getElementById('exportBtn').disabled = false;
  buildSidebar();
  renderTable();
  buildNetworkData();
  buildStatsView();
}

/* ============================================================
   SIDEBAR / FILTERS
============================================================ */
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
          <input type="text" id="searchBox" placeholder="Name, code, family…" oninput="setSearch(this.value)">
        </div>
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-title" onclick="toggleFS(this)">📚 Chapter <span class="toggle">▾</span></div>
      <div class="filter-body" id="fs-chapters">
        ${Object.entries(CHAPTER_TITLES).filter(([ch])=>chapterCounts[ch]).map(([ch,title])=>`
          <label class="filter-row">
            <input type="checkbox" onchange="toggleFilter('chapters','${ch}',this.checked)">
            <span style="width:10px;height:10px;border-radius:50%;background:${CHAPTER_COLOR[ch]};flex-shrink:0;display:inline-block;"></span>
            <span class="fr-label" style="font-size:11.5px">${title}</span>
            <span class="fr-count">${chapterCounts[ch]||0}</span>
          </label>`).join('')}
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-title" onclick="toggleFS(this)">🎓 CEFR Level <span class="toggle">▾</span></div>
      <div class="filter-body" id="fs-levels">
        ${LEVELS.map(l=>`
          <label class="filter-row">
            <input type="checkbox" onchange="toggleFilter('levels','${l}',this.checked)">
            <span class="level-dot" style="background:${LEVEL_COLOR[l]}"></span>
            <span class="fr-label">${l}</span>
            <span class="fr-count">${levelCounts[l]||0}</span>
          </label>`).join('')}
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-title" onclick="toggleFS(this)">🏷 Kind <span class="toggle">▾</span></div>
      <div class="filter-body" id="fs-kinds">
        ${['leaf','family','container','family_with_direct_content'].filter(k=>kindCounts[k]).map(k=>`
          <label class="filter-row">
            <input type="checkbox" onchange="toggleFilter('kinds','${k}',this.checked)">
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
        <label class="filter-row">
          <input type="checkbox" onchange="toggleFilter('asterisked','yes',this.checked)">
          <span class="fr-label">⭐ Asterisked</span>
          <span class="fr-count">${RECORDS.filter(r=>r.anyAsterisk).length}</span>
        </label>
        <label class="filter-row">
          <input type="checkbox" onchange="toggleFilter('asterisked','no',this.checked)">
          <span class="fr-label">Not asterisked</span>
          <span class="fr-count">${RECORDS.filter(r=>!r.anyAsterisk).length}</span>
        </label>
        <label class="filter-row">
          <input type="checkbox" onchange="toggleFilter('hasLinks','yes',this.checked)">
          <span class="fr-label">Has links</span>
          <span class="fr-count">${RECORDS.filter(r=>r.link_count>0).length}</span>
        </label>
        <label class="filter-row">
          <input type="checkbox" onchange="toggleFilter('hasLinks','no',this.checked)">
          <span class="fr-label">No links</span>
          <span class="fr-count">${RECORDS.filter(r=>r.link_count===0).length}</span>
        </label>
        <label class="filter-row">
          <input type="checkbox" onchange="toggleAllLevels(this.checked)">
          <span class="fr-label">All 4 levels</span>
          <span class="fr-count">${RECORDS.filter(r=>r.present_in_books.length===4).length}</span>
        </label>
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-title" onclick="toggleFS(this)">👨‍👩‍👧 Family (Top 20) <span class="toggle">▾</span></div>
      <div class="filter-body collapsed" id="fs-families">
        ${topFamilies.map(([fam,cnt])=>`
          <label class="filter-row">
            <input type="checkbox" onchange="toggleFilter('families','${CSS.escape(fam)}',this.checked)" data-family="${fam.replace(/"/g,'&quot;')}">
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

function toggleAllLevels(checked) {
  if(checked) filters.levels = new Set(['_all4']);
  else filters.levels.delete('_all4');
  applyFilters();
}

function setSearch(v) {
  filters.search = v.toLowerCase();
  page = 1;
  applyFilters();
}

function clearAllFilters() {
  filters = { search:"", chapters:new Set(), levels:new Set(), kinds:new Set(), asterisked:new Set(), hasLinks:new Set(), families:new Set() };
  document.querySelectorAll('#sidebarContent input[type=checkbox]').forEach(c=>c.checked=false);
  const sb = document.getElementById('searchBox');
  if(sb) sb.value = '';
  page = 1;
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
    if(filters.chapters.size > 0) {
      if(!filters.chapters.has('ch'+r.chapter)) return false;
    }
    if(filters.levels.has('_all4')) {
      if(r.present_in_books.length < 4) return false;
    } else if(filters.levels.size > 0) {
      if(![...filters.levels].some(l => r.present_in_books.includes(l))) return false;
    }
    if(filters.kinds.size > 0) {
      if(!filters.kinds.has(r.kind)) return false;
    }
    if(filters.asterisked.size > 0) {
      const has = r.anyAsterisk;
      if(filters.asterisked.has('yes') && !has) return false;
      if(filters.asterisked.has('no') && has) return false;
    }
    if(filters.hasLinks.size > 0) {
      const has = r.link_count > 0;
      if(filters.hasLinks.has('yes') && !has) return false;
      if(filters.hasLinks.has('no') && has) return false;
    }
    if(filters.families.size > 0) {
      if(!filters.families.has(r.family_denomination_canonical)) return false;
    }
    return true;
  });
}

function updateResultCount() {
  const fr = filteredRecords();
  document.getElementById('resultCount').textContent = `${fr.length} of ${RECORDS.length} concepts`;
}

/* ============================================================
   TABLE VIEW
============================================================ */
function renderTable() {
  const fr = filteredRecords();
  const sorted = sortRecords(fr);
  const total = sorted.length;
  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if(page > maxPage) page = maxPage;
  const slice = sorted.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = slice.map(r => `
    <tr onclick="selectRecord('${r.chKey}','${escKey(r.recKey)}')" class="${NET.selected === r.chKey+':'+r.recKey ? 'selected' : ''}">
      <td class="code-cell">${r.section_code}</td>
      <td class="name-cell">${r.denomination_canonical || '<span style="color:var(--muted)">—</span>'}</td>
      <td><span style="background:${CHAPTER_COLOR['ch'+r.chapter]};color:#fff;border-radius:4px;padding:2px 7px;font-size:10.5px;font-weight:700;">${r.chapter}</span></td>
      <td><span class="kind-badge kind-${r.kind.split('_')[0]}">${r.kind}</span></td>
      <td>${r.present_in_books.map(l=>`<span class="level-badge" style="background:${LEVEL_COLOR[l]}">${l}</span>`).join('')}</td>
      <td style="text-align:center;color:var(--muted);">${r.link_count > 0 ? `<strong style="color:var(--accent2)">${r.link_count}</strong>` : '—'}</td>
    </tr>
  `).join('');

  renderPager(page, maxPage);
  updateResultCount();
}

function sortRecords(arr) {
  const { col, dir } = sortState;
  return [...arr].sort((a,b) => {
    let av = a[col] ?? '', bv = b[col] ?? '';
    if(typeof av === 'number') return dir==='asc' ? av-bv : bv-av;
    av = String(av).toLowerCase(); bv = String(bv).toLowerCase();
    return dir==='asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });
}

function toggleSort(col) {
  if(sortState.col === col) sortState.dir = sortState.dir==='asc'?'desc':'asc';
  else { sortState.col = col; sortState.dir = 'asc'; }
  document.querySelectorAll('thead th').forEach((th,i)=>th.classList.remove('sorted'));
  renderTable();
}

function setSortFromDropdown() {
  const [col,dir] = document.getElementById('sortSelect').value.split(':');
  sortState = { col, dir };
  renderTable();
}

function renderPager(cur, max) {
  document.getElementById('pager').innerHTML = `
    <button onclick="gotoPage(1)" ${cur===1?'disabled':''}>«</button>
    <button onclick="gotoPage(${cur-1})" ${cur===1?'disabled':''}>‹</button>
    <span class="page-info">Page ${cur} of ${max}</span>
    <button onclick="gotoPage(${cur+1})" ${cur>=max?'disabled':''}>›</button>
    <button onclick="gotoPage(${max})" ${cur>=max?'disabled':''}>»</button>
  `;
}
function gotoPage(p) { page = p; renderTable(); }
function escKey(k) { return k.replace(/'/g,"\\'"); }

function selectRecord(chKey, recKey) {
  const key = chKey + ':' + recKey;
  NET.selected = key;
  const rawC = ROOT.concepts[chKey]?.[recKey];
  if(!rawC) return;
  const rec = RECORDS.find(r=>r.chKey===chKey && r.recKey===recKey);
  showNodeInfo(rec, rawC);
  // Switch to network and highlight if in network view
  if(activeTab === 'network') {
    const node = NET.nodes.find(n => n.chKey===chKey && n.recKey===recKey);
    if(node) { centerOnNode(node); }
  }
  renderTable();
}

/* ============================================================
   NODE INFO PANEL
============================================================ */
function showNodeInfo(rec, rawC) {
  if(!rec || !rawC) return;
  const panel = document.getElementById('nodeInfoPanel');
  panel.classList.add('show');

  document.getElementById('nipTitle').textContent = rec.denomination_canonical || '—';
  document.getElementById('nipCode').textContent = rec.section_code + ' · Ch ' + rec.chapter + ' · ' + rec.kind;
  document.getElementById('nipBadges').innerHTML =
    rec.present_in_books.map(l=>`<span class="level-badge" style="background:${LEVEL_COLOR[l]}">${l}</span>`).join('') +
    (rec.anyAsterisk ? '<span class="asterisk-badge" title="Asterisked">⭐ asterisked</span>' : '') +
    `<span style="background:${CHAPTER_COLOR['ch'+rec.chapter]};color:#fff;font-size:10px;padding:2px 8px;border-radius:4px;font-weight:700;">${CHAPTER_TITLES['ch'+rec.chapter]||'Ch '+rec.chapter}</span>`;

  let html = '';

  // Family info
  if(rec.family_denomination_canonical) {
    html += `<div class="nip-section"><div class="nip-section-title">Family</div><div style="font-size:13px;font-family:var(--serif);font-weight:600;">${rec.family_denomination_canonical}</div></div>`;
  }

  // Realisations per level
  const rPerBook = rawC.realisations_per_book || rawC.realisations_by_pos_per_book;
  if(rPerBook && Object.values(rPerBook).some(v=>v)) {
    html += `<div class="nip-section"><div class="nip-section-title">Realisations / Examples</div><div class="per-book-grid">`;
    LEVELS.forEach(l => {
      const items = rawC.realisations_per_book?.[l];
      const absent = !rec.present_in_books.includes(l);
      html += `<div class="pb-cell ${absent?'absent':''}"><span class="pb-lvl" style="background:${LEVEL_COLOR[l]}">${l}</span>`;
      if(!items || items.length===0) { html += `<div class="pb-content" style="color:var(--muted2);">${absent ? 'absent' : 'none'}</div>`; }
      else {
        html += `<ul class="realisation-list">`;
        items.slice(0,6).forEach(it => {
          html += `<li><span class="rl-text">${it.text || '—'}</span>${it.asterisked?'<span class="rl-star">⭐</span>':''}</li>`;
        });
        if(items.length>6) html += `<li style="color:var(--muted);font-size:10.5px">+${items.length-6} more</li>`;
        html += `</ul>`;
      }
      html += `</div>`;
    });
    html += `</div></div>`;
  }

  // Competence statements (ch5)
  const csPerBook = rawC.competence_statements_per_book;
  if(csPerBook && Object.values(csPerBook).some(v=>v&&v.length)) {
    html += `<div class="nip-section"><div class="nip-section-title">Competence Statements</div><div class="per-book-grid">`;
    LEVELS.forEach(l => {
      const items = csPerBook[l];
      const absent = !rec.present_in_books.includes(l);
      html += `<div class="pb-cell ${absent?'absent':''}"><span class="pb-lvl" style="background:${LEVEL_COLOR[l]}">${l}</span>`;
      if(!items||!items.length) html += `<div class="pb-content" style="color:var(--muted2)">${absent?'absent':'none'}</div>`;
      else html += `<div class="pb-content">${items.map(s=>`<div style="margin-bottom:4px">• ${s.text||''}</div>`).slice(0,4).join('')}</div>`;
      html += `</div>`;
    });
    html += `</div></div>`;
  }

  // Category / material (ch9)
  if(rawC.category_left_col || rawC.material_right_col) {
    html += `<div class="nip-section"><div class="nip-section-title">Sociocultural Content</div><div class="per-book-grid">`;
    LEVELS.forEach(l => {
      const cat = (rawC.category_left_col||{})[l];
      const mat = (rawC.material_right_col||{})[l];
      const absent = !rec.present_in_books.includes(l);
      html += `<div class="pb-cell ${absent?'absent':''}"><span class="pb-lvl" style="background:${LEVEL_COLOR[l]}">${l}</span>`;
      if(cat||mat) html += `<div class="pb-content">${cat?'<strong>'+cat+'</strong><br>':''}${mat||''}</div>`;
      else html += `<div class="pb-content" style="color:var(--muted2)">${absent?'absent':'—'}</div>`;
      html += `</div>`;
    });
    html += `</div></div>`;
  }

  // Connections out
  const linksAll = rawC.links_to_concepts_per_book || {};
  const allLinksOut = Object.entries(linksAll).flatMap(([lvl,arr])=>(arr||[]).map(lk=>({...lk,level:lvl})));
  const uniqueLinks = [];
  const seenLinkKeys = new Set();
  allLinksOut.forEach(lk => { const k = lk.source_concept_key||lk.target; if(!seenLinkKeys.has(k)){seenLinkKeys.add(k);uniqueLinks.push(lk);} });
  if(uniqueLinks.length) {
    html += `<div class="nip-section"><div class="nip-section-title">Links Out (${uniqueLinks.length})</div><ul class="connected-list">`;
    uniqueLinks.slice(0,8).forEach(lk => {
      const targetKey = lk.source_concept_key || lk.target;
      const targetChBucket = lk.source_chN_bucket || ('ch'+(lk.source_chapter||''));
      const targetRec = RECORDS.find(r=>r.chKey===targetChBucket && r.recKey===targetKey);
      const name = targetRec?.denomination_canonical || targetKey;
      html += `<li onclick="selectRecord('${targetChBucket}','${escKey(targetKey)}')"><div class="cl-name">${name}</div><div class="cl-meta">${lk.type||''} · ${lk.level||''}</div></li>`;
    });
    if(uniqueLinks.length>8) html += `<li style="color:var(--muted);font-size:11px;cursor:default">+${uniqueLinks.length-8} more</li>`;
    html += `</ul></div>`;
  }

  // Connections in
  const linkedFromAll = rawC.linked_from_per_book || {};
  const allLinksIn = Object.entries(linkedFromAll).flatMap(([lvl,arr])=>(arr||[]).map(lk=>({...lk,level:lvl})));
  const uniqueLinksIn = [];
  const seenIn = new Set();
  allLinksIn.forEach(lk => { const k = lk.source_concept_key; if(k && !seenIn.has(k)){seenIn.add(k);uniqueLinksIn.push(lk);} });
  if(uniqueLinksIn.length) {
    html += `<div class="nip-section"><div class="nip-section-title">Linked From (${uniqueLinksIn.length})</div><ul class="connected-list">`;
    uniqueLinksIn.slice(0,8).forEach(lk => {
      const targetRec = RECORDS.find(r=>r.chKey===lk.source_chN_bucket && r.recKey===lk.source_concept_key);
      const name = targetRec?.denomination_canonical || lk.source_concept_key;
      html += `<li onclick="selectRecord('${lk.source_chN_bucket}','${escKey(lk.source_concept_key)}')"><div class="cl-name">${name}</div><div class="cl-meta">${lk.type||''} · ${lk.level||''}</div></li>`;
    });
    if(uniqueLinksIn.length>8) html += `<li style="color:var(--muted);font-size:11px;cursor:default">+${uniqueLinksIn.length-8} more</li>`;
    html += `</ul></div>`;
  }

  // CEFR back-refs
  const cefrRefs = rawC.cefr_descriptors_pointing_to_this_per_book || {};
  const allCefr = Object.entries(cefrRefs).flatMap(([l,arr])=>(arr||[]).map(r=>({...r,level:l})));
  if(allCefr.length) {
    html += `<div class="nip-section"><div class="nip-section-title">CEFR Descriptors (${allCefr.length})</div>`;
    allCefr.slice(0,4).forEach(cr => {
      const ch2c = ROOT.concepts.ch2?.[cr.source_row_id_canonical];
      const descText = ch2c ? (ch2c.descriptor_text_per_book?.[cr.level] || '') : '';
      html += `<div style="border:1px solid var(--line);border-radius:6px;padding:8px;margin-bottom:6px;font-size:11.5px;">
        <span class="level-badge" style="background:${LEVEL_COLOR[cr.level]};margin-right:6px;">${cr.level}</span>
        ${cr.criterion_label ? `<strong>${cr.criterion_label}</strong><br>` : ''}
        ${descText ? `<span style="color:var(--muted)">${descText.slice(0,120)}${descText.length>120?'…':''}</span>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  document.getElementById('nodeInfoBody').innerHTML = html;
}

function closeNodeInfo() {
  document.getElementById('nodeInfoPanel').classList.remove('show');
  NET.selected = null;
  renderTable();
}

/* ============================================================
   NETWORK VIEW
============================================================ */
const CANVAS_MAX_NODES = 400; // cap for performance

function buildNetworkData() {
  const canvas = document.getElementById('networkCanvas');
  const fr = filteredRecords().slice(0, CANVAS_MAX_NODES);
  const nodeKeys = new Set(fr.map(r=>r.chKey+':'+r.recKey));

  NET.nodes = fr.map(r => ({
    key: r.chKey+':'+r.recKey,
    chKey: r.chKey,
    recKey: r.recKey,
    label: r.denomination_canonical || r.section_code,
    chapter: r.chapter,
    kind: r.kind,
    present_in_books: r.present_in_books,
    x: Math.random() * 800 + 100,
    y: Math.random() * 600 + 100,
    vx: 0, vy: 0,
    pinned: false,
    link_count: r.link_count,
  }));

  const nodeIndex = {};
  NET.nodes.forEach((n,i) => nodeIndex[n.key] = i);

  NET.edges = [];
  const crossLinks = ROOT.cross_chapter_links || [];
  const seenEdge = new Set();

  crossLinks.filter(lk => !lk.unresolved).forEach(lk => {
    const srcKey = 'ch'+lk.source.chapter+':'+lk.source.concept_key;
    const tgtSec = lk.target.section_code;
    if(!tgtSec) return;
    const tgtKey = 'ch'+lk.target.chapter+':'+tgtSec;
    const edgeKey = [srcKey,tgtKey].sort().join('>>');
    if(!seenEdge.has(edgeKey) && nodeKeys.has(srcKey) && nodeKeys.has(tgtKey)) {
      seenEdge.add(edgeKey);
      NET.edges.push({
        s: nodeIndex[srcKey],
        t: nodeIndex[tgtKey],
        type: lk.type,
        levels: lk.present_in_books
      });
    }
  });

  // Build legend
  buildNetLegend();
  resizeNetCanvas();
  runLayout();
}

function buildNetLegend() {
  document.getElementById('netLegend').innerHTML = Object.entries(CHAPTER_COLOR).map(([ch,c])=>`
    <div class="legend-item">
      <div class="legend-dot" style="background:${c}"></div>
      <span>${ch}</span>
    </div>`).join('');
}

function resizeNetCanvas() {
  const container = document.getElementById('networkView');
  const canvas = document.getElementById('networkCanvas');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}

window.addEventListener('resize', () => {
  if(activeTab==='network') { resizeNetCanvas(); redrawNet(); }
  if(activeTab==='radial') drawRadial();
});

function runLayout() {
  if(NET.animFrame) cancelAnimationFrame(NET.animFrame);
  let iter = 0;
  function tick() {
    forceStep();
    redrawNet();
    iter++;
    // Keep running if we're dragging, otherwise decay after 400 iterations
    if(iter < 400 || NET.dragging) {
      if(NET.dragging && iter > 300) iter = 200; // prevent timeout while dragging
      NET.animFrame = requestAnimationFrame(tick);
    }
  }
  tick();
}

function unpinAll() {
  NET.nodes.forEach(n => n.pinned = false);
  runLayout();
  notify("All nodes unpinned");
}

function updateCharge() { /* just re-run a few steps */ forceStep(); redrawNet(); }

function forceStep() {
  const nodes = NET.nodes;
  const edges = NET.edges;
  const charge = parseFloat(document.getElementById('chargeRange')?.value || 80);
  const canvas = document.getElementById('networkCanvas');
  const W = canvas.width, H = canvas.height;

  // Repulsion
  for(let i=0;i<nodes.length;i++) {
    for(let j=i+1;j<nodes.length;j++) {
      let dx = nodes[j].x - nodes[i].x;
      let dy = nodes[j].y - nodes[i].y;
      let dist = Math.sqrt(dx*dx+dy*dy) || 1;
      let force = (charge * charge) / dist;
      nodes[i].vx -= (dx/dist)*force*0.01;
      nodes[i].vy -= (dy/dist)*force*0.01;
      nodes[j].vx += (dx/dist)*force*0.01;
      nodes[j].vy += (dy/dist)*force*0.01;
    }
  }
  // Attraction along edges
  edges.forEach(e => {
    const a = nodes[e.s], b = nodes[e.t];
    if(!a||!b) return;
    let dx = b.x-a.x, dy = b.y-a.y;
    let dist = Math.sqrt(dx*dx+dy*dy)||1;
    let force = (dist-80)*0.005;
    a.vx += (dx/dist)*force;
    a.vy += (dy/dist)*force;
    b.vx -= (dx/dist)*force;
    b.vy -= (dy/dist)*force;
  });
  // Center gravity
  const cx = W/2, cy = H/2;
  nodes.forEach(n => {
    n.vx += (cx-n.x)*0.003;
    n.vy += (cy-n.y)*0.003;
  });
  // Apply
  nodes.forEach(n => {
    if(n.pinned) return;
    n.vx *= 0.7; n.vy *= 0.7;
    n.x += n.vx; n.y += n.vy;
    n.x = Math.max(20, Math.min(W-20, n.x));
    n.y = Math.max(20, Math.min(H-20, n.y));
  });
}

function redrawNet() {
  const canvas = document.getElementById('networkCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const showLabels = document.getElementById('showLabels')?.checked !== false;
  const showEdges = document.getElementById('showEdges')?.checked !== false;
  const nodeSize = parseFloat(document.getElementById('nodeSizeRange')?.value || 10);
  const nodes = NET.nodes;
  const edges = NET.edges;
  const zoom = NET.zoom;
  const px = NET.panX, py = NET.panY;

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(zoom, zoom);

  // Pre-calculate hover highlights
  let hovNodes = new Set();
  let hovEdges = new Set();
  if(NET.hovered && pathHighlight.size === 0) {
    hovNodes.add(NET.hovered.key);
    edges.forEach((e, i) => {
      const a = nodes[e.s], b = nodes[e.t];
      if(a === NET.hovered) { hovNodes.add(b.key); hovEdges.add(i); }
      if(b === NET.hovered) { hovNodes.add(a.key); hovEdges.add(i); }
    });
  }

  // Edges — curved bezier lines
  if(showEdges) {
    edges.forEach((e, i) => {
      const a = nodes[e.s], b = nodes[e.t];
      if(!a||!b) return;
      const onPath = pathHighlight.size > 0 && pathHighlight.has(a.key) && pathHighlight.has(b.key);
      const isHovEdge = hovEdges.has(i);

      // Compute a curved control point
      const mx = (a.x + b.x)/2, my = (a.y + b.y)/2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const curvature = Math.min(dist * 0.12, 30);
      const cx1 = mx + (dy/dist)*curvature;
      const cy1 = my - (dx/dist)*curvature;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(cx1, cy1, b.x, b.y);

      if(onPath) {
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, '#f97316');
        grad.addColorStop(1, '#fb7185');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3.0 / zoom;
        ctx.globalAlpha = 1;
      } else if (isHovEdge) {
        const colA = CHAPTER_COLOR['ch'+a.chapter] || '#60a5fa';
        const colB = CHAPTER_COLOR['ch'+b.chapter] || '#60a5fa';
        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, colA);
        grad.addColorStop(1, colB);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.2 / zoom;
        ctx.globalAlpha = 0.9;
      } else {
        ctx.strokeStyle = 'rgba(148,163,184,0.45)';
        ctx.lineWidth = 0.8 / zoom;
        let alpha = 1;
        if (pathHighlight.size > 0) alpha = 0.3;
        else if (hovNodes.size > 0) alpha = 0.3;
        ctx.globalAlpha = alpha;
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }

  // Nodes — gradient filled with glow
  nodes.forEach(n => {
    const isSel = NET.selected === n.key;
    const isHov = NET.hovered === n;
    const onPath = pathHighlight.has(n.key);
    const isPathSel = (pathFrom===n.key || pathTo===n.key);
    const isHovNode = hovNodes.has(n.key);
    const chColor = CHAPTER_COLOR['ch'+n.chapter] || '#94a3b8';
    const glowColor = CHAPTER_GLOW['ch'+n.chapter] || 'rgba(148,163,184,0.4)';
    const r = nodeSize * (1 + Math.min(n.link_count, 20)*0.06);

    let dimmed = false;
    if (pathHighlight.size > 0) dimmed = !onPath;
    else if (hovNodes.size > 0) dimmed = !isHovNode;

    ctx.globalAlpha = dimmed ? 0.12 : 1;

    // Outer glow for important/hovered/selected nodes
    if((isSel || isHov || isPathSel || isHovNode) && !dimmed) {
      ctx.save();
      ctx.shadowColor = isPathSel ? '#f97316' : chColor;
      ctx.shadowBlur = isHov ? 24 : 16;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI*2);
      ctx.fillStyle = chColor;
      ctx.fill();
      ctx.restore();
    }

    // Gradient fill
    const grad = ctx.createRadialGradient(n.x - r*0.3, n.y - r*0.3, r*0.1, n.x, n.y, r);
    grad.addColorStop(0, lightenColor(chColor, 40));
    grad.addColorStop(1, chColor);
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI*2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Ring styles
    if(isSel || isPathSel) {
      ctx.strokeStyle = isSel ? 'rgba(26,24,20,0.7)' : '#f97316';
      ctx.lineWidth = 2.5 / zoom;
      ctx.stroke();
    } else if(isHov) {
      ctx.strokeStyle = 'rgba(26,24,20,0.5)';
      ctx.lineWidth = 2.0 / zoom;
      ctx.stroke();
    } else if(n.kind === 'family') {
      ctx.strokeStyle = 'rgba(26,24,20,0.15)';
      ctx.lineWidth = 1.2 / zoom;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Level indicator dots
    if(n.present_in_books.length < 4 && !dimmed) {
      const dotSpacing = 5;
      const totalW = (n.present_in_books.length - 1) * dotSpacing;
      n.present_in_books.forEach((l,i) => {
        ctx.beginPath();
        ctx.arc(n.x - totalW/2 + i*dotSpacing, n.y + r + 5, 2.2, 0, Math.PI*2);
        ctx.fillStyle = LEVEL_COLOR[l];
        ctx.fill();
      });
    }

    // Label with light pill backdrop
    if(showLabels && (zoom > 0.4 || isHov || isSel)) {
      const label = n.label || n.recKey;
      const maxLen = zoom > 1 ? 30 : 20;
      const txt = label.length > maxLen ? label.slice(0,maxLen)+'…' : label;
      const fontSize = Math.max(8, Math.min(12, 10/zoom)) / zoom;
      ctx.font = `${isSel||isHov?'600 ':''} ${fontSize}px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const tw = ctx.measureText(txt).width;
      const lx = n.x, ly = n.y + r + 8;
      const padX = 5, padY = 2;

      // Light rounded-rect backdrop
      ctx.globalAlpha = dimmed ? 0.2 : 0.95;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      const rr = (fontSize + padY*2) / 2;
      
      ctx.save();
      if (!dimmed) {
        ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
      }
      roundRect(ctx, lx - tw/2 - padX, ly - padY, tw + padX*2, fontSize + padY*2, rr);
      ctx.fill();
      ctx.restore();

      // subtle border
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 0.5 / zoom;
      ctx.stroke();

      // Text
      ctx.globalAlpha = dimmed ? 0.3 : 1;
      ctx.fillStyle = '#1a1814';
      ctx.fillText(txt, lx, ly);
      ctx.globalAlpha = 1;
    }
  });

  ctx.restore();
}

// Utility: lighten a hex color
function lightenColor(hex, pct) {
  let r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  r = Math.min(255, r + pct); g = Math.min(255, g + pct); b = Math.min(255, b + pct);
  return `rgb(${r},${g},${b})`;
}

// Utility: draw a rounded rectangle path
function roundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

// Canvas interaction
const netCanvas = document.getElementById('networkCanvas');
netCanvas.addEventListener('mousedown', e => {
  const pos = screenToWorld(e.clientX, e.clientY);
  const hit = hitTest(pos.x, pos.y);
  if(hit) {
    if(pathMode) {
      assignPathNode(hit);
    } else {
      NET.dragging = hit;
      hit.pinned = true;
      runLayout();
    }
  } else {
    NET.panning = true;
    NET.lastMx = e.clientX;
    NET.lastMy = e.clientY;
  }
});
netCanvas.addEventListener('mousemove', e => {
  const pos = screenToWorld(e.clientX, e.clientY);
  if(NET.dragging) {
    NET.dragging.x = pos.x;
    NET.dragging.y = pos.y;
    redrawNet();
  } else if(NET.panning) {
    NET.panX += (e.clientX - NET.lastMx);
    NET.panY += (e.clientY - NET.lastMy);
    NET.lastMx = e.clientX;
    NET.lastMy = e.clientY;
    redrawNet();
  } else {
    const hit = hitTest(pos.x, pos.y);
    if(hit !== NET.hovered) {
      NET.hovered = hit;
      redrawNet();
      if(hit) {
        showTooltip(e.clientX, e.clientY, `<strong>${hit.label}</strong><br>${CHAPTER_TITLES['ch'+hit.chapter]} · ${hit.kind} · ${hit.present_in_books.join(', ')}<br>Links: ${hit.link_count}`);
      } else {
        hideTooltip();
      }
    } else if(hit) {
      moveTooltip(e.clientX, e.clientY);
    }
  }
});
netCanvas.addEventListener('mouseup', e => {
  if(NET.dragging) { NET.dragging.pinned = true; NET.dragging = null; }
  NET.panning = false;
});
netCanvas.addEventListener('mouseleave', () => { NET.dragging = null; NET.panning = false; hideTooltip(); });
netCanvas.addEventListener('click', e => {
  if(NET.panning) return;
  const pos = screenToWorld(e.clientX, e.clientY);
  const hit = hitTest(pos.x, pos.y);
  if(hit && !pathMode) {
    NET.selected = hit.key;
    const rawC = ROOT.concepts[hit.chKey]?.[hit.recKey];
    const rec = RECORDS.find(r=>r.chKey===hit.chKey && r.recKey===hit.recKey);
    if(rec && rawC) showNodeInfo(rec, rawC);
    redrawNet();
  }
});
netCanvas.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.12 : 0.88;
  const rect = netCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  NET.panX = mx - (mx - NET.panX) * factor;
  NET.panY = my - (my - NET.panY) * factor;
  NET.zoom *= factor;
  NET.zoom = Math.max(0.1, Math.min(8, NET.zoom));
  redrawNet();
}, { passive: false });

function screenToWorld(sx, sy) {
  const rect = netCanvas.getBoundingClientRect();
  return {
    x: (sx - rect.left - NET.panX) / NET.zoom,
    y: (sy - rect.top - NET.panY) / NET.zoom
  };
}

function hitTest(wx, wy) {
  const nodeSize = parseFloat(document.getElementById('nodeSizeRange')?.value || 10);
  for(let i = NET.nodes.length-1; i>=0; i--) {
    const n = NET.nodes[i];
    const r = nodeSize * (1 + Math.min(n.link_count,20)*0.05);
    const dx = wx-n.x, dy = wy-n.y;
    if(dx*dx+dy*dy <= r*r) return n;
  }
  return null;
}

function zoomNet(factor) {
  const canvas = document.getElementById('networkCanvas');
  const cx = canvas.width/2, cy = canvas.height/2;
  NET.panX = cx - (cx - NET.panX)*factor;
  NET.panY = cy - (cy - NET.panY)*factor;
  NET.zoom *= factor;
  NET.zoom = Math.max(0.1, Math.min(8, NET.zoom));
  redrawNet();
}

function resetZoomNet() {
  NET.zoom = 1; NET.panX = 0; NET.panY = 0;
  redrawNet();
}

function centerOnNode(node) {
  const canvas = document.getElementById('networkCanvas');
  NET.panX = canvas.width/2 - node.x * NET.zoom;
  NET.panY = canvas.height/2 - node.y * NET.zoom;
  redrawNet();
}

/* ============================================================
   PATH FINDER
============================================================ */
function setPathMode(mode) {
  pathMode = mode;
  netCanvas.style.cursor = 'crosshair';
  notify(`Click a node to set as ${mode.toUpperCase()}`);
  document.getElementById('path'+(mode==='from'?'From':'To')+'Btn').classList.add('set');
}

function assignPathNode(node) {
  if(pathMode === 'from') {
    pathFrom = node.key;
    document.getElementById('pathFromLabel').textContent = (node.label||node.recKey).slice(0,30);
    document.getElementById('pathFromBtn').classList.add('set');
  } else if(pathMode === 'to') {
    pathTo = node.key;
    document.getElementById('pathToLabel').textContent = (node.label||node.recKey).slice(0,30);
    document.getElementById('pathToBtn').classList.add('set');
  }
  pathMode = null;
  netCanvas.style.cursor = 'grab';
}

function setCurrentAsPathFrom() {
  if(!NET.selected) return;
  pathFrom = NET.selected;
  const node = NET.nodes.find(n=>n.key===NET.selected);
  document.getElementById('pathFromLabel').textContent = (node?.label||NET.selected).slice(0,30);
  document.getElementById('pathFromBtn').classList.add('set');
  notify('Set as path FROM');
}
function setCurrentAsPathTo() {
  if(!NET.selected) return;
  pathTo = NET.selected;
  const node = NET.nodes.find(n=>n.key===NET.selected);
  document.getElementById('pathToLabel').textContent = (node?.label||NET.selected).slice(0,30);
  document.getElementById('pathToBtn').classList.add('set');
  notify('Set as path TO');
}

function findPath() {
  if(!pathFrom || !pathTo) { notify('Set both FROM and TO nodes first'); return; }
  if(pathFrom === pathTo) { notify('FROM and TO are the same node'); return; }

  // BFS on network edges
  const nodes = NET.nodes;
  const edges = NET.edges;
  const keyToIdx = {};
  nodes.forEach((n,i) => keyToIdx[n.key] = i);

  const adj = {};
  nodes.forEach(n => adj[n.key] = []);
  edges.forEach(e => {
    const ak = nodes[e.s]?.key, bk = nodes[e.t]?.key;
    if(ak && bk) {
      adj[ak].push({ neighbor: bk, type: e.type });
      adj[bk].push({ neighbor: ak, type: e.type });
    }
  });

  // Also add cross_chapter_links as adjacency for all visible nodes
  const visibleKeys = new Set(nodes.map(n=>n.key));
  (ROOT.cross_chapter_links||[]).filter(lk=>!lk.unresolved).forEach(lk => {
    const sk = 'ch'+lk.source.chapter+':'+lk.source.concept_key;
    const tSec = lk.target.section_code;
    if(!tSec) return;
    const tk = 'ch'+lk.target.chapter+':'+tSec;
    if(visibleKeys.has(sk) && visibleKeys.has(tk)) {
      adj[sk]?.push({neighbor:tk, type:lk.type});
      adj[tk]?.push({neighbor:sk, type:lk.type});
    }
  });

  const visited = { [pathFrom]: null };
  const edgeTypes = { [pathFrom]: null };
  const queue = [pathFrom];
  let found = false;

  while(queue.length) {
    const cur = queue.shift();
    if(cur === pathTo) { found = true; break; }
    for(const {neighbor, type} of (adj[cur]||[])) {
      if(!(neighbor in visited)) {
        visited[neighbor] = cur;
        edgeTypes[neighbor] = type;
        queue.push(neighbor);
      }
    }
  }

  const resultEl = document.getElementById('pathResult');
  resultEl.style.display = 'block';

  if(!found) {
    resultEl.innerHTML = `<div style="color:var(--muted);text-align:center;padding:12px;">No path found between these nodes in the current view.<br><small>Try loading more nodes or adjusting filters.</small></div>`;
    pathHighlight.clear();
    redrawNet();
    return;
  }

  // Reconstruct path
  const path = [];
  let cur = pathTo;
  while(cur) { path.unshift(cur); cur = visited[cur]; }
  pathHighlight = new Set(path);

  let html = `<div style="font-weight:700;margin-bottom:8px;font-size:12px;">Path found: ${path.length} hops</div>`;
  path.forEach((key, i) => {
    const node = NET.nodes.find(n=>n.key===key);
    const name = node?.label || key;
    const type = edgeTypes[key];
    if(i > 0) {
      html += `<div class="path-connector">↓ <em style="font-size:10px">${type||'link'}</em></div>`;
    }
    html += `<div class="path-hop">
      <div class="hop-num">${i+1}</div>
      <div>
        <div class="path-hop-name" onclick="selectRecord('${key.split(':')[0]}','${escKey(key.split(':').slice(1).join(':'))}')">
          ${name.length > 35 ? name.slice(0,33)+'…' : name}
        </div>
        <div class="path-hop-type">${CHAPTER_TITLES[key.split(':')[0]]||''}</div>
      </div>
    </div>`;
  });
  resultEl.innerHTML = html;

  // Center view on path
  const pathNodes = path.map(k=>NET.nodes.find(n=>n.key===k)).filter(Boolean);
  if(pathNodes.length > 0) {
    const cx = pathNodes.reduce((s,n)=>s+n.x,0)/pathNodes.length;
    const cy = pathNodes.reduce((s,n)=>s+n.y,0)/pathNodes.length;
    const canvas = document.getElementById('networkCanvas');
    NET.panX = canvas.width/2 - cx*NET.zoom;
    NET.panY = canvas.height/2 - cy*NET.zoom;
  }
  redrawNet();
}

function clearPath() {
  pathFrom = pathTo = null;
  pathMode = null;
  pathHighlight.clear();
  document.getElementById('pathFromLabel').textContent = 'Click to set start node';
  document.getElementById('pathToLabel').textContent = 'Click to set end node';
  document.getElementById('pathFromBtn').classList.remove('set');
  document.getElementById('pathToBtn').classList.remove('set');
  document.getElementById('pathResult').style.display = 'none';
  netCanvas.style.cursor = 'grab';
  redrawNet();
}

/* ============================================================
   RADIAL / SUNBURST VIEW
============================================================ */
function setRadialMode(mode, btn) {
  radialMode = mode;
  radialSel = null;
  document.querySelectorAll('.radial-mode-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  drawRadial();
}

function drawRadial() {
  const canvas = document.getElementById('radialCanvasEl');
  const container = document.getElementById('radialCanvas');
  const W = container.clientWidth;
  const H = container.clientHeight;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const cx = W/2, cy = H/2;
  const maxR = Math.min(W,H)/2 - 40;
  ctx.clearRect(0,0,W,H);

  const fr = filteredRecords();
  let groups = {};
  const modeKey = radialMode;

  if(modeKey === 'chapter') {
    fr.forEach(r => {
      const k = 'ch'+r.chapter;
      if(!groups[k]) groups[k] = { label: CHAPTER_TITLES[k]||k, color: CHAPTER_COLOR[k], count: 0, items: [] };
      groups[k].count++; groups[k].items.push(r);
    });
  } else if(modeKey === 'level') {
    LEVELS.forEach(l => groups[l] = { label: l, color: LEVEL_COLOR[l], count: 0, items: [] });
    fr.forEach(r => r.present_in_books.forEach(l => { if(groups[l]){groups[l].count++;groups[l].items.push(r);} }));
  } else if(modeKey === 'kind') {
    fr.forEach(r => {
      const k = r.kind;
      if(!groups[k]) groups[k] = { label: k, color: KIND_COLOR[k]||'#888', count: 0, items: [] };
      groups[k].count++; groups[k].items.push(r);
    });
  } else if(modeKey === 'family') {
    fr.forEach(r => {
      const k = r.family_denomination_canonical || '(no family)';
      if(!groups[k]) groups[k] = { label: k.length>25?k.slice(0,23)+'…':k, color:'', count: 0, items: [] };
      groups[k].count++; groups[k].items.push(r);
    });
    // Sort and limit
    const sorted = Object.entries(groups).sort((a,b)=>b[1].count-a[1].count).slice(0,20);
    groups = Object.fromEntries(sorted);
    Object.keys(groups).forEach((k,i) => {
      const hue = (i*17)%360;
      groups[k].color = `hsl(${hue},50%,45%)`;
    });
  }

  const total = Object.values(groups).reduce((s,g)=>s+g.count,0);
  if(!total) { ctx.fillStyle='var(--muted)'; ctx.font='16px sans-serif'; ctx.textAlign='center'; ctx.fillText('No data',cx,cy); return; }

  let startAngle = -Math.PI/2;
  const segments = [];

  Object.entries(groups).forEach(([key,g]) => {
    const angle = (g.count/total) * Math.PI * 2;
    segments.push({ key, ...g, startAngle, angle, endAngle: startAngle+angle });
    startAngle += angle;
  });

  // Draw outer donut segments
  segments.forEach(seg => {
    const isSel = radialSel === seg.key;
    const inner = maxR * 0.35;
    const outer = maxR * (isSel ? 1.0 : 0.92);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(seg.startAngle)*inner, cy + Math.sin(seg.startAngle)*inner);
    ctx.arc(cx, cy, outer, seg.startAngle, seg.endAngle);
    ctx.arc(cx, cy, inner, seg.endAngle, seg.startAngle, true);
    ctx.closePath();
    ctx.fillStyle = seg.color || '#888';
    ctx.globalAlpha = isSel ? 1 : (radialSel ? 0.5 : 0.85);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    if(seg.angle > 0.15) {
      const midAngle = seg.startAngle + seg.angle/2;
      const r = (inner + outer*0.98) / 2;
      const lx = cx + Math.cos(midAngle)*r;
      const ly = cy + Math.sin(midAngle)*r;
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${seg.angle > 0.4 ? 11 : 9}px 'Inter',sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const txt = seg.label;
      ctx.fillText(txt.length>16?txt.slice(0,14)+'…':txt, lx, ly);
    }
  });

  // Center text
  ctx.fillStyle = '#1a1814';
  ctx.font = `bold 28px 'Georgia',serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total, cx, cy-10);
  ctx.font = `12px 'Inter',sans-serif`;
  ctx.fillStyle = '#8a8278';
  ctx.fillText('concepts', cx, cy+14);

  // Store segments for interaction
  canvas._segments = segments;
  canvas._cx = cx;
  canvas._cy = cy;
  canvas._maxR = maxR;
}

// Radial interaction
(function() {
  let radialCanvas = document.getElementById('radialCanvasEl');
  radialCanvas.addEventListener('mousemove', e => {
    const rect = radialCanvas.getBoundingClientRect();
    const mx = e.clientX-rect.left, my = e.clientY-rect.top;
    const segs = radialCanvas._segments;
    if(!segs) return;
    const cx = radialCanvas._cx, cy = radialCanvas._cy, maxR = radialCanvas._maxR;
    const dx = mx-cx, dy = my-cy;
    const dist = Math.sqrt(dx*dx+dy*dy);
    const inner = maxR*0.35, outer = maxR*0.98;
    const tt = document.getElementById('radialTooltip');
    if(dist>inner && dist<outer) {
      let angle = Math.atan2(dy,dx);
      const hit = segs.find(s => {
        let a = angle;
        let sa = s.startAngle, ea = s.endAngle;
        while(a < sa) a += Math.PI*2;
        return a >= sa && a <= ea;
      });
      if(hit) {
        tt.style.display='block';
        tt.style.left=(e.clientX-rect.left+12)+'px';
        tt.style.top=(e.clientY-rect.top-10)+'px';
        tt.textContent = `${hit.label}: ${hit.count} concepts (${(hit.count/(filteredRecords().length)*100).toFixed(1)}%)`;
        radialCanvas.style.cursor='pointer';
        return;
      }
    }
    tt.style.display='none';
    radialCanvas.style.cursor='default';
  });
  radialCanvas.addEventListener('click', e => {
    const rect = radialCanvas.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const segs = radialCanvas._segments;
    if(!segs) return;
    const cx=radialCanvas._cx, cy=radialCanvas._cy, maxR=radialCanvas._maxR;
    const dx=mx-cx, dy=my-cy;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const inner=maxR*0.35, outer=maxR*0.98;
    if(dist>inner && dist<outer) {
      let angle=Math.atan2(dy,dx);
      const hit=segs.find(s=>{let a=angle,sa=s.startAngle,ea=s.endAngle;while(a<sa)a+=Math.PI*2;return a>=sa&&a<=ea;});
      if(hit) {
        radialSel = radialSel===hit.key ? null : hit.key;
        drawRadial();
        if(radialSel) notify(`${hit.label}: ${hit.count} concepts`);
      }
    }
  });
  radialCanvas.addEventListener('mouseleave', () => {
    document.getElementById('radialTooltip').style.display='none';
  });
})();

/* ============================================================
   STATS VIEW
============================================================ */
function buildStatsView() {
  const fr = RECORDS;
  const byChapter = {};
  const byLevel = { A1:0, A2:0, B1:0, B2:0 };
  const byKind = {};
  let asterisked = 0, hasLinks = 0, all4 = 0;

  fr.forEach(r => {
    const ch = 'ch'+r.chapter;
    byChapter[ch] = (byChapter[ch]||0)+1;
    r.present_in_books.forEach(l => byLevel[l]++);
    byKind[r.kind] = (byKind[r.kind]||0)+1;
    if(r.anyAsterisk) asterisked++;
    if(r.link_count>0) hasLinks++;
    if(r.present_in_books.length===4) all4++;
  });

  const maxCh = Math.max(...Object.values(byChapter));
  const maxLv = Math.max(...Object.values(byLevel));

  const html = `
    <h2 style="font-size:20px;margin-bottom:16px">Corpus Statistics</h2>
    <div class="stats-grid">
      <div class="stat-card"><div class="sc-value" style="color:var(--accent)">${fr.length}</div><div class="sc-label">Total Concepts</div></div>
      <div class="stat-card"><div class="sc-value" style="color:var(--accent2)">9</div><div class="sc-label">Chapters</div></div>
      <div class="stat-card"><div class="sc-value">${all4}</div><div class="sc-label">In all 4 levels (${(all4/fr.length*100).toFixed(0)}%)</div></div>
      <div class="stat-card"><div class="sc-value" style="color:#b07a20">${asterisked}</div><div class="sc-label">Asterisked (${(asterisked/fr.length*100).toFixed(1)}%)</div></div>
      <div class="stat-card"><div class="sc-value">${hasLinks}</div><div class="sc-label">Have links (${(hasLinks/fr.length*100).toFixed(0)}%)</div></div>
      <div class="stat-card"><div class="sc-value" style="color:var(--accent2)">${(ROOT.cross_chapter_links||[]).length}</div><div class="sc-label">Cross-chapter links</div></div>
    </div>

    <div class="chart-block">
      <h3>Concepts by Chapter</h3>
      <div class="bar-chart">
        ${Object.entries(byChapter).sort((a,b)=>b[1]-a[1]).map(([ch,cnt])=>`
          <div class="bar-row">
            <div class="bar-label">${CHAPTER_TITLES[ch]||ch}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${(cnt/maxCh*100).toFixed(1)}%;background:${CHAPTER_COLOR[ch]}">
                ${cnt > maxCh*0.15 ? cnt : ''}
              </div>
            </div>
            <div class="bar-count">${cnt}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="chart-block">
      <h3>Concepts by CEFR Level (concepts present at that level)</h3>
      <div class="bar-chart">
        ${LEVELS.map(l=>`
          <div class="bar-row">
            <div class="bar-label">${l}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${(byLevel[l]/maxLv*100).toFixed(1)}%;background:${LEVEL_COLOR[l]}">${byLevel[l]}</div>
            </div>
            <div class="bar-count">${byLevel[l]}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="chart-block">
      <h3>Concepts by Kind</h3>
      <div class="bar-chart">
        ${Object.entries(byKind).sort((a,b)=>b[1]-a[1]).map(([kind,cnt])=>`
          <div class="bar-row">
            <div class="bar-label">${kind}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${(cnt/fr.length*100).toFixed(1)}%;background:${KIND_COLOR[kind]||'#888'}">${cnt}</div>
            </div>
            <div class="bar-count">${cnt}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="chart-block">
      <h3>Link Type Distribution (cross_chapter_links)</h3>
      <div class="bar-chart">
        ${Object.entries(
          (ROOT.cross_chapter_links||[]).reduce((acc,lk)=>{acc[lk.type]=(acc[lk.type]||0)+1;return acc;},{})
        ).sort((a,b)=>b[1]-a[1]).map(([type,cnt])=>`
          <div class="bar-row">
            <div class="bar-label">${type}</div>
            <div class="bar-track"><div class="bar-fill" style="width:${(cnt/1408*100).toFixed(1)}%;background:var(--accent2)">${cnt}</div></div>
            <div class="bar-count">${cnt}</div>
          </div>`).join('')}
      </div>
    </div>
  `;
  document.getElementById('statsContent').innerHTML = html;
}

/* ============================================================
   TAB SWITCHING
============================================================ */
let activeTab = 'table';

function toggleNetDrawer() {
  const drawer = document.getElementById('netDrawer');
  const toggle = document.getElementById('netDrawerToggle');
  drawer.classList.toggle('open');
  toggle.style.display = drawer.classList.contains('open') ? 'none' : '';
}

document.getElementById('headerTabs').addEventListener('click', e => {
  const btn = e.target.closest('.header-tab');
  if(!btn || !ROOT) return;
  const tab = btn.dataset.tab;
  document.querySelectorAll('.header-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(tab+'View').classList.add('active');
  activeTab = tab;

  if(tab === 'network') {
    setTimeout(()=>{ resizeNetCanvas(); redrawNet(); }, 50);
  } else if(tab === 'radial') {
    setTimeout(()=>drawRadial(), 50);
  }
});

/* ============================================================
   EXPORT
============================================================ */
document.getElementById('exportBtn').addEventListener('click', () => {
  const json = JSON.stringify(ROOT, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'concept_map_export.json';
  a.click();
  notify('JSON exported!');
});

/* ============================================================
   TOOLTIP
============================================================ */
const tooltipEl = document.getElementById('tooltip');
function showTooltip(x, y, html) {
  tooltipEl.innerHTML = html;
  tooltipEl.style.left = (x+14)+'px';
  tooltipEl.style.top = (y-10)+'px';
  tooltipEl.classList.add('show');
}
function moveTooltip(x, y) {
  tooltipEl.style.left = (x+14)+'px';
  tooltipEl.style.top = (y-10)+'px';
}
function hideTooltip() { tooltipEl.classList.remove('show'); }

/* ============================================================
   NOTIFICATION
============================================================ */
let notifTimeout;
function notify(msg) {
  const el = document.getElementById('notification');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(()=>el.classList.remove('show'), 2500);
}

/* ============================================================
   HELP MODAL
============================================================ */
function showHelp() { document.getElementById('helpModal').classList.add('show'); }
function closeHelp() { document.getElementById('helpModal').classList.remove('show'); }
document.getElementById('helpModal').addEventListener('click', e => { if(e.target===e.currentTarget) closeHelp(); });
document.addEventListener('keydown', e => { if(e.key==='Escape') { closeHelp(); closeNodeInfo(); } });
