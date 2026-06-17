function loadData() {
  const btn = document.getElementById('fetchBtn');
  if(btn) {
    btn.disabled = true;
    btn.textContent = 'Loading...';
  }
  fetch('concept_map_for_lesson_generation.json')
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
  const emptySt = document.getElementById('emptyState'); if(emptySt) emptySt.style.display = 'none';
  const rail = document.getElementById('rail'); if(rail) rail.style.display = 'flex';
  const panel = document.getElementById('panel'); if(panel) panel.style.display = '';
  const mainC = document.getElementById('mainContent'); if(mainC) mainC.style.display = '';
  const hTabs = document.getElementById('headerTabs'); if(hTabs) hTabs.style.display = '';
  const sbc = document.getElementById('statusBadgeCount'); if(sbc) sbc.textContent = RECORDS.length;
  const exBtn = document.getElementById('exportBtn'); if(exBtn) exBtn.disabled = false;
  clearAllFilters();
  buildStatsView();
}
