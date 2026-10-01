import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Cpu, Gauge, Zap } from 'lucide-react';

export default function TelemetryPanel({ visionTarget, robotTelemetry }) {
  const [logs, setLogs] = useState([]);
  const logContainerRef = useRef(null);
  
  // Store latest props in refs to avoid re-triggering useEffect on every frame
  const telemetryRef = useRef(robotTelemetry);
  const visionRef = useRef(visionTarget);

  useEffect(() => {
    telemetryRef.current = robotTelemetry;
    visionRef.current = visionTarget;
  }, [robotTelemetry, visionTarget]);

  // Periodic log snapshotter (runs every 600ms safely without infinite state loop)
  useEffect(() => {
    const interval = setInterval(() => {
      const v = visionRef.current;
      const t = telemetryRef.current;
      const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);

      let msg = '';
      if (v.hasTarget) {
        msg = `[${timestamp}] [LOCK] X:${v.x} Y:${v.y} | Err:${t.errorAngleDeg}° | PWM L:${t.pwmL} R:${t.pwmR}`;
      } else {
        msg = `[${timestamp}] [SEARCH] Sweeping radar... Pan:${t.turretPanDeg}°`;
      }

      setLogs((prev) => [...prev.slice(-25), msg]);
    }, 600);

    return () => clearInterval(interval);
  }, []);

  // Auto scroll log window
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="font-display font-bold text-md text-cyan-300 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <span>REAL-TIME ROBOT TELEMETRY & SERIAL BUS</span>
        </h3>
        <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          115200 BAUD
        </span>
      </div>

      {/* Dual Motor PWM Gauges */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left Motor Gauge */}
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-mono text-slate-300">
            <span>MOTOR LEFT (PWM)</span>
            <span className="text-cyan-400 font-bold">{robotTelemetry.pwmL || 0} / 255</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-150"
              style={{ width: `${((robotTelemetry.pwmL || 0) / 255) * 100}%` }}
            />
          </div>
        </div>

        {/* Right Motor Gauge */}
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-mono text-slate-300">
            <span>MOTOR RIGHT (PWM)</span>
            <span className="text-cyan-400 font-bold">{robotTelemetry.pwmR || 0} / 255</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-150"
              style={{ width: `${((robotTelemetry.pwmR || 0) / 255) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Serial Console Stream */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            Serial Monitor / DevTools Log
          </span>
          <button
            onClick={() => setLogs([])}
            className="text-[10px] text-slate-500 hover:text-slate-300"
          >
            Clear Log
          </button>
        </div>
        <div
          ref={logContainerRef}
          className="w-full h-36 rounded-lg bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] text-emerald-400 overflow-y-auto space-y-1 scrollbar-thin"
        >
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">[SYSTEM] Serial stream initialized. Awaiting packets...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="leading-tight hover:bg-slate-900/60 px-1 rounded">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
