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
