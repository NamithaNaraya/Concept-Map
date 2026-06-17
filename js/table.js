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
function escKey(k) { return (k||'').toString().replace(/'/g,"\\'"); }

function selectRecord(chKey, recKey) {
  const key = chKey + ':' + recKey;
  NET.selected = key;
  const rawC = ROOT.concepts[chKey]?.[recKey];
  if(!rawC) return;
  const rec = RECORDS.find(r=>r.chKey===chKey && r.recKey===recKey);
  showNodeInfo(rec, rawC);
  
  // Update Chatbot Context
  if (window.setChatContext) {
    window.setChatContext(rec.denomination_canonical || rec.section_code, rec.chapter, rec.present_in_books);
  }
  
  // Switch to network and highlight if in network view
  if(activeTab === 'network') {
    const node = NET.nodes.find(n => n.chKey===chKey && n.recKey===recKey);
    if(node) { centerOnNode(node); }
  }
  renderTable();
}
