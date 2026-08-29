/* ─── Shabd Test Console — App Logic ─── */

const STATE = {
  baseUrl: localStorage.getItem('shabd_base_url') || 'http://localhost:8000',
  token: localStorage.getItem('shabd_token') || null,
  learner: null,
  currentChallenge: null,
};

const $ = id => document.getElementById(id);
const BASE_KEY = 'shabd_base_url';
const TOKEN_KEY = 'shabd_token';

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  $(`url-input`).value = STATE.baseUrl;
  $('url-input').addEventListener('change', () => {
    STATE.baseUrl = $('url-input').value.replace(/\/+$/, '');
    localStorage.setItem(BASE_KEY, STATE.baseUrl);
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $(btn.dataset.tab).classList.add('active');
    });
  });

  // Peek toggle
  $('peek-toggle').addEventListener('change', () => {
    $('peek-content').style.display = $('peek-toggle').checked ? 'block' : 'none';
  });

  // Restore token
  if (STATE.token) {
    fetchMe().catch(() => {
      STATE.token = null;
      localStorage.removeItem(TOKEN_KEY);
    });
  }
});

/* ─── API Wrapper ─── */
async function apiRequest(method, path, body = null, auth = false) {
  const url = STATE.baseUrl + path;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (auth && STATE.token) opts.headers['Authorization'] = `Bearer ${STATE.token}`;
  if (body) opts.body = JSON.stringify(body);

  const start = performance.now();
  let res;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    logRequest(method, path, 0, `Network error: ${err.message}`, start);
    throw err;
  }
  const elapsed = ((performance.now() - start) / 1000).toFixed(2);
  let data;
  try {
    data = await res.json();
  } catch {
    data = { raw: await res.text().catch(() => '(empty)') };
  }
  logRequest(method, path, res.status, JSON.stringify(data).slice(0, 500), start);
  if (!res.ok) {
    const msg = data.detail || data.message || `HTTP ${res.status}`;
    toast(`Error: ${msg}`, 'error');
    throw Object.assign(new Error(msg), { status: res.status, data });
  }
  return data;
}

function logRequest(method, path, status, summary, startTime) {
  const elapsed = startTime ? ` ${((performance.now() - startTime) / 1000).toFixed(2)}s` : '';
  const el = document.createElement('div');
  el.className = 'log-entry';
  const statusClass = status >= 200 && status < 300 ? 'log-status-2xx'
    : status >= 400 && status < 500 ? 'log-status-4xx'
    : status >= 500 ? 'log-status-5xx' : '';
  el.innerHTML = `<span class="log-method ${method.toLowerCase()}">${method}</span> ${path} — <span class="${statusClass}">${status}${elapsed}</span>\n${summary}`;
  $('log-area').appendChild(el);
  $('log-area').scrollTop = $('log-area').scrollHeight;
}

/* ─── Toast ─── */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

/* ─── 1. Health ─── */
async function checkHealth() {
  $('health-status').className = 'status-dot';
  try {
    const data = await apiRequest('GET', '/health');
    $('health-status').className = 'status-dot ok';
    toast(`Health OK — v${data.version || '?'}`, 'success');
    $('health-version').textContent = data.version || '';
  } catch (e) {
    $('health-status').className = 'status-dot err';
    toast(`Health check failed: ${e.message}`, 'error');
  }
}

/* ─── 2. Auth / Dev Login ─── */
async function devLogin() {
  const displayName = $('login-name').value.trim();
  if (!displayName) { toast('Enter a display name', 'error'); return; }
  const langs = $('login-langs').value.split(',').map(s => s.trim()).filter(Boolean);
  if (!langs.length) { toast('Enter at least one bridge language', 'error'); return; }

  try {
    const data = await apiRequest('POST', '/auth/dev-login', {
      display_name: displayName,
      bridge_langs: langs,
    });
    STATE.token = data.token;
    localStorage.setItem(TOKEN_KEY, data.token);
    toast('Dev login successful', 'success');
    await fetchMe();
  } catch (e) {
    toast(`Login failed: ${e.message}`, 'error');
  }
}

async function logout() {
  STATE.token = null;
  STATE.learner = null;
  localStorage.removeItem(TOKEN_KEY);
  $('learner-panel').style.display = 'none';
  $('login-name').value = '';
  $('login-langs').value = '';
  toast('Logged out', 'info');
}

/* ─── 3. /me → Learner Card ─── */
async function fetchMe() {
  try {
    const data = await apiRequest('GET', '/me', null, true);
    STATE.learner = data;
    renderLearner(data);
    return data;
  } catch (e) {
    $('learner-panel').style.display = 'none';
    throw e;
  }
}

function renderLearner(data) {
  $('learner-panel').style.display = 'block';

  // Sanskrit ratio
  $('sanskrit-ratio-fill').style.width = `${(data.sanskrit_ratio || 0) * 100}%`;
  $('sanskrit-ratio-text').textContent = `${Math.round((data.sanskrit_ratio || 0) * 100)}%`;

  // Script ratio
  $('script-ratio-fill').style.width = `${(data.script_ratio || 0) * 100}%`;
  $('script-ratio-text').textContent = `${Math.round((data.script_ratio || 0) * 100)}%`;

  // Streak
  $('streak-value').textContent = data.streak ?? 0;

  // Bridge langs
  $('bridge-langs').textContent = (data.bridge_langs || []).join(', ');

  // Feature mastery
  const mastery = data.feature_mastery || {};
  const keys = Object.keys(mastery);
  if (keys.length) {
    $('mastery-container').style.display = '';
    $('mastery-grid').innerHTML = keys.map(k => {
      const v = typeof mastery[k] === 'number' ? mastery[k] : 0;
      return `<div class="mastery-item"><span>${k}</span><strong>${Math.round(v * 100)}%</strong></div>`;
    }).join('');
  } else {
    $('mastery-container').style.display = 'none';
  }

  // Re-render ratios on attempt panel too
  const r = data.sanskrit_ratio || 0;
  $('attempt-sanskrit-fill').style.width = `${r * 100}%`;
  $('attempt-sanskrit-text').textContent = `${Math.round(r * 100)}%`;
  const sr = data.script_ratio || 0;
  $('attempt-script-fill').style.width = `${sr * 100}%`;
  $('attempt-script-text').textContent = `${Math.round(sr * 100)}%`;
}

/* ─── 4. Challenges / Practice ─── */
async function loadChallenge() {
  if (!STATE.token) { toast('Log in first', 'error'); return; }
  const register = $('challenge-register').value;
  const mode = $('challenge-mode').value;
  try {
    const data = await apiRequest('GET', `/challenges/next?register=${register}&mode=${mode}`, null, true);
    STATE.currentChallenge = data;
    $('challenge-prompt').textContent = data.prompt_l1 || '(no prompt)';
    $('challenge-prompt-lang').textContent = `(${data.prompt_lang || '?'})`;
    $('challenge-register-label').textContent = data.register || register;
    $('challenge-features').textContent = (data.features || []).join(', ');
    $('challenge-audio').style.display = data.audio_url ? '' : 'none';
    if (data.audio_url) $('challenge-audio').innerHTML = `<audio controls src="${data.audio_url}">Audio</audio>`;

    $('peek-content').textContent = data.target_sanskrit || '(hidden)';
    $('peek-toggle').checked = false;
    $('peek-content').style.display = 'none';

    // Clear previous verdict
    $('verdict-area').innerHTML = '';
    $('verdict-area').style.display = 'none';
    $('attempt-response').value = '';
    $('attempt-panel').style.display = 'block';
    toast('Challenge loaded', 'success');
  } catch (e) {
    toast(`Failed to load challenge: ${e.message}`, 'error');
  }
}

async function submitAttempt() {
  if (!STATE.token) { toast('Log in first', 'error'); return; }
  if (!STATE.currentChallenge) { toast('Load a challenge first', 'error'); return; }
  const responseText = $('attempt-response').value.trim();
  if (!responseText) { toast('Enter your response', 'error'); return; }

  try {
    const data = await apiRequest('POST', '/attempts', {
      challenge_id: STATE.currentChallenge.id,
      response_text: responseText,
    }, true);
    renderVerdict(data);
    // Update learner ratios from updated_model if available
    if (data.updated_model) {
      STATE.learner = { ...STATE.learner, ...data.updated_model };
      if (STATE.learner) renderLearner(STATE.learner);
    }
  } catch (e) {
    toast(`Attempt failed: ${e.message}`, 'error');
  }
}

function renderVerdict(data) {
  $('verdict-area').style.display = 'block';
  const area = $('verdict-area');
  const colors = { correct: 'correct', off_by_one: 'off_by_one', incorrect: 'incorrect' };
  const verdictClass = colors[data.verdict] || (data.abstained ? 'abstained' : '');

  let html = `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">`;
  html += `<span class="verdict-badge ${verdictClass}">${data.verdict}${data.abstained ? ' (abstained)' : ''}</span>`;
  if (data.abstained) html += `<span class="verdict-badge abstained">ABSTAINED</span>`;
  html += `</div>`;

  // Diagnosis
  if (data.diagnosis) {
    html += `<div class="card"><div class="card-title">Diagnosis</div><p>${data.diagnosis}</p></div>`;
  }

  // Expected vs Parsed features side by side
  if (data.expected_features || data.parsed_features) {
    html += `<div class="card"><div class="card-title">Feature Comparison</div><div class="feature-compare">`;
    html += `<div class="feature-col"><h4>Expected (${(data.expected_features || []).length})</h4>`;
    (data.expected_features || []).forEach(f => {
      html += `<span class="feature-tag">${typeof f === 'object' ? JSON.stringify(f) : f}</span> `;
    });
    html += `</div><div class="feature-col"><h4>Parsed (${(data.parsed_features || []).length})</h4>`;
    (data.parsed_features || []).forEach(f => {
      html += `<span class="feature-tag">${typeof f === 'object' ? JSON.stringify(f) : f}</span> `;
    });
    html += `</div></div></div>`;
  }

  // Grammar note card
  if (data.grammar_note) {
    const gn = data.grammar_note;
    html += `<div class="card"><div class="card-title">Grammar Note</div>`;
    html += `<p>${gn.text || JSON.stringify(gn)}</p>`;
    if (gn.rule_ref) html += `<p style="font-size:.8rem;color:var(--text-secondary);margin-top:4px;">Rule: ${gn.rule_ref}</p>`;
    html += `</div>`;
  }

  area.innerHTML = html;
}

/* ─── 5. Shloka ─── */
async function loadShloka() {
  try {
    const data = await apiRequest('GET', '/shlokas/today');
    $('shloka-devanagari').textContent = data.devanagari || '';
    $('shloka-iast').textContent = data.iast || '';
    $('shloka-source').textContent = data.source_ref || '';
    $('shloka-metre').textContent = data.metre || '';
    if (data.audio_url) {
      $('shloka-audio').style.display = '';
      $('shloka-audio').innerHTML = `<audio controls src="${data.audio_url}">Audio</audio>`;
    } else {
      $('shloka-audio').style.display = 'none';
    }

    const body = $('shloka-breakdown-body');
    body.innerHTML = '';
    (data.word_breakdown || []).forEach(w => {
      const tr = document.createElement('tr');
      const tdWord = document.createElement('td');
      tdWord.className = 'word';
      tdWord.textContent = w.word || w.sanskrit || w.text || '';
      tdWord.title = w.meaning || w.gloss || w.english || '';
      tdWord.addEventListener('click', () => {
        toast(`"${tdWord.textContent}" → ${tdWord.title}`, 'info');
      });
      tr.appendChild(tdWord);

      const tds = ['transliteration', 'meaning', 'gloss', 'pos', 'root'];
      tds.forEach(k => {
        const td = document.createElement('td');
        td.textContent = w[k] || '';
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    toast('Shloka loaded', 'success');
  } catch (e) {
    toast(`Failed to load shloka: ${e.message}`, 'error');
  }
}

/* ─── 6. Varnamala ─── */
async function loadVarnamala() {
  try {
    const data = await apiRequest('GET', '/grammar/varnamala');
    const grid = data.grid || data.rows || data.varnamala || data;
    renderVarnamala(grid);
    toast('Varnamala loaded', 'success');
  } catch (e) {
    toast(`Failed to load varnamala: ${e.message}`, 'error');
  }
}

function renderVarnamala(grid) {
  const container = $('varnamala-body');
  // Try to figure out the data shape
  const rows = Array.isArray(grid) ? grid : (grid.rows || [grid]);
  if (!rows.length) { container.innerHTML = '<tr><td>No data</td></tr>'; return; }

  let html = '';
  rows.forEach((row, ri) => {
    const cells = Array.isArray(row) ? row : (row.cells || row.columns || [row]);
    const label = row.label || row.place || '';
    html += '<tr>';
    // First cell is the place label (first col of each row)
    html += `<td class="place-label">${label || (ri === 0 ? 'Vowels' : `Row ${ri}`)}</td>`;
    cells.forEach(c => {
      const val = typeof c === 'object' ? (c.char || c.symbol || c.letter || c.text || c.value || JSON.stringify(c)) : c;
      html += `<td>${val}</td>`;
    });
    html += '</tr>';
  });
  container.innerHTML = html;
}

/* ─── 7. Features ─── */
async function loadFeatures() {
  try {
    const data = await apiRequest('GET', '/grammar/features');
    const items = Array.isArray(data) ? data : (data.features || data.taxonomy || [data]);
    const container = $('features-body');
    container.innerHTML = '';
    items.forEach(f => {
      const tr = document.createElement('tr');
      const name = f.name || f.id || f.feature || f.label || JSON.stringify(f);
      const desc = f.description || f.desc || f.meaning || f.category || '';
      const cat = f.category || f.group || '';
      tr.innerHTML = `<td>${name}</td><td>${desc}</td><td>${cat}</td>`;
      container.appendChild(tr);
    });
    toast('Features loaded', 'success');
  } catch (e) {
    toast(`Failed to load features: ${e.message}`, 'error');
  }
}

/* ─── Expose to global scope for onclick handlers ─── */
window.checkHealth = checkHealth;
window.devLogin = devLogin;
window.logout = logout;
window.fetchMe = fetchMe;
window.loadChallenge = loadChallenge;
window.submitAttempt = submitAttempt;
window.loadShloka = loadShloka;
window.loadVarnamala = loadVarnamala;
window.loadFeatures = loadFeatures;