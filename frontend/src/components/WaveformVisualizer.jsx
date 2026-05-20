import React, { useEffect, useRef } from 'react';

const WaveformVisualizer = ({ data, color = "#00ffcc" }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0 || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw waveform
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    const step = width / data.length;
    const maxVal = Math.max(...data.map(Math.abs));
    const scaleY = (height / 2) / (maxVal || 1);
    
    data.forEach((val, i) => {
      const x = i * step;
      const y = (height / 2) - (val * scaleY);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    
    ctx.stroke();
  }, [data, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={150} 
      className="w-full h-full rounded bg-gray-900 border border-gray-700"
    />
  );
};

export default WaveformVisualizer;
