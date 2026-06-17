const CANVAS_MAX_NODES = 400; // cap for performance

function buildNetworkData() {
  const canvas = document.getElementById('networkCanvas');
  // Ensure canvas sized before placing nodes so initial positions use actual viewport
  resizeNetCanvas();
  // Reset view so layout starts from a neutral, centered state
  NET.zoom = 1; NET.panX = 0; NET.panY = 0;
  const fr = filteredRecords().slice(0, CANVAS_MAX_NODES);
  const nodeKeys = new Set(fr.map(r=>r.chKey+':'+r.recKey));

  // Use canvas dimensions for initial placement (with safe margins)
  const W = Math.max(600, canvas.width);
  const H = Math.max(400, canvas.height);
  // Spread nodes in a loose radial distribution around canvas center to avoid linear clusters
  const N = fr.length || 1;
  const cx = W / 2, cy = H / 2;
  NET.nodes = fr.map((r, i) => {
    const angle = (i / N) * Math.PI * 2;
    const radius = 60 + Math.random() * (Math.min(W, H) / 3);
    return {
      key: r.chKey+':'+r.recKey,
      chKey: r.chKey,
      recKey: r.recKey,
      label: r.denomination_canonical || r.section_code,
      chapter: r.chapter,
      kind: r.kind,
      present_in_books: r.present_in_books,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      vx: 0, vy: 0,
      pinned: false,
      link_count: r.link_count,
    };
  });

  const nodeIndex = {};
  NET.nodes.forEach((n,i) => nodeIndex[n.key] = i);

  NET.edges = [];
  const seenEdge = new Set();
  
  // Determine which books are currently selected
  const activeBooks = filters.levels.has('_all4') ? ['A1','A2','B1','B2'] : Array.from(filters.levels);

  fr.forEach(r => {
    const tgtKey = r.chKey + ':' + r.recKey;
    const raw = r._raw;
    if(!raw) return;

    // Helper to process grouped incoming edges
    const addIncomingEdge = (edgeLevels, srcCh, srcKey, type) => {
      // Restrictive Edge Filtering: only show edge if it exists in one of the active filter levels
      if(activeBooks.length > 0) {
        const hasVisibleLevel = edgeLevels.some(l => activeBooks.includes(l));
        if(!hasVisibleLevel) return;
      }

      const fullSrcKey = 'ch' + srcCh + ':' + srcKey;
      
      // Both ends must be visible in the current network view
      if(nodeKeys.has(fullSrcKey)) {
        const edgeId = [fullSrcKey, tgtKey].sort().join('>>');
        if(!seenEdge.has(edgeId)) {
          seenEdge.add(edgeId);
          NET.edges.push({
            s: nodeIndex[fullSrcKey],
            t: nodeIndex[tgtKey],
            type: type,
            levels: edgeLevels
          });
        }
      }
    };

    // Helper to gather references from a per_book field
    const gatherLinks = (perBookField, defaultType) => {
      const field = raw[perBookField] || {};
      const grouped = {};
      
      for(const book of Object.keys(field)) {
        if(!field[book]) continue;
        field[book].forEach(link => {
          // Fallback through the 3 possible identifiers the guide mentions
          const sKey = link.source_row_id_canonical || link.source_concept_key || link.source_section_code;
          if(!sKey) return;
          const sCh = link.source_chapter;
          const sType = link.type || defaultType;
          
          const gKey = sCh + '::' + sKey + '::' + sType;
          if(!grouped[gKey]) grouped[gKey] = { sCh, sKey, sType, levels: new Set() };
          grouped[gKey].levels.add(book);
        });
      }
      
      for(const gKey in grouped) {
        const g = grouped[gKey];
        addIncomingEdge(Array.from(g.levels), g.sCh, g.sKey, g.sType);
      }
    };

    // Extract exact source keys from all 5 typed incoming fields
    gatherLinks('linked_from_per_book', 'link');
    gatherLinks('cefr_descriptors_pointing_to_this_per_book', 'cefr_xref');
    gatherLinks('orthography_rules_applying_to_this_per_book', 'ortho_xref');
    gatherLinks('sociocultural_notes_referencing_this_per_book', 'socio_xref');
    gatherLinks('learner_strategies_referencing_this_per_book', 'strategy_xref');

    // Also extract outgoing links to ensure nothing is missed
    const gatherOutgoingLinks = (perBookField, defaultType) => {
      const field = raw[perBookField] || {};
      const grouped = {};
      for(const book of Object.keys(field)) {
        if(!field[book]) continue;
        field[book].forEach(link => {
          const tKey = link.target_row_id_canonical || link.target_concept_key || link.target_section_code;
          if(!tKey) return;
          const tCh = link.target_chapter;
          const tType = link.type || defaultType;
          const gKey = tCh + '::' + tKey + '::' + tType;
          if(!grouped[gKey]) grouped[gKey] = { tCh, tKey, tType, levels: new Set() };
          grouped[gKey].levels.add(book);
        });
      }
      for(const gKey in grouped) {
        const g = grouped[gKey];
        // Swapping target as source to reuse the addIncomingEdge logic
        addIncomingEdge(Array.from(g.levels), g.tCh, g.tKey, g.tType);
      }
    };
    gatherOutgoingLinks('links_to_concepts_per_book', 'link');
  });

  // Build legend
  buildNetLegend();
  resizeNetCanvas();
  runLayout();
}

function buildNetLegend() {
  const el = document.getElementById('netLegend');
  if(el) {
    el.innerHTML = Object.entries(CHAPTER_COLOR).map(([ch,c])=>`
      <div class="legend-item">
        <div class="legend-dot" style="background:${c}"></div>
        <span>${ch}</span>
      </div>`).join('');
  }
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
    // Cool down the layout smoothly over 200 iterations, stopping entirely at 0
    let temp = Math.max(0, 1 - (iter / 200));
    forceStep(temp);
    redrawNet();
    iter++;
    // Keep running if we're dragging (to animate the dragged node) or if still decaying
    if(iter < 200 || NET.dragging) {
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

function updateCharge() { runLayout(); }

function forceStep(temp = 1) {
  const nodes = NET.nodes;
  const edges = NET.edges;
  const charge = parseFloat(document.getElementById('chargeRange')?.value || 80);
  const canvas = document.getElementById('networkCanvas');
  const W = canvas.width, H = canvas.height;

  const nodeSize = parseFloat(document.getElementById('nodeSizeRange')?.value || 10);

  // Repulsion & Collision
  for(let i=0;i<nodes.length;i++) {
    const r_i = nodeSize; // Equal size
    for(let j=i+1;j<nodes.length;j++) {
      let dx = nodes[j].x - nodes[i].x;
      let dy = nodes[j].y - nodes[i].y;
      let dist = Math.sqrt(dx*dx+dy*dy) || 1;
      
      const r_j = nodeSize; // Equal size
      const min_dist = r_i + r_j + 15; // 15px padding between nodes to spread them

      // Hard collision avoidance
      if(dist < min_dist) {
        let overlap = min_dist - dist;
        let pushX = (dx/dist) * overlap * 0.5 * temp;
        let pushY = (dy/dist) * overlap * 0.5 * temp;
        
        // Nudge positions directly to prevent overlap
        nodes[i].x -= pushX; nodes[i].y -= pushY;
        nodes[j].x += pushX; nodes[j].y += pushY;
        
        // Re-calculate dist for the repulsion force
        dx = nodes[j].x - nodes[i].x;
        dy = nodes[j].y - nodes[i].y;
        dist = Math.sqrt(dx*dx+dy*dy) || 1;
      }

      // Base inverse-square repulsion
      let force = (charge) / (dist*dist + 0.01);
      const REP_SCALE = 0.08;
      nodes[i].vx -= (dx/dist)*force*REP_SCALE;
      nodes[i].vy -= (dy/dist)*force*REP_SCALE;
      nodes[j].vx += (dx/dist)*force*REP_SCALE;
      nodes[j].vy += (dy/dist)*force*REP_SCALE;
    }
  }
  // Attraction along edges
  edges.forEach(e => {
    const a = nodes[e.s], b = nodes[e.t];
    if(!a||!b) return;
    let dx = b.x-a.x, dy = b.y-a.y;
    let dist = Math.sqrt(dx*dx+dy*dy)||1;
    const REST_LEN = 160; // Spread edges further
    let force = (dist - REST_LEN) * 0.005;
    a.vx += (dx/dist)*force;
    a.vy += (dy/dist)*force;
    b.vx -= (dx/dist)*force;
    b.vy -= (dy/dist)*force;
  });
  // Center gravity
  const cx = W/2, cy = H/2;
  nodes.forEach(n => {
    n.vx += (cx-n.x)*0.01;
    n.vy += (cy-n.y)*0.01;
  });
  // Apply with temperature-based damping to freeze the layout gradually
  nodes.forEach(n => {
    if(n.pinned) return;
    n.vx *= 0.7 * temp; n.vy *= 0.7 * temp;
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

  // Pre-calculate hover highlights and selection neighbors
  let hovNodes = new Set();
  let hovEdges = new Set();
  let selNeighbors = new Set();

  if(NET.hovered && pathHighlight.size === 0) {
    hovNodes.add(NET.hovered.key);
    edges.forEach((e, i) => {
      const a = nodes[e.s], b = nodes[e.t];
      if(a === NET.hovered) { hovNodes.add(b.key); hovEdges.add(i); }
      if(b === NET.hovered) { hovNodes.add(a.key); hovEdges.add(i); }
    });
  }

  if(NET.selected) {
    edges.forEach((e) => {
      const a = nodes[e.s], b = nodes[e.t];
      if(a.key === NET.selected) selNeighbors.add(b.key);
      if(b.key === NET.selected) selNeighbors.add(a.key);
    });
  }

  // Edges — individually stroked for distinct styling
  if(showEdges) {
    edges.forEach((e, i) => {
      const a = nodes[e.s], b = nodes[e.t];
      if(!a||!b) return;
      
      const onPath = pathHighlight.size > 0 && pathHighlight.has(a.key) && pathHighlight.has(b.key);
      const isHovEdge = hovEdges.has(i);
      const isSelEdge = NET.selected && (a.key === NET.selected || b.key === NET.selected);

      ctx.beginPath();
      if(onPath) {
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 4.0 / zoom;
        ctx.globalAlpha = 1;
      } else if (isHovEdge) {
        ctx.strokeStyle = '#3b6fd4';
        ctx.lineWidth = 3.0 / zoom;
        ctx.globalAlpha = 0.9;
      } else if (isSelEdge) {
        ctx.strokeStyle = '#192233';
        ctx.lineWidth = 3.5 / zoom;
        ctx.globalAlpha = 0.85;
      } else {
        ctx.strokeStyle = 'rgba(148,163,184,0.7)';
        ctx.lineWidth = 2.5 / zoom;
        let alpha = 1;
        if (pathHighlight.size > 0) alpha = 0.1;
        else if (NET.selected) alpha = 0.1;
        ctx.globalAlpha = alpha;
      }
      
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  // Nodes — solid colors, crisp rendering (no shadows/gradients)
  nodes.forEach(n => {
    const isSel = NET.selected === n.key;
    const isHov = NET.hovered === n;
    const onPath = pathHighlight.has(n.key);
    const isPathSel = (pathFrom===n.key || pathTo===n.key);
    const isHovNode = hovNodes.has(n.key);
    const chColor = CHAPTER_COLOR['ch'+n.chapter] || '#94a3b8';
    const r = nodeSize;

    let dimmed = false;
    if (pathHighlight.size > 0) dimmed = !onPath;
    else if (NET.selected) dimmed = !isSel && !selNeighbors.has(n.key);

    ctx.globalAlpha = dimmed ? 0.12 : 1;

    // Solid fill
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI*2);
    ctx.fillStyle = chColor;
    ctx.fill();
    
    // Crisp border
    ctx.lineWidth = isSel ? 3 : 1.5;
    ctx.strokeStyle = isSel ? '#192233' : '#ffffff';
    ctx.stroke();

    // Extra highlight for hover/path selection
    if(isPathSel || (isSel && pathMode)) {
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.5 / zoom;
      ctx.stroke();
    } else if(isHov) {
      ctx.strokeStyle = '#192233';
      ctx.lineWidth = 2.0 / zoom;
      ctx.stroke();
    } else if(n.kind === 'family') {
      ctx.strokeStyle = 'rgba(26,24,20,0.15)';
      ctx.lineWidth = 1.2 / zoom;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Level indicator dashes
    const visibleLevels = n.present_in_books.filter(l => filters.levels.has(l));
    if(visibleLevels.length > 0 && !dimmed) {
      const dashW = 6;
      const gap = 3;
      const totalW = (visibleLevels.length * dashW) + ((visibleLevels.length - 1) * gap);
      let startX = n.x - totalW/2;
      visibleLevels.forEach((l) => {
        ctx.fillStyle = LEVEL_COLOR[l];
        ctx.fillRect(startX, n.y + r + 5, dashW, 3);
        startX += dashW + gap;
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
  } else if (!hit && !pathMode) {
    resetNetworkView();
  }
});

function resetNetworkView() {
  NET.selected = null;
  pathFrom = null;
  pathTo = null;
  pathHighlight.clear();
  document.getElementById('panel').classList.remove('open');
  redrawNet();
}
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
    const r = nodeSize;
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
