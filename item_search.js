const ITEM_GROUPS = [
  { key: 'amulets', label: 'Amulets', file: './json/amulets.json' },
  { key: 'armor_clothing', label: 'Armor & Clothing', file: './json/armor_clothing.json' },
  { key: 'boots', label: 'Boots', file: './json/boots.json' },
  { key: 'cloaks_shields', label: 'Cloaks & Shields', file: './json/cloaks_shields.json' },
  { key: 'helmets', label: 'Helmets', file: './json/helmets.json' },
  { key: 'rings', label: 'Rings', file: './json/rings.json' },
  { key: 'weapons', label: 'Weapons', file: './json/weapons.json' }
];

const allItems = [];
const DEFAULT_RARITY = 'all';

function formatText(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function matchesSearch(item, query) {
  const haystack = [
    item.name,
    item.type,
    item.rarity,
    item.category
  ].join(' ').toLowerCase();
  return haystack.includes(query);
}

function renderTable(group, items) {
  const section = document.createElement('section');
  section.className = 'group-section panel';

  const heading = document.createElement('h2');
  heading.textContent = group.label;
  section.appendChild(heading);

  const table = document.createElement('table');
  table.className = 'item-table';

  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Name</th>
      <th>Type</th>
      <th>Rarity</th>
      <th>Attunement</th>
      <th>Description</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  if (!items.length) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" class="empty-cell">No matching items in this group.</td>';
    tbody.appendChild(row);
  } else {
    items.forEach((item) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${formatText(item.name)}</strong></td>
        <td>${formatText(item.type)}</td>
        <td>${formatText(item.rarity)}</td>
        <td>${item.attunement ? 'Yes' : 'No'}</td>
        <td>${formatText(item.description)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  table.appendChild(tbody);
  section.appendChild(table);
  return section;
}

function getGroupItems(groupKey) {
  return allItems.filter((item) => item.group === groupKey);
}

function applyFilters() {
  const results = document.getElementById('results');
  const noResults = document.getElementById('noResults');
  const searchValue = document.getElementById('itemSearch').value.trim().toLowerCase();
  const selectedGroup = document.getElementById('groupFilter').value;
  const selectedRarity = document.getElementById('rarityFilter').value;

  let filteredGroups = ITEM_GROUPS.map((group) => {
    const groupItems = getGroupItems(group.key).filter((item) => {
      const matchesGroup = selectedGroup === 'all' || item.group === selectedGroup;
      const matchesRarity = selectedRarity === DEFAULT_RARITY || item.rarity === selectedRarity;
      const matchesQuery = !searchValue || matchesSearch(item, searchValue);
      return matchesGroup && matchesRarity && matchesQuery;
    });

    return { group, items: groupItems };
  });

  if (selectedGroup !== 'all') {
    filteredGroups = filteredGroups.filter((entry) => entry.group.key === selectedGroup);
  }

  const visible = filteredGroups.filter((entry) => entry.items.length > 0);

  results.innerHTML = '';

  if (!visible.length) {
    noResults.style.display = 'block';
    return;
  }

  noResults.style.display = 'none';
  visible.forEach(({ group, items }) => {
    results.appendChild(renderTable(group, items));
  });
}

function buildSelectOptions() {
  const groupFilter = document.getElementById('groupFilter');
  const rarityFilter = document.getElementById('rarityFilter');

  const groupOptions = ['<option value="all">All groups</option>']
    .concat(ITEM_GROUPS.map((group) => `<option value="${group.key}">${group.label}</option>`))
    .join('');
  groupFilter.innerHTML = groupOptions;

  const rarities = ['all', 'common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];
  const rarityOptions = ['<option value="all">All rarities</option>']
    .concat(rarities.filter((rarity, idx, arr) => arr.indexOf(rarity) === idx).map((rarity) => `<option value="${rarity}">${rarity.charAt(0).toUpperCase() + rarity.slice(1)}</option>`))
    .join('');
  rarityFilter.innerHTML = rarityOptions;
}

function normalizeItem(item, groupKey) {
  return {
    ...item,
    group: groupKey,
    rarity: (item.rarity || 'unknown').toLowerCase(),
    type: item.type || 'Unknown',
    name: item.name || 'Unnamed Item',
    attunement: Boolean(item.attunement),
    description: item.description || ''
  };
}

async function loadItems() {
  try {
    const data = await Promise.all(
      ITEM_GROUPS.map(async ({ key, file }) => {
        const response = await fetch(file);
        if (!response.ok) return [];
        const json = await response.json();
        return Array.isArray(json) ? json.map((item) => normalizeItem(item, key)) : [];
      })
    );

    allItems.length = 0;
    allItems.push(...data.flat());
    applyFilters();
  } catch (error) {
    console.error('Failed to load item data', error);
    document.getElementById('noResults').style.display = 'block';
  }
}

function bindEvents() {
  document.getElementById('itemSearch').addEventListener('input', applyFilters);
  document.getElementById('groupFilter').addEventListener('change', applyFilters);
  document.getElementById('rarityFilter').addEventListener('change', applyFilters);
  document.getElementById('clearFilters').addEventListener('click', () => {
    document.getElementById('itemSearch').value = '';
    document.getElementById('groupFilter').value = 'all';
    document.getElementById('rarityFilter').value = DEFAULT_RARITY;
    applyFilters();
    document.getElementById('itemSearch').focus();
  });
}

function init() {
  buildSelectOptions();
  bindEvents();
  loadItems();
}

init();
