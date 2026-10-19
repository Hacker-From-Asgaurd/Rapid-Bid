import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  RotateCcw, 
  Eye, 
  Maximize2, 
  MoveVertical, 
  Sliders, 
  Box, 
  Layers, 
  Compass, 
  ArrowRight, 
  Info,
  CheckCircle2,
  Sparkles,
  MapPin,
  Crosshair,
  Tag,
  ChevronRight,
  X,
  Activity,
  Check,
  MousePointerClick,
  RotateCw
} from 'lucide-react';

export default function Damper3DViewer({ 
  productCategory = 'damper', // 'damper' | 'valve'
  // Damper Parameters
  width = 3000, 
  height = 3000, 
  depth = 450,
  damperType = 'rack-pinion',
  damperTypeName = 'Rack & Pinion Sliding-Flap Damper',
  actuatorType = 'electric',
  bladeAction = 'single-sliding',
  sealingEfficiency = '99.5%',
  designTemp = 'ambient',
  designPressure = '±500 mmWg',
  flangeType = 'Both Ends Flanged (IS 2062)',
  numberOfBlades = 12,
  opposedBlades = true,
  // Detailed Multi-Blade Geometry Parameters
  bladeType = 'Flat single-skin sheet blade',
  bladeOrientation = 'Horizontal',
  bladeChord = 165,
  bladeLength = 2900,
  bladeDepth = 25,
  bladeThick = 1.6,
  bladePitch = 150,
  sections = 1,
  sideClearance = 5,
  endClearance = 5,
  shaftDiameter = 16,
  foldAngle = 45,
  flangeLeft = 20,
  flangeRight = 20,
  edgeReturn = 8,
  webWidth = 100,
  numBends = 4,
  frontSkinThick = 1.6,
  rearSkinThick = 1.6,
  overallBladeDepth = 30,
  internalStiffenerCount = 2,
  aerofoilMaxThick = 25,
  aerofoilCamber = 0,
  customProfileShape = 'Z-profile',
  // Rack & Pinion / Disc Blade & Gate geometry
  gateThickness = 6.0,
  gateStiffenerCount = 4,
  gateStiffenerType = 'Channel ISMC 75',
  gateRackCount = 2,
  discThickness = 10.0,
  discShaftDiameter = 45.0,
  // Valve Parameters
  valveType = 'butterfly_valve',
  valveTypeName = 'High-Performance Butterfly Valve',
  valveSizeDn = 300,
  valveSizeInch = '12"',
  valvePressureRating = 'PN 16',
  valveEndConnection = 'Wafer',
  valveBodyMoc = 'WCB (Cast Carbon Steel ASTM A216)',
  valveTrimMoc = 'CF8M (Cast Stainless Steel SS316)',
  valveSeatMoc = 'PTFE / RTFE',
  valveActuator = 'Electric Quarter-Turn Actuator',
  selectedPartKey: controlledSelectedPartKey = null,
  onSelectPart = null,
}) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const damperGroupRef = useRef(null);
  const movingPartsRef = useRef([]);
  const pinionShaftRef = useRef(null);

  // References for Part Identification & 3D Hotspot Projection
  const anchorsRef = useRef({});          // maps partKey -> { pos: Vector3, obj?: Object3D, offset?: Vector3 }
  const badgeRefs = useRef({});            // maps partKey -> HTML element
  const materialsMapRef = useRef(new Map()); // maps partKey -> Material
  const partMeshesRef = useRef({});        // maps partKey -> Mesh[]
  const prevPropsRef = useRef(null);
  const modifiedPartsRef = useRef({});

  // UI Interactive States
  const [flapOpen, setFlapOpen] = useState(30); // % open
  const [wireframe, setWireframe] = useState(false);
  const [showDimensions, setShowDimensions] = useState(true);
  const [bladeOnlyMode, setBladeOnlyMode] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [labelFilter, setLabelFilter] = useState('all'); // 'all' | 'modified'
  const [internalSelectedPartKey, setInternalSelectedPartKey] = useState(null);
  const selectedPartKey = controlledSelectedPartKey !== null && controlledSelectedPartKey !== undefined 
    ? controlledSelectedPartKey 
    : internalSelectedPartKey;
  const setSelectedPartKey = setInternalSelectedPartKey;
  const [highlightedPartKey, setHighlightedPartKey] = useState(null);
  const [modifiedParts, setModifiedParts] = useState({});
  const [lastChangeNotice, setLastChangeNotice] = useState(null);

  const isValve = productCategory === 'valve';
  const normAction = (bladeAction || '').toLowerCase();
  const isDisc = normAction.includes('disc') || (damperTypeName && damperTypeName.toLowerCase().includes('butterfly'));
  const isMultiBlade = damperType === 'multi_blade' || damperType === 'louver' || damperType === 'multi-blade' || normAction.includes('parallel') || normAction.includes('opposed');
  const isEstimatedProfile = bladeType.toLowerCase().includes('aerofoil') || bladeType.toLowerCase().includes('custom');
  const isRackPinion = !isMultiBlade && !isDisc && !isValve;
  const vType = (valveType || '').toLowerCase();

  // Sync ref for animation loop
  useEffect(() => {
    modifiedPartsRef.current = modifiedParts;
  }, [modifiedParts]);

  // ═════════════════════════════════════════════════════════════════
  // 1. SPECIFICATION DICTIONARIES FOR PARTS IN MODEL
  // ═════════════════════════════════════════════════════════════════
  const activePartsList = useMemo(() => {
    if (isValve) {
      return [
        {
          key: 'valve_body',
          name: 'Valve Body / Shell',
          category: 'Pressure Retaining',
          spec: `DN${valveSizeDn} (${valveSizeInch}) • ${valvePressureRating} • ${valveBodyMoc.split(' ')[0]}`,
          desc: `Pressure-retaining valve body designed to withstand line pressure with ${valveEndConnection} mounting.`,
          color: '#3b82f6',
        },
        {
          key: 'valve_trim',
          name: vType.includes('knife') ? 'Knife Gate Blade' : vType.includes('ball') ? 'Solid Ball Sphere' : 'Offset Disc Blade',
          category: 'Closure Trim',
          spec: `Trim MOC: ${valveTrimMoc.split(' ')[0]} • Precision Ground`,
          desc: 'Primary flow modulating / isolation element providing bidirectional or unidirectional tight shut-off.',
          color: '#f89030',
        },
        {
          key: 'valve_seat',
          name: 'Sealing Seat Ring',
          category: 'Sealing Member',
          spec: `Seat: ${valveSeatMoc}`,
          desc: 'Precision sealing seat ring engineered for bubble-tight closure and wear resistance.',
          color: '#06b6d4',
        },
        {
          key: 'valve_stem',
          name: 'Drive Stem / Shaft',
          category: 'Mechanical Drive',
          spec: `Drive Stem Spindle (${valveTrimMoc.split(' ')[0]})`,
          desc: 'Torque transmission spindle connected to the actuator with high-integrity gland packing.',
          color: '#64748b',
        },
        {
          key: 'valve_yoke',
          name: 'Mounting Yoke / Pad',
          category: 'Actuator Interface',
          spec: 'ISO 5211 Standardized Pad',
          desc: 'Heavy-duty mounting bracket and gland housing for seamless direct-mount actuation.',
          color: '#475569',
        },
        {
          key: 'valve_actuator',
          name: 'Actuator / Operator',
          category: 'Actuation',
          spec: `${valveActuator}`,
          desc: 'Direct-mounted actuator driving quarter-turn or linear travel with positioning feedback.',
          color: '#005daa',
        },
        {
          key: 'valve_flange',
          name: 'Flange Lugs & Holes',
          category: 'Pipe Connection',
          spec: `${valveEndConnection} • ${valvePressureRating} Rating`,
          desc: 'Standardized bolt circle and alignment lugs for pipeline flange clamping.',
          color: '#0f172a',
        },
      ];
    } else {
      // Dampers
      const list = [
        {
          key: 'frame',
          name: 'Casing / Frame',
          category: 'Structural',
          spec: `${width} × ${height} × ${depth} mm Duct Casing`,
          desc: 'Heavy-gauge formed steel channel casing engineered to resist ductwork pressures and thermal loads.',
          color: '#475569',
        },
        {
          key: 'flanges',
          name: 'Peripheral Flanges',
          category: 'Connection',
          spec: `${flangeType}`,
          desc: 'Peripheral matching flanges for direct bolting to plant ducting.',
          color: '#64748b',
        },
        {
          key: 'blades',
          name: isMultiBlade ? 'Louver Blades Assembly' : isDisc ? 'Butterfly Disc Blade' : 'Sliding Gate Blade',
          category: 'Flow Regulating',
          spec: isMultiBlade 
            ? `${numberOfBlades} Blades • Chord ${bladeChord}mm • ${bladeThick}mm Thk • ${opposedBlades ? 'Opposed' : 'Parallel'}`
            : isDisc
            ? `Circular Disc • ${discThickness}mm Plate`
            : `${gateThickness}mm Plate • ${gateStiffenerCount} Stiffeners (${gateStiffenerType})`,
          desc: 'Primary flow modulating / isolation barrier designed for minimum deflection and high aerodynamic stability.',
          color: '#f89030',
        },
        {
          key: 'shaft',
          name: isMultiBlade ? 'Through-Shafts & Bearings' : isDisc ? 'Central Spindle' : 'Drive Pinion Shaft',
          category: 'Transmission',
          spec: isMultiBlade 
            ? `Ø${shaftDiameter}mm Shafts with Bushed Bearings` 
            : isDisc 
            ? `Ø${discShaftDiameter}mm Spindle Shaft`
            : 'Pinion Shaft with Hardened Gears',
          desc: 'Precision machined drive shafting transmitting actuator torque across the blade span.',
          color: '#334155',
        },
        {
          key: 'linkage',
          name: isMultiBlade ? 'Interconnecting Linkage' : 'Dual Rack Mechanism',
          category: 'Synchronization',
          spec: isMultiBlade 
            ? `${opposedBlades ? 'Opposed' : 'Parallel'} Action Tie-Bar` 
            : `${gateRackCount} Machine-Cut Precision Racks`,
          desc: 'External mechanical drive synchronization guaranteeing uniform blade travel without binding.',
          color: '#0f172a',
        },
        {
          key: 'actuator',
          name: 'Actuator Drive Unit',
          category: 'Actuation',
          spec: `${actuatorType.toUpperCase()} Actuator Drive`,
          desc: 'Heavy-duty industrial drive mechanism providing precise modulating or isolation torque.',
          color: '#005daa',
        },
        {
          key: 'seals',
          name: 'Gas-Tight Seals',
          category: 'Sealing Strip',
          spec: `${sealingEfficiency} Sealing Efficiency`,
          desc: 'Perimeter landing and blade edge sealing strips preventing flue gas leakage.',
          color: '#dc2626',
        },
      ];
      return bladeOnlyMode ? list.filter(p => p.key === 'blades' || p.key === 'shaft') : list;
    }
  }, [
    isValve, width, height, depth, flangeType, isMultiBlade, isDisc, numberOfBlades,
    bladeChord, bladeThick, opposedBlades, discThickness, gateThickness, gateStiffenerCount,
    gateStiffenerType, shaftDiameter, discShaftDiameter, gateRackCount, actuatorType,
    sealingEfficiency, valveSizeDn, valveSizeInch, valvePressureRating, valveBodyMoc,
    valveEndConnection, vType, valveTrimMoc, valveSeatMoc, valveActuator, bladeOnlyMode
  ]);

  // ═════════════════════════════════════════════════════════════════
  // 2. PARAMETER CHANGE DETECTION (TRACKS WHAT CHANGED & WHERE)
  // ═════════════════════════════════════════════════════════════════
  useEffect(() => {
    const propPartMap = {
      // Damper Props
      width: { partKey: 'frame', label: 'Duct Width', format: v => `${v} mm` },
      height: { partKey: 'frame', label: 'Duct Height', format: v => `${v} mm` },
      depth: { partKey: 'frame', label: 'Casing Depth', format: v => `${v} mm` },
      flangeType: { partKey: 'flanges', label: 'Flange Type', format: v => String(v) },
      damperType: { partKey: 'frame', label: 'Damper Type', format: v => String(v) },
      numberOfBlades: { partKey: 'blades', label: 'Blade Count', format: v => `${v} blades` },
      bladeThick: { partKey: 'blades', label: 'Blade Thickness', format: v => `${v} mm` },
      bladeChord: { partKey: 'blades', label: 'Blade Chord', format: v => `${v} mm` },
      bladeType: { partKey: 'blades', label: 'Blade Profile', format: v => String(v) },
      bladeOrientation: { partKey: 'blades', label: 'Orientation', format: v => String(v) },
      bladePitch: { partKey: 'blades', label: 'Blade Pitch', format: v => `${v} mm` },
      opposedBlades: { partKey: 'blades', label: 'Blade Action', format: v => v ? 'Opposed' : 'Parallel' },
      bladeLength: { partKey: 'blades', label: 'Blade Span', format: v => `${v} mm` },
      bladeAction: { partKey: 'blades', label: 'Blade Action', format: v => String(v) },
      shaftDiameter: { partKey: 'shaft', label: 'Shaft Diameter', format: v => `Ø${v} mm` },
      actuatorType: { partKey: 'actuator', label: 'Actuator', format: v => String(v).toUpperCase() },
      sealingEfficiency: { partKey: 'seals', label: 'Seal Rating', format: v => String(v) },
      gateThickness: { partKey: 'blades', label: 'Gate Thickness', format: v => `${v} mm` },
      gateStiffenerCount: { partKey: 'blades', label: 'Gate Stiffeners', format: v => `${v} channels` },
      gateRackCount: { partKey: 'linkage', label: 'Gear Racks', format: v => `${v} racks` },
      discThickness: { partKey: 'blades', label: 'Disc Thickness', format: v => `${v} mm` },
      discShaftDiameter: { partKey: 'shaft', label: 'Disc Spindle', format: v => `Ø${v} mm` },

      // Valve Props
      valveSizeDn: { partKey: 'valve_body', label: 'Valve Size', format: v => `DN${v}` },
      valvePressureRating: { partKey: 'valve_body', label: 'Pressure Rating', format: v => String(v) },
      valveEndConnection: { partKey: 'valve_flange', label: 'Connection', format: v => String(v) },
      valveBodyMoc: { partKey: 'valve_body', label: 'Body MOC', format: v => String(v).split(' ')[0] },
      valveTrimMoc: { partKey: 'valve_trim', label: 'Trim MOC', format: v => String(v).split(' ')[0] },
      valveSeatMoc: { partKey: 'valve_seat', label: 'Seat Material', format: v => String(v) },
      valveActuator: { partKey: 'valve_actuator', label: 'Valve Actuator', format: v => String(v).split(' ')[0] },
      valveType: { partKey: 'valve_body', label: 'Valve Type', format: v => String(v) },
    };

    const currentSnapshot = {
      productCategory, width, height, depth, damperType, damperTypeName,
      actuatorType, bladeAction, sealingEfficiency, designTemp, designPressure,
      flangeType, numberOfBlades, opposedBlades, bladeType, bladeOrientation,
      bladeChord, bladeLength, bladeDepth, bladeThick, bladePitch, sections,
      shaftDiameter, gateThickness, gateStiffenerCount, gateStiffenerType,
      gateRackCount, discThickness, discShaftDiameter, valveType, valveTypeName,
      valveSizeDn, valvePressureRating, valveEndConnection, valveBodyMoc,
      valveTrimMoc, valveSeatMoc, valveActuator
    };

    if (prevPropsRef.current) {
      const prev = prevPropsRef.current;
      let detectedNotice = null;

      for (const [propName, meta] of Object.entries(propPartMap)) {
        if (prev[propName] !== undefined && currentSnapshot[propName] !== undefined && prev[propName] !== currentSnapshot[propName]) {
          const isDamperProp = !propName.startsWith('valve');
          if ((isValve && isDamperProp) || (!isValve && !isDamperProp)) {
            continue;
          }

          const fromVal = meta.format(prev[propName]);
          const toVal = meta.format(currentSnapshot[propName]);
          const partItem = activePartsList.find(p => p.key === meta.partKey);

          detectedNotice = {
            partKey: meta.partKey,
            partName: partItem ? partItem.name : meta.partKey,
            label: meta.label,
            from: fromVal,
            to: toVal,
            timestamp: Date.now()
          };
          break;
        }
      }

      if (detectedNotice) {
        setHighlightedPartKey(detectedNotice.partKey);
        setLastChangeNotice(detectedNotice);
        setModifiedParts(prevMod => ({
          ...prevMod,
          [detectedNotice.partKey]: detectedNotice
        }));

        // Keep highlight active for 7 seconds
        const timer = setTimeout(() => {
          setHighlightedPartKey(null);
        }, 7000);
        return () => clearTimeout(timer);
      }
    }

    prevPropsRef.current = currentSnapshot;
  }, [
    productCategory, width, height, depth, damperType, damperTypeName,
    actuatorType, bladeAction, sealingEfficiency, designTemp, designPressure,
    flangeType, numberOfBlades, opposedBlades, bladeType, bladeOrientation,
    bladeChord, bladeLength, bladeDepth, bladeThick, bladePitch, sections,
    shaftDiameter, gateThickness, gateStiffenerCount, gateStiffenerType,
    gateRackCount, discThickness, discShaftDiameter, valveType, valveTypeName,
    valveSizeDn, valvePressureRating, valveEndConnection, valveBodyMoc,
    valveTrimMoc, valveSeatMoc, valveActuator, activePartsList, isValve
  ]);

  // Center / Focus Camera directly onto a selected part
  const handleFocusPart = (partKey) => {
    setInternalSelectedPartKey(partKey);
    const anchorData = anchorsRef.current[partKey];
    if (anchorData && controlsRef.current && cameraRef.current) {
      const targetPos = new THREE.Vector3();
      if (anchorData.obj) {
        anchorData.obj.getWorldPosition(targetPos);
      } else if (anchorData.pos) {
        targetPos.copy(anchorData.pos);
      }
      controlsRef.current.target.copy(targetPos);
      controlsRef.current.update();
    }
    const partObj = activePartsList.find((p) => p.key === partKey);
    if (onSelectPart) {
      onSelectPart(partKey, partObj);
    }
  };

  // Clear part selection and restore clean full assembly view
  const handleClearSelection = () => {
    setInternalSelectedPartKey(null);
    setHighlightedPartKey(null);
    if (controlsRef.current) {
      const h = isValve ? ((valveSizeDn || 300) / 1000) * 1.5 : (height || 3000) / 1000;
      controlsRef.current.target.set(0, h / 2, 0);
      controlsRef.current.update();
    }
    if (onSelectPart) {
      onSelectPart(null, null);
    }
  };

  // Sync external controlled selection
  useEffect(() => {
    if (controlledSelectedPartKey) {
      const anchorData = anchorsRef.current[controlledSelectedPartKey];
      if (anchorData && controlsRef.current && cameraRef.current) {
        const targetPos = new THREE.Vector3();
        if (anchorData.obj) {
          anchorData.obj.getWorldPosition(targetPos);
        } else if (anchorData.pos) {
          targetPos.copy(anchorData.pos);
        }
        controlsRef.current.target.copy(targetPos);
        controlsRef.current.update();
      }
    }
  }, [controlledSelectedPartKey]);

  // ═════════════════════════════════════════════════════════════════
  // 3. THREE.JS INITIALIZATION & 60FPS ANCHOR PROJECTION LOOP
  // ═════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const isDark = document.documentElement.classList.contains('dark');
    scene.background = new THREE.Color(isDark ? 0x0f172a : 0xf1f5f9);

    const themeObserver = new MutationObserver(() => {
      const darkNow = document.documentElement.classList.contains('dark');
      if (sceneRef.current) {
        sceneRef.current.background = new THREE.Color(darkNow ? 0x0f172a : 0xf1f5f9);
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(4.8, 3.2, 5.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.4, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight1.position.set(6, 10, 8);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xb4b0d8, 0.65);
    dirLight2.position.set(-6, -4, -6);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x7c5cfa, 0.5, 10);
    pointLight.position.set(0, 3, 3);
    scene.add(pointLight);

    // Ground Grid
    const grid = new THREE.GridHelper(10, 20, 0x94a3b8, 0xcfd8dc);
    grid.position.y = -0.01;
    scene.add(grid);

    // Animation & Projection Loop
    let animationId;
    const tempVec = new THREE.Vector3();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();

      // Project 3D Component Anchor to 2D HTML Callout Badge (ONLY for active selected part)
      if (container && cameraRef.current) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        const cam = cameraRef.current;
        const activeHighlightKey = selectedPartKey || highlightedPartKey;

        // Hide any non-active callout badges so they don't clutter the 3D space
        Object.keys(badgeRefs.current).forEach((k) => {
          if (badgeRefs.current[k] && k !== activeHighlightKey) {
            badgeRefs.current[k].style.opacity = '0';
            badgeRefs.current[k].style.visibility = 'hidden';
          }
        });

        // Project single callout badge for the selected part ONLY
        if (activeHighlightKey && anchorsRef.current[activeHighlightKey]) {
          const anchorData = anchorsRef.current[activeHighlightKey];
          const badgeEl = badgeRefs.current[activeHighlightKey];
          if (badgeEl) {
            if (anchorData.obj) {
              anchorData.obj.getWorldPosition(tempVec);
              if (anchorData.offset) tempVec.add(anchorData.offset);
            } else if (anchorData.pos) {
              tempVec.copy(anchorData.pos);
            }

            tempVec.project(cam);

            const isFront = tempVec.z < 1.0;
            const screenX = (tempVec.x * 0.5 + 0.5) * w;
            const screenY = -(tempVec.y * 0.5 - 0.5) * h;

            if (isFront && screenX >= 10 && screenX <= w - 10 && screenY >= 10 && screenY <= h - 10) {
              badgeEl.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`;
              badgeEl.style.opacity = '1';
              badgeEl.style.visibility = 'visible';
            } else {
              badgeEl.style.opacity = '0';
              badgeEl.style.visibility = 'hidden';
            }
          }
        }

        // Luminous Glow on Selected Part + Subdued Ghost Dimming on Unselected Parts
        const now = Date.now();
        const pulse = 0.7 + 0.3 * Math.sin(now * 0.007);

        materialsMapRef.current.forEach((mat, key) => {
          if (activeHighlightKey) {
            if (key === activeHighlightKey) {
              const isMod = modifiedPartsRef.current && modifiedPartsRef.current[key];
              mat.emissive.setHex(isMod ? 0xf89030 : 0x00f0ff); // Radiant electric cyan
              mat.emissiveIntensity = pulse;
              mat.transparent = false;
              mat.opacity = 1.0;
              mat.depthWrite = true;
            } else {
              // Dim & ghost unselected components so the selected part stands out with complete clarity
              mat.emissive.setHex(0x000000);
              mat.emissiveIntensity = 0;
              mat.transparent = true;
              mat.opacity = 0.28;
              mat.depthWrite = false;
            }
          } else {
            // Pristine solid engineering materials when no part is selected
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.depthWrite = true;
          }
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    // 3D Canvas Click Handler via Raycaster (Select part on click, deselect on empty background)
    const handleCanvasClick = (e) => {
      if (!container || !cameraRef.current || !damperGroupRef.current) return;
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const intersects = raycaster.intersectObjects(damperGroupRef.current.children, true);
      if (intersects.length > 0) {
        for (const hit of intersects) {
          let cur = hit.object;
          while (cur && cur !== damperGroupRef.current) {
            if (cur.userData && cur.userData.partKey) {
              handleFocusPart(cur.userData.partKey);
              return;
            }
            cur = cur.parent;
          }
        }
      } else {
        // Clicked outside on empty canvas -> clear selection and restore full clean model
        handleClearSelection();
      }
    };
    const domEl = renderer.domElement;
    domEl.addEventListener('click', handleCanvasClick);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      domEl.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('resize', handleResize);
      if (themeObserver) {
        themeObserver.disconnect();
      }
      cancelAnimationFrame(animationId);
      renderer.dispose();
      controls.dispose();
    };
  }, [selectedPartKey, highlightedPartKey]);

  // Helper to create specific cross-section blade geometries
  const createBladeGeometry = (spanM, chordM, thickM, profType) => {
    const pType = profType.toLowerCase();

    if (pType.includes('aerofoil')) {
      const shape = new THREE.Shape();
      const c = chordM;
      const maxT = Math.max(0.015, (bladeDepth || 25) / 1000);
      const pts = 24;
      shape.moveTo(0, 0);
      for (let i = 0; i <= pts; i++) {
        const x = (i / pts) * c;
        const yt = 5 * maxT * (
          0.2969 * Math.sqrt(Math.max(0, x / c)) -
          0.1260 * (x / c) -
          0.3516 * Math.pow(x / c, 2) +
          0.2843 * Math.pow(x / c, 3) -
          0.1015 * Math.pow(x / c, 4)
        );
        shape.lineTo(x - c / 2, yt);
      }
      for (let i = pts; i >= 0; i--) {
        const x = (i / pts) * c;
        const yt = 5 * maxT * (
          0.2969 * Math.sqrt(Math.max(0, x / c)) -
          0.1260 * (x / c) -
          0.3516 * Math.pow(x / c, 2) +
          0.2843 * Math.pow(x / c, 3) -
          0.1015 * Math.pow(x / c, 4)
        );
        shape.lineTo(x - c / 2, -yt);
      }
      shape.closePath();

      const extrudeSettings = { steps: 1, depth: spanM, bevelEnabled: false };
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.rotateY(Math.PI / 2);
      geo.translate(-spanM / 2, 0, 0);
      return geo;

    } else if (pType.includes('folded')) {
      const shape = new THREE.Shape();
      const wM = (webWidth || 100) / 1000;
      const flM = (flangeLeft || 20) / 1000;
      const frM = (flangeRight || 20) / 1000;
      const rad = ((foldAngle || 45) * Math.PI) / 180;
      const t = Math.max(0.002, thickM);

      const dLeft = flM * Math.sin(rad);
      const lLeft = flM * Math.cos(rad);
      const dRight = frM * Math.sin(rad);
      const lRight = frM * Math.cos(rad);

      shape.moveTo(-wM / 2 - lLeft, dLeft);
      shape.lineTo(-wM / 2, 0);
      shape.lineTo(wM / 2, 0);
      shape.lineTo(wM / 2 + lRight, -dRight);
      shape.lineTo(wM / 2 + lRight, -dRight - t);
      shape.lineTo(wM / 2, -t);
      shape.lineTo(-wM / 2, -t);
      shape.lineTo(-wM / 2 - lLeft, dLeft - t);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: spanM, bevelEnabled: false });
      geo.rotateY(Math.PI / 2);
      geo.translate(-spanM / 2, 0, 0);
      return geo;

    } else if (pType.includes('custom')) {
      const shape = new THREE.Shape();
      const c = chordM;
      const d = Math.max(0.015, (bladeDepth || 25) / 1000);
      const t = Math.max(0.002, thickM);

      shape.moveTo(-c / 2, d / 2);
      shape.lineTo(-c / 4, d / 2);
      shape.lineTo(c / 4, -d / 2);
      shape.lineTo(c / 2, -d / 2);
      shape.lineTo(c / 2, -d / 2 + t);
      shape.lineTo(c / 4 + t, -d / 2 + t);
      shape.lineTo(-c / 4 + t, d / 2 - t);
      shape.lineTo(-c / 2, d / 2 - t);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { steps: 1, depth: spanM, bevelEnabled: false });
      geo.rotateY(Math.PI / 2);
      geo.translate(-spanM / 2, 0, 0);
      return geo;

    } else {
      // Standard Flat single-skin plate
      const geo = new THREE.BoxGeometry(spanM, chordM, Math.max(0.003, thickM));
      return geo;
    }
  };

  // Helper to build actuator model
  const buildActuatorMesh = (type, posX, posY, posZ, actMat, mechanicalMat) => {
    const actGroup = new THREE.Group();
    actGroup.position.set(posX, posY, posZ);

    const normType = (type || '').toLowerCase();

    if (normType.includes('pneumatic') || normType.includes('cylinder')) {
      // Cylindrical Pneumatic Double Acting Actuator
      const cylBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.42, 24),
        actMat
      );
      cylBody.rotation.z = Math.PI / 2;
      actGroup.add(cylBody);

      const endCap1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.05, 24),
        mechanicalMat
      );
      endCap1.rotation.z = Math.PI / 2;
      endCap1.position.x = -0.21;
      actGroup.add(endCap1);

      const endCap2 = endCap1.clone();
      endCap2.position.x = 0.21;
      actGroup.add(endCap2);

      // Yellow limit switch box on top
      const lsBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.08, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.3, roughness: 0.4 })
      );
      lsBox.position.set(0, 0.16, 0);
      actGroup.add(lsBox);

      // Visual Beacon Position Indicator
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.04, 16),
        new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.2, roughness: 0.3 })
      );
      beacon.position.set(0, 0.22, 0);
      actGroup.add(beacon);

    } else if (normType.includes('manual') || normType.includes('gearbox') || normType.includes('handwheel')) {
      // Manual Worm Gearbox with Handwheel
      const gearBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.18, 0.22),
        actMat
      );
      actGroup.add(gearBox);

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.22, 16),
        mechanicalMat
      );
      shaft.rotation.z = Math.PI / 2;
      shaft.position.x = 0.16;
      actGroup.add(shaft);

      // Red Handwheel
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.018, 16, 32),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.6, roughness: 0.3 })
      );
      torus.rotation.y = Math.PI / 2;
      torus.position.x = 0.26;
      actGroup.add(torus);

      const spoke1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.015, 0.34, 0.015),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.6, roughness: 0.3 })
      );
      spoke1.position.x = 0.26;
      actGroup.add(spoke1);

    } else {
      // Electric Multi-Turn / Quarter-Turn Actuator (Rotork/Auma Style)
      const motorHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.32, 0.26),
        actMat
      );
      actGroup.add(motorHousing);

      // Terminal / Display Compartment
      const displayPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.12, 0.04),
        mechanicalMat
      );
      displayPanel.position.set(0, 0.05, 0.14);
      actGroup.add(displayPanel);

      const lcdScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.09, 0.06),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      lcdScreen.position.set(0, 0.05, 0.161);
      actGroup.add(lcdScreen);

      // Manual declutchable handwheel on side
      const handwheel = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.014, 16, 24),
        mechanicalMat
      );
      handwheel.rotation.y = Math.PI / 2;
      handwheel.position.x = 0.17;
      actGroup.add(handwheel);
    }

    return actGroup;
  };

  // ═════════════════════════════════════════════════════════════════
  // 4. BUILD 3D CAD MODEL (DAMPER & VALVE) WITH PART TAGGING
  // ═════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    if (damperGroupRef.current) {
      scene.remove(damperGroupRef.current);
      damperGroupRef.current.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
    }

    movingPartsRef.current = [];
    pinionShaftRef.current = null;
    anchorsRef.current = {};
    partMeshesRef.current = {};
    materialsMapRef.current.clear();

    const damperGroup = new THREE.Group();
    damperGroupRef.current = damperGroup;

    // Helper to register parts for Raycasting, Emissive Highlighting, and 3D Anchor Callouts
    const tagPart = (obj, partKey, partName) => {
      if (!obj) return;
      obj.userData = { ...(obj.userData || {}), partKey, partName };
      if (!partMeshesRef.current[partKey]) {
        partMeshesRef.current[partKey] = [];
      }
      obj.traverse((child) => {
        if (child.isMesh) {
          child.userData = { ...(child.userData || {}), partKey, partName };
          partMeshesRef.current[partKey].push(child);
        }
      });
    };

    // Dedicated CAD Materials for Each Component Category
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x475569, metalness: 0.85, roughness: 0.25, wireframe: wireframe
    });
    const flangeMat = new THREE.MeshStandardMaterial({
      color: 0x334155, metalness: 0.85, roughness: 0.25, wireframe: wireframe
    });
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xf89030, metalness: 0.65, roughness: 0.3, wireframe: wireframe
    });
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8, metalness: 0.95, roughness: 0.15, wireframe: wireframe
    });
    const linkageMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, metalness: 0.9, roughness: 0.2, wireframe: wireframe
    });
    const actuatorMat = new THREE.MeshStandardMaterial({
      color: 0x005daa, metalness: 0.75, roughness: 0.3, wireframe: wireframe
    });
    const sealMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, metalness: 0.2, roughness: 0.7, wireframe: wireframe
    });

    const bodyValveMat = new THREE.MeshStandardMaterial({
      color: valveBodyMoc.includes('CF8M') ? 0x94a3b8 : (valveBodyMoc.includes('GGG40') ? 0x334155 : 0x1e3a5f),
      metalness: 0.85, roughness: 0.25, wireframe: wireframe
    });
    const trimValveMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, metalness: 0.95, roughness: 0.15, wireframe: wireframe
    });
    const seatValveMat = new THREE.MeshStandardMaterial({
      color: valveSeatMoc.includes('Metal') ? 0xd97706 : (valveSeatMoc.includes('EPDM') ? 0x0f172a : 0x38bdf8),
      metalness: 0.5, roughness: 0.4, wireframe: wireframe
    });
    const stemValveMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc, metalness: 0.9, roughness: 0.2, wireframe: wireframe
    });
    const yokeValveMat = new THREE.MeshStandardMaterial({
      color: 0x475569, metalness: 0.8, roughness: 0.3, wireframe: wireframe
    });

    // Register materials in map for emissive pulsing
    if (isValve) {
      materialsMapRef.current.set('valve_body', bodyValveMat);
      materialsMapRef.current.set('valve_trim', trimValveMat);
      materialsMapRef.current.set('valve_seat', seatValveMat);
      materialsMapRef.current.set('valve_stem', stemValveMat);
      materialsMapRef.current.set('valve_yoke', yokeValveMat);
      materialsMapRef.current.set('valve_actuator', actuatorMat);
      materialsMapRef.current.set('valve_flange', flangeMat);
    } else {
      materialsMapRef.current.set('frame', frameMat);
      materialsMapRef.current.set('flanges', flangeMat);
      materialsMapRef.current.set('blades', bladeMat);
      materialsMapRef.current.set('shaft', shaftMat);
      materialsMapRef.current.set('linkage', linkageMat);
      materialsMapRef.current.set('actuator', actuatorMat);
      materialsMapRef.current.set('seals', sealMat);
    }

    // ═════════════════════════════════════════════════════════════════
    // BRANCH A: INDUSTRIAL VALVE 3D CAD MODEL
    // ═════════════════════════════════════════════════════════════════
    if (isValve) {
      const dn = Math.max(50, valveSizeDn || 300);
      const dnM = dn / 1000.0;
      const radiusM = dnM / 2;
      const f2fM = Math.max(0.05, (dn * 0.28) / 1000);
      const flangeOuterRadiusM = radiusM * 1.5;
      const vGroup = new THREE.Group();

      if (vType.includes('knife') || vType.includes('gate')) {
        // ─────────────────────────────────────────────────────────────
        // 1. KNIFE GATE VALVE (Linear Rising Beveled Blade)
        // ─────────────────────────────────────────────────────────────
        const chestWidth = radiusM * 2.6;
        const chestHeight = radiusM * 2.8;
        const chestDepth = f2fM;

        // Cast Chest Body
        const chestBody = new THREE.Mesh(
          new THREE.BoxGeometry(chestWidth, chestHeight, chestDepth),
          bodyValveMat
        );
        chestBody.position.set(0, chestHeight / 2, 0);
        vGroup.add(chestBody);
        tagPart(chestBody, 'valve_body', 'Valve Body / Shell');

        const boreRim = new THREE.Mesh(
          new THREE.CylinderGeometry(radiusM * 1.15, radiusM * 1.15, chestDepth * 1.05, 32),
          bodyValveMat
        );
        boreRim.rotation.x = Math.PI / 2;
        boreRim.position.set(0, radiusM * 1.15, 0);
        vGroup.add(boreRim);
        tagPart(boreRim, 'valve_body', 'Valve Body / Shell');

        anchorsRef.current['valve_body'] = {
          pos: new THREE.Vector3(-chestWidth * 0.52, chestHeight * 0.55, chestDepth / 2)
        };

        // Inner Seat Ring
        const seatRing = new THREE.Mesh(
          new THREE.TorusGeometry(radiusM, 0.02, 16, 32),
          seatValveMat
        );
        seatRing.position.set(0, radiusM * 1.15, 0);
        vGroup.add(seatRing);
        tagPart(seatRing, 'valve_seat', 'Sealing Seat Ring');
        anchorsRef.current['valve_seat'] = {
          pos: new THREE.Vector3(radiusM * 0.75, radiusM * 1.15 + radiusM * 0.7, chestDepth / 2)
        };

        // Stainless Steel Knife Gate Blade (Moving Part)
        const bladeHeight = radiusM * 2.5;
        const bladeWidth = radiusM * 2.1;
        const bladeThickM = Math.max(0.008, dnM * 0.02);

        const bladeGroup = new THREE.Group();
        const bladeMesh = new THREE.Mesh(
          new THREE.BoxGeometry(bladeWidth, bladeHeight, bladeThickM),
          trimValveMat
        );
        bladeMesh.position.set(0, bladeHeight / 2, 0);
        bladeMesh.castShadow = true;
        bladeGroup.add(bladeMesh);

        // Beveled Knife Bottom Edge
        const bevelMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.002, bladeThickM, bladeWidth, 4),
          trimValveMat
        );
        bevelMesh.rotation.z = Math.PI / 2;
        bevelMesh.position.set(0, 0, 0);
        bladeGroup.add(bevelMesh);

        bladeGroup.position.set(0, 0.02, 0);
        vGroup.add(bladeGroup);
        tagPart(bladeGroup, 'valve_trim', 'Knife Gate Blade');

        anchorsRef.current['valve_trim'] = {
          obj: bladeGroup,
          offset: new THREE.Vector3(0, bladeHeight * 0.45, bladeThickM / 2 + 0.02)
        };

        // Yoke Gland Box & Top Plate
        const glandBox = new THREE.Mesh(
          new THREE.BoxGeometry(chestWidth * 0.9, 0.08, chestDepth * 1.2),
          yokeValveMat
        );
        glandBox.position.set(0, chestHeight + 0.04, 0);
        vGroup.add(glandBox);
        tagPart(glandBox, 'valve_yoke', 'Mounting Yoke / Pad');

        [-chestWidth * 0.35, chestWidth * 0.35].forEach((rx) => {
          const yokeRod = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, radiusM * 2.2, 16),
            stemValveMat
          );
          yokeRod.position.set(rx, chestHeight + radiusM * 1.1, 0);
          vGroup.add(yokeRod);
          tagPart(yokeRod, 'valve_stem', 'Drive Stem / Shaft');
        });

        anchorsRef.current['valve_stem'] = {
          pos: new THREE.Vector3(-chestWidth * 0.35, chestHeight + radiusM * 1.1, 0)
        };

        const topPlate = new THREE.Mesh(
          new THREE.BoxGeometry(chestWidth * 0.8, 0.04, 0.22),
          yokeValveMat
        );
        topPlate.position.set(0, chestHeight + radiusM * 2.2, 0);
        vGroup.add(topPlate);
        tagPart(topPlate, 'valve_yoke', 'Mounting Yoke / Pad');

        anchorsRef.current['valve_yoke'] = {
          pos: new THREE.Vector3(chestWidth * 0.45, chestHeight + 0.04, chestDepth / 2)
        };

        // Actuator
        const actMesh = buildActuatorMesh(valveActuator, 0, chestHeight + radiusM * 2.45, 0, actuatorMat, linkageMat);
        vGroup.add(actMesh);
        tagPart(actMesh, 'valve_actuator', 'Actuator / Operator');
        anchorsRef.current['valve_actuator'] = {
          pos: new THREE.Vector3(0, chestHeight + radiusM * 2.55, 0.15)
        };

        movingPartsRef.current.push({
          type: 'knife-gate',
          object: bladeGroup,
          totalTravel: radiusM * 2.1,
        });

      } else {
        // ─────────────────────────────────────────────────────────────
        // 2. BUTTERFLY VALVE / BALL VALVE (Quarter-Turn Rotary)
        // ─────────────────────────────────────────────────────────────
        // Cylindrical Body
        const bodyCyl = new THREE.Mesh(
          new THREE.CylinderGeometry(flangeOuterRadiusM, flangeOuterRadiusM, f2fM, 36),
          bodyValveMat
        );
        bodyCyl.rotation.x = Math.PI / 2;
        bodyCyl.position.set(0, flangeOuterRadiusM, 0);
        bodyCyl.castShadow = true;
        vGroup.add(bodyCyl);
        tagPart(bodyCyl, 'valve_body', 'Valve Body / Shell');

        const innerBoreRing = new THREE.Mesh(
          new THREE.CylinderGeometry(radiusM, radiusM, f2fM + 0.005, 36),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 })
        );
        innerBoreRing.rotation.x = Math.PI / 2;
        innerBoreRing.position.set(0, flangeOuterRadiusM, 0);
        vGroup.add(innerBoreRing);

        anchorsRef.current['valve_body'] = {
          pos: new THREE.Vector3(-flangeOuterRadiusM * 0.85, flangeOuterRadiusM * 1.35, f2fM / 2)
        };

        // Flange Bolt Lugs
        const numLugs = dn >= 350 ? 16 : 8;
        for (let i = 0; i < numLugs; i++) {
          const angle = (i / numLugs) * Math.PI * 2;
          const lx = Math.cos(angle) * (flangeOuterRadiusM * 0.88);
          const ly = flangeOuterRadiusM + Math.sin(angle) * (flangeOuterRadiusM * 0.88);

          const holeLiner = new THREE.Mesh(
            new THREE.CylinderGeometry(0.016, 0.016, f2fM + 0.01, 12),
            flangeMat
          );
          holeLiner.rotation.x = Math.PI / 2;
          holeLiner.position.set(lx, ly, 0);
          vGroup.add(holeLiner);
          tagPart(holeLiner, 'valve_flange', 'Flange Lugs & Holes');
        }

        anchorsRef.current['valve_flange'] = {
          pos: new THREE.Vector3(flangeOuterRadiusM * 0.88, flangeOuterRadiusM * 0.88, f2fM / 2)
        };

        // Resilient/Metal Seat Ring
        const seatRing = new THREE.Mesh(
          new THREE.TorusGeometry(radiusM * 0.98, 0.018, 16, 36),
          seatValveMat
        );
        seatRing.position.set(0, flangeOuterRadiusM, 0);
        vGroup.add(seatRing);
        tagPart(seatRing, 'valve_seat', 'Sealing Seat Ring');
        anchorsRef.current['valve_seat'] = {
          pos: new THREE.Vector3(radiusM * 0.72, flangeOuterRadiusM + radiusM * 0.72, 0.02)
        };

        // Rotating Disc / Ball Trim (Moving Part)
        const discGroup = new THREE.Group();
        discGroup.position.set(0, flangeOuterRadiusM, 0);

        if (vType.includes('ball')) {
          const ballSphere = new THREE.Mesh(
            new THREE.SphereGeometry(radiusM * 0.96, 32, 24),
            trimValveMat
          );
          ballSphere.castShadow = true;
          discGroup.add(ballSphere);

          const ballBore = new THREE.Mesh(
            new THREE.CylinderGeometry(radiusM * 0.7, radiusM * 0.7, radiusM * 2.1, 24),
            linkageMat
          );
          ballBore.rotation.x = Math.PI / 2;
          discGroup.add(ballBore);
        } else {
          // Triple Offset Butterfly Disc Blade
          const discPlate = new THREE.Mesh(
            new THREE.CylinderGeometry(radiusM * 0.95, radiusM * 0.95, Math.max(0.015, dnM * 0.06), 36),
            trimValveMat
          );
          discPlate.rotation.x = Math.PI / 2;
          discPlate.castShadow = true;
          discGroup.add(discPlate);

          const hub = new THREE.Mesh(
            new THREE.CylinderGeometry(radiusM * 0.22, radiusM * 0.22, radiusM * 1.8, 24),
            trimValveMat
          );
          discGroup.add(hub);
        }

        vGroup.add(discGroup);
        tagPart(discGroup, 'valve_trim', 'Offset Disc Blade');
        anchorsRef.current['valve_trim'] = {
          obj: discGroup,
          offset: new THREE.Vector3(0, 0, 0.02)
        };

        // Drive Stem Shaft
        const stemHeight = flangeOuterRadiusM * 0.9;
        const stemMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.024, 0.024, stemHeight + 0.1, 20),
          stemValveMat
        );
        stemMesh.position.set(0, flangeOuterRadiusM + radiusM + stemHeight / 2, 0);
        vGroup.add(stemMesh);
        tagPart(stemMesh, 'valve_stem', 'Drive Stem / Shaft');
        anchorsRef.current['valve_stem'] = {
          pos: new THREE.Vector3(0.04, flangeOuterRadiusM + radiusM + stemHeight * 0.45, 0)
        };

        // Neck & ISO 5211 Pad
        const neck = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.1, stemHeight, 20),
          bodyValveMat
        );
        neck.position.set(0, flangeOuterRadiusM + radiusM + stemHeight / 2 - 0.02, 0);
        vGroup.add(neck);

        const isoPad = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.03, 0.24),
          yokeValveMat
        );
        isoPad.position.set(0, flangeOuterRadiusM + radiusM + stemHeight, 0);
        vGroup.add(isoPad);
        tagPart(isoPad, 'valve_yoke', 'Mounting Yoke / Pad');
        anchorsRef.current['valve_yoke'] = {
          pos: new THREE.Vector3(-0.14, flangeOuterRadiusM + radiusM + stemHeight, 0)
        };

        // Actuator
        const actMesh = buildActuatorMesh(
          valveActuator,
          0,
          flangeOuterRadiusM + radiusM + stemHeight + 0.2,
          0,
          actuatorMat,
          linkageMat
        );
        vGroup.add(actMesh);
        tagPart(actMesh, 'valve_actuator', 'Actuator / Operator');
        anchorsRef.current['valve_actuator'] = {
          pos: new THREE.Vector3(0, flangeOuterRadiusM + radiusM + stemHeight + 0.35, 0.15)
        };

        movingPartsRef.current.push({
          type: 'rotating-disc',
          object: discGroup,
        });
      }

      damperGroup.add(vGroup);
      scene.add(damperGroup);

      if (controlsRef.current && cameraRef.current) {
        controlsRef.current.target.set(0, flangeOuterRadiusM, 0);
        cameraRef.current.position.set(flangeOuterRadiusM * 2.2, flangeOuterRadiusM * 2.0, flangeOuterRadiusM * 2.8);
        controlsRef.current.update();
      }
      return;
    }

    // ═════════════════════════════════════════════════════════════════
    // BRANCH B: INDUSTRIAL DAMPER 3D CAD MODEL
    // ═════════════════════════════════════════════════════════════════
    const w = (width || 3000) / 1000;
    const h = (height || 3000) / 1000;
    const d = (depth || 450) / 1000;
    const wallThick = 0.05;
    const flangeWidth = 0.12;
    const flangeThick = 0.025;

    // 1. Frame Assembly
    if (!bladeOnlyMode) {
      const topFrame = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * wallThick, wallThick, d), frameMat);
      topFrame.position.set(0, h + wallThick / 2, 0);
      topFrame.castShadow = true;
      damperGroup.add(topFrame);
      tagPart(topFrame, 'frame', 'Casing / Frame');

      const botFrame = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * wallThick, wallThick, d), frameMat);
      botFrame.position.set(0, -wallThick / 2, 0);
      botFrame.castShadow = true;
      damperGroup.add(botFrame);
      tagPart(botFrame, 'frame', 'Casing / Frame');

      const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), frameMat);
      leftFrame.position.set(-w / 2 - wallThick / 2, h / 2, 0);
      leftFrame.castShadow = true;
      damperGroup.add(leftFrame);
      tagPart(leftFrame, 'frame', 'Casing / Frame');

      const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, d), frameMat);
      rightFrame.position.set(w / 2 + wallThick / 2, h / 2, 0);
      rightFrame.castShadow = true;
      damperGroup.add(rightFrame);
      tagPart(rightFrame, 'frame', 'Casing / Frame');

      anchorsRef.current['frame'] = {
        pos: new THREE.Vector3(-w / 2 - wallThick, h * 0.85, d / 2)
      };

      // Peripheral Flanges
      [-d / 2, d / 2].forEach((zPos) => {
        const topFlange = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * flangeWidth, flangeWidth, flangeThick), flangeMat);
        topFlange.position.set(0, h + flangeWidth / 2, zPos);
        damperGroup.add(topFlange);
        tagPart(topFlange, 'flanges', 'Peripheral Flanges');

        const botFlange = new THREE.Mesh(new THREE.BoxGeometry(w + 2 * flangeWidth, flangeWidth, flangeThick), flangeMat);
        botFlange.position.set(0, -flangeWidth / 2, zPos);
        damperGroup.add(botFlange);
        tagPart(botFlange, 'flanges', 'Peripheral Flanges');

        const leftFlange = new THREE.Mesh(new THREE.BoxGeometry(flangeWidth, h + 2 * flangeWidth, flangeThick), flangeMat);
        leftFlange.position.set(-w / 2 - flangeWidth / 2, h / 2, zPos);
        damperGroup.add(leftFlange);
        tagPart(leftFlange, 'flanges', 'Peripheral Flanges');

        const rightFlange = new THREE.Mesh(new THREE.BoxGeometry(flangeWidth, h + 2 * flangeWidth, flangeThick), flangeMat);
        rightFlange.position.set(w / 2 + flangeWidth / 2, h / 2, zPos);
        damperGroup.add(rightFlange);
        tagPart(rightFlange, 'flanges', 'Peripheral Flanges');
      });

      anchorsRef.current['flanges'] = {
        pos: new THREE.Vector3(w / 3, h + flangeWidth * 0.8, d / 2 + 0.02)
      };

      // Air/Gas Sealing Strip Perimeter
      const sealMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.015, 0.02), sealMat);
      sealMesh.position.set(0, h - 0.01, 0);
      damperGroup.add(sealMesh);
      tagPart(sealMesh, 'seals', 'Gas-Tight Seals');
      anchorsRef.current['seals'] = {
        pos: new THREE.Vector3(0, h - 0.01, 0.03)
      };
    }

    // 2. Central Disc (Butterfly Damper)
    if (isDisc) {
      const discGroup = new THREE.Group();
      discGroup.position.set(0, h / 2, 0);

      const discRad = Math.min(w, h) / 2 * 0.96;
      const dThkM = Math.max(0.008, (discThickness || 10.0) / 1000);
      const sDiaM = Math.max(0.025, (discShaftDiameter || 45.0) / 1000);

      const discMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(discRad, discRad, dThkM, 36),
        bladeMat
      );
      discMesh.rotation.x = Math.PI / 2;
      discMesh.castShadow = true;
      discGroup.add(discMesh);
      tagPart(discMesh, 'blades', 'Butterfly Disc Blade');

      const spindle = new THREE.Mesh(
        new THREE.CylinderGeometry(sDiaM / 2, sDiaM / 2, w + 0.35, 24),
        shaftMat
      );
      spindle.rotation.z = Math.PI / 2;
      discGroup.add(spindle);
      tagPart(spindle, 'shaft', 'Central Spindle');

      damperGroup.add(discGroup);
      movingPartsRef.current.push({ type: 'rotating-disc', object: discGroup });

      anchorsRef.current['blades'] = {
        obj: discGroup,
        offset: new THREE.Vector3(0, 0, 0.03)
      };
      anchorsRef.current['shaft'] = {
        pos: new THREE.Vector3(w / 2 - 0.08, h / 2, 0)
      };

      if (!bladeOnlyMode) {
        const actGroup = buildActuatorMesh(actuatorType, w / 2 + 0.28, h / 2, 0, actuatorMat, linkageMat);
        damperGroup.add(actGroup);
        tagPart(actGroup, 'actuator', 'Actuator Drive Unit');
        anchorsRef.current['actuator'] = {
          pos: new THREE.Vector3(w / 2 + 0.38, h / 2, 0.15)
        };
      }

    } else if (isMultiBlade) {
      // 3. Multi-Blade Louvered Damper
      const isVertical = bladeOrientation === 'Vertical';
      const nSec = Math.max(1, sections || 1);
      const numBlades = Math.max(2, numberOfBlades || 12);

      const singleSpanM = bladeLength ? (bladeLength / 1000) : (w / nSec - 0.02);
      const chordM = (bladeChord || 165) / 1000;
      const thickM = (bladeThick || 1.6) / 1000;
      const depthM = (overallBladeDepth || bladeDepth || 30) / 1000;
      const shaftDiaM = (shaftDiameter || 16) / 1000;

      const isDoubleSkin = bladeType.toLowerCase().includes('double-skin');
      const stackAxisTotal = isVertical ? w : h;
      const bladeMeshes = [];

      const renderSections = bladeOnlyMode ? 1 : nSec;
      const renderBladeCount = bladeOnlyMode ? 1 : numBlades;

      for (let s = 0; s < renderSections; s++) {
        const secCenterX = bladeOnlyMode ? 0 : (-w / 2 + ((s + 0.5) * w) / nSec);

        for (let i = 0; i < renderBladeCount; i++) {
          const bladePosAlongStack = bladeOnlyMode ? 0 : ((stackAxisTotal / numBlades) * (i + 0.5));
          const bladePivot = new THREE.Group();

          if (bladeOnlyMode) {
            bladePivot.position.set(0, 0, 0);
          } else if (!isVertical) {
            bladePivot.position.set(secCenterX, bladePosAlongStack, 0);
          } else {
            bladePivot.position.set(bladePosAlongStack - w / 2, h / 2, 0);
          }

          if (isDoubleSkin) {
            const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(singleSpanM, chordM, frontSkinThick / 1000), bladeMat);
            frontPlate.position.set(0, 0, -depthM / 2);
            frontPlate.castShadow = true;
            bladePivot.add(frontPlate);

            const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(singleSpanM, chordM, rearSkinThick / 1000), bladeMat);
            rearPlate.position.set(0, 0, depthM / 2);
            rearPlate.castShadow = true;
            bladePivot.add(rearPlate);

            const topCap = new THREE.Mesh(new THREE.BoxGeometry(singleSpanM, 0.004, depthM), linkageMat);
            topCap.position.set(0, chordM / 2, 0);
            bladePivot.add(topCap);

            const botCap = new THREE.Mesh(new THREE.BoxGeometry(singleSpanM, 0.004, depthM), linkageMat);
            botCap.position.set(0, -chordM / 2, 0);
            bladePivot.add(botCap);

            const nStiff = Math.max(1, internalStiffenerCount);
            for (let stIdx = 0; stIdx < nStiff; stIdx++) {
              const stY = -chordM / 3 + (stIdx * (chordM * 2 / 3)) / Math.max(1, nStiff - 1);
              const stiffBar = new THREE.Mesh(new THREE.BoxGeometry(singleSpanM, 0.004, depthM * 0.8), linkageMat);
              stiffBar.position.set(0, stY, 0);
              bladePivot.add(stiffBar);
            }
          } else {
            const bladeGeo = createBladeGeometry(singleSpanM, chordM, thickM, bladeType);
            const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
            bladeMesh.castShadow = true;
            bladePivot.add(bladeMesh);
          }

          tagPart(bladePivot, 'blades', 'Louver Blades Assembly');

          // Through-Shaft
          const shaftLen = singleSpanM + 0.15;
          const shaft = new THREE.Mesh(new THREE.CylinderGeometry(shaftDiaM / 2, shaftDiaM / 2, shaftLen, 16), shaftMat);
          if (!isVertical) shaft.rotation.z = Math.PI / 2;
          bladePivot.add(shaft);
          tagPart(shaft, 'shaft', 'Through-Shafts & Bearings');

          // Frame bearings
          [-singleSpanM / 2, singleSpanM / 2].forEach((endX) => {
            const bush = new THREE.Mesh(new THREE.CylinderGeometry(shaftDiaM * 0.9, shaftDiaM * 0.9, 0.025, 16), linkageMat);
            bush.rotation.z = Math.PI / 2;
            bush.position.set(endX, 0, 0);
            bladePivot.add(bush);
            tagPart(bush, 'shaft', 'Through-Shafts & Bearings');
          });

          // Crank Levers on drive side
          if (!bladeOnlyMode && s === nSec - 1) {
            const isOpp = normAction.includes('opposed') || opposedBlades;
            const leverDir = (isOpp && i % 2 === 1) ? -1 : 1;
            const lever = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.09, 0.012), linkageMat);
            lever.position.set(singleSpanM / 2 + 0.05, leverDir * 0.045, 0);
            bladePivot.add(lever);
            tagPart(lever, 'linkage', 'Interconnecting Linkage');
          }

          damperGroup.add(bladePivot);
          bladeMeshes.push(bladePivot);
        }
      }

      // External Interconnecting Linkage & Actuator
      if (!bladeOnlyMode) {
        const isOpp = normAction.includes('opposed') || opposedBlades;
        const linkBar = new THREE.Mesh(new THREE.BoxGeometry(0.012, h * 0.9, 0.015), linkageMat);
        linkBar.position.set(w / 2 + 0.08, h / 2, 0);
        damperGroup.add(linkBar);
        tagPart(linkBar, 'linkage', 'Interconnecting Linkage');

        if (isOpp) {
          const linkBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.012, h * 0.9, 0.015), linkageMat);
          linkBar2.position.set(w / 2 + 0.08, h / 2, 0.035);
          damperGroup.add(linkBar2);
          tagPart(linkBar2, 'linkage', 'Interconnecting Linkage');
        }

        const actGroup = buildActuatorMesh(actuatorType, w / 2 + 0.34, h / 2, 0, actuatorMat, linkageMat);
        damperGroup.add(actGroup);
        tagPart(actGroup, 'actuator', 'Actuator Drive Unit');
        anchorsRef.current['actuator'] = {
          pos: new THREE.Vector3(w / 2 + 0.44, h / 2, 0.15)
        };
      }

      anchorsRef.current['blades'] = {
        pos: new THREE.Vector3(0, h / 2, 0.04)
      };
      anchorsRef.current['shaft'] = {
        pos: new THREE.Vector3(w / 2 - 0.04, h / 2, 0)
      };
      anchorsRef.current['linkage'] = {
        pos: new THREE.Vector3(w / 2 + 0.08, h * 0.65, 0)
      };

      movingPartsRef.current.push({ 
        type: 'rotating-blades', 
        objects: bladeMeshes, 
        opposed: normAction.includes('opposed') || opposedBlades,
        isVertical: isVertical
      });

    } else {
      // 4. Rack & Pinion Sliding-Gate Damper Flap
      const gThkM = Math.max(0.006, (gateThickness || 6.0) / 1000);
      const flapGroup = new THREE.Group();

      const bladePlate = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, h * 1.05, gThkM), bladeMat);
      bladePlate.position.set(0, h / 2, 0);
      bladePlate.castShadow = true;
      flapGroup.add(bladePlate);

      // Flap stiffener channels across face
      const nStiffeners = Math.max(1, gateStiffenerCount || Math.floor(h / 0.6));
      for (let i = 1; i <= nStiffeners; i++) {
        const stY = (h / (nStiffeners + 1)) * i;
        const st = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.045, 0.038), frameMat);
        st.position.set(0, stY, gThkM / 2 + 0.019);
        flapGroup.add(st);
      }

      // Vertical precision gear racks
      const nRacks = Math.max(2, gateRackCount || 2);
      for (let i = 0; i < nRacks; i++) {
        const rackX = -w / 2 + ((i + 1) * w) / (nRacks + 1);
        const rack = new THREE.Mesh(new THREE.BoxGeometry(0.04, h * 0.92, 0.03), linkageMat);
        rack.position.set(rackX, h / 2, gThkM / 2 + 0.02);
        flapGroup.add(rack);
      }

      damperGroup.add(flapGroup);
      tagPart(flapGroup, 'blades', 'Sliding Gate Blade');
      anchorsRef.current['blades'] = {
        obj: flapGroup,
        offset: new THREE.Vector3(0, h / 2, gThkM / 2 + 0.03)
      };
      anchorsRef.current['linkage'] = {
        pos: new THREE.Vector3(w / 4, h * 0.6, gThkM / 2 + 0.05)
      };

      movingPartsRef.current.push({ type: 'sliding-gate', object: flapGroup, totalTravel: h * 0.95 });

      // Drive Pinion Shaft
      const pinionShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, w + 0.45, 24),
        shaftMat
      );
      pinionShaft.rotation.z = Math.PI / 2;
      pinionShaft.position.set(0, h + 0.08, gThkM / 2 + 0.04);
      damperGroup.add(pinionShaft);
      pinionShaftRef.current = pinionShaft;
      tagPart(pinionShaft, 'shaft', 'Drive Pinion Shaft');

      anchorsRef.current['shaft'] = {
        pos: new THREE.Vector3(0, h + 0.08, gThkM / 2 + 0.08)
      };

      if (!bladeOnlyMode) {
        const actGroup = buildActuatorMesh(actuatorType, w / 2 + wallThick + 0.35, h + 0.16, gThkM / 2 + 0.04, actuatorMat, linkageMat);
        damperGroup.add(actGroup);
        tagPart(actGroup, 'actuator', 'Actuator Drive Unit');
        anchorsRef.current['actuator'] = {
          pos: new THREE.Vector3(w / 2 + wallThick + 0.45, h + 0.16, gThkM / 2 + 0.15)
        };
      }
    }

    scene.add(damperGroup);

    if (controlsRef.current) {
      if (bladeOnlyMode) {
        controlsRef.current.target.set(0, 0, 0);
        if (cameraRef.current) cameraRef.current.position.set(0.6, 0.5, 0.8);
      } else {
        controlsRef.current.target.set(0, h / 2, 0);
      }
      controlsRef.current.update();
    }
  }, [
    productCategory, width, height, depth, damperType, damperTypeName, wireframe, numberOfBlades, opposedBlades,
    bladeAction, actuatorType, sealingEfficiency, designTemp, designPressure, flangeType,
    bladeType, bladeOrientation, bladeChord, bladeLength, bladeDepth, bladeThick,
    bladePitch, sections, sideClearance, endClearance, shaftDiameter, foldAngle, flangeLeft,
    flangeRight, edgeReturn, webWidth, numBends, frontSkinThick, rearSkinThick,
    overallBladeDepth, internalStiffenerCount, aerofoilMaxThick, aerofoilCamber, customProfileShape, bladeOnlyMode,
    gateThickness, gateStiffenerCount, gateStiffenerType, gateRackCount, discThickness, discShaftDiameter,
    valveType, valveTypeName, valveSizeDn, valvePressureRating, valveEndConnection, valveBodyMoc, valveTrimMoc, valveSeatMoc, valveActuator
  ]);

  // Synchronize rotation & travel with flapOpen slider (0% to 100%)
  useEffect(() => {
    if (!movingPartsRef.current || movingPartsRef.current.length === 0) return;

    movingPartsRef.current.forEach((part) => {
      if (part.type === 'sliding-gate' && part.object) {
        const travel = (flapOpen / 100) * part.totalTravel;
        part.object.position.y = travel;
      } else if (part.type === 'knife-gate' && part.object) {
        const travel = (flapOpen / 100) * part.totalTravel;
        part.object.position.y = travel;
      } else if (part.type === 'rotating-blades' && part.objects) {
        const rad = (flapOpen / 100) * (Math.PI / 2);
        part.objects.forEach((bladeObj, idx) => {
          const dir = (part.opposed && idx % 2 === 1) ? -1 : 1;
          if (part.isVertical) bladeObj.rotation.y = dir * rad;
          else bladeObj.rotation.x = dir * rad;
        });
      } else if (part.type === 'rotating-disc' && part.object) {
        const rad = (flapOpen / 100) * (Math.PI / 2);
        part.object.rotation.y = rad;
      }
    });

    if (pinionShaftRef.current) {
      pinionShaftRef.current.rotation.x = (flapOpen / 100) * Math.PI * 4;
    }
  }, [flapOpen]);

  // Camera Presets
  const setCameraView = (view) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const h = isValve ? ((valveSizeDn || 300) / 1000) * 1.5 : (height || 3000) / 1000;
    const maxDim = isValve ? ((valveSizeDn || 300) / 1000) * 2 : Math.max(width, height, depth) / 1000;
    const dist = maxDim * 1.8;

    if (view === 'front') {
      cameraRef.current.position.set(0, h / 2, dist);
      controlsRef.current.target.set(0, h / 2, 0);
    } else if (view === 'side') {
      cameraRef.current.position.set(dist, h / 2, 0);
      controlsRef.current.target.set(0, h / 2, 0);
    } else if (view === 'top') {
      cameraRef.current.position.set(0, h + dist * 0.9, 0.01);
      controlsRef.current.target.set(0, h / 2, 0);
    } else {
      cameraRef.current.position.set(dist * 0.7, h / 2 + dist * 0.5, dist * 0.8);
      controlsRef.current.target.set(0, h / 2, 0);
    }
    controlsRef.current.update();
  };

  const selectedPart = activePartsList.find(p => p.key === selectedPartKey);
  const selectedMod = selectedPartKey ? modifiedParts[selectedPartKey] : null;

  return (
    <div className="relative w-full h-[540px] sm:h-[590px] image-stage rounded-2xl overflow-hidden border border-border-subtle shadow-lg flex flex-col font-sans select-none">
      
      {/* 3D WebGL Canvas Viewport */}
      <div 
        ref={containerRef} 
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" 
      />

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 5. MINIMALIST 3D CALLOUT (ONLY for the actively selected part) */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {selectedPart && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          <div
            ref={(el) => (badgeRefs.current[selectedPart.key] = el)}
            className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-all duration-150 will-change-transform flex items-center group cursor-pointer"
            style={{ opacity: 0 }}
          >
            {/* 3D Pin Target */}
            <div className="relative flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg bg-accent ring-4 ring-accent-text/40 flex items-center justify-center animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <div className="absolute w-7 h-7 rounded-full bg-accent-text opacity-40 animate-ping pointer-events-none" />
            </div>

            {/* Clean Floating Tag */}
            <div className="ml-2 px-3 py-1.5 rounded-xl shadow-xl border backdrop-blur-md bg-elevated/95 text-text-primary border-border-strong ring-2 ring-focus-ring/20 text-left select-none flex items-center gap-2">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider font-mono text-accent-text">
                  {selectedPart.name}
                </div>
                <div className="text-[10px] text-text-secondary font-medium leading-tight truncate max-w-[200px]">
                  {selectedPart.spec}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearSelection();
                }}
                className="text-text-muted hover:text-text-primary p-0.5 rounded-md hover:bg-surface"
                title="Deselect"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 6. MINIMALIST CAD MODEL BADGE (TOP-LEFT)                      */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <div className="absolute top-3 left-3 bg-surface/90 backdrop-blur-md border border-border-subtle rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-2 z-10 pointer-events-none">
        <span className={`w-2 h-2 rounded-full ${isValve ? 'bg-warning' : 'bg-accent-text'} animate-pulse`} />
        <span className="font-extrabold text-xs text-text-primary font-mono uppercase tracking-tight">
          {isValve ? (valveTypeName || 'Industrial Valve') : damperTypeName}
        </span>
        <span className="text-[10px] text-text-muted font-mono">
          • {isValve ? `DN${valveSizeDn} (${valveSizeInch})` : `${width}×${height}×${depth}mm`}
        </span>
      </div>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 7. COMPACT PART SELECTOR (TOP-RIGHT)                          */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {selectedPart && (
          <div className="flex items-center gap-1.5 bg-accent text-accent-contrast px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-contrast animate-ping" />
            <span className="truncate max-w-[130px]">{selectedPart.name}</span>
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-accent-contrast/80 hover:text-accent-contrast p-0.5 rounded hover:bg-surface/20 ml-0.5"
              title="Clear Selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <select
          value={selectedPartKey || ''}
          onChange={(e) => {
            if (e.target.value) handleFocusPart(e.target.value);
            else handleClearSelection();
          }}
          className="bg-surface/90 backdrop-blur-md text-text-primary border border-border-subtle text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer hover:bg-elevated focus:outline-none focus:ring-2 focus:ring-focus-ring"
        >
          <option value="">Inspect Part...</option>
          {activePartsList.map((part) => (
            <option key={part.key} value={part.key}>
              {part.name}
            </option>
          ))}
        </select>
      </div>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* 8. SLEEK MINIMALIST BOTTOM TOOLBAR                            */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <div className="absolute bottom-3 left-3 right-3 bg-surface/90 backdrop-blur-md border border-border-subtle rounded-xl px-4 py-2 shadow-sm flex flex-wrap items-center justify-between gap-3 z-10">
        
        {/* Travel / Opening Slider */}
        <div className="flex items-center gap-2.5 min-w-[180px]">
          <span className="text-xs font-bold text-text-primary font-mono flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-accent-text" />
            <span>{isValve ? 'Travel:' : 'Flap:'}</span>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={flapOpen}
            onChange={(e) => setFlapOpen(Number(e.target.value))}
            className="w-24 sm:w-28 accent-accent cursor-pointer"
          />
          <span className="text-xs font-mono font-bold text-accent-text min-w-[32px]">
            {flapOpen}%
          </span>
        </div>

        {/* Camera Views & Wireframe */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedPartKey && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-accent hover:bg-accent-hover text-accent-contrast transition-colors cursor-pointer shadow-xs"
            >
              Show Full Assembly
            </button>
          )}

          {['iso', 'front', 'side', 'top'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setCameraView(v)}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-elevated hover:bg-surface text-text-primary transition-colors uppercase cursor-pointer border border-border-subtle"
            >
              {v}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setWireframe(!wireframe)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
              wireframe 
                ? 'bg-accent text-accent-contrast border-accent' 
                : 'bg-elevated text-text-primary border-border-subtle hover:bg-surface'
            }`}
          >
            Wireframe
          </button>
        </div>
      </div>
    </div>
  );
}
