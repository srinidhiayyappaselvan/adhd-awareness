/**
 * Render test for the offline printable assessment PDF.
 *
 * Actually builds the PDF with jsPDF (dev dependency) and asserts:
 *   - it is exactly 2 pages
 *   - Section A (Inattention) is on page 1
 *   - "How to Interpret Your Answers" is on page 2
 *   - The "Important – Educational Awareness Only" disclaimer is on page 2
 *
 * The site itself still loads jsPDF from the CDN; this dev dependency is for
 * testing only. jsPDF attaches its methods to each instance, so we wrap the
 * constructor to instrument the per-instance save() / text() methods.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { jsPDF } = require('jspdf');
const config = require('../js/config.js');

// Browser-ish globals that pdf.js expects (free-variable lookups).
global.APP_CONFIG = config.APP_CONFIG;
global.ASSESSMENT_QUESTIONS = config.ASSESSMENT_QUESTIONS;
global.SEEK_ATTENTION_ADVISORY = config.SEEK_ATTENTION_ADVISORY;
global.MEDICAL_DISCLAIMER = config.MEDICAL_DISCLAIMER;
global.QR_CODE_DATA_URL = config.QR_CODE_DATA_URL;   // real base64 data URL
global.showToast = () => {};

const pdf = require('../js/pdf.js');

/** Build the offline PDF with save()/text() instrumented per instance. */
function buildOfflineWithTracking() {
  let capturedDoc = null;
  const pageText = {};
  const RealJsPDF = jsPDF;

  function PatchedJsPDF() {
    const doc = new RealJsPDF();
    const origText = doc.text;
    // No-op save so no file is written; capture the doc instead.
    doc.save = function () { capturedDoc = doc; };
    // Record every piece of text against the current page number.
    doc.text = function (txt) {
      const page = doc.getNumberOfPages();
      const s = Array.isArray(txt) ? txt.join(' ') : String(txt);
      pageText[page] = (pageText[page] || '') + ' ' + s;
      return origText.apply(doc, arguments);
    };
    return doc;
  }

  const prevWindow = global.window;
  global.window = { jspdf: { jsPDF: PatchedJsPDF } };
  try {
    pdf.downloadOfflineAssessmentPDF();
  } finally {
    global.window = prevWindow;
  }
  return { capturedDoc, pageText };
}

test('offline PDF: produces exactly 2 pages', () => {
  const { capturedDoc } = buildOfflineWithTracking();
  assert.ok(capturedDoc, 'a jsPDF document should be created');
  assert.equal(capturedDoc.getNumberOfPages(), 2);
});

test('offline PDF: Inattention section is on page 1', () => {
  const { pageText } = buildOfflineWithTracking();
  assert.ok(
    (pageText[1] || '').toLowerCase().includes('inattention'),
    'page 1 should contain the Inattention section'
  );
});

test('offline PDF: "How to Interpret Your Answers" is on page 2', () => {
  const { pageText } = buildOfflineWithTracking();
  assert.ok(
    (pageText[2] || '').toLowerCase().includes('how to interpret'),
    `page 2 should contain the interpretation guide; got: ${(pageText[2] || '').slice(0, 200)}`
  );
});

test('offline PDF: disclaimer is on page 2', () => {
  const { pageText } = buildOfflineWithTracking();
  assert.ok(
    (pageText[2] || '').toLowerCase().includes('educational awareness only'),
    'page 2 should contain the Educational Awareness Only disclaimer'
  );
});
