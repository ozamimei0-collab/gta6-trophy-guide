// Leonida Trophy Guide — offline tracker for the 55 GTA VI trophies.
// Progress lives in localStorage; export/import moves it between browsers.
const KEY = 'gta6-trophy-guide-v1';
const grid = document.getElementById('trophy-grid');
const filtersEl = document.getElementById('filters');
const searchEl = document.getElementById('search');
const spoilerEl = document.getElementById('spoiler-toggle');
const showingEl = document.getElementById('showing');

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'platinum', label: 'Platinum' },
  { id: 'gold', label: 'Gold' },
  { id: 'silver', label: 'Silver' },
  { id: 'bronze', label: 'Bronze' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'missable', label: 'Missable' },
  { id: 'story', label: 'Story' },
  { id: 'activities', label: 'Activities' },
  { id: 'collectibles', label: 'Collectibles' },
  { id: 'combat', label: 'Combat' },
  { id: 'exploration', label: 'Exploration' },
  { id: 'misc', label: 'Misc' },
];

let doc;
let earned = new Set();
let spoiler = true;
let activeFilter = 'all';
let query = '';

try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
  if (Array.isArray(saved.earned)) earned = new Set(saved.earned.filter((n) => Number.isInteger(n)));
  if (typeof saved.spoiler === 'boolean') spoiler = saved.spoiler;
} catch {
  earned = new Set();
}

function save() {
  localStorage.setItem(KEY, JSON.stringify({ earned: [...earned], spoiler }));
}

function matchesFilter(t) {
  if (activeFilter === 'all') return true;
  if (activeFilter === 'hidden') return t.hidden;
  if (activeFilter === 'missable') return t.missable;
  if (['platinum', 'gold', 'silver', 'bronze'].includes(activeFilter)) return t.grade === activeFilter;
  return t.category === activeFilter;
}

function matchesQuery(t) {
  if (!query) return true;
  const hay = `${t.name} ${t.description} ${t.guide} ${t.category}`.toLowerCase();
  return hay.includes(query);
}

function isMasked(t) {
  return spoiler && t.hidden && !earned.has(t.id);
}

function gradeCount(grade) {
  const total = doc.trophies.filter((t) => t.grade === grade).length;
  const done = doc.trophies.filter((t) => t.grade === grade && earned.has(t.id)).length;
  return { total, done };
}

function renderProgress() {
  const total = doc.trophies.length;
  const done = earned.size;
  const pct = Math.round((done / total) * 100);
  document.getElementById('progress-pct').textContent = `${pct}%`;
  document.getElementById('progress-count').textContent = `${done} of ${total} earned`;
  const bar = document.getElementById('progress-bar');
  bar.setAttribute('aria-valuenow', String(done));
  document.getElementById('progress-fill').style.width = `${pct}%`;
  const chips = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const c = gradeCount(g);
    return `<span class="grade-chip"><b>${c.done}/${c.total}</b> ${g}</span>`;
  }).join('');
  const gs = doc.trophies.filter((t) => earned.has(t.id)).reduce((s, t) => s + t.gamerscore, 0);
  document.getElementById('grade-counts').innerHTML =
    chips + `<span class="grade-chip"><b>${gs}G</b> Gamerscore</span>`;
}

function renderFilters() {
  filtersEl.replaceChildren();
  for (const f of FILTERS) {
    const count = doc.trophies.filter((t) => {
      if (f.id === 'all') return true;
      if (f.id === 'hidden') return t.hidden;
      if (f.id === 'missable') return t.missable;
      if (['platinum', 'gold', 'silver', 'bronze'].includes(f.id)) return t.grade === f.id;
      return t.category === f.id;
    }).length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `filter-btn${f.id === activeFilter ? ' active' : ''}`;
    btn.id = `filter-${f.id}`;
    btn.setAttribute('aria-pressed', f.id === activeFilter ? 'true' : 'false');
    btn.textContent = f.label;
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = String(count);
    btn.append(n);
    btn.addEventListener('click', () => {
      activeFilter = f.id;
      render();
    });
    filtersEl.append(btn);
  }
}

function tag(text, cls) {
  const s = document.createElement('span');
  s.className = `tag ${cls}`;
  s.textContent = text;
  return s;
}

function renderGrid() {
  grid.replaceChildren();
  const visible = doc.trophies.filter((t) => matchesFilter(t) && matchesQuery(t));
  showingEl.textContent = `Showing ${visible.length} of ${doc.trophies.length} trophies`;
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No trophies match that filter. Try another one.';
    grid.append(empty);
    return;
  }
  for (const t of visible) {
    const masked = isMasked(t);
    const isEarned = earned.has(t.id);
    const card = document.createElement('article');
    card.className = `card${isEarned ? ' earned' : ''}`;
    card.dataset.trophyId = String(t.id);

    const head = document.createElement('div');
    head.className = 'card-head';
    const dot = document.createElement('span');
    dot.className = `grade-dot ${t.grade}`;
    dot.title = t.grade;
    const titleBox = document.createElement('div');
    const h = document.createElement('h3');
    h.textContent = masked ? 'Hidden trophy' : t.name;
    const desc = document.createElement('p');
    desc.className = 'desc';
    desc.textContent = masked ? 'Earn this trophy in-game to reveal it.' : t.description;
    titleBox.append(h, desc);
    head.append(dot, titleBox);
    card.append(head);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.append(tag(t.grade, `grade-${t.grade}`));
    if (t.gamerscore > 0) meta.append(tag(`${t.gamerscore}G`, ''));
    meta.append(tag(t.category, ''));
    if (t.hidden) meta.append(tag('Hidden', 'hidden-tag'));
    if (t.missable) meta.append(tag('Possibly missable', 'missable-tag'));
    if (/not been confirmed yet/i.test(t.guide)) meta.append(tag('Steps unconfirmed', 'unconfirmed'));
    card.append(meta);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const earnBtn = document.createElement('button');
    earnBtn.type = 'button';
    earnBtn.className = 'earn-btn';
    earnBtn.textContent = isEarned ? '✓ Earned — tap to undo' : 'Mark earned';
    earnBtn.addEventListener('click', () => {
      if (earned.has(t.id)) earned.delete(t.id);
      else earned.add(t.id);
      save();
      render();
    });
    actions.append(earnBtn);
    if (!masked) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'guide-toggle';
      toggle.textContent = 'How to unlock it ▾';
      toggle.addEventListener('click', () => {
        card.classList.toggle('open');
        toggle.textContent = card.classList.contains('open') ? 'Hide guide ▴' : 'How to unlock it ▾';
      });
      actions.append(toggle);
    }
    card.append(actions);

    if (!masked) {
      const guide = document.createElement('div');
      guide.className = 'guide';
      const p = document.createElement('p');
      p.textContent = t.guide;
      const src = document.createElement('p');
      src.className = 'src';
      src.textContent = `Sources: ${t.sources.join(' · ')}`;
      guide.append(p, src);
      card.append(guide);
    } else {
      const note = document.createElement('p');
      note.className = 'guide masked';
      note.style.display = 'block';
      note.textContent = 'Spoiler hiding is on — mark this trophy earned, or switch it off above, to see its guide.';
      card.append(note);
    }
    grid.append(card);
  }
}

function render() {
  renderProgress();
  renderFilters();
  renderGrid();
}

document.getElementById('export').addEventListener('click', () => {
  const payload = {
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(ids)) throw new Error('no earned list');
    const known = new Set(doc.trophies.map((t) => t.id));
    const clean = ids.filter((n) => Number.isInteger(n) && known.has(n));
    if (!clean.length) throw new Error('no matching trophies');
    earned = new Set(clean);
    save();
    render();
  } catch {
    alert('That file is not a valid trophy-progress export.');
  }
  e.target.value = '';
});

document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Clear all earned trophies?')) {
    earned = new Set();
    save();
    render();
  }
});

spoilerEl.checked = spoiler;
spoilerEl.addEventListener('change', () => {
  spoiler = spoilerEl.checked;
  save();
  render();
});

searchEl.addEventListener('input', () => {
  query = searchEl.value.trim().toLowerCase();
  renderGrid();
});

try {
  const res = await fetch('data/trophies.json');
  if (!res.ok) throw new Error(`trophies.json: ${res.status}`);
  doc = await res.json();
  render();
} catch (err) {
  grid.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'empty';
  empty.textContent = `Could not load the trophy list (${err.message}). Open this guide through the local server (node serve.ts) so its data file loads.`;
  grid.append(empty);
}
