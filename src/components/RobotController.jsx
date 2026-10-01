import React, { useEffect, useRef, useCallback } from 'react';
import { Gamepad2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, RotateCw, Zap } from 'lucide-react';

/**
 * RobotController — exposes a pressedKeys ref that Robot3DView reads each frame.
 * Also renders an on-screen D-pad + status HUD.
 */
export default function RobotController({ pressedKeys, controlMode, setControlMode, onReset }) {
  const holdIntervals = useRef({});

  // ── Keyboard Listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','s','a','d','W','S','A','D'].includes(e.key)) {
        e.preventDefault();
        pressedKeys.current.add(e.key.toLowerCase());
      }
    };
    const up = (e) => {
      pressedKeys.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup',   up);
    };
  }, [pressedKeys]);

  // ── Gamepad Polling ────────────────────────────────────────────────────────
  useEffect(() => {
    let raf;
    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = [...pads].find(Boolean);
      if (gp) {
        const [lx, ly] = [gp.axes[0], gp.axes[1]];
        const dead = 0.2;
        if (ly < -dead) pressedKeys.current.add('w'); else pressedKeys.current.delete('w');
        if (ly >  dead) pressedKeys.current.add('s'); else pressedKeys.current.delete('s');
        if (lx < -dead) pressedKeys.current.add('a'); else pressedKeys.current.delete('a');
        if (lx >  dead) pressedKeys.current.add('d'); else pressedKeys.current.delete('d');
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [pressedKeys]);

  // ── On-screen button helpers ───────────────────────────────────────────────
  const press = useCallback((key) => {
    pressedKeys.current.add(key);
    // also repeat while pointer held
    holdIntervals.current[key] = setInterval(() => pressedKeys.current.add(key), 16);
  }, [pressedKeys]);

  const release = useCallback((key) => {
    pressedKeys.current.delete(key);
    clearInterval(holdIntervals.current[key]);
  }, [pressedKeys]);

  const DPadBtn = ({ direction, keyCode, icon: Icon, label, gridArea }) => (
    <button
      onPointerDown={() => press(keyCode)}
      onPointerUp={() => release(keyCode)}
      onPointerLeave={() => release(keyCode)}
      aria-label={label}
      style={{ gridArea }}
      className={`
        flex items-center justify-center rounded-lg border select-none touch-none
        bg-slate-900/80 border-slate-700 text-slate-300
        hover:bg-cyan-950/60 hover:border-cyan-500 hover:text-cyan-300
        active:bg-cyan-900/80 active:border-cyan-400 active:scale-95
        transition-all duration-100 cursor-pointer p-3
        shadow-md shadow-black/40
      `}
    >
      <Icon className="w-5 h-5 pointer-events-none" />
    </button>
  );

  const modes = [
    { id: 'MANUAL',           label: 'Manual',   color: 'violet' },
    { id: 'AUTONOMOUS_CHASE', label: 'Chase AI', color: 'cyan'   },
    { id: 'SENTRY_TURRET',    label: 'Sentry',   color: 'rose'   },
  ];

  const colorMap = {
    violet: {
      active:   'bg-violet-950/70 border-violet-500 text-violet-300 shadow-violet-900/40',
      inactive: 'bg-slate-900 border-slate-700 text-slate-400 hover:border-violet-400 hover:text-violet-300',
    },
    cyan: {
      active:   'bg-cyan-950/70 border-cyan-500 text-cyan-300 shadow-cyan-900/40',
      inactive: 'bg-slate-900 border-slate-700 text-slate-400 hover:border-cyan-400 hover:text-cyan-300',
    },
    rose: {
      active:   'bg-rose-950/70 border-rose-500 text-rose-300 shadow-rose-900/40',
      inactive: 'bg-slate-900 border-slate-700 text-slate-400 hover:border-rose-400 hover:text-rose-300',
    },
  };

  return (
    <div className="glass-panel p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="font-display font-bold text-md text-violet-300 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-violet-400" />
          <span>ROBOT CONTROL INTERFACE</span>
        </h3>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
          WASD / ↑↓←→ / Gamepad
        </span>
      </div>

      {/* Mode Selector */}
      <div>
        <p className="text-[10px] font-mono text-slate-500 mb-2 uppercase tracking-wider">Operating Mode</p>
        <div className="grid grid-cols-3 gap-2">
          {modes.map(({ id, label, color }) => {
            const isActive = controlMode === id;
            const cls = colorMap[color];
            return (
              <button
                key={id}
                onClick={() => setControlMode(id)}
                className={`
                  py-2 px-1 rounded-lg border text-xs font-display font-semibold
                  transition-all duration-150 shadow-md
                  ${isActive ? cls.active : cls.inactive}
                `}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* D-Pad */}
      <div className={`flex flex-col gap-3 transition-opacity duration-200 ${controlMode !== 'MANUAL' ? 'opacity-40 pointer-events-none' : ''}`}>
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Directional Control</p>

        <div
          className="grid mx-auto"
          style={{
            display: 'grid',
            gridTemplateAreas: `
              ".    up    ."
              "left mid  right"
              ".    down  ."
            `,
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: '1fr 1fr 1fr',
            gap: '6px',
            width: '160px',
          }}
        >
          <DPadBtn direction="up"    keyCode="w" icon={ArrowUp}    label="Forward" gridArea="up"    />
          <DPadBtn direction="left"  keyCode="a" icon={ArrowLeft}  label="Turn Left" gridArea="left"  />
          {/* Centre pip */}
          <div style={{ gridArea: 'mid' }} className="flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-violet-500/60 border border-violet-400/40 shadow-sm shadow-violet-500/30" />
          </div>
          <DPadBtn direction="right" keyCode="d" icon={ArrowRight} label="Turn Right" gridArea="right" />
          <DPadBtn direction="down"  keyCode="s" icon={ArrowDown}  label="Reverse"  gridArea="down"  />
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-[10px] font-mono text-slate-600">
          W / A / S / D or Arrow Keys
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-4">
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 text-xs font-display hover:border-slate-500 hover:text-slate-100 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Robot
        </button>
        <button
          onClick={() => setControlMode('AUTONOMOUS_CHASE')}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-cyan-700/60 bg-cyan-950/30 text-cyan-300 text-xs font-display hover:border-cyan-500 hover:bg-cyan-900/40 transition-all"
        >
          <Zap className="w-3.5 h-3.5" />
          Auto Chase
        </button>
      </div>

      {/* Controls cheat-sheet */}
      <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3 text-[10px] font-mono text-slate-500 space-y-1">
        <p className="text-slate-400 font-semibold mb-1">⌨ Keyboard Shortcuts</p>
        <p><span className="text-violet-400">W / ↑</span> — Drive forward</p>
        <p><span className="text-violet-400">S / ↓</span> — Reverse</p>
        <p><span className="text-violet-400">A / ←</span> — Steer left</p>
        <p><span className="text-violet-400">D / →</span> — Steer right</p>
        <p><span className="text-cyan-400">Gamepad</span> — Left analog stick</p>
      </div>
    </div>
  );
}
