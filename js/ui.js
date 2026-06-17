function showNodeInfo(rec, rawC) {
  if(!rec || !rawC) return;
  const panel = document.getElementById('detail');
  panel.classList.add('show');

  let html = '';

  // Tags
  html += `<div class="tags">`;
  html += `<span class="tag" style="background:${CHAPTER_COLOR['ch'+rec.chapter]}33;color:${CHAPTER_COLOR['ch'+rec.chapter]}">${CHAPTER_TITLES['ch'+rec.chapter]||'Ch '+rec.chapter}</span>`;
  rec.present_in_books.forEach(l => {
    html += `<span class="tag" style="background:${LEVEL_COLOR[l]}33;color:${LEVEL_COLOR[l]}">${l}</span>`;
  });
  if(rec.anyAsterisk) html += `<span class="tag">⭐ asterisked</span>`;
  html += `</div>`;

  // Title
  html += `<h3>${rec.denomination_canonical || '—'}</h3>`;

  // Meta
  html += `<div class="meta"><span>§ ${rec.section_code}</span> <span class="sep">•</span> <span>${rec.kind}</span> <span class="sep">•</span> <span>${rec.link_count} links</span></div>`;

  // Summary (Realisations)
  const rPerBook = rawC.realisations_per_book || rawC.realisations_by_pos_per_book;
  if(rPerBook && Object.values(rPerBook).some(v=>v)) {
    let exStr = [];
    LEVELS.forEach(l => {
      const items = rawC.realisations_per_book?.[l];
      if(items && items.length) {
         exStr.push(items.slice(0,3).map(it => it.text).join(', '));
      }
    });
    if(exStr.length) {
      html += `<div class="sum"><strong>Examples:</strong> ${exStr.join(', ')}</div>`;
    }
  }

  // Family Info
  if(rec.family_denomination_canonical) {
    html += `<h4>Family</h4><div style="font-size:12.5px;color:var(--ink);margin-bottom:12px">${rec.family_denomination_canonical}</div>`;
  }

  // Connections out
  const linksAll = rawC.links_to_concepts_per_book || {};
  const allLinksOut = Object.entries(linksAll).flatMap(([lvl,arr])=>(arr||[]).map(lk=>({...lk,level:lvl})));
  const uniqueLinks = [];
  const seenLinkKeys = new Set();
  allLinksOut.forEach(lk => { 
    const k = lk.target_concept_key || lk.source_concept_key || lk.target; 
    if(k && !seenLinkKeys.has(k)){seenLinkKeys.add(k);uniqueLinks.push(lk);} 
  });
  if(uniqueLinks.length) {
    html += `<h4>Links To <span class="badge">${uniqueLinks.length}</span></h4>`;
    uniqueLinks.slice(0,8).forEach(lk => {
      const targetKey = lk.target_concept_key || lk.source_concept_key || lk.target || '';
      const targetChBucket = lk.target_chN_bucket || lk.source_chN_bucket || ('ch'+(lk.target_chapter||lk.source_chapter||''));
      const targetRec = RECORDS.find(r=>r.chKey===targetChBucket && r.recKey===targetKey);
      const name = targetRec?.denomination_canonical || targetKey;
      html += `<div class="nb" onclick="selectRecord('${targetChBucket}','${escKey(targetKey)}')">
        <span class="code">${targetRec?.section_code||''}</span>
        <span class="dot" style="background:${CHAPTER_COLOR[targetChBucket]||'#ccc'}"></span>
        <span class="nm">${name}</span>
        <span class="pill hier">${lk.type||''}</span>
      </div>`;
    });
  }

  // Connections in
  const linkedFromAll = rawC.linked_from_per_book || {};
  const allLinksIn = Object.entries(linkedFromAll).flatMap(([lvl,arr])=>(arr||[]).map(lk=>({...lk,level:lvl})));
  const uniqueLinksIn = [];
  const seenIn = new Set();
  allLinksIn.forEach(lk => { 
    const k = lk.source_concept_key || lk.target_concept_key || lk.source; 
    if(k && !seenIn.has(k)){seenIn.add(k);uniqueLinksIn.push(lk);} 
  });
  if(uniqueLinksIn.length) {
    html += `<h4>Linked From <span class="badge">${uniqueLinksIn.length}</span></h4>`;
    uniqueLinksIn.slice(0,8).forEach(lk => {
      const sourceKey = lk.source_concept_key || lk.target_concept_key || lk.source || '';
      const sourceChBucket = lk.source_chN_bucket || lk.target_chN_bucket || ('ch'+(lk.source_chapter||lk.target_chapter||''));
      const sourceRec = RECORDS.find(r=>r.chKey===sourceChBucket && r.recKey===sourceKey);
      const name = sourceRec?.denomination_canonical || sourceKey;
      html += `<div class="nb" onclick="selectRecord('${sourceChBucket}','${escKey(sourceKey)}')">
        <span class="code">${sourceRec?.section_code||''}</span>
        <span class="dot" style="background:${CHAPTER_COLOR[sourceChBucket]||'#ccc'}"></span>
        <span class="nm">${name}</span>
        <span class="pill xref">${lk.type||''}</span>
      </div>`;
    });
  }

  // CEFR back-refs
  const cefrRefs = rawC.cefr_descriptors_pointing_to_this_per_book || {};
  const allCefr = Object.entries(cefrRefs).flatMap(([l,arr])=>(arr||[]).map(r=>({...r,level:l})));
  if(allCefr.length) {
    html += `<h4>CEFR Descriptors <span class="badge">${allCefr.length}</span></h4>`;
    allCefr.slice(0,4).forEach(cr => {
      const ch2c = ROOT.concepts.ch2?.[cr.source_row_id_canonical];
      const descText = ch2c ? (ch2c.descriptor_text_per_book?.[cr.level] || '') : '';
      html += `<div style="border:1px solid var(--line);border-radius:6px;padding:8px;margin-bottom:6px;font-size:11.5px;">
        <span class="level-badge" style="background:${LEVEL_COLOR[cr.level]};margin-right:6px;padding:2px 6px;border-radius:4px;color:#fff">${cr.level}</span>
        ${cr.criterion_label ? `<strong>${cr.criterion_label}</strong><br>` : ''}
        ${descText ? `<span style="color:var(--muted)">${descText.slice(0,120)}${descText.length>120?'…':''}</span>` : ''}
      </div>`;
    });
  }

  html += `<div style="margin-top:16px;display:flex;gap:8px;">
    <button class="b" onclick="setCurrentAsPathFrom()">Set as FROM</button>
    <button class="b" onclick="setCurrentAsPathTo()">Set as TO</button>
  </div>`;

  document.getElementById('detailBody').innerHTML = html;
}

function closeNodeInfo() {
  document.getElementById('detail').classList.remove('show');
  NET.selected = null;
  renderTable();
}
