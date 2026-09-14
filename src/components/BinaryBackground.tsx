import React, { useEffect, useState } from 'react';
import oceanBackdrop from '../assets/images/dark_ocean_wallpaper_1785397034761.jpg';

export const BinaryBackground: React.FC = () => {
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

  if (!isEnabled) return null;

  return (
    <div
      aria-hidden="true"
      className="securewatch-ocean-background fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ '--securewatch-ocean-image': `url(${oceanBackdrop})` } as React.CSSProperties}
    >
      <div className="securewatch-ocean-image" />
      <div className="securewatch-ocean-rays" />
      <div className="securewatch-ocean-particles" />
      <div className="securewatch-ocean-vignette" />
    </div>
  );
};


