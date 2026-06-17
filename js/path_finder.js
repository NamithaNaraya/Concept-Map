function setPathMode(mode) {
  pathMode = mode;
  netCanvas.style.cursor = 'crosshair';
  notify(`Click a node to set as ${mode.toUpperCase()}`);
  document.getElementById('path'+(mode==='from'?'From':'To')+'Btn').classList.add('set');
}

function assignPathNode(node) {
  if(pathMode === 'from') {
    pathFrom = node.key;
    document.getElementById('pathFromLabel')?.insertAdjacentText('afterbegin', (node.label||node.recKey).slice(0,30)); // just a placeholder since we can't use optional chaining for assignment easily
    // Better way:
    const pfLabel = document.getElementById('pathFromLabel'); if(pfLabel) pfLabel.textContent = (node.label||node.recKey).slice(0,30);
    document.getElementById('pathFromBtn')?.classList.add('set');
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
  const lbl = document.getElementById('pathFromLabel'); if(lbl) lbl.textContent = (node?.label||NET.selected).slice(0,30);
  const btn = document.getElementById('pathFromBtn'); if(btn) btn.classList.add('set');
  notify('Set as path FROM');
}
function setCurrentAsPathTo() {
  if(!NET.selected) return;
  pathTo = NET.selected;
  const node = NET.nodes.find(n=>n.key===NET.selected);
  const lbl = document.getElementById('pathToLabel'); if(lbl) lbl.textContent = (node?.label||NET.selected).slice(0,30);
  const btn = document.getElementById('pathToBtn'); if(btn) btn.classList.add('set');
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
  if(resultEl) resultEl.style.display = 'block';

  if(!found) {
    if(resultEl) resultEl.innerHTML = `<div style="color:var(--muted);text-align:center;padding:12px;">No path found between these nodes in the current view.<br><small>Try loading more nodes or adjusting filters.</small></div>`;
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
  if(resultEl) resultEl.innerHTML = html;

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
  const pfl = document.getElementById('pathFromLabel'); if(pfl) pfl.textContent = 'Click to set start node';
  const ptl = document.getElementById('pathToLabel'); if(ptl) ptl.textContent = 'Click to set end node';
  const pfb = document.getElementById('pathFromBtn'); if(pfb) pfb.classList.remove('set');
  const ptb = document.getElementById('pathToBtn'); if(ptb) ptb.classList.remove('set');
  const resultEl = document.getElementById('pathResult'); if(resultEl) resultEl.style.display = 'none';
  netCanvas.style.cursor = 'grab';
  redrawNet();
}
