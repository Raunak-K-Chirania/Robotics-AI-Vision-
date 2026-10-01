import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

/**
 * Robot3DView — Three.js 3D arena with three control modes:
 *   AUTONOMOUS_CHASE  → PID-driven pursuit
 *   SENTRY_TURRET     → body fixed, turret pans to track
 *   MANUAL            → WASD / arrow keys via pressedKeys ref
 */
export default function Robot3DView({
  visionTarget,
  pidConfig,
  robotTelemetry,
  setRobotTelemetry,
  controlMode,
  pressedKeys,
  autoPatrol,
  showFOV,
  showLaser,
}) {
  const mountRef      = useRef(null);
  const animFrameRef  = useRef(null);

  // All physics / scene objects held in refs so the animation loop
  // can read live values without triggering re-renders or re-mounts.
  const robotGroupRef  = useRef(null);
  const turretGroupRef = useRef(null);
  const targetMeshRef  = useRef(null);
  const wheelsRef      = useRef([]);
  const fovMeshRef     = useRef(null);
  const laserLineRef   = useRef(null);

  const robotPos     = useRef({ x: 0, z: 0, heading: 0 });
  const turretPan    = useRef(0);
  const pidIntegral  = useRef(0);
  const pidLastError = useRef(0);
  const target3D     = useRef({ x: 0, y: 1.2, z: -4 });
  const lastTelemetryTime = useRef(0);

  // "Live" refs — updated synchronously so animation loop sees current values
  const modeRef    = useRef(controlMode);
  const pidRef     = useRef(pidConfig);
  const patrolRef  = useRef(autoPatrol);
  const fovRef     = useRef(showFOV);
  const laserRef   = useRef(showLaser);
  const keysRef    = pressedKeys; // same ref passed from App

  useEffect(() => { modeRef.current   = controlMode; }, [controlMode]);
  useEffect(() => { pidRef.current    = pidConfig;   }, [pidConfig]);
  useEffect(() => { patrolRef.current = autoPatrol;  }, [autoPatrol]);
  useEffect(() => { fovRef.current    = showFOV;     }, [showFOV]);
  useEffect(() => { laserRef.current  = showLaser;   }, [showLaser]);

  // ── Scene bootstrap (runs once on mount) ──────────────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060911);
    scene.fog = new THREE.FogExp2(0x060911, 0.032);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 120);
    camera.position.set(0, 7, 9);
    camera.lookAt(0, 1, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // ── Lights ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const dirLight = new THREE.DirectionalLight(0x00f3ff, 1.2);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointA = new THREE.PointLight(0xa855f7, 2.5, 18);
    pointA.position.set(-6, 5, -6);
    scene.add(pointA);

    const pointB = new THREE.PointLight(0x00f3ff, 1.2, 14);
    pointB.position.set(6, 3, 4);
    scene.add(pointB);

    // ── Floor ───────────────────────────────────────────────────────────────
    scene.add(new THREE.GridHelper(32, 32, 0x00f3ff, 0x1e293b));

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(32, 32),
      new THREE.MeshStandardMaterial({ color: 0x080e1c, roughness: 0.85, metalness: 0.15 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Corner pillars with neon caps
    const pillarGeo  = new THREE.BoxGeometry(0.3, 2.5, 0.3);
    const pillarMat  = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
    const capMat     = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    [[-14,-14],[14,-14],[-14,14],[14,14]].forEach(([px, pz]) => {
      const p = new THREE.Mesh(pillarGeo, pillarMat);
      p.position.set(px, 1.25, pz);
      scene.add(p);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.32), capMat);
      cap.position.set(px, 2.52, pz);
      scene.add(cap);
    });

    // ── Robot chassis ───────────────────────────────────────────────────────
    const robotGroup = new THREE.Group();
    robotGroupRef.current = robotGroup;
    scene.add(robotGroup);

    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1a2540, roughness: 0.25, metalness: 0.85 });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.2), chassisMat);
    chassis.position.y = 0.5;
    chassis.castShadow = true;
    robotGroup.add(chassis);

    // Neon edge stripe
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.66, 0.07, 2.26),
      new THREE.MeshBasicMaterial({ color: 0x00f3ff })
    );
    stripe.position.y = 0.5;
    robotGroup.add(stripe);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 28);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x080c15, roughness: 0.95 });
    const hubMat   = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
    const wheelPositions = [[-0.95, 0.35, 0.75],[0.95, 0.35, 0.75],[-0.95, 0.35, -0.75],[0.95, 0.35, -0.75]];
    const wheels = [];
    wheelPositions.forEach((pos) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(...pos);
      w.castShadow = true;
      robotGroup.add(w);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.28, 10), hubMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(...pos);
      robotGroup.add(hub);
      wheels.push(w);
    });
    wheelsRef.current = wheels;

    // Pan-Tilt Turret
    const turretGroup = new THREE.Group();
    turretGroup.position.set(0, 0.9, 0.2);
    turretGroupRef.current = turretGroup;
    robotGroup.add(turretGroup);

    turretGroup.add(new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.37, 0.26, 18),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 })
    ));

    const camHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.42, 0.52),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6 })
    );
    camHead.position.y = 0.3;
    turretGroup.add(camHead);

    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.22, 20),
      new THREE.MeshStandardMaterial({ color: 0x00f3ff, roughness: 0.05, metalness: 0.95, emissive: 0x003344 })
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.3, -0.29);
    turretGroup.add(lens);

    // FOV cone
    const fovGeo = new THREE.ConeGeometry(2.6, 5.2, 4, 1, true);
    fovGeo.rotateX(-Math.PI / 2);
    fovGeo.translate(0, 0, -2.6);
    const fovMesh = new THREE.Mesh(fovGeo,
      new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, wireframe: true })
    );
    fovMesh.position.set(0, 0.3, -0.3);
    fovMeshRef.current = fovMesh;
    turretGroup.add(fovMesh);

    // Laser pointer
    const laserLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.3, -0.3),
        new THREE.Vector3(0, 0.3, -9),
      ]),
      new THREE.LineBasicMaterial({ color: 0xff3366 })
    );
    laserLineRef.current = laserLine;
    turretGroup.add(laserLine);

    // ── Target drone ────────────────────────────────────────────────────────
    const targetMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x00f3ff, emissive: 0x00f3ff, emissiveIntensity: 0.9, roughness: 0.15 })
    );
    targetMesh.position.set(target3D.current.x, target3D.current.y, target3D.current.z);
    targetMeshRef.current = targetMesh;
    scene.add(targetMesh);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.032, 16, 36),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    ring.rotation.x = Math.PI / 2;
    targetMesh.add(ring);

    // ── Animation loop ──────────────────────────────────────────────────────
    let prevTime = performance.now();
    let elapsed  = 0;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const now   = performance.now();
      const delta = Math.min((now - prevTime) / 1000, 0.05);
      prevTime    = now;
      elapsed    += delta;

      const mode = modeRef.current;
      const pid  = pidRef.current;

      // Move target drone on patrol path
      if (patrolRef.current) {
        target3D.current.x = Math.sin(elapsed * 0.75) * 5.5;
        target3D.current.z = -5 + Math.cos(elapsed * 1.3) * 3.2;
        target3D.current.y = 1.0 + Math.sin(elapsed * 2.1) * 0.45;
      }

      if (targetMeshRef.current) {
        targetMeshRef.current.position.set(target3D.current.x, target3D.current.y, target3D.current.z);
        targetMeshRef.current.rotation.y += 0.025;
      }

      const robot = robotGroupRef.current;
      if (robot) {
        const dx = target3D.current.x - robotPos.current.x;
        const dz = target3D.current.z - robotPos.current.z;
        const targetAngle = Math.atan2(-dx, -dz);

        let errorAngle = targetAngle - robotPos.current.heading;
        while (errorAngle >  Math.PI) errorAngle -= Math.PI * 2;
        while (errorAngle < -Math.PI) errorAngle += Math.PI * 2;

        pidIntegral.current += errorAngle * delta;
        const derivative = (errorAngle - pidLastError.current) / (delta || 0.016);
        pidLastError.current = errorAngle;

        const { kp = 2.5, ki = 0.1, kd = 0.5 } = pid;
        const pidSteer = kp * errorAngle + ki * pidIntegral.current + kd * derivative;

        let driveSpeed = 0;
        let steer      = 0;

        if (mode === 'AUTONOMOUS_CHASE') {
          steer = pidSteer * 1.5;
          const dist = Math.hypot(dx, dz);
          const dErr = dist - 2.5;
          if (Math.abs(dErr) > 0.2) driveSpeed = Math.max(-2.5, Math.min(2.5, dErr * 1.2));
          turretPan.current = THREE.MathUtils.lerp(turretPan.current, 0, delta * 5);

        } else if (mode === 'SENTRY_TURRET') {
          turretPan.current = THREE.MathUtils.lerp(turretPan.current, errorAngle, delta * 6);

        } else {
          // MANUAL — read live key state
          const keys = keysRef.current;
          if (keys.has('w') || keys.has('arrowup'))    driveSpeed =  2.8;
          if (keys.has('s') || keys.has('arrowdown'))  driveSpeed = -2.0;
          if (keys.has('a') || keys.has('arrowleft'))  steer      = -2.2;
          if (keys.has('d') || keys.has('arrowright')) steer      =  2.2;
          turretPan.current = THREE.MathUtils.lerp(turretPan.current, 0, delta * 4);
        }

        robotPos.current.heading += steer * delta;
        robotPos.current.x += Math.sin(robotPos.current.heading) * driveSpeed * delta;
        robotPos.current.z -= Math.cos(robotPos.current.heading) * driveSpeed * delta;

        // Clamp inside arena walls
        robotPos.current.x = Math.max(-13.5, Math.min(13.5, robotPos.current.x));
        robotPos.current.z = Math.max(-13.5, Math.min(13.5, robotPos.current.z));

        wheelsRef.current.forEach((w) => { w.rotation.x += driveSpeed * delta * 3; });

        robot.position.x = robotPos.current.x;
        robot.position.z = robotPos.current.z;
        robot.rotation.y = robotPos.current.heading;

        if (turretGroupRef.current) turretGroupRef.current.rotation.y = turretPan.current;

        // Follow-cam
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, robotPos.current.x, delta * 3.5);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, robotPos.current.z + 8.5, delta * 3.5);
        camera.lookAt(robotPos.current.x, 1, robotPos.current.z - 1);

        // Throttle telemetry to ~10 Hz
        if (now - lastTelemetryTime.current >= 100) {
          lastTelemetryTime.current = now;
          const leftPwm  = Math.round(Math.max(0, Math.min(255, 150 + pidSteer * 40)));
          const rightPwm = Math.round(Math.max(0, Math.min(255, 150 - pidSteer * 40)));
          setRobotTelemetry({
            headingDeg:     Math.round((robotPos.current.heading * 180) / Math.PI) % 360,
            turretPanDeg:   Math.round((turretPan.current * 180) / Math.PI),
            distanceMeters: Math.hypot(dx, dz).toFixed(2),
            errorAngleDeg:  Math.round((errorAngle * 180) / Math.PI),
            pwmL:  leftPwm,
            pwmR:  rightPwm,
            posX:  robotPos.current.x.toFixed(2),
            posZ:  robotPos.current.z.toFixed(2),
          });
        }
      }

      if (fovMeshRef.current)   fovMeshRef.current.visible  = fovRef.current;
      if (laserLineRef.current) laserLineRef.current.visible = laserRef.current;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once — everything else via refs

  return (
    <div className="w-full">
      {/* 3D Viewport */}
      <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-cyan-500/40 shadow-2xl"
           style={{ boxShadow: '0 0 30px rgba(0,243,255,0.10), inset 0 0 20px rgba(0,243,255,0.04)' }}>
        <div ref={mountRef} className="w-full h-full" />

        {/* Top-left live badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-950/88 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/30 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping opacity-80" />
          <span className="font-display text-xs font-bold text-cyan-300 tracking-wider">LIVE 3D ARENA</span>
        </div>

        {/* Mode badge top-right */}
        <div className="absolute top-3 right-3 pointer-events-none">
          {controlMode === 'MANUAL' && (
            <span className="px-2.5 py-1 rounded-lg border border-violet-500/60 bg-violet-950/70 font-mono text-[11px] text-violet-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              MANUAL DRIVE
            </span>
          )}
          {controlMode === 'AUTONOMOUS_CHASE' && (
            <span className="px-2.5 py-1 rounded-lg border border-cyan-500/60 bg-cyan-950/70 font-mono text-[11px] text-cyan-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              AUTO CHASE
            </span>
          )}
          {controlMode === 'SENTRY_TURRET' && (
            <span className="px-2.5 py-1 rounded-lg border border-rose-500/60 bg-rose-950/70 font-mono text-[11px] text-rose-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              SENTRY MODE
            </span>
          )}
        </div>

        {/* HUD telemetry bottom-right */}
        <div className="absolute bottom-3 right-3 bg-slate-950/90 backdrop-blur-md p-3 rounded-lg border border-cyan-500/25 font-mono text-xs text-slate-300 flex flex-col gap-1 w-56 shadow-xl pointer-events-none">
          <div className="text-cyan-400 font-bold border-b border-slate-800 pb-1 flex justify-between">
            <span>CHASSIS TELEMETRY</span>
            <span className="text-emerald-400">ONLINE</span>
          </div>
          <div className="grid grid-cols-2 gap-0.5 text-[11px] pt-1">
            <span className="text-slate-500">Pos (X, Z)</span>
            <span className="text-cyan-300">{robotTelemetry.posX}, {robotTelemetry.posZ}</span>
            <span className="text-slate-500">Heading</span>
            <span className="text-cyan-300">{robotTelemetry.headingDeg}°</span>
            <span className="text-slate-500">Target Dist</span>
            <span className="text-emerald-300">{robotTelemetry.distanceMeters} m</span>
            <span className="text-slate-500">Motor L / R</span>
            <span className="text-amber-300">{robotTelemetry.pwmL} / {robotTelemetry.pwmR}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
