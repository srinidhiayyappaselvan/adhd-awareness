function downloadOfflineAssessmentPDF() {
  if (typeof window.jspdf === 'undefined') {
    showToast('PDF library not loaded. Please refresh the page.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 14;
  const CW = PW - M * 2;

  let y = 0;

  // ── Page space check ──
  const ensure = (needed) => {
    if (y + needed > PH - 12) {
      doc.addPage();
      y = 18;
    }
  };

  // ── Checkbox outline ──
  const box = (x, yPos, w, h) => {
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(x, yPos, w, h, 'S');
  };

  // ── Section heading bar ──
  const sectionBar = (text) => {
    ensure(12);
    y += 1;

    doc.setFillColor(220, 220, 220);
    doc.rect(M, y - 4, CW, 9, 'F');

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10.5);
    doc.setFont(undefined, 'bold');
    doc.text(text, M + 3, y + 2);

    y += 9;
    doc.setTextColor(30, 30, 30);
  };

  // ── Draw question + Yes/No checkboxes ──
  const drawQuestionYesNo = (num, text) => {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9.5);
    doc.setFont(undefined, 'bold');

    const lines = doc.splitTextToSize(text, CW - 28);
    const questionHeight = lines.length * 4.1 + 9;

    // Check space using the actual wrapped question height
    ensure(questionHeight + 5);

    doc.text(`Q${num}.`, M, y);

    doc.setFont(undefined, 'normal');
    doc.text(lines, M + 8, y);

    y += lines.length * 4.1 + 1.5;

    const opts = ['Yes', 'No'];
    const boxS = 4;

    doc.setFontSize(8.5);

    opts.forEach((opt, i) => {
      const cx = M + i * 26 + 2;

      box(cx, y - 3.5, boxS, boxS);
      doc.text(opt, cx + boxS + 2, y - 0.3);
    });

    y += 6;
  };

  // ── PAGE 1 HEADER ──
  const HDR_H = 36;

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(0, HDR_H, PW, HDR_H);

  // QR code
  const QR_SIZE = 26;
  const QR_X = PW - M - QR_SIZE;
  const QR_Y = (HDR_H - QR_SIZE) / 2;

  if (typeof QR_CODE_DATA_URL !== 'undefined' && QR_CODE_DATA_URL) {
    doc.addImage(QR_CODE_DATA_URL, 'PNG', QR_X, QR_Y, QR_SIZE, QR_SIZE);
  } else {
    doc.setDrawColor(0);
    doc.rect(QR_X, QR_Y, QR_SIZE, QR_SIZE, 'S');

    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text('QR', QR_X + QR_SIZE / 2, QR_Y + QR_SIZE / 2 + 1, {
      align: 'center'
    });
  }

  // Header text
  const textAreaW = QR_X - M;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');

  doc.text(
    'ADHD Screening Assessment — Offline Form',
    M + textAreaW / 2,
    13,
    { align: 'center' }
  );

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');

  doc.text(
    `${APP_CONFIG.school} | ${APP_CONFIG.project}`,
    M + textAreaW / 2,
    22,
    { align: 'center' }
  );

  doc.text(
    'Educational awareness tool — not a clinical diagnosis',
    M + textAreaW / 2,
    30,
    { align: 'center' }
  );

  // ── Instructions ──
  y = 44;

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9.5);
  doc.setFont(undefined, 'bold');

  doc.text('Instructions:', M, y);
  y += 5.5;

  doc.setFont(undefined, 'normal');

  [
    '1. Answer all 18 questions based on behaviour observed over the past 6 months.',
    '2. Tick one box per question: Yes or No.',
    '3. The behaviour should be observed in 2 or more settings (School, Home, etc.).',
    '4. This is an awareness tool — it cannot diagnose ADHD.'
  ].forEach((line) => {
    doc.text(line, M, y);
    y += 4.5;
  });

  y += 3;

  // ── Child details ──
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');

  doc.text("Child's Name:", M, y);
  doc.setFont(undefined, 'normal');

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(M + 28, y - 1, M + 88, y - 1);

  doc.setFont(undefined, 'bold');
  doc.text("Child's Age:", M + 92, y);
  doc.setFont(undefined, 'normal');
  doc.line(M + 114, y - 1, M + 143, y - 1);

  doc.setFont(undefined, 'bold');
  doc.text('Date:', M + 147, y);
  doc.setFont(undefined, 'normal');
  doc.line(M + 160, y - 1, M + 182, y - 1);

  y += 10;

  // ── PAGE 1: SECTION A ──
  const groupA = PDF_QUESTIONS[0];

  sectionBar(
    `Section ${groupA.section}: ${groupA.sectionTitle} (Q1–Q9)`
  );

  let qNum = 1;

  groupA.items.forEach((text) => {
    drawQuestionYesNo(qNum++, text);
  });

  // ── PAGE 2 ──
  doc.addPage();
  y = 20;

  // Page 2 header
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);

  doc.setFontSize(8.5);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(60, 60, 60);

  doc.text(
    `${APP_CONFIG.school} | ${APP_CONFIG.project} — Educational awareness tool, not a clinical diagnosis`,
    PW / 2,
    11,
    { align: 'center' }
  );

  doc.line(M, 15, PW - M, 15);

  y = 22;

  // ── PAGE 2: SECTION B ──
  const groupB = PDF_QUESTIONS[1];

  if (!groupB || !Array.isArray(groupB.items)) {
    showToast('Section B data is missing from PDF_QUESTIONS.');
    return;
  }

  sectionBar(
    `Section ${groupB.section}: ${groupB.sectionTitle} (Q10–Q15)`
  );

  groupB.items.forEach((text) => {
    drawQuestionYesNo(qNum++, text);
  });

  // Section C intentionally excluded
  // const groupC = ASSESSMENT_QUESTIONS[2];
  // sectionBar(`Section ${groupC.section}: ${groupC.sectionTitle} (Q16–Q18)`);
  // groupC.items.forEach((text) => drawQuestionYesNo(qNum++, text));

  // ── How to Interpret Your Answers ──
  y += 3;

  ensure(30);

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'bold');

  doc.text('How to Interpret Your Answers', M, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');

  const introLines = doc.splitTextToSize(
    'Count the number of "Yes" answers in each section.',
    CW - 8
  );

  ensure(introLines.length * 4.5 + 2);
  doc.text(introLines, M, y);
  y += introLines.length * 4.5 + 3;

  const patterns = [
    '1. Predominantly Inattentive Presentation — 6 or more Yes answers in Section A (Q1–Q9).',
    '2. Predominantly Hyperactive-impulsive Presentation — 6 or more Yes answers in Sections B(Q10–Q18).',
    '3. Combined pattern — 6 or more Yes answers in Section A AND 6 or more Yes answers in Sections B.'
  ];

  patterns.forEach((p) => {
    const pl = doc.splitTextToSize(p, CW - 8);

    ensure(pl.length * 4.5 + 2);
    doc.text(pl, M, y);
    y += pl.length * 4.5 + 2;
  });

  // ── Important: Educational Awareness Only ──
  y += 2;

  const importantNote =
    'These patterns do not confirm or rule out ADHD and are not a clinical diagnosis. ' +
    'This questionnaire is an awareness and preliminary observation tool only. ' +
    'A qualified healthcare professional must conduct a comprehensive evaluation before any diagnosis or treatment.';

  const noteLines = doc.splitTextToSize(importantNote, CW - 8);
  const noteBoxH = noteLines.length * 4.5 + 13;

  ensure(noteBoxH + 2);

  doc.setFillColor(235, 235, 235);
  doc.rect(M, y, CW, noteBoxH, 'F');

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(M, y, CW, noteBoxH, 'S');

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'bold');

  doc.text('Important – Educational Awareness Only', M + 4, y + 6);

  doc.setFont(undefined, 'normal');
  doc.setTextColor(30, 30, 30);

  doc.text(noteLines, M + 4, y + 12);

  // ── Validate page count ──
  const totalPages = doc.getNumberOfPages();

  if (totalPages > 2) {
    showToast(
      'PDF content exceeds 2 pages. Please reduce question spacing or font size.'
    );
    return;
  }

  // ── Download ──
  doc.save('ADHD-Screening-Offline-Assessment.pdf');

  showToast('Offline assessment PDF downloaded!');
}