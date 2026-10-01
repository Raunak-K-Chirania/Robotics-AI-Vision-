import React, { useEffect, useRef, useState } from 'react';
import { Sliders, Activity, Zap, RefreshCw } from 'lucide-react';

export default function PIDTuner({ pidConfig, setPidConfig, errorAngleDeg }) {
  const [history, setHistory] = useState([]);
  const canvasRef = useRef(null);
  const errorRef = useRef(errorAngleDeg);

  useEffect(() => {
    errorRef.current = errorAngleDeg;
  }, [errorAngleDeg]);

  // Quick Tuning Presets
  const presets = {
    SMOOTH: { name: 'Smooth Tracking', kp: 1.8, ki: 0.05, kd: 0.4 },
    AGGRESSIVE: { name: 'Aggressive Pursuit', kp: 4.2, ki: 0.2, kd: 0.8 },
    DAMPED: { name: 'Critically Damped', kp: 2.5, ki: 0.0, kd: 0.9 },
    OSCILLATING: { name: 'Underdamped (High Gain)', kp: 5.5, ki: 0.6, kd: 0.05 },
  };

  // Record history periodically (every 100ms) safely
  useEffect(() => {
    const interval = setInterval(() => {
      setHistory((prev) => [...prev.slice(-60), errorRef.current || 0]);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Draw Oscilloscope Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width || 360;
    const height = canvas.height || 140;

    // Clear background
    ctx.fillStyle = '#070913';
    ctx.fillRect(0, 0, width, height);

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;

    // Zero Line
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Horizontal grid
    ctx.beginPath();
    ctx.moveTo(0, height / 4);
    ctx.lineTo(width, height / 4);
    ctx.moveTo(0, (height * 3) / 4);
    ctx.lineTo(width, (height * 3) / 4);
    ctx.stroke();

    if (history.length < 2) return;

    // Draw Error Waveform
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const dx = width / 60;
    history.forEach((errVal, i) => {
      const x = i * dx;
      const clampedErr = Math.max(-90, Math.min(90, errVal));
      const y = height / 2 - (clampedErr / 90) * (height / 2 - 10);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    // Fill gradient under waveform
    ctx.lineTo((history.length - 1) * dx, height / 2);
    ctx.lineTo(0, height / 2);
    ctx.fillStyle = 'rgba(0, 243, 255, 0.08)';
    ctx.fill();

    // Draw Current Value Point
    const lastVal = history[history.length - 1] || 0;
    const lastX = (history.length - 1) * dx;
    const lastY = height / 2 - (Math.max(-90, Math.min(90, lastVal)) / 90) * (height / 2 - 10);

    ctx.fillStyle = '#ff3366';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();
  }, [history]);

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="font-display font-bold text-md text-cyan-300 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>PID CLOSED-LOOP CONTROLLER</span>
        </h3>
        <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
          u(t) = Kp·e + Ki·∫e + Kd·de/dt
        </span>
      </div>

      {/* Preset Tuning Buttons */}
      <div>
        <label className="text-xs font-mono text-slate-400 mb-2 block">PID Tuning Presets:</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(presets).map((key) => (
            <button
              key={key}
              onClick={() => setPidConfig({ kp: presets[key].kp, ki: presets[key].ki, kd: presets[key].kd })}
              className="px-2.5 py-1.5 rounded text-xs font-display font-semibold bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 text-left truncate transition-all cursor-pointer"
            >
              ⚡ {presets[key].name}
            </button>
          ))}
        </div>
      </div>

      {/* PID Sliders */}
      <div className="flex flex-col gap-3 font-mono text-xs text-slate-300 border-t border-slate-800 pt-3">
        {/* Proportional Gain (Kp) */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-cyan-300">Proportional Gain (Kp):</span>
            <span className="text-cyan-400 font-bold">{pidConfig.kp.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={pidConfig.kp}
            onChange={(e) => setPidConfig({ ...pidConfig, kp: parseFloat(e.target.value) })}
          />
          <p className="text-[10px] text-slate-500 mt-0.5">Determines immediate response proportional to target error.</p>
        </div>

        {/* Integral Gain (Ki) */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-emerald-300">Integral Gain (Ki):</span>
            <span className="text-emerald-400 font-bold">{pidConfig.ki.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={pidConfig.ki}
            onChange={(e) => setPidConfig({ ...pidConfig, ki: parseFloat(e.target.value) })}
          />
          <p className="text-[10px] text-slate-500 mt-0.5">Eliminates persistent steady-state tracking offset over time.</p>
        </div>

        {/* Derivative Gain (Kd) */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-amber-300">Derivative Gain (Kd):</span>
            <span className="text-amber-400 font-bold">{pidConfig.kd.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="3"
            step="0.05"
            value={pidConfig.kd}
            onChange={(e) => setPidConfig({ ...pidConfig, kd: parseFloat(e.target.value) })}
          />
          <p className="text-[10px] text-slate-500 mt-0.5">Damps system oscillation and prevents overshooting target.</p>
        </div>
      </div>

      {/* Live Error Waveform Oscilloscope */}
      <div className="mt-2 flex flex-col gap-1 border-t border-slate-800 pt-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Live Error Oscilloscope e(t)
          </span>
          <span className="text-cyan-400 font-bold">Current: {errorAngleDeg || 0}°</span>
        </div>
        <div className="w-full h-[140px] rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
          <canvas ref={canvasRef} width={360} height={140} className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}
