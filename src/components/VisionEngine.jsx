import React, { useRef, useEffect, useState } from 'react';
import { Camera, RefreshCw, Crosshair, Sliders, Eye, EyeOff, Sparkles, AlertCircle, Play, Pause } from 'lucide-react';
import { analyzeFrame, drawSyntheticFeed, COLOR_PRESETS } from '../utils/visionProcessor';

export default function VisionEngine({ hsvConfig, setHsvConfig, visionTarget, setVisionTarget, onFpsUpdate }) {
  const [useWebcam, setUseWebcam] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [activePreset, setActivePreset] = useState('CYAN');
  const [manualTarget, setManualTarget] = useState({ x: 300, y: 200 });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const animFrameId = useRef(null);

  const fpsTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  // Handle Preset selection
  const applyPreset = (presetKey) => {
    setActivePreset(presetKey);
    const preset = COLOR_PRESETS[presetKey];
    if (preset) {
      setHsvConfig({
        minH: preset.min.h,
        maxH: preset.max.h,
        minS: preset.min.s,
        maxS: preset.max.s,
        minV: preset.min.v,
        maxV: preset.max.v,
      });
    }
  };

  // Start / Stop Webcam
  useEffect(() => {
    let stream = null;

    if (useWebcam) {
      navigator.mediaDevices?.getUserMedia({ video: { width: 640, height: 480 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          console.warn('Webcam permission denied or unavailable:', err);
          setUseWebcam(false);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [useWebcam]);

  // Main Processing Loop
  useEffect(() => {
    let lastTime = performance.now();

    const renderLoop = (time) => {
      if (isPaused) {
        animFrameId.current = requestAnimationFrame(renderLoop);
        return;
      }

      const deltaSec = (time - lastTime) / 1000;
      lastTime = time;

      // FPS Counter
      frameCountRef.current++;
      if (time - fpsTimeRef.current >= 1000) {
        onFpsUpdate(frameCountRef.current);
        frameCountRef.current = 0;
        fpsTimeRef.current = time;
      }

      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas) {
        animFrameId.current = requestAnimationFrame(renderLoop);
        return;
      }

      const ctx = canvas.getContext('2d');
      const width = canvas.width || 640;
      const height = canvas.height || 480;

      if (useWebcam && videoRef.current && videoRef.current.readyState === 4) {
        ctx.drawImage(videoRef.current, 0, 0, width, height);
      } else {
        // Draw synthetic moving ball feed
        drawSyntheticFeed(ctx, width, height, time / 1000, manualTarget);
      }

      // Perform HSV Computer Vision Analysis
      const analysis = analyzeFrame(
        ctx,
        width,
        height,
        { h: hsvConfig.minH, s: hsvConfig.minS, v: hsvConfig.minV },
        { h: hsvConfig.maxH, s: hsvConfig.maxS, v: hsvConfig.maxV }
      );

      if (analysis) {
        // Update mask preview canvas
        if (maskCanvas && showMask) {
          const mCtx = maskCanvas.getContext('2d');
          mCtx.putImageData(analysis.maskData, 0, 0);
        }

        // Draw HUD Overlays on main canvas
        if (analysis.hasTarget) {
          // Bounding Box
          const { minX, minY, maxX, maxY } = analysis.bbox;
          ctx.strokeStyle = '#00ff88';
          ctx.lineWidth = 2;
          ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

          // Corner Brackets
          const bracketLen = 12;
          ctx.strokeStyle = '#00f3ff';
          ctx.lineWidth = 3;
          
          // Top Left
          ctx.beginPath(); ctx.moveTo(minX, minY + bracketLen); ctx.lineTo(minX, minY); ctx.lineTo(minX + bracketLen, minY); ctx.stroke();
          // Top Right
          ctx.beginPath(); ctx.moveTo(maxX - bracketLen, minY); ctx.lineTo(maxX, minY); ctx.lineTo(maxX, minY + bracketLen); ctx.stroke();
          // Bottom Left
          ctx.beginPath(); ctx.moveTo(minX, maxY - bracketLen); ctx.lineTo(minX, maxY); ctx.lineTo(minX + bracketLen, maxY); ctx.stroke();
          // Bottom Right
          ctx.beginPath(); ctx.moveTo(maxX - bracketLen, maxY); ctx.lineTo(maxX, maxY); ctx.lineTo(maxX, maxY - bracketLen); ctx.stroke();

          // Target Center Crosshair
          ctx.strokeStyle = '#ff3366';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(analysis.cx, analysis.cy, 12, 0, Math.PI * 2);
          ctx.moveTo(analysis.cx - 18, analysis.cy);
          ctx.lineTo(analysis.cx + 18, analysis.cy);
          ctx.moveTo(analysis.cx, analysis.cy - 18);
          ctx.lineTo(analysis.cx, analysis.cy + 18);
          ctx.stroke();

          // Coordinate Tag
          ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
          ctx.fillRect(analysis.cx + 15, analysis.cy - 25, 110, 24);
          ctx.strokeStyle = '#00f3ff';
          ctx.strokeRect(analysis.cx + 15, analysis.cy - 25, 110, 24);
          ctx.fillStyle = '#00f3ff';
          ctx.font = '11px "JetBrains Mono", monospace';
          ctx.fillText(`X:${analysis.cx} Y:${analysis.cy}`, analysis.cx + 22, analysis.cy - 9);
        }

        // Send state to parent component
        setVisionTarget({
          hasTarget: analysis.hasTarget,
          x: analysis.cx,
          y: analysis.cy,
          normX: (analysis.cx / width) * 2 - 1, // Normalized -1 to +1
          normY: (analysis.cy / height) * 2 - 1,
          areaRatio: analysis.areaRatio,
          bbox: analysis.bbox,
        });
      }

      animFrameId.current = requestAnimationFrame(renderLoop);
    };

    animFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [useWebcam, hsvConfig, showMask, isPaused, manualTarget]);

  // Handle canvas click to place manual target in synthetic mode
  const handleCanvasClick = (e) => {
    if (useWebcam) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 640);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 480);
    setManualTarget({ x, y });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4">
      {/* Video & Vision Viewport */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        <div className="glass-panel glass-panel-glow p-4 relative overflow-hidden flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg text-cyan-400 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              <span>LIVE COMPUTER VISION FEED (640x480)</span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUseWebcam(!useWebcam)}
                className={`btn-cyber ${useWebcam ? 'btn-cyber-red' : ''} text-xs py-1.5`}
              >
                <Camera className="w-4 h-4" />
                <span>{useWebcam ? 'Switch to Synthetic Target' : 'Enable Webcam'}</span>
              </button>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="btn-cyber btn-cyber-secondary text-xs py-1.5"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
            </div>
          </div>

          {/* Hidden Video element for Webcam */}
          <video ref={videoRef} className="hidden" playsInline muted></video>

          {/* Main Visualizer Canvas */}
          <div className="relative w-full max-w-[640px] aspect-[4/3] rounded-lg overflow-hidden border border-cyan-500/30 bg-slate-950 shadow-2xl group cursor-crosshair">
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              onClick={handleCanvasClick}
              className="w-full h-full object-cover"
            />

            {/* Target Crosshair & Grid HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none border border-cyan-500/20 rounded-lg">
              <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400 bg-slate-950/80 px-2 py-1 rounded border border-cyan-500/30">
                MODE: {useWebcam ? 'WEBCAM INPUT' : 'SYNTHETIC CANAL TARGET'}
              </div>
              <div className="absolute top-2 right-2 text-[10px] font-mono text-emerald-400 bg-slate-950/80 px-2 py-1 rounded border border-emerald-500/30">
                {visionTarget.hasTarget ? 'LOCK: ACTIVE' : 'LOCK: SEARCHING'}
              </div>

              {!useWebcam && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-mono text-cyan-300/80 bg-slate-950/90 px-3 py-1 rounded-full border border-cyan-500/30 shadow-lg">
                  💡 Click anywhere on feed to move virtual target object
                </div>
              )}
            </div>
          </div>

          {/* Mask Canvas Preview below */}
          {showMask && (
            <div className="mt-4 w-full flex flex-col items-center border-t border-slate-800 pt-3">
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  HSV Binary Mask Preview (Filtered Pixels)
                </span>
                <span className="text-xs font-mono text-cyan-400">
                  Matches: {visionTarget.areaRatio ? (visionTarget.areaRatio * 100).toFixed(1) : 0}% area
                </span>
              </div>
              <div className="w-full max-w-[640px] h-[120px] rounded border border-slate-700 bg-slate-950 overflow-hidden">
                <canvas ref={maskCanvasRef} width={640} height={480} className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HSV Tuning Control Panel */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="glass-panel p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-display font-bold text-md text-cyan-300 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>HSV COLOR THRESHOLDS</span>
            </h3>
            <button
              onClick={() => setShowMask(!showMask)}
              className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1"
            >
              {showMask ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showMask ? 'Hide Mask' : 'Show Mask'}</span>
            </button>
          </div>

          {/* Color Presets */}
          <div>
            <label className="text-xs font-mono text-slate-400 mb-2 block">Quick Target Color Presets:</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(COLOR_PRESETS).map((key) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`px-2.5 py-1.5 rounded text-xs font-display font-semibold border transition-all text-left truncate ${
                    activePreset === key
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-950'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  ● {COLOR_PRESETS[key].name}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="flex flex-col gap-3 font-mono text-xs text-slate-300 border-t border-slate-800 pt-3">
            {/* Hue */}
            <div>
              <div className="flex justify-between mb-1">
                <span>Hue (H) Min-Max:</span>
                <span className="text-cyan-400">{hsvConfig.minH}° - {hsvConfig.maxH}°</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={hsvConfig.minH}
                  onChange={(e) => setHsvConfig({ ...hsvConfig, minH: parseInt(e.target.value) })}
                />
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={hsvConfig.maxH}
                  onChange={(e) => setHsvConfig({ ...hsvConfig, maxH: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between mb-1">
                <span>Saturation (S) Min-Max:</span>
                <span className="text-emerald-400">{hsvConfig.minS}% - {hsvConfig.maxS}%</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hsvConfig.minS}
                  onChange={(e) => setHsvConfig({ ...hsvConfig, minS: parseInt(e.target.value) })}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hsvConfig.maxS}
                  onChange={(e) => setHsvConfig({ ...hsvConfig, maxS: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Value (Brightness) */}
            <div>
              <div className="flex justify-between mb-1">
                <span>Value / Brightness (V) Min-Max:</span>
                <span className="text-amber-400">{hsvConfig.minV}% - {hsvConfig.maxV}%</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hsvConfig.minV}
                  onChange={(e) => setHsvConfig({ ...hsvConfig, minV: parseInt(e.target.value) })}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hsvConfig.maxV}
                  onChange={(e) => setHsvConfig({ ...hsvConfig, maxV: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Current Target Stats */}
          <div className="mt-2 p-3 rounded-lg bg-slate-900/80 border border-slate-800 font-mono text-xs">
            <div className="text-slate-400 mb-1 border-b border-slate-800 pb-1 font-semibold">
              🎯 TARGET CENTROID TELEMETRY
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
              <span className="text-slate-400">Target X:</span>
              <span className="text-cyan-400">{visionTarget.x || 0} px</span>
              <span className="text-slate-400">Target Y:</span>
              <span className="text-cyan-400">{visionTarget.y || 0} px</span>
              <span className="text-slate-400">Normalized Error:</span>
              <span className={visionTarget.hasTarget ? 'text-emerald-400' : 'text-slate-500'}>
                {(visionTarget.normX || 0).toFixed(2)}
              </span>
              <span className="text-slate-400">Lock State:</span>
              <span className={visionTarget.hasTarget ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                {visionTarget.hasTarget ? 'LOCKED' : 'NO TARGET'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
