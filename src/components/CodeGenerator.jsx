import React, { useState } from 'react';
import { Code2, Copy, Check, Terminal, Cpu, FileCode2, Sparkles } from 'lucide-react';

export default function CodeGenerator({ hsvConfig, pidConfig }) {
  const [activeLang, setActiveLang] = useState('ARDUINO_CPP'); // 'ARDUINO_CPP', 'PYTHON_OPENCV', 'ESP32_CAM'
  const [copied, setCopied] = useState(false);
  const [baudRate, setBaudRate] = useState(115200);

  // Generate Arduino C++ Firmware Code
  const getArduinoCode = () => {
    return `/*
 * AETHER-VISION AI ROBOTICS - CLOSED LOOP PID TARGET TRACKER
 * Target Platform: Arduino Uno / Nano / ESP32 + L298N Motor Driver
 * Baud Rate: ${baudRate}
 * HSV Targets: H(${hsvConfig.minH}-${hsvConfig.maxH}) S(${hsvConfig.minS}-${hsvConfig.maxS}) V(${hsvConfig.minV}-${hsvConfig.maxV})
 */

#include <Servo.h>

// Pin Definitions for L298N Motor Driver
#define ENA 5  // Left Motor Speed PWM
#define IN1 6  // Left Motor Dir 1
#define IN2 7  // Left Motor Dir 2
#define IN3 8  // Right Motor Dir 1
#define IN4 9  // Right Motor Dir 2
#define ENB 10 // Right Motor Speed PWM

#define SERVO_PAN_PIN 3 // Pan Servo Pin

Servo panServo;
int currentServoAngle = 90;

// PID Controller Gains
float Kp = ${pidConfig.kp.toFixed(2)};
float Ki = ${pidConfig.ki.toFixed(2)};
float Kd = ${pidConfig.kd.toFixed(2)};

float pidIntegral = 0;
float previousError = 0;
unsigned long lastTime = 0;

void setup() {
  Serial.begin(${baudRate});
  
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  panServo.attach(SERVO_PAN_PIN);
  panServo.write(currentServoAngle);

  Serial.println("[AETHER] AI Vision Robot Firmware Ready.");
}

void loop() {
  // Read Serial commands from Python Vision Controller: "X:<normX>" (e.g. "X:0.35")
  if (Serial.available() > 0) {
    String inputStr = Serial.readStringUntil('\\n');
    inputStr.trim();
    
    if (inputStr.startsWith("X:")) {
      float errorX = inputStr.substring(2).toFloat(); // Normalized error (-1.0 to +1.0)
      computePIDAndDrive(errorX);
    }
  }
}

void computePIDAndDrive(float error) {
  unsigned long now = millis();
  float dt = (now - lastTime) / 1000.0;
  if (dt <= 0) dt = 0.02;
  lastTime = now;

  // PID Calculation
  pidIntegral += error * dt;
  float derivative = (error - previousError) / dt;
  previousError = error;

  float pidOutput = (Kp * error) + (Ki * pidIntegral) + (Kd * derivative);

  // Servo Pan Adjustment
  currentServoAngle -= (int)(pidOutput * 15.0);
  currentServoAngle = constrain(currentServoAngle, 20, 160);
  panServo.write(currentServoAngle);

  // Differential Steering PWM Calculation
  int baseSpeed = 160;
  int motorL = baseSpeed + (int)(pidOutput * 90.0);
  int motorR = baseSpeed - (int)(pidOutput * 90.0);

  motorL = constrain(motorL, 0, 255);
  motorR = constrain(motorR, 0, 255);

  setMotorMotors(motorL, motorR);
}

void setMotorMotors(int pWML, int pWMR) {
  // Forward Direction
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);

  analogWrite(ENA, pWML);
  analogWrite(ENB, pWMR);
}
`;
  };

  // Generate Python OpenCV Target Tracking Script
  const getPythonCode = () => {
    return `'''
  AETHER-VISION OpenCV Target Tracker & Serial Host Script
  Runs on PC / Laptop / Raspberry Pi with USB Webcam
  Dependencies: pip install opencv-python numpy pyserial
'''

import cv2
import numpy as np
import serial
import time

# Configure Serial Connection to Arduino
SERIAL_PORT = 'COM3'  # Replace with '/dev/ttyUSB0' on Raspberry Pi/Linux
BAUD_RATE = ${baudRate}

try:
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=0.1)
    print(f"[+] Connected to Robot Microcontroller on {SERIAL_PORT}")
    time.sleep(2)
except Exception as e:
    print(f"[!] Serial Warning: Could not open {SERIAL_PORT}. ({e})")
    ser = None

# Initialize Webcam
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

# Target HSV Color Range
HSV_MIN = np.array([${hsvConfig.minH}, int(${hsvConfig.minS} * 2.55), int(${hsvConfig.minV} * 2.55)])
HSV_MAX = np.array([${hsvConfig.maxH}, int(${hsvConfig.maxS} * 2.55), int(${hsvConfig.maxV} * 2.55)])

print("[+] Starting Vision Processing Loop. Press 'q' to exit.")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1) # Mirror preview
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    
    # Binary Threshold Mask
    mask = cv2.inRange(hsv, HSV_MIN, HSV_MAX)
    mask = cv2.erode(mask, None, iterations=2)
    mask = cv2.dilate(mask, None, iterations=2)

    # Find Contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if contours:
        # Find Largest Blob
        c = max(contours, key=cv2.contourArea)
        if cv2.contourArea(c) > 300:
            ((x, y), radius) = cv2.minEnclosingCircle(c)
            M = cv2.moments(c)
            center = (int(M["m10"] / M["m00"]), int(M["01"] / M["m00"]))

            # Draw HUD Overlays
            cv2.circle(frame, (int(x), int(y)), int(radius), (0, 255, 136), 2)
            cv2.circle(frame, center, 5, (0, 0, 255), -1)

            # Compute Normalized X Error (-1.0 to +1.0)
            frame_width = frame.shape[1]
            norm_error_x = (center[0] - (frame_width / 2)) / (frame_width / 2)

            # Send Telemetry over Serial
            command = f"X:{norm_error_x:.2f}\\n"
            if ser and ser.is_open:
                ser.write(command.encode('utf-8'))

            cv2.putText(frame, f"LOCK X:{center[0]} Err:{norm_error_x:.2f}", 
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 243, 255), 2)

    cv2.imshow("AETHER-VISION Live Feed", frame)
    cv2.imshow("Binary Mask", mask)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
if ser: ser.close()
cv2.destroyAllWindows()
`;
  };

  const getActiveCode = () => {
    return activeLang === 'ARDUINO_CPP' ? getArduinoCode() : getPythonCode();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-6 p-4">
      <div className="glass-panel p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="font-display font-bold text-xl text-cyan-300 flex items-center gap-2">
              <Code2 className="w-6 h-6 text-cyan-400" />
              <span>EMBEDDED FIRMWARE & PYTHON CODE GENERATOR</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Auto-generated C++ & OpenCV code tailored to your live HSV thresholds and PID gains!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="btn-cyber btn-cyber-green text-xs py-2 px-4 flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* Tab & Settings Selection */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveLang('ARDUINO_CPP')}
              className={`px-4 py-1.5 rounded text-xs font-display font-semibold transition-all flex items-center gap-2 ${
                activeLang === 'ARDUINO_CPP'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Arduino / ESP32 C++</span>
            </button>
            <button
              onClick={() => setActiveLang('PYTHON_OPENCV')}
              className={`px-4 py-1.5 rounded text-xs font-display font-semibold transition-all flex items-center gap-2 ${
                activeLang === 'PYTHON_OPENCV'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Python OpenCV Host Script</span>
            </button>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
            <span>Baud Rate:</span>
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(parseInt(e.target.value))}
              className="bg-slate-900 border border-slate-700 text-cyan-400 px-2 py-1 rounded focus:outline-none"
            >
              <option value={9600}>9600 Baud</option>
              <option value={115200}>115200 Baud (Recommended)</option>
            </select>
          </div>
        </div>

        {/* Code Viewport with Syntax Display */}
        <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 shadow-2xl">
          <pre className="overflow-x-auto max-h-[500px] leading-relaxed scrollbar-thin text-emerald-300">
            <code>{getActiveCode()}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
