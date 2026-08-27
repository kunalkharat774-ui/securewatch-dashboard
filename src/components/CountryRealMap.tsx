import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

export interface CountryInfo {
  name: string;
  code: string;
  lat: number;
  lng: number;
}

export interface AttackItem {
  id: string;
  type: string;
  direction: 'inbound' | 'outbound';
  sourceCountry: CountryInfo;
  targetCountry: CountryInfo;
  targetIp: string;
  targetPort: string;
  volume: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  status: 'ACTIVE' | 'MITIGATING' | 'BLOCKED';
  timestamp: string;
  targetSector: string;
}

interface CountryRealMapProps {
  country: CountryInfo;
  attacks: AttackItem[];
  onClose?: () => void;
  onBlockIp?: (ip: string) => void;
}

// Known major cities for top monitored nations
const COUNTRY_CITIES: Record<string, { name: string; lat: number; lng: number }[]> = {
  US: [
    { name: 'Washington D.C. (Gov Net)', lat: 38.9072, lng: -77.0369 },
    { name: 'New York (Financial Hub)', lat: 40.7128, lng: -74.006 },
    { name: 'San Francisco (Silicon Valley)', lat: 37.7749, lng: -122.4194 },
    { name: 'Chicago (Grid Node 01)', lat: 41.8781, lng: -87.6298 },
    { name: 'Dallas (Data Center West)', lat: 32.7767, lng: -96.797 },
    { name: 'Seattle (Cloud Infrastructure)', lat: 47.6062, lng: -122.3321 },
  ],
  IN: [
    { name: 'New Delhi (NIC Cyber Defense)', lat: 28.6139, lng: 77.209 },
    { name: 'Mumbai (NSE / Financial Gateway)', lat: 19.076, lng: 72.8777 },
    { name: 'Bengaluru (Tech Defense Cluster)', lat: 12.9716, lng: 77.5946 },
    { name: 'Hyderabad (Cyberabad Infra)', lat: 17.385, lng: 78.4867 },
    { name: 'Chennai (Subsea Cable Landing)', lat: 13.0827, lng: 80.2707 },
  ],
  GB: [
    { name: 'London (NCSC Cyber Center)', lat: 51.5074, lng: -0.1278 },
    { name: 'Manchester (CloudIX Hub)', lat: 53.4808, lng: -2.2426 },
    { name: 'Edinburgh (Financial Defense)', lat: 55.9533, lng: -3.1883 },
    { name: 'Birmingham (Telecom Relay)', lat: 52.4862, lng: -1.8904 },
  ],
  JP: [
    { name: 'Tokyo (NISC Central Shield)', lat: 35.6762, lng: 139.6503 },
    { name: 'Osaka (Kansai IX Exchange)', lat: 34.6937, lng: 135.5023 },
    { name: 'Fukuoka (Submarine Fiber Node)', lat: 33.5904, lng: 130.4017 },
  ],
  DE: [
    { name: 'Berlin (BSI Incident Response)', lat: 52.52, lng: 13.405 },
    { name: 'Frankfurt (DE-CIX IXP Node)', lat: 50.1109, lng: 8.6821 },
    { name: 'Munich (Industrial IoT Shield)', lat: 48.1351, lng: 11.582 },
  ],
  CN: [
    { name: 'Beijing (CNCERT Node 1)', lat: 39.9042, lng: 116.4074 },
    { name: 'Shanghai (Financial IX Gateway)', lat: 31.2304, lng: 121.4737 },
    { name: 'Shenzhen (Tech Infra Relay)', lat: 22.5431, lng: 114.0579 },
  ],
  FR: [
    { name: 'Paris (ANSSI Cyber Command)', lat: 48.8566, lng: 2.3522 },
    { name: 'Marseille (Subsea Cable Terminal)', lat: 43.2965, lng: 5.3698 },
    { name: 'Lyon (Data Center Central)', lat: 45.764, lng: 4.8357 },
  ],
  RU: [
    { name: 'Moscow (GovIX Fortress)', lat: 55.7558, lng: 37.6173 },
    { name: 'Saint Petersburg (North Gateway)', lat: 59.9343, lng: 30.3351 },
    { name: 'Novosibirsk (Siberian Relay)', lat: 55.0084, lng: 82.9357 },
  ],
};

export const CountryRealMap: React.FC<CountryRealMapProps> = ({
  country,
  attacks,
  onClose,
  onBlockIp,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite' | 'street'>('dark');
  const [activeCity, setActiveCity] = useState<{
    name: string;
    lat: number;
    lng: number;
    attackType: string;
    status: string;
    source: string;
    ip: string;
    port: string;
    bandwidth: string;
  } | null>(null);

  const [showAttackPanel, setShowAttackPanel] = useState<boolean>(true);

  // Derive city nodes for the country
  const cities = useRef<{ name: string; lat: number; lng: number; threatLevel: string }[]>([]);

  useEffect(() => {
    cities.current = attacks.map((attack) => ({
      name: `${attack.targetCountry.name} target coordinate`,
      lat: attack.targetCountry.lat,
      lng: attack.targetCountry.lng,
      threatLevel: attack.severity,
    }));
  }, [attacks]);

  // Determine initial map zoom
  const initialZoom = ['US', 'CN', 'RU', 'CA', 'BR', 'AU', 'IN'].includes(country.code) ? 4 : 6;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy previous map instance if exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.stop();
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [country.lat, country.lng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Add Zoom Control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Tile Layer setup
    if (mapStyle === 'satellite') {
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18 }
      ).addTo(map);
    } else if (mapStyle === 'street') {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);
    } else {
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);
    }

    // Add pulsing target markers for cities
    cities.current.forEach((city, idx) => {
      const isCritical = city.threatLevel === 'CRITICAL';
      const attack = attacks[idx];

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer">
            <span class="absolute w-8 h-8 rounded-full ${isCritical ? 'bg-red-500/50' : 'bg-amber-500/50'} animate-ping"></span>
            <span class="relative w-4 h-4 rounded-full ${isCritical ? 'bg-red-500 border-2 border-white' : 'bg-amber-400 border-2 border-white'} shadow-lg"></span>
            <div class="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#061224]/95 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-cyan-500/50 shadow-2xl pointer-events-none flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-red-400' : 'bg-amber-400'} animate-pulse"></span>
              ${city.name}
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([city.lat, city.lng], { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        if (!attack) return;
        setActiveCity({
          name: city.name,
          lat: city.lat,
          lng: city.lng,
          attackType: attack.type,
          status: attack.status === 'BLOCKED' ? 'BLOCKED & MITIGATED' : 'OBSERVED BY CHECK POINT',
          source: `${attack.sourceCountry.name} (${attack.sourceCountry.code})`,
          ip: attack.targetIp,
          port: attack.targetPort,
          bandwidth: attack.volume,
        });

        map.flyTo([city.lat, city.lng], Math.max(initialZoom + 1, 7), {
          duration: 1.2,
        });
      });
    });

    // Draw active attack trajectories on map
    attacks.forEach((atk, idx) => {
      const targetCity = {
        name: atk.targetCountry.name,
        lat: atk.targetCountry.lat,
        lng: atk.targetCountry.lng,
      };
      if (!targetCity) return;

      const srcLat = atk.sourceCountry.lat;
      const srcLng = atk.sourceCountry.lng;

      const color = atk.direction === 'inbound' ? '#ef4444' : '#f59e0b';

      const polyline = L.polyline(
        [
          [srcLat, srcLng],
          [targetCity.lat, targetCity.lng],
        ],
        {
          color,
          weight: 2.5,
          opacity: 0.9,
          dashArray: '8, 10',
        }
      ).addTo(map);

      polyline.bindTooltip(
        `<div class="font-sans text-xs bg-[#030a16] text-white p-2 rounded-lg border border-cyan-500/50 shadow-2xl">
          <div class="font-bold text-red-400 flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
            ${atk.type} [${atk.severity}]
          </div>
          <div class="text-[11px] text-gray-300 mt-1">
            <b>Source:</b> ${atk.sourceCountry.name}<br/>
            <b>Target Node:</b> ${targetCity.name}<br/>
            <b>Target IP:</b> <span class="font-mono text-cyan-300">${atk.targetIp}:${atk.targetPort}</span><br/>
            <b>Bandwidth:</b> <span class="text-amber-400 font-bold">${atk.volume}</span>
          </div>
        </div>`,
        { sticky: true }
      );
    });

    // Fix map rendering / size calculation after container mount
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    // Observe container size changes (e.g. Fullscreen modal toggle)
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.stop();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [country, mapStyle, attacks]);

  const handleLocateCity = (atk: AttackItem, idx: number) => {
    const targetCity = cities.current[idx];
    if (!targetCity || !mapInstanceRef.current) return;

    mapInstanceRef.current.flyTo([targetCity.lat, targetCity.lng], 7, {
      duration: 1.2,
    });

    setActiveCity({
      name: targetCity.name,
      lat: targetCity.lat,
      lng: targetCity.lng,
      attackType: atk.type,
      status: atk.status === 'BLOCKED' ? 'BLOCKED & MITIGATED' : 'OBSERVED BY CHECK POINT',
      source: `${atk.sourceCountry.name} (${atk.sourceCountry.code})`,
      ip: atk.targetIp,
      port: atk.targetPort,
      bandwidth: atk.volume,
    });
  };

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl flex flex-col bg-[#030a16]">
      {/* Top Header Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-[#030d1d]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/40 shadow-xl pointer-events-auto">
          <img
            src={`https://flagcdn.com/32x24/${country.code.toLowerCase()}.png`}
            alt={country.name}
            className="w-5 h-3.5 rounded object-cover border border-white/20"
          />
          <span className="text-xs font-bold text-white tracking-wide">{country.name} Live Cyber Map</span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            CHECK POINT LIVE
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Map Layer Switcher */}
          <div className="flex bg-[#030d1d]/90 p-0.5 rounded-xl border border-cyan-500/40 backdrop-blur-md shadow-xl text-xs">
            <button
              onClick={() => setMapStyle('dark')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                mapStyle === 'dark' ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-300 hover:text-white'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                mapStyle === 'satellite' ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-300 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapStyle('street')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                mapStyle === 'street' ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-300 hover:text-white'
              }`}
            >
              Street
            </button>
          </div>

          <button
            onClick={() => setShowAttackPanel((prev) => !prev)}
            className="bg-[#030d1d]/90 hover:bg-[#081830] text-cyan-300 hover:text-white text-xs px-2.5 py-1.5 rounded-xl border border-cyan-500/40 backdrop-blur-md font-semibold transition cursor-pointer flex items-center gap-1 shadow-xl"
            title="Toggle Live Attack List"
          >
            <span>⚡ Attacks ({attacks.length})</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 bg-[#030d1d]/90 hover:bg-slate-800 text-gray-300 hover:text-white rounded-xl border border-cyan-500/40 backdrop-blur-md flex items-center justify-center text-lg transition cursor-pointer shadow-xl"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Leaflet Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

      {/* Attack List Overlay Panel (Right Side) */}
      {showAttackPanel && (
        <div className="absolute top-16 right-3 z-[1000] w-72 sm:w-80 max-h-[calc(100%-100px)] bg-[#020b18]/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-3 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-5">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/30 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Live Attack Streams ({attacks.length})
              </h4>
            </div>
            <button
              onClick={() => setShowAttackPanel(false)}
              className="text-gray-400 hover:text-white text-xs cursor-pointer"
            >
              &times;
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {attacks.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No verified Check Point events for this country.</p>
            ) : (
              attacks.map((atk, idx) => (
                <div
                  key={atk.id || idx}
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    atk.status === 'BLOCKED'
                      ? 'bg-slate-900/60 border-gray-700/60 opacity-60'
                      : 'bg-[#061830]/80 border-cyan-500/30 hover:border-cyan-400 hover:bg-[#0a2345]'
                  }`}
                  onClick={() => handleLocateCity(atk, idx)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        atk.severity === 'CRITICAL'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {atk.severity}
                    </span>
                    <span className="font-mono text-[10px] text-amber-300 font-bold">{atk.volume}</span>
                  </div>

                  <h5 className="text-xs font-bold text-white truncate">{atk.type}</h5>

                  <div className="mt-1 flex items-center justify-between text-[10px] text-gray-300 font-mono">
                    <span className="flex items-center gap-1">
                      <img
                        src={`https://flagcdn.com/16x12/${atk.sourceCountry.code.toLowerCase()}.png`}
                        alt={atk.sourceCountry.name}
                        className="w-3.5 h-2.5 rounded object-cover"
                      />
                      {atk.sourceCountry.code} ➔ {country.code}
                    </span>
                    <span className="text-cyan-400">{atk.targetIp}:{atk.targetPort}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-white/5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLocateCity(atk, idx);
                      }}
                      className="text-[10px] text-cyan-300 hover:text-cyan-100 font-bold flex items-center gap-1"
                    >
                      🎯 Locate Node
                    </button>

                    {atk.status !== 'BLOCKED' && onBlockIp && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBlockIp(atk.targetIp);
                        }}
                        className="text-[10px] bg-red-600/80 hover:bg-red-500 text-white font-bold px-2 py-0.5 rounded border border-red-400 transition cursor-pointer"
                      >
                        Block
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Selected City Threat Telemetry Popup Card */}
      {activeCity && (
        <div className="absolute top-16 left-3 z-[1000] w-72 bg-[#020b18]/95 backdrop-blur-xl border border-red-500/40 rounded-2xl p-3 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-red-500/30">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <h4 className="text-xs font-bold text-white truncate">{activeCity.name}</h4>
            </div>
            <button
              onClick={() => setActiveCity(null)}
              className="text-gray-400 hover:text-white text-xs cursor-pointer"
            >
              &times;
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-400">Attack Type:</span>
              <span className="font-bold text-red-400">{activeCity.attackType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Threat Source:</span>
              <span className="font-semibold text-amber-300">{activeCity.source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Target IP & Port:</span>
              <span className="font-mono text-cyan-300">
                {activeCity.ip}:{activeCity.port}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Bandwidth Load:</span>
              <span className="font-bold text-amber-300">{activeCity.bandwidth}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Coordinates:</span>
              <span className="font-mono text-gray-300">
                {activeCity.lat.toFixed(2)}°, {activeCity.lng.toFixed(2)}°
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-white/10">
              <span className="text-gray-400">Status:</span>
              <span className="font-bold text-red-400 animate-pulse">{activeCity.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Real-time Stream Bar */}
      <div className="absolute bottom-2 left-3 right-3 z-[1000] bg-[#020c1b]/90 backdrop-blur-md border border-cyan-500/30 rounded-xl p-2 flex items-center justify-between text-xs shadow-2xl">
        <div className="flex items-center gap-2 overflow-hidden text-[11px]">
          <span className="bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded border border-red-500/30 shrink-0">
            LIVE TARGET
          </span>
          <span className="text-gray-300 font-mono truncate">
            {attacks[0]
              ? `${attacks[0].type} | ${attacks[0].sourceCountry.code} -> ${attacks[0].targetCountry.code} | ${attacks[0].volume}`
              : 'No verified Check Point attack event currently reported'}
          </span>
        </div>

        {attacks[0]?.targetIp && onBlockIp && (
          <button
            onClick={() => onBlockIp(attacks[0].targetIp)}
            className="shrink-0 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg border border-red-400 transition cursor-pointer flex items-center gap-1 shadow-lg ml-2"
          >
            <i className="fa-solid fa-ban text-[10px]" /> Block IP
          </button>
        )}
      </div>
    </div>
  );
};

