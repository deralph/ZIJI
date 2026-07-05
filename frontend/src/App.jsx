import React, { useState, useEffect, useCallback } from 'react';
import { api, setToken, clearToken, hasToken, uploadAudioToCloudinary } from './api.js';

import { ROADMAP, DEFAULT_LINKS } from './roadmap.js';

const TASKS = ['grammar', 'vocab', 'tones', 'input', 'output'];
const pad = (n) => String(n).padStart(2, '0');
const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = dateStr(new Date());

function isComplete(entry) {
  if (!entry) return 0;
  const done = TASKS.filter((t) => entry[t]).length;
  if (done === TASKS.length) return 2;
  if (done > 0) return 1;
  return 0;
}

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [pinField, setPinField] = useState('');

  useEffect(() => {
    api.authStatus().then((s) => {
      setHasPin(s.hasPin);
      setLoggedIn(s.hasPin && hasToken());
      setAuthChecked(true);
    }).catch(() => setAuthChecked(true));
  }, []);

  async function handleSetup(e) {
    e.preventDefault();
    setAuthError('');
    try {
      const { token } = await api.setup(pinField);
      setToken(token);
      setHasPin(true);
      setLoggedIn(true);
    } catch (err) { setAuthError(err.message); }
  }
  async function handleLogin(e) {
    e.preventDefault();
    setAuthError('');
    try {
      const { token } = await api.login(pinField);
      setToken(token);
      setLoggedIn(true);
    } catch (err) { setAuthError(err.message); }
  }
  function handleLogout() {
    clearToken();
    setLoggedIn(false);
  }

  if (!authChecked) return <div className="lock-overlay" style={{ display: 'flex' }}><div className="glyph">字迹</div></div>;

  if (!hasPin) {
    return (
      <div className="lock-overlay" style={{ display: 'flex' }}>
        <form className="lock-card" onSubmit={handleSetup}>
          <div className="glyph">字迹</div>
          <p>This app is reachable at a public URL — create a PIN before you start.</p>
          <input type="password" inputMode="numeric" maxLength={12} placeholder="Choose a PIN (4+ chars)"
            value={pinField} onChange={(e) => setPinField(e.target.value)} autoFocus />
          {authError && <p id="lockError" style={{ display: 'block' }}>{authError}</p>}
          <button className="btn" style={{ width: '100%' }} type="submit">Create PIN & start</button>
        </form>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="lock-overlay" style={{ display: 'flex' }}>
        <form className="lock-card" onSubmit={handleLogin}>
          <div className="glyph">字迹</div>
          <p>Enter your PIN to open your tracker</p>
          <input type="password" inputMode="numeric" maxLength={12} placeholder="••••"
            value={pinField} onChange={(e) => setPinField(e.target.value)} autoFocus />
          {authError && <p id="lockError" style={{ display: 'block' }}>{authError}</p>}
          <button className="btn" style={{ width: '100%' }} type="submit">Unlock</button>
        </form>
      </div>
    );
  }

  return <MainApp onLogout={handleLogout} />;
}

function MainApp({ onLogout }) {
  const [tab, setTab] = useState('today');
  const [dayCount, setDayCount] = useState(0);
  const [streak, setStreak] = useState(0);

  const refreshSidebar = useCallback(async () => {
    let sd = (await api.getStartDate()).startDate;
    if (!sd) { sd = todayStr; await api.setStartDate(sd); }
    const startD = new Date(sd);
    const now = new Date();
    const dn = Math.max(1, Math.min(180, Math.floor((now - startD) / 86400000) + 1));
    setDayCount(dn);

    const all = await api.getMonthDays(''); // all days (empty prefix matches all)
    const complete = new Set(all.filter((d) => isComplete(d) === 2).map((d) => d.date));
    let s = 0, cursor = new Date();
    while (complete.has(dateStr(cursor))) { s++; cursor.setDate(cursor.getDate() - 1); }
    setStreak(s);
  }, []);

  useEffect(() => { refreshSidebar(); }, [refreshSidebar]);

  return (
    <div className="app">
      <div className="mobile-topbar">
        <span className="glyph">字迹</span>
        <span className="info">Day {dayCount}/180 · streak {streak}</span>
      </div>
      <div className="sidebar">
        <div className="brand">
          <div className="glyph">字迹</div>
          <div className="sub">Mandarin Tracker · 6mo</div>
        </div>
        <div className="progress-thread">
          <div className="label">Day {dayCount} / 180</div>
          <div className="thread-track"><div className="thread-fill" style={{ width: (dayCount / 180 * 100) + '%' }} /></div>
        </div>
        <nav>
          {[
            ['today', '今', 'Today'], ['vocab', '词', 'Vocab'], ['practice', '改', 'Practice'],
            ['cards', '卡', 'Cards'], ['calendar', '历', 'Calendar'],
            ['library', '库', 'Library'], ['roadmap', '程', 'Roadmap'], ['stats', '统', 'Stats'],
          ].map(([key, glyph, label]) => (

            <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              <span className="tag">{glyph}</span> {label}
            </button>
          ))}
        </nav>
        <div className="streak-box">
          <div className="n">{streak}</div>
          <div className="l">Day streak</div>
        </div>
      </div>
      <main>
        {tab === 'today' && <TodayPanel onSaved={refreshSidebar} />}
        {tab === 'vocab' && <VocabPanel onChanged={refreshSidebar} />}
        {tab === 'practice' && <PracticePanel />}
        {tab === 'cards' && <FlashcardsPanel />}
        {tab === 'calendar' && <CalendarPanel onChanged={refreshSidebar} />}

        {tab === 'library' && <LibraryPanel />}
        {tab === 'roadmap' && <RoadmapPanel />}
        {tab === 'stats' && <StatsPanel onLogout={onLogout} onChanged={refreshSidebar} />}
      </main>
    </div>
  );
}

// ---------------- TODAY ----------------
function TodayPanel({ onSaved }) {
  const [entry, setEntry] = useState({});
  const [savedMsg, setSavedMsg] = useState(false);
  const [speakSavedMsg, setSpeakSavedMsg] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [clips, setClips] = useState([]);
  const mediaRef = React.useRef(null);
  const chunksRef = React.useRef([]);
  const streamRef = React.useRef(null);

  const loadClips = useCallback(() => { api.getAudio(todayStr).then(setClips); }, []);
  useEffect(() => { api.getDay(todayStr).then((d) => setEntry(d || {})); loadClips(); }, [loadClips]);


  async function save() {
    const updated = await api.saveDay(todayStr, entry);
    setEntry(updated);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
    onSaved();
  }
  async function saveSpeakNote() {
    const updated = await api.saveDay(todayStr, { speakNote: entry.speakNote || '' });
    setEntry(updated);
    setSpeakSavedMsg(true);
    setTimeout(() => setSpeakSavedMsg(false), 2000);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mr.start();
      setRecording(true);
    } catch (e) {
      alert("Couldn't access the microphone. Check your browser's mic permissions for this page.");
    }
  }
  function stopRecording() {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    setRecording(false);
  }
  async function saveClip() {
    if (!audioBlob) return;
    setUploading(true);
    try {
      const { url, publicId } = await uploadAudioToCloudinary(audioBlob);
      await api.saveAudio({ date: todayStr, url, publicId });
      setAudioBlob(null);
      setAudioUrl(null);
      loadClips();
    } catch (e) {
      alert(e.message);
    } finally {
      setUploading(false);
    }
  }
  async function removeClip(id) {
    await api.deleteAudio(id);
    loadClips();
  }


  return (
    <>
      <h1 className="page-title">Today's mark</h1>
      <div className="page-sub">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>

      <div className="card">
        <h2><span className="stamp-mini" />Daily checklist</h2>
        <TaskRow id="grammar" label="Grammar points (2–3, Grammar Wiki)" hint="Write 3 sentences per point" entry={entry} setEntry={setEntry} />
        <TaskRow id="vocab" label="New vocab + sentences" hint="Log new words in the Vocab tab" entry={entry} setEntry={setEntry} />
        <TaskRow id="tones" label="Tone drill / shadowing" hint="10 min, tone pairs or repeat-after-audio" entry={entry} setEntry={setEntry} />
        <TaskRow id="input" label="Comprehensible input" hint="15–50 min depending on month, graded content only" entry={entry} setEntry={setEntry} />
        <TaskRow id="output" label="Output — journal / speaking" hint="Write or say sentences about your day" entry={entry} setEntry={setEntry} />

        <textarea placeholder="Write today's sentences here — this becomes your personal corpus over 6 months."
          value={entry.journal || ''} onChange={(e) => setEntry({ ...entry, journal: e.target.value })} />

        <button className="btn" onClick={save}>Save today</button>
        {savedMsg && <span className="save-msg">Saved ✓</span>}
      </div>

      <div className="card">
        <h2><span className="stamp-mini" />Speaking practice</h2>
        <p className="note">Record, listen back, and save the ones worth keeping — saved clips are stored in Cloudinary and stay attached to today's date.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {!recording && <button className="btn" onClick={startRecording}>● Record</button>}
          {recording && <button className="btn secondary" onClick={stopRecording}>■ Stop</button>}
        </div>
        {audioUrl && (
          <div style={{ marginTop: 14 }}>
            <audio controls src={audioUrl} style={{ display: 'block', width: '100%' }} />
            <button className="btn" onClick={saveClip} disabled={uploading}>{uploading ? 'Saving...' : 'Save this clip'}</button>
          </div>
        )}
        <textarea placeholder="Quick note: which tones/words felt shaky today?"
          value={entry.speakNote || ''} onChange={(e) => setEntry({ ...entry, speakNote: e.target.value })} />
        <button className="btn secondary" onClick={saveSpeakNote}>Save note</button>
        {speakSavedMsg && <span className="save-msg">Saved ✓</span>}

        {clips.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--paper-line)' }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', marginBottom: 8 }}>Saved today</div>
            {clips.map((c) => (
              <div key={c._id} style={{ marginBottom: 10 }}>
                <audio controls src={c.url} style={{ width: '100%' }} />
                <button className="del" onClick={() => removeClip(c._id)}>remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

    </>
  );
}

function TaskRow({ id, label, hint, entry, setEntry }) {
  return (
    <div className="task-row">
      <input type="checkbox" id={'t-' + id} checked={!!entry[id]} onChange={(e) => setEntry({ ...entry, [id]: e.target.checked })} />
      <div className="task-main">
        <label htmlFor={'t-' + id}>{label}</label>
        <div className="hint">{hint}</div>
      </div>
    </div>
  );
}

// ---------------- VOCAB ----------------
function VocabPanel({ onChanged }) {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ word: '', pinyin: '', meaning: '', example: '' });

  const load = useCallback(() => { api.getVocab().then(setList); }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.word || !form.meaning) { alert('At least the character and meaning are needed.'); return; }
    await api.addVocab({ ...form, date: todayStr });
    setForm({ word: '', pinyin: '', meaning: '', example: '' });
    load();
    onChanged();
  }
  async function remove(id) {
    await api.deleteVocab(id);
    load();
    onChanged();
  }

  const filtered = search
    ? list.filter((v) => (v.word + v.pinyin + v.meaning + v.example).toLowerCase().includes(search.toLowerCase()))
    : list;

  return (
    <>
      <h1 className="page-title">词汇 · Vocabulary log</h1>
      <div className="page-sub">Every word you add here stays in your permanent, searchable list.</div>
      <div className="card">
        <h2><span className="stamp-mini" />Add a word</h2>
        <div className="add-link-form" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
          <input type="text" placeholder="汉字" value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} />
          <input type="text" placeholder="pinyin" value={form.pinyin} onChange={(e) => setForm({ ...form, pinyin: e.target.value })} />
          <input type="text" placeholder="meaning" value={form.meaning} onChange={(e) => setForm({ ...form, meaning: e.target.value })} />
          <input type="text" placeholder="example sentence" value={form.example} onChange={(e) => setForm({ ...form, example: e.target.value })} />
        </div>
        <button className="btn" onClick={add}>Add word</button>
      </div>
      <div className="card">
        <div className="field" style={{ width: '100%' }}>
          <label>Search your words</label>
          <input type="text" style={{ width: '100%', padding: 10 }} placeholder="search by character, pinyin, or meaning..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ marginTop: 14 }}>
          {filtered.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>No words yet — add your first one above.</p>}
          {filtered.map((v) => (
            <div className="link-item" key={v._id}>
              <div>
                <div style={{ fontFamily: "'Noto Serif SC',serif", fontSize: 15 }}>
                  {v.word} <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: 'var(--muted)' }}>{v.pinyin}</span>
                </div>
                <div style={{ fontSize: 13 }}>{v.meaning}</div>
                {v.example && <div style={{ fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic' }}>{v.example}</div>}
                <div className="cat">{v.date}</div>
              </div>
              <button className="del" onClick={() => remove(v._id)}>remove</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------------- PRACTICE (reverse practice / AI correction) ----------------
function PracticePanel() {
  const [sentence, setSentence] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(() => { api.getCorrectionHistory().then(setHistory).catch(() => {}); }, []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function submit() {
    if (!sentence.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await api.correctSentence(sentence);
      setResult(r);
      setSentence('');
      loadHistory();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="page-title">改 · Reverse practice</h1>
      <div className="page-sub">Type a sentence in Mandarin. It gets corrected, with a short note on why.</div>
      <div className="card">
        <h2><span className="stamp-mini" />Write a sentence</h2>
        <textarea placeholder="写一个句子... (write a sentence)" value={sentence} onChange={(e) => setSentence(e.target.value)} />
        <button className="btn" onClick={submit} disabled={loading}>{loading ? 'Checking...' : 'Check my sentence'}</button>
        {error && <p className="note" style={{ color: 'var(--seal)' }}>{error}</p>}

        {result && (
          <div style={{ marginTop: 18, padding: 14, background: 'var(--paper-dim)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', marginBottom: 6 }}>Corrected</div>
            <div style={{ fontFamily: "'Noto Serif SC',serif", fontSize: 17, marginBottom: 10 }}>{result.corrected}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-text)' }}>{result.explanation}</div>
          </div>
        )}
      </div>

      <div className="card">
        <h2><span className="stamp-mini" />Recent practice</h2>
        {history.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nothing yet — your corrected sentences will show up here.</p>}
        {history.slice(0, 20).map((h) => (
          <div className="link-item" key={h._id} style={{ display: 'block' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'line-through' }}>{h.original}</div>
            <div style={{ fontFamily: "'Noto Serif SC',serif", fontSize: 15 }}>{h.corrected}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic' }}>{h.explanation}</div>
            <div className="cat">{h.date}</div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------- FLASHCARDS ----------------
function FlashcardsPanel() {
  const [queue, setQueue] = useState(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const load = useCallback(() => {
    api.getDueVocab().then((cards) => { setQueue(cards); setIndex(0); setFlipped(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  async function answer(result) {
    const card = queue[index];
    await api.reviewVocab(card._id, result);
    if (index + 1 < queue.length) {
      setIndex(index + 1);
      setFlipped(false);
    } else {
      load();
    }
  }

  if (queue === null) return <p style={{ color: 'var(--muted)' }}>Loading...</p>;

  return (
    <>
      <h1 className="page-title">卡 · Flashcards</h1>
      <div className="page-sub">Pulled straight from your Vocab log. Cards you know well come back less often.</div>
      <div className="card">
        {queue.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>No words in your Vocab log yet — add some in the Vocab tab first.</p>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>{index + 1} / {queue.length}</div>
            <div
              onClick={() => setFlipped(!flipped)}
              style={{
                cursor: 'pointer', background: 'var(--paper-dim)', borderRadius: 10, padding: '40px 20px',
                textAlign: 'center', minHeight: 140, display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', gap: 10,
              }}
            >
              <div style={{ fontFamily: "'Noto Serif SC',serif", fontSize: 32 }}>{queue[index].word}</div>
              {flipped && (
                <>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: 'var(--muted)' }}>{queue[index].pinyin}</div>
                  <div style={{ fontSize: 15 }}>{queue[index].meaning}</div>
                  {queue[index].example && <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--muted)' }}>{queue[index].example}</div>}
                </>
              )}
              {!flipped && <div style={{ fontSize: 12, color: 'var(--muted)' }}>tap to flip</div>}
            </div>

            {flipped && (
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="btn secondary" style={{ flex: 1 }} onClick={() => answer('still_learning')}>Still learning</button>
                <button className="btn" style={{ flex: 1, background: 'var(--jade)' }} onClick={() => answer('got_it')}>Got it ✓</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ---------------- CALENDAR ----------------

function CalendarPanel({ onChanged }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [entries, setEntries] = useState({});
  const [editingDate, setEditingDate] = useState(null);
  const [editEntry, setEditEntry] = useState({});

  const load = useCallback(async () => {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const monthPrefix = `${y}-${pad(m + 1)}`;
    const days = await api.getMonthDays(monthPrefix);
    const map = {};
    days.forEach((d) => { map[d.date] = d; });
    setEntries(map);
  }, [viewDate]);
  useEffect(() => { load(); }, [load]);

  const y = viewDate.getFullYear(), m = viewDate.getMonth();
  const first = new Date(y, m, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function openEdit(ds) {
    setEditingDate(ds);
    setEditEntry(entries[ds] || {});
  }
  async function saveEdit() {
    await api.saveDay(editingDate, editEntry);
    setEditingDate(null);
    load();
    onChanged();
  }

  return (
    <>
      <h1 className="page-title">六个月历 · Six-month calendar</h1>
      <div className="page-sub">Each square is one day. Tap any square to log or edit it. Full stamp = all 5 tasks done, half stamp = partial.</div>
      <div className="card">
        <div className="cal-header">
          <div className="month-label">{viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
          <div className="cal-nav">
            <button onClick={() => setViewDate(new Date(y, m - 1, 1))}>← Prev</button>
            <button onClick={() => setViewDate(new Date(y, m + 1, 1))}>Next →</button>
          </div>
        </div>
        <div className="weekday-row">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="cal-grid">
          {cells.map((day, i) => {
            if (day === null) return <div className="tzg empty" key={'e' + i} />;
            const ds = `${y}-${pad(m + 1)}-${pad(day)}`;
            const status = isComplete(entries[ds]);
            return (
              <div className={'tzg' + (ds === todayStr ? ' today' : '')} key={ds} onClick={() => openEdit(ds)}>
                <span className="num">{day}</span>
                {status === 2 && <span className="stamp full">学</span>}
                {status === 1 && <span className="stamp partial">半</span>}
              </div>
            );
          })}
        </div>
        <div className="legend">
          <span><span className="dot" style={{ background: 'var(--seal)' }} />Complete</span>
          <span><span className="dot" style={{ background: 'var(--gold)' }} />Partial</span>
          <span><span className="dot" style={{ background: '#fbf8ee', border: '1px solid var(--paper-line)' }} />No entry</span>
        </div>
      </div>

      {editingDate && (
        <div className="card">
          <h2>Edit — {editingDate}</h2>
          {TASKS.map((t) => (
            <div className="task-row" key={t}>
              <input type="checkbox" id={'e-' + t} checked={!!editEntry[t]}
                onChange={(e) => setEditEntry({ ...editEntry, [t]: e.target.checked })} />
              <label htmlFor={'e-' + t} style={{ textTransform: 'capitalize' }}>{t}</label>
            </div>
          ))}
          <textarea placeholder="Journal for this day..." value={editEntry.journal || ''}
            onChange={(e) => setEditEntry({ ...editEntry, journal: e.target.value })} />
          <textarea placeholder="Speaking/tone note for this day..." value={editEntry.speakNote || ''}
            onChange={(e) => setEditEntry({ ...editEntry, speakNote: e.target.value })} />
          <button className="btn" onClick={saveEdit}>Save changes</button>
          <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => setEditingDate(null)}>Close</button>
        </div>
      )}
    </>
  );
}

// ---------------- LIBRARY ----------------
function LibraryPanel() {
  const [custom, setCustom] = useState([]);
  const [form, setForm] = useState({ title: '', url: '', cat: 'Grammar' });

  const load = useCallback(() => { api.getLinks().then(setCustom); }, []);
  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.title || !form.url) return;
    await api.addLink(form);
    setForm({ title: '', url: '', cat: 'Grammar' });
    load();
  }
  async function remove(id) { await api.deleteLink(id); load(); }

  const all = [...DEFAULT_LINKS.map((l) => ({ ...l, custom: false })), ...custom.map((l) => ({ ...l, custom: true }))];
  const cats = [...new Set(all.map((l) => l.cat))];

  return (
    <>
      <h1 className="page-title">资料库 · Resource library</h1>
      <div className="page-sub">Everything from the roadmap, plus anything you find along the way.</div>
      <div className="card">
        <div className="lib-grid">
          {cats.map((cat) => (
            <div key={cat}>
              <h2>{cat}</h2>
              {all.filter((l) => l.cat === cat).map((l, i) => (
                <div className="link-item" key={l._id || l.title + i}>
                  <div><a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a></div>
                  {l.custom && <button className="del" onClick={() => remove(l._id)}>remove</button>}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="add-link-form">
          <input type="text" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input type="text" placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <select value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
            {['Grammar', 'Vocabulary', 'Video', 'Podcast', 'Tool', 'Other'].map((c) => <option key={c}>{c}</option>)}
          </select>
          <button className="btn" style={{ marginTop: 0 }} onClick={add}>Add link</button>
        </div>
      </div>
    </>
  );
}

// ---------------- ROADMAP ----------------
function RoadmapPanel() {
  return (
    <>
      <h1 className="page-title">六个月计划 · The 6-month plan</h1>
      <div className="page-sub">Target: HSK3–4 conversational competence in 6 months. Not abstract "fluency" — real, usable ability.</div>
      <div className="card">
        {ROADMAP.map((m, i) => (
          <details className="month-block" key={m.month} open={i === 0}>
            <summary>{m.month} — {m.title} <span className="arrow">▸</span></summary>
            <div className="content">
              {m.weeks.map((w) => (
                <div className="week-block" key={w.label}>
                  <div className="wk-title">{w.label}</div>
                  <ul>{w.items.map((it, idx) => <li key={idx}>{it}</li>)}</ul>
                  <div className="milestone"><strong>Weekend:</strong> {w.weekend}</div>
                </div>
              ))}
              <div className="milestone" style={{ borderLeftColor: 'var(--seal)', fontWeight: 600 }}>{m.milestone}</div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}

// ---------------- STATS ----------------
function StatsPanel({ onLogout, onChanged }) {
  const [stats, setStats] = useState({ days: 0, streak: 0, longest: 0, words: 0, corrections: 0, mastered: 0, clips: 0 });
  const [weekly, setWeekly] = useState([]);
  const [startDate, setStartDateField] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');

  useEffect(() => {
    (async () => {
      const all = await api.getMonthDays('');
      const vocab = await api.getVocab();
      const sd = (await api.getStartDate()).startDate || todayStr;
      setStartDateField(sd);

      const [corrections, allClips] = await Promise.all([
        api.getCorrectionHistory().catch(() => []),
        api.getAudio().catch(() => []),
      ]);
      const mastered = vocab.filter((v) => (v.box || 1) >= 5).length;


      const completeSet = new Set(all.filter((d) => isComplete(d) === 2).map((d) => d.date));
      const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date));
      let longest = 0, run = 0, prev = null;
      sorted.forEach((e) => {
        if (isComplete(e) === 2) {
          run = prev && (new Date(e.date) - new Date(prev)) / 86400000 === 1 ? run + 1 : 1;
          prev = e.date;
          longest = Math.max(longest, run);
        } else { run = 0; prev = e.date; }
      });
      let curStreak = 0, cursor = new Date();
      while (completeSet.has(dateStr(cursor))) { curStreak++; cursor.setDate(cursor.getDate() - 1); }

      setStats({
        days: all.length, streak: curStreak, longest, words: vocab.length,
        corrections: corrections.length, mastered, clips: allClips.length,
      });


      const byWeek = {};
      sorted.forEach((e) => {
        const d = new Date(e.date);
        const onejan = new Date(d.getFullYear(), 0, 1);
        const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
        const key = `${d.getFullYear()}-W${week}`;
        byWeek[key] = byWeek[key] || [];
        byWeek[key].push(e);
      });
      const weekKeys = Object.keys(byWeek).sort().slice(-8);
      setWeekly(weekKeys.map((wk) => ({
        wk, pct: Math.round((byWeek[wk].filter((d) => isComplete(d) === 2).length / 7) * 100),
      })));
    })();
  }, []);

  async function saveStart() {
    await api.setStartDate(startDate);
    onChanged();
  }
  async function changePin() {
    if (newPin.length < 4) { setPinMsg('Use at least 4 characters.'); return; }
    try { await api.changePin(newPin); setPinMsg('PIN updated.'); setNewPin(''); }
    catch (e) { setPinMsg(e.message); }
  }

  async function exportBackup() {
    const days = await api.getMonthDays('');
    const vocab = await api.getVocab();
    const links = await api.getLinks();
    const sd = await api.getStartDate();
    const payload = { exportedAt: new Date().toISOString(), days, vocab, links, startDate: sd.startDate };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ziji-backup-${todayStr}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <h1 className="page-title">统计 · Stats</h1>
      <div className="page-sub">Your actual record, not a guess.</div>
      <div className="card">
        <div className="stat-grid">
          <div className="stat-card"><div className="n">{stats.days}</div><div className="l">Days logged</div></div>
          <div className="stat-card"><div className="n">{stats.streak}</div><div className="l">Current streak</div></div>
          <div className="stat-card"><div className="n">{stats.longest}</div><div className="l">Longest streak</div></div>
          <div className="stat-card"><div className="n">{stats.words}</div><div className="l">Words logged</div></div>
          <div className="stat-card"><div className="n">{stats.mastered}</div><div className="l">Words mastered</div></div>
          <div className="stat-card"><div className="n">{stats.corrections}</div><div className="l">Sentences corrected</div></div>
          <div className="stat-card"><div className="n">{stats.clips}</div><div className="l">Audio clips saved</div></div>
        </div>
      </div>

      <div className="card">
        <h2>Weekly completion</h2>
        {weekly.length === 0 && <p style={{ color: 'var(--muted)', fontSize: 13 }}>No entries yet — log a few days to see your weekly trend here.</p>}
        {weekly.map((w) => (
          <div className="bar-row" key={w.wk}>
            <div className="wk">{w.wk}</div>
            <div className="bar-track"><div className="bar-fill" style={{ width: w.pct + '%' }} /></div>
            <div className="pct">{w.pct}%</div>
          </div>
        ))}
      </div>
      <div className="card">
        <h2>Start date</h2>
        <div className="row-inline" style={{ marginTop: 0 }}>
          <div className="field"><label>Program start</label><input type="date" value={startDate} onChange={(e) => setStartDateField(e.target.value)} /></div>
        </div>
        <button className="btn secondary" onClick={saveStart}>Update start date</button>
      </div>
      <div className="card">
        <h2>Security</h2>
        <p className="note">Your PIN is verified on the server before any data is returned — this is real access control, not just a client-side gate.</p>
        <div className="row-inline" style={{ marginTop: 0 }}>
          <div className="field"><label>New PIN (4+ chars)</label><input type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value)} /></div>
        </div>
        <button className="btn secondary" onClick={changePin}>Change PIN</button>
        <button className="btn" style={{ background: 'var(--seal-dim)' }} onClick={onLogout}>Log out</button>
        {pinMsg && <p className="note" style={{ marginTop: 10 }}>{pinMsg}</p>}
      </div>
      <div className="card">
        <h2>Backup</h2>
        <p className="note">Your data lives in your own MongoDB database — export a copy anytime for extra peace of mind.</p>
        <button className="btn secondary" onClick={exportBackup}>Export backup (.json)</button>
      </div>
    </>
  );
}
