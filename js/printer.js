/**
 * printer.js — Bluetooth Thermal Printer support for MorningRoutineTracker
 *
 * Targets 57mm BLE thermal printers (Toy Imagine Mini and similar OEM pocket printers).
 *
 * HOW IT WORKS
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. All tasks completed → congrats panel shows → "Print Sticker" button appears.
 * 2. Child / teacher taps "Print Sticker" (this user-gesture is required by browsers).
 * 3. Chrome BLE device picker opens → select the printer.
 * 4. Code auto-discovers the writable characteristic under service ff00.
 * 5. ESC/POS payload is sent in 20-byte chunks → printer prints the sticker.
 *
 * COMPATIBILITY
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ Chrome 56+ on Windows / Android
 * ✅ Edge 79+ on Windows
 * ❌ Firefox (no Web Bluetooth support)
 * ❌ Safari (partial, requires flag)
 *
 * The page MUST be served via http://localhost or https://.
 * Opening index.html directly as a file:// URL will NOT work.
 */

'use strict';

// ── BLE service / characteristic UUIDs ───────────────────────────────────────
// All UUIDs here must ALSO appear in the optionalServices list inside
// connectAndPrint() — Chrome blocks access to any UUID not declared there.

const PRINTER_SERVICES = [
  // Nordic UART-style — most common on generic 57mm pocket printers (GB01, GT01, MXW…)
  '0000ff00-0000-1000-8000-00805f9b34fb',
  // Alt service seen on some Peripage / MXW clones
  '000018f0-0000-1000-8000-00805f9b34fb',
  // Other variants found in the wild
  '0000ae30-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000ffe5-0000-1000-8000-00805f9b34fb',
  // Generic GATT services (needed for nRF Connect simulator)
  '0000180a-0000-1000-8000-00805f9b34fb',
  '0000180f-0000-1000-8000-00805f9b34fb',
  '00001800-0000-1000-8000-00805f9b34fb',
  '00001801-0000-1000-8000-00805f9b34fb',
];

// ── Sticker content ───────────────────────────────────────────────────────────

const PRINT_MESSAGE = 'Good Job Little Champ, you are the best!';

// ── ESC/POS helpers ───────────────────────────────────────────────────────────

const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

const cmdInit  = ()      => new Uint8Array([ESC, 0x40]);
const cmdFeed  = (n = 1) => new Uint8Array(Array(n).fill(LF));
const cmdCut   = ()      => new Uint8Array([GS, 0x56, 0x01]);
const cmdBold  = (on)    => new Uint8Array([ESC, 0x45, on ? 1 : 0]);
const cmdAlign = (a)     => new Uint8Array([ESC, 0x61, a === 'center' ? 1 : a === 'right' ? 2 : 0]);
const cmdSize  = (w, h)  => {
  const n = ((Math.max(1, Math.min(8, w)) - 1) << 4) | (Math.max(1, Math.min(8, h)) - 1);
  return new Uint8Array([GS, 0x21, n]);
};

/** Encode string to Latin-1 bytes (non-Latin replaced with '?'). */
function encodeText(text) {
  const bytes = [];
  for (const ch of text) {
    const code = ch.codePointAt(0);
    bytes.push(code < 256 ? code : 0x3f);
  }
  return new Uint8Array(bytes);
}

/** Concatenate Uint8Arrays. */
function concatBytes(...arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

/** Word-wrap text to maxLen chars per line. */
function wrapText(text, maxLen) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxLen) { cur = next; }
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ── Build sticker payload ─────────────────────────────────────────────────────

/**
 * Builds the ESC/POS byte payload for the sticker.
 *
 * Printed layout:
 *   * * * * * * * * * * * * * *
 *      All Tasks Completed!
 *   * * * * * * * * * * * * * *
 *
 *          Well done [Child Name]   ← double-size bold
 *
 *   Good Job Little Champ,
 *   you are the best!
 *
 *   * * * * * * * * * * * * *
 *        Well Done !!
 *   * * * * * * * * * * * * *
 */
function buildPrintPayload() {
  const trackerData = JSON.parse(localStorage.getItem('taskTrackerData'));
  const name = (trackerData && trackerData.username) || APP_CONFIG.studentName || 'Student';

  const parts = [
    cmdInit(),
    cmdAlign('center'),

    // Top star row + achievement
    cmdBold(true),
    cmdFeed(),
    encodeText('* * * * * * * * * * * * * *'), cmdFeed(),
    encodeText('   All Tasks Completed!   '), cmdFeed(),
    encodeText('* * * * * * * * * * * * * *'), cmdFeed(),
    cmdFeed(),

    // Child name — double size
    cmdSize(2, 2),
    encodeText('Well done ' + name), cmdFeed(),
    cmdSize(1, 1),
    cmdBold(false),
    cmdFeed(),

    // Motivational message
    ...wrapText(PRINT_MESSAGE, 30).map(line =>
      concatBytes(encodeText(line), cmdFeed())
    ),
    cmdFeed(),

    // Bottom star row + Well Done
    cmdBold(true),
    encodeText('* * * * * * * * * * * * *'), cmdFeed(),
    encodeText('       Well Done !!       '), cmdFeed(),
    encodeText('* * * * * * * * * * * * *'), cmdFeed(),
    cmdBold(false),

    cmdFeed(4),
    cmdCut(),
  ];

  return concatBytes(...parts);
}

// ── BLE connection ────────────────────────────────────────────────────────────

/**
 * Send data in small chunks with delay between each.
 * 20-byte chunks match the minimum BLE MTU so it works on all printers.
 */
async function sendChunked(char, data) {
  const CHUNK = 20;
  for (let i = 0; i < data.length; i += CHUNK) {
    await char.writeValue(data.slice(i, i + CHUNK));
    await new Promise(r => setTimeout(r, 50)); // 50ms gap — prevents buffer overflow
  }
}

/**
 * Probe each known service UUID and return the first writable characteristic found.
 * Chrome only allows access to services declared in optionalServices — that list
 * must stay in sync with PRINTER_SERVICES above.
 */
async function resolveCharacteristic(server) {
  for (const serviceUuid of PRINTER_SERVICES) {
    let svc;
    try { svc = await server.getPrimaryService(serviceUuid); }
    catch (_) { continue; }

    let chars;
    try { chars = await svc.getCharacteristics(); }
    catch (_) { continue; }

    console.log(`[Printer] Service ${serviceUuid} — characteristics:`,
      chars.map(c => `${c.uuid} [${[
        c.properties.write                ? 'write'       : '',
        c.properties.writeWithoutResponse ? 'writeNoResp' : '',
        c.properties.notify               ? 'notify'      : '',
        c.properties.read                 ? 'read'        : '',
      ].filter(Boolean).join(' ')}]`)
    );

    const writable = chars.find(c => c.properties.writeWithoutResponse)
                  || chars.find(c => c.properties.write);

    if (writable) {
      console.log('[Printer] Using characteristic:', writable.uuid);
      return writable;
    }
  }

  throw new Error(
    'Could not find a writable characteristic. ' +
    'Check the Console for [Printer] service logs, or run bluetoothDiagnostic() to inspect the device.'
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Main entry point — called when the "Print Sticker" button is clicked.
 * MUST be triggered by a direct user gesture (click). Cannot be auto-called
 * via setTimeout due to browser security policy for Web Bluetooth.
 */
async function connectAndPrint() {
  if (!navigator.bluetooth) {
    showPrinterError(
      'Web Bluetooth is not supported. Please open this page in Google Chrome or Microsoft Edge ' +
      'via a local server (not file://).'
    );
    return;
  }

  const btn = document.getElementById('btn-print-sticker');
  _setPrintBtnState(btn, 'connecting');

  let device;
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,          // show all BLE devices in picker
      optionalServices: PRINTER_SERVICES,
    });
  } catch (err) {
    // User cancelled the picker — silent reset, not an error
    if (err.name === 'NotFoundError' || err.name === 'NotAllowedError') {
      _setPrintBtnState(btn, 'idle');
      return;
    }
    showPrinterError('Bluetooth error: ' + err.message);
    _setPrintBtnState(btn, 'idle');
    return;
  }

  try {
    _setPrintBtnState(btn, 'pairing');
    const server = await device.gatt.connect();

    _setPrintBtnState(btn, 'printing');
    const char    = await resolveCharacteristic(server);
    const payload = buildPrintPayload();
    await sendChunked(char, payload);

    await device.gatt.disconnect();

    _setPrintBtnState(btn, 'done');
    showToast('🎉 Sticker printed successfully!');
    setTimeout(() => _setPrintBtnState(btn, 'idle'), 3000);

  } catch (err) {
    showPrinterError('Print failed: ' + err.message);
    _setPrintBtnState(btn, 'idle');
    try { if (device?.gatt?.connected) device.gatt.disconnect(); } catch (_) {}
  }
}

/** Update the print button label/state without touching anything else. */
function _setPrintBtnState(btn, state) {
  if (!btn) return;
  const states = {
    idle:       { disabled: false, html: '<i class="fas fa-print me-2"></i>Print Sticker' },
    connecting: { disabled: true,  html: '<i class="fas fa-spinner fa-spin me-2"></i>Connecting…' },
    pairing:    { disabled: true,  html: '<i class="fas fa-spinner fa-spin me-2"></i>Pairing…' },
    printing:   { disabled: true,  html: '<i class="fas fa-spinner fa-spin me-2"></i>Printing…' },
    done:       { disabled: false, html: '<i class="fas fa-check me-2"></i>Printed!' },
  };
  const s = states[state] || states.idle;
  btn.disabled   = s.disabled;
  btn.innerHTML  = s.html;
}

/** Show error via toast (with alert fallback). */
function showPrinterError(message) {
  console.error('[Printer]', message);
  if (typeof showToast === 'function') showToast('⚠️ ' + message);
  else alert(message);
}

/**
 * Diagnostic tool — call bluetoothDiagnostic() from the browser console
 * to see exactly what services and characteristics a device exposes.
 * Useful when the printer isn't recognised.
 */
async function bluetoothDiagnostic() {
  if (!navigator.bluetooth) { alert('Web Bluetooth not supported.'); return; }
  let device;
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICES,
    });
  } catch (e) { alert('Cancelled: ' + e.message); return; }

  try {
    const server = await device.gatt.connect();
    let report = `Device: ${device.name || '(unnamed)'}\n\n`;
    let found  = false;

    for (const uuid of PRINTER_SERVICES) {
      try {
        const svc   = await server.getPrimaryService(uuid);
        const chars = await svc.getCharacteristics();
        found = true;
        report += `SERVICE: ${uuid}\n`;
        for (const c of chars) {
          const props = [
            c.properties.write                ? 'WRITE'        : '',
            c.properties.writeWithoutResponse ? 'WRITE_NO_RESP': '',
            c.properties.notify               ? 'NOTIFY'       : '',
            c.properties.read                 ? 'READ'         : '',
          ].filter(Boolean).join(' | ');
          report += `  char: ${c.uuid}  [${props || 'none'}]\n`;
        }
        report += '\n';
      } catch (_) {}
    }

    device.gatt.disconnect();

    if (!found) {
      report += 'No matching services found.\n';
      report += 'Share the UUID from your device\'s GATT server to add support.\n';
    }

    console.log('[BT Diagnostic]\n' + report);
    alert(report);
  } catch (e) {
    alert('Diagnostic error: ' + e.message);
    try { if (device?.gatt?.connected) device.gatt.disconnect(); } catch (_) {}
  }
}
