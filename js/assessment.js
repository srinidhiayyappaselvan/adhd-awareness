/**
 * Assessment questionnaire logic — MorningRoutineTracker
 *
 * Parent-friendly Yes/No questionnaire (18 questions) across three sections:
 *   Section A — Inattention     (Q1–Q9)
 *   Section B — Hyperactivity   (Q10–Q15)
 *   Section C — Impulsivity      (Q16–Q18)
 *
 * Before the questions begin, the parent enters "Additional Information"
 * (the child's age). No scores, thresholds or diagnoses are produced here.
 */

let currentQuestionIndex = 0;
let assessmentResponses = new Array(TOTAL_QUESTIONS).fill(null);

/** A response is valid only if it is "yes", "no" or (for in-progress) null. */
function isValidResponse(v) {
  return v === 'yes' || v === 'no' || v === null;
}

/** Ordered, flat list of all questions with their section metadata. */
function getFlatQuestions() {
  const flat = [];
  let idx = 0;
  ASSESSMENT_QUESTIONS.forEach((group) => {
    group.items.forEach((text) => {
      flat.push({ text, section: group.section, sectionTitle: group.sectionTitle, description: group.description, globalIndex: idx });
      idx += 1;
    });
  });
  return flat;
}

/* ── Pre-assessment "Additional Information" step (child's age) ─────────────── */
function showAssessmentSetup() {
  document.getElementById('assessment-setup')?.classList.remove('d-none');
  document.getElementById('assessment-flow')?.classList.add('d-none');
}

function showAssessmentFlow() {
  document.getElementById('assessment-setup')?.classList.add('d-none');
  document.getElementById('assessment-flow')?.classList.remove('d-none');
}

/** Validate the child's age and start the questions. */
function beginAssessment() {
  const ageInput = document.getElementById('child-age');
  if (!ageInput) return;
  const ageNum = parseInt(ageInput.value, 10);
  if (!ageNum || isNaN(ageNum) || ageNum < 6 || ageNum > 100) {
    showToast('Please enter your child\u2019s age (6 years or above) to begin.');
    ageInput.focus();
    return;
  }
  saveChildInfo({ age: ageNum });
  showAssessmentFlow();
  currentQuestionIndex = 0;
  renderQuestion();
}

function initAssessment() {
  const saved = loadResponses();
  if (saved && saved.length === TOTAL_QUESTIONS && saved.every(isValidResponse)) {
    assessmentResponses = saved;
    const firstUnanswered = assessmentResponses.findIndex((v) => !(v === 'yes' || v === 'no'));
    currentQuestionIndex = firstUnanswered === -1 ? TOTAL_QUESTIONS - 1 : firstUnanswered;
  } else {
    assessmentResponses = new Array(TOTAL_QUESTIONS).fill(null);
    currentQuestionIndex = 0;
  }

  // If the child's age is already on file, jump straight into the questions.
  const info = loadChildInfo();
  if (info && info.age) {
    showAssessmentFlow();
    renderQuestion();
  } else {
    showAssessmentSetup();
  }
}

function renderQuestion() {
  const questions = getFlatQuestions();
  const q = questions[currentQuestionIndex];
  const container = document.getElementById('question-container');
  const progressBar = document.getElementById('assessment-progress');
  const counter = document.getElementById('question-counter');
  const sectionLabel = document.getElementById('section-label');

  if (!container) return;

  const progress = ((currentQuestionIndex + 1) / TOTAL_QUESTIONS) * 100;
  progressBar.style.width = `${progress}%`;
  progressBar.parentElement.setAttribute('aria-valuenow', progress);
  counter.textContent = `Question ${currentQuestionIndex + 1} of ${TOTAL_QUESTIONS}`;
  sectionLabel.textContent = `Section ${q.section}: ${q.sectionTitle}`;
  const sectionDesc = document.getElementById('section-description');
  if (sectionDesc) sectionDesc.textContent = q.description || '';

  const optionsHtml = RESPONSE_OPTIONS.map(
    (opt) => `
    <label class="option-card option-yesno ${assessmentResponses[q.globalIndex] === opt.value ? 'selected' : ''}"
           role="radio" aria-checked="${assessmentResponses[q.globalIndex] === opt.value}">
      <input type="radio" name="q${q.globalIndex}" value="${opt.value}"
        ${assessmentResponses[q.globalIndex] === opt.value ? 'checked' : ''}
        aria-label="${opt.label}">
      <span class="option-icon" aria-hidden="true">
        <i class="fas ${opt.value === 'yes' ? 'fa-check' : 'fa-xmark'}"></i>
      </span>
      <span class="option-label">${opt.label}</span>
    </label>`
  ).join('');

  container.innerHTML = `
    <div class="question-card glass-card">
      <p class="question-number">Q${currentQuestionIndex + 1}</p>
      <h3 class="question-text">${q.text}</h3>
      <div class="options-grid options-yesno" role="radiogroup" aria-label="Yes or No">
        ${optionsHtml}
      </div>
    </div>`;

  container.querySelectorAll('.option-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectOption(card.querySelector('input').value);
    });
  });

  document.getElementById('btn-prev').disabled = currentQuestionIndex === 0;
  document.getElementById('btn-next').textContent =
    currentQuestionIndex === TOTAL_QUESTIONS - 1 ? 'Submit Assessment' : 'Next';
}

function selectOption(value) {
  assessmentResponses[currentQuestionIndex] = value;
  saveResponses(assessmentResponses);
  document.querySelectorAll('#question-container .option-card').forEach((card) => {
    const input = card.querySelector('input');
    const isSelected = input.value === value;
    card.classList.toggle('selected', isSelected);
    input.checked = isSelected;
    card.setAttribute('aria-checked', isSelected);
  });
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex -= 1;
    renderQuestion();
  }
}

function nextQuestion() {
  const ans = assessmentResponses[currentQuestionIndex];
  if (ans !== 'yes' && ans !== 'no') {
    showToast('Please select Yes or No before continuing.');
    return;
  }
  if (currentQuestionIndex < TOTAL_QUESTIONS - 1) {
    currentQuestionIndex += 1;
    renderQuestion();
  } else {
    submitAssessment();
  }
}

function submitAssessment() {
  // Safety: every question must have a valid Yes/No answer.
  const allAnswered = assessmentResponses.every((v) => v === 'yes' || v === 'no');
  if (!allAnswered) {
    showToast('Please answer all 18 questions before submitting.');
    return;
  }
  const summary = calculateAssessmentSummary(assessmentResponses, getFlatQuestions());
  const childInfo = loadChildInfo();
  summary.childAge = childInfo ? childInfo.age : null;
  saveResults(summary);
  saveResponses(assessmentResponses);
  navigateToSection('results');
  renderResults(summary);
  showToast('Assessment submitted successfully!');
}

function resetAssessment() {
  assessmentResponses = new Array(TOTAL_QUESTIONS).fill(null);
  currentQuestionIndex = 0;
  clearAssessmentData();
  // Return to the "Additional Information" step so a new age can be entered.
  showAssessmentSetup();
  const ageInput = document.getElementById('child-age');
  if (ageInput) ageInput.value = '';
  navigateToSection('assessment');
}
