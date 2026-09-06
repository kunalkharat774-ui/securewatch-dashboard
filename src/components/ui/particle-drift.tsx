import { useEffect, useRef, type CSSProperties } from 'react';

type ParticleDriftMode = 'dark' | 'light';

export type ParticleDriftProps = {
  mode?: ParticleDriftMode | 'auto';
  speed?: number;
  density?: number;
  opacity?: number;
  hue?: number;
  saturation?: number;
  brightness?: number;
  className?: string;
  style?: CSSProperties;
};

type DriftParticle = {
  x: number;
  y: number;
  velocity: number;
  char: string;
};

type Beam = {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
};

const CHARACTERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*()';

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function resolveMode(mode: ParticleDriftProps['mode']): ParticleDriftMode {
  if (mode === 'light') return 'light';
  if (mode === 'auto' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

export default function ParticleDrift({
  mode = 'dark',
  speed = 1,
  density = 1,
  opacity = 1,
  hue = 0,
  saturation = 1,
  brightness = 1,
  className,
  style,
}: ParticleDriftProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let mouseX = -1000;
    let mouseY = -1000;
    const resolvedMode = resolveMode(mode);
    const safeSpeed = clamp(speed, 0, 3);
    const safeDensity = clamp(density, 0.25, 2.5);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    let particles: DriftParticle[] = [];
    let beams: Beam[] = [];

    const createScene = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const particleCount = Math.round(70 * safeDensity);
      const beamCount = Math.round(18 * safeDensity);
      particles = Array.from({ length: particleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        velocity: Math.random() * 0.35 + 0.08,
        char: CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)],
      }));
      beams = Array.from({ length: beamCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        length: Math.random() * 90 + 45,
        speed: Math.random() * 3 + 1.5,
        opacity: Math.random() * 0.35 + 0.15,
      }));
    };

    const handlePointerMove = (event: PointerEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    };
    const clearPointer = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    const render = () => {
      context.clearRect(0, 0, width, height);
      const accent = resolvedMode === 'light' ? '37, 99, 235' : '96, 165, 250';
      const neutral = resolvedMode === 'light' ? '36, 48, 68' : '156, 163, 175';
      context.globalAlpha = clamp(opacity, 0.05, 1);

      beams.forEach((beam) => {
        beam.y -= beam.speed * safeSpeed;
        if (beam.y + beam.length < 0) {
          beam.y = height + beam.length;
          beam.x = Math.random() * width;
        }
        const gradient = context.createLinearGradient(beam.x, beam.y, beam.x, beam.y + beam.length);
        gradient.addColorStop(0, `rgba(${accent}, ${beam.opacity})`);
        gradient.addColorStop(1, 'transparent');
        context.strokeStyle = gradient;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(beam.x, beam.y);
        context.lineTo(beam.x, beam.y + beam.length);
        context.stroke();
      });

      context.font = '12px monospace';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      particles.forEach((particle, index) => {
        particle.y += particle.velocity * safeSpeed;
        if (particle.y > height + 20) {
          particle.y = -20;
          particle.x = Math.random() * width;
        }
        if (Math.random() > 0.985) particle.char = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];

        const distance = Math.hypot(mouseX - particle.x, mouseY - particle.y);
        const active = distance < 170;
        context.fillStyle = active
          ? `rgba(${accent}, 0.95)`
          : `rgba(${neutral}, ${0.18 + (index % 4) * 0.07})`;
        context.fillText(particle.char, particle.x, particle.y);
      });

      context.lineWidth = 0.5;
      for (let first = 0; first < particles.length; first += 1) {
        for (let second = first + 1; second < particles.length; second += 1) {
          const source = particles[first];
          const target = particles[second];
          const distance = Math.hypot(source.x - target.x, source.y - target.y);
          if (distance < 100) {
            context.strokeStyle = `rgba(${neutral}, ${0.12 * (1 - distance / 100)})`;
            context.beginPath();
            context.moveTo(source.x, source.y);
            context.lineTo(target.x, target.y);
            context.stroke();
          }
        }
      }

      context.globalAlpha = 1;
      animationFrame = requestAnimationFrame(render);
    };

    createScene();
    render();
    window.addEventListener('resize', createScene);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', clearPointer);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', createScene);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', clearPointer);
    };
  }, [brightness, density, hue, mode, opacity, saturation, speed]);

  const filter = `hue-rotate(${hue}deg) saturate(${saturation}) brightness(${brightness})`;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1,
        opacity,
        filter,
        ...style,
      }}
    />
  );
}
