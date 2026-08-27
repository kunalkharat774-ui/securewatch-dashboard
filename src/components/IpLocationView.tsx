import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  Globe,
  MapPin,
  Server,
  Clock,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Layers,
  Map as MapIcon,
  Eye,
  Radio,
  ExternalLink,
  ShieldCheck,
  Building2,
  CheckCircle2,
} from 'lucide-react';

interface IpInfo {
  ip: string;
  country: string;
  countryCode: string;
  countryFlag?: string;
  region: string;
  city: string;
  postal: string;
  isp: string;
  org?: string;
  asn?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  accuracyDesc?: string;
}

type MapMode = 'road' | 'satellite' | 'hybrid' | 'dark' | 'google-embed';

const TILE_SERVERS: Record<Exclude<MapMode, 'google-embed'>, { name: string; url: string; attribution: string; maxZoom: number }> = {
  road: {
    name: 'Google Maps (Road)',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20,
  },
  satellite: {
    name: 'Google Maps (Satellite)',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Imagery',
    maxZoom: 20,
  },
  hybrid: {
    name: 'Google Maps (Hybrid)',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 20,
  },
  dark: {
    name: 'Dark View',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO & OpenStreetMap',
    maxZoom: 19,
  },
};

export const IpLocationView: React.FC = () => {
  const [inputIp, setInputIp] = useState<string>('');
  const [data, setData] = useState<IpInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('road');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Update Leaflet Map when data or mapMode changes
  useEffect(() => {
    if (!data || mapMode === 'google-embed' || !mapContainerRef.current) return;

    const lat = data.latitude;
    const lon = data.longitude;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lon],
        zoom: 13,
        zoomControl: true,
      });
      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lon], 13);
    }

    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileConfig = TILE_SERVERS[mapMode];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
      subdomains: ['a', 'b', 'c', 'd', 'mt0', 'mt1', 'mt2', 'mt3'],
    });
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    const pinColor = 'bg-blue-600';
    const ringColor = 'bg-blue-500/40';

    const customMarkerIcon = L.divIcon({
      className: 'leaflet-custom-pin',
      html: `
        <div class="relative flex items-center justify-center w-9 h-9">
          <div class="absolute w-9 h-9 rounded-full ${ringColor} animate-ping"></div>
          <div class="relative z-10 w-7 h-7 rounded-full ${pinColor} border-2 border-white shadow-lg flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
    } else {
      markerRef.current = L.marker([lat, lon], { icon: customMarkerIcon }).addTo(map);
    }

    markerRef.current
      .bindPopup(
        `<div style="font-family: system-ui, sans-serif; padding: 4px; color: #111; max-width: 200px;">
          <b style="color: #2563eb; font-size: 13px;">${data.ip}</b><br/>
          <div style="font-weight: 600; font-size: 12px; margin-top: 2px;">${data.city || 'N/A'}, ${data.country}</div>
          <small style="color: #666; display: block; margin-top: 2px;">ISP: ${data.isp}</small>
        </div>`
      )
      .openPopup();

    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [data, mapMode]);

  const lookupIP = async (queryIp: string = inputIp) => {
    setLoading(true);
    setError(null);
    const target = queryIp.trim();
    try {
      const params = target ? `?ip=${encodeURIComponent(target)}` : '';
      const res = await fetch(`/api/ip-lookup${params}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.ip || typeof json.latitude !== 'number' || typeof json.longitude !== 'number') {
        throw new Error(json.error || `IP location lookup failed with HTTP ${res.status}.`);
      }

      const parsed: IpInfo = {
        ip: json.ip,
        country: json.country || 'N/A',
        countryCode: json.country_code || 'N/A',
        countryFlag: json.country_code ? `https://flagcdn.com/w40/${json.country_code.toLowerCase()}.png` : undefined,
        region: json.region || 'N/A',
        city: json.city || 'N/A',
        postal: json.postal || 'N/A',
        isp: json.isp || 'N/A',
        org: json.org || 'N/A',
        asn: json.asn || 'N/A',
        latitude: json.latitude,
        longitude: json.longitude,
        timezone: json.timezone || 'N/A',
        accuracyDesc: json.accuracy || 'Network-level geolocation; not GPS precision',
      };
      setData(parsed);
      setInputIp(parsed.ip);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : 'Unable to retrieve live IP location.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isIpv6 = (ipStr: string) => ipStr.includes(':');

  const getFormattedLocalTime = (tz?: string) => {
    try {
      if (!tz) return new Date().toLocaleTimeString();
      return new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return new Date().toLocaleTimeString();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0b0f1f] border border-[#1d2342] rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                <Globe className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  xHunter IP Location Lookup
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Real-time IP network route tracing & location search
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="bg-[#0b0f1f] border border-[#1d2342] rounded-2xl p-5 shadow-2xl space-y-3.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookupIP(inputIp);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4 text-blue-400" />
            </div>
            <input
              type="text"
              value={inputIp}
              onChange={(e) => setInputIp(e.target.value)}
              placeholder="Enter IPv4 or IPv6 address (e.g., 8.8.8.8 or 2401:4900:...)"
              className="w-full bg-[#10162e] border border-[#232c4d] focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 min-w-[160px]"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Looking up...
              </>
            ) : (
              'Lookup Location'
            )}
          </button>
        </form>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Top Highlight Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* IP Card */}
          <div className="bg-[#0b0f1f] border border-[#1d2342] p-4 rounded-2xl shadow-xl flex flex-col justify-between space-y-2 relative group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-400" /> Target IP Address
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${isIpv6(data.ip) ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
                {isIpv6(data.ip) ? 'IPv6' : 'IPv4'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-white text-base truncate select-all" title={data.ip}>
                {data.ip}
              </span>
              <button
                onClick={() => copyToClipboard(data.ip, 'ip')}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-blue-600/20 rounded-lg transition shrink-0 cursor-pointer"
                title="Copy IP"
              >
                {copiedField === 'ip' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Location Card */}
          <div className="bg-[#0b0f1f] border border-[#1d2342] p-4 rounded-2xl shadow-xl flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" /> City & Country
              </span>
              {data.countryFlag && (
                <img src={data.countryFlag} alt={data.country} className="w-5 h-3.5 object-cover rounded shadow border border-white/20" />
              )}
            </div>
            <div>
              <div className="font-bold text-white text-sm truncate">
                {data.city && data.city !== 'N/A' ? data.city : data.region}, {data.country}
              </div>
              <div className="text-[11px] text-gray-400 truncate mt-0.5">
                State: <span className="text-gray-300 font-medium">{data.region}</span>
              </div>
            </div>
          </div>

          {/* Network ISP Card */}
          <div className="bg-[#0b0f1f] border border-[#1d2342] p-4 rounded-2xl shadow-xl flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" /> ISP / Operator
              </span>
              {data.asn && data.asn !== 'N/A' && (
                <span className="px-2 py-0.5 text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full">
                  {data.asn}
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-emerald-400 text-sm truncate" title={data.isp}>
                {data.isp}
              </div>
              <div className="text-[11px] text-gray-400 truncate mt-0.5">
                Org: <span className="text-gray-300">{data.org || data.isp}</span>
              </div>
            </div>
          </div>

          {/* Coordinates & Time Card */}
          <div className="bg-[#0b0f1f] border border-[#1d2342] p-4 rounded-2xl shadow-xl flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" /> Map Coordinates
              </span>
              <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" /> {getFormattedLocalTime(data.timezone)}
              </span>
            </div>
            <div>
              <div className="font-mono font-bold text-blue-300 text-sm truncate">
                {data.latitude.toFixed(4)}°, {data.longitude.toFixed(4)}°
              </div>
              <div className="text-[11px] text-gray-400 truncate mt-0.5">
                TZ: <span className="text-gray-300 font-mono">{data.timezone || 'UTC'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* If no IP searched yet */}
      {!data && !loading && (
        <div className="bg-[#0b0f1f] border border-[#1d2342] p-12 rounded-2xl text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-white">No IP Location Searched</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Enter an IPv4 or IPv6 address in the search box above and click "Lookup Location" to view live geolocation details, ISP routing, and interactive map.
          </p>
        </div>
      )}

      {/* Main Grid: Detailed Properties & Live Interactive Map */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Information Table Panel */}
          <div className="lg:col-span-1 bg-[#0b0f1f] border border-[#1d2342] p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#1d2342]">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                Complete Location Details
              </h2>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-medium text-emerald-400">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Live Verified
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* IP Address Field */}
              <div className="flex items-center justify-between border-b border-[#181f3b] pb-2.5">
                <span className="text-gray-400">IP Address</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-bold text-blue-400 text-sm">{data.ip}</span>
                  <button
                    onClick={() => copyToClipboard(data.ip, 'ip_detail')}
                    className="text-gray-400 hover:text-white cursor-pointer"
                    title="Copy IP"
                  >
                    {copiedField === 'ip_detail' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Country Field */}
              <div className="flex items-center justify-between border-b border-[#181f3b] pb-2.5">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" /> Country
                </span>
                <span className="font-medium text-white flex items-center gap-2">
                  {data.countryFlag && (
                    <img src={data.countryFlag} alt={data.country} className="w-5 h-3.5 object-cover rounded shadow" />
                  )}
                  {data.country}
                  {data.countryCode && <span className="text-gray-500 font-mono">({data.countryCode})</span>}
                </span>
              </div>

              {/* Region / State */}
              <div className="flex items-center justify-between border-b border-[#181f3b] pb-2.5">
                <span className="text-gray-400">Region / State</span>
                <span className="font-medium text-gray-200">{data.region}</span>
              </div>

              {/* City */}
              <div className="flex items-center justify-between border-b border-[#181f3b] pb-2.5">
                <span className="text-gray-400">City / District</span>
                <span className="font-medium text-gray-200">{data.city}</span>
              </div>

              {/* Zip / Postal Code */}
              <div className="flex items-center justify-between border-b border-[#181f3b] pb-2.5">
                <span className="text-gray-400">ZIP / Postal Code</span>
                <span className="font-mono font-medium text-gray-200">{data.postal}</span>
              </div>

              {/* ISP Operator */}
              <div className="flex items-center justify-between border-b border-[#181f3b] pb-2.5">
                <span className="text-gray-400">ISP Provider</span>
                <span className="font-medium text-emerald-400 truncate max-w-[170px]" title={data.isp}>
                  {data.isp}
                </span>
              </div>

              {/* Organization */}
              <div className="flex items-center justify-between border-b border-[#181f3b] pb-2.5">
                <span className="text-gray-400">Organization</span>
                <span className="font-medium text-gray-300 truncate max-w-[170px]" title={data.org}>
                  {data.org || '-'}
                </span>
              </div>

              {/* Latitude */}
              <div className="flex items-center justify-between border-b border-[#181f3b] pb-2.5">
                <span className="text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" /> Latitude
                </span>
                <span className="font-mono font-medium text-blue-300">{data.latitude}°</span>
              </div>

              {/* Longitude */}
              <div className="flex items-center justify-between border-b border-[#181f3b] pb-2.5">
                <span className="text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" /> Longitude
                </span>
                <span className="font-mono font-medium text-blue-300">{data.longitude}°</span>
              </div>

              {/* Timezone */}
              {data.timezone && (
                <div className="flex items-center justify-between border-b border-[#181f3b] pb-2.5">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" /> Timezone
                  </span>
                  <span className="font-mono text-gray-300">{data.timezone}</span>
                </div>
              )}

              {/* Precision Badge */}
              {data.accuracyDesc && (
                <div className="p-3 bg-[#12182e] border border-[#202947] rounded-xl text-[11px] space-y-1">
                  <span className="text-gray-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Precision & Detection Mode:
                  </span>
                  <span className="text-blue-300 font-semibold block">{data.accuracyDesc}</span>
                </div>
              )}
            </div>
          </div>

          {/* Map View Panel */}
          <div className="lg:col-span-2 bg-[#0b0f1f] border border-[#1d2342] p-4 rounded-2xl shadow-2xl space-y-3 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1d2342]">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MapIcon className="w-4 h-4 text-blue-400" />
                  Live Map View (Google Maps)
                </h3>
                <a
                  href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}&z=14`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                >
                  <ExternalLink className="w-3 h-3" /> Open in Google Maps
                </a>
              </div>

              {/* Map Mode Switches */}
              <div className="flex items-center gap-1 bg-[#10162e] p-1 rounded-xl border border-[#212a4a] flex-wrap">
                <button
                  onClick={() => setMapMode('road')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition ${
                    mapMode === 'road' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3 h-3" /> Road
                </button>
                <button
                  onClick={() => setMapMode('satellite')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition ${
                    mapMode === 'satellite' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3 h-3" /> Satellite
                </button>
                <button
                  onClick={() => setMapMode('hybrid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition ${
                    mapMode === 'hybrid' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3 h-3" /> Hybrid
                </button>
                <button
                  onClick={() => setMapMode('google-embed')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition ${
                    mapMode === 'google-embed' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <MapIcon className="w-3 h-3 text-amber-400" /> Google Embed
                </button>
                <button
                  onClick={() => setMapMode('dark')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition ${
                    mapMode === 'dark' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Radio className="w-3 h-3" /> Dark
                </button>
              </div>
            </div>

            <div className="relative h-[440px] w-full rounded-xl overflow-hidden border border-[#1d2342] bg-[#0a0d1a]">
              {mapMode === 'google-embed' ? (
                <iframe
                  title="Google Maps Location View"
                  src={`https://maps.google.com/maps?q=${data.latitude},${data.longitude}&z=13&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  allowFullScreen
                />
              ) : (
                <div ref={mapContainerRef} className="w-full h-full z-10" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
