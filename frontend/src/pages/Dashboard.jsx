import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Play, StopCircle, RefreshCw, Upload } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import axios from 'axios';
import WaveformVisualizer from '../components/WaveformVisualizer';
import HeatmapVisualizer from '../components/HeatmapVisualizer';

const API_URL = "http://localhost:8000/api";

const Dashboard = () => {
  const { pipelineData, setPipelineData, mode, setMode } = useAppContext();
  
  const [isRecording, setIsRecording] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [liveVolume, setLiveVolume] = useState(0);
  
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setPipelineData(null);
    setError(null);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    await processV2T(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateVolume = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / bufferLength;
        setLiveVolume(avg);
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      mediaRecorder.current.onstop = async () => {
        cancelAnimationFrame(animationFrameRef.current);
        setLiveVolume(0);
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        await processV2T(audioBlob);
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const processV2T = async (audioBlob) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    
    try {
      const res = await axios.post(`${API_URL}/v2t`, formData);
      setPipelineData({ ...res.data, mode: 'v2t' });
    } catch (err) {
      console.error(err);
      setError("Error processing audio.");
    } finally {
      setLoading(false);
    }
  };

  const handleT2VSubmit = async () => {
    if (!textInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_URL}/t2v`, { equation: textInput });
      if (res.data.validation.valid) {
        setPipelineData({ ...res.data, mode: 't2v' });
      } else {
        setPipelineData({ validation: res.data.validation, mode: 't2v', pipeline: null });
        setError(res.data.validation.errors.join(", "));
      }
    } catch (err) {
      console.error(err);
      setError("Error processing text.");
    } finally {
      setLoading(false);
    }
  };

  const playAudioBase64 = (base64) => {
    const snd = new Audio("data:audio/wav;base64," + base64);
    snd.play();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            SpeechTech AI
          </h1>
          <div className="flex bg-gray-900 rounded-full p-1 border border-gray-800">
            <button 
              onClick={() => handleModeSwitch('v2t')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${mode === 'v2t' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'text-gray-400 hover:text-white'}`}
            >
              Voice to Text
            </button>
            <button 
              onClick={() => handleModeSwitch('t2v')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${mode === 't2v' ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.5)]' : 'text-gray-400 hover:text-white'}`}
            >
              Text to Voice
            </button>
          </div>
        </div>

        {mode === 'v2t' && (
          <div className="bg-gray-900 border-l-4 border-blue-500 p-4 mb-8 rounded-r shadow-lg">
            <h3 className="font-bold text-blue-400 mb-2">Panduan Penggunaan (V2T)</h3>
            <p className="text-gray-300 text-sm">
              Tekan tombol mikrofon di bawah dan ucapkan persamaan matematika Anda dengan perlahan dan jelas.<br/>
              Atau, Anda dapat mengunggah file rekaman (.wav/.mp3).<br/>
              Aturan: Gunakan 7 hingga 8 angka berbeda dari 2-9 (jangan gunakan angka 1). Gunakan semua operator (+, -, *, /). Hasil bagi dan hasil akhir harus berupa bilangan bulat.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl flex flex-col items-center justify-center min-h-[300px]">
            {mode === 'v2t' ? (
              <>
                <h2 className="text-xl font-semibold mb-6 text-gray-300">Input Suara Real-Time</h2>
                <div className="relative flex flex-col items-center">
                  {/* Live Audio Visualizer behind button */}
                  {isRecording && (
                    <div 
                      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/30 blur-xl pointer-events-none transition-all duration-75"
                      style={{ width: `${100 + liveVolume * 2}px`, height: `${100 + liveVolume * 2}px` }}
                    />
                  )}
                  <div className="flex items-center gap-6 z-10">
                    <button 
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`relative p-8 rounded-full transition-all duration-300 flex items-center justify-center
                        ${isRecording ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.7)] animate-pulse' : 'bg-blue-600 hover:bg-blue-500 hover:scale-105'}
                      `}
                    >
                      {isRecording ? <StopCircle size={48} color="white" /> : <Mic size={48} color="white" />}
                    </button>
                    
                    {!isRecording && (
                      <>
                        <span className="text-gray-500 font-bold">OR</span>
                        <input 
                          type="file" 
                          accept="audio/*" 
                          ref={fileInputRef} 
                          onChange={handleFileUpload} 
                          className="hidden" 
                        />
                        <button 
                          onClick={() => fileInputRef.current.click()}
                          className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 transition-all border border-gray-700 text-gray-300 hover:text-white"
                          title="Upload File Audio"
                        >
                          <Upload size={24} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Live EQ bars */}
                <div className="h-10 w-48 mt-8 flex items-end justify-center gap-1 opacity-70">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-3 bg-blue-500 rounded-t transition-all duration-75" 
                      style={{ height: isRecording ? `${Math.max(10, liveVolume * Math.random())}%` : '10%' }}
                    />
                  ))}
                </div>

                <p className="mt-4 text-sm text-gray-400">
                  {isRecording ? "Merekam... Klik untuk berhenti" : "Klik mic untuk merekam, atau klik icon upload"}
                </p>
              </>
            ) : (
              <div className="w-full">
                <h2 className="text-xl font-semibold mb-4 text-gray-300">Input Teks</h2>
                <textarea 
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Misal: 2 + 3 * 4 - 5 / 6..."
                  className="w-full h-32 bg-gray-950 border border-gray-800 rounded-xl p-4 text-emerald-400 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
                <button 
                  onClick={handleT2VSubmit}
                  disabled={loading}
                  className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? <RefreshCw className="animate-spin" /> : <Play />}
                  Generate Voice & Execute
                </button>
              </div>
            )}
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl min-h-[300px] flex flex-col relative overflow-hidden">
            <h2 className="text-xl font-semibold mb-4 text-gray-300">Output & Validasi</h2>
            
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <RefreshCw className="animate-spin text-gray-500 mb-4" size={40} />
                <span className="text-gray-400 animate-pulse">Memproses matriks...</span>
              </div>
            ) : pipelineData ? (
              <div className="flex flex-col h-full z-10">
                <div className="flex-1 mb-4">
                  {mode === 'v2t' && (
                    <div className="font-mono text-2xl text-blue-400 typing-effect border-l-2 border-blue-500 pl-4 py-2 bg-blue-900/10 rounded">
                      {pipelineData.pipeline?.transcription || "No transcription"}
                    </div>
                  )}
                  {mode === 't2v' && pipelineData.pipeline && (
                    <div className="mt-4">
                      <button 
                        onClick={() => playAudioBase64(pipelineData.pipeline.audio_b64)}
                        className="bg-emerald-500/20 text-emerald-400 px-6 py-3 rounded-full flex items-center gap-2 hover:bg-emerald-500/30 transition-all border border-emerald-500/50"
                      >
                        <Play size={20} /> Putar Hasil Suara
                      </button>
                    </div>
                  )}
                </div>
                
                {pipelineData.validation && (
                  <div className={`p-4 rounded-xl border ${pipelineData.validation.valid ? 'bg-green-900/30 border-green-500/50' : 'bg-red-900/30 border-red-500/50'}`}>
                    <h3 className={`font-bold ${pipelineData.validation.valid ? 'text-green-400' : 'text-red-400'}`}>
                      {pipelineData.validation.valid ? "STATUS: VALID" : "STATUS: ERROR"}
                    </h3>
                    {pipelineData.validation.valid ? (
                      <p className="text-3xl font-bold text-white mt-2">= {pipelineData.validation.result}</p>
                    ) : (
                      <ul className="text-red-300 text-sm mt-2 list-disc list-inside">
                        {pipelineData.validation.errors?.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-600">
                Menunggu input...
              </div>
            )}
            
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
          </div>
        </div>

        {pipelineData && pipelineData.pipeline && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-300 mb-8 border-b border-gray-800 pb-4">Pipeline Proses Dinamis</h2>
            <div className="flex flex-col gap-6">
              
              {mode === 'v2t' ? (
                <>
                  <PipelineCard title="Tahap 1: Akusisi dan Pra-Pemrosesan Sinyal" delay={0.4}>
                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col gap-6 font-mono">
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <span className="text-gray-500 block text-xs mb-2">1. Akusisi & Segmentasi Sinyal Ucapan</span>
                        <div className="h-24 w-full bg-black rounded border border-gray-800 p-2">
                          <WaveformVisualizer data={pipelineData.pipeline.waveform} color="#3b82f6" />
                        </div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded border border-gray-700 flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1">
                          <span className="text-gray-500 block text-xs mb-1">2. Peningkatan & Pemotongan Waktu (Pre-emphasis & Framing)</span>
                          <div className="text-blue-400 text-sm">Sinyal dipotong menjadi frame dengan windowing...</div>
                        </div>
                        <div className="w-full md:w-1/2 h-24 bg-black rounded border border-gray-800 relative flex flex-col justify-center items-center p-2 overflow-hidden">
                           <WaveformVisualizer data={pipelineData.pipeline.pre_emphasis_waveform || pipelineData.pipeline.waveform} color="#ec4899" />
                           {/* Overlay grid lines to simulate frames */}
                           <div className="absolute top-0 left-0 w-full h-full flex justify-between pointer-events-none opacity-40 px-2">
                             {Array.from({ length: 30 }).map((_, i) => (
                               <div key={i} className="h-full w-px border-l border-dashed border-gray-500"></div>
                             ))}
                           </div>
                        </div>
                      </div>
                    </div>
                  </PipelineCard>

                  <PipelineCard title="Tahap 2: Ekstraksi Fitur (FFT & Mel-Scale)" delay={0.8}>
                     <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col gap-6 font-mono">
                      <div className="bg-gray-900 p-3 rounded border border-gray-700 flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1">
                          <span className="text-gray-500 block text-xs mb-1">1. Fast Fourier Transform (FFT)</span>
                          <div className="text-purple-400 text-sm">Spektrum magnitudo frekuensi domain...</div>
                        </div>
                        <div className="w-full md:w-1/2 h-24 bg-black rounded border border-gray-800 flex flex-col justify-center items-center p-2">
                           <svg viewBox="0 0 100 50" className="w-full h-full opacity-80" preserveAspectRatio="none">
                            <polyline 
                              points={(() => {
                                const matrix = pipelineData.pipeline.fft_magnitude || [];
                                if (!matrix.length) return "0,50 100,50";
                                // Use Max-Hold spectrum across all time frames to ensure a rich frequency curve
                                const spectrum = matrix.map(row => Math.log1p(Math.max(...row)));
                                spectrum[0] = spectrum[1]; // Remove DC spike
                                const minVal = Math.min(...spectrum);
                                const maxVal = Math.max(...spectrum);
                                const range = maxVal - minVal || 1;
                                return spectrum.map((val, idx) => {
                                  const normalized = (val - minVal) / range;
                                  return `${(idx / spectrum.length) * 100},${50 - normalized * 45}`;
                                }).join(" ");
                              })()}
                              fill="none" stroke="#a855f7" strokeWidth="1.5" 
                            />
                           </svg>
                        </div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <span className="text-gray-500 block text-xs mb-2">2. Mel Scale Filterbank (Log-Mel)</span>
                        <div className="h-24 w-full relative">
                          <HeatmapVisualizer matrix={pipelineData.pipeline.mel_log} />
                        </div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded border border-emerald-500/50 bg-emerald-900/10">
                        <span className="text-emerald-500 font-bold block text-xs mb-2">3. Hasil Akhir (MFCC - Mel Frequency Cepstral Coefficients)</span>
                        <div className="h-32 w-full relative border border-gray-800 rounded overflow-hidden">
                          <HeatmapVisualizer matrix={pipelineData.pipeline.mfcc_heatmap} />
                        </div>
                      </div>
                     </div>
                  </PipelineCard>

                  <PipelineCard title="Tahap 3: Vector Quantization (VQ) & Codebook" delay={1.2}>
                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col gap-6 font-mono">
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <span className="text-gray-500 block text-xs mb-2">1. Generasi Codebook (Fase Pelatihan K-Means)</span>
                        <div className="h-24 w-full relative border border-gray-800 rounded overflow-hidden">
                          <HeatmapVisualizer matrix={pipelineData.pipeline.centroids} />
                        </div>
                        <p className="text-xs text-center mt-2 text-blue-400">Centroid vectors dari kompresi data MFCC</p>
                      </div>
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <span className="text-gray-500 block text-xs mb-2">2. Pemetaan VQ & Sequence (Fase Testing)</span>
                        <div className="flex gap-1 h-12 w-full items-end overflow-hidden">
                          {pipelineData.pipeline.vq_assignments?.slice(0, 100).map((a, i) => (
                            <div key={i} className="flex-1 bg-pink-500 rounded-t" style={{ height: `${(a+1)*12}%`, opacity: 0.8 }} title={`Cluster ${a}`}></div>
                          ))}
                        </div>
                        <p className="text-xs text-center mt-2 text-pink-400 text-opacity-80">Representasi kompresi: VQ Sequence array</p>
                      </div>
                    </div>
                  </PipelineCard>

                  <PipelineCard title="Tahap 4: Dynamic Time Warping (DTW)" delay={1.6}>
                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col gap-6 font-mono">
                      <div className="bg-gray-900 p-3 rounded border border-gray-700 flex flex-col lg:flex-row gap-4 items-center">
                        <div className="w-full lg:w-1/2">
                          <span className="text-gray-500 block text-xs mb-2">1. Sequence Misalignment & DTW Alignment</span>
                          <div className="text-sm text-gray-300 mb-2">Cost Matrix & Optimal Warping Path</div>
                          <div className="w-full h-48 bg-black border border-gray-800 rounded relative overflow-hidden p-2">
                             {/* Cost Matrix Heatmap (Simulated via overlay or exact plot if small enough, but usually we just plot path) */}
                             <svg className="w-full h-full opacity-80" viewBox="0 0 100 100" preserveAspectRatio="none">
                               <polyline 
                                 points={(() => {
                                   const path = pipelineData.pipeline.dtw_path || [];
                                   if (!path.length) return "0,0 100,100";
                                   const maxI = Math.max(...path.map(p => p[0]), 1);
                                   const maxJ = Math.max(...path.map(p => p[1]), 1);
                                   return path.map(p => `${(p[0]/maxI)*100},${(p[1]/maxJ)*100}`).join(" ");
                                 })()}
                                 fill="none" stroke="#10b981" strokeWidth="3" strokeLinejoin="round"
                               />
                             </svg>
                          </div>
                        </div>
                        <div className="w-full lg:w-1/2 flex flex-col gap-2">
                          <span className="text-gray-500 block text-xs">2. Keputusan Pengenalan (Final Matching)</span>
                          <div className="grid grid-cols-2 gap-2">
                            {pipelineData.pipeline.dtw_scores?.slice(0, 6).map((s, idx) => (
                              <div key={idx} className={`p-2 rounded border text-sm ${idx === 0 ? 'bg-green-900/30 border-green-500/50' : 'bg-gray-800 border-gray-700'}`}>
                                <span className="font-bold">{s.template}</span>: {s.score.toFixed(1)}
                                {idx === 0 && <span className="block text-xs text-green-400 mt-1">MATCH</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded border border-emerald-500/50 bg-emerald-900/10 text-center">
                        <span className="text-emerald-500 font-bold block text-xs mb-1">3. Output Sequence Token</span>
                        <div className="text-emerald-400 text-xl font-bold tracking-widest">
                          [ {pipelineData.pipeline.transcription_tokens?.join(' , ')} ]
                        </div>
                      </div>
                    </div>
                  </PipelineCard>

                  <PipelineCard title="Tahap 5: Parsing Sintaks & Semantik" delay={2.0}>
                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col gap-6 font-mono">
                      <div className="bg-gray-900 p-3 rounded border border-gray-700 text-center">
                         <span className="text-gray-500 block text-xs mb-2">Transformasi, Eksekusi, & Evaluasi Persamaan</span>
                         <div className="text-white text-2xl font-bold mb-4 bg-black p-4 rounded border border-gray-800 inline-block shadow-inner">
                           {pipelineData.pipeline.transcription}
                         </div>
                         {pipelineData.validation && (
                            <div className={`p-4 rounded-xl border max-w-md mx-auto ${pipelineData.validation.valid ? 'bg-green-900/30 border-green-500/50' : 'bg-red-900/30 border-red-500/50'}`}>
                              <h3 className={`font-bold ${pipelineData.validation.valid ? 'text-green-400' : 'text-red-400'}`}>
                                {pipelineData.validation.valid ? "VALIDASI BERHASIL (SINTAKS BENAR)" : "VALIDASI GAGAL (SINTAKS SALAH)"}
                              </h3>
                              {pipelineData.validation.valid ? (
                                <p className="text-3xl font-bold text-white mt-2">= {pipelineData.validation.result}</p>
                              ) : (
                                <ul className="text-red-300 text-xs mt-2 text-left list-disc list-inside">
                                  {pipelineData.validation.errors?.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  </PipelineCard>
                </>
              ) : (
                <>
                  <PipelineCard title="Tahap 1: Text Preprocessing" delay={0.4}>
                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 font-mono flex flex-col gap-4">
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <span className="text-gray-500 block text-xs mb-1">Input Text</span>
                        <div className="text-white text-md">"{pipelineData.pipeline.input_text}"</div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <span className="text-gray-500 block text-xs mb-1">1. Tokenisasi</span>
                        <div className="text-blue-400 text-sm">[{pipelineData.pipeline.tokenization.join(', ')}]</div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <span className="text-gray-500 block text-xs mb-1">2. Ekspansi Simbol</span>
                        <div className="text-purple-400 text-sm">[{pipelineData.pipeline.symbol_expansion.join(', ')}]</div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <span className="text-gray-500 block text-xs mb-1">3. Konversi Angka ke Kata</span>
                        <div className="text-pink-400 text-sm">[{pipelineData.pipeline.number_conversion.join(', ')}]</div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded border border-emerald-500/50 bg-emerald-900/10">
                        <span className="text-emerald-500 font-bold block text-xs mb-1">Hasil Normalisasi</span>
                        <div className="text-emerald-400 text-lg">"{pipelineData.pipeline.normalized_text}"</div>
                      </div>
                    </div>
                  </PipelineCard>

                  <PipelineCard title="Tahap 2: Grapheme-to-Phoneme & Intonasi" delay={0.8}>
                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 font-mono flex flex-col gap-4">
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <span className="text-gray-500 block text-xs mb-2">Prediksi Prosodi (Intonasi & Durasi)</span>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-gray-400 border-b border-gray-800">
                                <th className="pb-2">Kata</th>
                                <th className="pb-2">G2P (Phoneme)</th>
                                <th className="pb-2">Pitch (F0)</th>
                                <th className="pb-2">Durasi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pipelineData.pipeline.prosody_prediction.map((p, i) => (
                                <tr key={i} className="border-b border-gray-800/50">
                                  <td className="py-2 text-white">{p.word}</td>
                                  <td className="py-2 text-blue-400">{p.phoneme}</td>
                                  <td className="py-2 text-orange-400">{p.pitch}</td>
                                  <td className="py-2 text-pink-400">{p.duration}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded border border-emerald-500/50 bg-emerald-900/10">
                        <span className="text-emerald-500 font-bold block text-xs mb-1">Output Representasi Fonetik (Timings & Pitch)</span>
                        <div className="text-emerald-400 text-sm leading-relaxed">
                          [{pipelineData.pipeline.phonemes.split(' ').join(', ')}]
                        </div>
                      </div>
                    </div>
                  </PipelineCard>

                  <PipelineCard title="Tahap 3: Pemodelan Akustik (Acoustic Modeling)" delay={1.2}>
                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col gap-6 font-mono">
                      
                      {/* Step 1: Alignment Matrix */}
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <span className="text-gray-500 block text-xs mb-2">1. Acoustic Modeling (Text-to-Spectrum Alignment)</span>
                        <div className="h-32 w-full relative overflow-hidden rounded border border-gray-800 bg-black">
                          <HeatmapVisualizer matrix={pipelineData.pipeline.alignment_matrix} />
                        </div>
                        <p className="text-xs text-blue-400 mt-2 text-center">Matriks atensi proyeksikan durasi fonem ke mel-frames</p>
                      </div>

                      {/* Step 2: Real Filterbanks from Audio */}
                      <div className="bg-gray-900 p-3 rounded border border-gray-700">
                        <span className="text-gray-500 block text-xs mb-2">2. Karakteristik Visual (128 Mel-Bands Filterbank Energy)</span>
                        <div className="h-24 w-full flex items-end justify-between gap-[1px] overflow-hidden opacity-90 px-1">
                          {pipelineData.pipeline.mel_filterbank_energies && pipelineData.pipeline.mel_filterbank_energies.map((energy, i) => {
                            // Normalize the dB energy to a percentage for CSS height. Usually librosa power_to_db output is around -80 to 0.
                            const normalized = Math.max(0, Math.min(100, ((energy + 80) / 80) * 100));
                            return (
                              <div 
                                key={i}
                                style={{ height: `${normalized}%`, width: '100%' }}
                                className="bg-gradient-to-t from-purple-900 via-purple-600 to-pink-400 rounded-t-sm hover:opacity-80 transition-all cursor-pointer"
                                title={`Band ${i+1}: ${energy.toFixed(1)} dB`}
                              />
                            );
                          })}
                        </div>
                        <p className="text-xs text-purple-400 mt-2 text-center text-opacity-70">Menampilkan rata-rata energi suara untuk setiap 128 spektrum frekuensi.</p>
                      </div>

                      {/* Step 3: Final Mel Spectrogram */}
                      <div className="bg-gray-900 p-3 rounded border border-emerald-500/50 bg-emerald-900/10">
                        <span className="text-emerald-500 font-bold block text-xs mb-2">3. Output: Mel-Spectrogram Lengkap</span>
                        <div className="h-48 w-full relative overflow-hidden rounded border border-gray-700 bg-black shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2, ease: "linear" }}
                            className="h-full overflow-hidden bg-black"
                          >
                            <div className="w-[800px] h-full">
                              <HeatmapVisualizer matrix={pipelineData.pipeline.mel_spectrogram} />
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </PipelineCard>
                  
                  <PipelineCard title="Tahap 4: Sintesis Gelombang Suara (Vocoding)" delay={1.6}>
                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col gap-6 font-mono">
                      
                      {/* Step 1: Real STFT Magnitude */}
                      <div className="bg-gray-900 p-3 rounded border border-gray-700 flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1">
                          <span className="text-gray-500 block text-xs mb-1">1. Inisialisasi Vocoder (STFT Magnitude)</span>
                          <div className="text-blue-400 text-sm">Menghasilkan magnitudo & phase aktual dari Griffin-Lim...</div>
                        </div>
                        <div className="w-full md:w-1/2 h-24 bg-black rounded border border-gray-800 flex flex-col justify-center items-center p-2">
                           <svg viewBox="0 0 100 50" className="w-full h-full opacity-80" preserveAspectRatio="none">
                            <polyline 
                              points={
                                pipelineData.pipeline.stft_magnitude?.map((val, idx, arr) => 
                                  `${(idx / arr.length) * 100},${50 - (Math.min(val * 5, 50))}`
                                ).join(" ") || "0,25 100,25"
                              }
                              fill="none" stroke="#3b82f6" strokeWidth="2" 
                            />
                           </svg>
                        </div>
                      </div>

                      {/* Step 2: Real IFFT Phase */}
                      <div className="bg-gray-900 p-3 rounded border border-gray-700 flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1">
                          <span className="text-gray-500 block text-xs mb-1">2. Rekonstruksi Gelombang (STFT Phase to IFFT)</span>
                          <div className="text-purple-400 text-sm">Translasi phase ke sinyal gelombang pada domain waktu riil.</div>
                        </div>
                        <div className="w-full md:w-1/2 h-24 bg-black rounded border border-gray-800 relative overflow-hidden flex items-center justify-center p-2">
                          <svg viewBox="0 0 100 50" className="w-full h-full opacity-80" preserveAspectRatio="none">
                            <polyline 
                              points={
                                pipelineData.pipeline.stft_phase?.map((val, idx, arr) => 
                                  // Map phase from [-pi, pi] to [0, 50]
                                  `${(idx / arr.length) * 100},${25 - (val / Math.PI) * 20}`
                                ).join(" ") || "0,25 100,25"
                              }
                              fill="none" stroke="#ec4899" strokeWidth="2" strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Step 3: PCM Waveform */}
                      <div className="bg-gray-900 p-3 rounded border border-emerald-500/50 bg-emerald-900/10">
                        <span className="text-emerald-500 font-bold block text-xs mb-2">3. Output Akhir: PCM Waveform Asli</span>
                        <div className="h-32 w-full bg-black rounded border border-gray-700 p-2">
                          <WaveformVisualizer data={pipelineData.pipeline.waveform} color="#10b981" />
                        </div>
                      </div>

                      {/* Step 4: Final Audio */}
                      <div className="bg-gray-900 p-4 rounded-xl border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] flex flex-col items-center justify-center gap-3">
                        <span className="text-white font-bold text-lg">4. Audio Output Final</span>
                        <button 
                          onClick={() => playAudioBase64(pipelineData.pipeline.audio_b64)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-full flex items-center gap-3 transition-all font-sans font-bold shadow-lg"
                        >
                          <Play size={24} fill="currentColor" /> Dengarkan Hasil T2V
                        </button>
                      </div>
                    </div>
                  </PipelineCard>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PipelineCard = ({ title, delay, children }) => (
  <motion.div 
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-lg"
  >
    <h3 className="text-lg font-semibold text-gray-300 mb-4">{title}</h3>
    {children}
  </motion.div>
);

export default Dashboard;
