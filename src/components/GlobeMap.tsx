import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Globe from 'globe.gl';
import { Country, SelectedCountryStats, CountryAttack } from '../types';
import { CountryRealMap } from './CountryRealMap';
import satelliteBackdrop from '../assets/images/live_satellite_wallpaper_1785397567579.jpg';

export const ALL_COUNTRIES: Country[] = [
  { name: 'United States', code: 'US', lat: 37.0902, lng: -95.7129 },
  { name: 'China', code: 'CN', lat: 35.8617, lng: 104.1954 },
  { name: 'Russia', code: 'RU', lat: 61.5240, lng: 105.3188 },
  { name: 'Germany', code: 'DE', lat: 51.1657, lng: 10.4515 },
  { name: 'India', code: 'IN', lat: 20.5937, lng: 78.9629 },
  { name: 'Brazil', code: 'BR', lat: -14.2350, lng: -51.9253 },
  { name: 'United Kingdom', code: 'GB', lat: 55.3781, lng: -3.4360 },
  { name: 'Japan', code: 'JP', lat: 36.2048, lng: 138.2529 },
  { name: 'Australia', code: 'AU', lat: -25.2744, lng: 133.7751 },
  { name: 'France', code: 'FR', lat: 46.2276, lng: 2.2137 },
  { name: 'Canada', code: 'CA', lat: 56.1304, lng: -106.3468 },
  { name: 'South Korea', code: 'KR', lat: 35.9078, lng: 127.7669 },
  { name: 'South Africa', code: 'ZA', lat: -30.5595, lng: 22.9375 },
  { name: 'Saudi Arabia', code: 'SA', lat: 23.8859, lng: 45.0792 },
  { name: 'Israel', code: 'IL', lat: 31.0461, lng: 34.8516 },
  { name: 'Turkey', code: 'TR', lat: 38.9637, lng: 35.2433 },
  { name: 'Pakistan', code: 'PK', lat: 30.3753, lng: 69.3451 },
  { name: 'Mexico', code: 'MX', lat: 23.6345, lng: -102.5528 },
  { name: 'Italy', code: 'IT', lat: 41.8719, lng: 12.5674 },
  { name: 'Spain', code: 'ES', lat: 40.4637, lng: -3.7492 },
  { name: 'Singapore', code: 'SG', lat: 1.3521, lng: 103.8198 },
  { name: 'Netherlands', code: 'NL', lat: 52.1326, lng: 5.2913 },
  { name: 'Ukraine', code: 'UA', lat: 48.3794, lng: 31.1656 },
  { name: 'United Arab Emirates', code: 'AE', lat: 23.4241, lng: 53.8478 },
  { name: 'Indonesia', code: 'ID', lat: -0.7893, lng: 113.9213 },
  { name: 'Egypt', code: 'EG', lat: 26.8206, lng: 30.8025 },
  { name: 'Argentina', code: 'AR', lat: -38.4161, lng: -63.6167 },
  { name: 'Poland', code: 'PL', lat: 51.9194, lng: 19.1451 },
  { name: 'Philippines', code: 'PH', lat: 12.8797, lng: 121.7740 },
  { name: 'Vietnam', code: 'VN', lat: 14.0583, lng: 108.2772 },
  { name: 'Nigeria', code: 'NG', lat: 9.0820, lng: 8.6753 },
  { name: 'Sweden', code: 'SE', lat: 60.1282, lng: 18.6435 },
  { name: 'Thailand', code: 'TH', lat: 15.8700, lng: 100.9925 },
  { name: 'Malaysia', code: 'MY', lat: 4.2105, lng: 101.9758 },
  { name: 'Switzerland', code: 'CH', lat: 46.8182, lng: 8.2275 },
  { name: 'Belgium', code: 'BE', lat: 50.5039, lng: 4.4699 },
  { name: 'Norway', code: 'NO', lat: 60.4720, lng: 8.4689 },
  { name: 'Denmark', code: 'DK', lat: 56.2639, lng: 9.5018 },
  { name: 'Finland', code: 'FI', lat: 61.9241, lng: 25.7482 },
  { name: 'New Zealand', code: 'NZ', lat: -40.9006, lng: 174.8860 },
  { name: 'Chile', code: 'CL', lat: -35.6751, lng: -71.5430 },
  { name: 'Colombia', code: 'CO', lat: 4.5709, lng: -74.2973 },
  { name: 'Bangladesh', code: 'BD', lat: 23.6850, lng: 90.3563 },
  { name: 'Qatar', code: 'QA', lat: 25.3548, lng: 51.1839 },
  { name: 'Kenya', code: 'KE', lat: -1.2921, lng: 36.8219 },
];

const SECTORS = [
  'Financial & Banking Core',
  'Government Infrastructure',
  'Telecommunications Network',
  'Cloud Data Centers',
  'Energy & Power Grid',
  'E-Commerce Gateway',
  'Healthcare & Hospital System',
];

const ATTACK_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

interface GlobeMapProps {
  isFullScreen?: boolean;
}

export const GlobeMap: React.FC<GlobeMapProps> = ({ isFullScreen = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<any>(null);
  const countryCatalogRef = useRef<Country[]>([]);

  const [tickerText, setTickerText] = useState<string>('Waiting for verified live attack telemetry...');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedStats, setSelectedStats] = useState<SelectedCountryStats | null>(null);
  const [panelActive, setPanelActive] = useState<boolean>(false);
  const [panelTab, setPanelTab] = useState<'realmap' | 'attacks' | 'sectors' | 'mitigation'>('realmap');
  const [fullRealMapOpen, setFullRealMapOpen] = useState<boolean>(false);
  const [attackFilter, setAttackFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [searchCountry, setSearchCountry] = useState<string>('');

  const [threats, setThreats] = useState<any[]>([]);
  const [feedError, setFeedError] = useState<string | null>(null);

  const countryCatalog = useMemo(() => {
    const countries = new Map<string, Country>(ALL_COUNTRIES.map((country) => [country.code, country]));
    threats.forEach((threat) => {
      [threat.sourceCountry, threat.targetCountry].forEach((country) => {
        if (country?.code && Number.isFinite(country.lat) && Number.isFinite(country.lng)) {
          countries.set(country.code, {
            name: country.name || country.code,
            code: country.code,
            lat: Number(country.lat),
            lng: Number(country.lng),
          });
        }
      });
    });
    return Array.from(countries.values());
  }, [threats]);

  countryCatalogRef.current = countryCatalog;

  useEffect(() => {
    let cancelled = false;
    const loadThreats = async () => {
      try {
        const response = await fetch('/api/threats?limit=12');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'CyberBriefing feed unavailable');
        if (!cancelled) {
          setThreats(data.threats || []);
          setFeedError(null);
        }
      } catch (error) {
        console.error('CyberBriefing feed unavailable:', error);
        if (!cancelled) setFeedError(error instanceof Error ? error.message : 'CyberBriefing feed unavailable');
      }
    };
    loadThreats();
    const timer = window.setInterval(loadThreats, 15 * 1000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const attacksForCountry = (country: Country): CountryAttack[] => {
    const matched = threats.filter((threat) => {
      const sourceCode = threat.sourceCountry?.code;
      const targetCode = threat.targetCountry?.code;
      return Boolean(sourceCode && targetCode && (sourceCode === country.code || targetCode === country.code));
    });

    return matched.map((threat) => {
      const isSource = threat.sourceCountry?.code === country.code;
      const sourceCountry = threat.sourceCountry || country;
      const targetCountry = threat.targetCountry || country;

      return {
        id: threat.id,
        type: `${threat.indicatorType} observed IOC: ${threat.pulseName}`,
        direction: (isSource ? 'outbound' : 'inbound') as 'outbound' | 'inbound',
        sourceCountry,
        targetCountry,
        targetIp: threat.indicator || 'N/A',
        targetPort: 'N/A',
        volume: threat.tags?.join(', ') || 'Observed IOC',
        severity: threat.tags?.some((tag: string) => /ransom|malware|botnet|ddos|exploit/i.test(tag)) ? 'CRITICAL' : 'HIGH',
        status: 'ACTIVE' as const,
        timestamp: threat.created,
        targetSector: 'Threat intelligence',
      };
    });
  };

  // Trigger selection of a country
  const handleSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    setPanelTab('realmap');
    setFullRealMapOpen(true);

    const attacks = attacksForCountry(country);
    const selectedLevel: SelectedCountryStats['threatLevel'] = attacks.length > 5 ? 'CRITICAL' : attacks.length > 0 ? 'HIGH' : 'MEDIUM';
    const score = attacks.length === 0 ? 0 : Math.min(100, 50 + attacks.length * 8);
    const inboundCount = attacks.filter((a) => a.direction === 'inbound').length;
    const outboundCount = attacks.filter((a) => a.direction === 'outbound').length;

    const stats: SelectedCountryStats = {
      country,
      inbound: inboundCount.toLocaleString(),
      outbound: outboundCount.toLocaleString(),
      totalBlocked: 'N/A',
      threatScore: score,
      threatLevel: selectedLevel,
      primaryVector: attacks[0]?.type || 'No verified Check Point event for this country',
      targetedPorts: 'N/A (IOC intelligence)',
      activeAttacks: attacks,
      vulnerableSectors: [{ sector: 'Threat intelligence indicators', risk: selectedLevel === 'CRITICAL' ? 'Critical' : selectedLevel === 'HIGH' ? 'High' : 'Medium', attacksCount: attacks.length }],
      mitigationStatus: [{ system: 'Network mitigation telemetry', status: 'NOT PROVIDED BY FEED', efficiency: 'N/A' }],
    };

    setSelectedStats(stats);
    setPanelActive(true);
    setTickerText(
      attacks.length > 0
        ? `[CHECK POINT LIVE] ${country.name} (${country.code}) | ${attacks.length} verified source-to-target events | Primary Finding: ${stats.primaryVector}`
        : `[CHECK POINT LIVE] ${country.name} (${country.code}) | No verified live event currently reported`
    );

    // Immediately reflect active attack beams for selected country on 3D Globe
    if (worldRef.current) {
      const focusedArcs = attacks.map((atk) => ({
        startLat: atk.sourceCountry.lat,
        startLng: atk.sourceCountry.lng,
        endLat: atk.targetCountry.lat,
        endLng: atk.targetCountry.lng,
        color: '#ef4444',
        highlight: true,
      }));
      const focusedRings = attacks.flatMap((atk) => [
        { lat: atk.sourceCountry.lat, lng: atk.sourceCountry.lng, color: '#ef4444' },
        { lat: atk.targetCountry.lat, lng: atk.targetCountry.lng, color: '#f59e0b' },
      ]);
      worldRef.current.arcsData(focusedArcs);
      worldRef.current.ringsData(focusedRings);
    }
  };

  // Action to mark an attack as blocked manually
  const handleBlockAttack = (attackId: string) => {
    if (!selectedStats) return;
    const updatedAttacks = selectedStats.activeAttacks.map((atk) =>
      atk.id === attackId ? { ...atk, status: 'BLOCKED' as const } : atk
    );
    setSelectedStats({ ...selectedStats, activeAttacks: updatedAttacks });
  };

  const handleBlockAttackByIp = (targetIp: string) => {
    if (!selectedStats) return;
    const updatedAttacks = selectedStats.activeAttacks.map((atk) =>
      atk.targetIp === targetIp ? { ...atk, status: 'BLOCKED' as const } : atk
    );
    setSelectedStats({ ...selectedStats, activeAttacks: updatedAttacks });
  };

  // Filtered country list for search dropdown
  const filteredCountries = useMemo(() => {
    if (!searchCountry.trim()) return countryCatalog;
    return countryCatalog.filter((c) =>
      c.name.toLowerCase().includes(searchCountry.toLowerCase()) ||
      c.code.toLowerCase().includes(searchCountry.toLowerCase())
    );
  }, [countryCatalog, searchCountry]);

  const liveOverview = useMemo(() => {
    const active = threats.length;
    const critical = threats.filter((threat) =>
      (threat.tags || []).some((tag: string) => /ransom|malware|botnet|ddos|exploit/i.test(tag))
    ).length;
    const countries = new Set(
      threats.flatMap((threat) => [threat.sourceCountry?.code, threat.targetCountry?.code]).filter(Boolean)
    ).size;

    return {
      active,
      critical,
      countries,
    };
  }, [threats]);

  // Main 3D Globe initialization
  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const initialWidth = containerRef.current.clientWidth || 800;
    const initialHeight = containerRef.current.clientHeight || 500;

    let arcsData: any[] = [];
    let ringsData: any[] = [];

    // Safely resolve Globe factory across bundlers
    const GlobeFn = (Globe as any).default || Globe;
    const world = GlobeFn()(containerRef.current)
      .width(initialWidth)
      .height(initialHeight)
      .backgroundColor('#030712')
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .showGraticules(true)
      .showAtmosphere(true)
      .atmosphereColor('#38bdf8')
      .atmosphereAltitude(0.19)
      .arcStartLat((d: any) => d.startLat)
      .arcStartLng((d: any) => d.startLng)
      .arcEndLat((d: any) => d.endLat)
      .arcEndLng((d: any) => d.endLng)
      .arcColor((d: any) => d.color)
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime(1400)
      .arcStroke((d: any) => (d.highlight ? 2.8 : 1.2))
      .onArcClick((attack: any) => {
        const targetCountry = countryCatalogRef.current.find(
          (country) => country.code === attack.targetCountry.code
        );
        if (targetCountry) handleSelectCountry(targetCountry);
      })
      .ringLat((d: any) => d.lat)
      .ringLng((d: any) => d.lng)
      .ringColor((d: any) => d.color)
      .ringMaxRadius(8)
      .ringPropagationSpeed(3.8)
      .ringRepeatPeriod(600)
      .pointsData(countryCatalogRef.current)
      .pointLat((d: any) => d.lat)
      .pointLng((d: any) => d.lng)
      .pointColor(() => '#f59e0b')
      .pointAltitude(0.02)
      .pointRadius(0.35)
      .onGlobeClick(({ lat, lng }: { lat: number; lng: number }) => {
        let closest: Country = countryCatalogRef.current[0];
        let minDistance = Infinity;

        for (const c of countryCatalogRef.current) {
          const dLat = (c.lat - lat) * (Math.PI / 180);
          const dLng = (c.lng - lng) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat * (Math.PI / 180)) *
              Math.cos(c.lat * (Math.PI / 180)) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const dist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          if (dist < minDistance) {
            minDistance = dist;
            closest = c;
          }
        }

        if (closest) {
          handleSelectCountry(closest);
        }
      })
      .htmlElementsData(countryCatalogRef.current)
      .htmlLat((d: any) => d.lat)
      .htmlLng((d: any) => d.lng)
      .htmlAltitude(() => 0.01)
      .htmlElement((d: Country) => {
        const el = document.createElement('div');
        el.className = 'country-marker-node';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.gap = '5px';
        el.style.background = 'linear-gradient(135deg, rgba(12,21,37,0.92), rgba(14,31,58,0.86))';
        el.style.padding = '3px 8px';
        el.style.borderRadius = '10px';
        el.style.border = '1px solid rgba(56, 189, 248, 0.38)';
        el.style.boxShadow = '0 0 0 1px rgba(59,130,246,0.2), 0 8px 22px rgba(2,8,23,0.8), 0 0 20px rgba(34,211,238,0.15)';
        el.style.cursor = 'pointer';
        el.style.transition = 'all 0.2s ease';
        el.style.backdropFilter = 'blur(10px)';

        const flag = document.createElement('img');
        flag.src = `https://flagcdn.com/24x18/${d.code.toLowerCase()}.png`;
        flag.style.width = '16px';
        flag.style.height = '12px';
        flag.style.borderRadius = '2px';
        flag.style.objectFit = 'cover';

        const label = document.createElement('span');
        label.innerText = d.name;
        label.style.color = '#e2e8f0';
        label.style.fontSize = '11px';
        label.style.fontWeight = '600';

        el.appendChild(flag);
        el.appendChild(label);

        el.onmouseenter = () => {
          el.style.background = 'linear-gradient(135deg, rgba(14,116,144,0.9), rgba(59,130,246,0.7))';
          el.style.borderColor = '#38bdf8';
          el.style.transform = 'scale(1.12)';
          el.style.boxShadow = '0 0 0 1px rgba(96,165,250,0.45), 0 12px 28px rgba(15,23,42,0.9), 0 0 26px rgba(59,130,246,0.4)';
        };
        el.onmouseleave = () => {
          el.style.background = 'linear-gradient(135deg, rgba(12,21,37,0.92), rgba(14,31,58,0.86))';
          el.style.borderColor = 'rgba(6, 182, 212, 0.35)';
          el.style.transform = 'scale(1)';
          el.style.boxShadow = '0 0 0 1px rgba(59,130,246,0.2), 0 8px 22px rgba(2,8,23,0.8), 0 0 20px rgba(34,211,238,0.15)';
        };

        el.onclick = (e) => {
          e.stopPropagation();
          handleSelectCountry(d);
        };

        return el;
      });

    worldRef.current = world;

    if (world.controls) {
      const controls = world.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.enableRotate = true;
      controls.enablePan = false;
      controls.enableZoom = false;
    }

    // ResizeObserver for perfectly responsive 3D canvas sizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && world) {
          world.width(w).height(h);
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Initial camera position adjustment
    if (world.pointOfView) {
      world.pointOfView({ lat: 20, lng: 0, altitude: 2.2 });
    }

    // Check Point supplies source and destination coordinates for each live event.
    ringsData = threats.map((threat) => ({
      lat: threat.sourceCountry.lat,
      lng: threat.sourceCountry.lng,
      color: '#ef4444',
    }));
    const liveArcs = threats.filter((threat) => threat.sourceCountry && threat.targetCountry).map((threat) => ({
      startLat: threat.sourceCountry.lat,
      startLng: threat.sourceCountry.lng,
      endLat: threat.targetCountry.lat,
      endLng: threat.targetCountry.lng,
      color: '#ef4444',
      highlight: true,
      sourceCountry: threat.sourceCountry,
      targetCountry: threat.targetCountry,
      indicator: threat.indicator,
      pulseName: threat.pulseName,
    }));
    world.arcsData(liveArcs);
    world.ringsData(ringsData);
    if (!selectedCountry) {
      const attackCount = liveArcs.length;
      const telemetryCount = threats.filter((threat) => threat.indicatorType === 'LIVE IDS').length;
      setTickerText(
        attackCount > 0
          ? `[VERIFIED LIVE ATTACKS] ${attackCount} active source-to-target events | ${telemetryCount} local IDS alerts`
          : telemetryCount > 0
            ? `[LOCAL IDS TELEMETRY] ${telemetryCount} verified alerts | Waiting for source-to-target events`
            : '[LIVE FEED] No verified attack events received yet'
      );
    }

    const handleResize = () => {
      if (containerRef.current && world) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        world.width(w).height(h);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (worldRef.current?._destructor) {
        worldRef.current._destructor();
      }
      worldRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [isFullScreen]);

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;

    const validThreats = threats.filter((threat) =>
      threat.sourceCountry &&
      threat.targetCountry &&
      threat.sourceCountry.code !== threat.targetCountry.code
    );
    const liveArcs = validThreats.map((threat) => ({
      startLat: threat.sourceCountry.lat,
      startLng: threat.sourceCountry.lng,
      endLat: threat.targetCountry.lat,
      endLng: threat.targetCountry.lng,
      color: '#ef4444',
      highlight: true,
      sourceCountry: threat.sourceCountry,
      targetCountry: threat.targetCountry,
      indicator: threat.indicator,
      pulseName: threat.pulseName,
    }));
    const rings = validThreats.flatMap((threat) => [
      { lat: threat.sourceCountry.lat, lng: threat.sourceCountry.lng, color: '#ef4444' },
      { lat: threat.targetCountry.lat, lng: threat.targetCountry.lng, color: '#f59e0b' },
    ]);

    world.arcsData(liveArcs);
    world.ringsData(rings);
    world.pointsData(countryCatalog);
    world.htmlElementsData(countryCatalog);
    if (selectedCountry && countryCatalog.some((country) => country.code === selectedCountry.code)) {
      const selectedAttacks = attacksForCountry(selectedCountry);
      setSelectedStats((current) => current ? {
        ...current,
        inbound: selectedAttacks.filter((attack) => attack.direction === 'inbound').length.toLocaleString(),
        outbound: selectedAttacks.filter((attack) => attack.direction === 'outbound').length.toLocaleString(),
        threatScore: selectedAttacks.length === 0 ? 0 : Math.min(100, 50 + selectedAttacks.length * 8),
        threatLevel: selectedAttacks.length > 5 ? 'CRITICAL' : selectedAttacks.length > 0 ? 'HIGH' : 'MEDIUM',
        primaryVector: selectedAttacks[0]?.type || 'No verified Check Point event for this country',
        activeAttacks: selectedAttacks,
        vulnerableSectors: [{
          sector: 'Threat intelligence indicators',
          risk: selectedAttacks.length > 5 ? 'Critical' : selectedAttacks.length > 0 ? 'High' : 'Medium',
          attacksCount: selectedAttacks.length,
        }],
      } : current);
    } else {
      if (selectedCountry) {
        setSelectedCountry(null);
        setSelectedStats(null);
        setPanelActive(false);
      }
      setTickerText(
        liveArcs.length > 0
          ? `[VERIFIED LIVE ATTACKS] ${liveArcs.length} active source-to-target events`
          : '[LIVE FEED] No verified cross-country attack events received yet'
      );
    }
  }, [countryCatalog, threats, selectedCountry]);

  // Filter attacks for current country panel view
  const displayAttacks = useMemo(() => {
    if (!selectedStats) return [];
    if (attackFilter === 'inbound') {
      return selectedStats.activeAttacks.filter((a) => a.direction === 'inbound');
    }
    if (attackFilter === 'outbound') {
      return selectedStats.activeAttacks.filter((a) => a.direction === 'outbound');
    }
    return selectedStats.activeAttacks;
  }, [selectedStats, attackFilter]);

  return (
    <div
      className={`live-map-shell relative w-full overflow-hidden select-none ${
        isFullScreen
          ? 'h-screen bg-[#030712]'
          : 'h-[400px] sm:h-[480px] md:h-[550px] rounded-xl bg-[#030712] border border-[#1f2335]'
      }`}
    >
      <div className="map-scanlines" />
      <div
        className="satellite-map-backdrop"
        style={{ backgroundImage: `url(${satelliteBackdrop})` }}
        aria-hidden="true"
      />

      {/* 3D Globe Render Canvas */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-1" />

      <div className="absolute left-4 bottom-14 z-10 hidden min-w-[230px] max-w-[320px] sm:block">
        <div className="floating-hud-card glass-panel p-3 rounded-2xl">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="status-orb" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-300 font-semibold">Threat Grid</span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">Verified</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="grid-metric">
              <span className="metric-label">Live IOCs</span>
              <strong>{liveOverview.active}</strong>
            </div>
            <div className="grid-metric">
              <span className="metric-label">Critical</span>
              <strong className="text-red-400">{liveOverview.critical}</strong>
            </div>
            <div className="grid-metric">
              <span className="metric-label">Nations</span>
              <strong className="text-cyan-300">{liveOverview.countries}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Top Header Overlay */}
      <div className="absolute top-4 left-4 z-10 max-w-[52%] sm:max-w-xs pointer-events-none">
        <h1 className="text-base sm:text-lg font-black text-red-500 uppercase tracking-[0.18em] flex items-center gap-2 drop-shadow-[0_0_18px_rgba(239,68,68,0.45)]">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          Live CyberBriefing IOC Intelligence
        </h1>
        <p className="text-[11px] text-slate-300 mt-1 hidden sm:block tracking-[0.12em] uppercase font-medium opacity-90">
          Click any country pin or globe area to inspect geolocated IOC observations
        </p>
      </div>

      {/* Quick Country Selection Pills Bar */}
      <div className="absolute top-16 left-4 z-20 hidden md:flex items-center gap-1.5 overflow-x-auto max-w-[60%] py-1 pr-2 no-scrollbar">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono mr-1 shrink-0">
          Quick Inspect:
        </span>
        {countryCatalog.slice(0, 10).map((c) => (
          <button
            key={c.code}
            onClick={() => handleSelectCountry(c)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              selectedCountry?.code === c.code
                ? 'bg-[#3b28cc] text-white border-purple-400 shadow-md'
                : 'bg-[#0d111c]/80 text-gray-300 border-[#1f2335] hover:border-gray-500 hover:text-white'
            }`}
          >
            <img
              src={`https://flagcdn.com/24x18/${c.code.toLowerCase()}.png`}
              alt={c.name}
              className="w-3.5 h-2.5 rounded-xs object-cover"
            />
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      {/* Top Right Buttons & Country Quick Search */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Country Quick Search Dropdown */}
        <div className="relative">
          <div className="flex items-center bg-[#0d111c]/90 border border-[#1f2335] rounded-lg px-2.5 py-1.5 backdrop-blur-md shadow-lg text-xs">
            <i className="fa-solid fa-magnifying-glass text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search country..."
              value={searchCountry}
              onChange={(e) => setSearchCountry(e.target.value)}
              className="bg-transparent text-white placeholder-gray-500 outline-none w-28 sm:w-36 text-xs"
            />
            {searchCountry && (
              <button
                onClick={() => setSearchCountry('')}
                className="text-gray-400 hover:text-white ml-1 text-xs cursor-pointer"
              >
                &times;
              </button>
            )}
          </div>

          {/* Quick Search Popup List */}
          {searchCountry.trim() && (
            <div className="absolute top-full right-0 mt-1 w-56 max-h-60 overflow-y-auto bg-[#0d111c] border border-[#1f2335] rounded-lg shadow-2xl z-30 p-1 divide-y divide-[#1f2335]/50">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      handleSelectCountry(c);
                      setSearchCountry('');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-200 hover:bg-[#1a1e30] hover:text-white rounded transition text-left cursor-pointer"
                  >
                    <img
                      src={`https://flagcdn.com/24x18/${c.code.toLowerCase()}.png`}
                      alt={c.name}
                      className="w-4 h-3 rounded object-cover"
                    />
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto text-[10px] text-gray-500">{c.code}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-gray-400 text-center">No country found</div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* DETAILED COUNTRY ATTACK PANEL OVERLAY */}
      {panelActive && selectedStats && (
        <div className="absolute top-14 left-2 right-2 bottom-14 z-20 sm:top-16 sm:left-auto sm:right-3 sm:bottom-16 w-auto sm:w-[420px] md:w-[480px] max-h-[calc(100%-7rem)] bg-[#0d111c]/95 backdrop-blur-xl border border-[#1f2335] rounded-2xl p-3 sm:p-5 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right-4 overflow-hidden">
          {/* Panel Top Header */}
          <div className="flex items-center justify-between border-b border-[#1f2335] pb-3 mb-3">
            <div className="flex items-center gap-3">
              <img
                className="w-10 h-7 object-cover rounded-md border border-white/20 shadow-sm"
                src={`https://flagcdn.com/48x36/${selectedStats.country.code.toLowerCase()}.png`}
                alt={selectedStats.country.name}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                    {selectedStats.country.name}
                  </h2>
                  <span className="text-xs font-mono text-gray-400 bg-slate-800 px-1.5 py-0.5 rounded border border-gray-700">
                    {selectedStats.country.code}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  Lat: {selectedStats.country.lat.toFixed(2)}° | Lng: {selectedStats.country.lng.toFixed(2)}°
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide border ${
                  selectedStats.threatLevel === 'CRITICAL'
                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                    : selectedStats.threatLevel === 'HIGH'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                }`}
              >
                {selectedStats.threatLevel} ({selectedStats.threatScore}/100)
              </span>
              <button
                onClick={() => setPanelActive(false)}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-gray-300 hover:text-white flex items-center justify-center transition text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-4 gap-2 text-center mb-3">
            <div className="bg-[#111524] border border-[#1f2335] p-2 rounded-lg">
              <span className="text-[10px] text-gray-400 uppercase block">Inbound / min</span>
              <span className="text-sm font-bold text-red-400 mt-0.5 block">{selectedStats.inbound}</span>
            </div>
            <div className="bg-[#111524] border border-[#1f2335] p-2 rounded-lg">
              <span className="text-[10px] text-gray-400 uppercase block">Outbound / min</span>
              <span className="text-sm font-bold text-amber-400 mt-0.5 block">{selectedStats.outbound}</span>
            </div>
            <div className="bg-[#111524] border border-[#1f2335] p-2 rounded-lg">
              <span className="text-[10px] text-gray-400 uppercase block">Total Blocked</span>
              <span className="text-sm font-bold text-emerald-400 mt-0.5 block">{selectedStats.totalBlocked}</span>
            </div>
            <div className="bg-[#111524] border border-[#1f2335] p-2 rounded-lg">
              <span className="text-[10px] text-gray-400 uppercase block">Target Ports</span>
              <span className="text-xs font-mono font-semibold text-purple-300 mt-1 block truncate">
                {selectedStats.targetedPorts}
              </span>
            </div>
          </div>

          {/* Tab Selection Navigation */}
          <div className="flex border-b border-[#1f2335] mb-3 text-xs font-semibold overflow-x-auto pb-1">
            <button
              onClick={() => setPanelTab('realmap')}
              className={`pb-1.5 px-2.5 transition cursor-pointer flex items-center gap-1.5 border-b-2 shrink-0 ${
                panelTab === 'realmap'
                  ? 'border-cyan-400 text-cyan-300 font-bold'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <i className="fa-solid fa-map-location-dot text-cyan-400 text-xs" />
              <span>🗺️ Live Country Map</span>
            </button>

            <button
              onClick={() => setPanelTab('attacks')}
              className={`pb-1.5 px-2.5 transition cursor-pointer flex items-center gap-1.5 border-b-2 shrink-0 ${
                panelTab === 'attacks'
                  ? 'border-[#3b28cc] text-white font-bold'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <i className="fa-solid fa-radar text-red-400 text-xs" />
              <span>Live Attacks ({selectedStats.activeAttacks.length})</span>
            </button>

            <button
              onClick={() => setPanelTab('sectors')}
              className={`pb-1.5 px-2.5 transition cursor-pointer flex items-center gap-1.5 border-b-2 shrink-0 ${
                panelTab === 'sectors'
                  ? 'border-[#3b28cc] text-white font-bold'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <i className="fa-solid fa-building-shield text-amber-400 text-xs" />
              <span>Sectors</span>
            </button>

            <button
              onClick={() => setPanelTab('mitigation')}
              className={`pb-1.5 px-2.5 transition cursor-pointer flex items-center gap-1.5 border-b-2 shrink-0 ${
                panelTab === 'mitigation'
                  ? 'border-[#3b28cc] text-white font-bold'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <i className="fa-solid fa-shield-halved text-emerald-400 text-xs" />
              <span>Mitigation</span>
            </button>
          </div>

          {/* TAB 0: LIVE COUNTRY LEAFLET MAP */}
          {panelTab === 'realmap' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-2">
              <div className="flex items-center justify-between text-[11px] bg-[#111524] p-2 rounded-xl border border-cyan-500/30">
                <span className="text-gray-300">
                  Live Regional Map: <b>{selectedStats.country.name}</b>
                </span>
              </div>

              <div className="flex-1 min-h-[300px] sm:min-h-[350px] rounded-xl overflow-hidden border border-cyan-500/30 shadow-2xl relative">
                <CountryRealMap
                  country={selectedStats.country}
                  attacks={selectedStats.activeAttacks}
                  onBlockIp={(ip) => handleBlockAttackByIp(ip)}
                />
              </div>
            </div>
          )}

          {/* TAB 1: LIVE ATTACK STREAM FOR THIS COUNTRY */}
          {panelTab === 'attacks' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Direction Filter */}
              <div className="flex items-center justify-between mb-2 text-[11px]">
                <span className="text-gray-400 font-medium">Filter Vector Flow:</span>
                <div className="flex bg-[#111524] p-0.5 rounded border border-[#1f2335]">
                  <button
                    onClick={() => setAttackFilter('all')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      attackFilter === 'all' ? 'bg-[#3b28cc] text-white font-semibold' : 'text-gray-400'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setAttackFilter('inbound')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      attackFilter === 'inbound' ? 'bg-red-500/80 text-white font-semibold' : 'text-gray-400'
                    }`}
                  >
                    Inbound
                  </button>
                  <button
                    onClick={() => setAttackFilter('outbound')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      attackFilter === 'outbound' ? 'bg-amber-500/80 text-white font-semibold' : 'text-gray-400'
                    }`}
                  >
                    Outbound
                  </button>
                </div>
              </div>

              {/* Scrollable Attack List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                {displayAttacks.length > 0 ? (
                  displayAttacks.map((atk) => (
                    <div
                      key={atk.id}
                      className="bg-[#111524] hover:bg-[#161c2e] border border-[#1f2335] rounded-xl p-3 transition text-xs relative group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <i
                            className={`fa-solid ${
                              atk.direction === 'inbound'
                                ? 'fa-arrow-down-left text-red-400'
                                : 'fa-arrow-up-right text-amber-400'
                            }`}
                          />
                          {atk.type}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            atk.status === 'BLOCKED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : atk.status === 'MITIGATING'
                              ? 'bg-[#3b28cc]/20 text-[#9f86ff]'
                              : 'bg-red-500/20 text-red-400 animate-pulse'
                          }`}
                        >
                          {atk.status}
                        </span>
                      </div>

                      {/* Origin & Destination Nodes */}
                      <div className="flex items-center gap-2 text-[11px] text-gray-300 bg-[#0d111c] p-2 rounded-lg border border-[#1f2335]/60 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <img
                            src={`https://flagcdn.com/24x18/${atk.sourceCountry.code.toLowerCase()}.png`}
                            alt={atk.sourceCountry.name}
                            className="w-4 h-3 rounded object-cover"
                          />
                          <span className="truncate">{atk.sourceCountry.name}</span>
                        </div>

                        <i className="fa-solid fa-right-long text-gray-500 text-[10px]" />

                        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                          <span className="truncate text-right">{atk.targetCountry.name}</span>
                          <img
                            src={`https://flagcdn.com/24x18/${atk.targetCountry.code.toLowerCase()}.png`}
                            alt={atk.targetCountry.name}
                            className="w-4 h-3 rounded object-cover"
                          />
                        </div>
                      </div>

                      {/* Technical Specs */}
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-400">
                        <div>
                          Target IP: <span className="text-gray-200 font-mono">{atk.targetIp}</span>
                        </div>
                        <div>
                          Port: <span className="text-purple-300 font-mono">{atk.targetPort}</span>
                        </div>
                        <div>
                          Evidence: <span className="text-amber-300 font-medium">{atk.volume}</span>
                        </div>
                        <div>
                          Target Sector: <span className="text-gray-200">{atk.targetSector.split(' ')[0]}</span>
                        </div>
                      </div>

                      {/* Manual Block / Mitigate Button if active */}
                      {atk.status !== 'BLOCKED' && (
                        <button
                          onClick={() => handleBlockAttack(atk.id)}
                          className="mt-2 w-full py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <i className="fa-solid fa-shield-halved" /> Deploy Instant Mitigation
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-xs text-gray-500">
                    No observed indicators found for selected filter.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VULNERABLE SECTORS */}
          {panelTab === 'sectors' && (
            <div className="flex-1 overflow-y-auto space-y-2.5 text-xs">
              <p className="text-gray-400 text-[11px] mb-2">
                Sectors currently experiencing active security incident payloads in {selectedStats.country.name}:
              </p>
              {selectedStats.vulnerableSectors.map((s, idx) => (
                <div key={idx} className="bg-[#111524] border border-[#1f2335] p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{s.sector}</div>
                    <div className="text-gray-400 text-[11px] mt-0.5">
                      {s.attacksCount} active incident vectors logged
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                      s.risk === 'Critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {s.risk} Risk
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: MITIGATION STATUS */}
          {panelTab === 'mitigation' && (
            <div className="flex-1 overflow-y-auto space-y-2.5 text-xs">
              <p className="text-gray-400 text-[11px] mb-2">
                Active automated defense systems and WAF scrubbing rules deployed for {selectedStats.country.name}:
              </p>
              {selectedStats.mitigationStatus.map((m, idx) => (
                <div key={idx} className="bg-[#111524] border border-[#1f2335] p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{m.system}</div>
                    <div className="text-emerald-400 text-[11px] mt-0.5">Scrubbing Efficiency: {m.efficiency}</div>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Live Feed Ticker Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 h-10 bg-[#0d111c]/90 backdrop-blur-md border border-[#1f2335] rounded-xl flex items-center overflow-hidden px-3 shadow-2xl">
        <div className="bg-red-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider mr-3 shrink-0 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          LIVE FEED
        </div>
        <div className="font-mono text-xs text-blue-400 whitespace-nowrap animate-marquee">
          {feedError ? 'LIVE FEED TEMPORARILY UNAVAILABLE | Showing verified events already received' : tickerText}
        </div>
      </div>

      {/* FULLSCREEN LIVE COUNTRY MAP MODAL VIA PORTAL */}
      {fullRealMapOpen && selectedStats && createPortal(
        <div className="fixed inset-0 z-[99999] bg-[#020814]/98 backdrop-blur-2xl p-2 sm:p-4 flex flex-col animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-cyan-500/40 px-2 shrink-0">
            <div className="flex items-center gap-3">
              <img
                src={`https://flagcdn.com/48x36/${selectedStats.country.code.toLowerCase()}.png`}
                alt={selectedStats.country.name}
                className="w-10 h-7 rounded object-cover border border-white/20 shadow-md"
              />
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>{selectedStats.country.name} Live Cyber Threat Map</span>
                  <span className="text-xs text-emerald-400 font-mono bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE THREAT RADAR
                  </span>
                </h2>
                <p className="text-xs text-cyan-300/80 font-mono">
                  Coordinates: {selectedStats.country.lat.toFixed(4)}°N, {selectedStats.country.lng.toFixed(4)}°E | Active Threat Stream: {selectedStats.activeAttacks.length} Attack Vectors
                </p>
              </div>
            </div>

            <button
              onClick={() => setFullRealMapOpen(false)}
              className="bg-red-600/80 hover:bg-red-500 text-white px-3.5 py-1.5 rounded-xl border border-red-400 text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-xl"
            >
              <i className="fa-solid fa-xmark text-sm" />
              <span>Close Fullscreen Map</span>
            </button>
          </div>

          <div className="flex-1 rounded-2xl overflow-hidden border border-cyan-500/40 shadow-2xl relative">
            <CountryRealMap
              country={selectedStats.country}
              attacks={selectedStats.activeAttacks}
              onBlockIp={(ip) => handleBlockAttackByIp(ip)}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
