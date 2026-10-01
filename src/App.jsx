import React, { useState, useRef } from 'react';
import Navbar from './components/Navbar';
import VisionEngine from './components/VisionEngine';
import Robot3DView from './components/Robot3DView';
import PIDTuner from './components/PIDTuner';
import TelemetryPanel from './components/TelemetryPanel';
import CodeGenerator from './components/CodeGenerator';
import HardwareGuide from './components/HardwareGuide';
import RobotController from './components/RobotController';

export default function App() {
  const [activeTab, setActiveTab] = useState('simulator');
  const [fps, setFps] = useState(60);

  // ── Control State ───────────────────────────────────────────────────────
  // Shared mutable ref for keypresses — read directly by the animation loop
  const pressedKeys = useRef(new Set());
  const [controlMode, setControlMode] = useState('AUTONOMOUS_CHASE');
  const [autoPatrol, setAutoPatrol]   = useState(true);
  const [showFOV,    setShowFOV]      = useState(true);
  const [showLaser,  setShowLaser]    = useState(true);

  // ── Vision / PID / Telemetry ────────────────────────────────────────────
  const [hsvConfig, setHsvConfig] = useState({
    minH: 170, maxH: 210, minS: 50, maxS: 100, minV: 40, maxV: 100,
  });

  const [visionTarget, setVisionTarget] = useState({
    hasTarget: false, x: 320, y: 240, normX: 0, normY: 0, areaRatio: 0, bbox: null,
  });

  const [pidConfig, setPidConfig] = useState({ kp: 2.5, ki: 0.1, kd: 0.5 });

  const [robotTelemetry, setRobotTelemetry] = useState({
    headingDeg: 0, turretPanDeg: 0, distanceMeters: '2.50',
    errorAngleDeg: 0, pwmL: 160, pwmR: 160, posX: '0.00', posZ: '0.00',
  });

  const handleReset = () => {
    // Signal reset via a global ref that Robot3DView reads
    window.__robotReset = true;
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        fps={fps}
        isLocked={visionTarget.hasTarget}
        controlMode={controlMode}
      />

      <main className="flex-1 w-full max-w-[1700px] mx-auto p-2 sm:p-4">

        {/* ── Simulator Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* 3D arena + telemetry (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-5">
              <Robot3DView
                visionTarget={visionTarget}
                pidConfig={pidConfig}
                robotTelemetry={robotTelemetry}
                setRobotTelemetry={setRobotTelemetry}
                controlMode={controlMode}
                pressedKeys={pressedKeys}
                autoPatrol={autoPatrol}
                showFOV={showFOV}
                showLaser={showLaser}
              />

              {/* Arena toggles */}
              <div className="flex flex-wrap gap-2 px-1">
                {[
                  { label: `Target Patrol: ${autoPatrol ? 'ON' : 'OFF'}`, active: autoPatrol, toggle: () => setAutoPatrol(p => !p), color: 'emerald' },
                  { label: `FOV Cone: ${showFOV ? 'ON' : 'OFF'}`,         active: showFOV,    toggle: () => setShowFOV(p => !p),    color: 'cyan'    },
                  { label: `Laser Lock: ${showLaser ? 'ON' : 'OFF'}`,      active: showLaser,  toggle: () => setShowLaser(p => !p),  color: 'rose'    },
                ].map(({ label, active, toggle, color }) => {
                  const cls = {
                    emerald: active ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-400',
                    cyan:    active ? 'border-cyan-500    bg-cyan-950/50    text-cyan-300'    : 'border-slate-700 bg-slate-900 text-slate-400',
                    rose:    active ? 'border-rose-500    bg-rose-950/50    text-rose-300'    : 'border-slate-700 bg-slate-900 text-slate-400',
                  }[color];
                  return (
                    <button key={label} onClick={toggle}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${cls}`}>
                      {label}
                    </button>
                  );
                })}
              </div>

              <TelemetryPanel visionTarget={visionTarget} robotTelemetry={robotTelemetry} pidConfig={pidConfig} />
            </div>

            {/* Right sidebar (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              <RobotController
                pressedKeys={pressedKeys}
                controlMode={controlMode}
                setControlMode={setControlMode}
                onReset={handleReset}
              />
              <PIDTuner
                pidConfig={pidConfig}
                setPidConfig={setPidConfig}
                errorAngleDeg={robotTelemetry.errorAngleDeg}
              />
            </div>
          </div>
        )}

        {/* ── Vision Tab ────────────────────────────────────────────────────── */}
        {activeTab === 'vision' && (
          <VisionEngine
            hsvConfig={hsvConfig}
            setHsvConfig={setHsvConfig}
            visionTarget={visionTarget}
            setVisionTarget={setVisionTarget}
            onFpsUpdate={setFps}
          />
        )}

        {/* ── Code Tab ──────────────────────────────────────────────────────── */}
        {activeTab === 'code' && (
          <CodeGenerator hsvConfig={hsvConfig} pidConfig={pidConfig} />
        )}

        {/* ── Hardware Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'hardware' && <HardwareGuide />}
      </main>

      <footer className="w-full border-t border-slate-900 bg-slate-950/80 px-6 py-2 flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono text-slate-500">
        <div className="flex items-center gap-4">
          <span>AETHER-VISION v3.0 — SYSTEM ONLINE</span>
          <span className="text-slate-700">|</span>
          <span>WebGL: ACCELERATED · THREE.JS + CANVAS CV</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`uppercase font-bold ${controlMode === 'MANUAL' ? 'text-violet-400' : controlMode === 'SENTRY_TURRET' ? 'text-rose-400' : 'text-cyan-400'}`}>
            MODE: {controlMode.replace('_', ' ')}
          </span>
        </div>
      </footer>
    </div>
  );
}
