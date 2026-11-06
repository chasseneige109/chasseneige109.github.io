// 홈 화면의 작은 로봇 방: 휴머노이드가 걸어 다니며 바닥의 장난감을 집어 옮김
// 드래그 = 방 돌리기 · 바닥 클릭 = 걷기 · 장난감 클릭 = 집기 · 바구니 클릭 = 넣기 · WASD/방향키 = 운전 · Space = 집기/내려놓기
(function () {
  const stage = document.getElementById('robot-lab');
  if (!stage) return;
  let loaded = false, running = false;
  const io = new IntersectionObserver(es => {
    running = es.some(e => e.isIntersecting);
    if (running && !loaded) { loaded = true; load(); }
  }, { rootMargin: '150px' });
  io.observe(stage);

  function load() {
    if (window.THREE) return init();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = init;
    s.onerror = () => stage.classList.add('nogl');
    document.head.appendChild(s);
  }

  function init() {
    const T = THREE;
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (e) { stage.classList.add('nogl'); return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.autoClear = false;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-label', 'Interactive robot room');
    stage.prepend(canvas);
    stage.tabIndex = 0;

    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const lerp = (a, b, t) => a + (b - a) * t;
    const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
    const std = (color, o) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0 }, o || {}));
    const mesh = (geo, mat, parent, x, y, z) => {
      const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0);
      m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m;
    };

    // ── 장면 ──
    const scene = new T.Scene();
    const cam = new T.PerspectiveCamera(32, 1.6, 0.1, 60);
    scene.add(new T.HemisphereLight(0xffffff, 0xd9dde6, 0.75));
    const sun = new T.DirectionalLight(0xffffff, 0.75);
    sun.position.set(3.5, 6, 3); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    const FX = 3, FZ = 2.2;   // 바닥 반폭
    const floor = mesh(new T.BoxGeometry(FX * 2, 0.08, FZ * 2), std(0xf2efe9, { roughness: 0.9 }), scene, 0, -0.04, 0);
    floor.castShadow = false;
    // 바닥 줄눈
    const grid = new T.GridHelper(4.4, 11, 0xe3dfd6, 0xe3dfd6);
    grid.scale.set(FX * 2 / 4.4, 1, 1); grid.position.y = 0.002; scene.add(grid);
    const rug = mesh(new T.CylinderGeometry(0.9, 0.9, 0.01, 48), std(0xdfe6f2, { roughness: 1 }), scene, -0.9, 0.005, 0.35);
    rug.castShadow = false;
    const wallMat = std(0xebe8e1, { roughness: 0.95 });
    mesh(new T.BoxGeometry(FX * 2, 0.9, 0.08), wallMat, scene, 0, 0.45, -FZ - 0.04).castShadow = false;
    mesh(new T.BoxGeometry(0.08, 0.9, FZ * 2 + 0.08), wallMat, scene, -FX - 0.04, 0.45, -0.04).castShadow = false;
    // 벽의 작은 액자와 화분 (분위기용)
    mesh(new T.BoxGeometry(0.7, 0.42, 0.02), std(0x2a2d34), scene, -1.4, 0.55, -FZ + 0.01);
    mesh(new T.BoxGeometry(0.62, 0.34, 0.01), std(0xbfd4ea), scene, -1.4, 0.55, -FZ + 0.025);
    const pot = mesh(new T.CylinderGeometry(0.12, 0.09, 0.2, 24), std(0xc96f4a), scene, -2.65, 0.1, -1.85);
    mesh(new T.SphereGeometry(0.2, 20, 14), std(0x5aa469), pot, 0, 0.24, 0).scale.set(1, 1.25, 1);

    // 바구니
    const BIN = { x: 2.35, z: -1.75, hw: 0.22, hd: 0.16, h: 0.24 };
    const bin = new T.Group(); bin.position.set(BIN.x, 0, BIN.z); scene.add(bin);
    const binMat = std(0xd8c3a0, { roughness: 0.8 });
    mesh(new T.BoxGeometry(BIN.hw * 2, 0.02, BIN.hd * 2), binMat, bin, 0, 0.01, 0);
    mesh(new T.BoxGeometry(BIN.hw * 2, BIN.h, 0.02), binMat, bin, 0, BIN.h / 2, BIN.hd);
    mesh(new T.BoxGeometry(BIN.hw * 2, BIN.h, 0.02), binMat, bin, 0, BIN.h / 2, -BIN.hd);
    mesh(new T.BoxGeometry(0.02, BIN.h, BIN.hd * 2), binMat, bin, BIN.hw, BIN.h / 2, 0);
    mesh(new T.BoxGeometry(0.02, BIN.h, BIN.hd * 2), binMat, bin, -BIN.hw, BIN.h / 2, 0);

    // 장난감
    const TOYS = [
      { kind: 'cube', color: 0xef6f6c, x: -1.6, z: -0.9 },
      { kind: 'ball', color: 0x5b8def, x: 0.4, z: 1.2 },
      { kind: 'can', color: 0xf6c445, x: 1.5, z: 0.3 },
      { kind: 'cube', color: 0x5cc08b, x: -0.6, z: 1.45 },
      { kind: 'donut', color: 0xf28fb5, x: 0.9, z: -1.0 },
      { kind: 'cone', color: 0x9b7be0, x: -2.2, z: 0.9 },
    ];
    const toys = TOYS.map((d, i) => {
      let geo, h, w;
      if (d.kind === 'cube') { geo = new T.BoxGeometry(0.09, 0.09, 0.09); h = 0.09; w = 0.045; }
      else if (d.kind === 'ball') { geo = new T.SphereGeometry(0.05, 24, 16); h = 0.1; w = 0.05; }
      else if (d.kind === 'can') { geo = new T.CylinderGeometry(0.04, 0.04, 0.11, 24); h = 0.11; w = 0.04; }
      else if (d.kind === 'donut') { geo = new T.TorusGeometry(0.045, 0.022, 14, 28); geo.rotateX(Math.PI / 2); h = 0.044; w = 0.045; }
      else { geo = new T.ConeGeometry(0.05, 0.1, 24); h = 0.1; w = 0.04; }
      const m = mesh(geo, std(d.color, { roughness: 0.4 }), scene);
      const toy = { mesh: m, h, w, home: d, held: false, inBin: false, vy: 0, rest: h / 2, id: i };
      m.userData.toy = toy;
      return toy;
    });
    function resetToys() {
      toys.forEach(t => {
        if (t.held) scene.attach(t.mesh);
        t.held = false; t.inBin = false; t.vy = 0; t.rest = t.h / 2;
        t.mesh.position.set(t.home.x, t.h / 2, t.home.z);
        t.mesh.rotation.set(0, (t.id * 1.3) % 3, 0);
      });
    }

    // ── 로봇 ──
    const WHITE = std(0xf8f8f6, { roughness: 0.38 });
    const GREY = std(0xc9cdd5, { roughness: 0.5 });
    const DARK = std(0x22252c, { roughness: 0.25, metalness: 0.1 });
    const GLOW = new T.MeshBasicMaterial({ color: 0x9fe8ff });
    const ACCENT = std(0x5b8def, { roughness: 0.4 });
    const THIGH = 0.17, SHIN = 0.17, ANKLE = 0.045, HIP = 0.37, L1 = 0.16, L2 = 0.15, GRIP = 0.085;

    const robot = new T.Group(); scene.add(robot);
    const pelvis = new T.Group(); robot.add(pelvis);
    mesh(new T.SphereGeometry(0.1, 24, 16), GREY, pelvis, 0, 0, 0).scale.set(1.15, 0.6, 0.85);
    const torso = new T.Group(); torso.position.y = 0.03; pelvis.add(torso);
    mesh(new T.SphereGeometry(0.13, 28, 20), WHITE, torso, 0, 0.13, 0).scale.set(1, 1.12, 0.82);
    mesh(new T.CircleGeometry(0.035, 24), ACCENT, torso, 0, 0.16, 0.107);
    const neck = new T.Group(); neck.position.y = 0.27; torso.add(neck);
    mesh(new T.CylinderGeometry(0.035, 0.04, 0.06, 16), GREY, neck, 0, 0.02, 0);
    const head = new T.Group(); head.position.y = 0.17; neck.add(head);
    const HS = new T.Vector3(1.15, 0.92, 1);
    mesh(new T.SphereGeometry(0.16, 32, 24), WHITE, head).scale.copy(HS);
    const visor = mesh(new T.SphereGeometry(0.163, 32, 16, Math.PI / 2 - 0.95, 1.9, Math.PI / 2 - 0.55, 1.1), DARK, head);
    visor.scale.copy(HS);
    const eyes = [-1, 1].map(s => { const e = mesh(new T.SphereGeometry(0.022, 16, 12), GLOW, head, s * 0.058, 0.012, 0.158); e.scale.set(1, 1.35, 0.4); e.castShadow = false; return e; });
    const smile = mesh(new T.TorusGeometry(0.022, 0.0045, 8, 20, Math.PI), GLOW, head, 0, -0.035, 0.158);
    smile.rotation.z = Math.PI; smile.castShadow = false;
    [-1, 1].map(s => mesh(new T.SphereGeometry(0.035, 16, 12), GREY, head, s * 0.183, 0, 0)).forEach(m => m.scale.set(0.5, 1, 1));
    mesh(new T.CylinderGeometry(0.006, 0.006, 0.09, 8), GREY, head, 0, 0.17, 0);
    const bulb = mesh(new T.SphereGeometry(0.02, 12, 10), ACCENT, head, 0, 0.22, 0);
    const headCam = new T.PerspectiveCamera(72, 1.4, 0.03, 30);
    headCam.position.set(0, 0, 0.17); headCam.rotation.y = Math.PI; head.add(headCam);

    function makeLeg(s) {
      const hip = new T.Group(); hip.position.set(s * 0.065, -0.02, 0); pelvis.add(hip);
      mesh(new T.CylinderGeometry(0.038, 0.034, THIGH, 16), WHITE, hip, 0, -THIGH / 2, 0);
      const knee = new T.Group(); knee.position.y = -THIGH; hip.add(knee);
      mesh(new T.SphereGeometry(0.036, 16, 12), GREY, knee);
      mesh(new T.CylinderGeometry(0.033, 0.03, SHIN, 16), WHITE, knee, 0, -SHIN / 2, 0);
      const ankle = new T.Group(); ankle.position.y = -SHIN; knee.add(ankle);
      const foot = mesh(new T.SphereGeometry(0.05, 16, 12), DARK, ankle, 0, -0.025, 0.02);
      foot.scale.set(0.95, 0.5, 1.45);
      return { s, hip, knee, ankle };
    }
    const legs = [makeLeg(-1), makeLeg(1)];
    function makeArm(s) {
      const shoulder = new T.Group(); shoulder.position.set(s * 0.15, 0.2, 0); torso.add(shoulder);
      mesh(new T.SphereGeometry(0.04, 16, 12), GREY, shoulder);
      mesh(new T.CylinderGeometry(0.031, 0.028, L1, 16), WHITE, shoulder, 0, -L1 / 2, 0);
      const elbow = new T.Group(); elbow.position.y = -L1; shoulder.add(elbow);
      mesh(new T.SphereGeometry(0.03, 16, 12), GREY, elbow);
      mesh(new T.CylinderGeometry(0.028, 0.025, L2, 16), WHITE, elbow, 0, -L2 / 2, 0);
      const wrist = new T.Group(); wrist.position.y = -L2; elbow.add(wrist);
      mesh(new T.BoxGeometry(0.075, 0.035, 0.045), DARK, wrist, 0, -0.02, 0);
      const fingers = [-1, 1].map(f => mesh(new T.BoxGeometry(0.014, 0.055, 0.032), GREY, wrist, f * 0.035, -0.065, 0));
      return { s, shoulder, elbow, wrist, fingers, open: 0.035 };
    }
    const armR = makeArm(-1), armL = makeArm(1);
    const wristCam = new T.PerspectiveCamera(80, 1.4, 0.01, 20);
    wristCam.position.set(0, -0.015, 0.04); wristCam.rotation.x = -Math.PI / 2; armR.wrist.add(wristCam);
    mesh(new T.BoxGeometry(0.028, 0.02, 0.02), ACCENT, armR.wrist, 0, -0.012, 0.03);
    robot.traverse(o => { if (o.isMesh) o.castShadow = true; });

    // ── 운동학 ──
    const AX = new T.Vector3(1, 0, 0), UP = new T.Vector3(0, 1, 0);
    const _m = new T.Matrix4(), _q = new T.Quaternion(), _qa = new T.Quaternion(), _v = new T.Vector3(), _sw = new T.Vector3();
    const _X = new T.Vector3(), _Y = new T.Vector3(), _Z = new T.Vector3();
    // 2링크 팔 IK: 손목을 target(월드)으로, 손 방향을 qHand(월드)로
    function solveArm(arm, target, qHand) {
      torso.updateMatrixWorld(true);
      arm.shoulder.getWorldPosition(_sw);
      torso.getWorldQuaternion(_q);
      _v.copy(target).sub(_sw).applyQuaternion(_q.invert());
      const d = clamp(_v.length(), 0.05, L1 + L2 - 1e-4);
      _Y.copy(_v).normalize().negate();
      _X.set(1, 0, 0).addScaledVector(_Y, -_Y.x);
      if (_X.lengthSq() < 1e-6) _X.set(0, 0, 1);
      _X.normalize();
      _Z.crossVectors(_X, _Y);
      _m.makeBasis(_X, _Y, _Z);
      const gamma = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
      const alpha = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      arm.shoulder.quaternion.setFromRotationMatrix(_m).multiply(_qa.setFromAxisAngle(AX, alpha));
      arm.elbow.rotation.set(-(Math.PI - gamma), 0, 0);
      arm.shoulder.updateMatrixWorld(true);
      arm.elbow.getWorldQuaternion(_q);
      arm.wrist.quaternion.copy(_q.invert()).multiply(qHand);
    }
    // 다리 IK: 발목을 로봇 기준 (y, z)로
    function solveLeg(leg, footZ, lift) {
      const hy = pelvis.position.y - 0.02, dy = (ANKLE + lift) - hy, dz = footZ;
      const d = clamp(Math.hypot(dy, dz), 0.05, THIGH + SHIN - 1e-4);
      const gamma = Math.acos(clamp((THIGH * THIGH + SHIN * SHIN - d * d) / (2 * THIGH * SHIN), -1, 1));
      const alpha = Math.acos(clamp((THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d), -1, 1));
      const phi = Math.atan2(dz, -dy);
      leg.hip.rotation.x = -(phi + alpha);
      leg.knee.rotation.x = Math.PI - gamma;
      leg.ankle.rotation.x = -(leg.hip.rotation.x + leg.knee.rotation.x);
    }
    const yawQ = (yaw, pitch) => {
      const q = new T.Quaternion().setFromAxisAngle(UP, yaw);
      if (pitch) q.multiply(new T.Quaternion().setFromAxisAngle(AX, pitch));
      return q;
    };
    // 로봇 기준 위치 → 월드
    const local = (x, y, z, out) => (out || new T.Vector3()).set(x, y, z).applyAxisAngle(UP, R.yaw).add(new T.Vector3(R.x, 0, R.z));
    const wristFromGrip = (grip, qHand) => grip.clone().add(new T.Vector3(0, GRIP, 0).applyQuaternion(qHand));
    const gripPos = () => armR.wrist.localToWorld(new T.Vector3(0, -GRIP, 0));

    // ── 상태 ──
    const R = { x: -0.3, z: 0.2, yaw: 0.6, v: 0, w: 0, phase: 0, amp: 0, crouch: 0, crouchGoal: 0, lean: 0,
      grip: new T.Vector3(), gripGoal: new T.Vector3(), q: new T.Quaternion(), qGoal: new T.Quaternion(), handManual: false,
      fingers: 0.035, fingersGoal: 0.035, held: null, look: null, blink: 0 };
    const tasks = [];
    let say = '';
    const sayEl = stage.querySelector('.rb-say');
    function speak(t) { say = t; if (sayEl) { sayEl.textContent = t; sayEl.classList.toggle('show', !!t); } }

    function poseForCrouch(c) {
      pelvis.position.y = HIP - c;
      torso.rotation.x = c * 3.2;
      robot.position.set(R.x, 0, R.z); robot.rotation.y = R.yaw;
      robot.updateMatrixWorld(true);
    }
    // 손목이 target에 닿는 가장 얕은 쪼그림
    function crouchFor(grip, qHand) {
      const w = wristFromGrip(grip, qHand), keep = pelvis.position.y, keepT = torso.rotation.x;
      let c = 0;
      for (; c <= 0.18; c += 0.01) {
        poseForCrouch(c);
        armR.shoulder.getWorldPosition(_sw);
        if (_sw.distanceTo(w) < L1 + L2 - 0.012) break;
      }
      pelvis.position.y = keep; torso.rotation.x = keepT; robot.updateMatrixWorld(true);
      return Math.min(c, 0.18);
    }
    // 물건 앞(오른손 쪽)에 서는 자리
    const REACH_X = -0.1, REACH_Z = 0.26;
    function standFor(px, pz, yaw, reachZ) {
      const rz = reachZ || REACH_Z;
      const ox = Math.cos(yaw) * REACH_X + Math.sin(yaw) * rz, oz = -Math.sin(yaw) * REACH_X + Math.cos(yaw) * rz;
      return { x: px - ox, z: pz - oz, yaw };
    }
    const BOUND = { x0: -FX + 0.22, x1: FX - 0.2, z0: -FZ + 0.22, z1: FZ - 0.2 };
    const inBounds = p => ({ x: clamp(p.x, BOUND.x0, BOUND.x1), z: clamp(p.z, BOUND.z0, BOUND.z1) });

    function nearestToy() {
      let best = null, bd = 1e9;
      for (const t of toys) { if (t.held || t.inBin) continue; const d = Math.hypot(t.mesh.position.x - R.x, t.mesh.position.z - R.z); if (d < bd) { bd = d; best = t; } }
      return best;
    }
    function planPick(t) {
      const p = t.mesh.position;
      let yaw = Math.atan2(p.x - R.x, p.z - R.z);
      let st = standFor(p.x, p.z, yaw);
      const b = inBounds(st);
      if (b.x !== st.x || b.z !== st.z) {   // 벽에 붙은 물건: 벽 반대쪽에서 다가감
        yaw = Math.atan2(p.x - clamp(p.x, BOUND.x0 + 0.3, BOUND.x1 - 0.3), p.z - clamp(p.z, BOUND.z0 + 0.3, BOUND.z1 - 0.3)) || yaw;
        st = standFor(p.x, p.z, yaw);
      }
      if (t.inBin) { yaw = Math.PI; st = standFor(p.x, p.z, yaw, 0.3); }
      const s2 = inBounds(st);
      return [{ k: 'go', x: s2.x, z: s2.z }, { k: 'turn', yaw: Math.atan2(p.x - s2.x, p.z - s2.z) - Math.atan2(REACH_X, REACH_Z) * 0.9 }, { k: 'pick', toy: t }];
    }
    function planBin() {
      const st = standFor(BIN.x, BIN.z, Math.PI, 0.3);
      return [{ k: 'go', x: st.x, z: st.z }, { k: 'turn', yaw: Math.PI }, { k: 'place', bin: true }];
    }
    function cancel() { tasks.length = 0; resetPolicy(); }
    function command(list, text) { cancel(); tasks.push(...list); if (text) speak(text); }

    // ── 정책: Diffusion Policy(행동 묶음을 디노이징으로 계획 → 앞부분만 실행) vs MLP Policy(10Hz 한 스텝씩) ──
    const POL = { mode: 'diffusion' };
    const HZ = 10, DT_A = 1 / HZ, HORIZON = 16, EXEC = 8, K_STEPS = 10, DENOISE_T = 0.5;
    const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const viz = new T.Group(); scene.add(viz);
    const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.beginPath(); x.arc(32, 32, 28, 0, 7); x.fillStyle = '#fff'; x.fill(); return new T.CanvasTexture(c); })();
    function makeTrack(n, size, opacity) {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3));
      geo.setAttribute('color', new T.BufferAttribute(new Float32Array(n * 3), 3));
      const pts = new T.Points(geo, new T.PointsMaterial({ size, map: dotTex, vertexColors: true, transparent: true, opacity, alphaTest: 0.3, depthTest: false }));
      const line = new T.Line(geo, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: opacity * 0.8, depthTest: false }));
      const g = new T.Group(); g.add(line, pts); g.renderOrder = 10; pts.renderOrder = 11; line.renderOrder = 10;
      viz.add(g);
      return { g, geo, n };
    }
    const tracks = { cur: makeTrack(HORIZON + 1, 0.085, 1), next: makeTrack(HORIZON + 1, 0.07, 0.9), g1: makeTrack(HORIZON + 1, 0.05, 0.4), g2: makeTrack(HORIZON + 1, 0.05, 0.4), trail: makeTrack(40, 0.055, 0.9) };
    const arrow = new T.ArrowHelper(new T.Vector3(0, 0, 1), new T.Vector3(), 0.3, 0xe5484d, 0.07, 0.045);
    arrow.line.material.depthTest = false; arrow.cone.material.depthTest = false; arrow.renderOrder = 12; viz.add(arrow);
    viz.traverse(o => o.layers.set(1));
    cam.layers.enable(1);
    const C_EXEC = new T.Color(0x2f6fe4), C_TAIL = new T.Color(0xa9c3f2), C_DONE = new T.Color(0xd4dbe8), C_NOISE = new T.Color(0x9b7be0), C_TRAIL = new T.Color(0xe5484d);
    function drawTrack(tr, points, colorAt, first) {
      const pos = tr.geo.attributes.position, col = tr.geo.attributes.color;
      const list = first ? [first, ...points] : points;
      for (let i = 0; i < tr.n; i++) {
        const p = list[Math.min(i, list.length - 1)], c = colorAt(Math.min(i, list.length - 1), list.length);
        pos.setXYZ(i, p.x, p.y, p.z); col.setXYZ(i, c.r, c.g, c.b);
      }
      pos.needsUpdate = true; col.needsUpdate = true;
      tr.geo.setDrawRange(0, Math.min(tr.n, list.length));
      tr.g.visible = true;
    }
    const statusEl = stage.querySelector('.rb-policy-status');
    let status = '';
    function setStatus(t) { if (t !== status) { status = t; if (statusEl) statusEl.textContent = t; } }

    // 행동 묶음 (Diffusion Policy)
    // 매끈한 목표 궤적(clean)을 만들고, 시간적으로 이어진 노이즈를 더해 둔 뒤 K번에 걸쳐 노이즈를 줄여 보여 줌
    function smoothNoise(n, sigma, dims) {
      const out = []; let a = new T.Vector3();
      for (let i = 0; i < n; i++) {
        a = a.clone().multiplyScalar(0.6).add(new T.Vector3(gauss(), dims === 3 ? gauss() * 0.7 : 0, gauss()).multiplyScalar(sigma));
        out.push(a);
      }
      return out;
    }
    function hermite(p0, m0, p1, m1, t) {
      const t2 = t * t, t3 = t2 * t;
      return p0.clone().multiplyScalar(2 * t3 - 3 * t2 + 1).add(m0.clone().multiplyScalar(t3 - 2 * t2 + t)).add(p1.clone().multiplyScalar(-2 * t3 + 3 * t2)).add(m1.clone().multiplyScalar(t3 - t2));
    }
    function makeChunk(kind, from, goal, heading) {
      const stepLen = kind === 'base' ? 0.055 : 0.022;
      const dist = from.distanceTo(goal), total = Math.min(dist, stepLen * HORIZON);
      const end = from.clone().lerp(goal, dist > 1e-6 ? total / dist : 1);
      const d = end.clone().sub(from);
      let m0, m1;
      if (kind === 'base') { m0 = heading.clone().multiplyScalar(total * 1.3); m1 = d.clone().multiplyScalar(1.0); }
      else { const lift = new T.Vector3(0, total * 0.9, 0); m0 = d.clone().add(lift); m1 = d.clone().sub(lift); if (goal.y > from.y) { m0.sub(lift); m1.add(lift); } }
      const clean = [];
      for (let i = 1; i <= HORIZON; i++) clean.push(hermite(from, m0, end, m1, i / HORIZON));
      const sig = kind === 'base' ? 0.32 : 0.09, dims = kind === 'base' ? 2 : 3;
      return { kind, from: from.clone(), clean, eps: [smoothNoise(HORIZON, sig, dims), smoothNoise(HORIZON, sig, dims), smoothNoise(HORIZON, sig, dims)],
               t: 0, k: 0, s: 0, ready: false, final: total >= dist - 1e-4 };
    }
    function denoise(ch, dt) {
      if (ch.ready) return;
      ch.t += dt;
      ch.k = Math.min(K_STEPS, Math.floor(ch.t / (DENOISE_T / K_STEPS)));
      if (ch.k >= K_STEPS) ch.ready = true;
    }
    const noisy = (ch, j) => { const sg = Math.pow(1 - ch.k / K_STEPS, 1.5); return ch.clean.map((p, i) => p.clone().addScaledVector(ch.eps[j][i], sg)); };
    function chunkAt(ch, s) {   // s = 실행한 행동 수 (소수)
      const i = Math.floor(s), f = s - i;
      const a = i === 0 ? ch.from : ch.clean[Math.min(i - 1, HORIZON - 1)], b = ch.clean[Math.min(i, HORIZON - 1)];
      return a.clone().lerp(b, f);
    }
    function drawChunk(ch, tr, live) {
      if (!ch.ready) {
        drawTrack(tr, noisy(ch, 0), () => C_NOISE, ch.from);
        drawTrack(tracks.g1, noisy(ch, 1), () => C_NOISE, ch.from);
        drawTrack(tracks.g2, noisy(ch, 2), () => C_NOISE, ch.from);
        return;
      }
      const done = live ? ch.s : 0;
      drawTrack(tr, ch.clean, i => (i <= done ? C_DONE : i <= EXEC || (ch.final && ch.clean.length) ? C_EXEC : C_TAIL), ch.from);
    }
    // 실행 중인 묶음을 따라가고, 끝나기 4스텝 전에 다음 묶음을 미리 디노이징
    function runChunks(ctl, kind, dt, pos, goal, heading) {
      const label = kind === 'base' ? 'walking' : 'arm';
      if (!ctl.cur) ctl.cur = makeChunk(kind, pos, goal, heading());
      const cur = ctl.cur;
      if (!cur.ready) {
        denoise(cur, dt);
        drawChunk(cur, tracks.cur, false);
        setStatus(`Diffusion Policy · denoising ${label} action chunk ${cur.k}/${K_STEPS}`);
        return null;
      }
      const limit = cur.final ? HORIZON : EXEC;
      cur.s = Math.min(limit, cur.s + dt / DT_A);
      if (!cur.final && cur.s >= EXEC - 4 && !ctl.next) {
        const hand = cur.clean[EXEC - 1], prev = cur.clean[EXEC - 2];
        ctl.next = makeChunk(kind, hand, goal, hand.clone().sub(prev).setY(0).normalize());
      }
      if (ctl.next) { denoise(ctl.next, dt); drawChunk(ctl.next, tracks.next, false); }
      drawChunk(cur, tracks.cur, true);
      setStatus(ctl.next && !ctl.next.ready
        ? `Diffusion Policy · executing ${Math.ceil(cur.s)}/${limit} · denoising next chunk ${ctl.next.k}/${K_STEPS}`
        : `Diffusion Policy · executing action ${Math.ceil(cur.s)}/${limit} of chunk (horizon ${HORIZON})`);
      const target = chunkAt(cur, cur.s);
      if (cur.s >= limit) {
        if (cur.final) ctl.cur = null;
        else if (ctl.next && ctl.next.ready) { ctl.cur = ctl.next; ctl.next = null; }
        else { cur.s = limit; }
      }
      return target;
    }
    // MLP Policy: 매 틱마다 현재 관측으로 한 스텝 행동, 다음 틱까지 그대로 유지
    function trailPush(ctl, p) {
      ctl.trail.push(p.clone());
      if (ctl.trail.length > 40) ctl.trail.shift();
      drawTrack(tracks.trail, ctl.trail, (i, n) => C_TRAIL.clone().lerp(new T.Color(0xffffff), 1 - i / n * 0.9));
    }
    function showArrow(from, vec, scale) {
      const len = vec.length() * scale;
      if (len < 0.02) return;
      arrow.position.copy(from); arrow.setDirection(vec.clone().normalize()); arrow.setLength(len + 0.05, 0.06, 0.04); arrow.visible = true;
    }
    const baseCtl = { cur: null, next: null, tick: 0, act: { v: 0, w: 0 }, trail: [] };
    const armCtl = { cur: null, next: null, tick: 0, cmd: null, act: new T.Vector3(), trail: [] };
    function resetPolicy() {
      for (const c of [baseCtl, armCtl]) { c.cur = null; c.next = null; c.tick = 0; c.trail = []; }
      armCtl.cmd = null;
    }
    // 걷기: 목표 지점까지
    function baseStep(t, dt) {
      const goal = new T.Vector3(t.x, 0.03, t.z), pos = new T.Vector3(R.x, 0.03, R.z), dist = pos.distanceTo(goal);
      const heading = () => new T.Vector3(Math.sin(R.yaw), 0, Math.cos(R.yaw));
      if (POL.mode === 'diffusion') {
        if (dist < 0.03 && !baseCtl.cur) return true;
        const target = runChunks(baseCtl, 'base', dt, pos, goal, heading);
        if (target) {
          R.direct = target;
          const dir = target.clone().sub(pos);
          if (dir.length() > 0.004) R.yaw += angDiff(R.yaw, Math.atan2(dir.x, dir.z)) * Math.min(1, dt * 10);
        }
        return !baseCtl.cur && dist < 0.05;
      }
      if (dist < 0.04) { R.v = 0; R.w = 0; return true; }
      baseCtl.tick -= dt;
      if (baseCtl.tick <= 0) {
        baseCtl.tick += DT_A;
        const da = angDiff(R.yaw, Math.atan2(goal.x - pos.x, goal.z - pos.z));
        baseCtl.act.w = clamp(da * 3.5 + gauss() * 0.6, -2.8, 2.8);
        baseCtl.act.v = Math.max(0, (Math.abs(da) > 0.6 ? 0.04 : 0.55 * Math.min(1, dist / 0.3 + 0.2)) + gauss() * 0.08);
        trailPush(baseCtl, pos);
      }
      R.v = baseCtl.act.v; R.w = baseCtl.act.w;
      drawTrack(tracks.trail, baseCtl.trail.length ? baseCtl.trail : [pos], (i, n) => C_TRAIL.clone().lerp(new T.Color(0xffffff), 1 - i / n * 0.9));
      showArrow(pos, new T.Vector3(Math.sin(R.yaw + R.w * 0.25), 0, Math.cos(R.yaw + R.w * 0.25)).multiplyScalar(R.v), 1.3);
      setStatus(`MLP Policy · ${HZ} Hz · action = (v ${R.v.toFixed(2)} m/s, ω ${R.w.toFixed(2)} rad/s)`);
      return false;
    }
    // 팔: 집게 위치를 목표까지 (R.grip을 직접 움직임)
    function armStep(dt, goal) {
      if (POL.mode === 'diffusion') {
        if (R.grip.distanceTo(goal) < 0.004 && !armCtl.cur) { R.grip.copy(goal); return; }
        if (armCtl.goal && armCtl.goal.distanceTo(goal) > 0.01) { armCtl.cur = null; armCtl.next = null; }
        armCtl.goal = goal.clone();
        const target = runChunks(armCtl, 'arm', dt, R.grip, goal, () => new T.Vector3(0, 0, 1));
        if (target) R.grip.copy(target);
        return;
      }
      if (!armCtl.cmd) armCtl.cmd = R.grip.clone();
      armCtl.tick -= dt;
      if (armCtl.tick <= 0) {
        armCtl.tick += DT_A;
        const a = goal.clone().sub(armCtl.cmd), d = a.length();
        if (d > 0.03) a.multiplyScalar(0.03 / d);
        const n = Math.min(1, d / 0.05) * 0.005;
        a.add(new T.Vector3(gauss() * n, gauss() * n, gauss() * n));
        armCtl.act.copy(a); armCtl.cmd.add(a);
        trailPush(armCtl, R.grip);
      }
      R.grip.lerp(armCtl.cmd, Math.min(1, dt * 18));
      if (armCtl.trail.length) drawTrack(tracks.trail, armCtl.trail, (i, n) => C_TRAIL.clone().lerp(new T.Color(0xffffff), 1 - i / n * 0.9));
      showArrow(R.grip, armCtl.act, 5);
      setStatus(`MLP Policy · ${HZ} Hz · action = Δgripper (${(armCtl.act.length() * 100).toFixed(1)} cm)`);
    }
    stage.querySelectorAll('[data-policy]').forEach(btn => btn.addEventListener('click', () => {
      POL.mode = btn.dataset.policy;
      stage.querySelectorAll('[data-policy]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      resetPolicy();
      speak(POL.mode === 'diffusion' ? 'Diffusion Policy: I plan a 16-step chunk by denoising, then act.' : 'MLP Policy: one action every 0.1 s, no look-ahead.');
      stage.focus({ preventScroll: true });
    }));

    // ── 작업 실행 ──
    const qTop = () => yawQ(R.yaw);                      // 집게가 바닥을 향함
    const qCarry = () => yawQ(R.yaw, -0.55);
    function idleGrip(out) {
      const sw = Math.sin(R.phase) * 0.05 * R.amp;
      return local(-0.175, 0.255 - R.crouch * 0.6, 0.03 + sw, out);
    }
    function carryGrip(out) { return local(-0.08, 0.5 - R.crouch, 0.24, out); }
    function handReached(tol) { return gripPos().distanceTo(R.gripGoal) < (tol || 0.015) && R.grip.distanceTo(R.gripGoal) < (tol || 0.015); }

    function step(dt) {
      const t = tasks[0];
      R.handManual = false;
      if (!t) return;
      t.time = (t.time || 0) + dt;
      if (t.k === 'say') { speak(t.text); tasks.shift(); return; }
      if (t.k === 'go') {
        if (!t.started) { t.started = true; resetPolicy(); }
        if (baseStep(t, dt) || t.time > 30) { R.v = 0; R.w = 0; resetPolicy(); tasks.shift(); }
        return;
      }
      if (t.k === 'turn') {
        const da = angDiff(R.yaw, t.yaw);
        R.v = lerp(R.v, 0, Math.min(1, dt * 8));
        if (Math.abs(da) < 0.02 || t.time > 3) { R.w = 0; tasks.shift(); return; }
        R.w = clamp(da * 5, -2.4, 2.4);
        return;
      }
      if (t.k === 'wait') { if (t.time > t.t) tasks.shift(); return; }
      R.v = 0; R.w = 0;
      if (t.k === 'pick') {
        const toy = t.toy, p = toy.mesh.position;
        if (R.held || toy.held) { tasks.shift(); return; }
        if (!t.s) {
          const gy = toy.inBin ? p.y + toy.h * 0.1 : Math.max(toy.h * 0.55, 0.04);
          t.grip = new T.Vector3(p.x, gy, p.z);
          t.above = new T.Vector3(p.x, gy + 0.09, p.z);
          t.c = crouchFor(t.grip, qTop());
          t.s = 1; t.st = 0;
        }
        R.handManual = true; R.qGoal.copy(qTop()); R.look = p;
        t.st += dt;
        if (t.s === 1) { R.crouchGoal = t.c; R.gripGoal.copy(t.above); R.fingersGoal = 0.04; if ((handReached(0.02) && Math.abs(R.crouch - t.c) < 0.01) || t.st > 4) { t.s = 2; t.st = 0; } }
        else if (t.s === 2) { R.gripGoal.copy(t.grip); if (handReached(0.008) || t.st > 3) { t.s = 3; t.st = 0; } }
        else if (t.s === 3) {
          R.fingersGoal = toy.w + 0.006;
          if (t.st > 0.35) {
            if (gripPos().distanceTo(p) > 0.09) { speak("Hmm, I can't reach that one."); R.fingersGoal = 0.035; tasks.shift(); R.look = null; return; }
            armR.wrist.attach(toy.mesh); toy.held = true; toy.inBin = false; R.held = toy;
            t.s = 4; t.st = 0;
          }
        } else if (t.s === 4) { R.gripGoal.copy(t.above).y += 0.1; if (handReached(0.03) || t.st > 2.5) { tasks.shift(); R.look = null; R.crouchGoal = 0; speak(['Got it!', 'Nice, picked it up.', 'This one is mine now.'][toy.id % 3]); } }
        return;
      }
      if (t.k === 'place') {
        const toy = R.held;
        if (!toy) { tasks.shift(); return; }
        if (!t.s) {
          if (t.bin) {
            t.grip = new T.Vector3(BIN.x, BIN.h + toy.h * 0.55 + 0.04, BIN.z);
          } else {
            t.grip = local(REACH_X, toy.h * 0.55 + 0.004, REACH_Z);
          }
          t.above = t.grip.clone(); t.above.y += 0.08;
          t.c = crouchFor(t.grip, qTop());
          t.s = 1; t.st = 0;
        }
        R.handManual = true; R.qGoal.copy(qTop()); R.look = t.grip;
        t.st += dt;
        if (t.s === 1) { R.crouchGoal = t.c; R.gripGoal.copy(t.above); if ((handReached(0.02) && Math.abs(R.crouch - t.c) < 0.01) || t.st > 4) { t.s = 2; t.st = 0; } }
        else if (t.s === 2) { R.gripGoal.copy(t.grip); if (handReached(0.008) || t.st > 3) { t.s = 3; t.st = 0; } }
        else if (t.s === 3) {
          R.fingersGoal = 0.04;
          if (t.st > 0.25) {
            scene.attach(toy.mesh); toy.held = false; R.held = null; toy.vy = 0;
            const pos = toy.mesh.position;
            if (t.bin && Math.abs(pos.x - BIN.x) < BIN.hw && Math.abs(pos.z - BIN.z) < BIN.hd) {
              toy.inBin = true;
              const n = toys.filter(o => o !== toy && o.inBin).length;
              pos.x = clamp(pos.x, BIN.x - BIN.hw + toy.w + 0.02, BIN.x + BIN.hw - toy.w - 0.02);
              pos.z = clamp(pos.z, BIN.z - BIN.hd + toy.w + 0.02, BIN.z + BIN.hd - toy.w - 0.02);
              toy.rest = 0.02 + toy.h / 2 + n * 0.035;
            } else toy.rest = toy.h / 2;
            t.s = 4; t.st = 0;
          }
        } else if (t.s === 4) {
          R.gripGoal.copy(t.above);
          if (t.st > 0.4) {
            tasks.shift(); R.look = null; R.crouchGoal = 0;
            const left = toys.filter(o => !o.inBin).length;
            if (t.bin) speak(left ? `In the basket! ${left} left.` : 'All tidy! ✨');
            else speak('Put it down.');
          }
        }
        return;
      }
      if (t.k === 'tidy') {
        tasks.shift();
        if (R.held) { tasks.unshift(...planBin(), { k: 'tidy' }); return; }
        const n = nearestToy();
        if (!n) { speak('All tidy! ✨'); return; }
        tasks.unshift(...planPick(n), ...planBin(), { k: 'tidy' });
      }
    }

    // ── 입력 ──
    const keys = new Set();
    stage.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault(); keys.add(k);
        if (tasks.length && !['pick', 'place'].includes(tasks[0].k)) { cancel(); }
      } else if (k === ' ') { e.preventDefault(); if (!e.repeat) spaceAction(); }
    });
    stage.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
    stage.addEventListener('blur', () => keys.clear());
    function spaceAction() {
      if (tasks.length && ['pick', 'place'].includes(tasks[0].k)) return;
      if (R.held) {
        if (Math.hypot(R.x - BIN.x, R.z - BIN.z) < 0.9) command(planBin(), 'Into the basket.');
        else command([{ k: 'place' }]);
      } else {
        const n = nearestToy();
        if (!n) return speak('Nothing left on the floor.');
        command(planPick(n), 'Going for the closest one.');
      }
    }

    let camAz = 0.5, camEl = 0.82, camDist = 9.2, down = null;
    const camTarget = new T.Vector3(0.3, 0, 0.4);
    canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, az: camAz, el: camEl, moved: false }; stage.focus({ preventScroll: true }); });
    window.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.moved && Math.hypot(dx, dy) > 5) down.moved = true;
      if (down.moved) { camAz = down.az - dx * 0.006; camEl = clamp(down.el + dy * 0.004, 0.18, 1.25); }
    });
    window.addEventListener('pointerup', e => { if (down && !down.moved && e.target === canvas) click(e); down = null; });
    canvas.addEventListener('pointercancel', () => { down = null; });
    const ray = new T.Raycaster(), ndc = new T.Vector2();
    const insets = [...stage.querySelectorAll('.rb-inset')];
    function click(e) {
      const r = canvas.getBoundingClientRect();
      if (insets.some(el => { const b = el.getBoundingClientRect(); return e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom; })) return;
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      const hits = ray.intersectObjects([...toys.map(t => t.mesh), bin, floor], true);
      if (!hits.length) return;
      let o = hits[0].object;
      while (o && !o.userData.toy && o !== bin && o !== floor) o = o.parent;
      if (o && o.userData.toy) {
        const toy = o.userData.toy;
        if (toy.held) return;
        if (R.held) return speak('My hand is full. Click the basket or press Put down.');
        return command(planPick(toy), 'On my way!');
      }
      if (o === bin) {
        if (R.held) return command(planBin(), 'To the basket.');
        return speak('That is the toy basket.');
      }
      const p = hits[0].point, b = inBounds(p);
      command([{ k: 'go', x: b.x, z: b.z }], '');
    }
    stage.querySelectorAll('[data-rb]').forEach(btn => btn.addEventListener('click', () => {
      const a = btn.dataset.rb;
      stage.focus({ preventScroll: true });
      if (a === 'pick') { if (R.held) return speak('Already holding something.'); const n = nearestToy(); return n ? command(planPick(n), 'Going for the closest one.') : speak('Nothing left on the floor.'); }
      if (a === 'drop') { if (!R.held) return speak('My hand is empty.'); return command([{ k: 'place' }]); }
      if (a === 'tidy') return command([{ k: 'tidy' }], "Let's tidy up!");
      if (a === 'reset') { cancel(); if (R.held) { R.held = null; } resetToys(); Object.assign(R, { x: -0.3, z: 0.2, yaw: 0.6, v: 0, w: 0, crouchGoal: 0 }); R.fingersGoal = 0.035; speak('Fresh start.'); }
    }));

    // ── 매 프레임 ──
    function update(dt) {
      viz.children.forEach(o => { o.visible = false; });
      R.direct = null;
      step(dt);
      if (!tasks.length || !['go', 'pick', 'place'].includes(tasks[0].k)) setStatus(POL.mode === 'diffusion' ? 'Diffusion Policy · idle' : 'MLP Policy · idle');
      // 직접 운전
      if (keys.size) {
        const f = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
        const tr = (keys.has('a') || keys.has('arrowleft') ? 1 : 0) - (keys.has('d') || keys.has('arrowright') ? 1 : 0);
        R.v = lerp(R.v, f > 0 ? 0.5 : f < 0 ? -0.25 : 0, Math.min(1, dt * 6));
        R.w = tr * 2.2;
      } else if (!tasks.length) { R.v = lerp(R.v, 0, Math.min(1, dt * 6)); R.w = 0; }
      let nx, nz;
      if (R.direct) { nx = R.direct.x; nz = R.direct.z; R.v = 0; R.w = 0; }
      else { R.yaw += R.w * dt; nx = R.x + Math.sin(R.yaw) * R.v * dt; nz = R.z + Math.cos(R.yaw) * R.v * dt; }
      // 벽·바구니에 막힘
      nx = clamp(nx, BOUND.x0, BOUND.x1); nz = clamp(nz, BOUND.z0, BOUND.z1);
      const rr = 0.13, ex = BIN.hw + rr, ez = BIN.hd + rr, bx = nx - BIN.x, bz = nz - BIN.z;
      if (Math.abs(bx) < ex && Math.abs(bz) < ez) {
        if (ex - Math.abs(bx) < ez - Math.abs(bz)) nx = BIN.x + Math.sign(bx || 1) * ex; else nz = BIN.z + Math.sign(bz || 1) * ez;
      }
      const moved = Math.hypot(nx - R.x, nz - R.z);
      R.x = nx; R.z = nz;
      // 걸음
      const walking = moved > 1e-4 || Math.abs(R.w) > 0.2 || (tasks[0] && tasks[0].k === 'turn');
      R.amp = lerp(R.amp, walking ? 1 : 0, Math.min(1, dt * 6));
      R.phase += walking ? (moved / 0.15) * Math.PI + (moved < 1e-4 ? Math.max(Math.abs(R.w), 1.5) * dt * 3 : 0) : 0;
      if (!walking && R.amp < 0.05) R.phase = lerp(R.phase, Math.round(R.phase / Math.PI) * Math.PI, Math.min(1, dt * 4));
      // 장난감 밀어내기
      for (const t of toys) {
        if (t.held || t.inBin) continue;
        const p = t.mesh.position, dx = p.x - R.x, dz = p.z - R.z, d = Math.hypot(dx, dz), min = 0.1 + t.w;
        if (d < min && d > 1e-4 && !(tasks[0] && tasks[0].toy === t)) { p.x = R.x + dx / d * min; p.z = R.z + dz / d * min; }
      }
      // 떨어지는 장난감
      for (const t of toys) {
        if (t.held) continue;
        const p = t.mesh.position;
        if (p.y > t.rest + 1e-4) { t.vy -= 9.8 * dt; p.y = Math.max(t.rest, p.y + t.vy * dt); if (p.y === t.rest) t.vy = 0; }
        else p.y = t.rest;
        const e = t.mesh.rotation; e.x = lerp(e.x, 0, Math.min(1, dt * 10)); e.z = lerp(e.z, 0, Math.min(1, dt * 10));
      }

      // 몸
      R.crouch = lerp(R.crouch, R.crouchGoal, Math.min(1, dt * 4));
      const bob = Math.abs(Math.sin(R.phase)) * 0.012 * R.amp;
      pelvis.position.y = HIP - R.crouch - bob + 0.006 * R.amp;
      pelvis.rotation.z = Math.sin(R.phase) * 0.05 * R.amp;
      torso.rotation.x = R.crouch * 3.2 + 0.05 * R.amp;
      torso.rotation.z = -pelvis.rotation.z * 0.6;
      robot.position.set(R.x, 0, R.z); robot.rotation.y = R.yaw;
      for (const leg of legs) {
        const ph = R.phase + (leg.s > 0 ? 0 : Math.PI);
        const fz = Math.sin(ph) * 0.075 * R.amp + R.crouch * 0.3;
        const lift = Math.max(0, Math.cos(ph)) * 0.05 * R.amp;
        solveLeg(leg, fz, lift);
      }
      // 왼팔: 걸을 때 흔들기
      armL.shoulder.rotation.set(-Math.sin(R.phase) * 0.45 * R.amp + R.crouch * 1.5, 0, 0.12);
      armL.elbow.rotation.x = -0.35 - R.crouch * 2;
      armL.wrist.rotation.set(0, 0, 0);
      // 오른팔
      if (!R.handManual) {
        if (R.held) { carryGrip(R.gripGoal); R.qGoal.copy(qCarry()); }
        else { idleGrip(R.gripGoal); R.qGoal.copy(qTop()); }
      }
      if (!R.inited) { R.grip.copy(R.gripGoal); R.q.copy(R.qGoal); R.inited = true; }
      if (R.handManual) armStep(dt, R.gripGoal);
      else { R.grip.lerp(R.gripGoal, Math.min(1, dt * 10)); armCtl.cur = armCtl.next = armCtl.cmd = null; armCtl.trail = []; }
      R.q.slerp(R.qGoal, Math.min(1, dt * (R.handManual ? 5 : 10)));
      robot.updateMatrixWorld(true);
      solveArm(armR, wristFromGrip(R.grip, R.q), R.q);
      R.fingers = lerp(R.fingers, R.fingersGoal, Math.min(1, dt * 10));
      armR.fingers.forEach((f, i) => { f.position.x = (i ? 1 : -1) * R.fingers; });
      armL.fingers.forEach((f, i) => { f.position.x = (i ? 1 : -1) * 0.03; });
      // 고개
      let hy = 0, hp = 0.12;
      if (R.look) {
        robot.updateMatrixWorld(true);
        const lp = robot.worldToLocal(R.look.clone()), hpos = new T.Vector3(0, pelvis.position.y + 0.45, 0);
        const d = lp.sub(hpos);
        hy = clamp(Math.atan2(d.x, d.z), -0.9, 0.9);
        hp = clamp(Math.atan2(-d.y, Math.hypot(d.x, d.z)) - torso.rotation.x, -0.3, 0.9);
      } else if (R.w) hy = clamp(R.w * 0.15, -0.4, 0.4);
      neck.rotation.y = lerp(neck.rotation.y, hy, Math.min(1, dt * 6));
      head.rotation.x = lerp(head.rotation.x, hp, Math.min(1, dt * 6));
      // 눈 깜빡임
      R.blink -= dt;
      if (R.blink < -0.12) R.blink = 2 + Math.random() * 3;
      const sy = R.blink < 0 ? 0.15 : 1.35;
      eyes.forEach(e => { e.scale.y = sy; });
      bulb.material.emissive = bulb.material.emissive || new T.Color();
      bulb.material.emissive.setHex(tasks.length ? 0x2a4fa0 : 0x000000);
    }

    // ── 그리기 ──
    let W = 0, H = 0;
    function resize() {
      const r = stage.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      renderer.setSize(W, H, false);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      cam.aspect = W / H; cam.fov = W < 560 ? 50 : 32; cam.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(stage);
    resize();
    function render() {
      cam.position.set(camTarget.x + camDist * Math.cos(camEl) * Math.sin(camAz), camTarget.y + camDist * Math.sin(camEl), camTarget.z + camDist * Math.cos(camEl) * Math.cos(camAz));
      cam.lookAt(camTarget);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, W, H);
      renderer.setClearColor(0x000000, 0); renderer.clear();
      renderer.render(scene, cam);
      const sr = stage.getBoundingClientRect();
      renderer.setScissorTest(true);
      insets.forEach((el, i) => {
        const b = el.getBoundingClientRect();
        const x = Math.round(b.left - sr.left), y = Math.round(sr.bottom - b.bottom), w = Math.round(b.width), h = Math.round(b.height);
        if (w < 4 || h < 4) return;
        const c = i === 0 ? headCam : wristCam;
        c.aspect = w / h; c.updateProjectionMatrix();
        renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h);
        renderer.setClearColor(0xe9edf3, 1); renderer.clear();
        renderer.render(scene, c);
      });
    }

    resetToys();
    speak('Hi! Click a toy and I will pick it up.');
    let last = performance.now();
    function loop(now) {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!running || document.hidden) return;
      update(dt);
      render();
    }
    requestAnimationFrame(loop);
    stage.classList.add('ready');
    // 테스트·디버그용
    window.RobotLab = { POL, get status() { return status; }, R, toys, tasks, command, planPick, planBin, nearestToy, gripPos, solveArm, armR, wristFromGrip, update, render, speak, get say() { return say; } };
  }
})();
