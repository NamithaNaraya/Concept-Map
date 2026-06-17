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
