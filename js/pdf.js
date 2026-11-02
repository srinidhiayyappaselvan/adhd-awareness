/**
 * PDF report generation — MorningRoutineTracker
 *
 * Both functions below produce NON-diagnostic documents. They summarise Yes/No
 * responses only and never classify the child or produce a diagnosis. They DO
 * flag two screening thresholds that prompt parents to seek professional
 * attention — these are referral prompts, not diagnoses or medical recommendations.
 */

/* ─────────────────────────────────────────────────────────────────────────────
   Downloadable results report (summary of the parent's responses)
   ───────────────────────────────────────────────────────────────────────────── */
function downloadPDFReport() {
  const stored = loadResults();
  if (!stored) {
    showToast('No assessment results found. Please complete the assessment first.');
    return;
  }
  if (typeof window.jspdf === 'undefined') {
    showToast('PDF library not loaded. Please refresh the page.');
    return;
  }

  // Normalise to the current (non-diagnostic) summary format from older data if needed.
  let results = stored;
  if (!results.sections && Array.isArray(results.responses)) {
    results = calculateAssessmentSummary(results.responses, getFlatQuestions());
    results.childAge = stored.childAge != null ? stored.childAge : (loadChildInfo() ? loadChildInfo().age : null);
  }
  if (!results.sections) {
    showToast('No assessment results found. Please complete the assessment first.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const M = 14;
  let y = 20;

  const ensure = (needed) => {
    if (y + needed > pageHeight - 16) { doc.addPage(); y = 18; }
  };

  // ── Header bar ──
  doc.setFillColor(21, 101, 192);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont(undefined, 'bold');
  doc.text("Your Child\u2019s Assessment Summary", pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  doc.text('ADHD Awareness & Screening Report', pageWidth / 2, 24, { align: 'center' });
  doc.text(`${APP_CONFIG.project} \u2022 Awareness only \u2014 not a diagnosis`, pageWidth / 2, 29, { align: 'center' });

  y = 45;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date(results.timestamp).toLocaleString()}`, M, y); y += 6;
  doc.text(`Presented by: ${APP_CONFIG.studentName}`, M, y); y += 6;
  doc.text(`${APP_CONFIG.school} | ${APP_CONFIG.project}`, M, y); y += 12;

  // ── Overview ──
  const ageStr = results.childAge != null ? `${results.childAge} years` : 'Not provided';
  doc.setFontSize(13); doc.setTextColor(21, 101, 192); doc.setFont(undefined, 'bold');
  doc.text('Assessment Overview', M, y); y += 8;
  doc.setFontSize(11); doc.setTextColor(60, 60, 60); doc.setFont(undefined, 'normal');
  [
    ['Questions answered', `${results.totalQuestions}`],
    ['Yes responses', `${results.totalYes}`],
    ['No responses', `${results.totalNo}`],
    ["Child's age", ageStr],
    ['Total Yes + Total No', `${results.totalYes + results.totalNo} (of ${results.totalQuestions})`],
  ].forEach(([l, v]) => { doc.text(`${l}: ${v}`, M, y); y += 6; });
  y += 4;

  // ── Seek-attention advisory (referral prompt, not a diagnosis) ──
  if (results.inattentionSeekAttention || results.combinedSeekAttention) {
    ensure(18);
    doc.setFillColor(255, 248, 230);
    doc.rect(M, y - 4, pageWidth - 2 * M, 11, 'F');
    doc.setFontSize(13); doc.setTextColor(180, 83, 9); doc.setFont(undefined, 'bold');
    doc.text('Consider Seeking Professional Attention', M + 3, y + 2);
    y += 10;
    doc.setTextColor(60, 60, 60); doc.setFontSize(10); doc.setFont(undefined, 'normal');
    if (results.inattentionSeekAttention) {
      const la = doc.splitTextToSize(SEEK_ATTENTION_ADVISORY.inattention, pageWidth - 2 * M);
      ensure(la.length * 5 + 4); doc.text(la, M, y); y += la.length * 5 + 3;
    }
    if (results.combinedSeekAttention) {
      const lb = doc.splitTextToSize(SEEK_ATTENTION_ADVISORY.combined, pageWidth - 2 * M);
      ensure(lb.length * 5 + 4); doc.text(lb, M, y); y += lb.length * 5 + 3;
    }
    doc.setFont(undefined, 'italic'); doc.setFontSize(9);
    const ln = doc.splitTextToSize(SEEK_ATTENTION_ADVISORY.note, pageWidth - 2 * M);
    ensure(ln.length * 4 + 3); doc.text(ln, M, y); y += ln.length * 4 + 8;
    doc.setFont(undefined, 'normal'); doc.setFontSize(10);
  }

  // ── Section-wise results ──
  doc.setFontSize(13); doc.setTextColor(21, 101, 192); doc.setFont(undefined, 'bold');
  doc.text('Section-wise Results', M, y); y += 8;
  doc.setFontSize(11); doc.setTextColor(60, 60, 60); doc.setFont(undefined, 'normal');
  results.sections.forEach((s) => {
    ensure(8);
    doc.text(`Section ${s.section} \u2014 ${s.title}:  Yes ${s.yes} / No ${s.no} of ${s.total}  (Yes ${s.yesPercent}%)`, M, y); y += 6;
  });
  const c = results.combined;
  ensure(10);
  doc.setFont(undefined, 'italic');
  doc.text(`Hyperactivity + Impulsivity (combined): Yes ${c.yes} / No ${c.no} of ${c.total}`, M, y); y += 6;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8); doc.setTextColor(120, 120, 120);
  doc.text('Percentages are response percentages only \u2014 not ADHD scores or severity levels.', M, y); y += 5;
  doc.text('No diagnostic cutoff or classification is applied to these counts.', M, y); y += 10;
  doc.setTextColor(60, 60, 60);

  // ── All responses ──
  ensure(40);
  doc.setFontSize(13); doc.setTextColor(21, 101, 192); doc.setFont(undefined, 'bold');
  doc.text('Your Responses', M, y); y += 8;
  const flat = getFlatQuestions();
  const groups = [];
  flat.forEach((q) => {
    let g = groups.find((x) => x.section === q.section);
    if (!g) { g = { section: q.section, sectionTitle: q.sectionTitle, items: [] }; groups.push(g); }
    g.items.push(q);
  });
  groups.forEach((g) => {
    ensure(16);
    doc.setFontSize(11); doc.setTextColor(21, 101, 192); doc.setFont(undefined, 'bold');
    doc.text(`Section ${g.section}: ${g.sectionTitle}`, M, y); y += 6;
    g.items.forEach((q) => {
      const ans = results.responses[q.globalIndex];
      const ansText = ans === 'yes' ? 'Yes' : ans === 'no' ? 'No' : '\u2014';
      doc.setFontSize(9.5); doc.setTextColor(50, 50, 50); doc.setFont(undefined, 'normal');
      doc.text(`Q${q.globalIndex + 1}.`, M, y);
      const lines = doc.splitTextToSize(q.text, pageWidth - 2 * M - 26);
      doc.text(lines, M + 10, y);
      doc.setFont(undefined, 'bold');
      if (ans === 'yes') doc.setTextColor(21, 101, 192);
      else if (ans === 'no') doc.setTextColor(120, 120, 120);
      else doc.setTextColor(180, 180, 180);
      doc.text(ansText, pageWidth - M - 14, y);
      doc.setTextColor(50, 50, 50); doc.setFont(undefined, 'normal');
      y += lines.length * 4.3 + 1.5;
      ensure(8);
    });
    y += 3;
  });
  y += 4;

  // ── Understanding ──
  ensure(40);
  doc.setFontSize(13); doc.setTextColor(21, 101, 192); doc.setFont(undefined, 'bold');
  doc.text('Understanding Your Responses', M, y); y += 8;
  doc.setFontSize(10); doc.setTextColor(60, 60, 60); doc.setFont(undefined, 'normal');
  UNDERSTANDING_RESULTS_TEXT.forEach((p) => {
    const lines = doc.splitTextToSize(p, pageWidth - 2 * M);
    ensure(lines.length * 5 + 4);
    doc.text(lines, M, y); y += lines.length * 5 + 3;
  });
  y += 4;

  // ── Next steps ──
  ensure(40);
  doc.setFontSize(13); doc.setTextColor(21, 101, 192); doc.setFont(undefined, 'bold');
  doc.text('What Can Parents Do Next?', M, y); y += 8;
  doc.setFontSize(10); doc.setTextColor(60, 60, 60); doc.setFont(undefined, 'normal');
  PARENT_NEXT_STEPS.forEach((s, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${s.text}`, pageWidth - 2 * M - 4);
    ensure(lines.length * 5 + 4);
    doc.text(lines, M + 2, y); y += lines.length * 5 + 3;
  });
  y += 4;

  // ── Clinical reference + notes ──
  ensure(50);
  doc.setFontSize(13); doc.setTextColor(21, 101, 192); doc.setFont(undefined, 'bold');
  doc.text('Clinical Reference', M, y); y += 8;
  doc.setFontSize(9.5); doc.setTextColor(60, 60, 60); doc.setFont(undefined, 'normal');
  const refLines = doc.splitTextToSize(
    `Questions are adapted from parent-friendly observations inspired by the AIIMS INDT-ADHD training module (${AIIMS_REFERENCE_URL}), which is based on DSM-IV criteria. This questionnaire is not the official AIIMS tool and is not clinically validated.`,
    pageWidth - 2 * M
  );
  doc.text(refLines, M, y); y += refLines.length * 4.5 + 4;
  doc.setFontSize(9);
  AIIMS_REFERENCE_NOTES.forEach((n) => {
    const nl = doc.splitTextToSize(`\u2022 ${n}`, pageWidth - 2 * M);
    ensure(nl.length * 4 + 3);
    doc.text(nl, M, y); y += nl.length * 4 + 1.5;
  });
  y += 4;

  // ── Medical disclaimer box ──
  ensure(30);
  const discLines = doc.splitTextToSize(MEDICAL_DISCLAIMER, pageWidth - 2 * M - 8);
  const boxH = discLines.length * 5 + 12;
  doc.setFillColor(255, 243, 205);
  doc.rect(M, y, pageWidth - 2 * M, boxH, 'F');
  doc.setFontSize(9); doc.setTextColor(100, 80, 0); doc.setFont(undefined, 'bold');
  doc.text('Medical Disclaimer', M + 4, y + 7);
  doc.setFont(undefined, 'normal');
  doc.text(discLines, M + 4, y + 13);
  y += boxH;

  doc.save('ADHD-Assessment-Summary.pdf');
  showToast('PDF report downloaded successfully!');
}

/* ─────────────────────────────────────────────────────────────────────────────
   Offline printable assessment form (Yes/No, three sections, no diagnosis)
   ───────────────────────────────────────────────────────────────────────────── */
function downloadOfflineAssessmentPDF() {
  if (typeof window.jspdf === 'undefined') {
    showToast('PDF library not loaded. Please refresh the page.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const PW = doc.internal.pageSize.getWidth();   // ~210
  const PH = doc.internal.pageSize.getHeight();  // ~297
  const M = 14;
  const CW = PW - M * 2;
  let y = 0;

  const ensure = (needed) => {
    if (y + needed > PH - 16) { doc.addPage(); y = 20; }
  };

  const box = (x, yPos, w, h) => {
    doc.setDrawColor(120); doc.setLineWidth(0.3);
    doc.rect(x, yPos, w, h, 'S');
  };

  const sectionBar = (text) => {
    ensure(12);
    y += 1;
    doc.setFillColor(230, 240, 252);
    doc.rect(M, y - 4, CW, 9, 'F');
    doc.setTextColor(21, 101, 192); doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.text(text, M + 3, y + 2);
    y += 9;
    doc.setTextColor(60, 60, 60);
  };

  /** Draw one question with Yes / No checkboxes. */
  const drawQuestionYesNo = (num, text) => {
    ensure(22);
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10); doc.setFont(undefined, 'bold');
    doc.text(`Q${num}.`, M, y);
    doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(text, CW - 8);
    doc.text(lines, M + 8, y);
    y += lines.length * 4.5 + 1.5;

    const opts = ['Yes', 'No'];
    const boxS = 4;
    doc.setFontSize(9);
    opts.forEach((opt, i) => {
      const cx = M + i * 26 + 2;
      box(cx, y - 3.5, boxS, boxS);
      doc.text(opt, cx + boxS + 2, y - 0.3);
    });
    y += 8;
  };

  /** Label + small fill-in box for the tally worksheet. */
  const labelBox = (label, yPos, boxW) => {
    ensure(10);
    doc.setFont(undefined, 'bold');
    doc.text(label, M, yPos);
    const tw = doc.getTextWidth(label);
    doc.setFont(undefined, 'normal');
    doc.setDrawColor(120); doc.setLineWidth(0.3);
    doc.rect(M + tw + 3, yPos - 3.5, boxW, 5, 'S');
  };

  // ── Header ──
  doc.setFillColor(21, 101, 192);
  doc.rect(0, 0, PW, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont(undefined, 'bold');
  doc.text('ADHD Screening Assessment \u2014 Offline Form', PW / 2, 14, { align: 'center' });
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  doc.text(`${APP_CONFIG.school}  |  ${APP_CONFIG.project}`, PW / 2, 21, { align: 'center' });
  doc.text('Educational awareness tool \u2014 not a clinical diagnosis', PW / 2, 26, { align: 'center' });

  y = 40;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10); doc.setFont(undefined, 'bold');
  doc.text('Instructions:', M, y); y += 6;
  doc.setFont(undefined, 'normal');
  [
    '1.  Answer all 18 questions based on behaviour observed over the past 6 months.',
    '2.  Tick one box per question: Yes or No.',
    '3.  Use the Tally Worksheet (last page) to count your Yes and No answers.',
    '4.  This is an awareness tool \u2014 it cannot diagnose ADHD.',
  ].forEach((line) => { doc.text(line, M, y); y += 5; });
  y += 4;

  // Name, age & date fields
  doc.setFont(undefined, 'bold');
  doc.text("Child's Name:", M, y);
  doc.setFont(undefined, 'normal');
  doc.setDrawColor(150); doc.setLineWidth(0.3);
  doc.line(M + 28, y - 1, M + 90, y - 1);
  doc.setFont(undefined, 'bold');
  doc.text("Child's Age:", M + 96, y);
  doc.setFont(undefined, 'normal');
  doc.line(M + 119, y - 1, M + 150, y - 1);
  doc.setFont(undefined, 'bold');
  doc.text('Date:', M + 156, y);
  doc.setFont(undefined, 'normal');
  doc.line(M + 165, y - 1, M + 196, y - 1);
  y += 12;

  // ── PAGE 1: Section A — Inattention (Q1–Q9) ──
  let qNum = 1;
  const groupA = ASSESSMENT_QUESTIONS[0];
  sectionBar(`Section ${groupA.section}: ${groupA.sectionTitle} (Q1\u2013Q9)`);
  groupA.items.forEach((text) => drawQuestionYesNo(qNum++, text));

  // ── PAGE 2: Section B — Hyperactivity (Q10–Q15) + Section C — Impulsivity (Q16–Q18) + Medical Disclaimer ──
  doc.addPage(); y = 20;
  const groupB = ASSESSMENT_QUESTIONS[1];
  sectionBar(`Section ${groupB.section}: ${groupB.sectionTitle} (Q10\u2013Q15)`);
  groupB.items.forEach((text) => drawQuestionYesNo(qNum++, text));
  const groupC = ASSESSMENT_QUESTIONS[2];
  sectionBar(`Section ${groupC.section}: ${groupC.sectionTitle} (Q16\u2013Q18)`);
  groupC.items.forEach((text) => drawQuestionYesNo(qNum++, text));

  // Medical disclaimer — kept on page 2
  y += 4;
  const discLines = doc.splitTextToSize(MEDICAL_DISCLAIMER, CW - 8);
  const discBoxH = discLines.length * 5 + 12;
  ensure(discBoxH + 4);
  doc.setFillColor(255, 243, 205);
  doc.rect(M, y, CW, discBoxH, 'F');
  doc.setFontSize(9); doc.setTextColor(100, 80, 0); doc.setFont(undefined, 'bold');
  doc.text('Medical Disclaimer', M + 4, y + 7);
  doc.setFont(undefined, 'normal');
  doc.text(discLines, M + 4, y + 13);

  // ── PAGE 3: Tally Worksheet + When to Seek Attention ──
  doc.addPage();
  doc.setFillColor(21, 101, 192);
  doc.rect(0, 0, PW, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont(undefined, 'bold');
  doc.text('Tally Worksheet', PW / 2, 14, { align: 'center' });
  y = 30;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10); doc.setFont(undefined, 'normal');
  doc.text('Count the number of Yes and No answers in each section and write the totals below.', M, y);
  y += 9;

  // Per-section tally rows
  ASSESSMENT_QUESTIONS.forEach((group) => {
    sectionBar(`Section ${group.section}: ${group.sectionTitle}`);
    labelBox(`Yes responses (of ${group.items.length}):`, y, 14); y += 8;
    labelBox(`No responses (of ${group.items.length}):`, y, 14); y += 10;
  });

  // Combined + totals
  sectionBar('Hyperactivity + Impulsivity (combined view)');
  labelBox('Combined Yes responses (of 9):', y, 14); y += 8;
  labelBox('Combined No responses (of 9):', y, 14); y += 10;

  sectionBar('Overall Totals');
  labelBox('Total Yes responses (of 18):', y, 14); y += 8;
  labelBox('Total No responses (of 18):', y, 14); y += 12;

  // When to seek attention (screening thresholds — a prompt to consult a professional)
  sectionBar('When to Seek Attention');
  doc.setFontSize(9.5); doc.setTextColor(60, 60, 60); doc.setFont(undefined, 'normal');
  [
    'If your child receives 6 or more \u201cYes\u201d answers in the Inattention section (out of 9), consider seeking professional attention.',
    'If your child receives more than 6 \u201cYes\u201d answers across the Hyperactivity and Impulsivity sections combined (out of 9), consider seeking professional attention.',
  ].forEach((line) => {
    const sl = doc.splitTextToSize('\u2022 ' + line, CW);
    ensure(sl.length * 5 + 2); doc.text(sl, M, y); y += sl.length * 5 + 2;
  });
  doc.setFont(undefined, 'italic'); doc.setFontSize(9);
  const seekNote = doc.splitTextToSize(SEEK_ATTENTION_ADVISORY.note, CW);
  ensure(seekNote.length * 5 + 3); doc.text(seekNote, M, y); y += seekNote.length * 5 + 8;
  doc.setFont(undefined, 'normal'); doc.setFontSize(10);

  // Safety: trim to exactly 3 pages
  const totalPages = doc.getNumberOfPages();
  for (let p = totalPages; p > 3; p--) doc.deletePage(p);

  doc.save('ADHD-Screening-Offline-Assessment.pdf');
  showToast('Offline assessment PDF downloaded!');
}

// ── CommonJS export for the Node test runner (no effect in the browser) ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { downloadPDFReport, downloadOfflineAssessmentPDF };
}
