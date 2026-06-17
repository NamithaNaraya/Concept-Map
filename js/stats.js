function buildStatsView() {
  const fr = filteredRecords();
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

  let html = "";
  html += '<h2 style="font-size:20px;margin-bottom:16px">Corpus Statistics</h2>';
  html += '<div class="stats-grid">';
  html += '  <div class="stat-card"><div class="sc-value" style="color:var(--accent)">' + fr.length + '</div><div class="sc-label">Total Concepts</div></div>';
  html += '  <div class="stat-card"><div class="sc-value" style="color:var(--accent2)">9</div><div class="sc-label">Chapters</div></div>';
  html += '  <div class="stat-card"><div class="sc-value">' + all4 + '</div><div class="sc-label">In all 4 levels (' + (all4/fr.length*100).toFixed(0) + '%)</div></div>';
  html += '  <div class="stat-card"><div class="sc-value" style="color:#b07a20">' + asterisked + '</div><div class="sc-label">Asterisked (' + (asterisked/fr.length*100).toFixed(1) + '%)</div></div>';
  html += '  <div class="stat-card"><div class="sc-value">' + hasLinks + '</div><div class="sc-label">Have links (' + (hasLinks/fr.length*100).toFixed(0) + '%)</div></div>';
  html += '  <div class="stat-card"><div class="sc-value" style="color:var(--accent2)">' + (ROOT.cross_chapter_links||[]).length + '</div><div class="sc-label">Cross-chapter links</div></div>';
  html += '</div>';

  html += '<div class="chart-block">';
  html += '  <h3>Concepts by Chapter</h3>';
  html += '  <div class="bar-chart">';
  Object.entries(byChapter).sort((a,b)=>b[1]-a[1]).forEach(([ch,cnt]) => {
    html += '    <div class="bar-row">';
    html += '      <div class="bar-label">' + (CHAPTER_TITLES[ch]||ch) + '</div>';
    html += '      <div class="bar-track">';
    html += '        <div class="bar-fill" style="width:' + (cnt/maxCh*100).toFixed(1) + '%;background:' + CHAPTER_COLOR[ch] + '">';
    html += '          ' + (cnt > maxCh*0.15 ? cnt : '');
    html += '        </div>';
    html += '      </div>';
    html += '      <div class="bar-count">' + cnt + '</div>';
    html += '    </div>';
  });
  html += '  </div>';
  html += '</div>';

  html += '<div class="chart-block">';
  html += '  <h3>Concepts by CEFR Level (concepts present at that level)</h3>';
  html += '  <div class="bar-chart">';
  LEVELS.forEach(l => {
    html += '    <div class="bar-row">';
    html += '      <div class="bar-label">' + l + '</div>';
    html += '      <div class="bar-track">';
    html += '        <div class="bar-fill" style="width:' + (byLevel[l]/maxLv*100).toFixed(1) + '%;background:' + LEVEL_COLOR[l] + '">' + byLevel[l] + '</div>';
    html += '      </div>';
    html += '      <div class="bar-count">' + byLevel[l] + '</div>';
    html += '    </div>';
  });
  html += '  </div>';
  html += '</div>';

  html += '<div class="chart-block">';
  html += '  <h3>Density Heatmap (Chapters vs Levels)</h3>';
  html += '  <table class="heatmap-table" style="width:100%; border-collapse: collapse; margin-top: 10px;">';
  html += '    <thead>';
  html += '      <tr>';
  html += '        <th style="text-align:left; padding: 8px; border-bottom: 2px solid var(--border);">Chapter</th>';
  LEVELS.forEach(l => {
    html += '        <th style="text-align:center; padding: 8px; border-bottom: 2px solid var(--border);">' + l + '</th>';
  });
  html += '      </tr>';
  html += '    </thead>';
  html += '    <tbody>';
  Object.keys(CHAPTER_TITLES).forEach(ch => {
    html += '      <tr>';
    html += '        <td style="padding: 8px; font-weight: 500; font-size: 13px; border-bottom: 1px solid var(--border);">' + CHAPTER_TITLES[ch] + '</td>';
    LEVELS.forEach(l => {
      let val = 0;
      fr.forEach(r => { if('ch'+r.chapter === ch && r.present_in_books.includes(l)) val++; });
      const intensity = Math.max(0.05, Math.min(1, val / 40)); 
      const bgColor = "rgba(59, 111, 212, " + intensity + ")";
      const textColor = intensity > 0.6 ? "#fff" : "var(--fg)";
      html += '        <td style="padding: 8px; text-align: center; background-color: ' + bgColor + '; color: ' + textColor + '; border: 1px solid var(--border); font-size: 13px;">';
      html += '          ' + (val > 0 ? val : '-');
      html += '        </td>';
    });
    html += '      </tr>';
  });
  html += '    </tbody>';
  html += '  </table>';
  html += '</div>';

  html += '<div class="chart-block">';
  html += '  <h3>Concepts by Kind</h3>';
  html += '  <div class="bar-chart">';
  Object.entries(byKind).sort((a,b)=>b[1]-a[1]).forEach(([kind,cnt]) => {
    html += '    <div class="bar-row">';
    html += '      <div class="bar-label">' + kind + '</div>';
    html += '      <div class="bar-track">';
    html += '        <div class="bar-fill" style="width:' + (cnt/fr.length*100).toFixed(1) + '%;background:' + (KIND_COLOR[kind]||'#888') + '">' + cnt + '</div>';
    html += '      </div>';
    html += '      <div class="bar-count">' + cnt + '</div>';
    html += '    </div>';
  });
  html += '  </div>';
  html += '</div>';

  html += '<div class="chart-block">';
  html += '  <h3>Link Type Distribution (cross_chapter_links)</h3>';
  html += '  <div class="bar-chart">';
  Object.entries(
    (ROOT.cross_chapter_links||[]).reduce((acc,lk)=>{acc[lk.type]=(acc[lk.type]||0)+1;return acc;},{})
  ).sort((a,b)=>b[1]-a[1]).forEach(([type,cnt]) => {
    html += '    <div class="bar-row">';
    html += '      <div class="bar-label">' + type + '</div>';
    html += '      <div class="bar-track"><div class="bar-fill" style="width:' + (cnt/1408*100).toFixed(1) + '%;background:var(--accent2)">' + cnt + '</div></div>';
    html += '      <div class="bar-count">' + cnt + '</div>';
    html += '    </div>';
  });
  html += '  </div>';
  html += '</div>';

  
  const notes = ROOT.lesson_gen_notes;
  if(notes) {
    html += '<div class="chart-block" style="margin-top:30px;">';
    html += '  <h3 style="font-size:18px; margin-bottom:12px;">Dataset Metadata & Lesson Gen Notes</h3>';
    html += '  <div style="font-size:13px; line-height:1.6; color:var(--ink-2);">';
    
    if(notes.purpose) html += `<div style="margin-bottom:12px;"><strong>Purpose:</strong> ${notes.purpose}</div>`;
    if(notes.derived_from) html += `<div style="margin-bottom:12px;"><strong>Derived From:</strong> ${notes.derived_from}</div>`;
    if(notes.how_to_use) html += `<div style="margin-bottom:12px;"><strong>How to use:</strong> ${notes.how_to_use}</div>`;
    
    if(notes.added_vs_pedagogical_view) {
        html += `<div style="margin-bottom:12px;"><strong>Added vs Pedagogical View:</strong><ul style="padding-left:20px; margin-top:4px;">`;
        notes.added_vs_pedagogical_view.forEach(item => html += `<li>${item}</li>`);
        html += `</ul></div>`;
    }
    
    if(notes.kept_stripped_QA) {
        html += `<div style="margin-bottom:12px;"><strong>Kept Stripped QA Fields:</strong><div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:4px;">`;
        notes.kept_stripped_QA.forEach(item => html += `<span class="tag" style="background:var(--panel-3); border:1px solid var(--border);">${item}</span>`);
        html += `</div></div>`;
    }
    
    if(notes.deattribution_v2) {
        html += `<div style="margin-bottom:12px;"><strong>Deattribution v2:</strong><ul style="padding-left:20px; margin-top:4px;">`;
        notes.deattribution_v2.forEach(item => html += `<li>${item}</li>`);
        html += `</ul></div>`;
    }
    
    html += '  </div>';
    html += '</div>';
  }

  document.getElementById('statsContent').innerHTML = html;
}

