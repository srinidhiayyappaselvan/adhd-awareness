// ===== recorder.js =====
// MediaRecorder wrapper for per-task voice recording.
// Depends on: database.js (saveAudio, getAudio, deleteAudio, hasAudio)

let _mediaRecorder   = null;
let _audioChunks     = [];
let _recordingStream = null;
let _timerInterval   = null;
let _secondsElapsed  = 0;
let _currentTaskId   = null;
let _onTickCallback  = null;
let _onStopCallback  = null;

function _getSupportedMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

async function startRecording(taskId, onTick, onStop) {
  if (!taskId) throw new Error('startRecording: taskId is required.');

  if (_mediaRecorder && _mediaRecorder.state !== 'inactive') {
    await stopRecording();
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
    throw new Error('UNSUPPORTED: Your browser does not support audio recording.');
  if (typeof MediaRecorder === 'undefined')
    throw new Error('UNSUPPORTED: MediaRecorder API is not available in this browser.');

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (err) {
    if (err.name === 'NotAllowedError'  || err.name === 'PermissionDeniedError') throw new Error('PERMISSION_DENIED: Microphone access was denied.');
    if (err.name === 'NotFoundError'    || err.name === 'DevicesNotFoundError')  throw new Error('NO_DEVICE: No microphone was found on this device.');
    throw new Error(`MIC_ERROR: ${err.message}`);
  }

  _currentTaskId   = taskId;
  _recordingStream = stream;
  _audioChunks     = [];
  _secondsElapsed  = 0;
  _onTickCallback  = onTick  || null;
  _onStopCallback  = onStop  || null;

  const mimeType = _getSupportedMimeType();
  try {
    _mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
  } catch {
    _mediaRecorder = new MediaRecorder(stream);
  }

  _mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) _audioChunks.push(event.data);
  };

  _mediaRecorder.onstop = async () => {
    _recordingStream.getTracks().forEach((t) => t.stop());
    _recordingStream = null;

    const mimeUsed = _mediaRecorder.mimeType || 'audio/webm';
    const blob     = new Blob(_audioChunks, { type: mimeUsed });
    _audioChunks   = [];

    try { await saveAudio(_currentTaskId, blob); }
    catch (e) { console.error('recorder.js: Failed to save audio:', e); }

    if (typeof _onStopCallback === 'function') _onStopCallback(_currentTaskId, blob);
    _mediaRecorder = null;
  };

  _mediaRecorder.start(250);

  _timerInterval = setInterval(() => {
    _secondsElapsed += 1;
    if (typeof _onTickCallback === 'function') _onTickCallback(_secondsElapsed);
  }, 1000);
}

function stopRecording() {
  return new Promise((resolve) => {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    if (!_mediaRecorder || _mediaRecorder.state === 'inactive') { resolve(); return; }

    const originalOnStop     = _mediaRecorder.onstop;
    _mediaRecorder.onstop    = async (event) => {
      if (originalOnStop) await originalOnStop(event);
      resolve();
    };
    _mediaRecorder.stop();
  });
}

async function playRecording(taskId, onEnded) {
  if (!taskId) throw new Error('playRecording: taskId is required.');
  let blob;
  try   { blob = await getAudio(taskId); }
  catch (err) { console.error('playRecording: IndexedDB read failed:', err); return null; }

  if (!blob || blob.size === 0) return null;

  const url   = URL.createObjectURL(blob);
  const audio = new Audio(url);

  audio.onended = () => { URL.revokeObjectURL(url); if (typeof onEnded === 'function') onEnded(); };
  audio.onerror = () => { URL.revokeObjectURL(url); if (typeof onEnded === 'function') onEnded(); };

  try   { await audio.play(); }
  catch (e) { URL.revokeObjectURL(url); if (typeof onEnded === 'function') onEnded(); return null; }

  return audio;
}

async function deleteRecording(taskId) {
  if (!taskId) throw new Error('deleteRecording: taskId is required.');
  const exists = await hasAudio(taskId);
  if (!exists) return false;
  await deleteAudio(taskId);
  return true;
}

function isRecording() {
  return _mediaRecorder !== null && _mediaRecorder.state === 'recording';
}
