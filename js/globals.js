const LEVELS = ["A1","A2","B1","B2"];
const LEVEL_COLOR = {
  A1: '#10b981', // Emerald
  A2: '#84cc16', // Lime
  B1: '#f59e0b', // Amber
  B2: '#ef4444'  // Red
};
const CHAPTER_TITLES = {
  ch1:"1 · Orientation", ch2:"2 · CEFR Descriptors", ch3:"3 · Functions",
  ch4:"4 · Notions", ch5:"5 · Grammar", ch6:"6 · Lexicon",
  ch8:"8 · Orthography", ch9:"9 · Sociocultural", ch10:"10 · Strategies"
};
const CHAPTER_COLOR = {
  ch1: '#38bdf8', // Light Blue
  ch2: '#2dd4bf', // Teal
  ch3: '#fb923c', // Orange
  ch4: '#c084fc', // Purple
  ch5: '#fb7185', // Rose
  ch6: '#4ade80', // Green
  ch8: '#facc15', // Yellow
  ch9: '#818cf8', // Indigo
  ch10: '#22d3ee' // Cyan
};
const CHAPTER_GLOW = {
  ch1: "rgba(56, 189, 248, 0.8)",
  ch2: "rgba(45, 212, 191, 0.8)",
  ch3: "rgba(251, 146, 60, 0.8)",
  ch4: "rgba(192, 132, 252, 0.8)",
  ch5: "rgba(251, 113, 133, 0.8)",
  ch6: "rgba(74, 222, 128, 0.8)",
  ch8: "rgba(250, 204, 21, 0.8)",
  ch9: "rgba(129, 140, 248, 0.8)",
  ch10: "rgba(34, 211, 238, 0.8)"
};
const KIND_COLOR = {
  leaf: "#3b6fd4",
  family: "#2d6a8f",
  container: "#6c7689",
  family_with_direct_content: "#9b59b6"
};

let ROOT = null;
let RECORDS = [];
let filters = {
  search: "",
  chapters: new Set(),
  levels: new Set(),
  kinds: new Set(),
  asterisked: new Set(),
  hasLinks: new Set(),
  families: new Set(),
};
let sortState = { col:"section_code", dir:"asc" };
let page = 1;
const PAGE_SIZE = 60;

// Network
let NET = { nodes:[], edges:[], sim:null, zoom:1, panX:0, panY:0, dragging:null, panning:false, lastMx:0, lastMy:0, hovered:null, selected:null, animFrame:null };
let pathMode = null; // 'from' | 'to'
let pathFrom = null, pathTo = null;
let pathHighlight = new Set(); // set of node keys on path

// Radial
let radialMode = "chapter";
let radialSel = null;
