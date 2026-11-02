/**
 * Results calculation & rendering — MorningRoutineTracker
 *
 * This module produces a parent-friendly, NON-diagnostic summary of the
 * Yes/No responses. It does NOT classify the child, compute scores, or produce
 * a medical diagnosis. It DOES flag two screening thresholds that prompt parents
 * to seek professional attention (see constants below) — these are referral
 * prompts, not diagnoses.
 *
 * The only math performed is counting Yes/No answers, expressing the share of
 * "Yes" responses per section as a *response percentage* (for visual bars only),
 * and checking the two seek-attention thresholds.
 */

/* ─────────────────────────────────────────────────────────────────────────────
   Pure calculation helpers (no DOM access — safe to unit-test in Node)
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Screening thresholds that prompt parents to seek professional attention.
 * NOT diagnostic cutoffs — they encourage a professional consultation.
 *   Inattention (Section A, 9 questions): 6 or more "Yes" responses
 *   Combined Hyperactivity + Impulsivity (Sections B + C, 9 questions): more than 6 "Yes"
 */
const INATTENTION_SEEK_THRESHOLD = 6; // Yes >= 6 out of 9
const COMBINED_SEEK_THRESHOLD = 6;     // combined Yes > 6 out of 9


/**
 * Count Yes/No across an array of responses.
 * @param {Array<'yes'|'no'|null>} responses
 * @returns {{totalAnswered:number, totalYes:number, totalNo:number}}
 */
function countResponses(responses) {
  const totalYes = responses.filter((v) => v === 'yes').length;
  const totalNo = responses.filter((v) => v === 'no').length;
  return { totalAnswered: totalYes + totalNo, totalYes, totalNo };
}

/**
 * Count Yes/No for a contiguous slice of responses [start, end).
 * @param {Array} responses
 * @param {number} start - inclusive start index
 * @param {number} end   - exclusive end index
 * @returns {{yes:number, no:number, total:number}}
 */
function countSlice(responses, start, end) {
  const slice = responses.slice(start, end);
  const yes = slice.filter((v) => v === 'yes').length;
  const no = slice.filter((v) => v === 'no').length;
  return { yes, no, total: slice.length };
}

/**
 * Percentage of Yes responses in a slice — used ONLY for visual presentation.
 * @returns {number} whole-number percentage (0–100)
 */
function yesPercentage(responses, start, end) {
  const { yes, total } = countSlice(responses, start, end);
  return total > 0 ? Math.round((yes / total) * 100) : 0;
}

/**
 * Group flat questions by their section, preserving order.
 * @param {Array<{section:string,sectionTitle:string,globalIndex:number}>} flatQuestions
 * @returns {Array<{section:string, title:string, indices:number[]}>}
 */
function buildSections(flatQuestions) {
  const sections = [];
  flatQuestions.forEach((q) => {
    let sec = sections.find((s) => s.section === q.section);
    if (!sec) {
      sec = { section: q.section, title: q.sectionTitle, description: q.description, indices: [] };
      sections.push(sec);
    }
    sec.indices.push(q.globalIndex);
  });
  return sections;
}

/**
 * Build the full non-diagnostic summary from responses.
 * All counts are derived dynamically from the actual answers and the question
 * structure — nothing is hard-coded.
 *
 * @param {Array<'yes'|'no'|null>} responses
 * @param {Array<{section:string,sectionTitle:string,globalIndex:number}>} flatQuestions
 */
function calculateAssessmentSummary(responses, flatQuestions) {
  const overall = countResponses(responses);
  const metaSections = buildSections(flatQuestions);

  const sections = metaSections.map((sec) => {
    const start = sec.indices[0];
    const end = sec.indices[sec.indices.length - 1] + 1;
    const { yes, no, total } = countSlice(responses, start, end);
    return {
      section: sec.section,
      title: sec.title,
      description: sec.description,
      total,
      yes,
      no,
      yesPercent: total > 0 ? Math.round((yes / total) * 100) : 0,
    };
  });

  // Combined Hyperactivity (B) + Impulsivity (C) — shown only to view the two
  // behaviour areas together. No cutoff or classification is applied.
  const combinedSections = sections.filter((s) => s.section === 'B' || s.section === 'C');
  const combinedYes = combinedSections.reduce((sum, s) => sum + s.yes, 0);
  const combinedNo = combinedSections.reduce((sum, s) => sum + s.no, 0);
  const combinedTotal = combinedYes + combinedNo;

  // Seek-attention flags (referral prompts — NOT diagnoses):
  //   Inattention: 6 or more "Yes" out of 9
  //   Combined Hyperactivity + Impulsivity: more than 6 "Yes" out of 9
  const inattentionSec = sections.find((s) => s.section === 'A') || { yes: 0 };
  const inattentionSeekAttention = inattentionSec.yes >= INATTENTION_SEEK_THRESHOLD;
  const combinedSeekAttention = combinedYes > COMBINED_SEEK_THRESHOLD;

  return {
    responses,
    totalAnswered: overall.totalAnswered,
    totalYes: overall.totalYes,
    totalNo: overall.totalNo,
    totalQuestions: flatQuestions.length,
    sections,
    combined: { total: combinedTotal, yes: combinedYes, no: combinedNo },
    inattentionSeekAttention,
    combinedSeekAttention,
    childAge: null, // attached by the caller after loading the Additional Information
    timestamp: new Date().toISOString(),
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Rendering (DOM)
   ───────────────────────────────────────────────────────────────────────────── */

function showResultsEmpty() {
  document.getElementById('results-empty')?.classList.remove('d-none');
  document.getElementById('results-dashboard')?.classList.add('d-none');
}

function renderResults(results) {
  if (!results) results = loadResults();
  if (!results) { showResultsEmpty(); return; }

  // Backward-compatibility: rebuild a current-format summary from older stored data.
  if (!results.sections && Array.isArray(results.responses)) {
    const valid = results.responses.every((v) => v === 'yes' || v === 'no' || v === null);
    if (!valid) { showResultsEmpty(); return; }
    const rebuilt = calculateAssessmentSummary(results.responses, getFlatQuestions());
    if (results.childAge != null) {
      rebuilt.childAge = results.childAge;
    } else {
      const info = loadChildInfo();
      rebuilt.childAge = info ? info.age : null;
    }
    results = rebuilt;
  }
  if (!results.sections) { showResultsEmpty(); return; }

  document.getElementById('results-empty')?.classList.add('d-none');
  document.getElementById('results-dashboard')?.classList.remove('d-none');

  const content = document.getElementById('results-content');
  if (content) content.innerHTML = buildResultsHTML(results);
  if (typeof AOS !== 'undefined') AOS.refresh();
}

/* ── HTML builders ── */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildOverview(results) {
  const ageText =
    results.childAge != null ? `${escapeHtml(results.childAge)} years` : 'Not provided';
  return `
    <div class="glass-card summary-overview" data-aos="fade-up">
      <h3 class="summary-title">Your Child&rsquo;s Assessment Summary</h3>
      <div class="summary-stats-grid">
        <div class="summary-stat">
          <div class="summary-stat-num">${results.totalQuestions}</div>
          <div class="summary-stat-lbl">Questions answered</div>
        </div>
        <div class="summary-stat summary-stat-yes">
          <div class="summary-stat-num">${results.totalYes}</div>
          <div class="summary-stat-lbl">Yes responses</div>
        </div>
        <div class="summary-stat summary-stat-no">
          <div class="summary-stat-num">${results.totalNo}</div>
          <div class="summary-stat-lbl">No responses</div>
        </div>
        <div class="summary-stat summary-stat-age">
          <div class="summary-stat-num">${ageText}</div>
          <div class="summary-stat-lbl">Child&rsquo;s age</div>
        </div>
      </div>
      <p class="summary-check">
        Total Yes + Total No = ${results.totalYes + results.totalNo}
        (of ${results.totalQuestions} questions)
      </p>
    </div>`;
}

/** Advisory shown when a seek-attention screening threshold is met (referral prompt, not a diagnosis). */
function buildAdvisory(results) {
  if (!results.inattentionSeekAttention && !results.combinedSeekAttention) return '';
  const items = [];
  if (results.inattentionSeekAttention) {
    items.push(`<li>${escapeHtml(SEEK_ATTENTION_ADVISORY.inattention)}</li>`);
  }
  if (results.combinedSeekAttention) {
    items.push(`<li>${escapeHtml(SEEK_ATTENTION_ADVISORY.combined)}</li>`);
  }
  return `
    <div class="glass-card seek-advisory" data-aos="fade-up" role="note">
      <h3 class="seek-advisory-title"><i class="fas fa-user-doctor me-2"></i>Consider Seeking Professional Attention</h3>
      <ul class="seek-advisory-list">${items.join('')}</ul>
      <p class="seek-advisory-note">${escapeHtml(SEEK_ATTENTION_ADVISORY.note)}</p>
    </div>`;
}

function buildSectionCard(sec, seekAttention) {
  return `
    <div class="glass-card section-result-card" data-aos="fade-up">
      <div class="section-result-head">
        <span class="section-badge">Section ${sec.section}</span>
        <span class="section-result-title">${escapeHtml(sec.title)}</span>
      </div>
      ${sec.description ? `<p class="section-result-desc">${escapeHtml(sec.description)}</p>` : ''}
      <div class="section-result-counts">
        <div class="src-count">
          <span class="src-num src-num-total">${sec.total}</span>
          <span class="src-lbl">Total questions</span>
        </div>
        <div class="src-count src-count-yes">
          <span class="src-num">${sec.yes}</span>
          <span class="src-lbl">Yes</span>
        </div>
        <div class="src-count src-count-no">
          <span class="src-num">${sec.no}</span>
          <span class="src-lbl">No</span>
        </div>
      </div>
      <div class="results-progress" role="progressbar" aria-valuenow="${sec.yesPercent}"
           aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(sec.title)} Yes response percentage">
        <div class="results-progress-fill" style="width:${sec.yesPercent}%"></div>
      </div>
      <p class="section-result-pct">Yes responses: ${sec.yes} of ${sec.total} (${sec.yesPercent}%)</p>
      <p class="section-result-note">Response percentage &mdash; not an ADHD score or severity level.</p>
      ${seekAttention ? `<p class="section-result-seek"><i class="fas fa-user-doctor me-1"></i>Meets a screening threshold &mdash; consider seeking professional attention.</p>` : ''}
    </div>`;
}

function buildSectionResults(results) {
  return `
    <div class="results-block">
      <h3 class="results-block-title" data-aos="fade-up">
        <i class="fas fa-layer-group me-2"></i>Section-wise Results
      </h3>
      <div class="row g-4">
        ${results.sections.map((s) => `<div class="col-lg-4 col-md-6">${buildSectionCard(s, s.section === 'A' ? results.inattentionSeekAttention : false)}</div>`).join('')}
      </div>
    </div>`;
}

function buildCombinedSummary(results) {
  const c = results.combined;
  const pct = c.total > 0 ? Math.round((c.yes / c.total) * 100) : 0;
  return `
    <div class="glass-card combined-summary" data-aos="fade-up">
      <h3 class="results-block-title">
        <i class="fas fa-object-group me-2"></i>Hyperactivity &amp; Impulsivity (combined view)
      </h3>
      <p class="text-muted combined-intro">
        This combines the Hyperactivity and Impulsivity responses so you can look at the two
        behaviour areas together. A screening threshold is checked on this combined count only to
        prompt a professional consultation &mdash; it is not a diagnosis.
      </p>
      <div class="section-result-counts">
        <div class="src-count">
          <span class="src-num src-num-total">${c.total}</span>
          <span class="src-lbl">Total questions</span>
        </div>
        <div class="src-count src-count-yes">
          <span class="src-num">${c.yes}</span>
          <span class="src-lbl">Yes</span>
        </div>
        <div class="src-count src-count-no">
          <span class="src-num">${c.no}</span>
          <span class="src-lbl">No</span>
        </div>
      </div>
      <div class="results-progress" role="progressbar" aria-valuenow="${pct}"
           aria-valuemin="0" aria-valuemax="100" aria-label="Combined Hyperactivity and Impulsivity Yes response percentage">
        <div class="results-progress-fill" style="width:${pct}%"></div>
      </div>
      <p class="section-result-pct">Yes responses: ${c.yes} of ${c.total} (${pct}%)</p>
      <p class="section-result-note">Response percentage &mdash; not an ADHD score or severity level.</p>
      ${results.combinedSeekAttention ? `<p class="section-result-seek"><i class="fas fa-user-doctor me-1"></i>Meets a screening threshold &mdash; consider seeking professional attention.</p>` : ''}
    </div>`;
}

function responseItem(q, answer) {
  const isYes = answer === 'yes';
  const isNo = answer === 'no';
  const display = isYes ? 'Yes' : isNo ? 'No' : 'Not answered';
  const badgeClass = isYes ? 'answer-yes' : isNo ? 'answer-no' : 'answer-none';
  return `
    <li class="response-item">
      <span class="response-qnum">Q${q.globalIndex + 1}</span>
      <span class="response-text">${escapeHtml(q.text)}</span>
      <span class="response-answer ${badgeClass}">${display}</span>
    </li>`;
}

function buildAllResponses(results) {
  const flat = getFlatQuestions();
  const groups = [];
  flat.forEach((q) => {
    let g = groups.find((x) => x.section === q.section);
    if (!g) {
      g = { section: q.section, sectionTitle: q.sectionTitle, items: [] };
      groups.push(g);
    }
    g.items.push(q);
  });

  return `
    <div class="results-block">
      <h3 class="results-block-title" data-aos="fade-up">
        <i class="fas fa-list-check me-2"></i>Your Responses
      </h3>
      <div class="response-groups">
        ${groups
          .map(
            (g) => `
          <div class="glass-card response-group" data-aos="fade-up">
            <h4 class="response-group-title">
              <span class="section-badge">Section ${g.section}</span> ${escapeHtml(g.sectionTitle)}
            </h4>
            <ul class="response-list">
              ${g.items.map((q) => responseItem(q, results.responses[q.globalIndex])).join('')}
            </ul>
          </div>`
          )
          .join('')}
      </div>
    </div>`;
}

function buildUnderstanding() {
  return `
    <div class="glass-card understanding-card" data-aos="fade-up">
      <h3 class="results-block-title"><i class="fas fa-circle-info me-2"></i>Understanding Your Responses</h3>
      ${UNDERSTANDING_RESULTS_TEXT.map((p) => `<p class="understanding-text">${escapeHtml(p)}</p>`).join('')}
    </div>`;
}

function buildAiimsReference() {
  return `
    <div class="glass-card aiims-reference" data-aos="fade-up">
      <h3 class="results-block-title"><i class="fas fa-stethoscope me-2"></i>Clinical Reference</h3>
      <p class="text-muted">
        The questions on this site are adapted from parent-friendly observations and are inspired
        by the structure of the&nbsp;
        <a href="${AIIMS_REFERENCE_URL}" target="_blank" rel="noopener noreferrer">
          AIIMS INDT-ADHD training module
        </a>, which is based on DSM-IV criteria. Our simplified Yes/No questionnaire does not
        collect all of the information needed for a clinical assessment.
      </p>
      <p class="fw-600 text-primary mt-3">Please note:</p>
      <ul class="aiims-notes">
        ${AIIMS_REFERENCE_NOTES.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}
      </ul>
    </div>`;
}

function buildNextSteps() {
  return `
    <div class="glass-card next-steps-card" data-aos="fade-up">
      <h3 class="results-block-title"><i class="fas fa-shoe-prints me-2"></i>What Can Parents Do Next?</h3>
      <ul class="next-steps-list">
        ${PARENT_NEXT_STEPS.map(
          (s) => `
          <li class="next-step-item">
            <span class="next-step-icon"><i class="fas ${s.icon}"></i></span>
            <span>${escapeHtml(s.text)}</span>
          </li>`
        ).join('')}
      </ul>
    </div>`;
}

function buildDisclaimer() {
  return `
    <div class="results-disclaimer" role="note" data-aos="fade-up">
      <i class="fas fa-shield-heart me-2" aria-hidden="true"></i>
      <span>${escapeHtml(MEDICAL_DISCLAIMER)}</span>
    </div>`;
}

function buildResultsHTML(results) {
  return `
    ${buildOverview(results)}
    ${buildAdvisory(results)}
    ${buildSectionResults(results)}
    ${buildCombinedSummary(results)}
    ${buildAllResponses(results)}
    ${buildUnderstanding()}
    ${buildAiimsReference()}
    ${buildNextSteps()}
    ${buildDisclaimer()}
  `;
}

function initResults() {
  const results = loadResults();
  if (results) {
    renderResults(results);
  } else {
    showResultsEmpty();
  }
}

// ── CommonJS export for the Node test runner (no effect in the browser) ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    countResponses,
    countSlice,
    yesPercentage,
    buildSections,
    calculateAssessmentSummary,
  };
}
