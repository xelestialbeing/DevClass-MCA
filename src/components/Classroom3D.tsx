import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './Classroom3D.css';

export interface StudentVote {
  seatNumber: number;
  userId: string;
  username: string;
  avatar: string;
  catchphrase?: string;
}

interface Classroom3DProps {
  mySeat: number | null;
  onSeatSelect: (seatNumber: number) => void;
  onRandomSeat?: () => void;
  onClearSeat?: () => void;
  votes: StudentVote[];
  currentUser?: {
    username: string;
    avatar?: string;
    avatarUrl?: string;
    catchphrase?: string;
    isApproved?: boolean;
    faceScanStatus?: 'pending' | 'verified' | 'rejected';
  } | null;
  boardAnnouncement?: string;
  onPendingNotice?: () => void;
}

type CameraPreset = 'overview' | 'podium' | 'myseat';

interface FanUnit {
  head: THREE.Group;
  rotor: THREE.Group;
  baseAngle: number;
  phase: number;
}

// Harmonious Chromatic Palette mapping seats to collegiate color zones
const getSeatRowColor = (seatNum: number): number => {
  if (seatNum <= 5) return 0x0284c7;  // Row 0 Left: Electric Azure
  if (seatNum <= 10) return 0x059669; // Row 1 Left: Emerald Jade
  if (seatNum <= 15) return 0xab312c; // Row 2 Left: Collegiate Crimson
  if (seatNum <= 20) return 0xea580c; // Row 3 Left: Sunset Tangerine
  if (seatNum <= 25) return 0x4f46e5; // Row 4 Left: Royal Indigo
  if (seatNum <= 29) return 0x0284c7; // Row 0 Right: Electric Azure
  if (seatNum <= 33) return 0x059669; // Row 1 Right: Emerald Jade
  if (seatNum <= 37) return 0xab312c; // Row 2 Right: Collegiate Crimson
  if (seatNum <= 41) return 0xea580c; // Row 3 Right: Sunset Tangerine
  if (seatNum <= 45) return 0x4f46e5; // Row 4 Right: Royal Indigo
  return 0x7c3aed;                    // Seat 46 Back Aisle: Amethyst Purple
};

// Bounding box: camera is kept within reasonable exploration bounds
const ROOM_BOUNDS = {
  minX: -8.8,
  maxX: 7.8,
  minY: 0.6,
  maxY: 16.0, // Allows elevated overview on both mobile portrait and desktop
  minZ: -9.5,
  maxZ: 15.0, // Allows comfortable zoom on mobile without wall occlusion
};

export const Classroom3D: React.FC<Classroom3DProps> = ({
  mySeat,
  onSeatSelect,
  onRandomSeat,
  onClearSeat,
  votes,
  currentUser,
  boardAnnouncement = 'CLASSROOM S01 - WELCOME',
  onPendingNotice,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredSeat, setHoveredSeat] = useState<number | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPreset>('overview');
  const [showSeatPickerModal, setShowSeatPickerModal] = useState(false);

  // References to Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const deskMeshesRef = useRef<Map<number, { group: THREE.Group; tablet: THREE.Mesh; seat: THREE.Mesh }>>(new Map());
  const fanUnitsRef = useRef<FanUnit[]>([]);
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);
  const smartBoardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const smartBoardTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const backWallRef = useRef<THREE.Mesh | null>(null);

  // 1. Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // SCENE: Bright, Warm Collegiate Daylit Hall
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdde8f2); // Bright morning collegiate sky
    scene.fog = new THREE.FogExp2(0xdde8f2, 0.007); // Gentle airy daylight haze
    sceneRef.current = scene;

    // CAMERA (Calibrated to natural elevated auditorium perspective matching reference photo)
    const isMobilePortrait = width < 768 && height > width;
    const camera = new THREE.PerspectiveCamera(isMobilePortrait ? 60 : 46, width / height, 0.25, 60);
    if (isMobilePortrait) {
      camera.position.set(-0.65, 9.2, 5.2);
    } else {
      camera.position.set(-0.65, 7.2, 3.4);
    }
    cameraRef.current = camera;

    // RENDERER (logarithmicDepthBuffer eliminates all micro-flickering)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // CONTROLS (Pivots right around center of student seating area)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // Never dip under the floor
    controls.minPolarAngle = 0.08;              // Never flip over the ceiling
    controls.minDistance = 0.2;
    controls.maxDistance = 18;
    controls.target.set(-0.65, 0.6, -2.4);
    controlsRef.current = controls;

    // -------------------------------------------------------------
    // LIGHTING: LUMINOUS DAYLIGHT & SUNBEAM ILLUMINATION
    // -------------------------------------------------------------
    // Bright warm interior ambient base fill
    const ambientLight = new THREE.AmbientLight(0xfffbf2, 1.15);
    scene.add(ambientLight);

    // Warm Golden Sunlight streaming through the right windows
    const sunLight = new THREE.DirectionalLight(0xfff5dd, 1.6);
    sunLight.position.set(9.5, 13, 2.5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 30;
    sunLight.shadow.camera.left = -11;
    sunLight.shadow.camera.right = 11;
    sunLight.shadow.camera.top = 11;
    sunLight.shadow.camera.bottom = -11;
    sunLight.shadow.bias = -0.00004;
    sunLight.shadow.normalBias = 0.038;
    scene.add(sunLight);

    // Soft Blue Skylight Fill from window bank
    const skyFillLight = new THREE.DirectionalLight(0xbfe0f7, 0.65);
    skyFillLight.position.set(-8, 9, 5);
    scene.add(skyFillLight);

    // Warm Ceiling Downlights (soft warm glow pools over desks)
    const downlightAisleLeft = new THREE.PointLight(0xfef08a, 0.65, 10);
    downlightAisleLeft.position.set(-3.5, 5.2, -2.0);
    scene.add(downlightAisleLeft);

    const downlightAisleRight = new THREE.PointLight(0x7dd3fc, 0.55, 10);
    downlightAisleRight.position.set(2.6, 5.2, -2.0);
    scene.add(downlightAisleRight);

    // -------------------------------------------------------------
    // FLOOR: WARM SCANDINAVIAN HONEY OAK PARQUET HARDWOOD
    // -------------------------------------------------------------
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 1024;
    floorCanvas.height = 1024;
    const fctx = floorCanvas.getContext('2d')!;

    // Warm natural golden oak base tone
    fctx.fillStyle = '#caa16a';
    fctx.fillRect(0, 0, 1024, 1024);

    // Render horizontal and vertical parquet plank blocks
    const plankColors = ['#d8a76d', '#cb9657', '#e1b179', '#c48f51', '#deb077'];
    const blockSize = 128;
    for (let by = 0; by < 1024; by += blockSize) {
      for (let bx = 0; bx < 1024; bx += blockSize) {
        const isHorizontal = ((bx / blockSize) + (by / blockSize)) % 2 === 0;
        const plankCount = 4;
        const plankThick = blockSize / plankCount;

        for (let p = 0; p < plankCount; p++) {
          const colorIdx = (Math.floor(bx / 32) + Math.floor(by / 32) + p) % plankColors.length;
          fctx.fillStyle = plankColors[colorIdx];

          if (isHorizontal) {
            fctx.fillRect(bx + 1, by + p * plankThick + 1, blockSize - 2, plankThick - 2);
            // Wood grain texture streaks
            fctx.fillStyle = 'rgba(120, 68, 20, 0.08)';
            fctx.fillRect(bx + 10, by + p * plankThick + 8, blockSize - 20, 3);
          } else {
            fctx.fillRect(bx + p * plankThick + 1, by + 1, plankThick - 2, blockSize - 2);
            // Wood grain texture streaks
            fctx.fillStyle = 'rgba(120, 68, 20, 0.08)';
            fctx.fillRect(bx + p * plankThick + 8, by + 10, 3, blockSize - 20);
          }
        }

        // Parquet border joint seam
        fctx.strokeStyle = '#855627';
        fctx.lineWidth = 2;
        fctx.strokeRect(bx, by, blockSize, blockSize);
      }
    }

    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(6, 5);

    const floorGeo = new THREE.PlaneGeometry(16.0, 14.0);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.32, // Elegant satin sheen reflecting sunbeams and chair colors
      metalness: 0.04,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(-0.65, 0, -2.35);
    floor.receiveShadow = true;
    scene.add(floor);

    // -------------------------------------------------------------
    // WALLS: BRIGHT, AIRY ARCHITECTURAL IVORY & HONEY CEDAR SLATS
    // -------------------------------------------------------------
    // Bright, light-reflecting collegiate architectural ivory
    const brightWallMat = new THREE.MeshStandardMaterial({ color: 0xf5f3eb, roughness: 0.85 });
    // Front Feature Accent Wall
    const frontWallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
    const skirtingMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.5 }); // Dark Walnut baseboard
    const brassTrimMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.22 });

    // Procedural Honey Cedar Slat Texture for Front Wall Acoustic Panel
    const slatCanvas = document.createElement('canvas');
    slatCanvas.width = 512;
    slatCanvas.height = 128;
    const sctx = slatCanvas.getContext('2d')!;
    sctx.fillStyle = '#0f172a'; // Dark acoustic felt backing
    sctx.fillRect(0, 0, 512, 128);
    for (let x = 0; x < 512; x += 16) {
      sctx.fillStyle = x % 32 === 0 ? '#c2782b' : '#df9643';
      sctx.fillRect(x + 2, 0, 12, 128);
    }
    const slatTexture = new THREE.CanvasTexture(slatCanvas);
    slatTexture.wrapS = THREE.RepeatWrapping;
    slatTexture.wrapT = THREE.RepeatWrapping;
    slatTexture.repeat.set(16, 1);

    const acousticMat = new THREE.MeshStandardMaterial({
      map: slatTexture,
      roughness: 0.52,
      metalness: 0.06,
    });

    // Front Wall (z = -9.3)
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(16.0, 6.2, 0.2), frontWallMat);
    frontWall.position.set(-0.65, 3.1, -9.3);
    frontWall.receiveShadow = true;
    scene.add(frontWall);

    // Front Wall Cedar Acoustic Slat Panel
    const frontAcoustic = new THREE.Mesh(new THREE.BoxGeometry(15.9, 1.9, 0.04), acousticMat);
    frontAcoustic.position.set(-0.65, 5.2, -9.18);
    scene.add(frontAcoustic);

    // Brass Architectural Reveal Strip under Acoustic Panel
    const brassReveal = new THREE.Mesh(new THREE.BoxGeometry(15.9, 0.04, 0.05), brassTrimMat);
    brassReveal.position.set(-0.65, 4.23, -9.17);
    scene.add(brassReveal);

    const skirtFront = new THREE.Mesh(new THREE.BoxGeometry(15.9, 0.15, 0.04), skirtingMat);
    skirtFront.position.set(-0.65, 0.075, -9.18);
    scene.add(skirtFront);

    // Left Wall (x = -8.65) - Bright, airy collegiate ivory
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 6.2, 14.0), brightWallMat);
    leftWall.position.set(-8.65, 3.1, -2.35);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const skirtLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 13.9), skirtingMat);
    skirtLeft.position.set(-8.53, 0.075, -2.35);
    scene.add(skirtLeft);

    // -------------------------------------------------------------
    // RIGHT WALL: ARCHITECTURAL PIERS WITH GENEROUS WINDOW OPENINGS & ENTRANCE
    // -------------------------------------------------------------
    // Lower sill wall underneath windows (y: 0 to 1.2m, spans from Window 1 to back wall)
    const rightWallSill = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 11.25), brightWallMat);
    rightWallSill.position.set(7.35, 0.6, -0.975);
    rightWallSill.receiveShadow = true;
    scene.add(rightWallSill);

    // Upper lintel wall above all windows (y: 5.4 to 6.2m)
    const rightWallLintel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 14.0), brightWallMat);
    rightWallLintel.position.set(7.35, 5.8, -2.35);
    rightWallLintel.receiveShadow = true;
    scene.add(rightWallLintel);

    // Solid structural pier: Front corner to Window 1 (Full-height wall housing the entrance door)
    const pierFront = new THREE.Mesh(new THREE.BoxGeometry(0.2, 6.2, 2.7), brightWallMat);
    pierFront.position.set(7.35, 3.1, -7.95);
    pierFront.receiveShadow = true;
    scene.add(pierFront);

    // Solid structural pier: Between Window 1 and Window 2 (Mount for Fan 1)
    const pierMid1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 2.0), brightWallMat);
    pierMid1.position.set(7.35, 3.3, -3.2);
    pierMid1.receiveShadow = true;
    scene.add(pierMid1);

    // Solid structural pier: Between Window 2 and Window 3 (Mount for Fan 2)
    const pierMid2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 2.0), brightWallMat);
    pierMid2.position.set(7.35, 3.3, 0.8);
    pierMid2.receiveShadow = true;
    scene.add(pierMid2);

    // Solid structural pier: Rear corner behind Window 3
    const pierBack = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 0.9), brightWallMat);
    pierBack.position.set(7.35, 3.3, 4.2);
    pierBack.receiveShadow = true;
    scene.add(pierBack);

    const skirtRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 11.25), skirtingMat);
    skirtRight.position.set(7.23, 0.075, -0.975);
    scene.add(skirtRight);

    // Back Wall (z = 4.65) - Bright, airy collegiate ivory
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(16.0, 6.2, 0.2), brightWallMat);
    backWall.position.set(-0.65, 3.1, 4.65);
    backWall.receiveShadow = true;
    scene.add(backWall);
    backWallRef.current = backWall;

    // -------------------------------------------------------------
    // SMART BOARD (Center of Front Wall with Dynamic Screen)
    // -------------------------------------------------------------
    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = 1024;
    boardCanvas.height = 576;
    smartBoardCanvasRef.current = boardCanvas;
    const boardTexture = new THREE.CanvasTexture(boardCanvas);
    smartBoardTextureRef.current = boardTexture;

    const drawSmartBoard = (text: string) => {
      const bctx = boardCanvas.getContext('2d')!;
      
      // Cyber Gradient Dark Background
      const bgGrad = bctx.createLinearGradient(0, 0, 1024, 576);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#0b1528');
      bgGrad.addColorStop(1, '#081a24');
      bctx.fillStyle = bgGrad;
      bctx.fillRect(0, 0, 1024, 576);

      // Cyber Grid Backdrop
      bctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      bctx.lineWidth = 1;
      for (let x = 40; x < 1024; x += 48) {
        bctx.beginPath();
        bctx.moveTo(x, 0);
        bctx.lineTo(x, 576);
        bctx.stroke();
      }
      for (let y = 40; y < 576; y += 48) {
        bctx.beginPath();
        bctx.moveTo(0, y);
        bctx.lineTo(1024, y);
        bctx.stroke();
      }

      // Glowing Neon Multi-Spectrum Outer Border
      const borderGrad = bctx.createLinearGradient(0, 0, 1024, 0);
      borderGrad.addColorStop(0, '#06b6d4');
      borderGrad.addColorStop(0.5, '#a855f7');
      borderGrad.addColorStop(1, '#10b981');
      bctx.strokeStyle = borderGrad;
      bctx.lineWidth = 4;
      bctx.strokeRect(18, 18, 988, 540);

      // Top Status Pill
      bctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      bctx.beginPath();
      bctx.roundRect(312, 28, 400, 36, 18);
      bctx.fill();
      bctx.strokeStyle = '#06b6d4';
      bctx.lineWidth = 1.5;
      bctx.stroke();

      bctx.fillStyle = '#10b981';
      bctx.beginPath();
      bctx.arc(334, 46, 5, 0, Math.PI * 2);
      bctx.fill();

      bctx.fillStyle = '#e2e8f0';
      bctx.font = 'bold 15px monospace';
      bctx.textAlign = 'center';
      bctx.fillText('DEVCLASS MCA // ADVANCED COMPUTING & SOFTWARE ARCHITECTURE', 520, 52);

      // Main Announcement Banner
      bctx.fillStyle = '#f8fafc';
      bctx.font = 'bold 38px monospace';
      bctx.fillText(text, 512, 135);

      bctx.fillStyle = '#38bdf8';
      bctx.font = '16px monospace';
      bctx.fillText('COLLEGIATE ATTENDANCE & SPATIAL PARTICIPATION PROTOCOL', 512, 172);

      // Live Presence Metric Card
      bctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      bctx.beginPath();
      bctx.roundRect(240, 210, 544, 150, 16);
      bctx.fill();
      bctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      bctx.lineWidth = 2;
      bctx.stroke();

      const count = votes.length + (mySeat !== null ? 1 : 0);
      bctx.fillStyle = '#34d399';
      bctx.font = 'bold 46px monospace';
      bctx.fillText(`${count} / 46 PRESENT`, 512, 270);

      // Multi-stop Colorful Progress Bar
      const pWidth = 440;
      const pHeight = 16;
      const px = 292;
      const py = 290;
      bctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      bctx.beginPath();
      bctx.roundRect(px, py, pWidth, pHeight, 8);
      bctx.fill();

      const fillW = Math.max(12, Math.min(pWidth, (count / 46) * pWidth));
      const progGrad = bctx.createLinearGradient(px, 0, px + pWidth, 0);
      progGrad.addColorStop(0, '#06b6d4');
      progGrad.addColorStop(0.5, '#10b981');
      progGrad.addColorStop(1, '#f59e0b');
      bctx.fillStyle = progGrad;
      bctx.beginPath();
      bctx.roundRect(px, py, fillW, pHeight, 8);
      bctx.fill();

      bctx.fillStyle = '#94a3b8';
      bctx.font = '14px monospace';
      bctx.fillText('CUTOFF: 08:00 AM • REAL-TIME HARDWARE SYNC', 512, 335);

      // Real-time telemetry badges below card
      bctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
      bctx.beginPath();
      bctx.roundRect(140, 395, 210, 44, 10);
      bctx.fill();
      bctx.strokeStyle = '#06b6d4';
      bctx.stroke();
      bctx.fillStyle = '#38bdf8';
      bctx.font = 'bold 14px monospace';
      bctx.fillText('NEXT: NEURAL ARCH', 245, 422);

      bctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
      bctx.beginPath();
      bctx.roundRect(407, 395, 210, 44, 10);
      bctx.fill();
      bctx.strokeStyle = '#a855f7';
      bctx.stroke();
      bctx.fillStyle = '#c084fc';
      bctx.fillText('SESSION: OPTIMAL', 512, 422);

      bctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      bctx.beginPath();
      bctx.roundRect(674, 395, 210, 44, 10);
      bctx.fill();
      bctx.strokeStyle = '#10b981';
      bctx.stroke();
      bctx.fillStyle = '#34d399';
      bctx.fillText('SECURITY: ENCRYPTED', 779, 422);

      // Bottom instruction
      bctx.fillStyle = '#f8fafc';
      bctx.font = 'bold 18px monospace';
      bctx.fillText('CLICK ANY SEAT IN 3D TO CLAIM OR RELEASE', 512, 515);

      boardTexture.needsUpdate = true;
    };
    drawSmartBoard(boardAnnouncement);

    // Smart Board Frame (Sleek Obsidian & Polished Titanium Trim)
    const frameGeo = new THREE.BoxGeometry(5.2, 2.9, 0.08);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.18, metalness: 0.88 });
    const screenFrame = new THREE.Mesh(frameGeo, frameMat);
    screenFrame.position.set(-0.65, 3.8, -9.14);
    scene.add(screenFrame);

    // Screen Mesh
    const screenGeo = new THREE.PlaneGeometry(5.0, 2.7);
    const screenMat = new THREE.MeshBasicMaterial({ map: boardTexture });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(-0.65, 3.8, -9.09);
    scene.add(screenMesh);

    // Smartboard Stylus Pen Tray & Digital Accessories
    const penTrayMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
    const penTray = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.04, 0.12), penTrayMat);
    penTray.position.set(-0.65, 2.33, -9.05);
    scene.add(penTray);

    // Digital Pens (Styluses) resting on tray in vibrant electric colors
    const penColors = [0x00f0ff, 0xec4899, 0x10b981, 0xf59e0b];
    penColors.forEach((color, idx) => {
      const pen = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.24, 12),
        new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.6 })
      );
      pen.rotation.z = Math.PI / 2;
      pen.position.set(-1.4 + idx * 0.38, 2.36, -9.05);
      scene.add(pen);
    });

    // Magnetic Board Eraser
    const eraser = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.05, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 })
    );
    eraser.position.set(0.4, 2.36, -9.05);
    scene.add(eraser);

    // Power Indicator Status LED (Emerald Active Glow)
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const powerLed = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), ledMat);
    powerLed.position.set(1.85, 2.4, -9.08);
    scene.add(powerLed);

    // Smartboard Dual-Color Neon Glow Fill (Electric Cyan + Violet)
    const boardLightCyan = new THREE.PointLight(0x00f0ff, 1.15, 8);
    boardLightCyan.position.set(-1.8, 3.8, -8.2);
    scene.add(boardLightCyan);

    const boardLightViolet = new THREE.PointLight(0xa855f7, 0.85, 7);
    boardLightViolet.position.set(1.0, 3.8, -8.2);
    scene.add(boardLightViolet);

    // -------------------------------------------------------------
    // TEACHER'S PODIUM / LECTERN (Detailed Walnut, Emblem, Mic, Tablet)
    // -------------------------------------------------------------
    const podiumGroup = new THREE.Group();
    const woodDarkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.45, metalness: 0.05 });
    const woodTrimMat = new THREE.MeshStandardMaterial({ color: 0x271711, roughness: 0.5, metalness: 0.1 });

    // Main Lectern Column Body
    const podiumBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.8), woodDarkMat);
    podiumBody.position.set(0, 0.9, 0);
    podiumBody.castShadow = true;
    podiumGroup.add(podiumBody);

    // Recessed Architectural Front Trim Panel
    const podiumFrontPanel = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.35, 0.04), woodTrimMat);
    podiumFrontPanel.position.set(0, 0.9, 0.41);
    podiumGroup.add(podiumFrontPanel);

    // University Collegiate Crest / Medallion (Polished Gold/Bronze)
    const crestMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
    const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 32), crestMat);
    crest.rotation.x = Math.PI / 2;
    crest.position.set(0, 1.05, 0.43);
    podiumGroup.add(crest);

    // Lectern Slanted Reading Top with Raised Lower Lip
    const podiumTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.95), woodDarkMat);
    podiumTop.position.set(0, 1.82, -0.04);
    podiumTop.rotation.x = 0.2;
    podiumTop.castShadow = true;
    podiumGroup.add(podiumTop);

    const podiumLip = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.03, 0.04), woodTrimMat);
    podiumLip.position.set(0, 1.74, 0.4);
    podiumLip.rotation.x = 0.2;
    podiumGroup.add(podiumLip);

    // Professor's Open Tablet / Lecture Notes (Screen Glows Subtly)
    const tabletMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.85 });
    const tabletBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.016, 0.3), tabletMat);
    tabletBody.position.set(-0.16, 1.86, -0.06);
    tabletBody.rotation.x = 0.2;
    podiumGroup.add(tabletBody);

    const tabletScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.26),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    tabletScreen.rotation.x = -Math.PI / 2 + 0.2;
    tabletScreen.position.set(-0.16, 1.875, -0.06);
    podiumGroup.add(tabletScreen);

    // Professional Flexible Gooseneck Microphone with Studio Live Indicator Ring
    const micMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.2 });
    const micBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16), micMat);
    micBase.position.set(0.3, 1.84, 0.1);
    micBase.rotation.x = 0.2;
    podiumGroup.add(micBase);

    const micLower = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 12), micMat);
    micLower.position.set(0.3, 1.95, 0.04);
    micLower.rotation.x = -0.3;
    podiumGroup.add(micLower);

    const micUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 12), micMat);
    micUpper.position.set(0.3, 2.08, -0.04);
    micUpper.rotation.x = 0.35;
    podiumGroup.add(micUpper);

    // Studio Active Microphone Capsule with Red Live Indicator Ring
    const micCapsule = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, 0.07, 16), micMat);
    micCapsule.position.set(0.3, 2.15, -0.09);
    micCapsule.rotation.x = 0.35;
    podiumGroup.add(micCapsule);

    const micLiveRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.018, 0.003, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    micLiveRing.position.set(0.3, 2.12, -0.08);
    micLiveRing.rotation.x = 0.35;
    podiumGroup.add(micLiveRing);

    // Lecturer's Stainless Steel Thermos Flask
    const flaskMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.92, roughness: 0.15 });
    const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.2, 16), flaskMat);
    flask.position.set(0.44, 1.92, -0.02);
    podiumGroup.add(flask);

    podiumGroup.position.set(-4.4, 0, -7.4);
    scene.add(podiumGroup);

    // Note: The flickering black vent has been removed from front wall!

    // -------------------------------------------------------------
    // RIGHT WALL: HIGH-DETAIL ENTRANCE DOOR & ACCESSORIES
    // -------------------------------------------------------------
    // Modern Architectural Classroom Door (Mounted on opposite right wall)
    const doorGroup = new THREE.Group();
    doorGroup.position.set(7.24, 0, -7.8);
    doorGroup.rotation.y = Math.PI;

    // Recessed Outer Door Frame (Jamb)
    const frameMetalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.4 });
    const dFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.4, 1.84), frameMetalMat);
    dFrame.position.set(0, 1.7, 0);
    doorGroup.add(dFrame);

    // Solid Core Wood/Laminate Door Leaf
    const dLeafMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.5, metalness: 0.05 });
    const dLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.24, 1.68), dLeafMat);
    dLeaf.position.set(0.02, 1.68, 0);
    doorGroup.add(dLeaf);

    // Narrow Vertical Safety Wire Glass Vision Panel
    const dGlassMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
    });
    const dGlass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.25, 0.38), dGlassMat);
    dGlass.position.set(0.02, 2.22, -0.25);
    doorGroup.add(dGlass);

    // Stainless Steel Vision Panel Beading Trim
    const dGlassBead = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 1.3, 0.43),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 })
    );
    dGlassBead.position.set(0.02, 2.22, -0.25);
    doorGroup.add(dGlassBead);

    // Brushed Chrome Commercial Lever Door Handle & Backplate
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
    const escutcheon = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.07), handleMat);
    escutcheon.position.set(0.06, 1.55, 0.62);
    doorGroup.add(escutcheon);

    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 12), handleMat);
    lever.rotation.x = Math.PI / 2;
    lever.position.set(0.08, 1.58, 0.56);
    doorGroup.add(lever);

    // Heavy-Duty Stainless Steel Bottom Kickplate
    const kickplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.42, 1.62),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.25 })
    );
    kickplate.position.set(0.02, 0.24, 0);
    doorGroup.add(kickplate);

    // Illuminated Emergency EXIT Sign above Door
    const exitHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.26, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
    );
    exitHousing.position.set(0.04, 3.58, 0);
    doorGroup.add(exitHousing);

    // Glowing Green EXIT Sign Acrylic Panel
    const exitFaceCanvas = document.createElement('canvas');
    exitFaceCanvas.width = 256;
    exitFaceCanvas.height = 96;
    const ectx = exitFaceCanvas.getContext('2d')!;
    ectx.fillStyle = '#064e3b';
    ectx.fillRect(0, 0, 256, 96);
    ectx.fillStyle = '#22c55e';
    ectx.font = 'bold 44px sans-serif';
    ectx.textAlign = 'center';
    ectx.fillText('EXIT ➔', 128, 64);
    const exitTexture = new THREE.CanvasTexture(exitFaceCanvas);

    const exitSignMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.22),
      new THREE.MeshBasicMaterial({ map: exitTexture })
    );
    exitSignMesh.rotation.y = Math.PI / 2;
    exitSignMesh.position.set(0.11, 3.58, 0);
    doorGroup.add(exitSignMesh);

    // Soft Ambient Green Door Glow
    const exitLight = new THREE.PointLight(0x22c55e, 0.65, 3.5);
    exitLight.position.set(0.2, 3.55, 0);
    doorGroup.add(exitLight);

    scene.add(doorGroup);

    // -------------------------------------------------------------
    // NOTICE BOARD (Oak Beveled Frame, Cork Texture, 3D Pushpins)
    // -------------------------------------------------------------
    const noticeGroup = new THREE.Group();
    noticeGroup.position.set(-8.5, 2.9, -3.2);

    // Beveled Solid Oak Frame Perimeter
    const oakMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 });
    // Top Rail
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.56), oakMat);
    frameTop.position.set(0, 0.94, 0);
    noticeGroup.add(frameTop);
    // Bottom Rail
    const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.56), oakMat);
    frameBottom.position.set(0, -0.94, 0);
    noticeGroup.add(frameBottom);
    // Left Stile
    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.08), oakMat);
    frameLeft.position.set(0, 0, -1.24);
    noticeGroup.add(frameLeft);
    // Right Stile
    const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.08), oakMat);
    frameRight.position.set(0, 0, 1.24);
    noticeGroup.add(frameRight);

    // Textured Cork Board Backing
    const corkMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.95 });
    const corkBoard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.8, 2.4), corkMat);
    corkBoard.position.set(0, 0, 0);
    noticeGroup.add(corkBoard);

    // Helper to generate realistic high-contrast collegiate event posters with gradients
    const createNoticeTexture = (
      title: string,
      sub: string,
      accentText: string,
      gradColors: [string, string],
      titleColor: string
    ) => {
      const cvs = document.createElement('canvas');
      cvs.width = 256;
      cvs.height = 360;
      const ctx = cvs.getContext('2d')!;

      // Rich gradient background
      const grad = ctx.createLinearGradient(0, 0, 256, 360);
      grad.addColorStop(0, gradColors[0]);
      grad.addColorStop(1, gradColors[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 360);

      // Top Category Badge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.roundRect(16, 18, 140, 24, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(accentText, 24, 34);

      // Main Title
      ctx.fillStyle = titleColor;
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(title, 16, 75);

      // Subtitle
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '12px sans-serif';
      ctx.fillText(sub, 16, 96);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(16, 110);
      ctx.lineTo(240, 110);
      ctx.stroke();

      // Poster content graphic boxes & simulated lines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(16, 125, 224, 80);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let y = 225; y <= 330; y += 18) {
        const lineLen = 120 + Math.sin(y * 13) * 60;
        ctx.fillRect(16, y, lineLen, 4);
      }

      return new THREE.CanvasTexture(cvs);
    };

    // Poster 1: AI & Robotics Hackathon (Deep Indigo to Electric Cyan)
    const noticeTex1 = createNoticeTexture(
      'HACKATHON 2026',
      'DEVCLASS MCA • $50K PRIZE POOL',
      'COMPUTING LAB',
      ['#312e81', '#0284c7'],
      '#ffffff'
    );
    const paper1 = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.7),
      new THREE.MeshBasicMaterial({ map: noticeTex1 })
    );
    paper1.rotation.y = Math.PI / 2;
    paper1.position.set(0.03, 0.15, -0.65);
    noticeGroup.add(paper1);

    // Poster 2: Campus Design Fest (Sunset Magenta to Orange)
    const noticeTex2 = createNoticeTexture(
      'DESIGN FEST',
      'PORTFOLIO REVIEWS @ 2 PM',
      'CREATIVE GUILD',
      ['#be185d', '#ea580c'],
      '#fef08a'
    );
    const paper2 = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.55),
      new THREE.MeshBasicMaterial({ map: noticeTex2 })
    );
    paper2.rotation.y = Math.PI / 2;
    paper2.rotation.x = 0.05;
    paper2.position.set(0.03, -0.05, 0.05);
    noticeGroup.add(paper2);

    // Poster 3: Tech Symposium (Lush Emerald to Dark Slate)
    const noticeTex3 = createNoticeTexture(
      'AI SYMPOSIUM',
      'KEYNOTE: GENERATIVE UX',
      'KEYNOTE EVENT',
      ['#047857', '#064e3b'],
      '#a7f3d0'
    );
    const paper3 = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.52),
      new THREE.MeshBasicMaterial({ map: noticeTex3 })
    );
    paper3.rotation.y = Math.PI / 2;
    paper3.rotation.x = -0.04;
    paper3.position.set(0.03, 0.22, 0.68);
    noticeGroup.add(paper3);

    // 3D Pushpins holding each paper with realistic colored pinheads
    const addPushpin = (x: number, y: number, z: number, color: number) => {
      const pinMat = new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.6 });
      const needle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.003, 0.04, 8),
        new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95, roughness: 0.1 })
      );
      needle.rotation.z = Math.PI / 2;
      needle.position.set(x + 0.02, y, z);
      noticeGroup.add(needle);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), pinMat);
      head.position.set(x + 0.045, y, z);
      noticeGroup.add(head);
    };

    addPushpin(0.03, 0.48, -0.65, 0xef4444); // Red Pin on Notice 1
    addPushpin(0.03, 0.22, 0.05, 0xf59e0b);  // Amber Pin on Notice 2
    addPushpin(0.03, 0.46, 0.68, 0x06b6d4);  // Cyan Pin on Notice 3

    scene.add(noticeGroup);

    // -------------------------------------------------------------
    // RIGHT WALL: TALL ARCHITECTURAL WINDOWS WITH SUNLIT CAMPUS VISTA
    // -------------------------------------------------------------
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d')!;

    // Sunlit morning sky gradient
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
    skyGrad.addColorStop(0, '#38bdf8');
    skyGrad.addColorStop(0.55, '#bae6fd');
    skyGrad.addColorStop(0.8, '#e0f2fe');
    skyGrad.addColorStop(1, '#fef08a');
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 512, 512);

    // Fluffy cloud puffs
    skyCtx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    skyCtx.beginPath();
    skyCtx.arc(140, 160, 60, 0, Math.PI * 2);
    skyCtx.arc(200, 150, 80, 0, Math.PI * 2);
    skyCtx.arc(260, 165, 55, 0, Math.PI * 2);
    skyCtx.fill();

    // Distant green campus treetops at bottom of window
    skyCtx.fillStyle = '#15803d';
    skyCtx.beginPath();
    skyCtx.arc(80, 480, 120, 0, Math.PI * 2);
    skyCtx.arc(230, 470, 140, 0, Math.PI * 2);
    skyCtx.arc(380, 485, 130, 0, Math.PI * 2);
    skyCtx.fill();

    skyCtx.fillStyle = '#22c55e';
    skyCtx.beginPath();
    skyCtx.arc(130, 500, 110, 0, Math.PI * 2);
    skyCtx.arc(310, 495, 120, 0, Math.PI * 2);
    skyCtx.fill();

    const outdoorSkyTexture = new THREE.CanvasTexture(skyCanvas);

    const windowMullionMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
    const windowGlassMat = new THREE.MeshStandardMaterial({
      color: 0xeff6ff,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.45,
    });

    const createWindow = (zPos: number, winWidth: number = 2.2) => {
      const winGroup = new THREE.Group();

      // Exterior campus sky plane behind window (x = 7.44)
      const exteriorSky = new THREE.Mesh(
        new THREE.PlaneGeometry(winWidth + 0.1, 4.0),
        new THREE.MeshBasicMaterial({ map: outdoorSkyTexture })
      );
      exteriorSky.rotation.y = -Math.PI / 2;
      exteriorSky.position.set(7.44, 3.3, zPos);
      scene.add(exteriorSky);

      // Outer window jamb frame (white architectural trim)
      const frameOuter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.1, winWidth), windowMullionMat);
      frameOuter.position.set(7.28, 3.3, 0);
      winGroup.add(frameOuter);

      // Center vertical mullion
      const vertMullion = new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.96, 0.05), windowMullionMat);
      vertMullion.position.set(7.28, 3.3, 0);
      winGroup.add(vertMullion);

      // Transom horizontal rail
      const transRail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, winWidth - 0.08), windowMullionMat);
      transRail.position.set(7.28, 4.4, 0);
      winGroup.add(transRail);

      // Transparent reflective glass panes
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(winWidth - 0.08, 3.95), windowGlassMat);
      glass.rotation.y = -Math.PI / 2;
      glass.position.set(7.28, 3.3, 0);
      winGroup.add(glass);

      winGroup.position.set(0, 0, zPos);
      scene.add(winGroup);
    };

    createWindow(-5.4, 2.2);
    createWindow(-1.2, 2.2);
    createWindow(2.8, 1.8);

    // =============================================================
    // OPTIMIZED WALL FANS (Authentic Industrial Oscillating Wall Fans)
    // - Fast, realistic propeller rotation (0.26 rad/frame = ~250 RPM)
    // - Smooth yaw oscillation left & right across the classroom
    // - Downward tilt angled directly towards the student desks
    // - 12-spoke wire safety cage + center chrome hub badge
    // - 3 contoured aerodynamic curved paddle blades
    // =============================================================
    const fanHousingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.65,
    });
    const fanCageMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.85,
    });
    const fanBladeMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.16,
      metalness: 0.35,
    });
    const fanAccentMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.2,
      metalness: 0.9,
    });

    fanUnitsRef.current = []; // Reset fans array

    const createWallFan = (zPos: number, yPos: number, phase: number) => {
      const fanGroup = new THREE.Group();
      fanGroup.position.set(7.23, yPos, zPos);

      // 1. Heavy-duty wall bracket flush on right wall (x = 7.23)
      const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.28), fanHousingMat);
      basePlate.position.set(0, 0, 0);
      fanGroup.add(basePlate);

      // 2. Angled steel support arm extending from wall into classroom (-X)
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 12), fanHousingMat);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(-0.2, 0.04, 0);
      fanGroup.add(arm);

      // 3. Swivel Pivot Joint
      const pivotBracket = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 16), fanAccentMat);
      pivotBracket.position.set(-0.38, 0.04, 0);
      fanGroup.add(pivotBracket);

      // 4. Oscillating Fan Head Group (Swivels left & right)
      const headGroup = new THREE.Group();
      headGroup.position.set(-0.4, 0.04, 0);

      // Tilt group (points downwards ~18° towards the desks)
      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.z = 0.28;
      headGroup.add(tiltGroup);

      // Motor Cylinder Housing
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.24, 20), fanHousingMat);
      motor.rotation.z = Math.PI / 2;
      motor.position.set(-0.11, 0, 0);
      tiltGroup.add(motor);

      // Rear Motor Cap
      const motorCap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), fanHousingMat);
      motorCap.rotation.z = -Math.PI / 2;
      motorCap.position.set(-0.01, 0, 0);
      tiltGroup.add(motorCap);

      // 5. Wire Protective Cage / Safety Guard
      const cageGroup = new THREE.Group();
      cageGroup.position.set(-0.24, 0, 0);

      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.012, 12, 36), fanCageMat);
      outerRing.rotation.y = Math.PI / 2;
      cageGroup.add(outerRing);

      const midRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.009, 10, 32), fanCageMat);
      midRing.rotation.y = Math.PI / 2;
      cageGroup.add(midRing);

      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.009, 8, 24), fanCageMat);
      innerRing.rotation.y = Math.PI / 2;
      cageGroup.add(innerRing);

      for (let s = 0; s < 12; s++) {
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.94), fanCageMat);
        spoke.rotation.x = (s * Math.PI) / 6;
        cageGroup.add(spoke);
      }

      const centerBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 24), fanAccentMat);
      centerBadge.rotation.z = Math.PI / 2;
      centerBadge.position.set(-0.018, 0, 0);
      cageGroup.add(centerBadge);

      tiltGroup.add(cageGroup);

      // 6. Spinning Rotor Group
      const rotorGroup = new THREE.Group();
      rotorGroup.position.set(-0.23, 0, 0);

      const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.09, 20), fanHousingMat);
      noseCone.rotation.z = Math.PI / 2;
      noseCone.position.set(-0.025, 0, 0);
      rotorGroup.add(noseCone);

      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(0, 0.07);
      bladeShape.quadraticCurveTo(0.05, 0.2, 0.07, 0.32);
      bladeShape.quadraticCurveTo(0.06, 0.41, 0.0, 0.43);
      bladeShape.quadraticCurveTo(-0.06, 0.41, -0.07, 0.32);
      bladeShape.quadraticCurveTo(-0.05, 0.2, 0, 0.07);

      const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
        depth: 0.007,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.0025,
        bevelThickness: 0.0025,
      });
      bladeGeo.center();

      for (let i = 0; i < 3; i++) {
        const bladeArm = new THREE.Group();
        bladeArm.rotation.x = (i * Math.PI * 2) / 3;

        const blade = new THREE.Mesh(bladeGeo, fanBladeMat);
        blade.position.set(0, 0.23, 0);
        blade.rotation.y = 0.28;
        bladeArm.add(blade);

        rotorGroup.add(bladeArm);
      }

      tiltGroup.add(rotorGroup);

      fanGroup.add(headGroup);
      scene.add(fanGroup);

      fanUnitsRef.current.push({
        head: headGroup,
        rotor: rotorGroup,
        baseAngle: -0.32,
        phase,
      });
    };

    createWallFan(-3.2, 3.6, 0);
    createWallFan(0.8, 3.6, Math.PI * 0.6);

    // =============================================================
    // CHAIR COLORS & MODELING (Crimson Red #ab312c)
    // - Shell: Custom collegiate crimson (#ab312c)
    // - Writing Tablet: Natural warm honey beech/birch wood (0xe0a267)
    // - Frame: Light silver powder-coated tubular steel (0xa8b4c0)
    // =============================================================
    const chromeLegMat = new THREE.MeshStandardMaterial({
      color: 0xa8b4c0,
      roughness: 0.22,
      metalness: 0.82,
    });
    const beechWoodMat = new THREE.MeshStandardMaterial({
      color: 0xe0a267, // Warm natural honey birch wood laminate
      roughness: 0.30,
      metalness: 0.02,
    });

    const seatBaseGeo = new THREE.BoxGeometry(0.72, 0.08, 0.65);
    const seatBackGeo = new THREE.BoxGeometry(0.72, 0.68, 0.07);
    const legCylinderGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.72);

    // Writing Tablet Desk (Oak Wood, angled forward)
    const tabletShape = new THREE.Shape();
    tabletShape.moveTo(0, 0);
    tabletShape.lineTo(0.55, 0);
    tabletShape.quadraticCurveTo(0.65, 0.3, 0.58, 0.7);
    tabletShape.lineTo(0.05, 0.7);
    tabletShape.quadraticCurveTo(-0.05, 0.35, 0, 0);

    const extrudeSettings = { depth: 0.04, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.015, bevelThickness: 0.015 };
    const tabletGeo = new THREE.ExtrudeGeometry(tabletShape, extrudeSettings);
    tabletGeo.center();

    // -------------------------------------------------------------
    // ARRANGE 46 SEATS (5 Cols Left, 4 Cols Right, Proportionate & Cozy)
    // -------------------------------------------------------------
    const leftCols = [-5.8, -4.6, -3.4, -2.2, -1.0];
    const rightCols = [0.8, 2.0, 3.2, 4.4];
    const rowsZ = [-4.6, -3.2, -1.8, -0.4, 1.0];

    let seatCounter = 1;
    const deskMap = new Map<number, { group: THREE.Group; tablet: THREE.Mesh; seat: THREE.Mesh }>();

    // Build Left Bank (5 rows x 5 cols = 25 desks)
    for (let r = 0; r < rowsZ.length; r++) {
      for (let c = 0; c < leftCols.length; c++) {
        if (seatCounter > 46) break;
        const seatNum = seatCounter++;
        const posX = leftCols[c];
        const posZ = rowsZ[r];
        createDesk(seatNum, posX, posZ);
      }
    }

    // Build Right Bank (5 rows x 4 cols = 20 desks)
    for (let r = 0; r < rowsZ.length; r++) {
      for (let c = 0; c < rightCols.length; c++) {
        if (seatCounter > 45) break;
        const seatNum = seatCounter++;
        const posX = rightCols[c];
        const posZ = rowsZ[r];
        createDesk(seatNum, posX, posZ);
      }
    }

    // Seat 46: Aisle desk in back row
    if (seatCounter <= 46) {
      createDesk(46, rightCols[0], 2.4);
    }

    const interactiveTargets: THREE.Object3D[] = [];

    function createDesk(seatNum: number, x: number, z: number) {
      const deskGroup = new THREE.Group();
      deskGroup.position.set(x, 0, z);

      // 1. Contoured Chair Bucket Seat (Harmonious Chromatic Collegiate Zone)
      const baseRowColor = getSeatRowColor(seatNum);
      const chairMat = new THREE.MeshStandardMaterial({
        color: baseRowColor,
        roughness: 0.38,
        metalness: 0.08,
      });
      const seatMesh = new THREE.Mesh(seatBaseGeo, chairMat);
      seatMesh.position.set(0, 0.72, 0);
      seatMesh.castShadow = true;
      (seatMesh as any).seatNumber = seatNum;
      deskGroup.add(seatMesh);

      const backMesh = new THREE.Mesh(seatBackGeo, chairMat);
      backMesh.position.set(0, 1.1, 0.28);
      backMesh.rotation.x = -0.12;
      backMesh.castShadow = true;
      (backMesh as any).seatNumber = seatNum;
      deskGroup.add(backMesh);

      // 2. Tubular Metal Chrome Legs
      const legPositions = [
        [-0.32, 0.36, -0.26],
        [0.32, 0.36, -0.26],
        [-0.32, 0.36, 0.26],
        [0.32, 0.36, 0.26],
      ];
      legPositions.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(legCylinderGeo, chromeLegMat);
        leg.position.set(lx, ly, lz);
        leg.castShadow = true;
        deskGroup.add(leg);
      });

      const crossBrace = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.02, 0.02), chromeLegMat);
      crossBrace.position.set(0, 0.2, 0);
      deskGroup.add(crossBrace);

      // 3. Right-hand Armrest & Tablet Stand
      const armStand = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45), chromeLegMat);
      armStand.position.set(0.38, 0.95, -0.05);
      deskGroup.add(armStand);

      // Writing Tablet Desk (Warm Light Natural Honey Birch Wood)
      const tabletMesh = new THREE.Mesh(tabletGeo, beechWoodMat.clone());
      tabletMesh.rotation.x = Math.PI / 2;
      tabletMesh.rotation.z = -0.15;
      tabletMesh.position.set(0.28, 1.18, -0.18);
      tabletMesh.castShadow = true;
      tabletMesh.receiveShadow = true;
      (tabletMesh as any).seatNumber = seatNum;
      deskGroup.add(tabletMesh);

      // 4. Stenciled Seat Number Badge
      const numCanvas = document.createElement('canvas');
      numCanvas.width = 128;
      numCanvas.height = 128;
      const nctx = numCanvas.getContext('2d')!;
      nctx.fillStyle = '#0f172a';
      nctx.beginPath();
      nctx.arc(64, 64, 52, 0, Math.PI * 2);
      nctx.fill();
      nctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      nctx.lineWidth = 4;
      nctx.stroke();

      nctx.fillStyle = '#ffffff';
      nctx.font = 'bold 50px monospace';
      nctx.textAlign = 'center';
      nctx.textBaseline = 'middle';
      nctx.fillText(seatNum < 10 ? `0${seatNum}` : `${seatNum}`, 64, 64);

      const numTex = new THREE.CanvasTexture(numCanvas);
      const numBadge = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 0.24),
        new THREE.MeshBasicMaterial({ map: numTex, transparent: true })
      );
      numBadge.rotation.x = -Math.PI / 2;
      numBadge.position.set(0.38, 1.21, -0.15);
      deskGroup.add(numBadge);

      // 5. Generous Tap / Hit Box for Effortless Touch on Phones & Precision Clicks
      const hitBoxGeo = new THREE.BoxGeometry(1.0, 1.45, 1.0);
      const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false, transparent: true, opacity: 0 });
      const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
      hitBox.position.set(0.1, 0.72, 0.05);
      (hitBox as any).seatNumber = seatNum;
      deskGroup.add(hitBox);

      (deskGroup as any).seatNumber = seatNum;
      scene.add(deskGroup);
      deskMap.set(seatNum, { group: deskGroup, tablet: tabletMesh, seat: seatMesh });

      // Register all touchable objects for raycaster
      interactiveTargets.push(hitBox, tabletMesh, seatMesh, backMesh);
    }

    deskMeshesRef.current = deskMap;

    // -------------------------------------------------------------
    // RAYCASTER FOR INTERACTION (Click & Touch Tap)
    // -------------------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const findIntersectedSeat = (clientX: number, clientY: number): number | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveTargets, false);
      if (intersects.length > 0) {
        const hit = intersects[0].object as any;
        return hit.seatNumber || (hit.parent as any)?.seatNumber || null;
      }
      return null;
    };

    const handlePointerMove = (e: MouseEvent) => {
      const seatNo = findIntersectedSeat(e.clientX, e.clientY);
      if (seatNo) {
        setHoveredSeat(seatNo);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredSeat(null);
        renderer.domElement.style.cursor = 'default';
      }
    };

    let pointerDownPos = { x: 0, y: 0 };
    let pointerDownTime = 0;
    let lastTapTime = 0;

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      pointerDownTime = performance.now();
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      const dist = Math.hypot(dx, dy);
      const elapsed = performance.now() - pointerDownTime;

      // Tap threshold: moved < 12px and duration < 400ms (mobile friendly slop)
      if (dist < 12 && elapsed < 400) {
        lastTapTime = performance.now();
        const seatNo = findIntersectedSeat(e.clientX, e.clientY);
        if (seatNo) {
          onSeatSelect(seatNo);
          setHoveredSeat(seatNo);

          if (activePreset === 'myseat' && deskMap.has(seatNo)) {
            const dg = deskMap.get(seatNo)!.group;
            targetCamPosRef.current = new THREE.Vector3(dg.position.x, 1.35, dg.position.z + 0.12);
            targetLookAtRef.current = new THREE.Vector3(-0.65, 2.9, -9.1);
          }
        }
      }
    };

    const handlePointerClick = (e: MouseEvent) => {
      // Prevent double trigger if pointerup handled it
      if (performance.now() - lastTapTime < 450) return;
      const seatNo = findIntersectedSeat(e.clientX, e.clientY);
      if (seatNo) {
        onSeatSelect(seatNo);
        setHoveredSeat(seatNo);

        if (activePreset === 'myseat' && deskMap.has(seatNo)) {
          const dg = deskMap.get(seatNo)!.group;
          targetCamPosRef.current = new THREE.Vector3(dg.position.x, 1.35, dg.position.z + 0.12);
          targetLookAtRef.current = new THREE.Vector3(-0.65, 2.9, -9.1);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('click', handlePointerClick);

    // -------------------------------------------------------------
    // RESIZE LISTENER (Guarantees classroom fits whole window)
    // -------------------------------------------------------------
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const aspect = w / h;
      camera.aspect = aspect;
      // If mobile portrait or narrow screen, scale FOV so all desks fit in frame:
      if (aspect < 1.0) {
        camera.fov = Math.min(68, 48 * (1.15 / aspect));
      } else if (aspect < 1.6) {
        camera.fov = Math.min(60, 46 * (1.5 / aspect));
      } else {
        camera.fov = 46;
      }
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // -------------------------------------------------------------
    // ANIMATION & RENDER LOOP
    // -------------------------------------------------------------
    let animationFrameId = 0;
    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);

      // Realistic fast spinning fan rotors + gentle natural oscillation
      fanUnitsRef.current.forEach(({ head, rotor, baseAngle, phase }) => {
        rotor.rotation.x += 0.26;
        head.rotation.y = baseAngle + Math.sin(time * 0.0016 + phase) * 0.28;
      });

      // Smooth Camera Transitions when preset changes
      if (targetCamPosRef.current && targetLookAtRef.current) {
        camera.position.lerp(targetCamPosRef.current, 0.08);
        controls.target.lerp(targetLookAtRef.current, 0.08);
        camera.lookAt(controls.target);

        if (
          camera.position.distanceTo(targetCamPosRef.current) < 0.03 &&
          controls.target.distanceTo(targetLookAtRef.current) < 0.03
        ) {
          camera.position.copy(targetCamPosRef.current);
          controls.target.copy(targetLookAtRef.current);
          targetCamPosRef.current = null;
          targetLookAtRef.current = null;
          controls.update();
        }
      } else {
        // User manual OrbitControls manipulation
        controls.update();
      }

      // STRICT CONTAINMENT: Camera view angle stays within comfortable bounds
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, ROOM_BOUNDS.minX, ROOM_BOUNDS.maxX);
      camera.position.y = THREE.MathUtils.clamp(camera.position.y, ROOM_BOUNDS.minY, ROOM_BOUNDS.maxY);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, ROOM_BOUNDS.minZ, ROOM_BOUNDS.maxZ);

      // SMART OCCLUSION CULLING: Back wall is ONLY visible when viewing from the front of the classroom (like podium mode)
      if (backWallRef.current) {
        backWallRef.current.visible = camera.position.z < 2.0;
      }

      renderer.render(scene, camera);
    };
    requestAnimationFrame(animate);

    // CLEANUP
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('click', handlePointerClick);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update camera when user selects or changes mySeat while in 'myseat' preset
  useEffect(() => {
    if (activePreset === 'myseat') {
      const targetSeat = mySeat || 13;
      if (deskMeshesRef.current.has(targetSeat)) {
        const dg = deskMeshesRef.current.get(targetSeat)!.group;
        targetCamPosRef.current = new THREE.Vector3(dg.position.x, 1.35, dg.position.z + 0.12);
        targetLookAtRef.current = new THREE.Vector3(-0.65, 2.9, -9.1);
      }
    }
  }, [mySeat, activePreset]);

  // 2. Update Desk Colors & Holographic Highlights in 3D
  useEffect(() => {
    const deskMap = deskMeshesRef.current;
    if (!deskMap || deskMap.size === 0) return;

    deskMap.forEach(({ tablet, seat }, seatNum) => {
      const isMine = mySeat === seatNum;
      const occupant = votes.find((v) => v.seatNumber === seatNum);
      const isHovered = hoveredSeat === seatNum;
      const baseRowColor = getSeatRowColor(seatNum);

      const tabletMat = tablet.material as THREE.MeshStandardMaterial;
      const seatMat = seat.material as THREE.MeshStandardMaterial;

      if (isMine) {
        // User's Claimed Seat -> Radiant Emerald Holographic Aura
        tabletMat.color.setHex(0xe0a267);
        tabletMat.emissive.setHex(0x10b981);
        tabletMat.emissiveIntensity = isHovered ? 0.95 : 0.65;
        seatMat.color.setHex(0x10b981);
        seatMat.emissive.setHex(0x10b981);
        seatMat.emissiveIntensity = 0.35;
      } else if (occupant) {
        // Attending Peer -> Cyber Electric Cyan Aura
        tabletMat.color.setHex(0xe0a267);
        tabletMat.emissive.setHex(0x06b6d4);
        tabletMat.emissiveIntensity = isHovered ? 0.75 : 0.4;
        seatMat.color.setHex(baseRowColor);
        seatMat.emissive.setHex(0x06b6d4);
        seatMat.emissiveIntensity = 0.22;
      } else if (isHovered) {
        // Empty Desk Hovered -> Radiant Amber Highlight Pulse
        tabletMat.color.setHex(0xe0a267);
        tabletMat.emissive.setHex(0xf59e0b);
        tabletMat.emissiveIntensity = 0.55;
        seatMat.color.setHex(baseRowColor);
        seatMat.emissive.setHex(0xf59e0b);
        seatMat.emissiveIntensity = 0.3;
      } else {
        // Natural Zoned Color Palette
        tabletMat.color.setHex(0xe0a267);
        tabletMat.emissive.setHex(0x000000);
        tabletMat.emissiveIntensity = 0;
        seatMat.color.setHex(baseRowColor);
        seatMat.emissive.setHex(0x000000);
        seatMat.emissiveIntensity = 0;
      }
    });
  }, [mySeat, votes, hoveredSeat]);

  // 3. Camera Preset Navigator (Carefully Calibrated Viewing Angles)
  const switchPreset = (preset: CameraPreset) => {
    setActivePreset(preset);

    if (preset === 'overview') {
      // High-angle bird's-eye perspective:
      // Perfectly frames all 46 desks in their color zones, the teacher's lectern, and central aisle
      const isMobilePortrait = (containerRef.current?.clientWidth || window.innerWidth) < 768;
      if (isMobilePortrait) {
        targetCamPosRef.current = new THREE.Vector3(-0.65, 9.2, 5.2);
        targetLookAtRef.current = new THREE.Vector3(-0.65, 0.5, -2.2);
      } else {
        targetCamPosRef.current = new THREE.Vector3(-0.65, 7.2, 3.4);
        targetLookAtRef.current = new THREE.Vector3(-0.65, 0.6, -2.4);
      }
    } else if (preset === 'podium') {
      // First-person Professor's perspective standing behind the lectern looking out at all students
      targetCamPosRef.current = new THREE.Vector3(-4.4, 1.88, -8.25);
      targetLookAtRef.current = new THREE.Vector3(-0.6, 1.35, -1.0);
    } else if (preset === 'myseat') {
      // First-person Student's perspective seated at their desk looking ahead at the Smart Board
      const targetSeatNum = mySeat || 13; // Defaults to seat 13 if no seat claimed yet
      if (deskMeshesRef.current.has(targetSeatNum)) {
        const deskGroup = deskMeshesRef.current.get(targetSeatNum)!.group;
        targetCamPosRef.current = new THREE.Vector3(
          deskGroup.position.x,
          1.35,
          deskGroup.position.z + 0.12
        );
        targetLookAtRef.current = new THREE.Vector3(
          -0.65,
          2.9,
          -9.1
        );
      }
    }
  };

  // Hovered Seat Info
  const hoveredOccupant = hoveredSeat ? votes.find((v) => v.seatNumber === hoveredSeat) : null;
  const isHoveredMySeat = hoveredSeat === mySeat;

  return (
    <div className="classroom-3d-wrapper">
      <div ref={containerRef} className="classroom-3d-canvas-container" />

      {/* Floating HUD Elements */}
      <div className="classroom-hud-overlay">
        {/* Floating Tooltip when hovering/tapping a desk */}
        {hoveredSeat && (
          <div className="seat-hover-card" onClick={(e) => e.stopPropagation()}>
            <div className="seat-hover-title">
              <span>SEAT #{hoveredSeat < 10 ? `0${hoveredSeat}` : hoveredSeat}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  className={`seat-hover-status ${
                    isHoveredMySeat ? 'mine' : hoveredOccupant ? 'occupied' : 'available'
                  }`}
                >
                  {isHoveredMySeat ? 'YOUR SEAT' : hoveredOccupant ? 'OCCUPIED' : 'AVAILABLE'}
                </span>
                <button
                  type="button"
                  className="seat-hover-close-btn"
                  onClick={() => setHoveredSeat(null)}
                  aria-label="Dismiss tooltip"
                >
                  ✕
                </button>
              </div>
            </div>

            {isHoveredMySeat ? (
              <div className="seat-hover-action-col">
                <span style={{ color: '#10b981', fontSize: '0.74rem', fontWeight: 600 }}>
                  ✔ Confirmed for tomorrow
                </span>
                {onClearSeat && (
                  <button
                    type="button"
                    className="seat-action-btn release"
                    onClick={() => {
                      onClearSeat();
                      setHoveredSeat(null);
                    }}
                  >
                    Release Seat
                  </button>
                )}
              </div>
            ) : hoveredOccupant ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ color: '#60a5fa', fontWeight: 600, fontSize: '0.78rem' }}>
                  @{hoveredOccupant.username}
                </span>
                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.70rem' }}>
                  "{hoveredOccupant.catchphrase || 'Sitting here tomorrow'}"
                </span>
              </div>
            ) : (
              <div className="seat-hover-action-col">
                <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                  Desk is available for tomorrow
                </span>
                <button
                  type="button"
                  className="seat-action-btn claim"
                  onClick={() => {
                    onSeatSelect(hoveredSeat);
                    if (activePreset === 'myseat' && deskMeshesRef.current.has(hoveredSeat)) {
                      const dg = deskMeshesRef.current.get(hoveredSeat)!.group;
                      targetCamPosRef.current = new THREE.Vector3(dg.position.x, 1.35, dg.position.z + 0.12);
                      targetLookAtRef.current = new THREE.Vector3(-0.65, 2.9, -9.1);
                    }
                  }}
                >
                  Claim Seat #{hoveredSeat}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Floating Spatial HUD Controls */}
        <div className="classroom-bottom-hud">
          {/* Subtle Classroom Legend */}
          <div className="spatial-legend">
            <div className="legend-entry">
              <span className="legend-chip available" />
              <span>Available</span>
            </div>
            <div className="legend-entry">
              <span className="legend-chip occupied" />
              <span>Attending</span>
            </div>
            <div className="legend-entry">
              <span className="legend-chip mine" />
              <span>My Desk</span>
            </div>
          </div>

          {/* Center Spatial Viewport Segmented Control & Seat Actions */}
          <div className="spatial-controls-wrapper">
            <div className="spatial-segmented-control" role="tablist" aria-label="Camera Perspectives">
              <button
                type="button"
                className={`segment-btn ${activePreset === 'overview' ? 'active' : ''}`}
                onClick={() => switchPreset('overview')}
                title="Classroom Overview View"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span>Overview</span>
              </button>

              <button
                type="button"
                className={`segment-btn ${activePreset === 'podium' ? 'active' : ''}`}
                onClick={() => switchPreset('podium')}
                title="Teacher Lectern View"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="22"></line>
                </svg>
                <span>Lectern</span>
              </button>

              <button
                type="button"
                className={`segment-btn ${activePreset === 'myseat' ? 'active' : ''}`}
                onClick={() => switchPreset('myseat')}
                title="First-Person Perspective from Desk"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 18v3M17 18v3M5 10h14M18 10V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v5M4 14h16a1 1 0 0 0 1-1v-3H3v3a1 1 0 0 0 1 1Z"></path>
                </svg>
                <span>My Desk {mySeat ? `(#${mySeat < 10 ? `0${mySeat}` : mySeat})` : ''}</span>
              </button>
            </div>

            {/* Clean Spatial Seat Status Card */}
            <div className="spatial-reservation-card">
              {mySeat ? (
                <div className="reservation-inner reserved">
                  <span className="reservation-pulse" />
                  <div className="reservation-label-col">
                    <span className="reservation-seat-code">SEAT #{mySeat < 10 ? `0${mySeat}` : mySeat}</span>
                    <span className="reservation-sub">Attending Tomorrow</span>
                  </div>
                  <div className="reservation-actions-row">
                    <button
                      type="button"
                      className="reservation-btn choose-seat"
                      onClick={() => setShowSeatPickerModal(true)}
                      title="Switch to another seat"
                    >
                      Change
                    </button>
                    {onClearSeat && (
                      <button
                        type="button"
                        className="reservation-btn cancel"
                        onClick={onClearSeat}
                        title="Release this seat"
                      >
                        Release
                      </button>
                    )}
                  </div>
                </div>
              ) : currentUser && currentUser.isApproved === false && currentUser.faceScanStatus !== 'verified' ? (
                <div className="reservation-inner empty">
                  <span className="reservation-empty-dot" style={{ background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} />
                  <div className="reservation-label-col">
                    <span className="reservation-seat-code" style={{ color: '#fbbf24' }}>APPROVAL PENDING</span>
                    <span className="reservation-sub">Admin review in progress</span>
                  </div>
                  <button
                    type="button"
                    className="reservation-btn auto"
                    style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.35)', color: '#fbbf24' }}
                    onClick={() => {
                      if (onPendingNotice) {
                        onPendingNotice();
                      }
                    }}
                    title="Account Pending Admin Verification"
                  >
                    Locked
                  </button>
                </div>
              ) : (
                <div className="reservation-inner empty">
                  <span className="reservation-empty-dot" />
                  <div className="reservation-label-col">
                    <span className="reservation-seat-code">NO SEAT CLAIMED</span>
                    <span className="reservation-sub">Tap desk or use Seat Map</span>
                  </div>
                  <div className="reservation-actions-row">
                    <button
                      type="button"
                      className="reservation-btn choose-seat"
                      onClick={() => setShowSeatPickerModal(true)}
                      title="Open 2D Seating Matrix"
                    >
                      💺 Seat Map
                    </button>
                    {onRandomSeat && (
                      <button
                        type="button"
                        className="reservation-btn auto"
                        onClick={onRandomSeat}
                        title="Automatically assign an available desk"
                      >
                        ⚡ I'm Coming
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile & Tablet Interactive 2D Seating Matrix Sheet */}
        {showSeatPickerModal && (
          <div className="spatial-seat-sheet-backdrop" onClick={() => setShowSeatPickerModal(false)}>
            <div className="spatial-seat-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="seat-sheet-header">
                <div className="seat-sheet-title-group">
                  <div className="seat-sheet-badge">CLASSROOM PRESENCE // 46 SEATS</div>
                  <h3 className="seat-sheet-title">Select Desk for Tomorrow</h3>
                </div>
                <button
                  type="button"
                  className="seat-sheet-close-btn"
                  onClick={() => setShowSeatPickerModal(false)}
                  aria-label="Close Seat Map"
                >
                  ✕
                </button>
              </div>

              {/* Status bar */}
              <div className="seat-sheet-status-bar">
                <div className="seat-sheet-status-text">
                  {mySeat ? (
                    <span className="status-confirmed">✔ Attending: Seat #{mySeat < 10 ? `0${mySeat}` : mySeat}</span>
                  ) : (
                    <span className="status-unclaimed">No desk chosen yet</span>
                  )}
                </div>
                {onRandomSeat && !mySeat && (
                  <button
                    type="button"
                    className="seat-sheet-quick-auto-btn"
                    onClick={() => {
                      onRandomSeat();
                      setShowSeatPickerModal(false);
                    }}
                  >
                    ⚡ Auto-Pick For Me
                  </button>
                )}
                {onClearSeat && mySeat && (
                  <button
                    type="button"
                    className="seat-sheet-quick-release-btn"
                    onClick={() => {
                      onClearSeat();
                    }}
                  >
                    Release Seat
                  </button>
                )}
              </div>

              {/* Front of Room Visual Anchor */}
              <div className="seat-sheet-board-indicator">
                <span>▲ FRONT OF AUDITORIUM · SMART BOARD & LECTERN ▲</span>
              </div>

              {/* 46 Seating Matrix */}
              <div className="seat-sheet-grid-container">
                {/* Left Bank: 5 columns x 5 rows = Seats 1 to 25 */}
                <div className="seat-sheet-bank left">
                  <div className="seat-sheet-bank-label">LEFT WING (SEATS 01-25)</div>
                  <div className="seat-sheet-cells-grid left">
                    {Array.from({ length: 25 }, (_, i) => i + 1).map((sNum) => {
                      const occupant = votes.find((v) => v.seatNumber === sNum);
                      const isMine = mySeat === sNum;
                      const isOccupied = Boolean(occupant);

                      return (
                        <button
                          key={sNum}
                          type="button"
                          disabled={isOccupied && !isMine}
                          className={`seat-grid-cell ${isMine ? 'mine' : isOccupied ? 'occupied' : 'available'}`}
                          onClick={() => {
                            onSeatSelect(sNum);
                            setShowSeatPickerModal(false);
                            if (deskMeshesRef.current.has(sNum)) {
                              const dg = deskMeshesRef.current.get(sNum)!.group;
                              targetCamPosRef.current = new THREE.Vector3(dg.position.x, 1.35, dg.position.z + 0.12);
                              targetLookAtRef.current = new THREE.Vector3(-0.65, 2.9, -9.1);
                              setActivePreset('myseat');
                            }
                          }}
                          title={isMine ? 'Your Seat' : isOccupied ? `Occupied by @${occupant?.username}` : `Seat #${sNum} Available`}
                        >
                          <span className="cell-num">{sNum < 10 ? `0${sNum}` : sNum}</span>
                          <span className="cell-tag">
                            {isMine ? 'YOU' : isOccupied ? `@${occupant?.username?.slice(0, 4)}` : 'FREE'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Center Aisle Spacer */}
                <div className="seat-sheet-aisle">
                  <span>AISLE</span>
                </div>

                {/* Right Bank: 4 columns x 5 rows = Seats 26 to 45 + Seat 46 Back Aisle */}
                <div className="seat-sheet-bank right">
                  <div className="seat-sheet-bank-label">RIGHT WING (SEATS 26-46)</div>
                  <div className="seat-sheet-cells-grid right">
                    {Array.from({ length: 21 }, (_, i) => i + 26).map((sNum) => {
                      const occupant = votes.find((v) => v.seatNumber === sNum);
                      const isMine = mySeat === sNum;
                      const isOccupied = Boolean(occupant);

                      return (
                        <button
                          key={sNum}
                          type="button"
                          disabled={isOccupied && !isMine}
                          className={`seat-grid-cell ${isMine ? 'mine' : isOccupied ? 'occupied' : 'available'}`}
                          onClick={() => {
                            onSeatSelect(sNum);
                            setShowSeatPickerModal(false);
                            if (deskMeshesRef.current.has(sNum)) {
                              const dg = deskMeshesRef.current.get(sNum)!.group;
                              targetCamPosRef.current = new THREE.Vector3(dg.position.x, 1.35, dg.position.z + 0.12);
                              targetLookAtRef.current = new THREE.Vector3(-0.65, 2.9, -9.1);
                              setActivePreset('myseat');
                            }
                          }}
                          title={isMine ? 'Your Seat' : isOccupied ? `Occupied by @${occupant?.username}` : `Seat #${sNum} Available`}
                        >
                          <span className="cell-num">{sNum < 10 ? `0${sNum}` : sNum}</span>
                          <span className="cell-tag">
                            {isMine ? 'YOU' : isOccupied ? `@${occupant?.username?.slice(0, 4)}` : 'FREE'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Legend & Close Footer */}
              <div className="seat-sheet-footer">
                <div className="seat-sheet-legend">
                  <div className="legend-item"><span className="dot available" /> Free</div>
                  <div className="legend-item"><span className="dot occupied" /> Occupied</div>
                  <div className="legend-item"><span className="dot mine" /> Your Desk</div>
                </div>
                <button
                  type="button"
                  className="seat-sheet-done-btn"
                  onClick={() => setShowSeatPickerModal(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
