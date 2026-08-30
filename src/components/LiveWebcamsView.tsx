import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { USER_LIVE_WEBCAMS, COUNTRY_GROUPS, CountryGroup } from '../utils/liveWebcamsData';
import { LiveWebcam } from '../types';
import { tacticalAudio } from '../utils/tacticalSound';

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

const MAP_TILE_CONFIG: Record<MapStyle, { url: string; subdomains: string[]; maxZoom: number }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
  },
  'google-road': {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: [],
    maxZoom: 19,
  },
};

export const LiveWebcamsView: React.FC = () => {
  const [selectedWebcam, setSelectedWebcam] = useState<LiveWebcam | null>(USER_LIVE_WEBCAMS[0] ?? null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('ALL');
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark');
  const [isFeedHudMinimized, setIsFeedHudMinimized] = useState<boolean>(false);
  const [isFeedHudOpen, setIsFeedHudOpen] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [playerKey, setPlayerKey] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number }>({ lat: 25.0, lng: 15.0 });
  const [currentZoom, setCurrentZoom] = useState<number>(3);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const countryMarkersLayerRef = useRef<L.LayerGroup | null>(null);

  const filteredWebcams = useMemo(() => {
    if (selectedCountryCode === 'ALL') return USER_LIVE_WEBCAMS;
    return USER_LIVE_WEBCAMS.filter((cam) => cam.countryCode === selectedCountryCode);
  }, [selectedCountryCode]);

  useEffect(() => {
    if (!selectedWebcam) {
      setSelectedWebcam(filteredWebcams[0] ?? null);
      return;
    }

    if (!filteredWebcams.some((cam) => cam.id === selectedWebcam.id)) {
      setSelectedWebcam(filteredWebcams[0] ?? null);
    }
  }, [filteredWebcams, selectedWebcam]);

  const handleSelectWebcam = (cam: LiveWebcam) => {
    if (!cam) return;
    tacticalAudio.playTargetLock();

    if (selectedCountryCode !== cam.countryCode) {
      setSelectedCountryCode(cam.countryCode);
    }
    setSelectedWebcam(cam);
    setIsFeedHudOpen(true);
    setIsFeedHudMinimized(false);

    if (mapInstanceRef.current && typeof cam.latitude === 'number' && typeof cam.longitude === 'number') {
      mapInstanceRef.current.flyTo([cam.latitude, cam.longitude], 7, {
        duration: 1.2,
      });
    }
  };

  const handleCountryFilter = (countryCode: string, country?: CountryGroup) => {
    tacticalAudio.playSectorSwitch();
    setSelectedCountryCode(countryCode);

    if (!mapInstanceRef.current) return;

    if (countryCode === 'ALL') {
      mapInstanceRef.current.flyTo([25.0, 15.0], 3, { duration: 1.2 });
      const allDefault = USER_LIVE_WEBCAMS[0] ?? null;
      if (allDefault) setSelectedWebcam(allDefault);
      return;
    }

    if (country && typeof country.lat === 'number' && typeof country.lng === 'number') {
      mapInstanceRef.current.flyTo([country.lat, country.lng], country.zoom || 5, {
        duration: 1.2,
      });
    }

    const firstCam = USER_LIVE_WEBCAMS.find((c) => c.countryCode === countryCode) ?? null;
    if (firstCam) setSelectedWebcam(firstCam);
  };

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

  const handleCopyLink = () => {
    if (!selectedWebcam) return;
    tacticalAudio.playRadarPing();
    const text = `Live Webcam: ${selectedWebcam.title} (${selectedWebcam.city}, ${selectedWebcam.country}) - https://www.youtube.com/watch?v=${selectedWebcam.youtubeId}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [25.0, 15.0],
      zoom: 3,
      minZoom: 2,
      maxZoom: 19,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const cfg = MAP_TILE_CONFIG[mapStyle];
    const tile = L.tileLayer(cfg.url, {
      subdomains: cfg.subdomains,
      maxZoom: cfg.maxZoom,
      crossOrigin: true,
      detectRetina: true,
      noWrap: false,
    }).addTo(map);

    tileLayerRef.current = tile;
    markersLayerRef.current = L.layerGroup().addTo(map);
    countryMarkersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    const invalidateMap = () => {
      requestAnimationFrame(() => map.invalidateSize());
    };

    invalidateMap();
    const timer = setTimeout(invalidateMap, 150);

    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => invalidateMap());
      resizeObserver.observe(mapContainerRef.current);
    }

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({
        lat: Number(e.latlng.lat.toFixed(4)),
        lng: Number(e.latlng.lng.toFixed(4)),
      });
    });

    map.on('zoomend', () => setCurrentZoom(map.getZoom()));

    return () => {
      clearTimeout(timer);
      resizeObserver?.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);

    const cfg = MAP_TILE_CONFIG[mapStyle];
    const tile = L.tileLayer(cfg.url, {
      subdomains: cfg.subdomains,
      maxZoom: cfg.maxZoom,
      crossOrigin: true,
      detectRetina: true,
      noWrap: false,
    }).addTo(map);

    tileLayerRef.current = tile;
    map.invalidateSize();
  }, [mapStyle]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const countryLayer = countryMarkersLayerRef.current;
    if (!countryLayer) return;

    countryLayer.clearLayers();

    COUNTRY_GROUPS.forEach((country) => {
      const isSelected = selectedCountryCode === country.code;
      const pinHtml = `
        <div class="country-map-pin ${isSelected ? 'country-map-pin--active' : ''}">
          <span class="country-map-pin__flag">${country.flag}</span>
          <span class="country-map-pin__count">${country.count}</span>
        </div>
      `;

      const countryMarker = L.marker([country.lat, country.lng], {
        icon: L.divIcon({
          className: 'country-map-pin-wrapper',
          html: pinHtml,
          iconSize: [68, 26],
          iconAnchor: [34, 13],
        }),
        riseOnHover: true,
        zIndexOffset: isSelected ? 1200 : 100,
      });

      countryMarker.on('click', () => handleCountryFilter(country.code, country));
      countryMarker.bindTooltip(
        `<div style="font-family: Inter, sans-serif; font-size: 11px; color: #f8fafc; display: flex; flex-direction: column; gap: 3px;">
          <div style="font-weight: 700; color: #fbbf24;">${country.flag} ${country.name}</div>
          <div style="color: #cbd5e1;">${country.count} live webcams</div>
        </div>`,
        {
          direction: 'top',
          offset: [0, -10],
          className: 'live-webcam-tooltip',
        }
      );

      countryLayer.addLayer(countryMarker);
    });
  }, [selectedCountryCode]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const webcamLayer = markersLayerRef.current;
    if (!webcamLayer) return;

    webcamLayer.clearLayers();

    filteredWebcams.forEach((cam) => {
      if (
        typeof cam.latitude !== 'number' ||
        typeof cam.longitude !== 'number' ||
        Number.isNaN(cam.latitude) ||
        Number.isNaN(cam.longitude)
      ) {
        return;
      }

      const isSelected = selectedWebcam?.id === cam.id;
      const flag = getCountryFlag(cam.countryCode);
      const markerHtml = isSelected ? `
        <div class="relative flex items-center justify-center cursor-pointer" style="width: 42px; height: 42px;">
          <span class="absolute inline-flex h-10 w-10 rounded-full bg-emerald-400 opacity-90 animate-ping"></span>
          <span class="absolute inline-flex h-7 w-7 rounded-full bg-emerald-500/50 border border-emerald-300"></span>
          <span class="relative inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_26px_#10b981]">
            <span class="h-2 w-2 rounded-full bg-white"></span>
          </span>
        </div>
      ` : `
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

      marker.bindTooltip(
        `<div style="display: flex; flex-direction: column; gap: 4px; font-family: Inter, sans-serif; font-size: 11px; color: #fff; min-width: 170px;">
          <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; color: #fbbf24; letter-spacing: 0.06em; text-transform: uppercase;">
            <span>${flag}</span>
            <span>${cam.country}</span>
          </div>
          <div style="color: #e2e8f0; font-weight: 600; font-size: 10px;">${cam.city}</div>
          <div style="color: #86efac; font-size: 9.5px; font-weight: 700;">LIVE • ${cam.category}</div>
        </div>`,
        {
          direction: 'top',
          offset: [0, -14],
          opacity: 1,
          sticky: true,
          className: 'live-webcam-tooltip',
        }
      );

      marker.on('click', () => {
        handleSelectWebcam(cam);
        marker.openTooltip();
      });
      webcamLayer.addLayer(marker);
    });
  }, [filteredWebcams, selectedWebcam]);

  return (
    <div
      id="live-webcams-view"
      className="relative w-full h-[calc(100vh-105px)] min-h-[640px] select-none overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 font-sans flex flex-col"
      style={{ height: 'calc(100vh - 105px)', minHeight: '640px' }}
    >
      <div className="relative z-30 pointer-events-auto bg-slate-900/95 border-b border-slate-700 p-2.5 sm:p-3 shadow-sm">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
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

              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-950/80 to-yellow-950/70 border border-amber-500/50 text-[11px] font-mono font-bold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                <Signal className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>{filteredWebcams.length} NODES ARMED</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0c0904]/90 border border-amber-500/35 font-mono text-[10.5px] text-gray-300 shadow-inner">
                <Crosshair className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '12s' }} />
                <span>LAT: <strong className="text-amber-300">{cursorCoords.lat.toFixed(2)}°</strong></span>
                <span>LNG: <strong className="text-amber-300">{cursorCoords.lng.toFixed(2)}°</strong></span>
                <span>Z: <strong className="text-yellow-400">{currentZoom}x</strong></span>
              </div>

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
                  className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-black border-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.7)]'
                      : 'bg-[#0f0c05]/90 text-amber-100/80 border-amber-500/30 hover:border-amber-400 hover:text-white hover:bg-amber-950/50'
                  }`}
                >
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/70 text-amber-300 border border-amber-500/40">
                    {country.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative flex-1 w-full min-h-[360px] bg-slate-950 overflow-hidden" style={{ height: '100%' }}>
        <div ref={mapContainerRef} className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }} />
      </div>

      <div
        className={`absolute top-28 left-3 z-30 pointer-events-auto transition-all duration-300 ${
          isSidebarOpen ? 'w-72 sm:w-80 translate-x-0' : '-translate-x-full w-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="rounded-2xl border-2 border-amber-500/50 bg-[#120e05]/98 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[calc(100vh-240px)] min-h-[400px]">
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

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-amber-800/80 text-xs font-mono">
            {filteredWebcams.map((cam) => {
              const isSelected = selectedWebcam?.id === cam.id;
              const flag = getCountryFlag(cam.countryCode);
              return (
                <button
                  key={cam.id}
                  onClick={() => handleSelectWebcam(cam)}
                  className={`w-full rounded-xl border p-2 text-left transition ${
                    isSelected
                      ? 'border-amber-400/80 bg-amber-500/10 shadow-[0_0_18px_rgba(245,158,11,0.18)]'
                      : 'border-amber-500/20 bg-[#0a0d12]/50 hover:border-amber-400/40 hover:bg-[#111827]/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm">{flag}</span>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-white">{cam.city}</div>
                        <div className="truncate text-[10px] text-amber-200/80">{cam.country}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-300 font-bold">LIVE</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-300">
                    <span>{cam.category}</span>
                    <span>{cam.resolution}</span>
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

      {selectedWebcam && isFeedHudOpen && (
        <div
          className={`absolute top-28 right-3 z-30 pointer-events-auto transition-all duration-300 ${
            isFeedHudMinimized ? 'w-72' : 'w-[92vw] sm:w-[440px] md:w-[480px]'
          }`}
        >
          <div className="rounded-2xl border-2 border-amber-500/50 bg-[#120e05]/98 backdrop-blur-2xl shadow-[0_0_45px_rgba(0,0,0,0.95)] overflow-hidden font-mono text-xs">
            <div className="p-2.5 bg-gradient-to-r from-black/90 via-[#181105] to-black/90 border-b border-amber-500/35 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span className="absolute h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                </span>
                <span className="font-bold text-white truncate font-sans text-xs">{selectedWebcam.city}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setPlayerKey((v) => v + 1)} className="p-1.5 rounded-lg hover:bg-amber-950 text-amber-400/80 hover:text-amber-200 transition" title="Reload Stream">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setIsFeedHudMinimized(!isFeedHudMinimized)} className="p-1.5 rounded-lg hover:bg-amber-950 text-amber-400/80 hover:text-amber-200 transition" title={isFeedHudMinimized ? 'Expand HUD' : 'Collapse HUD'}>
                  {isFeedHudMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setIsFeedHudOpen(false)} className="p-1.5 rounded-lg hover:bg-red-950 text-amber-400/80 hover:text-red-400 transition" title="Close Video">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!isFeedHudMinimized && (
              <>
                <div className="relative aspect-video w-full bg-black overflow-hidden border-b border-amber-500/30">
                  <iframe
                    key={`feed-${selectedWebcam.id}-${playerKey}`}
                    src={selectedWebcam.embedUrl}
                    title={selectedWebcam.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>

                <div className="p-3 bg-gradient-to-b from-black/80 to-[#0d0a04]/90 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] text-amber-300 uppercase tracking-[0.18em]">{selectedWebcam.country}</div>
                      <div className="text-sm font-bold text-white truncate">{selectedWebcam.title}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handlePrevWebcam} className="px-2 py-1.5 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-[10px] font-mono flex items-center gap-1">
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <button onClick={handleNextWebcam} className="px-2 py-1.5 rounded-lg bg-amber-950/70 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-[10px] font-mono flex items-center gap-1">
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
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