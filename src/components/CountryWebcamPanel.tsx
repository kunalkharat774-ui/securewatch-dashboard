import React from 'react';

interface CountryWebcamPanelProps {
  countryCode: string;
  countryName: string;
}

const COUNTRY_WEBCAMS: Record<string, { title: string; youtubeId: string }> = {
  US: { title: 'New York City Live Camera', youtubeId: 'JQ_jwk_7OVE' },
  IN: { title: 'New Delhi Live Camera', youtubeId: '7wBNtsgqNOI' },
  JP: { title: 'Tokyo Shibuya Live Camera', youtubeId: 'EFum1rGUdkk' },
  AU: { title: 'Sydney Bondi Beach Live Camera', youtubeId: 'ZvYvZLfPatQ' },
  AE: { title: 'Dubai Marina Live Camera', youtubeId: 'WKGK_hYnlGE' },
  FR: { title: 'Paris Live Camera', youtubeId: 'rvtygG4n6ew' },
};

const FALLBACK_WEBCAM = {
  title: 'Global Live Camera Network',
  youtubeId: 'MW3fisTCXRQ',
};

export const CountryWebcamPanel: React.FC<CountryWebcamPanelProps> = ({ countryCode, countryName }) => {
  const webcam = COUNTRY_WEBCAMS[countryCode] || FALLBACK_WEBCAM;

  return (
    <section className="rounded-xl border border-emerald-500/30 bg-[#071a18]/80 p-2.5 shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            Live Webcam: {countryName}
          </h3>
          <p className="truncate text-[10px] text-gray-400">{webcam.title}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> LIVE
        </span>
      </div>
      <div className="aspect-video overflow-hidden rounded-lg border border-emerald-500/20 bg-black">
        <iframe
          title={`${countryName} live webcam`}
          src={`https://www.youtube-nocookie.com/embed/${webcam.youtubeId}?autoplay=0&mute=1&playsinline=1&rel=0`}
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  );
};
