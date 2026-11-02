/**
 * LocalStorage helpers — MorningRoutineTracker
 * Namespaced under 'smartaware_' to avoid collision with taskTrackerData
 */

const STORAGE_KEYS = {
  responses:     'smartaware_responses',
  results:       'smartaware_results',
  childInfo:     'smartaware_child_info',   // "Additional Information" entered before the assessment
  darkMode:      'smartaware_dark_mode',
  morningRoutine:'smartaware_morning_routine',
};

function saveResponses(responses) {
  localStorage.setItem(STORAGE_KEYS.responses, JSON.stringify(responses));
}
function loadResponses() {
  const raw = localStorage.getItem(STORAGE_KEYS.responses);
  return raw ? JSON.parse(raw) : null;
}

function saveResults(results) {
  localStorage.setItem(STORAGE_KEYS.results, JSON.stringify(results));
}
function loadResults() {
  const raw = localStorage.getItem(STORAGE_KEYS.results);
  return raw ? JSON.parse(raw) : null;
}

/** Save the "Additional Information" entered before starting the assessment (e.g. child's age). */
function saveChildInfo(info) {
  localStorage.setItem(STORAGE_KEYS.childInfo, JSON.stringify(info));
}
/** Load the saved additional information, or null if none. */
function loadChildInfo() {
  const raw = localStorage.getItem(STORAGE_KEYS.childInfo);
  return raw ? JSON.parse(raw) : null;
}

function saveDarkMode(isDark) {
  localStorage.setItem(STORAGE_KEYS.darkMode, isDark ? '1' : '0');
}
function loadDarkMode() {
  return localStorage.getItem(STORAGE_KEYS.darkMode) === '1';
}

function saveMorningRoutine(checked) {
  localStorage.setItem(STORAGE_KEYS.morningRoutine, JSON.stringify(checked));
}
function loadMorningRoutine(length) {
  const raw = localStorage.getItem(STORAGE_KEYS.morningRoutine);
  return raw ? JSON.parse(raw) : new Array(length).fill(false);
}

function clearAssessmentData() {
  localStorage.removeItem(STORAGE_KEYS.responses);
  localStorage.removeItem(STORAGE_KEYS.results);
  localStorage.removeItem(STORAGE_KEYS.childInfo);
}
