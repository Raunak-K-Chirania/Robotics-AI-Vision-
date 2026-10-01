# AETHER-VISION — AI Robotics Simulator

A browser-based robotics development platform that combines a real-time 3D physics arena, computer vision, PID control theory, and hands-on robot control — all without needing any physical hardware.

---

## What It Does

AETHER-VISION lets you design, tune, and pilot an autonomous ground robot directly in your browser. The simulator is built around four interconnected systems that mirror what you'd actually implement on a real robot:

| System | Description |
|---|---|
| **3D Robot Arena** | WebGL-rendered environment with a tracked rover, pan-tilt turret, and a moving target drone |
| **Computer Vision Lab** | Live webcam feed with HSV color segmentation — the same algorithm used on embedded platforms like Raspberry Pi and Jetson Nano |
| **PID Controller** | Tunable closed-loop controller with a real-time oscilloscope for visualising error convergence |
| **Robot Control Panel** | Full keyboard, on-screen D-pad, and gamepad support for manual driving |

---

## Driving the Robot

The robot supports three operating modes, switchable at any time from the **Robot Control Interface** panel on the right sidebar.

### Manual Drive (WASD / Arrow Keys / Gamepad)

Select **Manual** mode and take the wheel yourself.

| Input | Action |
|---|---|
| `W` or `↑` | Drive forward |
| `S` or `↓` | Reverse |
| `A` or `←` | Steer left |
| `D` or `→` | Steer right |
| Left analog stick | Gamepad steering (any standard controller) |
| On-screen D-pad | Touch/mouse D-pad in the control panel |

> Switching to Manual immediately disables the AI and hands you full control. The turret re-centres itself.

### Autonomous Chase

The robot uses a PID controller to chase a moving target drone. Proportional, integral, and derivative gains are all live-adjustable from the tuner below the control panel.

### Sentry Turret

The chassis stays fixed. The pan-tilt turret tracks the target autonomously, useful for simulating a stationary security camera or weapon mount.

---

## Arena Controls

Below the 3D viewport you'll find three toggles:

- **Target Patrol ON/OFF** — enables or pauses the drone's orbital flight path
- **FOV Cone ON/OFF** — renders the camera's field-of-view wireframe
- **Laser Lock ON/OFF** — shows the red laser pointer from the turret lens

---

## Computer Vision Lab

Open the **AI Vision Lab** tab. Allow webcam access when prompted. The system applies HSV colour thresholding in real time and draws bounding boxes around detected targets. Sliders let you tune the hue, saturation, and value ranges exactly as you would in an OpenCV pipeline.

When a target is detected, the **TARGET LOCKED** indicator lights up in the navbar and the vision data feeds directly into the autonomous chase controller if that mode is active.

---

## PID Tuner

The **PID Closed-Loop Controller** panel shows:

- **Kp** (Proportional) — how aggressively the robot responds to error
- **Ki** (Integral) — eliminates persistent offset over time
- **Kd** (Derivative) — damps oscillation and overshoot

Four tuning presets are included to demonstrate different response behaviours:

| Preset | Behaviour |
|---|---|
| Smooth Tracking | Gentle, stable tracking with minimal oscillation |
| Aggressive Pursuit | Fast response, slight overshoot |
| Critically Damped | Zero overshoot, slower to settle |
| Underdamped | High gain — deliberately oscillates to show instability |

The oscilloscope below the sliders plots the angular error `e(t)` in real time.

---

## Firmware & Code Export

The **Firmware & Python** tab generates ready-to-deploy code based on your current tuner settings:

- **Arduino C++** — differential drive PWM loop with PID
- **Python / OpenCV** — HSV tracking script matching your vision lab configuration

Copy this code to an Arduino Mega or a Raspberry Pi running OpenCV and it will behave identically to the simulator.

---

## Build Guide

The **Build Guide** tab lists all hardware components, wiring diagrams, and assembly steps to construct the physical robot that this simulator models.

---

## Tech Stack

- **React 19** — UI layer
- **Three.js** — 3D rendering and physics
- **Canvas API** — Computer vision simulation and oscilloscope
- **Vite** — Development and build tooling
- **TailwindCSS v4** — Styling

---

## Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```
src/
├── App.jsx                  — Root layout, shared state, tab routing
├── components/
│   ├── Navbar.jsx           — Top navigation, mode badges, FPS counter
│   ├── Robot3DView.jsx      — Three.js arena, physics simulation loop
│   ├── RobotController.jsx  — Manual D-pad, keyboard/gamepad input handler
│   ├── PIDTuner.jsx         — PID sliders, presets, oscilloscope
│   ├── TelemetryPanel.jsx   — Motor PWM gauges, serial log stream
│   ├── VisionEngine.jsx     — Webcam HSV segmentation, target detection
│   ├── CodeGenerator.jsx    — Arduino/Python code exporter
│   └── HardwareGuide.jsx    — Component list and assembly reference
└── utils/
    └── visionProcessor.js   — HSV masking and blob detection logic
```
