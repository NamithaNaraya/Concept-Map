let activeTab = 'network';

function toggleNetDrawer() {
  const drawer = document.getElementById('netDrawer');
  const toggle = document.getElementById('netDrawerToggle');
  drawer.classList.toggle('open');
  toggle.style.display = drawer.classList.contains('open') ? 'none' : '';
}

window.switchTab = function(tab) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(tab+'View').classList.add('active');
  activeTab = tab;

  if(tab === 'network') {
    setTimeout(()=>{ resizeNetCanvas(); buildNetworkData(); }, 50);
  } else if(tab === 'radial') {
    setTimeout(()=>drawRadial(), 50);
  } else if(tab === 'table') {
    renderTable();
  } else if(tab === 'stats') {
    buildStatsView();
  }
};

document.getElementById('headerTabs')?.addEventListener('click', e => {
  const btn = e.target.closest('.header-tab');
  if(!btn || !ROOT) return;
  const tab = btn.dataset.tab;
  document.querySelectorAll('.header-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  window.switchTab(tab);
});

function showTooltip(x, y, html) {
  const tooltipEl = document.getElementById('tooltip');
  if(!tooltipEl) return;
  tooltipEl.innerHTML = html;
  tooltipEl.style.left = (x+14)+'px';
  tooltipEl.style.top = (y-10)+'px';
  tooltipEl.classList.add('show');
}
function moveTooltip(x, y) {
  const tooltipEl = document.getElementById('tooltip');
  if(!tooltipEl) return;
  tooltipEl.style.left = (x+14)+'px';
  tooltipEl.style.top = (y-10)+'px';
}
function hideTooltip() { 
  const tooltipEl = document.getElementById('tooltip');
  if(tooltipEl) tooltipEl.classList.remove('show'); 
}

let notifTimeout;
function notify(msg) {
  const el = document.getElementById('notification');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(()=>el.classList.remove('show'), 2500);
}

function showHelp() { document.getElementById('helpModal').classList.add('show'); }
function closeHelp() { document.getElementById('helpModal').classList.remove('show'); }
document.getElementById('helpModal').addEventListener('click', e => { if(e.target===e.currentTarget) closeHelp(); });
document.addEventListener('keydown', e => { if(e.key==='Escape') { closeHelp(); closeNodeInfo(); } });

