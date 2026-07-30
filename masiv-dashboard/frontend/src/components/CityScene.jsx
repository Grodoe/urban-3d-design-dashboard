import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { makeProjector } from "../geo";

const ZONE_COLORS = {
  DEFAULT: 0x6f8faf,
  COMMERCIAL: 0xd98e50,
  RESIDENTIAL: 0x7fbf8f,
  MIXED: 0xb98ed9,
};

function classifyZoningFallback(zoning) {
  const z = (zoning || "").toUpperCase();
  if (["CC-X", "DC", "MU"].some((code) => z.includes(code))) return "MIXED";
  if (z.startsWith("C") || z.includes("COMM")) return "COMMERCIAL";
  if (z.startsWith("R") || z.includes("RESIDENT")) return "RESIDENTIAL";
  return "DEFAULT";
}

function colorForZoning(building) {
  const category = building?.zoning_category || classifyZoningFallback(building?.zoning);
  return ZONE_COLORS[category] ?? ZONE_COLORS.DEFAULT;
}

/**
 * Renders the extruded 3D buildings + permit marker layer using vanilla
 * Three.js (no React renderer wrapper, for full control over raycasting,
 * shadows, and the time-of-day sun).
 *
 * Props:
 *  - buildings: [{id, footprint:[[lon,lat],...], height_m, zoning, address, assessed_value, centroid}]
 *  - permits: [{id, lat, lon, address, permit_type, status, estimated_cost}]
 *  - highlightedIds: Set of building ids to highlight (from LLM query results)
 *  - showPermits: bool
 *  - onSelectBuilding(building | null)
 *  - onSelectPermit(permit | null)
 *  - sunAngle: 0-1 (time of day, drives directional light + shadows)
 */
export default function CityScene({
  buildings,
  permits,
  highlightedIds,
  showPermits,
  onSelectBuilding,
  selectedBuilding,
  onSelectPermit,
  sunAngle,
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({}); // holds three.js objects across renders without re-triggering React

  // --- one-time scene setup ---
  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0d12);
    scene.fog = new THREE.Fog(0x0b0d12, 1200, 4500);

    const camera = new THREE.PerspectiveCamera(55, width / height, 1, 5000);
    camera.position.set(120, 160, 220);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    // Increase scroll (wheel) zoom sensitivity and overall interaction speeds
    controls.zoomSpeed = 2.5;
    controls.rotateSpeed = 1.2;
    controls.panSpeed = 1.5;
    controls.maxPolarAngle = Math.PI / 2.05;

    // WASD / keyboard navigation state
    const clock = new THREE.Clock();
    const moveState = { keys: new Set(), speed: 120 }; // units per second
    // store for use in other effects
    stateRef.current.moveState = moveState;

    function isTyping() {
      const el = document.activeElement;
      return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    }

    function onKeyDown(e) {
      if (isTyping()) return;
      if (e.ctrlKey || e.metaKey) return; // never treat Ctrl/Cmd combos as movement input
      if (e.code === "Space") { moveState.keys.add("up"); e.preventDefault(); }
      else if (e.code === "KeyC") { moveState.keys.add("down"); }
      else if (e.code === "ShiftLeft" || e.code === "ShiftRight") { moveState.fast = true; }
      else if (e.code === "KeyW" || e.code === "ArrowUp") { moveState.keys.add("forward"); e.preventDefault(); }
      else if (e.code === "KeyS" || e.code === "ArrowDown") { moveState.keys.add("back"); e.preventDefault(); }
      else if (e.code === "KeyA" || e.code === "ArrowLeft") { moveState.keys.add("left"); e.preventDefault(); }
      else if (e.code === "KeyD" || e.code === "ArrowRight") { moveState.keys.add("right"); e.preventDefault(); }
    }

    function onKeyUp(e) {
      if (e.code === "Space") moveState.keys.delete("up");
      else if (e.code === "KeyC") moveState.keys.delete("down");
      else if (e.code === "ShiftLeft" || e.code === "ShiftRight") moveState.fast = false;
      else if (e.code === "KeyW" || e.code === "ArrowUp") moveState.keys.delete("forward");
      else if (e.code === "KeyS" || e.code === "ArrowDown") moveState.keys.delete("back");
      else if (e.code === "KeyA" || e.code === "ArrowLeft") moveState.keys.delete("left");
      else if (e.code === "KeyD" || e.code === "ArrowRight") moveState.keys.delete("right");
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);  
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x8fa8ff, 0x2a2f3a, 0.6);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff2d8, 1.1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -1800;    
    sun.shadow.camera.right = 1800;    
    sun.shadow.camera.top = 1800;      
    sun.shadow.camera.bottom = -1800;  
    sun.shadow.camera.far = 4000;      
    scene.add(sun);
    scene.add(sun.target);

    const groundGeo = new THREE.PlaneGeometry(20000, 20000);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x14171f });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onPointerDown(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const { buildingMeshes, permitMeshes } = stateRef.current;
      const buildingHits = raycaster.intersectObjects(buildingMeshes || [], false);
      if (buildingHits.length > 0) {
        const mesh = buildingHits[0].object;
        onSelectBuilding(mesh.userData.building);
        onSelectPermit(null);
        return;
      }
      const permitHits = raycaster.intersectObjects(permitMeshes || [], false);
      if (permitHits.length > 0) {
        onSelectPermit(permitHits[0].object.userData.permit);
        onSelectBuilding(null);
        return;
      }
      onSelectBuilding(null);
      onSelectPermit(null);
    }
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    let frameId;
    function animate() {
      frameId = requestAnimationFrame(animate);
      // apply keyboard movement
      const delta = clock.getDelta();
      const ms = moveState;
      if (ms && ms.keys && ms.keys.size > 0) {
        const v = new THREE.Vector3();
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        // keep movement on horizontal plane for forward/back/strafe
        const flatForward = new THREE.Vector3(forward.x, 0, forward.z).normalize();
        const right = new THREE.Vector3().crossVectors(flatForward, camera.up).normalize();

        if (ms.keys.has("forward")) v.add(flatForward);
        if (ms.keys.has("back")) v.sub(flatForward);
        if (ms.keys.has("right")) v.add(right);
        if (ms.keys.has("left")) v.sub(right);
        if (ms.keys.has("up")) v.y += 1;
        if (ms.keys.has("down")) v.y -= 1;

        if (v.lengthSq() > 0) {
          v.normalize();
          const speedMultiplier = ms.fast ? 3.0 : 1.0;
          v.multiplyScalar(ms.speed * speedMultiplier * delta);
          camera.position.add(v);
          // move orbit target along with camera so controls behave naturally
          controls.target.add(v);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    stateRef.current = {
      scene, camera, renderer, controls, sun,
      buildingMeshes: [], permitMeshes: [], buildingGroup: null, permitGroup: null,
    };

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- (re)build building meshes whenever data or highlights change ---
  useEffect(() => {
    const s = stateRef.current;
    if (!s.scene || !buildings || buildings.length === 0) return;

    if (s.buildingGroup) s.scene.remove(s.buildingGroup);
    const group = new THREE.Group();

    const origin = buildings[0].centroid;
    const project = makeProjector(origin.lat, origin.lon);
    const meshes = [];

    for (const b of buildings) {
      const shape = new THREE.Shape();
      b.footprint.forEach(([lon, lat], i) => {
        const [x, z] = project(lon, lat);
        if (i === 0) shape.moveTo(x, z);
        else shape.lineTo(x, z);
      });

      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: b.height_m,
        bevelEnabled: false,
      });
      // ExtrudeGeometry extrudes along Z; rotate so it extrudes upward (Y).
      geometry.rotateX(-Math.PI / 2);

      const isHighlighted = highlightedIds && highlightedIds.has(b.id);
      const baseColor = colorForZoning(b);
      const material = new THREE.MeshStandardMaterial({
        color: isHighlighted ? 0xffe066 : baseColor,
        emissive: isHighlighted ? 0x554400 : 0x000000,
        metalness: 0.1,
        roughness: 0.7,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.building = b;
      mesh.userData.originalColor = baseColor;
      group.add(mesh);
      meshes.push(mesh);
    }

    s.scene.add(group);
    s.buildingGroup = group;
    s.buildingMeshes = meshes;
    s.projectOrigin = origin;
    s.project = project;
  }, [buildings, highlightedIds]);

  // Update visuals when selection or highlights change
  useEffect(() => {
    const s = stateRef.current;
    if (!s || !s.buildingMeshes) return;
    for (const mesh of s.buildingMeshes) {
      const b = mesh.userData.building;
      const isSelected = selectedBuilding && b && (b.id === selectedBuilding.id);
      const isHighlighted = highlightedIds && b && highlightedIds.has(b.id);

      if (isSelected) {
        mesh.material.color.setHex(0xffe066);
        mesh.material.emissive.setHex(0x553300);
        mesh.scale.set(1.03, 1.03, 1.03);
      } else {
        const orig = mesh.userData.originalColor || colorForZoning(b);
        mesh.material.color.setHex(isHighlighted ? 0xffe066 : orig);
        mesh.material.emissive.setHex(0x000000);
        mesh.scale.set(1, 1, 1);
      }
    }
  }, [selectedBuilding, highlightedIds, buildings]);

  // --- (re)build permit markers whenever data or visibility toggle changes ---
  useEffect(() => {
    const s = stateRef.current;
    if (!s.scene || !s.project) return;

    if (s.permitGroup) s.scene.remove(s.permitGroup);
    if (!showPermits || !permits || permits.length === 0) {
      s.permitGroup = null;
      s.permitMeshes = [];
      return;
    }

    const group = new THREE.Group();
    const meshes = [];
    const pinGeo = new THREE.ConeGeometry(2.2, 9, 12);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xff4d4d, emissive: 0x330000 });

    for (const p of permits) {
      const [x, z] = s.project(p.lon, p.lat);
      const mesh = new THREE.Mesh(pinGeo, pinMat);
      mesh.position.set(x, 4.5, z);
      mesh.userData.permit = p;
      group.add(mesh);
      meshes.push(mesh);
    }
    s.scene.add(group);
    s.permitGroup = group;
    s.permitMeshes = meshes;
  }, [permits, showPermits]);

  // --- update sun position/shadows on time-of-day slider change ---
  useEffect(() => {
    const s = stateRef.current;
    if (!s.sun) return;
    const angle = (sunAngle ?? 0.5) * Math.PI; // 0 -> sunrise, 1 -> sunset
    const radius = 400;
    s.sun.position.set(Math.cos(angle) * radius, Math.max(Math.sin(angle) * radius, 30), 120);
    s.sun.target.position.set(0, 0, 0);
    s.sun.target.updateMatrixWorld();
    s.sun.intensity = 0.6 + 0.7 * Math.sin(Math.max(angle, 0.05));
  }, [sunAngle]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
