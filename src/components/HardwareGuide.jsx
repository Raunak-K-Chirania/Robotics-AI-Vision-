import React from 'react';
import { Cpu, Wrench, CheckCircle2, Zap, ShieldAlert } from 'lucide-react';

export default function HardwareGuide() {
  const bomList = [
    { name: 'Arduino Uno R3 or ESP32 Board', qty: '1x', cost: '~$6.00', purpose: 'Main robot brain & PWM motor control' },
    { name: 'L298N Dual H-Bridge Motor Driver', qty: '1x', cost: '~$3.00', purpose: 'Drives 2 DC gear motors with PWM speed control' },
    { name: 'TT Gear DC Motors (3V-6V) + Rubber Wheels', qty: '2x / 4x', cost: '~$5.00', purpose: 'Robot locomotion & differential steering' },
    { name: 'SG90 9g Servo Motor', qty: '1x', cost: '~$2.00', purpose: 'Pan turret mechanism for camera tracking' },
    { name: 'USB Webcam or ESP32-CAM Module', qty: '1x', cost: '~$8.00', purpose: 'Live optical vision sensor feed' },
    { name: '7.4V / 11.1V Li-ion Battery Pack (18650 x2)', qty: '1x', cost: '~$7.00', purpose: 'High current power source for motors & logic' },
    { name: '2WD / 4WD Acrylic Robot Chassis Kit', qty: '1x', cost: '~$6.00', purpose: 'Physical structural frame and mounting plate' },
  ];

  const pinoutTable = [
    { pin: 'Arduino D5', comp: 'L298N ENA', desc: 'Left Motor PWM Speed Control' },
    { pin: 'Arduino D6', comp: 'L298N IN1', desc: 'Left Motor Forward Direction' },
    { pin: 'Arduino D7', comp: 'L298N IN2', desc: 'Left Motor Reverse Direction' },
    { pin: 'Arduino D8', comp: 'L298N IN3', desc: 'Right Motor Forward Direction' },
    { pin: 'Arduino D9', comp: 'L298N IN4', desc: 'Right Motor Reverse Direction' },
    { pin: 'Arduino D10', comp: 'L298N ENB', desc: 'Right Motor PWM Speed Control' },
    { pin: 'Arduino D3', comp: 'Servo Signal (Yellow)', desc: 'Pan Camera Servo Control' },
    { pin: 'Arduino 5V & GND', comp: 'Servo VCC & GND', desc: 'Logic 5V Power Rails' },
  ];

  return (
    <div className="w-full flex flex-col gap-6 p-4 max-w-6xl mx-auto">
      {/* Hero Header */}
      <div className="glass-panel p-6 border-cyan-500/30">
        <h2 className="font-display font-bold text-2xl text-cyan-300 flex items-center gap-3">
          <Wrench className="w-7 h-7 text-cyan-400" />
          <span>PHYSICAL ROBOT HARDWARE BUILDING GUIDE</span>
        </h2>
        <p className="text-sm text-slate-300 font-mono mt-2 leading-relaxed">
          Complete blueprint, bill of materials (BOM), and pinout schematic to transition from this browser simulator to a real-world physical AI target tracking robot!
        </p>
      </div>

      {/* Grid Layout: Parts List & Wiring */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bill of Materials (BOM) */}
        <div className="lg:col-span-7 glass-panel p-5 flex flex-col gap-4">
          <h3 className="font-display font-bold text-md text-cyan-400 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>BILL OF MATERIALS (PARTS LIST)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-slate-300">
              <thead className="bg-slate-900 text-cyan-300 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Component</th>
                  <th className="p-2.5">Qty</th>
                  <th className="p-2.5">Est. Price</th>
                  <th className="p-2.5">Function</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bomList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="p-2.5 text-cyan-400 font-semibold">{item.name}</td>
                    <td className="p-2.5 text-slate-400">{item.qty}</td>
                    <td className="p-2.5 text-emerald-400">{item.cost}</td>
                    <td className="p-2.5 text-slate-400">{item.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pinout Schematic */}
        <div className="lg:col-span-5 glass-panel p-5 flex flex-col gap-4">
          <h3 className="font-display font-bold text-md text-cyan-400 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>CIRCUIT PINOUT SCHEMATIC MAP</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-slate-300">
              <thead className="bg-slate-900 text-amber-300 border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Microcontroller Pin</th>
                  <th className="p-2.5">Target Module</th>
                  <th className="p-2.5">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pinoutTable.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="p-2.5 text-amber-400 font-bold">{row.pin}</td>
                    <td className="p-2.5 text-cyan-400">{row.comp}</td>
                    <td className="p-2.5 text-slate-400">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2 p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Important Safety Tip:</strong> Always remove the L298N 5V jumper cap if supplying more than 12V DC input to avoid damaging microcontroller logic!
            </span>
          </div>
        </div>
      </div>

      {/* Assembly Steps */}
      <div className="glass-panel p-6 flex flex-col gap-4">
        <h3 className="font-display font-bold text-lg text-cyan-300 flex items-center gap-2 border-b border-slate-800 pb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>STEP-BY-STEP HARDWARE ASSEMBLY WORKFLOW</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
            <div className="text-cyan-400 font-display font-bold text-sm">1. CHASSIS ASSEMBLY</div>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Mount DC gear motors onto acrylic chassis using bracket screws. Connect rubber wheels to motor D-shafts.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
            <div className="text-cyan-400 font-display font-bold text-sm">2. TURRET & CAMERA</div>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Attach SG90 servo motor to front top deck. Screw 3D-printed camera bracket to servo horn and clip webcam in place.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
            <div className="text-cyan-400 font-display font-bold text-sm">3. POWER & WIRING</div>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Wire L298N outputs to motors. Wire battery pack to L298N VCC/GND. Connect common ground (GND) between Arduino and battery.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
            <div className="text-cyan-400 font-display font-bold text-sm">4. FLASH & RUN</div>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Upload generated C++ code to Arduino. Run the Python OpenCV host script on PC/Laptop connected via USB cable!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
