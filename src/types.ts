export interface Country {
  name: string;
  code: string;
  lat: number;
  lng: number;
}

export interface AttackArc {
  id: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: [string, string];
  srcName?: string;
  targetName?: string;
  type?: string;
}

export interface ThreatRing {
  lat: number;
  lng: number;
  color: string;
}

export interface CountryAttack {
  id: string;
  type: string;
  direction: 'inbound' | 'outbound';
  sourceCountry: Country;
  targetCountry: Country;
  targetIp: string;
  targetPort: string;
  volume: string;
  severity: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'MEDIUM';
  status: 'BLOCKED' | 'MITIGATING' | 'FILTERED' | 'ACTIVE';
  timestamp: string;
  targetSector: string;
}

export interface SelectedCountryStats {
  country: Country;
  inbound: string;
  outbound: string;
  totalBlocked: string;
  threatScore: number;
  threatLevel: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'MEDIUM';
  primaryVector: string;
  targetedPorts: string;
  activeAttacks: CountryAttack[];
  vulnerableSectors: { sector: string; risk: 'High' | 'Critical' | 'Medium'; attacksCount: number }[];
  mitigationStatus: { system: string; status: string; efficiency: string }[];
}

export interface UrlScanResult {
  id: string;
  url: string;
  domain: string;
  blacklistStatus: string;
  ipAddress: string;
  phishing: 'Clean' | 'Suspicious' | 'Malicious';
  category: string;
  malware: 'Clean' | 'Suspicious' | 'Malicious';
  reputationScore: number;
  spam: 'Clean' | 'Suspicious' | 'Malicious' | 'Flagged';
  lastScanned: string;
  threatLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  overallResult: 'Safe' | 'Suspicious' | 'Malicious';
  sslIssuer?: string;
  sslValid?: boolean;
  serverLocation?: string;
  enginesDetected?: { name: string; result: 'Clean' | 'Flagged' | 'Unrated' }[];
  recommendation?: string;
}

export interface FileActivity {
  id: string;
  fileName: string;
  action: 'Encrypted' | 'Decrypted';
  status: 'Success' | 'Failed';
  size: string;
  time: string;
}

export interface SecurityAlert {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  sourceIp: string;
  targetService: string;
  timestamp: string;
  status: 'Active' | 'Investigating' | 'Resolved';
}

export type NavView = 
  | 'dashboard'
  | 'live-map'
  | 'tv-garden'
  | 'api-monitoring'
  | 'alerts'
  | 'vulnerability-scanner'
  | 'risk-assessment'
  | 'email-breach'
  | 'password-strength'
  | 'text-encrypt'
  | 'steganography'
  | 'ip-location'
  | 'domain-info'
  | 'url-reputation'
  | 'file-security'
  | 'logs'
  | 'reports'
  | 'users'
  | 'database-store'
  | 'settings';

