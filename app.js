const manifest = window.DOLL_MANIFEST;
const defaults = window.DEFAULT_SELECTIONS || {};

const categories = [
  { key: 'bodies', label: 'Bodies', layerId: 'layer-body' },
  { key: 'hair', label: 'Hair', layerId: 'layer-hair' },
  { key: 'tops', label: 'Tops', layerId: 'layer-tops' },
  { key: 'bottoms', label: 'Bottoms', layerId: 'layer-bottoms' },
  { key: 'dresses', label: 'Dresses', layerId: 'layer-dresses' },
  { key: 'accessories', label: 'Accessories', layerId: null },
];

const defaultTransforms = {
  bodies: { x: 50, y: 56, scale: 0.2, flipX: 1 },
  hair: { x: 50, y: 38, scale: 0.9, flipX: 1 },
  tops: { x: 50, y: 56, scale: 0.9, flipX: 1 },
  bottoms: { x: 50, y: 56, scale: 0.9, flipX: 1 },
  dresses: { x: 50, y: 56, scale: 0.9, flipX: 1 },
};

const accessoryTypeDefaults = {
  tie: { x: 50, y: 25, scale: 0.45, flipX: 1 },
  purse: { x: 66, y: 58, scale: 0.7, flipX: 1 },
  bag: { x: 66, y: 58, scale: 0.7, flipX: 1 },
  glasses: { x: 50, y: 30, scale: 0.45, flipX: 1 },
  default: { x: 50, y: 50, scale: 0.6, flipX: 1 },
};

const state = {
  activeCategory: 'bodies',
  selections: {
    bodies: defaults.bodies || null,
    hair: defaults.hair || null,
    tops: defaults.tops || null,
    bottoms: defaults.bottoms || null,
    dresses: defaults.dresses || null,
    accessories: [],
  },
  transforms: {
    bodies: { ...defaultTransforms.bodies },
    hair: { ...defaultTransforms.hair },
    tops: { ...defaultTransforms.tops },
    bottoms: { ...defaultTransforms.bottoms },
    dresses: { ...defaultTransforms.dresses },
    accessories: {},
  },
  editorTarget: { category: 'bodies', fileName: null },
  dragTarget: null,
};

const tabs = document.getElementById('tabs');
const thumbGrid = document.getElementById('thumbGrid');
const categoryTitle = document.getElementById('categoryTitle');
const categoryHint = document.getElementById('categoryHint');
const statusText = document.getElementById('statusText');
const clearCategoryBtn = document.getElementById('clearCategoryBtn');
const randomBtn = document.getElementById('randomBtn');
const saveBtn = document.getElementById('saveBtn');
const dollStage = document.getElementById('dollStage');

const scaleSlider = document.getElementById('scaleSlider');
const scaleValue = document.getElementById('scaleValue');
const flipBtn = document.getElementById('flipBtn');
const resetLayerBtn = document.getElementById('resetLayerBtn');

function labelFromFile(fileName) {
  return fileName
    .split('/')
    .pop()
    .replace(/^imgi_\d+_?/i, '')
    .replace(/\.[^.]+$/i, '')
    .replace(/[-_]/g, ' ')
    .trim();
}

function assetPath(fileName) {
  return fileName;
}

function getAccessoryType(fileName) {
  const name = fileName.toLowerCase();
  if (name.includes('tie')) return 'tie';
  if (name.includes('purse')) return 'purse';
  if (name.includes('bag')) return 'bag';
  if (name.includes('glasses')) return 'glasses';
  return 'default';
}

function getDefaultAccessoryTransform(fileName) {
  const type = getAccessoryType(fileName);
  return { ...(accessoryTypeDefaults[type] || accessoryTypeDefaults.default) };
}

function getTransform(categoryKey, fileName = null) {
  if (categoryKey === 'accessories' && fileName) {
    if (!state.transforms.accessories[fileName]) {
      state.transforms.accessories[fileName] = getDefaultAccessoryTransform(fileName);
    }
    return state.transforms.accessories[fileName];
  }
  return state.transforms[categoryKey];
}

function applyTransformToLayer(layer, transform) {
  if (!layer || !transform) return;
  layer.style.left = `${transform.x}%`;
  layer.style.top = `${transform.y}%`;
  layer.style.transform = `translate(-50%, -50%) scale(${transform.scale * transform.flipX}, ${transform.scale})`;
  layer.style.transformOrigin = 'center center';
}

function setSingleLayer(categoryKey, fileName) {
  const category = categories.find(c => c.key === categoryKey);
  if (!category?.layerId) return;

  const layer = document.getElementById(category.layerId);
  if (!layer) return;

  if (!fileName) {
    layer.removeAttribute('src');
    layer.style.display = 'none';
    return;
  }

  layer.src = assetPath(fileName);
  layer.style.display = 'block';
  layer.dataset.category = categoryKey;
  layer.dataset.fileName = fileName;
  applyTransformToLayer(layer, getTransform(categoryKey));
}

function renderAccessoryLayers() {
  const existing = dollStage.querySelectorAll('.accessory-layer');
  existing.forEach(el => el.remove());

  state.selections.accessories.forEach((fileName, index) => {
    const img = document.createElement('img');
    img.className = 'layer accessory-layer';
    img.src = assetPath(fileName);
    img.alt = labelFromFile(fileName);
    img.style.display = 'block';
    img.dataset.category = 'accessories';
    img.dataset.fileName = fileName;
    img.dataset.index = String(index);
    img.style.zIndex = String(20 + index);
    dollStage.appendChild(img);

    applyTransformToLayer(img, getTransform('accessories', fileName));
  });
}

function refreshLayers() {
  setSingleLayer('bodies', state.selections.bodies);
  setSingleLayer('hair', state.selections.hair);
  setSingleLayer('tops', state.selections.tops);
  setSingleLayer('bottoms', state.selections.bottoms);
  setSingleLayer('dresses', state.selections.dresses);
  renderAccessoryLayers();
  updateEditorUI();
}

function selectItem(categoryKey, fileName) {
  if (categoryKey === 'accessories') {
    const alreadySelected = state.selections.accessories.includes(fileName);

    if (alreadySelected) {
      state.selections.accessories = state.selections.accessories.filter(f => f !== fileName);
      delete state.transforms.accessories[fileName];

      if (
        state.editorTarget.category === 'accessories' &&
        state.editorTarget.fileName === fileName
      ) {
        state.editorTarget = { category: 'bodies', fileName: state.selections.bodies };
      }

      statusText.textContent = 'Accessory removed ✨';
    } else {
      state.selections.accessories.push(fileName);
      state.transforms.accessories[fileName] = getDefaultAccessoryTransform(fileName);
      state.editorTarget = { category: 'accessories', fileName };
      statusText.textContent = 'Accessory added ✨';
    }

    refreshLayers();
    renderThumbs();
    return;
  }

  state.selections[categoryKey] = fileName;
  state.editorTarget = { category: categoryKey, fileName };

  if (categoryKey === 'dresses' && fileName) {
    state.selections.tops = null;
    state.selections.bottoms = null;
    statusText.textContent = 'Dress picked — tops and bottoms were cleared.';
  } else if ((categoryKey === 'tops' || categoryKey === 'bottoms') && fileName && state.selections.dresses) {
    state.selections.dresses = null;
    statusText.textContent = 'Top/bottom picked — dress was cleared.';
  } else {
    statusText.textContent = `${categories.find(c => c.key === categoryKey).label.slice(0, -1)} added ✨`;
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
      categoryHint.textContent =
        category.key === 'accessories'
          ? 'Click accessories to add or remove multiple items.'
          : category.key === 'dresses'
          ? 'Picking a dress clears tops and bottoms.'
          : 'Choose an item to place it on your doll.';
      renderTabs();
      renderThumbs();
    });

    tabs.appendChild(button);
  });
}

function renderThumbs() {
  const list = manifest[state.activeCategory] || [];
  thumbGrid.innerHTML = '';

  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<strong>No items in this category.</strong>';
    thumbGrid.appendChild(empty);
    return;
  }

  list.forEach(fileName => {
    const card = document.createElement('button');
    card.type = 'button';

    const isActive =
      state.activeCategory === 'accessories'
        ? state.selections.accessories.includes(fileName)
        : state.selections[state.activeCategory] === fileName;

    card.className = `thumb ${isActive ? 'active' : ''}`;
    card.title = labelFromFile(fileName);

    const img = document.createElement('img');
    img.src = assetPath(fileName);
    img.alt = labelFromFile(fileName);

    card.appendChild(img);
    card.addEventListener('click', () => selectItem(state.activeCategory, fileName));
    thumbGrid.appendChild(card);
  });
}

function getCurrentEditorTransform() {
  if (state.editorTarget.category === 'accessories' && state.editorTarget.fileName) {
    return getTransform('accessories', state.editorTarget.fileName);
  }

  if (state.editorTarget.category && state.editorTarget.category !== 'accessories') {
    return getTransform(state.editorTarget.category);
  }

  return null;
}

function updateEditorUI() {
  const transform = getCurrentEditorTransform();

  if (!transform) {
    scaleSlider.value = 100;
    scaleValue.textContent = '100%';
    return;
  }

  const percent = Math.round(transform.scale * 100);
  scaleSlider.value = percent;
  scaleValue.textContent = `${percent}%`;
}

function setEditorTarget(category, fileName = null) {
  state.editorTarget = { category, fileName };
  updateEditorUI();
}

function resetEditorTargetTransform() {
  const { category, fileName } = state.editorTarget;

  if (category === 'accessories' && fileName) {
    state.transforms.accessories[fileName] = getDefaultAccessoryTransform(fileName);
  } else if (category && defaultTransforms[category]) {
    state.transforms[category] = { ...defaultTransforms[category] };
  }

  refreshLayers();
}

function clearCurrentCategory() {
  const key = state.activeCategory;

  if (key === 'accessories') {
    state.selections.accessories = [];
    state.transforms.accessories = {};
    statusText.textContent = 'Accessories cleared.';
  } else {
    state.selections[key] = null;
    if (defaultTransforms[key]) {
      state.transforms[key] = { ...defaultTransforms[key] };
    }
    statusText.textContent = `${categories.find(c => c.key === key).label} cleared.`;
  }

  refreshLayers();
  renderThumbs();
}

function randomFromPool(pool) {
  if (!pool || !pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function randomizeDoll() {
  ['bodies', 'hair', 'tops', 'bottoms', 'dresses'].forEach(categoryKey => {
    state.selections[categoryKey] = randomFromPool(manifest[categoryKey]);
    if (defaultTransforms[categoryKey]) {
      state.transforms[categoryKey] = { ...defaultTransforms[categoryKey] };
    }
  });

  if (Math.random() > 0.5 && manifest.dresses.length) {
    state.selections.dresses = randomFromPool(manifest.dresses);
    state.selections.tops = null;
    state.selections.bottoms = null;
  } else {
    state.selections.dresses = null;
  }

  const accessoryPool = manifest.accessories || [];
  state.selections.accessories = [];
  state.transforms.accessories = {};

  const accessoryCount = Math.min(accessoryPool.length, Math.floor(Math.random() * 3));
  const shuffled = [...accessoryPool].sort(() => Math.random() - 0.5).slice(0, accessoryCount);

  shuffled.forEach(fileName => {
    state.selections.accessories.push(fileName);
    state.transforms.accessories[fileName] = getDefaultAccessoryTransform(fileName);
  });

  statusText.textContent = 'Random doll generated 💖';
  refreshLayers();
  renderThumbs();
}

async function saveDoll() {
  const ordered = [
    { category: 'bodies', fileName: state.selections.bodies },
    { category: 'bottoms', fileName: state.selections.bottoms },
    { category: 'tops', fileName: state.selections.tops },
    { category: 'dresses', fileName: state.selections.dresses },
    { category: 'hair', fileName: state.selections.hair },
    ...state.selections.accessories.map(fileName => ({ category: 'accessories', fileName })),
  ].filter(item => item.fileName);

  if (!ordered.length) {
    statusText.textContent = 'Pick at least one layer before saving.';
    return;
  }

  const stageRect = dollStage.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(stageRect.width * 2);
  canvas.height = Math.round(stageRect.height * 2);

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const loaded = await Promise.all(
    ordered.map(async item => ({
      ...item,
      img: await loadImage(item.fileName),
      transform: item.category === 'accessories'
        ? getTransform('accessories', item.fileName)
        : getTransform(item.category),
    }))
  );

  loaded.forEach(({ img, transform }) => {
    const drawWidth = img.naturalWidth * transform.scale * 2;
    const drawHeight = img.naturalHeight * transform.scale * 2;
    const x = ((transform.x / 100) * canvas.width);
    const y = ((transform.y / 100) * canvas.height);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(transform.flipX, 1);
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  });

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'y2k-dollz.png';
  link.click();

  statusText.textContent = 'Saved as PNG 💾';
}

function loadImage(fileName) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = assetPath(fileName);
  });
}

function getLayerElementFromEventTarget(target) {
  if (!target.classList.contains('layer')) return null;
  return target;
}

dollStage.addEventListener('mousedown', (event) => {
  const layer = getLayerElementFromEventTarget(event.target);
  if (!layer) return;

  const category = layer.dataset.category;
  const fileName = layer.dataset.fileName || null;

  setEditorTarget(category, fileName);
  state.dragTarget = { category, fileName };

  event.preventDefault();
});

document.addEventListener('mousemove', (event) => {
  if (!state.dragTarget) return;

  const stageRect = dollStage.getBoundingClientRect();
  const x = ((event.clientX - stageRect.left) / stageRect.width) * 100;
  const y = ((event.clientY - stageRect.top) / stageRect.height) * 100;

  const clampedX = Math.max(0, Math.min(100, x));
  const clampedY = Math.max(0, Math.min(100, y));

  const { category, fileName } = state.dragTarget;
  const transform = category === 'accessories'
    ? getTransform('accessories', fileName)
    : getTransform(category);

  transform.x = clampedX;
  transform.y = clampedY;

  refreshLayers();
});

document.addEventListener('mouseup', () => {
  state.dragTarget = null;
});

scaleSlider.addEventListener('input', (event) => {
  const transform = getCurrentEditorTransform();
  if (!transform) return;

  let value = Number(event.target.value);

  // ✅ prevent weird jump behavior
  if (value < 20) value = 20;

  transform.scale = value / 100;

  scaleValue.textContent = `${value}%`; // update UI immediately
  refreshLayers();
});

flipBtn.addEventListener('click', () => {
  const transform = getCurrentEditorTransform();
  if (!transform) return;

  transform.flipX *= -1;
  refreshLayers();
});

resetLayerBtn.addEventListener('click', () => {
  resetEditorTargetTransform();
});

clearCategoryBtn.addEventListener('click', clearCurrentCategory);
randomBtn.addEventListener('click', randomizeDoll);
saveBtn.addEventListener('click', saveDoll);

refreshLayers();
renderTabs();
renderThumbs();
updateEditorUI();
