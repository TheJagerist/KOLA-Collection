import { useRef, type ReactNode } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { cn } from '../../lib/cn';

interface Tilt3DProps {
  children: ReactNode;
  className?: string;
  /** Inclinaison maximale en degrés */
  max?: number;
  /** Reflet lumineux qui suit le pointeur */
  glare?: boolean;
  /** Échelle au survol */
  scale?: number;
  /** Classe du calque incliné (ex. arrondi identique à la carte pour le reflet) */
  innerClassName?: string;
}

/**
 * Carte inclinable en 3D : penche vers le pointeur (souris ou doigt) avec un reflet qui bouge.
 * Purement CSS (transform), donc léger — désactivé si l'utilisateur demande moins d'animations.
 */
export function Tilt3D({ children, className, innerClassName, max = 10, glare = true, scale = 1.02 }: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hover = useMotionValue(0);

  const spring = { stiffness: 220, damping: 20, mass: 0.6 };
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const s = useSpring(useTransform(hover, [0, 1], [1, scale]), spring);
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glareOpacity = useSpring(hover, spring);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.45), rgba(255,255,255,0) 55%)`;

  if (reduce) return <div className={className}>{children}</div>;

  const move = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const leave = () => {
    px.set(0.5);
    py.set(0.5);
    hover.set(0);
  };

  return (
    <div className={cn('[perspective:1000px]', className)}>
      <motion.div
        ref={ref}
        onPointerMove={move}
        onPointerEnter={() => hover.set(1)}
        onPointerLeave={leave}
        onPointerCancel={leave}
        style={{ rotateX: rx, rotateY: ry, scale: s, transformStyle: 'preserve-3d' }}
        className={cn('relative h-full will-change-transform', innerClassName)}
      >
        {children}
        {glare && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] mix-blend-overlay"
            style={{ background: glareBg, opacity: glareOpacity }}
          />
        )}
      </motion.div>
    </div>
  );
}
