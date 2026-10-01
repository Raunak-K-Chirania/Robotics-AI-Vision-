import React from 'react';
import { Bot, Camera, Cpu, Code2, BookOpen, Sparkles, Activity, Gamepad2 } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, fps, isLocked, controlMode }) {
  return (
    <header className="w-full glass-panel border-b border-cyan-900/40 px-6 py-3 flex flex-wrap items-center justify-between gap-4 z-50 sticky top-0 bg-slate-950/80">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-400/40 text-cyan-400">
          <Bot className="w-6 h-6 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 glow-pulse"></span>
        </div>
        <div>
          <h1 className="font-display font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-400">
            AETHER-VISION <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">AI ROBOTICS</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <span>Autonomous AI Target Tracking & Simulator</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-emerald-400">{fps} FPS</span>
          </p>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'simulator'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/30 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>3D Robot Arena</span>
        </button>

        <button
          onClick={() => setActiveTab('vision')}
          className={`px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'vision'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/30 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>AI Vision Lab</span>
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'code'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/30 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Firmware & Python</span>
        </button>

        <button
          onClick={() => setActiveTab('hardware')}
          className={`px-4 py-2 rounded-lg text-sm font-display font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'hardware'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/30 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-950'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Build Guide</span>
        </button>
      </nav>

      {/* Status Indicators */}
      <div className="hidden lg:flex items-center gap-2">
        {/* Control Mode Badge */}
        <div className={`px-3 py-1.5 rounded-lg border font-mono text-xs flex items-center gap-2 transition-all ${
          controlMode === 'MANUAL'
            ? 'bg-violet-950/60 border-violet-500/50 text-violet-300'
            : controlMode === 'SENTRY_TURRET'
            ? 'bg-rose-950/50 border-rose-500/40 text-rose-300'
            : 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300'
        }`}>
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>{(controlMode || 'AUTO').replace('_',' ')}</span>
        </div>
        {/* Target Lock */}
        <div className={`px-3 py-1.5 rounded-lg border font-mono text-xs flex items-center gap-2 transition-all ${
          isLocked
            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400 shadow-md shadow-emerald-900/30'
            : 'bg-amber-950/40 border-amber-500/30 text-amber-400'
        }`}>
          <Activity className={`w-3.5 h-3.5 ${isLocked ? 'animate-bounce' : ''}`} />
          <span>{isLocked ? 'TARGET LOCKED' : 'SEARCHING'}</span>
        </div>
      </div>
    </header>
  );
}
