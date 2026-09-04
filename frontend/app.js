/* ─── Shabd Test Console — App Logic ─── */

const STATE = {
  baseUrl: localStorage.getItem('shabd_base_url') || 'http://localhost:8000',
  token: localStorage.getItem('shabd_token') || null,
  learner: null,
  currentChallenge: null,
  // Speech
  mediaRecorder: null,
  recordedChunks: [],
  recordingBlob: null,
  isRecording: false,
  recordingStartTime: null,
  recordingTimerInterval: null,
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

  // TTS char counter
  $('tts-text').addEventListener('input', () => {
    const len = $('tts-text').value.length;
    const counter = $('tts-char-count');
    counter.textContent = `${len} / 2500`;
    counter.classList.toggle('over', len > 2500);
  });

  // TTS pace display
  $('tts-pace').addEventListener('input', () => {
    $('tts-pace-display').textContent = `${parseFloat($('tts-pace').value).toFixed(1)}×`;
  });

  // STT file display
  $('stt-file').addEventListener('change', () => {
    const file = $('stt-file').files[0];
    $('stt-file-name').textContent = file ? `📎 ${file.name} (${(file.size / 1024).toFixed(1)} KB)` : '';
  });

  // Restore token
  if (STATE.token) {
    fetchMe().catch(() => {
      STATE.token = null;
      localStorage.removeItem(TOKEN_KEY);
    });
  }
});

/* ─── API Wrapper (JSON) ─── */
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

/* ─── API Wrapper (FormData / Multipart) ─── */
async function apiFormData(method, path, formData, auth = false) {
  const url = STATE.baseUrl + path;
  const opts = { method, body: formData };
  // Don't set Content-Type — browser sets it with boundary
  if (auth && STATE.token) {
    opts.headers = { 'Authorization': `Bearer ${STATE.token}` };
  }

  const start = performance.now();
  let res;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    logRequest(method, path, 0, `Network error: ${err.message}`, start);
    throw err;
  }
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
  const colors = { correct: 'correct', off_by_one: 'off_by_one', incorrect: 'incorrect', unsure: 'abstained' };
  const verdictClass = colors[data.verdict] || '';

  let html = `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">`;
  html += `<span class="verdict-badge ${verdictClass}">${data.verdict}</span>`;
  if (data.abstained) html += `<span class="verdict-badge abstained">ABSTAINED</span>`;
  html += `</div>`;

  if (data.diagnosis) {
    html += `<div class="card"><div class="card-title">Diagnosis</div><p>${data.diagnosis}</p></div>`;
  }

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

  if (data.grammar_note) {
    const gn = data.grammar_note;
    html += `<div class="card"><div class="card-title">Grammar Note</div>`;
    html += `<p>${gn.note || JSON.stringify(gn)}</p>`;
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
  const rows = Array.isArray(grid) ? grid : (grid.rows || [grid]);
  if (!rows.length) { container.innerHTML = '<tr><td>No data</td></tr>'; return; }

  let html = '';
  rows.forEach((row, ri) => {
    const cells = Array.isArray(row) ? row : (row.cells || row.columns || [row]);
    const label = row.label || row.place || '';
    html += '<tr>';
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

/* ─── 8. Metrics (admin) — escape rate + TTS share ─── */
async function loadMetrics() {
  const adminToken = $('admin-token').value.trim();
  if (!adminToken) { toast('Enter the admin token', 'error'); return; }
  const hours = parseInt($('metrics-hours').value, 10) || 24;

  const path = `/admin/metrics?hours=${hours}`;
  const url = STATE.baseUrl + path;
  const start = performance.now();
  let res;
  try {
    res = await fetch(url, { headers: { 'X-Admin-Token': adminToken } });
  } catch (err) {
    logRequest('GET', path, 0, `Network error: ${err.message}`, start);
    toast(`Metrics failed: ${err.message}`, 'error');
    return;
  }
  let data;
  try {
    data = await res.json();
  } catch {
    data = { raw: await res.text().catch(() => '(empty)') };
  }
  logRequest('GET', path, res.status, JSON.stringify(data).slice(0, 500), start);

  if (!res.ok) {
    toast(`Metrics error: ${data.detail || data.message || `HTTP ${res.status}`}`, 'error');
    return;
  }

  const at = new Date().toLocaleTimeString();
  const er = data.escape_rate || {};
  const ts = data.tts_share || {};
  const top = data.top_escape_nodes || [];
  const liveShare = (ts.live_share ?? 0) * 100;

  let html = '';
  html += `<div style="font-size:.78rem;color:var(--text-secondary);margin-bottom:10px;">Fetched ${at} · window ${hours}h</div>`;
  html += `<div class="learner-info" style="margin-bottom:14px;">`;
  html += `<div><div class="stat-label">Escape rate</div><div class="stat-value">${Math.round(er.rate * 100)}% <span style="font-size:.75rem;color:var(--text-secondary);">(${er.escapes} of ${er.turns} turns)</span></div></div>`;
  html += `<div><div class="stat-label">Live-vs-prerendered TTS</div><div class="stat-value">${Math.round(liveShare)}% live <span style="font-size:.75rem;color:var(--text-secondary);">(${ts.live_chars} live / ${ts.prerendered_chars} pre-rendered chars)</span></div></div>`;
  html += `</div>`;
  html += `<div class="card"><div class="card-title">Top escape nodes <span style="font-weight:400;font-size:.78rem;">— authoring priority queue</span></div>`;
  if (top.length) {
    html += '<table class="features-table"><thead><tr><th>Node</th><th>Scenario</th><th>Escapes</th></tr></thead><tbody>';
    top.forEach(n => {
      html += `<tr><td><code>${n.node_id}</code></td><td><code>${n.scenario_id}</code></td><td>${n.escapes}</td></tr>`;
    });
    html += '</tbody></table>';
  } else {
    html += '<div style="color:var(--text-secondary);font-size:.85rem;">No escapes recorded — nothing to repair yet.</div>';
  }
  html += '</div>';

  $('metrics-result').innerHTML = html;
  toast('Metrics loaded', 'success');
}

/* ─── 9. TTS — Text-to-Speech ─── */
async function generateTTS() {
  if (!STATE.token) { toast('Log in first', 'error'); return; }
  const text = $('tts-text').value.trim();
  if (!text) { toast('Enter some text', 'error'); return; }
  if (text.length > 2500) { toast('Text exceeds 2500 character limit', 'error'); return; }

  const btn = $('tts-generate-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Generating…';

  try {
    const data = await apiRequest('POST', '/speech/tts', {
      text: text,
      language_code: $('tts-language').value,
      speaker: $('tts-speaker').value,
      pace: parseFloat($('tts-pace').value),
    }, true);

    // Decode base64 audio and create playback
    const audioBytes = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
    const blob = new Blob([audioBytes], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    $('tts-audio').src = url;
    $('tts-output').style.display = 'block';
    toast('Audio generated successfully', 'success');
  } catch (e) {
    toast(`TTS failed: ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔊 Generate Audio';
  }
}

/* ─── 9. STT — Speech-to-Text ─── */

// --- Recording ---
function toggleRecording() {
  if (STATE.isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    STATE.recordedChunks = [];
    STATE.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    STATE.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) STATE.recordedChunks.push(e.data);
    };

    STATE.mediaRecorder.onstop = () => {
      STATE.recordingBlob = new Blob(STATE.recordedChunks, { type: 'audio/webm' });
      stream.getTracks().forEach(t => t.stop());
      $('stt-file-name').textContent = `🎙️ Recording (${(STATE.recordingBlob.size / 1024).toFixed(1)} KB)`;
      toast('Recording saved', 'success');
    };

    STATE.mediaRecorder.start(100);
    STATE.isRecording = true;
    STATE.recordingStartTime = Date.now();

    // UI updates
    $('record-btn').classList.add('recording');
    $('record-btn-text').textContent = 'Stop';
    $('recording-dot').classList.add('active');

    // Timer
    STATE.recordingTimerInterval = setInterval(() => {
      const elapsed = (Date.now() - STATE.recordingStartTime) / 1000;
      $('recording-timer').textContent = `${elapsed.toFixed(1)}s`;
    }, 100);

    toast('Recording started — speak now', 'info');
  } catch (e) {
    toast(`Microphone access denied: ${e.message}`, 'error');
  }
}

function stopRecording() {
  if (STATE.mediaRecorder && STATE.mediaRecorder.state !== 'inactive') {
    STATE.mediaRecorder.stop();
  }
  STATE.isRecording = false;

  // UI updates
  $('record-btn').classList.remove('recording');
  $('record-btn-text').textContent = 'Record';
  $('recording-dot').classList.remove('active');
  clearInterval(STATE.recordingTimerInterval);
}

// --- Transcription ---
async function transcribeAudio() {
  if (!STATE.token) { toast('Log in first', 'error'); return; }

  // Determine audio source: file upload takes priority, then recording
  const fileInput = $('stt-file');
  let audioBlob = null;
  let filename = 'audio.webm';

  if (fileInput.files.length > 0) {
    audioBlob = fileInput.files[0];
    filename = audioBlob.name;
  } else if (STATE.recordingBlob) {
    audioBlob = STATE.recordingBlob;
    filename = 'recording.webm';
  }

  if (!audioBlob) {
    toast('Upload an audio file or record something first', 'error');
    return;
  }

  const btn = $('stt-transcribe-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Transcribing…';

  try {
    const fd = new FormData();
    fd.append('file', audioBlob, filename);
    fd.append('language_code', $('stt-language').value);
    fd.append('mode', $('stt-mode').value);

    const data = await apiFormData('POST', '/speech/stt', fd, true);

    $('stt-transcript').textContent = data.transcript || '(empty)';
    $('stt-detected-lang').textContent = data.language_code || '—';
    $('stt-output').style.display = 'block';
    toast('Transcription complete', 'success');
  } catch (e) {
    toast(`STT failed: ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🎤 Transcribe';
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
window.loadMetrics = loadMetrics;
window.generateTTS = generateTTS;
window.toggleRecording = toggleRecording;
window.transcribeAudio = transcribeAudio;