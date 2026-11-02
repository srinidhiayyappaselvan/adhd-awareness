/**
 * Unit tests for the non-diagnostic assessment results calculations.
 *
 * These tests exercise the PURE calculation helpers in js/results.js against the
 * real question structure defined in js/config.js. No DOM is required.
 *
 * Run with:  npm test   (uses Node's built-in test runner)
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  ASSESSMENT_QUESTIONS,
  TOTAL_QUESTIONS,
} = require('../js/config.js');

const {
  countResponses,
  countSlice,
  yesPercentage,
  buildSections,
  calculateAssessmentSummary,
} = require('../js/results.js');

/**
 * Mirror of the app's getFlatQuestions() so the tests use the real, data-driven
 * question structure rather than a hand-maintained copy.
 */
function flatFromConfig() {
  const flat = [];
  let idx = 0;
  ASSESSMENT_QUESTIONS.forEach((group) => {
    group.items.forEach((text) => {
      flat.push({ text, section: group.section, sectionTitle: group.sectionTitle, globalIndex: idx });
      idx += 1;
    });
  });
  return flat;
}

/* ── Question structure (config.js) ───────────────────────────────────────── */

test('config: there are exactly 18 questions across three sections', () => {
  assert.equal(TOTAL_QUESTIONS, 18);
  assert.equal(ASSESSMENT_QUESTIONS.length, 3);
  const totals = ASSESSMENT_QUESTIONS.map((g) => g.items.length);
  assert.deepEqual(totals, [9, 6, 3]);
});

test('config: section titles and labels match the spec (Inattention / Hyperactivity / Impulsivity)', () => {
  assert.deepEqual(
    ASSESSMENT_QUESTIONS.map((g) => ({ section: g.section, title: g.sectionTitle })),
    [
      { section: 'A', title: 'Inattention' },
      { section: 'B', title: 'Hyperactivity' },
      { section: 'C', title: 'Impulsivity' },
    ]
  );
});

test('config: flat question indices run 0..17 in order', () => {
  const flat = flatFromConfig();
  assert.equal(flat.length, 18);
  assert.deepEqual(flat.map((q) => q.globalIndex), Array.from({ length: 18 }, (_, i) => i));
});

/* ── countResponses (totals) ───────────────────────────────────────────────── */

test('countResponses: counts Yes and No across all 18 answers', () => {
  const responses = ['yes', 'yes', 'no', 'yes', 'no', 'no', 'yes', 'yes', 'no',
    'yes', 'no', 'yes', 'no', 'yes', 'no', 'yes', 'no', 'no'];
  const r = countResponses(responses);
  assert.equal(r.totalYes, 9);
  assert.equal(r.totalNo, 9);
  assert.equal(r.totalAnswered, 18);
  assert.equal(r.totalYes + r.totalNo, 18); // requirement: Total Yes + Total No = 18
});

test('countResponses: null answers are neither Yes nor No', () => {
  const responses = ['yes', null, 'no', null];
  const r = countResponses(responses);
  assert.equal(r.totalYes, 1);
  assert.equal(r.totalNo, 1);
  assert.equal(r.totalAnswered, 2);
});

test('countResponses: empty array gives zero counts', () => {
  const r = countResponses([]);
  assert.equal(r.totalYes, 0);
  assert.equal(r.totalNo, 0);
  assert.equal(r.totalAnswered, 0);
});

/* ── countSlice (section-wise) ─────────────────────────────────────────────── */

const MIXED = [
  // Q1–Q9  Inattention (0..8): 5 Yes, 4 No
  'yes', 'yes', 'yes', 'yes', 'yes', 'no', 'no', 'no', 'no',
  // Q10–Q15 Hyperactivity (9..14): 3 Yes, 3 No
  'yes', 'yes', 'yes', 'no', 'no', 'no',
  // Q16–Q18 Impulsivity (15..17): 1 Yes, 2 No
  'yes', 'no', 'no',
];

test('section A (Inattention) counts come from Q1–Q9 only', () => {
  const r = countSlice(MIXED, 0, 9);
  assert.equal(r.yes, 5);
  assert.equal(r.no, 4);
  assert.equal(r.total, 9);
  assert.equal(r.yes + r.no, 9);
});

test('section B (Hyperactivity) counts come from Q10–Q15 only', () => {
  const r = countSlice(MIXED, 9, 15);
  assert.equal(r.yes, 3);
  assert.equal(r.no, 3);
  assert.equal(r.total, 6);
});

test('section C (Impulsivity) counts come from Q16–Q18 only', () => {
  const r = countSlice(MIXED, 15, 18);
  assert.equal(r.yes, 1);
  assert.equal(r.no, 2);
  assert.equal(r.total, 3);
});

test('combined Hyperactivity + Impulsivity counts come from Q10–Q18', () => {
  const r = countSlice(MIXED, 9, 18);
  assert.equal(r.yes, 4);   // 3 + 1
  assert.equal(r.no, 5);    // 3 + 2
  assert.equal(r.total, 9);
});

/* ── yesPercentage (response percentages, for visual bars only) ────────────── */

test('yesPercentage: Inattention = round(5/9*100) = 56', () => {
  assert.equal(yesPercentage(MIXED, 0, 9), 56);
});

test('yesPercentage: Hyperactivity = round(3/6*100) = 50', () => {
  assert.equal(yesPercentage(MIXED, 9, 15), 50);
});

test('yesPercentage: Impulsivity = round(1/3*100) = 33', () => {
  assert.equal(yesPercentage(MIXED, 15, 18), 33);
});

test('yesPercentage: combined = round(4/9*100) = 44', () => {
  assert.equal(yesPercentage(MIXED, 9, 18), 44);
});

test('yesPercentage: all-Yes fixture gives 100, all-No gives 0', () => {
  assert.equal(yesPercentage(['yes', 'yes', 'yes'], 0, 3), 100);
  assert.equal(yesPercentage(['no', 'no', 'no', 'no'], 0, 4), 0);
});

test('yesPercentage: empty slice does not divide by zero', () => {
  assert.equal(yesPercentage([], 0, 0), 0);
});

/* ── buildSections (data-driven boundaries) ────────────────────────────────── */

test('buildSections: groups flat questions into A, B, C with correct indices', () => {
  const sections = buildSections(flatFromConfig());
  assert.equal(sections.length, 3);
  assert.deepEqual(sections.map((s) => s.section), ['A', 'B', 'C']);
  assert.deepEqual(sections[0].indices, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(sections[1].indices, [9, 10, 11, 12, 13, 14]);
  assert.deepEqual(sections[2].indices, [15, 16, 17]);
});

/* ── calculateAssessmentSummary (end-to-end, non-diagnostic) ────────────────── */

test('summary: totals, sections and combined are all correct for a mixed response set', () => {
  const flat = flatFromConfig();
  const s = calculateAssessmentSummary(MIXED, flat);

  // Totals
  assert.equal(s.totalQuestions, 18);
  assert.equal(s.totalYes, 9);
  assert.equal(s.totalNo, 9);
  assert.equal(s.totalAnswered, 18);
  assert.equal(s.totalYes + s.totalNo, 18);

  // Sections (order A, B, C; totals derived from the data)
  assert.equal(s.sections.length, 3);
  const [a, b, c] = s.sections;
  assert.equal(a.section, 'A'); assert.equal(a.title, 'Inattention');
  assert.equal(a.total, 9); assert.equal(a.yes, 5); assert.equal(a.no, 4); assert.equal(a.yesPercent, 56);
  assert.equal(b.section, 'B'); assert.equal(b.title, 'Hyperactivity');
  assert.equal(b.total, 6); assert.equal(b.yes, 3); assert.equal(b.no, 3); assert.equal(b.yesPercent, 50);
  assert.equal(c.section, 'C'); assert.equal(c.title, 'Impulsivity');
  assert.equal(c.total, 3); assert.equal(c.yes, 1); assert.equal(c.no, 2); assert.equal(c.yesPercent, 33);

  // Combined Hyperactivity + Impulsivity
  assert.equal(s.combined.total, 9);
  assert.equal(s.combined.yes, 4);
  assert.equal(s.combined.no, 5);
});

test('summary: all-Yes fixture → every section 100%, combined 9/9', () => {
  const allYes = new Array(18).fill('yes');
  const s = calculateAssessmentSummary(allYes, flatFromConfig());
  assert.equal(s.totalYes, 18);
  assert.equal(s.totalNo, 0);
  assert.equal(s.totalYes + s.totalNo, 18);
  s.sections.forEach((sec) => assert.equal(sec.yesPercent, 100));
  assert.equal(s.combined.yes, 9);
  assert.equal(s.combined.no, 0);
  assert.equal(s.combined.total, 9);
});

test('summary: all-No fixture → every section 0%, combined 0/9', () => {
  const allNo = new Array(18).fill('no');
  const s = calculateAssessmentSummary(allNo, flatFromConfig());
  assert.equal(s.totalYes, 0);
  assert.equal(s.totalNo, 18);
  s.sections.forEach((sec) => assert.equal(sec.yesPercent, 0));
  assert.equal(s.combined.yes, 0);
  assert.equal(s.combined.no, 9);
});

test('summary: missing answers (null) are handled safely without crashing', () => {
  const partial = new Array(18).fill(null);
  partial[0] = 'yes';
  partial[17] = 'no';
  const s = calculateAssessmentSummary(partial, flatFromConfig());
  assert.equal(s.totalYes, 1);
  assert.equal(s.totalNo, 1);
  assert.equal(s.totalAnswered, 2);
  // No section should exceed its own question count.
  s.sections.forEach((sec) => assert.ok(sec.yes <= sec.total && sec.no <= sec.total));
});

test('summary: contains no diagnostic fields (no outcome/scores/thresholds)', () => {
  const s = calculateAssessmentSummary(MIXED, flatFromConfig());
  assert.equal('outcome' in s, false);
  assert.equal('inattentionScore' in s, false);
  assert.equal('hyperactivityScore' in s, false);
  assert.equal('totalScore' in s, false);
  assert.equal('symptomCount' in s, false);
  assert.equal(s.sections.every((sec) => !('risk' in sec || 'severity' in sec)), true);
});

/* ── Exact question set (matches the provided parent-friendly wording) ─────── */

test('question set: Section A starts with the exact provided wording (Q1)', () => {
  assert.equal(
    ASSESSMENT_QUESTIONS[0].items[0],
    'Does your child often miss details or make careless mistakes in schoolwork or other activities?'
  );
});

test('question set: Section B starts with the exact provided wording (Q10)', () => {
  assert.equal(
    ASSESSMENT_QUESTIONS[1].items[0],
    'Does your child often fidget with their hands or feet, or squirm while seated?'
  );
});

test('question set: Section C Q18 is exact, including the apostrophe in "people\'s"', () => {
  assert.equal(
    ASSESSMENT_QUESTIONS[2].items[2],
    "Does your child often interrupt or intrude on other people's conversations or activities?"
  );
});

test('question set: all 18 questions are phrased to the parent and end with a question mark', () => {
  let count = 0;
  ASSESSMENT_QUESTIONS.forEach((g) => {
    g.items.forEach((text) => {
      count += 1;
      assert.ok(text.endsWith('?'), `question should end with '?': ${text}`);
      assert.ok(/child/i.test(text), `question should be addressed to the parent about the child: ${text}`);
    });
  });
  assert.equal(count, 18);
});

test('question set: section descriptions are present for each of the three sections', () => {
  assert.equal(ASSESSMENT_QUESTIONS.length, 3);
  ASSESSMENT_QUESTIONS.forEach((g) => {
    assert.equal(typeof g.description, 'string');
    assert.ok(g.description.length > 0);
  });
});

/* ── Seek-attention advisory thresholds (referral prompts, not diagnoses) ──── */

test('advisory: Inattention flags "seek attention" when Yes is 6 or more out of 9', () => {
  const flat = flatFromConfig();
  const sixYes = ['yes','yes','yes','yes','yes','yes','no','no','no','no','no','no','no','no','no','no','no','no'];
  const s6 = calculateAssessmentSummary(sixYes, flat);
  assert.equal(s6.inattentionSeekAttention, true);
  assert.equal(s6.combinedSeekAttention, false);

  const fiveYes = ['yes','yes','yes','yes','yes','no','no','no','no','no','no','no','no','no','no','no','no','no'];
  const s5 = calculateAssessmentSummary(fiveYes, flat);
  assert.equal(s5.inattentionSeekAttention, false);
});

test('advisory: combined Hyperactivity+Impulsivity flags when Yes is MORE than 6 out of 9', () => {
  const flat = flatFromConfig();
  // Inattention all No; Hyperactivity 4 Yes + 2 No; Impulsivity 3 Yes  -> combined = 7 (>6)
  const sevenYes = ['no','no','no','no','no','no','no','no','no','yes','yes','yes','yes','no','no','yes','yes','yes'];
  const s7 = calculateAssessmentSummary(sevenYes, flat);
  assert.equal(s7.combinedSeekAttention, true);
  assert.equal(s7.inattentionSeekAttention, false);

  // Combined exactly 6 should NOT flag (rule is strictly more than 6)
  const sixYes = ['no','no','no','no','no','no','no','no','no','yes','yes','yes','yes','no','no','yes','yes','no'];
  const s6 = calculateAssessmentSummary(sixYes, flat);
  assert.equal(s6.combinedSeekAttention, false);
});

test('advisory: both flags can be true at once (Inattention >= 6 and combined > 6)', () => {
  const flat = flatFromConfig();
  // Inattention 6 Yes; Hyperactivity 4 Yes; Impulsivity 3 Yes -> combined 7
  const both = ['yes','yes','yes','yes','yes','yes','no','no','no','yes','yes','yes','yes','no','no','yes','yes','yes'];
  const s = calculateAssessmentSummary(both, flat);
  assert.equal(s.inattentionSeekAttention, true);
  assert.equal(s.combinedSeekAttention, true);
});
