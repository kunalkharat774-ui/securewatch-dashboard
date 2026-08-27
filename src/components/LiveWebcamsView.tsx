import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import {
  Maximize2,
  Minimize2,
  RefreshCw,
  ExternalLink,
  X,
  Share2,
  Crosshair,
  Target,
  Signal,
  List,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Compass,
  Clock,
} from 'lucide-react';
import { USER_LIVE_WEBCAMS, COUNTRY_GROUPS, CountryGroup } from '../utils/liveWebcamsData';
import { LiveWebcam } from '../types';

const playTone = (frequency: number, duration: number) => {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return;

  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
    oscillator.addEventListener('ended', () => void audioContext.close(), { once: true });
  } catch {
    // Browser autoplay policy may block optional audio feedback.
  }
};

const tacticalAudio = {
  playSectorSwitch: () => playTone(520, 0.08),
  playTargetLock: () => playTone(760, 0.12),
  playRadarPing: () => playTone(920, 0.1),
};

// Helper to get country flag
const getCountryFlag = (countryCode: string) => {
  const flags: { [code: string]: string } = {
    US: '🇺🇸',
    GB: '🇬🇧',
    DE: '🇩🇪',
    IT: '🇮🇹',
    NA: '🇳🇦',
    KE: '🇰🇪',
    IN: '🇮🇳',
    TH: '🇹🇭',
    AU: '🇦🇺',
    CA: '🇨🇦',
    IE: '🇮🇪',
    CY: '🛡️',
    JP: '🇯🇵',
    AE: '🇦🇪',
    FR: '🇫🇷',
    GR: '🇬🇷',
    FI: '🇫🇮',
  };
  return flags[countryCode] || '🌐';
};

type MapStyle = 'dark' | 'google-road' | 'satellite';

const MAP_TILE_CONFIG: Record<MapStyle, { url: string; subdomains: string[]; maxZoom: number; name: string }> = {
  dark: {
    name: 'OSIRIS Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
  },
  'google-road': {
    name: 'Dark Streets',
    url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
  },
  satellite: {
    name: 'Dark Terrain',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
  },
};

export const LiveWebcamsView: React.FC = () => {
  // Active selected webcam for video stream
  const [selectedWebcam, setSelectedWebcam] = useState<LiveWebcam | null>(USER_LIVE_WEBCAMS[0]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('ALL');
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark');

  // HUD & UI state
  const [isFeedHudMinimized, setIsFeedHudMinimized] = useState<boolean>(true);
  const [isFeedHudOpen, setIsFeedHudOpen] = useState<boolean>(false);
  const [isFullScreenVideo, setIsFullScreenVideo] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [playerKey, setPlayerKey] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number }>({ lat: 25.0, lng: 15.0 });
  const [currentZoom, setCurrentZoom] = useState<number>(3);

  // Close full screen on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreenVideo) {
        setIsFullScreenVideo(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreenVideo]);

  // Leaflet refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Filtered cameras based on country selection
  const filteredWebcams = useMemo(() => {
    if (selectedCountryCode === 'ALL') {
      return USER_LIVE_WEBCAMS;
    }
    return USER_LIVE_WEBCAMS.filter((cam) => cam.countryCode === selectedCountryCode);
  }, [selectedCountryCode]);

  // Navigate to previous/next webcam in full screen mode
  const handlePrevWebcam = () => {
    tacticalAudio.playSectorSwitch();
    const currentIndex = filteredWebcams.findIndex((c) => c.id === selectedWebcam?.id);
    if (currentIndex > 0) {
      handleSelectWebcam(filteredWebcams[currentIndex - 1]);
    } else {
      handleSelectWebcam(filteredWebcams[filteredWebcams.length - 1]);
    }
  };

  const handleNextWebcam = () => {
    tacticalAudio.playSectorSwitch();
    const currentIndex = filteredWebcams.findIndex((c) => c.id === selectedWebcam?.id);
    if (currentIndex >= 0 && currentIndex < filteredWebcams.length - 1) {
      handleSelectWebcam(filteredWebcams[currentIndex + 1]);
    } else {
      handleSelectWebcam(filteredWebcams[0]);
    }
  };

  // Initialize Tactical Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: [25.0, 15.0],
        zoom: 3,
        minZoom: 2,
        maxZoom: 19,
        worldCopyJump: true,
        zoomControl: false,
        attributionControl: false, // Zero watermark or attribution text
        preferCanvas: true,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const cfg = MAP_TILE_CONFIG[mapStyle];
      const tileLayerOptions: L.TileLayerOptions = {
        subdomains: cfg.subdomains,
        maxZoom: cfg.maxZoom,
        crossOrigin: true,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const tile = L.tileLayer(cfg.url, tileLayerOptions).addTo(map);

      tileLayerRef.current = tile;
      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Invalidate map size so tiles render immediately without grey areas
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 150);

      // Watch resize
      let resizeObserver: ResizeObserver | null = null;
      if (mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      // Track mouse coordinates for OSIRIS HUD telemetry
      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        setCursorCoords({
          lat: Number(e.latlng.lat.toFixed(4)),
          lng: Number(e.latlng.lng.toFixed(4)),
        });
      });

      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom());
      });

      return () => {
        clearTimeout(timer);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        try {
          map.remove();
        } catch {
          // Ignore cleanup errors
        }
        mapInstanceRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, []);

  // Update tile style when switched
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    try {
      const map = mapInstanceRef.current;
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }
      const cfg = MAP_TILE_CONFIG[mapStyle];
      const tileLayerOptions: L.TileLayerOptions = {
        subdomains: cfg.subdomains,
        maxZoom: cfg.maxZoom,
        crossOrigin: true,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };
      const tile = L.tileLayer(cfg.url, tileLayerOptions).addTo(map);
      tileLayerRef.current = tile;
      map.invalidateSize();
    } catch (error) {
      console.error('Error updating tile layer:', error);
    }
  }, [mapStyle]);

  // Update markers on the map (VIBRANT GLOWING GREEN RADAR POINTS)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    filteredWebcams.forEach((cam) => {
      if (
        typeof cam.latitude !== 'number' ||
        typeof cam.longitude !== 'number' ||
        isNaN(cam.latitude) ||
        isNaN(cam.longitude)
      ) {
        return;
      }

      const isSelected = selectedWebcam?.id === cam.id;
      const flag = getCountryFlag(cam.countryCode);

      // GLOWING GREEN RADAR POINTS (Pulsing Emerald Green on exact coordinates)
      const markerHtml = isSelected
        ? `
        <div class="relative flex items-center justify-center cursor-pointer" style="width: 42px; height: 42px;">
          <span class="absolute inline-flex h-10 w-10 rounded-full bg-emerald-400 opacity-90 animate-ping"></span>
          <span class="absolute inline-flex h-7 w-7 rounded-full bg-emerald-500/50 border border-emerald-300"></span>
          <span class="relative inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_26px_#10b981]">
            <span class="h-2 w-2 rounded-full bg-white"></span>
          </span>
        </div>
      `
        : `
        <div class="relative flex items-center justify-center cursor-pointer group" style="width: 28px; height: 28px;">
          <span class="absolute inline-flex h-6 w-6 rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
          <span class="absolute inline-flex h-4 w-4 rounded-full bg-emerald-500/35 blur-[1px]"></span>
          <span class="relative inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-emerald-400 border-[1.5px] border-white shadow-[0_0_15px_#10b981] group-hover:scale-135 transition-transform duration-200">
            <span class="h-1.5 w-1.5 rounded-full bg-white"></span>
          </span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'clean-live-webcam-marker',
        html: markerHtml,
        iconSize: isSelected ? [42, 42] : [28, 28],
        iconAnchor: isSelected ? [21, 21] : [14, 14],
      });

      const marker = L.marker([cam.latitude, cam.longitude], {
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : 10,
      });

      // Sleek Luxury Dark Golden OSIRIS hover tooltip showing Country, City & Green Signal Status
      marker.bindTooltip(
        `<div style="display: flex; flex-direction: column; gap: 3px; font-family: ui-monospace, monospace; font-size: 11px; color: #fff;">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 700;">
            <span>${flag}</span>
            <span style="color: #fbbf24; text-transform: uppercase; letter-spacing: 0.06em;">${cam.country}</span>
            <span style="color: #a8a29e;">//</span>
            <span style="color: #ffffff;">${cam.city}</span>
          </div>
          <div style="color: #d6d3d1; font-size: 9.5px; display: flex; gap: 8px;">
            <span>GPS: ${cam.latitude.toFixed(2)}°, ${cam.longitude.toFixed(2)}°</span>
            <span style="color: #10b981; font-weight: 800; text-shadow: 0 0 8px rgba(16,185,129,0.7);">[SIGNAL: 100% LOCKED]</span>
          </div>
        </div>`,
        {
          direction: 'top',
          offset: [0, -12],
          className: 'dark-map-tooltip',
        }
      );

      marker.on('click', () => {
        handleSelectWebcam(cam);
      });

      markersLayerRef.current?.addLayer(marker);
    });
  }, [filteredWebcams, selectedWebcam]);

  // Select a webcam and pan smoothly
  const handleSelectWebcam = (cam: LiveWebcam) => {
    if (!cam) return;
    tacticalAudio.playTargetLock();
    setSelectedWebcam(cam);
    setIsFeedHudOpen(true);
    setIsFeedHudMinimized(false);

    if (
      mapInstanceRef.current &&
      typeof cam.latitude === 'number' &&
      typeof cam.longitude === 'number'
    ) {
      mapInstanceRef.current.flyTo([cam.latitude, cam.longitude], 7, {
        duration: 1.2,
      });
    }
  };

  // Select Country Filter
  const handleCountryFilter = (countryCode: string, country?: CountryGroup) => {
    tacticalAudio.playSectorSwitch();
    setSelectedCountryCode(countryCode);
    if (!mapInstanceRef.current) return;

    if (countryCode === 'ALL') {
      mapInstanceRef.current.flyTo([25.0, 15.0], 3, { duration: 1.2 });
      return;
    }

    if (country && typeof country.lat === 'number' && typeof country.lng === 'number') {
      mapInstanceRef.current.flyTo([country.lat, country.lng], country.zoom || 5, {
        duration: 1.2,
      });
    }

    const firstCam = USER_LIVE_WEBCAMS.find((c) => c.countryCode === countryCode);
    if (firstCam) {
      setSelectedWebcam(firstCam);
    }
  };

  const handleCopyLink = () => {
    if (!selectedWebcam) return;
    tacticalAudio.playRadarPing();
    const text = `Live Webcam: ${selectedWebcam.title} (${selectedWebcam.city}, ${selectedWebcam.country}) - https://www.youtube.com/watch?v=${selectedWebcam.youtubeId}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="osiris-tactical-live-webcams-view"
      className="relative w-full h-[calc(100vh-105px)] min-h-[640px] select-none overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-[#070502] shadow-[0_0_55px_rgba(217,119,6,0.28)] font-sans flex flex-col"
    >
      {/* ========================================================================= */}
      {/* OSIRIS TACTICAL CORNER BRACKETS (LUXURY GOLD)                             */}
      {/* ========================================================================= */}
      <div className="osiris-corner-tl" />
      <div className="osiris-corner-tr" />
      <div className="osiris-corner-bl" />
      <div className="osiris-corner-br" />

      {/* ========================================================================= */}
      {/* 1. OSIRIS TACTICAL TOP C2 BAR (LUXURY DARK GOLDEN OBSIDIAN)               */}
      {/* ========================================================================= */}
      <div className="relative z-30 pointer-events-auto bg-gradient-to-b from-[#161005]/98 via-[#0f0c05]/98 to-[#0a0703]/98 border-b border-amber-500/40 p-2.5 sm:p-3 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col gap-2.5">
          {/* Main Top Row: Serial, Title, Telemetry Readout & Controls */}
          <div className="flex items-center justify-between flex-wrap gap-2.5">
            {/* Left: OSIRIS Golden Identity & Live Radar Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                {/* Radar Sweep Icon (Glowing Amber Gold) */}
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-900/90 to-yellow-950/80 border border-amber-400/60 shadow-[0_0_16px_rgba(245,158,11,0.45)]">
                  <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                    <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-amber-300 to-transparent osiris-radar-sweep origin-center" />
                  </div>
                  <Target className="w-4 h-4 text-amber-300 relative z-10 animate-pulse" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-100 uppercase font-mono drop-shadow-sm">
                      Live Webcam
                    </h1>
                  </div>
                </div>
              </div>

              {/* Node Counter Pill */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-950/80 to-yellow-950/70 border border-amber-500/50 text-[11px] font-mono font-bold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                <Signal className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>{filteredWebcams.length} NODES ARMED</span>
              </div>
            </div>

            {/* Right: Live Telemetry, Map Style Selector & World List Drawer Toggle */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Telemetry Coordinates Badge */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0c0904]/90 border border-amber-500/35 font-mono text-[10.5px] text-gray-300 shadow-inner">
                <Crosshair className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '12s' }} />
                <span>LAT: <strong className="text-amber-300">{cursorCoords.lat.toFixed(2)}°</strong></span>
                <span>LNG: <strong className="text-amber-300">{cursorCoords.lng.toFixed(2)}°</strong></span>
                <span>Z: <strong className="text-yellow-400">{currentZoom}x</strong></span>
              </div>

              {/* Map Layer Switcher */}
              <div className="flex items-center bg-[#0a0703]/90 p-0.5 rounded-lg border border-amber-500/40 text-xs font-mono shadow-inner">
                {(['dark', 'google-road', 'satellite'] as MapStyle[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      tacticalAudio.playSectorSwitch();
                      setMapStyle(st);
                    }}
                    className={`px-2.5 py-1 rounded-md transition text-[10.5px] font-black ${
                      mapStyle === st
                        ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-black shadow-[0_0_14px_rgba(245,158,11,0.7)]'
                        : 'text-amber-300/60 hover:text-amber-200'
                    }`}
                  >
                    {st === 'dark' ? 'DARK' : st === 'google-road' ? 'VECTOR' : 'SAT-IR'}
                  </button>
                ))}
              </div>

              {/* Toggle Sidebar World List Button */}
              <button
                onClick={() => {
                  tacticalAudio.playSectorSwitch();
                  setIsSidebarOpen(!isSidebarOpen);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-black transition flex items-center gap-1.5 shadow-sm ${
                  isSidebarOpen
                    ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-black border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.7)]'
                    : 'bg-[#0f0c05]/95 border-amber-500/50 text-amber-300 hover:text-white hover:border-amber-400 hover:bg-amber-950/40'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>WORLD LIST</span>
              </button>
            </div>
          </div>

          {/* Bottom Filter Pills: Country Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-amber-700/60 font-mono">
            <button
              onClick={() => handleCountryFilter('ALL')}
              className={`px-3.5 py-1 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1.5 border ${
                selectedCountryCode === 'ALL'
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-black border-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.7)] font-black'
                  : 'bg-[#120e05]/90 text-amber-100/90 border-amber-500/30 hover:border-amber-400 hover:text-white hover:bg-amber-950/50'
              }`}
            >
              <span>🌍 ALL SECTORS</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/70 text-amber-300 border border-amber-500/40">
                {USER_LIVE_WEBCAMS.length}
              </span>
            </button>

            {COUNTRY_GROUPS.map((country) => {
              const isSelected = selectedCountryCode === country.code;
              return (
                <button
                  key={country.code}
                  onClick={() => handleCountryFilter(country.code, country)}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-black border-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.7)] font-black'
                      : 'bg-[#120e05]/85 text-amber-100/80 border-amber-500/30 hover:border-amber-400 hover:text-white hover:bg-amber-950/50'
                  }`}
                >
                  <span className="text-sm">{country.flag}</span>
                  <span className="tracking-wide">{country.name.split(' (')[0].toUpperCase()}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950/90 border border-amber-500/40 text-amber-300 font-mono font-bold">
                    {country.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. OSIRIS TACTICAL MAP CANVAS (DARK GOLDEN FRAME WITH GREEN RADAR POINTS) */}
      {/* ========================================================================= */}
      <div className="relative flex-1 w-full min-h-0 bg-[#060401] overflow-hidden">
        {/* Leaflet Map DOM Element */}
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />
      </div>

      {/* ========================================================================= */}
      {/* 3. SIDEBAR SURVEILLANCE WORLD LIST (LUXURY DARK GOLDEN DRAWER)            */}
      {/* ========================================================================= */}
      <div
        className={`absolute top-28 left-3 z-30 pointer-events-auto transition-all duration-300 ${
          isSidebarOpen ? 'w-72 sm:w-80 translate-x-0' : '-translate-x-full w-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="rounded-2xl border-2 border-amber-500/50 bg-[#120e05]/98 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[calc(100vh-240px)] min-h-[400px]">
          {/* Drawer Header */}
          <div className="p-3 bg-gradient-to-r from-black/90 via-[#181105] to-black/90 border-b border-amber-500/35 flex items-center justify-between font-mono">
            <div className="flex items-center gap-2 text-xs font-black text-amber-300">
              <List className="w-4 h-4 text-amber-400" />
              <span>WORLD LIST ({filteredWebcams.length})</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-lg hover:bg-amber-950 text-amber-400/80 hover:text-amber-200 transition"
              title="Close World List"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Camera List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-amber-800/80 text-xs font-mono">
            {filteredWebcams.map((cam) => {
              const isSelected = selectedWebcam?.id === cam.id;
              const flag = getCountryFlag(cam.countryCode);
              return (
                <button
                  key={cam.id}
                  onClick={() => handleSelectWebcam(cam)}
                  className={`w-full text-left p-2.5 rounded-xl border transition flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-950/90 to-yellow-950/80 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] text-white'
                      : 'bg-[#0a0703]/70 border-amber-500/20 hover:border-amber-400/60 text-gray-300 hover:bg-amber-950/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{flag}</span>
                      <span className="text-[10.5px] font-black text-amber-300 uppercase tracking-wider">
                        {cam.country}
                      </span>
                    </div>
                    <span className="text-[10px] text-yellow-300 font-bold shrink-0">{cam.resolution}</span>
                  </div>

                  <div className="font-bold text-white truncate text-xs flex items-center gap-1.5 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-ping"></span>
                    {cam.title}
                  </div>

                  <div className="flex items-center justify-between text-[10.5px] text-gray-400">
                    <span className="truncate">
                      📍 {cam.city}
                    </span>
                    <span className="text-emerald-400 text-[10px] font-bold">[ONLINE]</span>
                  </div>
                </button>
              );
            })}

            {filteredWebcams.length === 0 && (
              <div className="p-6 text-center text-amber-200/60 text-xs font-mono">
                NO SURVEILLANCE NODES FOUND IN THIS SECTOR.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. OSIRIS TACTICAL VIDEO STREAM HUD (LUXURY DARK GOLDEN RIGHT OVERLAY)    */}
      {/* ========================================================================= */}
      {selectedWebcam && isFeedHudOpen && (
        <div
          className={`absolute top-28 right-3 z-30 pointer-events-auto transition-all duration-300 ${
            isFeedHudMinimized ? 'w-72' : 'w-[92vw] sm:w-[440px] md:w-[480px]'
          }`}
        >
          <div className="rounded-2xl border-2 border-amber-500/50 bg-[#120e05]/98 backdrop-blur-2xl shadow-[0_0_45px_rgba(0,0,0,0.95)] overflow-hidden font-mono text-xs">
            {/* Header */}
            <div className="p-2.5 bg-gradient-to-r from-black/90 via-[#181105] to-black/90 border-b border-amber-500/35 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-85"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-white truncate font-sans text-xs">{selectedWebcam.title}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Reload Stream */}
                <button
                  onClick={() => {
                    tacticalAudio.playRadarPing();
                    setPlayerKey((k) => k + 1);
                  }}
                  className="p-1.5 rounded-lg hover:bg-amber-950 text-amber-400/80 hover:text-amber-200 transition"
                  title="Reload Stream"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Minimize / Expand */}
                <button
                  onClick={() => setIsFeedHudMinimized(!isFeedHudMinimized)}
                  className="p-1.5 rounded-lg hover:bg-amber-950 text-amber-400/80 hover:text-amber-200 transition"
                  title={isFeedHudMinimized ? 'Expand Video' : 'Minimize Video'}
                >
                  {isFeedHudMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>

                {/* Close Player */}
                <button
                  onClick={() => setIsFeedHudOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-red-950 text-amber-400/80 hover:text-red-400 transition"
                  title="Close Video"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Video Frame & Details */}
            {!isFeedHudMinimized && (
              <>
                <div className="relative aspect-video w-full bg-black overflow-hidden border-b border-amber-500/30">
                  <iframe
                    key={`${selectedWebcam.id}-${playerKey}`}
                    src={selectedWebcam.embedUrl}
                    title={selectedWebcam.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>

                {/* Footer Info & Actions */}
                <div className="p-3 bg-gradient-to-b from-black/80 to-[#0d0a04]/90 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-gray-300 flex items-center gap-1.5 font-sans">
                        <span className="text-sm">{getCountryFlag(selectedWebcam.countryCode)}</span>
                        <span className="font-bold text-amber-300 uppercase font-mono">
                          {selectedWebcam.country}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span>{selectedWebcam.city}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-amber-400 font-mono">{selectedWebcam.category}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2 font-mono">
                        <span>GPS: {selectedWebcam.latitude.toFixed(4)}°, {selectedWebcam.longitude.toFixed(4)}°</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          FEED LOCKED ({selectedWebcam.resolution})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        onClick={handleCopyLink}
                        className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-[10px] font-black transition flex items-center gap-1 shadow-sm"
                        title="Share Surveillance Telemetry"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
                        <span>{copied ? 'COPIED' : 'SHARE'}</span>
                      </button>

                      <a
                        href={`https://www.youtube.com/watch?v=${selectedWebcam.youtubeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white font-black text-[10px] transition flex items-center gap-1 shadow-sm"
                        title="Watch on YouTube"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>FEED</span>
                      </a>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
