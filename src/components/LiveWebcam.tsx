/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Live Country Webcams - Single File Application
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import countriesData from 'world-atlas/countries-110m.json';
import { 
  Globe, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  X, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

/* ==========================================================================
   1. TYPES & DATA
   ========================================================================== */

export interface LiveFeed {
  id: string;
  youtubeId: string;
  title: string;
  location: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  elevation: string;
  timezone: string;
  category: 'urban' | 'marine' | 'darksky' | 'polar' | 'alpine';
  description: string;
  signalQuality: number;
}

export type VisualFilter = 'normal' | 'nightvision' | 'thermal' | 'monochrome';

export interface GlobeSettings {
  autoRotate: boolean;
  rotationSpeed: number;
  showAtmosphere: boolean;
}

export const DEFAULT_FEEDS: LiveFeed[] = [
  {
    id: 'cam-01',
    youtubeId: 'DoUOrTJbIu4',
    title: 'Shibuya Crossing & Tokyo Metropolis',
    location: 'Tokyo',
    country: 'Japan',
    region: 'East Asia · Sector 07',
    lat: 35.6595,
    lng: 139.7005,
    elevation: '42m',
    timezone: 'Asia/Tokyo',
    category: 'urban',
    description: 'Pedestrian crossing & neon commercial district surveillance.',
    signalQuality: 5
  },
  {
    id: 'cam-02',
    youtubeId: 'J7ZrIDvqlic',
    title: 'Sydney Harbour & Opera House Vista',
    location: 'Sydney',
    country: 'Australia',
    region: 'Oceania · Sector 02',
    lat: -33.8568,
    lng: 151.2153,
    elevation: '15m',
    timezone: 'Australia/Sydney',
    category: 'marine',
    description: 'Deep harbour maritime navigation channel.',
    signalQuality: 5
  },
  {
    id: 'cam-03',
    youtubeId: 'xdR31xv7il0',
    title: 'Bondi Beach Coastal Surf Watch',
    location: 'Bondi, New South Wales',
    country: 'Australia',
    region: 'Oceania · Sector 02',
    lat: -33.8915,
    lng: 151.2767,
    elevation: '8m',
    timezone: 'Australia/Sydney',
    category: 'marine',
    description: 'South Pacific shoreline break & littoral observation.',
    signalQuality: 5
  },
  {
    id: 'cam-04',
    youtubeId: 'oibsohQ14cY',
    title: 'Melbourne CBD & Yarra River Corridor',
    location: 'Melbourne, Victoria',
    country: 'Australia',
    region: 'Oceania · Sector 02',
    lat: -37.8136,
    lng: 144.9631,
    elevation: '31m',
    timezone: 'Australia/Melbourne',
    category: 'urban',
    description: 'Metropolitan arterial transit line and skyline.',
    signalQuality: 4
  },
  {
    id: 'cam-05',
    youtubeId: 'gEbrHdFRgpQ',
    title: 'Brisbane River & Story Bridge Array',
    location: 'Brisbane, Queensland',
    country: 'Australia',
    region: 'Oceania · Sector 02',
    lat: -27.4698,
    lng: 153.0251,
    elevation: '28m',
    timezone: 'Australia/Brisbane',
    category: 'urban',
    description: 'Subtropical river traffic infrastructure monitoring.',
    signalQuality: 5
  },
  {
    id: 'cam-06',
    youtubeId: 'ydYDqZQpim8',
    title: 'Perth Western Coast & Indian Ocean',
    location: 'Perth, Western Australia',
    country: 'Australia',
    region: 'Oceania · Sector 02',
    lat: -31.9505,
    lng: 115.8605,
    elevation: '18m',
    timezone: 'Australia/Perth',
    category: 'marine',
    description: 'Indian Ocean maritime approach and Swan River littoral zone.',
    signalQuality: 4
  },
  {
    id: 'cam-07',
    youtubeId: 'EO_1LWqsCNE',
    title: 'Svalbard Arctic Deep Polar Station',
    location: 'Longyearbyen, Svalbard',
    country: 'Norway',
    region: 'High Arctic · Sector 09',
    lat: 78.2232,
    lng: 15.6267,
    elevation: '130m',
    timezone: 'Arctic/Longyearbyen',
    category: 'polar',
    description: 'High-latitude polar night observation base and aurora detector.',
    signalQuality: 5
  },
  {
    id: 'cam-08',
    youtubeId: 'wVNt3l657X0',
    title: 'Reykjavik Volcano & Nocturnal Sky',
    location: 'Reykjanes Peninsula',
    country: 'Iceland',
    region: 'North Atlantic · Sector 04',
    lat: 63.8950,
    lng: -22.3550,
    elevation: '92m',
    timezone: 'Atlantic/Reykjavik',
    category: 'darksky',
    description: 'Geothermal rift zone and volcanic nocturnal horizon.',
    signalQuality: 4
  },
  {
    id: 'cam-09',
    youtubeId: '1EiC9bvVGnk',
    title: 'Atacama Desert High Plateau Observatory',
    location: 'Antofagasta Region',
    country: 'Chile',
    region: 'South America · Sector 05',
    lat: -24.6272,
    lng: -70.4042,
    elevation: '2,635m',
    timezone: 'America/Santiago',
    category: 'darksky',
    description: 'Ultra-arid high-altitude astronomical plateau array.',
    signalQuality: 5
  },
  {
    id: 'cam-10',
    youtubeId: '0Kaji9GHl68',
    title: 'Tromsø Fjord Northern Lights Watch',
    location: 'Tromsø',
    country: 'Norway',
    region: 'Scandinavian North · Sector 03',
    lat: 69.6492,
    lng: 18.9553,
    elevation: '45m',
    timezone: 'Europe/Oslo',
    category: 'polar',
    description: 'Fjord maritime gateway with geomagnetic auroral oval coverage.',
    signalQuality: 5
  },
  {
    id: 'cam-11',
    youtubeId: '77akujLn4k8',
    title: 'Mauna Kea Stellar Horizon Array',
    location: 'Mauna Kea, Hawaii',
    country: 'United States',
    region: 'Central Pacific · Sector 01',
    lat: 19.8206,
    lng: -155.4681,
    elevation: '4,205m',
    timezone: 'Pacific/Honolulu',
    category: 'darksky',
    description: 'Summit above cloud deck monitoring celestial hemisphere dynamics.',
    signalQuality: 5
  },
  {
    id: 'cam-12',
    youtubeId: 'P5WnSGXJpkM',
    title: 'Namib Desert Dark Sky Wilderness',
    location: 'Sossusvlei, Namib-Naukluft',
    country: 'Namibia',
    region: 'Southern Africa · Sector 08',
    lat: -24.7570,
    lng: 15.2820,
    elevation: '580m',
    timezone: 'Africa/Windhoek',
    category: 'darksky',
    description: 'Hyper-arid sand sea dark sky reserve with zero light pollution.',
    signalQuality: 4
  },
  {
    id: 'cam-13',
    youtubeId: 'oI8R4_UG3Fs',
    title: 'Matterhorn Alpine Glacier Panorama',
    location: 'Zermatt, Valais',
    country: 'Switzerland',
    region: 'Central Alps · Sector 06',
    lat: 45.9765,
    lng: 7.7491,
    elevation: '3,883m',
    timezone: 'Europe/Zurich',
    category: 'alpine',
    description: 'Perennial alpine glacier and peak weather telemetry.',
    signalQuality: 5
  },
  {
    id: 'cam-14',
    youtubeId: 'VsuSbXPN93o',
    title: 'Times Square Central Grid',
    location: 'Manhattan, New York',
    country: 'United States',
    region: 'North America · Sector 01',
    lat: 40.7580,
    lng: -73.9855,
    elevation: '16m',
    timezone: 'America/New_York',
    category: 'urban',
    description: 'High-density commercial canyon transit flow.',
    signalQuality: 5
  },
  {
    id: 'cam-15',
    youtubeId: 'sK8I9H2IUHc',
    title: 'Tower Bridge & River Thames Channel',
    location: 'London',
    country: 'United Kingdom',
    region: 'Western Europe · Sector 06',
    lat: 51.5055,
    lng: -0.0754,
    elevation: '12m',
    timezone: 'Europe/London',
    category: 'marine',
    description: 'Historic bascule bridge navigational channel.',
    signalQuality: 5
  },
  {
    id: 'cam-16',
    youtubeId: '7E_HX7HUUEU',
    title: 'Dubai Marina & Persian Gulf Coast',
    location: 'Dubai',
    country: 'United Arab Emirates',
    region: 'Middle East · Sector 10',
    lat: 25.0772,
    lng: 55.1384,
    elevation: '11m',
    timezone: 'Asia/Dubai',
    category: 'urban',
    description: 'Artificial canal city, high-rise towers and coastal waters.',
    signalQuality: 5
  },
  {
    id: 'cam-17',
    youtubeId: 'zmv6NPLg91U',
    title: 'Grand Canal & Rialto Bridge Waterway',
    location: 'Venice',
    country: 'Italy',
    region: 'Mediterranean · Sector 06',
    lat: 45.4371,
    lng: 12.3326,
    elevation: '2m',
    timezone: 'Europe/Rome',
    category: 'marine',
    description: 'Venetian lagoon principal waterway and historic facade.',
    signalQuality: 4
  },
  {
    id: 'cam-18',
    youtubeId: 'b3FEr9SfWpU',
    title: 'Teheran-ro Boulevard & Gangnam Tech Hub',
    location: 'Seoul',
    country: 'South Korea',
    region: 'East Asia · Sector 07',
    lat: 37.4979,
    lng: 127.0276,
    elevation: '38m',
    timezone: 'Asia/Seoul',
    category: 'urban',
    description: 'Primary technological corridor and transit arterial stream.',
    signalQuality: 5
  },
  {
    id: 'cam-19',
    youtubeId: 'mXEL2hZuCZ0',
    title: 'Railway Crossing Traffic',
    location: 'Location unverified',
    country: 'Location unverified',
    region: 'Location unverified',
    lat: 0,
    lng: 0,
    elevation: 'N/A',
    timezone: 'UTC',
    category: 'urban',
    description: 'Railway crossing traffic stream; the video does not identify its location.',
    signalQuality: 4
  },
  {
    id: 'cam-20',
    youtubeId: 'WshfLiNM7f0',
    title: 'RAF Lakenheath Fighter Wing',
    location: 'RAF Lakenheath',
    country: 'United Kingdom',
    region: 'Suffolk, England · Sector 03',
    lat: 52.4093,
    lng: 0.5610,
    elevation: '10m',
    timezone: 'Europe/London',
    category: 'urban',
    description: 'Live aircraft activity at RAF Lakenheath, home of the 48th Fighter Wing.',
    signalQuality: 5
  },
  {
    id: 'cam-21',
    youtubeId: 'GLQhbRGv5qU',
    title: 'Shinjuku Railway & Omoide Yokocho',
    location: 'Shinjuku, Tokyo',
    country: 'Japan',
    region: 'East Asia · Sector 07',
    lat: 35.6938,
    lng: 139.7034,
    elevation: '35m',
    timezone: 'Asia/Tokyo',
    category: 'urban',
    description: 'Live view of the Shinjuku railway area and Omoide Yokocho.',
    signalQuality: 5
  },
  {
    id: 'cam-22',
    youtubeId: 'PccWLiNccGE',
    title: 'General Tyulenev Avenue',
    location: 'Ulyanovsk',
    country: 'Russia',
    region: 'Volga Federal District · Sector 03',
    lat: 54.3282,
    lng: 48.3866,
    elevation: '130m',
    timezone: 'Europe/Ulyanovsk',
    category: 'urban',
    description: 'Street camera on General Tyulenev Avenue in Ulyanovsk.',
    signalQuality: 4
  },
  {
    id: 'cam-23',
    youtubeId: 'LwihxyJ4V20',
    title: 'Levi Ski Resort — Zero Point',
    location: 'Levi',
    country: 'Finland',
    region: 'Lapland · Sector 03',
    lat: 67.7972,
    lng: 24.8052,
    elevation: '531m',
    timezone: 'Europe/Helsinki',
    category: 'alpine',
    description: 'Zero Point webcam at Levi Ski Resort in Finnish Lapland.',
    signalQuality: 5
  },
  {
    id: 'cam-24',
    youtubeId: 'uCbwWg_hr0A',
    title: 'Cincinnati Skyline & Ohio River',
    location: 'Covington, Kentucky',
    country: 'United States',
    region: 'North America · Sector 01',
    lat: 39.0837,
    lng: -84.5086,
    elevation: '155m',
    timezone: 'America/Kentucky/Louisville',
    category: 'urban',
    description: 'Cincinnati skyline, Ohio River, and Brent Spence Bridge from Covington.',
    signalQuality: 5
  },
  {
    id: 'cam-25',
    youtubeId: 'RDchI1SLh4Q',
    title: 'Nevsky Avenue & Sadovaya Street',
    location: 'Saint Petersburg',
    country: 'Russia',
    region: 'Northwestern Federal District · Sector 03',
    lat: 59.9275,
    lng: 30.3338,
    elevation: '5m',
    timezone: 'Europe/Moscow',
    category: 'urban',
    description: 'Live view of the Nevsky Avenue and Sadovaya Street intersection.',
    signalQuality: 5
  },
  {
    id: 'cam-26',
    youtubeId: '1j-V9OAVQN0',
    title: 'CNU Great Lawn',
    location: 'Newport News, Virginia',
    country: 'United States',
    region: 'North America · Sector 01',
    lat: 37.0636,
    lng: -76.4930,
    elevation: '7m',
    timezone: 'America/New_York',
    category: 'urban',
    description: 'Great Lawn webcam at Christopher Newport University.',
    signalQuality: 4
  },
  {
    id: 'cam-27',
    youtubeId: 'HPS48TMmNag',
    title: 'Duluth Canal Cam',
    location: 'Duluth, Minnesota',
    country: 'United States',
    region: 'North America · Sector 01',
    lat: 46.7785,
    lng: -92.0940,
    elevation: '186m',
    timezone: 'America/Chicago',
    category: 'marine',
    description: 'Live view of the Duluth Ship Canal and harbor entrance.',
    signalQuality: 5
  },
  {
    id: 'cam-28',
    youtubeId: '482CzL5nYa0',
    title: 'Norcia Live Webcam',
    location: 'Norcia',
    country: 'Italy',
    region: 'Umbria · Sector 06',
    lat: 42.7934,
    lng: 13.0950,
    elevation: '604m',
    timezone: 'Europe/Rome',
    category: 'urban',
    description: 'Live town view of Norcia in the Umbria region of Italy.',
    signalQuality: 4
  },
  {
    id: 'cam-29',
    youtubeId: 'AovvFApVnKc',
    title: 'Crystal Cove Beach',
    location: 'Tofino, British Columbia',
    country: 'Canada',
    region: 'Vancouver Island · Sector 02',
    lat: 49.1190,
    lng: -125.8880,
    elevation: '10m',
    timezone: 'America/Vancouver',
    category: 'marine',
    description: 'Beach view from Crystal Cove Beach Resort in Tofino.',
    signalQuality: 5
  },
  {
    id: 'cam-30',
    youtubeId: 'lBjz3lX14zY',
    title: 'Shaka Webcam',
    location: 'Location unverified',
    country: 'Location unverified',
    region: 'Location unverified',
    lat: 0,
    lng: 0,
    elevation: 'N/A',
    timezone: 'UTC',
    category: 'urban',
    description: 'ElksLodge616 Shaka webcam; the video does not identify its location.',
    signalQuality: 4
  },
  {
    id: 'cam-31',
    youtubeId: 'J7JC0bGVBeQ',
    title: 'BioShock 2 Remastered Gameplay',
    location: 'Location unverified',
    country: 'Location unverified',
    region: 'Location unverified',
    lat: 0,
    lng: 0,
    elevation: 'N/A',
    timezone: 'UTC',
    category: 'urban',
    description: 'The linked video is gameplay rather than a webcam; its location is not applicable.',
    signalQuality: 4
  },
  {
    id: 'cam-32',
    youtubeId: 'DwKCna1mumk',
    title: 'Hush Bar Street Cam',
    location: 'Chaweng, Koh Samui',
    country: 'Thailand',
    region: 'Surat Thani · Sector 07',
    lat: 9.5320,
    lng: 100.0620,
    elevation: '5m',
    timezone: 'Asia/Bangkok',
    category: 'urban',
    description: 'Live street view near Hush Bar on Soi Green Mango in Chaweng.',
    signalQuality: 5
  }
];

/* ==========================================================================
   2. GEOMETRY & TEXTURE HELPERS (DARK POLITICAL THEME)
   ========================================================================== */

export function latLngToCanvasXY(lat: number, lng: number, width: number, height: number): [number, number] {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

export function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

const COUNTRY_PALETTE = [
  '#f5b041', '#00a8ff', '#9c27b0', '#2ecc71', '#e84393', '#1abc9c',
  '#f39c12', '#3498db', '#8e44ad', '#27ae60', '#fa8231', '#45aaf2',
  '#eb3b5a', '#2bcbba', '#fed330', '#a55eea'
];

function getCountryColor(id: string | number | undefined, index: number): string {
  if (typeof id === 'number') {
    return COUNTRY_PALETTE[(id * 7 + 3) % COUNTRY_PALETTE.length];
  }
  if (typeof id === 'string') {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    return COUNTRY_PALETTE[Math.abs(hash) % COUNTRY_PALETTE.length];
  }
  return COUNTRY_PALETTE[index % COUNTRY_PALETTE.length];
}

export function createPoliticalWorldTexture(): THREE.CanvasTexture {
  const width = 4096;
  const height = 2048;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Pitch Black Ocean
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const topology = countriesData as unknown as { objects: { countries: unknown } };
  const geojson = feature(topology as never, topology.objects.countries as never) as unknown as {
    features: Array<{
      id?: string | number;
      properties?: Record<string, unknown>;
      geometry: {
        type: 'Polygon' | 'MultiPolygon';
        coordinates: number[][][] | number[][][][];
      };
    }>;
  };

  const drawRing = (ring: number[][]) => {
    if (!ring || ring.length < 3) return;
    for (let i = 0; i < ring.length; i++) {
      const [lng, lat] = ring[i];
      const [x, y] = latLngToCanvasXY(lat, lng, width, height);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevLng = ring[i - 1][0];
        if (Math.abs(lng - prevLng) > 180) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
  };

  if (geojson && geojson.features) {
    geojson.features.forEach((country, index) => {
      const color = getCountryColor(country.id, index);
      const geom = country.geometry;
      if (!geom) return;

      ctx.fillStyle = color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.0;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      if (geom.type === 'Polygon') {
        const rings = geom.coordinates as number[][][];
        ctx.beginPath();
        rings.forEach((ring) => drawRing(ring));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (geom.type === 'MultiPolygon') {
        const multiRings = geom.coordinates as number[][][][];
        multiRings.forEach((polygonRings) => {
          ctx.beginPath();
          polygonRings.forEach((ring) => drawRing(ring));
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      }
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ==========================================================================
   3. LIVE FEED PLAYER (CUSTOM BORDER, NO YOUTUBE UI, FULLSCREEN)
   ========================================================================== */

interface LiveFeedPlayerProps {
  feed: LiveFeed | null;
  onClose: () => void;
  onSelectFeed: (feed: LiveFeed) => void;
  allFeeds: LiveFeed[];
}

const LiveFeedPlayer: React.FC<LiveFeedPlayerProps> = ({
  feed,
  onClose,
  onSelectFeed,
  allFeeds
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filter, setFilter] = useState<VisualFilter>('normal');
  const [utcTime, setUtcTime] = useState('');
  const [localTime, setLocalTime] = useState('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
      if (feed) {
        try {
          const lTime = new Intl.DateTimeFormat('en-GB', {
            timeZone: feed.timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).format(now);
          setLocalTime(lTime + ' LOC');
        } catch {
          setLocalTime(now.toTimeString().slice(0, 8) + ' LOC');
        }
      }
    };
    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, [feed]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!feed) return null;

  const currentIndex = allFeeds.findIndex(f => f.id === feed.id);
  const handlePrev = () => {
    const nextIdx = (currentIndex - 1 + allFeeds.length) % allFeeds.length;
    onSelectFeed(allFeeds[nextIdx]);
  };
  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % allFeeds.length;
    onSelectFeed(allFeeds[nextIdx]);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen request failed:', err);
    }
  };

  const getFilterStyle = (): React.CSSProperties => {
    switch (filter) {
      case 'nightvision':
        return { filter: 'sepia(100%) hue-rotate(85deg) saturate(2.4) brightness(1.15) contrast(1.3)' };
      case 'thermal':
        return { filter: 'contrast(1.9) saturate(2.2) hue-rotate(185deg) invert(10%)' };
      case 'monochrome':
        return { filter: 'grayscale(100%) contrast(1.4) brightness(0.95)' };
      default:
        return { filter: 'contrast(1.08) saturate(1.05)' };
    }
  };

  return (
    <div
      ref={containerRef}
      className={`
        ${isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-black flex flex-col p-4'
          : 'absolute bottom-5 right-5 w-[92vw] sm:w-[480px] md:w-[520px] z-40 flex flex-col'
        }
        transition-all duration-300 ease-out select-none
      `}
    >
      <div className="relative flex flex-col w-full h-full bg-[#02050f]/95 border-2 border-cyan-500/80 shadow-[0_0_35px_rgba(6,182,212,0.3)] rounded-lg overflow-hidden backdrop-blur-md">
        
        {/* Tactical Corner Brackets */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 z-30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 z-30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 z-30 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 z-30 pointer-events-none" />

        {/* Top Bar (Covers YouTube title bar) */}
        <div className="relative z-30 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-[#020617] via-[#051125] to-[#040d1e] border-b border-cyan-500/40 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/80 border border-red-500/60 text-red-400 font-semibold tracking-wider text-[10px] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
              LIVE · REC
            </span>
            <span className="text-cyan-300 font-bold uppercase tracking-wider text-[11px] truncate max-w-[150px] sm:max-w-[220px]">
              {feed.location}
            </span>
            <span className="hidden sm:inline-block text-slate-400 text-[10px]">
              · {feed.country}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border border-cyan-500/30 rounded bg-slate-900/60">
              <button
                onClick={handlePrev}
                title="Previous Live Feed"
                className="p-1 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNext}
                title="Next Live Feed"
                className="p-1 text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_12px_rgba(6,182,212,0.5)] transition-all cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>WINDOW</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>FULLSCREEN</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              title="Close Feed"
              className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-slate-700 hover:border-red-500/40 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video Display Chassis (Scaled & Masked to hide YouTube logos) */}
        <div className="relative flex-1 w-full bg-black overflow-hidden group min-h-[240px] sm:min-h-[290px]">
          <div
            className="absolute inset-0 w-full h-full pointer-events-auto"
            style={getFilterStyle()}
          >
            <iframe
              key={feed.id}
              src={`https://www.youtube-nocookie.com/embed/${feed.youtubeId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&modestbranding=1&playsinline=1&fs=0&loop=1&playlist=${feed.youtubeId}`}
              title={feed.title}
              className="absolute top-[-16%] left-[-16%] w-[132%] h-[132%] border-0 pointer-events-none select-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen={false}
            />
          </div>

          <div className="absolute bottom-3 left-3 z-20 pointer-events-none text-[10px] font-mono text-cyan-300/90 bg-black/70 px-2 py-1 rounded border border-cyan-500/30 backdrop-blur-xs flex items-center gap-2">
            <span>{utcTime}</span>
            <span className="text-cyan-500">|</span>
            <span>{localTime}</span>
            <span className="text-cyan-500">|</span>
            <span className="text-emerald-400">ELEV {feed.elevation}</span>
          </div>
        </div>

        {/* Bottom Bar (Covers YouTube bottom bar) */}
        <div className="relative z-30 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-[#020617] via-[#051125] to-[#040d1e] border-t border-cyan-500/40 text-xs font-mono">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 mr-1 hidden sm:inline">OPTICS:</span>
            {(['normal', 'nightvision', 'thermal', 'monochrome'] as VisualFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-2 py-0.5 text-[10px] uppercase font-mono rounded transition-colors cursor-pointer
                  ${filter === f
                    ? 'bg-cyan-500 text-black font-bold shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                    : 'text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 border border-cyan-500/20'
                  }
                `}
              >
                {f === 'nightvision' ? 'NIGHT' : f === 'monochrome' ? 'B&W' : f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-[10px] text-cyan-400/80 font-mono hidden sm:block">
              {feed.lat > 0 ? `${feed.lat.toFixed(2)}°N` : `${Math.abs(feed.lat).toFixed(2)}°S`}, {' '}
              {feed.lng > 0 ? `${feed.lng.toFixed(2)}°E` : `${Math.abs(feed.lng).toFixed(2)}°W`}
            </div>

            <div className="flex items-center gap-0.5 px-1 py-1 rounded bg-slate-900/80 border border-slate-700" title={`Signal: ${feed.signalQuality}/5`}>
              {[1, 2, 3, 4, 5].map((bar) => (
                <div
                  key={bar}
                  className={`w-1 rounded-xs ${
                    bar <= feed.signalQuality
                      ? 'bg-emerald-400 shadow-[0_0_4px_#34d399]'
                      : 'bg-slate-700'
                  }`}
                  style={{ height: `${bar * 2.5 + 4}px` }}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

/* ==========================================================================
   4. GLOBE HUD (ONLY "LIVE COUNTRY WEBCAMS")
   ========================================================================== */

interface GlobeHUDProps {
  selectedFeed: LiveFeed | null;
  settings: GlobeSettings;
  onUpdateSettings: (settings: Partial<GlobeSettings>) => void;
  feedCount: number;
}

const GlobeHUD: React.FC<GlobeHUDProps> = ({
  selectedFeed,
  settings,
  onUpdateSettings,
  feedCount
}) => {
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden font-mono z-20">
      
      {/* Top Header */}
      <header className="absolute top-0 inset-x-0 p-3 sm:p-4 flex items-center justify-between gap-3 bg-gradient-to-b from-[#01040d]/80 via-[#01040d]/40 to-transparent pointer-events-auto">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-md bg-cyan-950/70 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <Globe className="w-4 h-4 text-cyan-400" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white tracking-widest uppercase">
                LIVE COUNTRY WEBCAMS
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="text-emerald-400 font-semibold">{feedCount} GLOBAL BEACONS</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{utcTime}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Bottom Controls */}
      <footer className="absolute bottom-3 sm:bottom-4 left-3 sm:left-6 flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center p-1 bg-[#020715]/80 border border-cyan-500/30 rounded-lg shadow-xl backdrop-blur-md text-xs">
          <button
            onClick={() => onUpdateSettings({ autoRotate: !settings.autoRotate })}
            title={settings.autoRotate ? "Pause Auto-Rotation" : "Enable Auto-Rotation"}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer
              ${settings.autoRotate
                ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }
            `}
          >
            <RotateCw className={`w-3.5 h-3.5 ${settings.autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '10s' }} />
            <span className="text-[11px] hidden sm:inline">ROTATE</span>
          </button>
        </div>

        {selectedFeed && (
          <div className="flex items-center gap-2 px-3 py-1 bg-[#020715]/80 border border-emerald-500/40 rounded-lg text-xs shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-400 text-[10px] uppercase">TARGET:</span>
            <span className="text-emerald-300 font-bold uppercase text-[11px] truncate max-w-[140px] sm:max-w-[220px]">
              {selectedFeed.location}
            </span>
          </div>
        )}
      </footer>

    </div>
  );
};

/* ==========================================================================
   5. 3D GLOBE MAP (THREE.JS CANVAS)
   ========================================================================== */

interface MarkerMeshGroup extends THREE.Group {
  feedData: LiveFeed;
  pulseRings: THREE.Mesh[];
  coreMesh: THREE.Mesh;
  beamMesh: THREE.Mesh;
}

interface GlobeMapProps {
  feeds: LiveFeed[];
  selectedFeed: LiveFeed | null;
  onSelectFeed: (feed: LiveFeed) => void;
  settings: GlobeSettings;
}

const GlobeMap: React.FC<GlobeMapProps> = ({
  feeds,
  selectedFeed,
  onSelectFeed,
  settings
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereRef = useRef<THREE.Mesh | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [hoveredFeed, setHoveredFeed] = useState<LiveFeed | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isDraggingRef = useRef(false);
  const previousMousePosRef = useRef({ x: 0, y: 0 });
  const cameraTargetPosRef = useRef<THREE.Vector3 | null>(null);
  const settingsRef = useRef(settings);
  const globeRadius = 100;

  settingsRef.current = settings;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2500);
    camera.position.set(0, 20, 275);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(220, 120, 260);
    scene.add(sunLight);

    const softFillLight = new THREE.DirectionalLight(0x00d2ff, 0.4);
    softFillLight.position.set(-200, -50, -150);
    scene.add(softFillLight);

    // Starfield
    const starCount = 1200;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 650 + Math.random() * 450;

      const sinPhi = Math.sin(phi);
      starPositions[i * 3] = r * sinPhi * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * sinPhi * Math.sin(theta);

      const c = Math.random();
      if (c > 0.8) {
        starColors[i * 3] = 0.3; starColors[i * 3 + 1] = 0.8; starColors[i * 3 + 2] = 1.0;
      } else {
        starColors[i * 3] = 0.75; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 0.95;
      }
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMaterial = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.7
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // Earth Mesh
    const earthGeometry = new THREE.SphereGeometry(globeRadius, 64, 64);
    const earthTexture = createPoliticalWorldTexture();

    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.85,
      metalness: 0.05
    });

    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMesh.rotation.y = 0.35;
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // Cyan Atmospheric Halo
    const atmosphereGeometry = new THREE.SphereGeometry(globeRadius * 1.028, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float intensity = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.2);
          vec3 atmosphereColor = vec3(0.0, 0.72, 1.0);
          gl_FragColor = vec4(atmosphereColor, intensity * 0.95);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphereMesh);
    atmosphereRef.current = atmosphereMesh;

    // Markers Group
    const markersGroup = new THREE.Group();
    earthMesh.add(markersGroup);
    markersGroupRef.current = markersGroup;

    // Render loop
    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (earthMeshRef.current && settingsRef.current.autoRotate && !isDraggingRef.current) {
        earthMeshRef.current.rotation.y += settingsRef.current.rotationSpeed * delta * 0.06;
      }

      if (cameraTargetPosRef.current && cameraRef.current) {
        cameraRef.current.position.lerp(cameraTargetPosRef.current, 0.05);
        cameraRef.current.lookAt(0, 0, 0);
        if (cameraRef.current.position.distanceTo(cameraTargetPosRef.current) < 0.5) {
          cameraTargetPosRef.current = null;
        }
      }

      if (markersGroupRef.current) {
        const pulseTime = currentTime * 0.002;
        markersGroupRef.current.children.forEach((child) => {
          const group = child as MarkerMeshGroup;
          if (group.pulseRings) {
            group.pulseRings.forEach((ring, idx) => {
              const cycle = (pulseTime + idx * 0.5) % 1;
              const scale = 0.4 + cycle * 2.8;
              ring.scale.set(scale, scale, scale);
              (ring.material as THREE.MeshBasicMaterial).opacity = (1 - cycle) * 0.75;
            });
          }
        });
      }

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Markers
  useEffect(() => {
    const markersGroup = markersGroupRef.current;
    if (!markersGroup) return;

    while (markersGroup.children.length > 0) {
      const child = markersGroup.children[0];
      markersGroup.remove(child);
    }

    feeds.forEach((feed) => {
      const isSelected = selectedFeed?.id === feed.id;
      const markerGroup = new THREE.Group() as MarkerMeshGroup;
      markerGroup.feedData = feed;
      markerGroup.pulseRings = [];

      const surfacePos = latLngToVector3(feed.lat, feed.lng, globeRadius);
      const normal = surfacePos.clone().normalize();
      markerGroup.position.copy(surfacePos);

      const up = new THREE.Vector3(0, 1, 0);
      markerGroup.quaternion.setFromUnitVectors(up, normal);

      const color = isSelected ? 0x00f0ff : 0xffffff;

      const baseRingGeo = new THREE.RingGeometry(0.8, 1.4, 16);
      const baseRingMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isSelected ? 0.95 : 0.7
      });
      const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
      baseRing.rotation.x = Math.PI / 2;
      markerGroup.add(baseRing);

      const pulseGeo = new THREE.RingGeometry(0.6, 1.2, 16);
      for (let r = 0; r < 2; r++) {
        const pulseMat = new THREE.MeshBasicMaterial({
          color: isSelected ? 0x00f0ff : 0x00e5ff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7
        });
        const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
        pulseMesh.rotation.x = Math.PI / 2;
        markerGroup.pulseRings.push(pulseMesh);
        markerGroup.add(pulseMesh);
      }

      const beamHeight = isSelected ? 12 : 7;
      const beamGeo = new THREE.CylinderGeometry(0.2, 0.4, beamHeight, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x00f0ff : 0xffffff,
        transparent: true,
        opacity: isSelected ? 0.95 : 0.65
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      beamMesh.position.y = beamHeight / 2;
      markerGroup.beamMesh = beamMesh;
      markerGroup.add(beamMesh);

      const coreGeo = new THREE.SphereGeometry(isSelected ? 1.6 : 1.1, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x00f0ff : 0xffffff
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.y = beamHeight;
      markerGroup.coreMesh = coreMesh;
      markerGroup.add(coreMesh);

      const hitGeo = new THREE.SphereGeometry(4.5, 8, 8);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.y = beamHeight / 2;
      hitMesh.userData = { isMarkerHit: true, feed };
      markerGroup.add(hitMesh);

      markersGroup.add(markerGroup);
    });
  }, [feeds, selectedFeed]);

  const flyToFeed = useCallback((feed: LiveFeed) => {
    if (!earthMeshRef.current || !cameraRef.current) return;
    const localTarget = latLngToVector3(feed.lat, feed.lng, globeRadius);
    const worldTarget = localTarget.clone().applyMatrix4(earthMeshRef.current.matrixWorld);
    const direction = worldTarget.clone().normalize();
    cameraTargetPosRef.current = direction.multiplyScalar(210);
  }, []);

  useEffect(() => {
    if (selectedFeed) flyToFeed(selectedFeed);
  }, [selectedFeed, flyToFeed]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    previousMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    const earthMesh = earthMeshRef.current;
    if (!container || !camera || !scene || !earthMesh) return;

    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - previousMousePosRef.current.x;
      const deltaY = e.clientY - previousMousePosRef.current.y;
      previousMousePosRef.current = { x: e.clientX, y: e.clientY };

      earthMesh.rotation.y += deltaX * 0.005;
      earthMesh.rotation.x = Math.max(-0.8, Math.min(0.8, earthMesh.rotation.x + deltaY * 0.005));
    }

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

    const markerIntersects = raycaster.intersectObjects(markersGroupRef.current?.children || [], true);
    let hitFound = false;

    for (const hit of markerIntersects) {
      if (hit.object.userData && hit.object.userData.isMarkerHit) {
        const feed = hit.object.userData.feed as LiveFeed;
        setHoveredFeed(feed);
        setTooltipPos({ x: e.clientX, y: e.clientY });
        container.style.cursor = 'pointer';
        hitFound = true;
        break;
      }
    }

    if (!hitFound) {
      setHoveredFeed(null);
      container.style.cursor = isDraggingRef.current ? 'grabbing' : 'grab';
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    if (!container || !camera || !markersGroupRef.current) return;

    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

    const markerIntersects = raycaster.intersectObjects(markersGroupRef.current.children, true);
    for (const hit of markerIntersects) {
      if (hit.object.userData && hit.object.userData.isMarkerHit) {
        const feed = hit.object.userData.feed as LiveFeed;
        onSelectFeed(feed);
        flyToFeed(feed);
        break;
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!cameraRef.current) return;
    const dir = cameraRef.current.position.clone().normalize();
    let currentDist = cameraRef.current.position.length();
    currentDist += e.deltaY * 0.15;
    currentDist = Math.max(140, Math.min(480, currentDist));
    cameraRef.current.position.copy(dir.multiplyScalar(currentDist));
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      onWheel={handleWheel}
      className="absolute inset-0 w-full h-full cursor-grab select-none overflow-hidden touch-none"
    >
      {hoveredFeed && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3"
          style={{ left: `${tooltipPos.x}px`, top: `${tooltipPos.y - 12}px` }}
        >
          <div className="bg-[#020617]/95 border border-cyan-400/80 px-3 py-2 rounded shadow-[0_0_20px_rgba(6,182,212,0.4)] backdrop-blur-md text-xs font-mono">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold text-cyan-300 uppercase tracking-wider">{hoveredFeed.location}</span>
            </div>
            <div className="text-[11px] text-slate-300">{hoveredFeed.title}</div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 border-t border-cyan-500/20 pt-1">
              <span>{hoveredFeed.lat > 0 ? `${hoveredFeed.lat.toFixed(2)}°N` : `${Math.abs(hoveredFeed.lat).toFixed(2)}°S`}</span>
              <span>{hoveredFeed.lng > 0 ? `${hoveredFeed.lng.toFixed(2)}°E` : `${Math.abs(hoveredFeed.lng).toFixed(2)}°W`}</span>
              <span className="text-cyan-400">CLICK TO VIEW</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   6. MAIN APPLICATION COMPONENT (DEFAULT EXPORT)
   ========================================================================== */

export function LiveWebcamsView() {
  const [feeds] = useState<LiveFeed[]>(DEFAULT_FEEDS);
  const [selectedFeed, setSelectedFeed] = useState<LiveFeed | null>(DEFAULT_FEEDS[0]);

  const [globeSettings, setGlobeSettings] = useState<GlobeSettings>({
    autoRotate: true,
    rotationSpeed: 1.0,
    showAtmosphere: true
  });

  const handleUpdateSettings = (newSettings: Partial<GlobeSettings>) => {
    setGlobeSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <main className="relative isolate h-full min-h-[640px] w-full overflow-hidden rounded-xl border border-cyan-500/30 bg-black text-slate-100 font-sans select-none">
      {/* 3D Dark Globe Canvas */}
      <GlobeMap
        feeds={feeds}
        selectedFeed={selectedFeed}
        onSelectFeed={(feed) => setSelectedFeed(feed)}
        settings={globeSettings}
      />

      {/* Header HUD (Only 'LIVE COUNTRY WEBCAMS') */}
      <GlobeHUD
        selectedFeed={selectedFeed}
        settings={globeSettings}
        onUpdateSettings={handleUpdateSettings}
        feedCount={feeds.length}
      />

      {/* Live Stream Monitor */}
      <LiveFeedPlayer
        feed={selectedFeed}
        onClose={() => setSelectedFeed(null)}
        onSelectFeed={(feed) => setSelectedFeed(feed)}
        allFeeds={feeds}
      />
    </main>
  );
}

export default LiveWebcamsView;