import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Line } from "react-chartjs-2";

// --------------------------------------------------------------------------
// Synthetic-but-realistic audio data (static – represents real voice data)
// --------------------------------------------------------------------------
const FS = 16000;
const FRAME_LEN = 400; // 25 ms
const FRAME_HOP = 160; // 10 ms
const N_FFT = 512;
const N_MELS = 13;
const N_FRAMES = 50;

// Generate a synthetic speech-like signal
function synthSpeech(len) {
  const sig = [];
  for (let i = 0; i < len; i++) {
    const t = i / FS;
    sig.push(
      Math.sin(2 * Math.PI * 220 * t) * 0.4 +
        Math.sin(2 * Math.PI * 880 * t) * 0.15 +
        Math.sin(2 * Math.PI * 1760 * t) * 0.05 +
        (Math.random() - 0.5) * 0.02
    );
  }
  return sig;
}
const RAW_SIGNAL = synthSpeech(FS * 0.08); // 80 ms

// Pre-emphasis
function preEmphasis(sig, alpha = 0.97) {
  const out = [sig[0]];
  for (let i = 1; i < sig.length; i++) out.push(sig[i] - alpha * sig[i - 1]);
  return out;
}
const PRE_EMPH_SIGNAL = preEmphasis(RAW_SIGNAL);

// Hamming window
function hammingWin(len) {
  return Array.from({ length: len }, (_, n) => 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / (len - 1)));
}

// Generate a frame from the signal
function getFrame(sig, start, frameLen) {
  const win = hammingWin(frameLen);
  const frame = [];
  for (let i = 0; i < frameLen; i++) {
    const idx = start + i;
    frame.push(idx < sig.length ? sig[idx] * win[i] : 0);
  }
  return frame;
}

// Generate MFCC-like matrix (13 coeffs × 50 frames)
function genMFCC() {
  const matrix = [];
  for (let c = 0; c < N_MELS; c++) {
    const row = [];
    for (let f = 0; f < N_FRAMES; f++) {
      row.push(Math.round((Math.sin((c + 1) * (f + 1) * 0.12) * 40 + 50 + (Math.random() - 0.5) * 8) * 10) / 10);
    }
    matrix.push(row);
  }
  return matrix;
}
const MFCC_DATA = genMFCC();

// FFT magnitude spectrum (simulated)
function genFFT() {
  const bins = N_FFT / 2 + 1;
  const freqs = [];
  const mags = [];
  for (let i = 0; i < bins; i++) {
    const f = (i * FS) / N_FFT;
    freqs.push(f);
    const peak = Math.exp(-((f - 880) ** 2) / (2 * 200 ** 2)) * 0.8 + Math.exp(-((f - 220) ** 2) / (2 * 120 ** 2)) * 0.5;
    mags.push(Math.max(0.01, peak + (Math.random() - 0.5) * 0.06));
  }
  return { freqs, mags };
}
const FFT_DATA = genFFT();

// Raw frame matrix for the "Framing & Windowing" section
function genFrameMatrix() {
  const frameLen = FRAME_LEN;
  const hop = FRAME_HOP;
  const win = hammingWin(frameLen);
  const rows = [];
  for (let f = 0; f < 6; f++) {
    const start = f * hop;
    const row = [];
    for (let i = 0; i < frameLen; i++) {
      const idx = start + i;
      row.push(+(idx < RAW_SIGNAL.length ? RAW_SIGNAL[idx] * win[i] : 0).toFixed(4));
    }
    rows.push(row);
  }
  return rows;
}
const FRAME_MATRIX = genFrameMatrix();

// --------------------------------------------------------------------------
// Shared chart options
// --------------------------------------------------------------------------
const noLabels = (base = {}) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { display: false },
    y: { display: false },
  },
  animation: { duration: 300 },
  ...base,
});

// --------------------------------------------------------------------------
// Section definitions
// --------------------------------------------------------------------------
const SECTIONS = [
  { id: "preemphasis", title: "Pre-emphasis", icon: "📈" },
  { id: "framing", title: "Framing & Windowing", icon: "🔲" },
  { id: "fft", title: "Fast Fourier Transform", icon: "📉" },
  { id: "mfcc", title: "Mel Filterbank & MFCC", icon: "🌡️" },
];

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------
export default function Page2_Codebook() {
  const [active, setActive] = useState("preemphasis");
  const [showRawMatrix, setShowRawMatrix] = useState(false);

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8">
      {/* ================================================================ */}
      {/* SIDEBAR                                                           */}
      {/* ================================================================ */}
      <aside className="hidden w-64 shrink-0 md:block">
        <div className="glass sticky top-20 rounded-2xl p-3">
          <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Codebook
          </h3>
          <nav className="space-y-1">
            {SECTIONS.map(({ id, title, icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                  active === id
                    ? "bg-indigo-500/15 text-indigo-400"
                    : "text-slate-400 hover:bg-slate-700/30 hover:text-slate-200"
                }`}
              >
                <span>{icon}</span>
                {title}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* ================================================================ */}
      {/* CONTENT                                                           */}
      {/* ================================================================ */}
      <main className="min-w-0 flex-1 space-y-6">
        {/* Mobile section selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:hidden">
          {SECTIONS.map(({ id, title, icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-medium ${
                active === id
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {icon} {title}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {active === "preemphasis" && <PreEmphasisSection />}
            {active === "framing" && (
              <FramingSection onShowMatrix={() => setShowRawMatrix(true)} />
            )}
            {active === "fft" && <FFTSection />}
            {active === "mfcc" && (
              <MFCCSection onShowMatrix={() => setShowRawMatrix(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ================================================================ */}
      {/* RAW MATRIX MODAL                                                  */}
      {/* ================================================================ */}
      <AnimatePresence>
        {showRawMatrix && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShowRawMatrix(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass relative w-full max-w-3xl rounded-2xl p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">
                  Raw MFCC Matrix (13 × {N_FRAMES})
                </h3>
                <button
                  onClick={() => setShowRawMatrix(false)}
                  className="text-lg text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
              <div className="max-h-96 overflow-auto rounded-xl bg-slate-950 p-4">
                <pre className="font-mono text-[10px] leading-tight text-slate-300">
                  <span className="text-slate-500">// MFCC coefficient matrix</span>
                  {"\n"}
                  <span className="text-slate-500">// rows = mel bands (0–12), cols = time frames (0–49)</span>
                  {"\n\n"}
                  {MFCC_DATA.map((row, ri) => (
                    <span key={ri}>
                      <span className="text-indigo-400">[{ri.toString().padStart(2, " ")}]</span>{" "}
                      <span className="text-emerald-300">
                        [{row.map((v) => v.toString().padStart(5, " ")).join(", ")}]
                      </span>
                      {"\n"}
                    </span>
                  ))}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =========================================================================
// SECTION: Pre-emphasis
// =========================================================================
function PreEmphasisSection() {
  const before = RAW_SIGNAL.slice(0, 300);
  const after = PRE_EMPH_SIGNAL.slice(0, 300);
  const labels = Array.from({ length: 300 }, (_, i) => i);

  const data = {
    labels,
    datasets: [
      {
        label: "Before",
        data: before,
        borderColor: "#94a3b8",
        backgroundColor: "rgba(148,163,184,0.05)",
        fill: true,
        pointRadius: 0,
        borderWidth: 1.5,
      },
      {
        label: "After (α=0.97)",
        data: after,
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.08)",
        fill: true,
        pointRadius: 0,
        borderWidth: 1.5,
      },
    ],
  };

  return (
    <SectionShell
      title="Pre-emphasis"
      subtitle="y(t) = x(t) − α · x(t−1)"
    >
      {/* Formula card */}
      <div className="glass mb-6 rounded-2xl p-6 text-center">
        <p className="mb-2 text-xs text-slate-400">Formula</p>
        <p className="font-mono text-2xl font-bold text-indigo-400">
          y(t) = x(t) − <span className="text-emerald-400">α</span> · x(t−1)
        </p>
        <p className="mt-2 text-xs text-slate-500">
          where α = 0.97 (pre-emphasis coefficient)
        </p>
      </div>

      {/* Side-by-side plots */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass rounded-2xl p-4">
          <h4 className="mb-3 text-xs font-medium text-slate-400">
            Original Signal
          </h4>
          <div className="h-44">
            <Line
              data={{
                labels,
                datasets: [data.datasets[0]],
              }}
              options={noLabels()}
            />
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <h4 className="mb-3 text-xs font-medium text-slate-400">
            After Pre-emphasis
          </h4>
          <div className="h-44">
            <Line
              data={{
                labels,
                datasets: [data.datasets[1]],
              }}
              options={noLabels()}
            />
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="glass mt-6 rounded-2xl p-5 text-sm leading-relaxed text-slate-300">
        <p>
          Pre-emphasis compensates for the high-frequency attenuation that
          occurs during speech production (the 6 dB/octave spectral tilt). By
          applying a first-order high-pass filter, we boost higher frequencies
          to balance the spectrum, making subsequent FFT analysis more
          accurate.
        </p>
      </div>
    </SectionShell>
  );
}

// =========================================================================
// SECTION: Framing & Windowing
// =========================================================================
function FramingSection({ onShowMatrix }) {
  const frameLen = FRAME_LEN;
  const hop = FRAME_HOP;
  const win = hammingWin(frameLen);
  const labels = Array.from({ length: frameLen }, (_, i) => i);

  // Frame 0 data
  const frame0 = getFrame(RAW_SIGNAL, 0, frameLen);

  const data = {
    labels,
    datasets: [
      {
        label: "Windowed Frame",
        data: frame0,
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.12)",
        fill: true,
        pointRadius: 0,
        borderWidth: 1.5,
      },
      {
        label: "Hamming Window",
        data: win,
        borderColor: "#f59e0b",
        borderDash: [4, 4],
        pointRadius: 0,
        borderWidth: 1.5,
      },
    ],
  };

  return (
    <SectionShell
      title="Framing & Windowing"
      subtitle={`${FRAME_LEN} samples/frame · ${hop} samples/hop · Hamming window`}
    >
      <div className="glass mb-6 rounded-2xl p-4">
        <h4 className="mb-3 text-xs font-medium text-slate-400">
          Frame #0 (25 ms) with Hamming Window Overlay
        </h4>
        <div className="h-48">
          <Line data={data} options={noLabels()} />
        </div>
      </div>

      {/* Raw frame matrix */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-medium text-slate-400">
            Raw Frame Matrix (first 6 frames)
          </h4>
          <button
            onClick={onShowMatrix}
            className="rounded-lg bg-indigo-600/20 px-3 py-1.5 text-[11px] font-medium text-indigo-400 transition hover:bg-indigo-600/30"
          >
            View Raw Matrix
          </button>
        </div>
        <div className="max-h-60 overflow-auto rounded-xl bg-slate-950 p-4">
          <pre className="font-mono text-[10px] leading-relaxed text-slate-300">
            <span className="text-slate-500">// Framed & windowed signal</span>
            {"\n"}
            <span className="text-slate-500">// shape: (6, {FRAME_LEN})</span>
            {"\n\n"}
            {FRAME_MATRIX.map((row, ri) => (
              <span key={ri}>
                <span className="text-indigo-400">frame[{ri}]</span> = [{" "}
                {row.slice(0, 12).map((v, vi) => (
                  <span key={vi}>
                    {vi > 0 && <span className="text-slate-600">, </span>}
                    <span className="text-emerald-300">{v.toFixed(3)}</span>
                  </span>
                ))}{" "}
                <span className="text-slate-600">… {row.length - 12} more</span>]
                {"\n"}
              </span>
            ))}
          </pre>
        </div>
      </div>
    </SectionShell>
  );
}

// =========================================================================
// SECTION: Fast Fourier Transform
// =========================================================================
function FFTSection() {
  const { freqs, mags } = FFT_DATA;
  const labels = freqs.map((f) => +(f / 1000).toFixed(2));

  const data = {
    labels,
    datasets: [
      {
        label: "Magnitude",
        data: mags,
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.12)",
        fill: true,
        pointRadius: 0,
        borderWidth: 1.5,
      },
    ],
  };

  return (
    <SectionShell title="Fast Fourier Transform" subtitle="N = 512 · Hamming window · 257 frequency bins">
      <div className="glass mb-6 rounded-2xl p-4">
        <h4 className="mb-3 text-xs font-medium text-slate-400">
          Frequency Domain Spectrum (Hz vs. Magnitude)
        </h4>
        <div className="h-56">
          <Line
            data={data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: {
                  display: true,
                  title: { display: true, text: "Frequency (kHz)", color: "#64748b" },
                  ticks: { color: "#475569", font: { size: 10 } },
                  grid: { color: "rgba(71,85,105,0.15)" },
                },
                y: {
                  display: true,
                  title: { display: true, text: "Magnitude", color: "#64748b" },
                  ticks: { color: "#475569", font: { size: 10 } },
                  grid: { color: "rgba(71,85,105,0.15)" },
                },
              },
              animation: { duration: 300 },
            }}
          />
        </div>
      </div>

      <div className="glass rounded-2xl p-5 text-sm leading-relaxed text-slate-300">
        <p>
          The FFT converts each time-domain frame into the frequency domain.
          Peaks at ~220 Hz and ~880 Hz correspond to the fundamental frequency
          (F0) and first formant (F1) of the vowel /a/. The spectrum reveals
          the harmonic structure of the speech signal.
        </p>
      </div>
    </SectionShell>
  );
}

// =========================================================================
// SECTION: Mel Filterbank & MFCC
// =========================================================================
function MFCCSection({ onShowMatrix }) {
  const melBands = Array.from({ length: N_MELS }, (_, i) => i);
  const timeFrames = Array.from({ length: N_FRAMES }, (_, i) => i);

  return (
    <SectionShell title="Mel Filterbank & MFCC" subtitle="13 mel coefficients · 50 time frames">
      {/* Heatmap */}
      <div className="glass mb-6 rounded-2xl p-4">
        <h4 className="mb-3 text-xs font-medium text-slate-400">
          MFCC Heatmap
        </h4>
        <div className="overflow-x-auto">
          <div className="inline-grid" style={{ gridTemplateColumns: `repeat(${N_FRAMES}, 1fr)` }}>
            {MFCC_DATA.flatMap((row, ri) =>
              row.map((val, ci) => {
                const intensity = Math.max(0, Math.min(1, (val - 10) / 80));
                const r = Math.round(30 + intensity * 60);
                const g = Math.round(50 + (1 - intensity) * 80);
                const b = Math.round(200 + intensity * 55);
                return (
                  <div
                    key={`${ri}-${ci}`}
                    className="h-4 w-4 border border-slate-800/30"
                    style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                    title={`c[${ri}][${ci}] = ${val}`}
                  />
                );
              })
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
          <span>← Mel band 0</span>
          <span>Mel band 12 →</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
          <span>Frame 0</span>
          <span>Frame {N_FRAMES - 1}</span>
        </div>
      </div>

      {/* Raw matrix */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-slate-400">
            Coefficient Matrix
          </h4>
          <button
            onClick={onShowMatrix}
            className="rounded-lg bg-indigo-600/20 px-3 py-1.5 text-[11px] font-medium text-indigo-400 transition hover:bg-indigo-600/30"
          >
            View Raw Matrix →
          </button>
        </div>
      </div>

      {/* Explanation */}
      <div className="glass mt-6 rounded-2xl p-5 text-sm leading-relaxed text-slate-300">
        <p>
          MFCCs compactly represent the short-term power spectrum of speech.
          After applying the Mel filterbank (triangular filters spaced on the
          Mel scale), we take the log and apply the Discrete Cosine Transform
          (DCT). The resulting 13 coefficients capture the spectral envelope
          — the first coefficient represents average energy, while higher
          coefficients capture finer spectral detail.
        </p>
      </div>
    </SectionShell>
  );
}

// =========================================================================
// Shared section wrapper
// =========================================================================
function SectionShell({ title, subtitle, children }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-100">{title}</h2>
        {subtitle && (
          <p className="mt-1 font-mono text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
