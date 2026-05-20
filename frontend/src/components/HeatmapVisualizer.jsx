import React, { useEffect, useRef } from 'react';

const HeatmapVisualizer = ({ matrix }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!matrix || matrix.length === 0 || !matrix[0].length || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    const rows = matrix.length;
    const cols = matrix[0].length;
    
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    
    // Find min and max for normalization
    let min = Infinity, max = -Infinity;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (matrix[r][c] < min) min = matrix[r][c];
        if (matrix[r][c] > max) max = matrix[r][c];
      }
    }
    const range = max - min || 1;
    
    ctx.clearRect(0, 0, width, height);
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Normalize 0 to 1
        const norm = (matrix[r][c] - min) / range;
        
        // Convert to color (viridis-like or simple heatmap)
        // Simple: dark blue to bright red/yellow
        const hue = (1 - norm) * 240; // 240 is blue, 0 is red
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        
        ctx.fillRect(c * cellWidth, height - ((r + 1) * cellHeight), cellWidth, cellHeight);
      }
    }
  }, [matrix]);

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={300} 
      className="w-full h-full rounded bg-gray-900 border border-gray-700"
    />
  );
};

export default HeatmapVisualizer;
