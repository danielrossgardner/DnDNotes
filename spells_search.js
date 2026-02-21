/*
  cd /Users/isbre/Documents/DnD/DnDNotes
  npx http-server -p 8000
  open http://localhost:8000/spells_search.html

  TODO: format time
  TODO: format duration
  TODO: format {@damage 1d6} in text
*/

const JSON_PATHS = [
  'phb_spells.json',
  'tce_spells.json',
  'xgte_spells.json'
];

const schoolMap = {
  A: 'abjuration',
  C: 'conjuration',
  D: 'divination',
  E: 'enchantment',
  I: 'illusion',
  N: 'necromancy',
  T: 'transmutation',
  V: 'evocation'
};

const D20_REGEX = /{@(d20)(\s[0-9])}/g;
const DAMAGE_REGEX = /({@damage\s([0-9]+d[0-9]+)(\s\+\s)?(([0-9]+d[0-9]+)|([0-9]+))?})/g;
const DC_REGEX = /{@dc\s([0-9]+)}/g;
const DICE_REGEX = /{@dice\s([0-9]*d[0-9]+)(\s[×,\+]\s)?([0-9]+)?}/g;
const OTHER_THINGS_REGEX = /{@(action|spell|sense|condition|creature|skill|status)\s([A-z]+\s?[A-z]*\s?[A-z]*)}/g;
const SCALE_DAMAGE_REGEX = /{@scaledamage\s([0-9]+d[0-9]+).*}/g;
const SPECIAL_STATUS = /{@status\s[A-z]+\s?[A-z]*\|\|([A-z]+)}/g;

let allSpells = [];

function ordinal(n){
  if(n===1) return '1st';
  if(n===2) return '2nd';
  if(n===3) return '3rd';
  return n + 'th';
}

function formatLevel(sp){
  if(sp.level === 0) return `Cantrip ${schoolMap[sp.school] || ''}`.trim();
  const lvl = ordinal(sp.level);
  const school = schoolMap[sp.school] || '';
  return `${lvl}-level ${school}`.trim();
}

function formatMaterialComponents(m) {
  if (typeof m === 'string') {
    return `(${m})`;
  } else {
    return `<div>(${m.text})</div><div>Cost: ${m.cost / 100}gp</div><div>${m.consume ? 'CONSUMED' : ''}</div>`;
  }
}

function formatComponents(c){
  if(!c) return '';
  const parts = [];
  if(c.v) parts.push('V');
  if(c.s) parts.push('S');
  if(c.m) parts.push(`M ${formatMaterialComponents(c.m)}`);
  return parts.join(', ');
}


function safeText(x){
  if(!x) return '';
  if(Array.isArray(x)) return x.join('\n');
  return String(x);
}

function formatRange(r){
  if(!r) return '';
  if(typeof r === 'string') return r;
  if(r.distance){
    if(typeof r.distance === 'string') return r.distance;
    if(typeof r.distance === 'object'){
      const a = r.distance.amount || r.distance.type || '';
      const u = r.distance.type && r.distance.unit ? r.distance.unit : r.distance.type || '';
      return `${a} ${u}`.trim();
    }
  }
  if(r.amount && r.unit) return `${r.amount} ${r.unit}`;
  return JSON.stringify(r);
}

function formatDescription(inputTxt) {
  let txt = inputTxt;
  
  txt = txt.replace(D20_REGEX, '$1 +$2');
  txt = txt.replace(DAMAGE_REGEX, '$2$3$4');
  txt = txt.replace(DC_REGEX, 'DC $1');
  txt = txt.replace(DICE_REGEX, '$1$2$3');
  txt = txt.replace(OTHER_THINGS_REGEX, '$1');
  txt = txt.replace(SCALE_DAMAGE_REGEX, '$1');
  txt = txt.replace(SPECIAL_STATUS, '$1');

  return txt;
}

function renderEntries(entries, container){
  if(!entries) return;
  for(const e of entries){
    if(typeof e === 'string'){
      const p = document.createElement('p');
      p.textContent = formatDescription(e);
      container.appendChild(p);
    } else if(e && typeof e === 'object'){
      // If object has a name/title with nested entries
      if(e.name){
        const h = document.createElement('div');
        h.innerHTML = `<strong>${e.name}</strong>`;
        container.appendChild(h);
      }
      if(e.entries) renderEntries(e.entries, container);
      else {
        const p = document.createElement('pre');
        p.textContent = JSON.stringify(e, null, 2);
        container.appendChild(p);
      }
    }
  }
}

function formatTime(inputTime) {
  const time = inputTime[0];
  return `${time.number} ${time.unit}`;
}

function formatDuration(inputDuration) {
  const duration = inputDuration[0];
  let str = '';
  if (duration.type === 'timed') {
    str = `${duration.duration.amount} ${duration.duration.type}`;
  } else if (duration.type === 'permanent') {
    str = `Permanent but ends on ${duration.ends.join(' or ')}`;
  } else {
    str = duration.type;
  }

  if (duration.concentration) {
    str += ' (consentration)';
  }
  return str;
}

function renderSpell(sp){
  const container = document.createElement('div');
  container.className = 'panel';

  const header = document.createElement('div');
  header.className = 'meta';

  const hwrap = document.createElement('div');
  const h = document.createElement('h1');
  h.textContent = sp.name || '(Unnamed)';
  hwrap.appendChild(h);

  const source = document.createElement('div');
  source.className = 'source';
  if(sp.source && sp.page){
    const sourceSpan = document.createElement('span');
    sourceSpan.className = 'help-subtle';
    sourceSpan.textContent = sp.source;
    source.appendChild(sourceSpan);
    const p = document.createElement('span');
    p.className = 'small';
    p.style.marginLeft = '8px';
    p.textContent = `p${sp.page}`;
    source.appendChild(p);
  } else if(sp.source){
    source.textContent = sp.source;
  }

  header.appendChild(hwrap);
  header.appendChild(source);

  container.appendChild(header);

  const lvlRow = document.createElement('div');
  lvlRow.className = 'small';
  lvlRow.style.marginTop = '6px';
  lvlRow.textContent = formatLevel(sp);
  container.appendChild(lvlRow);

  const infoList = document.createElement('div');
  infoList.className = 'small';
  infoList.style.marginTop = '8px';
  if(sp.time) infoList.innerHTML += `<div><b>Casting Time:</b> ${formatTime(sp.time)}</div>`;
  if(sp.range) infoList.innerHTML += `<div><b>Range:</b> ${formatRange(sp.range)}</div>`;
  const comps = formatComponents(sp.components);
  if(comps) infoList.innerHTML += `<div><b>Components:</b> ${comps}</div>`;
  if(sp.duration) infoList.innerHTML += `<div><b>Duration:</b> ${formatDuration(sp.duration)}</div>`;
  if(sp.savingThrow) infoList.innerHTML += `<div><b>Saving Throw:</b> ${Array.isArray(sp.savingThrow)? sp.savingThrow.join(', '): sp.savingThrow}</div>`;
  if(sp.damageInflict) infoList.innerHTML += `<div><b>Damage:</b> ${Array.isArray(sp.damageInflict)? sp.damageInflict.join(', '): sp.damageInflict}</div>`;
  if(sp.conditionInflict) infoList.innerHTML += `<div><b>Conditions:</b> ${Array.isArray(sp.conditionInflict)? sp.conditionInflict.join(', '): sp.conditionInflict}</div>`;
  if(sp.spellAttack) infoList.innerHTML += `<div><b>Spell Attack:</b> ${Array.isArray(sp.spellAttack)? sp.spellAttack.join(', '): sp.spellAttack}</div>`;
  if(sp.abilityCheck) infoList.innerHTML += `<div><b>Ability Check:</b> ${Array.isArray(sp.abilityCheck)? sp.abilityCheck.join(', '): sp.abilityCheck}</div>`;
  if(sp.affectsCreatureType) infoList.innerHTML += `<div><b>Affects:</b> ${Array.isArray(sp.affectsCreatureType)? sp.affectsCreatureType.join(', '): sp.affectsCreatureType}</div>`;
  if(sp.areaTags) infoList.innerHTML += `<div><b>Area:</b> ${Array.isArray(sp.areaTags)? sp.areaTags.join(', '): sp.areaTags}</div>`;
  if(sp.miscTags) infoList.innerHTML += `<div><b>Tags:</b> ${Array.isArray(sp.miscTags)? sp.miscTags.join(', '): sp.miscTags}</div>`;
  if(sp.meta && sp.meta.ritual) infoList.innerHTML += `<div><b>Ritual:</b> Yes</div>`;
  container.appendChild(infoList);

  const divider = document.createElement('div');
  divider.className = 'divider';
  container.appendChild(divider);

  const desc = document.createElement('div');
  desc.className = 'rd__b';
  if(sp.entries && sp.entries.length){
    renderEntries(sp.entries, desc);
  } else if(sp._text){
    const p = document.createElement('p');
    p.textContent = sp._text;
    desc.appendChild(p);
  }
  // Entries higher level
  if(sp.entriesHigherLevel && sp.entriesHigherLevel.length){
    const higherWrap = document.createElement('div');
    higherWrap.className = 'rd__b rd__b--3';
    renderEntries(sp.entriesHigherLevel, higherWrap);
    desc.appendChild(higherWrap);
  }
  container.appendChild(desc);

  return container;
}

function renderResults(list){
  const results = document.getElementById('results');
  const noR = document.getElementById('noResults');
  results.innerHTML = '';
  if(!list.length){
    noR.style.display = 'block';
    return;
  }
  noR.style.display = 'none';
  for(const sp of list){
    results.appendChild(renderSpell(sp));
  }
}

function doSearch(q){
  q = (q||'').trim().toLowerCase();
  if(!q){ renderResults([]); return; }
  const matches = allSpells.filter(s => s && s.name && s.name.toLowerCase().includes(q));
  renderResults(matches);
}

async function init(){
  try{
    const loads = JSON_PATHS.map(p => fetch(p).then(r=>r.ok? r.json() : [] ).catch(()=>[]));
    const results = await Promise.all(loads);
    allSpells = results.flat().filter(Boolean);
  } catch(e){
    console.error('Failed to load spell data', e);
    allSpells = [];
  }

  const q = document.getElementById('q');
  q.addEventListener('input', () => doSearch(q.value));
  q.addEventListener('keydown', (ev)=>{ if(ev.key==='Enter') doSearch(q.value); });
  document.getElementById('clear').addEventListener('click', ()=>{ q.value=''; doSearch(''); q.focus(); });

  // Accessibility / hint: focus input
  q.focus();
}

init();
