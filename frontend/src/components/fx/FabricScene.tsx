import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Scène WebGL : un drapé de tissu (kaki → bleu ciel → bleu nuit) qui ondule et réagit à la souris.
 * Chargée à la demande (lazy) et seulement sur les appareils capables — voir canRender3D().
 */

const vertex = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  varying vec2 vUv;
  varying float vWave;
  varying vec3 vPos;

  void main() {
    vUv = uv;
    vec3 p = position;
    float t = uTime * 0.6;
    // Plis du tissu : plusieurs vagues superposées
    float w = sin(p.x * 2.2 + t) * 0.18
            + sin(p.y * 3.1 + t * 1.3) * 0.12
            + sin((p.x + p.y) * 4.0 + t * 0.7) * 0.05;
    // La souris soulève le tissu localement
    float d = distance(uv, uMouse);
    w += smoothstep(0.45, 0.0, d) * 0.35;
    p.z += w;
    vWave = w;
    vPos = p;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  varying vec3 vPos;

  void main() {
    vec3 kaki = vec3(0.77, 0.71, 0.54);
    vec3 ciel = vec3(0.61, 0.78, 0.91);
    vec3 nuit = vec3(0.11, 0.16, 0.29);
    float g = vUv.x + sin(vUv.y * 3.0 + uTime * 0.2) * 0.08;
    vec3 col = mix(kaki, ciel, smoothstep(0.15, 0.55, g));
    col = mix(col, nuit, smoothstep(0.55, 0.95, g));

    // Éclairage satiné calculé à partir de la normale réelle de la surface
    vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
    vec3 light = normalize(vec3(-0.4, 0.6, 0.9));
    float diff = clamp(dot(n, light), 0.0, 1.0);
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float spec = pow(clamp(dot(reflect(-light, n), viewDir), 0.0, 1.0), 24.0);
    col = col * (0.45 + diff * 0.7) + spec * 0.35;

    // Bords fondus pour se mêler à la photo du hero
    float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x)
               * smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.78, vUv.y);
    gl_FragColor = vec4(col, edge * 0.92);
  }
`;

export default function FabricScene({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.1, 50);
    camera.position.set(0, 0, 5.6);

    const uniforms = { uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(0.5, 0.5) } };
    const material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms, transparent: true, side: THREE.DoubleSide });
    const geometry = new THREE.PlaneGeometry(4.2, 3, 160, 120);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.set(-0.35, 0.45, -0.12);
    scene.add(mesh);

    const target = new THREE.Vector2(0.5, 0.5);
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    const onResize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    // Ne calcule rien quand la scène n'est pas visible (hors écran ou onglet caché)
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uMouse.value.lerp(target, 0.05);
      mesh.rotation.y = 0.45 + (uniforms.uMouse.value.x - 0.5) * 0.25;
      mesh.rotation.x = -0.35 + (uniforms.uMouse.value.y - 0.5) * 0.15;
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      ro.disconnect();
      io.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className={className} aria-hidden />;
}
