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
      // Initialize Deep Dark Gold/Black background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const fontSize = 15;
    const columns = Math.floor(canvas.width / fontSize) + 1;
    const drops: number[] = Array.from({ length: columns }, () => Math.floor(Math.random() * -40));
    const chars = '01010101'; // Binary Matrix sequence

    // Golden Telemetry Particles
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1.8 + 0.5,
      speedY: -(Math.random() * 0.4 + 0.1),
      alpha: Math.random() * 0.5 + 0.2,
    }));

    const draw = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(draw);

      const delta = currentTime - lastTime;
      if (delta < interval) return;
      lastTime = currentTime - (delta % interval);

      // Deep Black trail fade layer
      ctx.fillStyle = 'rgba(5, 5, 5, 0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render Floating Golden Ambient Telemetry Particles
      ctx.shadowBlur = 0;
      for (let p = 0; p < particles.length; p++) {
        const pt = particles[p];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 158, 11, ${pt.alpha})`;
        ctx.fill();

        pt.y += pt.speedY;
        if (pt.y < 0) {
          pt.y = canvas.height;
          pt.x = Math.random() * canvas.width;
        }
      }

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Draw character - Golden Amber Binary Matrix Stream
        ctx.shadowColor = 'rgba(245, 158, 11, 0.85)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = 'rgba(217, 119, 6, 0.65)'; // Amber Gold
        ctx.fillText(char, x, y);

        // Highlight head character with White & Intense Golden Glow
        const nextChar = chars[Math.floor(Math.random() * chars.length)];
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#fef3c7'; // Gold White Head
        ctx.fillText(nextChar, x, y + fontSize);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
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


