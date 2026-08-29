import React, { useEffect, useRef, useState } from 'react';

export const BinaryBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('securewatch_system_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.binaryMatrixBg === 'boolean') return parsed.binaryMatrixBg;
      } catch (e) {
        // ignore
      }
    }
    return true;
  });

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((settings) => {
        if (settings && typeof settings.binaryMatrixBg === 'boolean') {
          setIsEnabled(settings.binaryMatrixBg);
        }
      })
      .catch(() => undefined);

    const handleSettingsUpdate = () => {
      const saved = localStorage.getItem('securewatch_system_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.binaryMatrixBg === 'boolean') {
            setIsEnabled(parsed.binaryMatrixBg);
          }
        } catch (e) {
          // ignore
        }
      }
    };

    window.addEventListener('system_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('system_settings_updated', handleSettingsUpdate);
  }, []);

  useEffect(() => {
    if (!isEnabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = 0;
    const fps = 24; // Smooth 24 FPS matrix speed
    const interval = 1000 / fps;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.fillStyle = '#020a12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize) + 2;
    const drops: number[] = Array.from({ length: columns }, () => Math.floor(Math.random() * -60));
    const chars = '01<>#*%X@∎';

    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2.6 + 0.7,
      speedY: -(Math.random() * 0.7 + 0.15),
      alpha: Math.random() * 0.8 + 0.2,
    }));

    const draw = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(draw);

      const delta = currentTime - lastTime;
      if (delta < interval) return;
      lastTime = currentTime - (delta % interval);

      ctx.fillStyle = 'rgba(2, 8, 14, 0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.shadowBlur = 0;
      for (let p = 0; p < particles.length; p++) {
        const pt = particles[p];
        const hue = p % 3 === 0 ? 'rgba(249,115,22,' : p % 3 === 1 ? 'rgba(56,189,248,' : 'rgba(34,197,94,';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${hue}${pt.alpha})`;
        ctx.fill();

        pt.y += pt.speedY;
        if (pt.y < 0) {
          pt.y = canvas.height;
          pt.x = Math.random() * canvas.width;
        }
      }

      ctx.font = `${fontSize}px 'SFMono-Regular', monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        const color = i % 3 === 0 ? 'rgba(249, 115, 22, 0.88)' : i % 3 === 1 ? 'rgba(96, 165, 250, 0.88)' : 'rgba(52, 211, 153, 0.78)';
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = color;
        ctx.fillText(char, x, y);

        const nextChar = chars[Math.floor(Math.random() * chars.length)];
        ctx.shadowColor = 'rgba(255,255,255,0.9)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(nextChar, x, y + fontSize);

        if (y > canvas.height && Math.random() > 0.985) {
          drops[i] = 0;
        }

        drops[i] += Math.random() > 0.75 ? 1.2 : 1;
      }
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isEnabled]);

  if (!isEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none opacity-85"
    />
  );
};


