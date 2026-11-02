/**
 * tasktracker.js — MorningRoutineTracker
 *
 * Combines the MorningRoutineTracker config + home page logic into a
 * single SPA section.  Two views are toggled inside #tracker:
 *   • #tracker-setup    — create / edit username and task list
 *   • #tracker-progress — sequential task completion with audio playback
 *
 * Depends on: database.js, recorder.js  (loaded before this file)
 */

// ── State ────────────────────────────────────────────────────────────────────
let trackerTasks           = [];          // { id, name, completed }
let trackerActiveRecTaskId = null;        // which task is currently recording
let trackerIsTransitioning = false;       // guard against double-tap on active card

// ── Helpers ──────────────────────────────────────────────────────────────────
function trackerGenerateId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function trackerEscapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function trackerEscapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Initialise ────────────────────────────────────────────────────────────────
/**
 * Called by app.js when the user navigates to the #tracker section.
 * Decides whether to show the setup or progress view.
 */
function initTracker() {
  const saved = JSON.parse(localStorage.getItem('taskTrackerData'));

  if (saved && saved.tasks && saved.tasks.length > 0) {
    // Normalise tasks (ensure every task has an id)
    trackerTasks = saved.tasks.map((t) =>
      typeof t === 'string'
        ? { id: trackerGenerateId(), name: t, completed: false }
        : { id: t.id || trackerGenerateId(), name: t.name, completed: t.completed || false }
    );
    showTrackerProgress(saved.username || 'User');
  } else {
    // Pre-populate tasks array from saved data (if any partial config exists)
    if (saved) {
      document.getElementById('tracker-username').value = saved.username || '';
      trackerTasks = (saved.tasks || []).map((t) =>
        typeof t === 'string'
          ? { id: trackerGenerateId(), name: t, completed: false }
          : { id: t.id || trackerGenerateId(), name: t.name, completed: t.completed || false }
      );
    } else {
      trackerTasks = [];
    }
    showTrackerSetup();
  }
}

// ── View switching ────────────────────────────────────────────────────────────
function showTrackerSetup() {
  document.getElementById('tracker-setup').classList.remove('d-none');
  document.getElementById('tracker-progress').classList.add('d-none');
  renderTrackerTaskList();
}

function showTrackerProgress(username) {
  document.getElementById('tracker-setup').classList.add('d-none');
  document.getElementById('tracker-progress').classList.remove('d-none');
  document.getElementById('tracker-username-display').textContent = username;
  renderTrackerCards();
  updateTrackerProgress();
}

// ── Setup: task list rendering ────────────────────────────────────────────────
function renderTrackerTaskList() {
  const list       = document.getElementById('tracker-task-list');
  const emptyState = document.getElementById('tracker-empty-state');
  if (!list) return;

  list.innerHTML = '';
  emptyState.style.display = trackerTasks.length === 0 ? 'block' : 'none';

  trackerTasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.className          = 'tracker-list-item';
    li.setAttribute('draggable', 'true');
    li.dataset.index      = index;
    li.dataset.taskId     = task.id;

    li.innerHTML = `
      <span class="tracker-item-number">${index + 1}</span>
      <div class="tracker-item-body">
        <div class="tracker-item-top">
          <input type="text" class="tracker-name-input tracker-input"
            value="${trackerEscapeAttr(task.name)}" maxlength="100"
            placeholder="Task name…" data-index="${index}" aria-label="Task name">
          <div class="tracker-item-actions">
            <button class="move-up-btn"   title="Move Up"   aria-label="Move up"   ${index === 0 ? 'disabled' : ''}>&#9650;</button>
            <button class="move-down-btn" title="Move Down" aria-label="Move down" ${index === trackerTasks.length - 1 ? 'disabled' : ''}>&#9660;</button>
            <button class="tracker-delete-btn" title="Delete task" aria-label="Delete task">&#10005;</button>
          </div>
        </div>
        <div class="tracker-audio-controls" id="tac-${task.id}">
          <div class="tracker-audio-btn-row">
            <button class="btn-rec-action btn-rec-record"  data-tid="${task.id}">🎙 Record</button>
            <button class="btn-rec-action btn-rec-stop"    data-tid="${task.id}" disabled>⏹ Stop</button>
            <button class="btn-rec-action btn-rec-play"    data-tid="${task.id}" disabled>▶ Play</button>
            <button class="btn-rec-action btn-rec-delete"  data-tid="${task.id}" disabled>🗑 Delete</button>
          </div>
          <div class="tracker-rec-status-row">
            <span class="tracker-rec-indicator" id="tri-${task.id}"></span>
            <span class="tracker-rec-timer"     id="trt-${task.id}"></span>
            <span class="tracker-rec-status"    id="trs-${task.id}"></span>
          </div>
        </div>
      </div>`;

    // Live-edit task name
    li.querySelector('.tracker-name-input').addEventListener('input', (e) => {
      trackerTasks[index].name = e.target.value;
    });

    // Reorder / delete
    li.querySelector('.move-up-btn').addEventListener('click',        () => trackerMoveTask(index, -1));
    li.querySelector('.move-down-btn').addEventListener('click',      () => trackerMoveTask(index,  1));
    li.querySelector('.tracker-delete-btn').addEventListener('click', () => trackerDeleteTask(index));

    // Audio buttons
    li.querySelector('.btn-rec-record').addEventListener('click', () => trackerHandleRecord(task.id));
    li.querySelector('.btn-rec-stop').addEventListener('click',   () => trackerHandleStop(task.id));
    li.querySelector('.btn-rec-play').addEventListener('click',   () => trackerHandlePlay(task.id));
    li.querySelector('.btn-rec-delete').addEventListener('click', () => trackerHandleDeleteRec(task.id));

    // Drag & drop
    li.addEventListener('dragstart', trackerDragStart);
    li.addEventListener('dragover',  trackerDragOver);
    li.addEventListener('drop',      trackerDrop);
    li.addEventListener('dragend',   trackerDragEnd);

    list.appendChild(li);
    trackerRefreshAudioUI(task.id);  // async — updates button states
  });
}

// ── Setup: task CRUD ──────────────────────────────────────────────────────────
function trackerAddTask() {
  const input = document.getElementById('tracker-task-input');
  const text  = input.value.trim();
  if (!text) { showToast('Please enter a task name.'); input.focus(); return; }
  trackerTasks.push({ id: trackerGenerateId(), name: text, completed: false });
  input.value = '';
  input.focus();
  renderTrackerTaskList();
}

async function trackerDeleteTask(index) {
  const taskId = trackerTasks[index].id;
  try { await deleteRecording(taskId); } catch { /* no recording — fine */ }
  trackerTasks.splice(index, 1);
  renderTrackerTaskList();
}

function trackerMoveTask(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= trackerTasks.length) return;
  [trackerTasks[index], trackerTasks[newIndex]] = [trackerTasks[newIndex], trackerTasks[index]];
  renderTrackerTaskList();
}

// ── Setup: drag & drop ────────────────────────────────────────────────────────
let _dragIndex = null;

function trackerDragStart(e) {
  _dragIndex = +e.currentTarget.dataset.index;
  e.currentTarget.style.opacity = '0.5';
}
function trackerDragOver(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = 'var(--tracker-primary)';
}
function trackerDrop(e) {
  e.preventDefault();
  const dropIndex = +e.currentTarget.dataset.index;
  if (_dragIndex !== null && _dragIndex !== dropIndex) {
    const [moved] = trackerTasks.splice(_dragIndex, 1);
    trackerTasks.splice(dropIndex, 0, moved);
    renderTrackerTaskList();
  }
  e.currentTarget.style.borderColor = '';
}
function trackerDragEnd(e) {
  e.currentTarget.style.opacity = '1';
  e.currentTarget.style.borderColor = '';
}

// ── Setup: save ───────────────────────────────────────────────────────────────
async function trackerSave() {
  const username = document.getElementById('tracker-username').value.trim();
  if (!username)              { showToast('Please enter your name.');          document.getElementById('tracker-username').focus();    return; }
  if (trackerTasks.length === 0) { showToast('Please add at least one task.'); document.getElementById('tracker-task-input').focus(); return; }

  // Stop any in-progress recording
  if (trackerActiveRecTaskId) await trackerHandleStop(trackerActiveRecTaskId);

  // Preserve completed states for tasks that already exist
  const existing = JSON.parse(localStorage.getItem('taskTrackerData'));
  const existingMap = {};
  if (existing && Array.isArray(existing.tasks)) {
    existing.tasks.forEach((t) => { if (t.id) existingMap[t.id] = t; });
  }

  const data = {
    username,
    tasks: trackerTasks.map((t) => ({
      id:        t.id,
      name:      t.name,
      completed: existingMap[t.id] ? existingMap[t.id].completed : false,
    })),
  };

  localStorage.setItem('taskTrackerData', JSON.stringify(data));

  // Reload tasks from saved data (picks up preserved completed state)
  trackerTasks = data.tasks;
  showToast('Tasks saved! Starting your routine…');
  showTrackerProgress(username);
}

// ── Progress view: render cards ───────────────────────────────────────────────
function renderTrackerCards() {
  const container = document.getElementById('tracker-cards-container');
  if (!container) return;
  container.innerHTML = '';

  const activeIndex = trackerTasks.findIndex((t) => !t.completed);

  trackerTasks.forEach((task, index) => {
    const card = document.createElement('div');
    card.className = 'tracker-task-card';

    if (task.completed) {
      card.classList.add('completed');
    } else if (index === activeIndex) {
      card.classList.add('active');
      card.dataset.index = index;
      card.addEventListener('click', () => trackerHandleTaskClick(index));
    } else {
      card.classList.add('locked');
    }

    card.innerHTML = `
      <div class="tracker-card-number">${index + 1}</div>
      <span class="tracker-card-text">${trackerEscapeHtml(task.name)}</span>
      ${task.completed ? '<i class="fas fa-check-circle ms-auto" style="color:rgba(255,255,255,0.8);font-size:1.2rem;"></i>' : ''}`;

    // Only animate the newly-active card — completed/locked cards re-render without jumping
    if (!task.completed && index === activeIndex) {
      card.style.animation = `slideInUp 0.3s ease both`;
    }
    container.appendChild(card);
  });
}

// ── Progress view: task click ─────────────────────────────────────────────────
const _completionMessages = [
  'Great start! Keep it up! 🚀', 'You\'re on fire! 🔥', 'Awesome work! 💪',
  'Crushing it! ⚡', 'Fantastic progress! 🌟', 'Superb! 🏆',
  'Nailed it! 🎯', 'Brilliant! 💫', 'Well done! 🤖', 'Incredible! 🎉',
];

async function trackerHandleTaskClick(index) {
  if (trackerIsTransitioning) return;
  trackerIsTransitioning = true;

  // ── 1. Update state immediately ──────────────────────────────────────────
  const saved = JSON.parse(localStorage.getItem('taskTrackerData'));
  trackerTasks = saved ? saved.tasks : trackerTasks;

  trackerTasks[index].completed = true;
  localStorage.setItem('taskTrackerData', JSON.stringify({ ...saved, tasks: trackerTasks }));

  const total     = trackerTasks.length;
  const completed = trackerTasks.filter((t) => t.completed).length;
  const msg       = _completionMessages[index % _completionMessages.length];
  showToast(`✅ "${trackerTasks[index].name}" done! ${msg} (${completed}/${total})`);

  // ── 2. Fire celebration immediately (before audio) ───────────────────────
  const isLastTask = completed === total;
  if (!isLastTask && typeof launchTaskConfetti === 'function') launchTaskConfetti();

  // ── 3. Re-render cards & progress immediately ────────────────────────────
  renderTrackerCards();
  updateTrackerProgress();

  // ── 4. Unlock clicks straight away — next task card is already in the DOM ─
  trackerIsTransitioning = false;

  // ── 5. Play audio cue in the background (non-blocking) ───────────────────
  const taskId = trackerTasks[index].id;
  if (taskId) {
    hasAudio(taskId)
      .then((exists) => { if (exists) trackerPlayAndWait(taskId); })
      .catch(() => { /* no audio — ignore */ });
  }
}

function trackerPlayAndWait(taskId) {
  return new Promise(async (resolve) => {
    try {
      const blob = await getAudio(taskId);
      if (!blob || blob.size === 0) { resolve(); return; }
      const url   = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      try { await audio.play(); }
      catch { URL.revokeObjectURL(url); resolve(); }
    } catch { resolve(); }
  });
}

// ── Progress view: progress bar ───────────────────────────────────────────────
function updateTrackerProgress() {
  const total     = trackerTasks.length;
  const completed = trackerTasks.filter((t) => t.completed).length;
  const percent   = total > 0 ? Math.round((completed / total) * 100) : 0;

  const fill    = document.getElementById('tracker-progress-fill');
  const pct     = document.getElementById('tracker-progress-percent');
  const text    = document.getElementById('tracker-progress-text');
  const congrats = document.getElementById('tracker-congrats');
  const cards    = document.getElementById('tracker-cards-container');

  if (fill)    fill.style.width       = `${percent}%`;
  if (pct)     pct.textContent        = `${percent}%`;
  if (text)    text.textContent       = `${completed} of ${total} tasks completed.`;

  const wasAlreadyDone = congrats && !congrats.classList.contains('d-none');

  if (completed === total && total > 0) {
    congrats?.classList.remove('d-none');
    if (cards) cards.style.display = 'none';

    if (!wasAlreadyDone) {
      // Big confetti burst on first completion
      if (typeof launchAllDoneConfetti === 'function') launchAllDoneConfetti();

      // Wire the Print Sticker button — replace node to remove any stale listeners
      const oldBtn = document.getElementById('btn-print-sticker');
      if (oldBtn) {
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.replaceWith(newBtn);
        newBtn.addEventListener('click', connectAndPrint);
      }
    }
  } else {
    congrats?.classList.add('d-none');
    if (cards) cards.style.display = 'block';
  }
}

// ── Progress: reset ───────────────────────────────────────────────────────────
function trackerResetProgress() {
  const saved = JSON.parse(localStorage.getItem('taskTrackerData'));
  if (!saved) return;
  saved.tasks = saved.tasks.map((t) => ({ ...t, completed: false }));
  localStorage.setItem('taskTrackerData', JSON.stringify(saved));
  trackerTasks        = saved.tasks;
  trackerIsTransitioning = false;
  showToast('Progress reset — starting fresh!');
  renderTrackerCards();
  updateTrackerProgress();
}

// ── Audio UI helpers ──────────────────────────────────────────────────────────
async function trackerRefreshAudioUI(taskId) {
  let has = false;
  try { has = await hasAudio(taskId); } catch { has = false; }

  const recBtn  = document.querySelector(`.btn-rec-record[data-tid="${taskId}"]`);
  const stopBtn = document.querySelector(`.btn-rec-stop[data-tid="${taskId}"]`);
  const playBtn = document.querySelector(`.btn-rec-play[data-tid="${taskId}"]`);
  const delBtn  = document.querySelector(`.btn-rec-delete[data-tid="${taskId}"]`);
  const status  = document.getElementById(`trs-${taskId}`);

  if (!recBtn) return;  // element removed from DOM

  if (has) {
    playBtn.disabled = false;
    delBtn.disabled  = false;
    recBtn.textContent = '🎙 Re-record';
    if (status) status.textContent = '✅ Recording saved';
  } else {
    playBtn.disabled = true;
    delBtn.disabled  = true;
    recBtn.textContent = '🎙 Record';
    if (status) status.textContent = '';
  }
  stopBtn.disabled = true;
}

async function trackerHandleRecord(taskId) {
  // Stop any other active recording first
  if (trackerActiveRecTaskId && trackerActiveRecTaskId !== taskId) {
    await trackerHandleStop(trackerActiveRecTaskId);
  }

  const recBtn    = document.querySelector(`.btn-rec-record[data-tid="${taskId}"]`);
  const stopBtn   = document.querySelector(`.btn-rec-stop[data-tid="${taskId}"]`);
  const indicator = document.getElementById(`tri-${taskId}`);
  const timer     = document.getElementById(`trt-${taskId}`);
  const status    = document.getElementById(`trs-${taskId}`);

  recBtn.disabled  = true;
  stopBtn.disabled = false;
  if (indicator) { indicator.classList.add('recording-active'); indicator.textContent = '🔴'; }
  if (timer)       timer.textContent  = '00:00';
  if (status)      status.textContent = 'Recording…';

  try {
    await startRecording(
      taskId,
      (seconds) => {
        if (timer) {
          const m = String(Math.floor(seconds / 60)).padStart(2, '0');
          const s = String(seconds % 60).padStart(2, '0');
          timer.textContent = `${m}:${s}`;
        }
      },
      (id, blob) => {
        trackerActiveRecTaskId = null;
        if (indicator) { indicator.classList.remove('recording-active'); indicator.textContent = ''; }
        if (status) status.textContent = blob && blob.size > 0 ? '✅ Recording saved' : '⚠️ Empty recording';
        trackerRefreshAudioUI(id);
      }
    );
    trackerActiveRecTaskId = taskId;

  } catch (err) {
    trackerActiveRecTaskId = null;
    recBtn.disabled  = false;
    stopBtn.disabled = true;
    if (indicator) { indicator.classList.remove('recording-active'); indicator.textContent = ''; }
    if (timer)       timer.textContent = '';

    if      (err.message.startsWith('PERMISSION_DENIED')) { if (status) status.textContent = '🚫 Microphone denied';    showToast('Microphone access denied. Allow it in browser settings.'); }
    else if (err.message.startsWith('UNSUPPORTED'))       { if (status) status.textContent = '⚠️ Not supported';         showToast('Audio recording not supported in this browser.');          }
    else if (err.message.startsWith('NO_DEVICE'))         { if (status) status.textContent = '⚠️ No microphone found';   showToast('No microphone found on this device.');                     }
    else                                                   { if (status) status.textContent = '⚠️ Recording failed';      showToast('Recording failed. Please try again.'); console.error(err);  }
  }
}

async function trackerHandleStop(taskId) {
  const recBtn  = document.querySelector(`.btn-rec-record[data-tid="${taskId}"]`);
  const stopBtn = document.querySelector(`.btn-rec-stop[data-tid="${taskId}"]`);
  const indicator = document.getElementById(`tri-${taskId}`);
  const timer     = document.getElementById(`trt-${taskId}`);

  if (stopBtn) stopBtn.disabled = true;
  await stopRecording();
  if (indicator) { indicator.classList.remove('recording-active'); indicator.textContent = ''; }
  if (timer)       timer.textContent = '';
  if (recBtn)      recBtn.disabled   = false;
}

async function trackerHandlePlay(taskId) {
  const playBtn = document.querySelector(`.btn-rec-play[data-tid="${taskId}"]`);
  const status  = document.getElementById(`trs-${taskId}`);
  if (playBtn) playBtn.disabled = true;
  if (status)  status.textContent = '▶ Playing…';

  try {
    const audio = await playRecording(taskId, () => {
      if (playBtn) playBtn.disabled = false;
      if (status)  status.textContent = '✅ Recording saved';
    });
    if (!audio) {
      if (playBtn) playBtn.disabled = false;
      if (status)  status.textContent = '⚠️ No recording found';
    }
  } catch (err) {
    if (playBtn) playBtn.disabled = false;
    if (status)  status.textContent = '⚠️ Playback failed';
    console.error('trackerHandlePlay error:', err);
  }
}

async function trackerHandleDeleteRec(taskId) {
  const status = document.getElementById(`trs-${taskId}`);
  try {
    await deleteRecording(taskId);
    if (status) status.textContent = '';
    showToast('Recording deleted.');
    trackerRefreshAudioUI(taskId);
  } catch (err) {
    console.error('trackerHandleDeleteRec error:', err);
    showToast('Could not delete recording.');
  }
}

// ── Wire up static buttons (called once from app.js initTracker) ─────────────
function bindTrackerButtons() {
  document.getElementById('tracker-add-btn')?.addEventListener('click', trackerAddTask);
  document.getElementById('tracker-task-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') trackerAddTask();
  });
  document.getElementById('tracker-save-btn')?.addEventListener('click',  trackerSave);
  document.getElementById('tracker-edit-btn')?.addEventListener('click',  () => {
    const saved = JSON.parse(localStorage.getItem('taskTrackerData'));
    if (saved) {
      document.getElementById('tracker-username').value = saved.username || '';
      trackerTasks = saved.tasks || [];
    }
    showTrackerSetup();
  });
  document.getElementById('tracker-reset-btn')?.addEventListener('click', trackerResetProgress);
}
