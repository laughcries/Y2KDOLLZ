
const manifest = window.DOLL_MANIFEST;
const defaults = window.DEFAULT_SELECTIONS;

const categories = [
  { key: 'bodies', label: 'Bodies', layerId: 'layer-body' },
  { key: 'hair', label: 'Hair', layerId: 'layer-hair' },
  { key: 'tops', label: 'Tops', layerId: 'layer-tops' },
  { key: 'bottoms', label: 'Bottoms', layerId: 'layer-bottoms' },
  { key: 'dresses', label: 'Dresses', layerId: 'layer-dresses' },
];

const state = {
  activeCategory: 'bodies',
  search: '',
  selections: { ...defaults }
};

const tabs = document.getElementById('tabs');
const thumbGrid = document.getElementById('thumbGrid');
const categoryTitle = document.getElementById('categoryTitle');
const categoryHint = document.getElementById('categoryHint');
const searchInput = document.getElementById('searchInput');
const statusText = document.getElementById('statusText');
const clearCategoryBtn = document.getElementById('clearCategoryBtn');
const randomBtn = document.getElementById('randomBtn');
const saveBtn = document.getElementById('saveBtn');

function labelFromFile(fileName) {
  return fileName
    .replace(/^imgi_\d+_?/i, '')
    .replace(/\.gif$/i, '')
    .replace(/[-_]/g, ' ')
    .trim();
}

function assetPath(fileName) {
  return `assets/${encodeURIComponent(fileName)}`;
}

function setLayer(categoryKey, fileName) {
  const category = categories.find(c => c.key === categoryKey);
  const layer = document.getElementById(category.layerId);
  if (!fileName) {
    layer.removeAttribute('src');
    layer.style.display = 'none';
    return;
  }
  layer.src = assetPath(fileName);
  layer.style.display = 'block';
}

function refreshLayers() {
  categories.forEach(category => setLayer(category.key, state.selections[category.key]));
  document.getElementById('summary-bodies').textContent = state.selections.bodies ? labelFromFile(state.selections.bodies) : '—';
  document.getElementById('summary-hair').textContent = state.selections.hair ? labelFromFile(state.selections.hair) : '—';
  document.getElementById('summary-tops').textContent = state.selections.tops ? labelFromFile(state.selections.tops) : '—';
  document.getElementById('summary-bottoms').textContent = state.selections.bottoms ? labelFromFile(state.selections.bottoms) : '—';
  document.getElementById('summary-dresses').textContent = state.selections.dresses ? labelFromFile(state.selections.dresses) : '—';
}

function selectItem(categoryKey, fileName) {
  state.selections[categoryKey] = fileName;

  if (categoryKey === 'dresses' && fileName) {
    state.selections.tops = null;
    state.selections.bottoms = null;
    statusText.textContent = 'Dress picked — tops and bottoms were cleared to keep layering clean.';
  } else if ((categoryKey === 'tops' || categoryKey === 'bottoms') && fileName && state.selections.dresses) {
    state.selections.dresses = null;
    statusText.textContent = 'Top/bottom picked — dress was cleared so your outfit layers correctly.';
  } else {
    statusText.textContent = `${categories.find(c => c.key === categoryKey).label.slice(0, -1) || 'Item'} added ✨`;
  }

  refreshLayers();
  renderThumbs();
}

function renderTabs() {
  tabs.innerHTML = '';
  categories.forEach(category => {
    const button = document.createElement('button');
    button.className = `tab ${state.activeCategory === category.key ? 'active' : ''}`;
    button.textContent = `${category.label} (${manifest[category.key].length})`;
    button.addEventListener('click', () => {
      state.activeCategory = category.key;
      categoryTitle.textContent = category.label;
      categoryHint.textContent = category.key === 'dresses'
        ? 'Picking a dress will clear tops and bottoms.'
        : 'Choose an item to place it on your doll.';
      renderTabs();
      renderThumbs();
    });
    tabs.appendChild(button);
  });
}

function renderThumbs() {
  const list = manifest[state.activeCategory].filter(fileName =>
    labelFromFile(fileName).toLowerCase().includes(state.search.toLowerCase())
  );

  thumbGrid.innerHTML = '';
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<strong>No matches in this category.</strong><p>Try a different search term.</p>';
    thumbGrid.appendChild(empty);
    return;
  }

  list.forEach(fileName => {
    const card = document.createElement('button');
    card.className = `thumb ${state.selections[state.activeCategory] === fileName ? 'active' : ''}`;
    card.type = 'button';

    const img = document.createElement('img');
    img.src = assetPath(fileName);
    img.alt = labelFromFile(fileName);

    card.title = labelFromFile(fileName);
    card.appendChild(img);
    card.addEventListener('click', () => selectItem(state.activeCategory, fileName));
    thumbGrid.appendChild(card);
  });
}

searchInput.addEventListener('input', (event) => {
  state.search = event.target.value;
  renderThumbs();
});

clearCategoryBtn.addEventListener('click', () => {
  state.selections[state.activeCategory] = null;
  statusText.textContent = `${categories.find(c => c.key === state.activeCategory).label} cleared.`;
  refreshLayers();
  renderThumbs();
});

randomBtn.addEventListener('click', () => {
  categories.forEach(category => {
    const pool = manifest[category.key];
    state.selections[category.key] = pool[Math.floor(Math.random() * pool.length)];
  });

  if (Math.random() > 0.5) {
    state.selections.dresses = manifest.dresses[Math.floor(Math.random() * manifest.dresses.length)];
    state.selections.tops = null;
    state.selections.bottoms = null;
  } else {
    state.selections.dresses = null;
  }

  statusText.textContent = 'Random doll generated 💖';
  refreshLayers();
  renderThumbs();
});

saveBtn.addEventListener('click', async () => {
  const ordered = ['bodies', 'bottoms', 'tops', 'dresses', 'hair']
    .map(key => state.selections[key])
    .filter(Boolean);

  if (!ordered.length) {
    statusText.textContent = 'Pick at least one layer before saving.';
    return;
  }

  const images = await Promise.all(ordered.map(loadImage));
  const bounds = images.reduce((acc, img) => {
    return {
      width: Math.max(acc.width, img.naturalWidth),
      height: Math.max(acc.height, img.naturalHeight),
    };
  }, { width: 1, height: 1 });

  const scale = 8;
  const canvas = document.createElement('canvas');
  canvas.width = bounds.width * scale;
  canvas.height = bounds.height * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  images.forEach(img => {
    ctx.drawImage(img, 0, 0, img.naturalWidth * scale, img.naturalHeight * scale);
  });

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'gurlpowerrr-doll.png';
  link.click();

  statusText.textContent = 'Saved as PNG 💾';
});

function loadImage(fileName) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = assetPath(fileName);
  });
}

refreshLayers();
renderTabs();
renderThumbs();
