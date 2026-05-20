import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Line } from "react-chartjs-2";
import axios from "axios";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
);

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------
const V2T_STEPS = [
  {
    title: "Raw Audio Acquisition",
    desc: "Capturing microphone input signal at 16 kHz",
    icon: "🎤",
  },
  {
    title: "Feature Extraction",
    desc: "Pre-emphasis → Framing → Windowing → FFT → MFCC",
    icon: "📊",
  },
  {
    title: "Acoustic & Language Model Decoding",
    desc: "Phoneme alignment via HMM-GMM & n-gram LM scoring",
    icon: "🧠",
  },
  {
    title: "Semantic Execution",
    desc: "Running Arithmetic Challenge validation on decoded text",
    icon: "✓",
  },
];

const T2V_STEPS = [
  {
    title: "Text Normalization",
    desc: "Cleaning, tokenization & number expansion",
    icon: "📝",
  },
  {
    title: "Phonemization (G2P)",
    desc: "Grapheme-to-Phoneme conversion via pronunciation lexicon",
    icon: "🔤",
  },
  {
    title: "Mel-Spectrogram Generation",
    desc: "Tacotron-2 encoder-decoder producing mel frames",
    icon: "🎵",
  },
  {
    title: "Vocoding",
    desc: "WaveGlow / HiFi-GAN waveform synthesis",
    icon: "🔊",
  },
];

const PLACEHOLDER_EQUATION = "9 + 5 - 6 * 3 / 2 + 7 + 4";

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------
function generateWave(offset = 0) {
  return Array.from({ length: 80 }, (_, i) =>
    Math.sin((i + offset) * 0.18) * 0.6 +
    Math.sin((i + offset) * 0.45) * 0.3 +
    (Math.random() - 0.5) * 0.15
  );
}

function liveWaveOptions(color = "#6366f1") {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { display: false },
      y: { display: false, min: -1, max: 1 },
    },
    animation: { duration: 150 },
  };
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------
export default function Page1_Dashboard() {
  const [mode, setMode] = useState("v2t");
  const [textInput, setTextInput] = useState("");
  const [output, setOutput] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [waveData, setWaveData] = useState(generateWave());

  const intervalRef = useRef(null);
  const steps = mode === "v2t" ? V2T_STEPS : T2V_STEPS;

  // Live waveform animation while recording or processing
  useEffect(() => {
    if (isRecording || isProcessing) {
      let i = 0;
      intervalRef.current = setInterval(() => {
        i++;
        setWaveData(generateWave(i * 3));
      }, 120);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRecording, isProcessing]);

  const chartData = {
    labels: Array.from({ length: 80 }, (_, i) => i),
    datasets: [
      {
        label: "Signal",
        data: waveData,
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.08)",
        fill: true,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };

  // ---- recording toggle (simulated) ----
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      setTextInput(PLACEHOLDER_EQUATION);
      // auto-start processing after short delay
      setTimeout(() => triggerProcessing(PLACEHOLDER_EQUATION), 400);
    } else {
      setIsRecording(true);
    }
  }, [isRecording]);

  // ---- core processing ----
  const triggerProcessing = useCallback(
    async (equation) => {
      setIsProcessing(true);
      setProcessStep(0);
      setOutput(null);
      const total = steps.length;
      for (let i = 1; i <= total; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        setProcessStep(i);
      }
      try {
        const res = await axios.post("http://localhost:8000/validate", {
          equation,
        });
        setOutput(res.data);
      } catch {
        setOutput({ valid: false, errors: ["API unreachable – using strict rules"], result: null });
      }
      setIsProcessing(false);
    },
    [steps.length]
  );

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    triggerProcessing(textInput.trim());
  };

  const invalidEq = textInput && output && !output.valid;
  const validEq = textInput && output && output.valid;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      {/* ================================================================ */}
      {/* TOP – Mode Switcher                                               */}
      {/* ================================================================ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-4"
      >
        <span
          className={`text-sm font-medium ${
            mode === "v2t" ? "text-indigo-400" : "text-slate-500"
          }`}
        >
          Voice-to-Text
        </span>
        <button
          onClick={() => {
            if (isProcessing) return;
            setMode((m) => (m === "v2t" ? "t2v" : "v2t"));
            setOutput(null);
            setProcessStep(0);
            setIsRecording(false);
          }}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            mode === "v2t" ? "bg-indigo-600" : "bg-emerald-600"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              mode === "v2t" ? "translate-x-1" : "translate-x-6"
            }`}
          />
        </button>
        <span
          className={`text-sm font-medium ${
            mode === "t2v" ? "text-emerald-400" : "text-slate-500"
          }`}
        >
          Text-to-Voice
        </span>
      </motion.div>

      {/* ================================================================ */}
      {/* MIDDLE – Input / Output Cards                                     */}
      {/* ================================================================ */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* ---- Left: Input ---- */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Input
          </h3>

          {mode === "v2t" ? (
            <div className="flex flex-col items-center gap-5">
              <button
                onClick={toggleRecording}
                disabled={isProcessing}
                className={`flex h-24 w-24 items-center justify-center rounded-full text-3xl transition-all ${
                  isRecording
                    ? "recording bg-red-500/20 text-red-400"
                    : "bg-slate-700/50 text-slate-400 hover:bg-indigo-500/20 hover:text-indigo-400"
                }`}
              >
                {isRecording ? "⏺" : "🎤"}
              </button>
              <p className="text-center text-sm text-slate-400">
                {isRecording
                  ? "Recording… tap to stop"
                  : "Tap microphone to capture voice"}
              </p>
              {/* live waveform preview */}
              <div className="h-20 w-full">
                <Line data={chartData} options={liveWaveOptions()} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={`Enter equation e.g. ${PLACEHOLDER_EQUATION}`}
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-600/50 bg-slate-800/50 p-4 text-sm text-slate-100 placeholder-slate-500 caret-indigo-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handleTextSubmit}
                disabled={isProcessing || !textInput.trim()}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-40"
              >
                {isProcessing ? "Processing…" : "Generate Voice"}
              </button>
            </div>
          )}
        </motion.div>

        {/* ---- Right: Output ---- */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-6"
        >
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Output
          </h3>

          {mode === "v2t" ? (
            <div className="space-y-4">
              {/* Transcribed text */}
              <div className="rounded-xl bg-slate-800/50 p-4">
                <p className="mb-1 text-xs text-slate-500">Transcribed text</p>
                <p className="font-mono text-sm text-slate-200">
                  {textInput || "—"}
                </p>
              </div>
              {/* Validation result */}
              <AnimatePresence mode="wait">
                {output && (
                  <motion.div
                    key={output.valid ? "valid" : "invalid"}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`rounded-xl border p-4 ${
                      output.valid
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-red-500/30 bg-red-500/10"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-lg">
                        {output.valid ? "✅" : "❌"}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          output.valid ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {output.valid ? "VALID" : "INVALID"}
                      </span>
                    </div>
                    {output.result !== null && output.result !== undefined && (
                      <p className="font-mono text-xs text-slate-400">
                        Result ={" "}
                        <span className="text-slate-200">{output.result}</span>
                      </p>
                    )}
                    {output.errors?.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {output.errors.map((e, i) => (
                          <li
                            key={i}
                            className="font-mono text-xs text-red-300"
                          >
                            • {e}
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-700/50 text-3xl">
                🔊
              </div>
              <p className="text-sm text-slate-400">
                {output ? "Generated audio ready" : "Awaiting input…"}
              </p>
              {output && (
                <div className="flex w-full items-center gap-3 rounded-xl bg-slate-800/50 px-4 py-3">
                  <div className="flex-1">
                    <div className="mb-1 h-1.5 rounded-full bg-slate-600">
                      <div className="h-full w-3/5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0:00</span>
                      <span>0:03</span>
                    </div>
                  </div>
                  <button className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm text-white">
                    ▶
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* ================================================================ */}
      {/* BOTTOM – Dynamic Process Cards (sequential fade-in)                */}
      {/* ================================================================ */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Processing Pipeline
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => {
            const active = processStep > idx;
            const current = processStep === idx + 1;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                animate={
                  processStep > idx
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 24 }
                }
                transition={{ duration: 0.5, delay: current ? 0 : 0 }}
                className={`rounded-2xl border p-5 transition-all ${
                  current
                    ? "border-indigo-500/50 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                    : active
                    ? "border-slate-600/30 bg-slate-800/40"
                    : "border-slate-700/20 bg-slate-800/20 opacity-30"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-2xl">{step.icon}</span>
                  {active && (
                    <span className="text-xs text-emerald-400">✔ done</span>
                  )}
                  {current && (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
                  )}
                </div>
                <h4 className="mb-1 text-sm font-medium text-slate-200">
                  {idx + 1}. {step.title}
                </h4>
                <p className="text-xs text-slate-500">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* Summary Banner (when processing finishes)                          */}
      {/* ================================================================ */}
      <AnimatePresence>
        {!isProcessing && output && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5 text-center"
          >
            <p className="text-sm text-slate-400">
              {mode === "v2t"
                ? "Voice processed & validated through the full pipeline."
                : "Text synthesized through the full TTS pipeline."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
