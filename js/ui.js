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
      let items = rawC.realisations_per_book?.[l];
      if (!items && rawC.realisations_by_pos_per_book?.[l]) {
          items = [];
          Object.entries(rawC.realisations_by_pos_per_book[l]).forEach(([pos, words]) => {
              words.forEach(w => items.push({ text: w, pos: pos }));
          });
      }
      
      if(items && items.length) {
         const wordsHtml = items.map(it => {
            let tooltip = [];
            if(it.pos) tooltip.push("Part of Speech: " + it.pos);
            if(it.schema_codes_used && it.schema_codes_used.length) tooltip.push("Schema: " + it.schema_codes_used.join(', '));
            if(it.notes) tooltip.push("Notes: " + it.notes);
            
            const titleAttr = tooltip.length ? ` title="${tooltip.join(' | ').replace(/"/g, '&quot;')}"` : '';
            const cursor = tooltip.length ? 'cursor:help;' : '';
            
            return `<span style="display:inline-block; padding:2px 6px; background:var(--panel-3); border:1px solid var(--line); border-radius:4px; margin:2px 2px 2px 0; ${cursor}"${titleAttr}>${it.text}</span>`;
         }).join('');
         exStr.push(`<div style="margin-top:6px;"><strong>${l}:</strong> ${wordsHtml}</div>`);
      }
    });
    if(exStr.length) {
      html += `<div class="sum" style="padding:12px;"><strong>Vocabulary / Realisations:</strong><br>${exStr.join('')}</div>`;
    }
  }

  // Level Breakdown
  const denoms = rawC.denominations_per_book || {};
  const pages = rawC.page_ref_per_book || {};
  if (Object.keys(denoms).some(k => denoms[k]) || Object.keys(pages).some(k => pages[k])) {
    html += `<h4>Level Breakdown</h4>`;
    ['A1','A2','B1','B2'].forEach(l => {
      const d = denoms[l];
      const p = pages[l];
      if (d || p) {
        html += `<div style="border:1px solid var(--line);border-radius:6px;padding:8px;margin-bottom:6px;font-size:12px;">`;
        html += `<span class="level-badge" style="background:${LEVEL_COLOR[l]};margin-right:8px;padding:2px 6px;border-radius:4px;color:#fff">${l}</span>`;
        if (d) html += `<strong>${d}</strong> `;
        if (p) html += `<span style="color:var(--muted)">(Page ${p})</span>`;
        html += `</div>`;
      }
    });
  }

  // Family Info
  if(rec.family_denomination_canonical) {
    html += `<h4>Family</h4><div style="font-size:12.5px;color:var(--ink);margin-bottom:12px">${rec.family_denomination_canonical}</div>`;
  }

  // Outgoing Links
  if(rec.links_out && rec.links_out.length) {
    html += `<h4>Points to <span class="badge">${rec.links_out.length}</span></h4>`;
    rec.links_out.slice(0,4).forEach(lk => {
      const targetRec = RECORDS.find(r=>r.chKey===lk.target_chapter && r.recKey===lk.target_concept_key);
      const name = targetRec ? targetRec.denomination_canonical : lk.target_concept_key;
      html += `<div class="nb" onclick="centerAndSelectNode('${lk.target_chapter}:${lk.target_concept_key}')">
        <span class="code">${targetRec?.section_code||''}</span>
        <span class="dot" style="background:${CHAPTER_COLOR[lk.target_chapter]||'#ccc'}"></span>
        <span class="nm">${name}</span>
        <span class="pill xref">${lk.type||''}</span>
      </div>`;
    });
  }

  // Incoming Links
  if(rec.links_in && rec.links_in.length) {
    html += `<h4>Referenced by <span class="badge">${rec.links_in.length}</span></h4>`;
    rec.links_in.slice(0,4).forEach(lk => {
      let sourceChBucket = lk.source_chapter;
      if (!sourceChBucket.startsWith('ch')) sourceChBucket = 'ch'+sourceChBucket;
      const sourceRec = RECORDS.find(r=>r.chKey===sourceChBucket && r.recKey===lk.source_concept_key);
      const name = sourceRec ? sourceRec.denomination_canonical : lk.source_concept_key;
      html += `<div class="nb" onclick="centerAndSelectNode('${sourceChBucket}:${lk.source_concept_key}')">
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

  // PATH FROM AND PATH TO BUTTONS REMOVED HERE

  const detailBody = document.getElementById('detailBody');
  detailBody.style.display = 'block';
  detailBody.innerHTML = html;
}

function closeNodeInfo() {
  document.getElementById('detail').classList.remove('show');
  NET.selected = null;
  renderTable();
}

function showAggregateNodeInfo(hit) {
  const panel = document.getElementById('detail');
  panel.classList.add('show');
  
  let html = '';
  html += '<div style="flex-shrink:0;">';
  html += '<div class="tags">';
  if(hit.chapter) html += '<span class="tag" style="background:' + CHAPTER_COLOR['ch'+hit.chapter] + '33;color:' + CHAPTER_COLOR['ch'+hit.chapter] + '">' + (CHAPTER_TITLES['ch'+hit.chapter]||'Ch '+hit.chapter) + '</span>';
  (hit.present_in_books||[]).forEach(l => {
    html += '<span class="tag" style="background:' + LEVEL_COLOR[l] + '33;color:' + LEVEL_COLOR[l] + '">' + l + '</span>';
  });
  html += '</div>';

  html += '<h3>' + hit.label + '</h3>';
  html += '<div class="meta"><span>' + networkNodeType.toUpperCase() + '</span> <span class="sep">•</span> <span>' + (hit.link_count || 0) + ' links</span></div>';
  html += '</div>';

  if (networkNodeType === 'chapter') {
     const summary = ROOT.chapter_summaries && ROOT.chapter_summaries['ch'+hit.chapter];
     if (summary) {
        html += '<h4 style="flex-shrink:0;">Chapter Summary Metadata</h4>';
        html += '<div style="flex-shrink:0; font-size:11.5px; background:var(--panel-2); padding:12px; border-radius:8px; border:1px solid var(--line); margin-bottom:12px; overflow-y:auto; max-height:200px;">';
        if(summary.title_canonical) html += `<div style="margin-bottom:8px;"><strong>Canonical Title:</strong> ${summary.title_canonical}</div>`;
        
        if(summary.title_per_book) {
            html += `<div style="margin-bottom:8px;"><strong>Titles per Book:</strong><ul style="margin:4px 0; padding-left:16px;">`;
            Object.entries(summary.title_per_book).forEach(([bk, title]) => {
                if(title) html += `<li><strong>${bk}:</strong> ${title}</li>`;
            });
            html += `</ul></div>`;
        }
        if(summary.distinct_section_codes_per_book) {
            html += `<div style="margin-bottom:8px;"><strong>Distinct Sections:</strong> `;
            Object.entries(summary.distinct_section_codes_per_book).forEach(([bk, cnt]) => {
                if(cnt) html += `<span class="tag" style="background:${LEVEL_COLOR[bk]}33;color:${LEVEL_COLOR[bk]};">${bk}: ${cnt}</span> `;
            });
            html += `</div>`;
        }
        if(summary.pointed_chapters_inventory_per_book) {
            html += `<div style="margin-bottom:8px;"><strong>Pointed Chapters:</strong> `;
            Object.entries(summary.pointed_chapters_inventory_per_book).forEach(([bk, targets]) => {
                if(targets && targets.length) html += `<span class="tag" style="background:${LEVEL_COLOR[bk]}33;color:${LEVEL_COLOR[bk]};">${bk}: ${targets.join(',')}</span> `;
            });
            html += `</div>`;
        }
        if(summary.heading_style_for_1_3_x_per_book) {
            html += `<div style="margin-bottom:8px;"><strong>Heading Styles:</strong> `;
            Object.entries(summary.heading_style_for_1_3_x_per_book).forEach(([bk, style]) => {
                if(style) html += `<span class="tag" style="background:${LEVEL_COLOR[bk]}33;color:${LEVEL_COLOR[bk]};">${bk}: ${style}</span> `;
            });
            html += `</div>`;
        }
        html += '</div>';
     }

     const conceptsInCh = RECORDS.filter(r => r.chapter === hit.chapter);
     html += '<h4 style="flex-shrink:0;">Concepts in Chapter: ' + conceptsInCh.length + '</h4>';
     html += '<input type="text" id="aggSearch" placeholder="Search concepts..." oninput="filterAggList(this.value)" style="width:100%; padding:8px; border:1px solid var(--border); border-radius:6px; margin-bottom:10px; flex-shrink:0;">';
     
     html += '<div style="flex:1; overflow-y:auto; padding-right:5px;">';
     html += '<table style="width:100%; border-collapse:collapse; font-size:12.5px;">';
     html += '<thead style="position:sticky; top:0; background:var(--panel); z-index:1;"><tr><th style="text-align:left; padding:8px; border-bottom:1px solid var(--border);">Code</th><th style="text-align:left; padding:8px; border-bottom:1px solid var(--border);">Name</th></tr></thead>';
     html += '<tbody id="aggListBody">';
     conceptsInCh.forEach(r => {
        html += '<tr class="agg-item" style="border-bottom:1px solid var(--line-2);">';
        html += '  <td style="padding:8px; color:var(--faint);">' + r.section_code + '</td>';
        html += '  <td class="agg-name" style="padding:8px;">' + r.denomination_canonical + '</td>';
        html += '</tr>';
     });
     html += '</tbody></table></div>';

  } else if (networkNodeType === 'level') {
     const conceptsInLvl = RECORDS.filter(r => r.present_in_books.includes(hit.key));
     html += '<h4 style="flex-shrink:0;">Concepts at Level: ' + conceptsInLvl.length + '</h4>';
     html += '<input type="text" id="aggSearch" placeholder="Search by chapter..." oninput="filterAggList(this.value)" style="width:100%; padding:8px; border:1px solid var(--border); border-radius:6px; margin-bottom:10px; flex-shrink:0;">';
     
     html += '<div style="flex:1; overflow-y:auto; padding-right:5px;">';
     const byCh = {};
     conceptsInLvl.forEach(r => { byCh[r.chapter] = (byCh[r.chapter]||0)+1; });
     html += '<table style="width:100%; border-collapse:collapse; font-size:12.5px;">';
     html += '<thead style="position:sticky; top:0; background:var(--panel); z-index:1;"><tr><th style="text-align:left; padding:8px; border-bottom:1px solid var(--border);">Chapter</th><th style="text-align:right; padding:8px; border-bottom:1px solid var(--border);">Count</th></tr></thead>';
     html += '<tbody id="aggListBody">';
     Object.entries(byCh).forEach(([ch, cnt]) => {
        html += '<tr class="agg-item" style="border-bottom:1px solid var(--line-2);">';
        html += '  <td class="agg-name" style="padding:8px; display:flex; align-items:center; gap:8px;">';
        html += '    <span style="width:10px; height:10px; border-radius:50%; background:' + CHAPTER_COLOR['ch'+ch] + '"></span>';
        html += '    ' + CHAPTER_TITLES['ch'+ch];
        html += '  </td>';
        html += '  <td style="padding:8px; text-align:right; font-weight:600;">' + cnt + '</td>';
        html += '</tr>';
     });
     html += '</tbody></table></div>';
     
  } else if (networkNodeType === 'word') {
     const [chKey, recKey] = hit.parentKey.split(':');
     const rec = RECORDS.find(r=>r.chKey===chKey && r.recKey===recKey);
     if (rec) {
         html += '<h4 style="flex-shrink:0;">Source Concept</h4>';
         html += '<div style="padding:16px; border:1px solid var(--border); border-radius:8px; background:var(--panel-2); flex-shrink:0;">';
         html += '  <div style="font-size:11px; color:var(--muted); margin-bottom:4px;">' + rec.section_code + '</div>';
         html += '  <div style="font-size:14px; font-weight:600; margin-bottom:12px; display:flex; align-items:center; gap:8px;">';
         html += '    <span style="width:12px; height:12px; border-radius:50%; background:' + (CHAPTER_COLOR[rec.chKey]||'#ccc') + '"></span>';
         html += '    ' + rec.denomination_canonical;
         html += '  </div>';
         html += '  <div style="font-size:12.5px; margin-bottom:6px;"><strong>Kind:</strong> ' + rec.kind + '</div>';
         html += '  <div style="font-size:12.5px;"><strong>Family:</strong> ' + (rec.family_denomination_canonical||'None') + '</div>';
         html += '</div>';
     }
  }

  const detailBody = document.getElementById('detailBody');
  detailBody.style.display = 'flex';
  detailBody.style.flexDirection = 'column';
  detailBody.style.height = '100%';
  detailBody.innerHTML = html;
}

window.filterAggList = function(q) {
  const query = q.toLowerCase();
  const rows = document.querySelectorAll('#aggListBody .agg-item');
  rows.forEach(r => {
    const text = r.querySelector('.agg-name').innerText.toLowerCase();
    if(text.includes(query)) r.style.display = '';
    else r.style.display = 'none';
  });
};

