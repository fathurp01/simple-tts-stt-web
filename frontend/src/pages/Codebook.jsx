import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { FixedSizeGrid as Grid } from 'react-window';

const Codebook = () => {
  const { pipelineData, mode } = useAppContext();
  const [activeTab, setActiveTab] = useState(0);

  if (!pipelineData || !pipelineData.pipeline) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-400 p-8 flex items-center justify-center">
        <p className="text-xl">Silakan proses data di Dashboard terlebih dahulu untuk melihat Codebook.</p>
      </div>
    );
  }

  const v2tTabs = [
    'Pre-Processing', 
    'MFCC Arrays', 
    'Distance Matrix',
    'DTW Cost Matrix',
    'Final Scoring & Output'
  ];
  
  const t2vTabs = [
    'Tokenization & Embedding', 
    'Alignment Matrix',
    'Synthesized Mel-Spectrogram', 
    'Inverse Transform (ISTFT)'
  ];
  
  const tabs = mode === 'v2t' ? v2tTabs : t2vTabs;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-sans flex">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-gray-800 pr-4 mr-8">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-8">
          Codebook {mode.toUpperCase()}
        </h2>
        <ul className="space-y-2">
          {tabs.map((tab, idx) => (
            <li key={idx}>
              <button 
                onClick={() => setActiveTab(idx)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${activeTab === idx ? 'bg-gray-800 text-purple-400 font-bold border-l-4 border-purple-500' : 'text-gray-400 hover:bg-gray-900'}`}
              >
                {tab}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-900 rounded-2xl p-8 border border-gray-800 overflow-hidden shadow-2xl">
        {mode === 'v2t' ? (
          <V2TContent tab={activeTab} pipeline={pipelineData.pipeline} />
        ) : (
          <T2VContent tab={activeTab} pipeline={pipelineData.pipeline} />
        )}
      </div>
    </div>
  );
};

const MatrixGrid = ({ matrix, cellWidth = 60, highlightPath = null }) => {
  if (!matrix || matrix.length === 0) return <div>No data</div>;
  const rowCount = matrix.length;
  const colCount = matrix[0].length;

  // Convert highlightPath array to a quick lookup set
  const pathSet = new Set(highlightPath ? highlightPath.map(p => `${p[0]},${p[1]}`) : []);

  return (
    <div className="h-[500px] w-full border border-gray-800 rounded bg-gray-950 p-2 font-mono text-xs">
      <Grid
        columnCount={colCount}
        columnWidth={cellWidth}
        height={480}
        rowCount={rowCount}
        rowHeight={35}
        width={800} // fixed width for now, ideally auto-sizing
      >
        {({ columnIndex, rowIndex, style }) => {
          const isHighlight = pathSet.has(`${rowIndex},${columnIndex}`);
          const val = matrix[rowIndex][columnIndex];
          return (
            <div style={{
              ...style, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              borderRight: '1px solid #1f2937', 
              borderBottom: '1px solid #1f2937', 
              color: isHighlight ? '#fff' : '#9ca3af',
              backgroundColor: isHighlight ? '#3b82f6' : 'transparent',
              fontWeight: isHighlight ? 'bold' : 'normal'
            }}>
              {typeof val === 'number' ? val.toFixed(2) : val}
            </div>
          )
        }}
      </Grid>
    </div>
  );
};

const V2TContent = ({ tab, pipeline }) => {
  switch (tab) {
    case 0: // Pre-Processing
      return (
        <div>
          <h3 className="text-xl font-bold mb-4">Pre-Processing (Framing & Windowing)</h3>
          <p className="text-gray-400 mb-4">Potongan array sinyal hasil pre-emphasis dan Hamming window:</p>
          <div className="bg-black p-4 rounded overflow-auto max-h-96 font-mono text-sm text-green-400 border border-gray-800">
            [ {pipeline.waveform.slice(0, 100).map(v => v.toFixed(4)).join(', ')} ... ]
          </div>
        </div>
      );
    case 1: // MFCC Arrays
      return (
        <div>
          <h3 className="text-xl font-bold mb-4">MFCC Arrays</h3>
          <p className="text-gray-400 mb-4">Representasi matriks 2D MFCC. Scroll untuk melihat seluruh koefisien cepstral.</p>
          <MatrixGrid matrix={pipeline.mfcc_heatmap} />
        </div>
      );
    case 2: // Distance Matrix
      return (
        <div>
          <h3 className="text-xl font-bold mb-4">Euclidean Distance Matrix</h3>
          <p className="text-gray-400 mb-4">Blok kode berisi matriks jarak Euclidean antara sinyal input dan template terdekat.</p>
          <MatrixGrid matrix={pipeline.euclidean_matrix} />
        </div>
      );
    case 3: // DTW Cost Matrix
      return (
        <div>
          <h3 className="text-xl font-bold mb-4">DTW Accumulated Cost Matrix</h3>
          <p className="text-gray-400 mb-4">
            Matriks perhitungan biaya kumulatif. Sel dengan warna <b>Biru Terang</b> merepresentasikan 
            <b> Warping Path</b> (jalur terpendek).
          </p>
          <MatrixGrid matrix={pipeline.cost_matrix} highlightPath={pipeline.dtw_path} />
        </div>
      );
    case 4: // Final Scoring & Output
      return (
        <div>
          <h3 className="text-xl font-bold mb-4">Final Scoring & Transkripsi Output</h3>
          <p className="text-gray-400 mb-6">List perbandingan minimum distance untuk segmen pertama yang diproses:</p>
          
          <div className="bg-black border border-gray-800 rounded-xl p-6 font-mono mb-8">
            <ul className="space-y-3">
              {pipeline.dtw_scores.map((s, idx) => (
                <li key={idx} className={idx === 0 ? 'text-green-400 text-lg font-bold' : 'text-gray-400'}>
                  Template '{s.template}' : {s.score.toFixed(2)} {idx === 0 && '(MATCH)'}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500/50 rounded-xl p-6">
            <h4 className="text-blue-400 font-bold mb-2">Transkripsi Final (Seluruh Segmen digabungkan):</h4>
            <p className="font-mono text-3xl text-white">{pipeline.transcription}</p>
          </div>
        </div>
      );
    default: return null;
  }
};

const T2VContent = ({ tab, pipeline }) => {
  switch (tab) {
    case 0: // Tokenization
      return (
        <div>
          <h3 className="text-xl font-bold mb-4">Text Tokenization & G2P</h3>
          <p className="text-gray-400 mb-4">Pemetaan teks input menjadi array fonem untuk mesin TTS.</p>
          <div className="bg-black p-4 rounded font-mono text-sm text-emerald-400 border border-gray-800">
            <p><strong>Linguistic:</strong> {pipeline.normalized_text}</p>
            <p className="mt-4"><strong>Phonemes:</strong> {pipeline.phonemes}</p>
          </div>
        </div>
      );
    case 1: // Alignment Matrix
      return (
        <div>
          <h3 className="text-xl font-bold mb-4">Alignment / Duration Matrix</h3>
          <p className="text-gray-400 mb-4">
            Matriks attention yang memetakan durasi dan penyelarasan (alignment) antara fonem dan frame spektrogram. 
            Garis diagonal menunjukkan "monotonic alignment" yang ideal.
          </p>
          {/* Create a generic linear path for highlighting the attention diagonal */}
          <MatrixGrid 
            matrix={pipeline.alignment_matrix} 
            highlightPath={pipeline.alignment_matrix.map((row, i) => [i, Math.floor(i * (pipeline.alignment_matrix[0].length / pipeline.alignment_matrix.length))])}
          />
        </div>
      );
    case 2: // Mel-Spectrogram
      return (
        <div>
          <h3 className="text-xl font-bold mb-4">Synthesized Mel-Spectrogram Array</h3>
          <p className="text-gray-400 mb-4">Deretan angka 2D yang merepresentasikan frekuensi suara yang di-generate model.</p>
          <MatrixGrid matrix={pipeline.mel_spectrogram} />
        </div>
      );
    case 3: // Inverse Transform
      return (
        <div>
          <h3 className="text-xl font-bold mb-4">Vocoder (Inverse Short-Time Fourier Transform)</h3>
          <div className="bg-gray-800 rounded p-4 mb-6 font-mono text-sm text-gray-300">
            <p className="mb-2">Formula Rekonstruksi (Griffin-Lim / ISTFT):</p>
            <p className="text-blue-400 text-lg">
              x(t) = (1/W) * Σ [ X(m,ω) * e^(jωt) ] * w(t - mH)
            </p>
            <p className="mt-2 text-xs text-gray-500">Dimana X adalah spektrogram magnitudo, dan w adalah window function.</p>
          </div>
          <p className="text-gray-400 mb-4">Hasil transformasi spektrogram kembali ke domain waktu (1D Array Waveform) siap simpan:</p>
          <div className="bg-black p-4 rounded overflow-auto max-h-96 font-mono text-sm text-green-400 border border-gray-800">
            [ {pipeline.waveform.slice(0, 100).map(v => v.toFixed(4)).join(', ')} ... ]
          </div>
        </div>
      );
    default: return null;
  }
};

export default Codebook;
