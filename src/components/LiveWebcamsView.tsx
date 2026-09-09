import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';

interface WebcamFeed {
  id: string;
  title: string;
  city: string;
  country: string;
  countryCode: string;
  category: string;
  youtubeId: string;
  status: string;
  description: string;
}

interface WebcamCoordinate {
  lat: number;
  lng: number;
}

const USER_SUBMITTED_IDS = [
  'qgs7w2RSROE', 'HHp4rjhJsWI', 'JLvCEDGJr-s', 'J7ZrIDvqlic',
  'cTi5sCsUSfc', 'tEtg5Kg3voQ', 'yfI8jKgOnsY', 'hHLlZhianIQ',
  'AovvFApVnKc', 'Cp4RRAEgpeU', 'fIMbMz2P7Bs', 'GRsoTIIZBNM',
  'yv2RtoIMNzA', 'rFZHOHl-L8A', 'DoUOrTJbIu4', '8VvER9Xl20E',
];

const WEBCAMS: WebcamFeed[] = [
  {
    id: 'nyc', title: 'EarthCam Live: Times Square North 4K', city: 'New York City',
    country: 'United States', countryCode: 'US', category: 'Street & Traffic',
    youtubeId: 'JQ_jwk_7OVE', status: 'Online 24/7',
    description: 'Live view of Times Square, Broadway, and the Manhattan pedestrian district.',
  },
  {
    id: 'delhi', title: 'New Delhi Live Camera', city: 'New Delhi', country: 'India',
    countryCode: 'IN', category: 'City View', youtubeId: '7wBNtsgqNOI', status: 'Live Stream',
    description: 'Continuous live city camera feed from New Delhi.',
  },
  {
    id: 'tokyo', title: 'Tokyo Shibuya Live Camera', city: 'Tokyo', country: 'Japan',
    countryCode: 'JP', category: 'Street & Traffic', youtubeId: 'EFum1rGUdkk', status: 'Online 24/7',
    description: 'Live view of Shibuya crossing and the surrounding Tokyo cityscape.',
  },
  {
    id: 'sydney', title: 'Sydney Bondi Beach Live Camera', city: 'Sydney', country: 'Australia',
    countryCode: 'AU', category: 'Beach & Ocean', youtubeId: 'ZvYvZLfPatQ', status: 'Live Stream',
    description: 'Live coastal camera overlooking Bondi Beach.',
  },
  {
    id: 'dubai', title: 'Dubai Marina Live Camera', city: 'Dubai', country: 'United Arab Emirates',
    countryCode: 'AE', category: 'City View', youtubeId: 'WKGK_hYnlGE', status: 'Online 24/7',
    description: 'Live view of Dubai Marina and the surrounding skyline.',
  },
  {
    id: 'paris', title: 'Paris Live Camera', city: 'Paris', country: 'France',
    countryCode: 'FR', category: 'City View', youtubeId: 'rvtygG4n6ew', status: 'Live Stream',
    description: 'Live Paris city camera feed.',
  },
  ...USER_SUBMITTED_IDS.map((youtubeId, index) => ({
    id: `user-${youtubeId}`,
    title: `User Added Live Webcam ${String(index + 1).padStart(2, '0')}`,
    city: 'Unverified Source', country: 'Global Network', countryCode: 'GN',
    category: 'User Added Feed', youtubeId, status: 'External Feed',
    description: 'User-provided external YouTube live webcam feed.',
  })),
];

const WEBCAM_COORDINATES: Record<string, WebcamCoordinate> = {
  nyc: { lat: 40.7589, lng: -73.9851 },
  delhi: { lat: 28.6139, lng: 77.209 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  paris: { lat: 48.8566, lng: 2.3522 },
};

const getWebcamCoordinate = (feed: WebcamFeed, index: number): WebcamCoordinate => {
  return WEBCAM_COORDINATES[feed.id] || {
    lat: 12 - (index % 4) * 12,
    lng: -150 + index * 20,
  };
};

export const LiveWebcamsView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const selectFeedRef = useRef<(feed: WebcamFeed) => void>(() => undefined);
  const [selectedId, setSelectedId] = useState(WEBCAMS[0].id);
  const [country, setCountry] = useState('ALL');
  const selected = WEBCAMS.find((feed) => feed.id === selectedId) || WEBCAMS[0];
  const countries = useMemo(() => Array.from(new Set(WEBCAMS.map((feed) => feed.countryCode))), []);
  const filtered = country === 'ALL' ? WEBCAMS : WEBCAMS.filter((feed) => feed.countryCode === country);

  const selectFeed = (feed: WebcamFeed) => {
    setSelectedId(feed.id);
    setCountry(feed.countryCode);
  };

  selectFeedRef.current = selectFeed;

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 10,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps',
    }).addTo(map);

    WEBCAMS.forEach((feed, index) => {
      const coordinate = getWebcamCoordinate(feed, index);
      const marker = L.marker([coordinate.lat, coordinate.lng], {
        icon: L.divIcon({
          className: 'webcam-map-marker',
          html: '<span style="display:block;width:14px;height:14px;border-radius:999px;background:#22c55e;border:2px solid #dcfce7;box-shadow:0 0 0 5px rgba(34,197,94,.2),0 0 16px rgba(34,197,94,.9)"></span>',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      }).addTo(map);

      marker.bindTooltip(`${feed.city} · ${feed.country}`, {
        direction: 'top',
        offset: [0, -8],
        className: 'webcam-map-tooltip',
      });
      marker.on('click', () => {
        selectFeedRef.current(feed);
        map.flyTo([coordinate.lat, coordinate.lng], Math.max(map.getZoom(), 4), { duration: 0.8 });
      });
    });

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(mapContainerRef.current);
    window.setTimeout(() => map.invalidateSize(), 150);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-y-0 left-0 right-0 z-[60] overflow-hidden bg-[#020814] md:left-64">
      <section className="relative h-full w-full overflow-hidden bg-[#020814] shadow-xl">
        <div className="absolute left-4 right-4 top-4 z-[500] rounded-xl border border-cyan-500/30 bg-[#020814]/90 px-4 py-3 shadow-2xl backdrop-blur-xl sm:left-6 sm:right-auto sm:min-w-[430px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                GLOBAL WEBCAM NETWORK
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">Select a green point to open its live country feed</p>
            </div>
            <span className="shrink-0 rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">{WEBCAMS.length} POINTS ONLINE</span>
          </div>
        </div>
        <div ref={mapContainerRef} className="h-full w-full bg-[#07131d]" />
        <div className="absolute bottom-4 left-4 z-[500] w-[calc(100%-2rem)] max-w-[560px] overflow-hidden rounded-xl border border-cyan-500/30 bg-[#020814]/95 shadow-2xl backdrop-blur-xl sm:bottom-6 sm:left-6">
          <div className="flex items-center justify-between border-b border-cyan-500/20 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" /> LIVE FEED
            </div>
            <p className="truncate text-xs text-gray-400">{selected.title} · {selected.city}, {selected.country}</p>
          </div>
          <span className="shrink-0 rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">{selected.status}</span>
          </div>
          <div className="aspect-video w-full bg-black">
          <iframe
            key={selected.youtubeId}
            title={`${selected.title} live webcam`}
            src={`https://www.youtube-nocookie.com/embed/${selected.youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-cyan-500/20 p-3 text-xs sm:grid-cols-4">
          <div><p className="text-gray-500">LOCATION</p><p className="mt-1 truncate font-semibold text-cyan-200">{selected.city}</p></div>
          <div><p className="text-gray-500">COUNTRY</p><p className="mt-1 truncate font-semibold text-white">{selected.country}</p></div>
          <div><p className="text-gray-500">CATEGORY</p><p className="mt-1 truncate font-semibold text-white">{selected.category}</p></div>
          <div><p className="text-gray-500">SOURCE</p><p className="mt-1 font-semibold text-emerald-300">YouTube Live</p></div>
          </div>
          <p className="hidden px-4 pb-3 text-xs leading-relaxed text-gray-400 sm:block">{selected.description}</p>
        </div>
      </section>

      <aside className="absolute bottom-4 right-4 z-[500] hidden max-h-[calc(100vh-2rem)] w-[320px] flex-col rounded-xl border border-cyan-500/30 bg-[#020814]/95 p-3 shadow-2xl backdrop-blur-xl xl:flex">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white">Camera Network</h3>
          <span className="text-[10px] font-mono text-emerald-300">{filtered.length} FEEDS</span>
        </div>
        <select value={country} onChange={(event) => setCountry(event.target.value)} className="mb-3 rounded border border-cyan-500/30 bg-[#071a2b] px-2 py-2 text-xs text-gray-200 outline-none">
          <option value="ALL">All locations</option>
          {countries.map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
        <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
          {filtered.map((feed) => (
            <button key={feed.id} onClick={() => selectFeed(feed)} className={`w-full rounded-lg border p-3 text-left transition ${selected.id === feed.id ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-white/10 bg-black/20 hover:border-cyan-500/40'}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 text-xs font-semibold text-white">{feed.title}</span>
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              </div>
              <p className="mt-1 text-[10px] text-gray-400">{feed.city} · {feed.category}</p>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
};