import React, { useState, useEffect } from 'react';
import { usePersistentComponentState } from '../utils/usePersistentComponentState';

export interface DnsRecord {
  name: string;
  type: string;
  typeName: string;
  TTL: number;
  data: string;
}

export interface DomainIntelligence {
  domain: string;
  queryTime: string;
  // WHOIS / RDAP
  registrar?: string;
  registrationDate?: string;
  expirationDate?: string;
  updatedDate?: string;
  domainStatus?: string[];
  dnssec?: string;
  nameServers: string[];
  // IP & Geo
  resolvedIp?: string;
  ipGeo?: {
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    isp?: string;
    org?: string;
    asn?: string;
    lat?: number;
    lon?: number;
    timezone?: string;
  };
  // DNS Records
  dnsRecords: {
    A: DnsRecord[];
    AAAA: DnsRecord[];
    MX: DnsRecord[];
    NS: DnsRecord[];
    TXT: DnsRecord[];
    SOA: DnsRecord[];
    CNAME: DnsRecord[];
  };
  // Security Analysis
  spfRecord?: string;
  dmarcRecord?: string;
  hasSpf: boolean;
  hasDmarc: boolean;
  isSecured: boolean;
  rawRdap?: any;
}

interface DomainInfoViewProps {
  onBackToDashboard?: () => void;
}

const RECORD_TYPES: { type: string; name: string; id: number }[] = [
  { type: 'A', name: 'IPv4 Address', id: 1 },
  { type: 'AAAA', name: 'IPv6 Address', id: 28 },
  { type: 'MX', name: 'Mail Exchanger', id: 15 },
  { type: 'NS', name: 'Name Servers', id: 2 },
  { type: 'TXT', name: 'Text & Verification', id: 16 },
  { type: 'SOA', name: 'Start of Authority', id: 6 },
  { type: 'CNAME', name: 'Canonical Name', id: 5 },
];

export const DomainInfoView: React.FC<DomainInfoViewProps> = ({ onBackToDashboard }) => {
  const [domainInput, setDomainInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [domainData, setDomainData] = useState<DomainIntelligence | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'dns' | 'security' | 'whois'>('overview');
  const [selectedDnsFilter, setSelectedDnsFilter] = useState<string>('ALL');
  const [showRawRdap, setShowRawRdap] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [persistedDomain, setPersistedDomain] = usePersistentComponentState<{ domainInput: string; domainData: DomainIntelligence | null }>('domain-info', { domainInput: '', domainData: null });

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    if (persistedDomain.domainInput) setDomainInput(persistedDomain.domainInput);
    if (persistedDomain.domainData) setDomainData(persistedDomain.domainData);
  }, [persistedDomain]);

  // Helper to sanitize domain user input
  const sanitizeDomain = (input: string): string => {
    let clean = input.trim().toLowerCase();
    clean = clean.replace(/^(https?:\/\/)?(www\.)?/, '');
    clean = clean.split('/')[0];
    clean = clean.split('?')[0];
    clean = clean.split('#')[0];
    clean = clean.split(':')[0];
    return clean;
  };

  // Query DNS over HTTPS API with Google DoH & Cloudflare DoH fallback
  const fetchDnsRecord = async (domain: string, type: string): Promise<DnsRecord[]> => {
    // Primary: Google DoH
    try {
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`);
      if (res.ok) {
        const json = await res.json();
        if (json.Answer && Array.isArray(json.Answer)) {
          return json.Answer.map((ans: any) => ({
            name: ans.name,
            type: type,
            typeName: RECORD_TYPES.find((r) => r.type === type)?.name || type,
            TTL: ans.TTL,
            data: ans.data,
          }));
        }
      }
    } catch {
      // Fallback below
    }

    // Secondary: Cloudflare DoH
    try {
      const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`, {
        headers: { Accept: 'application/dns-json' },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.Answer && Array.isArray(json.Answer)) {
          return json.Answer.map((ans: any) => ({
            name: ans.name,
            type: type,
            typeName: RECORD_TYPES.find((r) => r.type === type)?.name || type,
            TTL: ans.TTL,
            data: ans.data,
          }));
        }
      }
    } catch {
      // Empty if failed
    }

    return [];
  };

  // Fetch WHOIS / RDAP Data with fallback endpoints
  const fetchRdapData = async (domain: string) => {
    try {
      const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    try {
      const res = await fetch(`https://rdap-bootstrap.arin.net/bootstrap/domain/${encodeURIComponent(domain)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    return null;
  };

  // Fetch IP Geolocation for resolved server IP
  const fetchIpGeolocation = async (ip: string) => {
    try {
      const res = await fetch(`/api/ip-lookup?ip=${encodeURIComponent(ip)}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success) {
        return {
          city: data.city,
          region: data.region,
          country: data.country,
          countryCode: data.country_code,
          isp: data.isp,
          org: data.org,
          asn: data.asn,
          lat: data.latitude,
          lon: data.longitude,
          timezone: data.timezone,
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  // Perform full domain investigation
  const executeDomainQuery = async (targetDomain?: string) => {
    const clean = sanitizeDomain(targetDomain || domainInput);
    if (!clean) {
      setError('Please enter a valid domain name (e.g. google.com)');
      return;
    }

    // Basic domain validation regex
    const domainRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (!domainRegex.test(clean)) {
      setError(`"${clean}" does not appear to be a valid domain format.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Parallel DNS lookup across all major record types & DMARC
      const [aRecs, aaaaRecs, mxRecs, nsRecs, txtRecs, soaRecs, cnameRecs, dmarcRecs] = await Promise.all([
        fetchDnsRecord(clean, 'A'),
        fetchDnsRecord(clean, 'AAAA'),
        fetchDnsRecord(clean, 'MX'),
        fetchDnsRecord(clean, 'NS'),
        fetchDnsRecord(clean, 'TXT'),
        fetchDnsRecord(clean, 'SOA'),
        fetchDnsRecord(clean, 'CNAME'),
        fetchDnsRecord(`_dmarc.${clean}`, 'TXT'),
      ]);

      // 2. Extract SPF and DMARC
      const spfObj = txtRecs.find((r) => r.data.toLowerCase().includes('v=spf1'));
      const dmarcObj = dmarcRecs.find((r) => r.data.toLowerCase().includes('v=dmarc1')) || txtRecs.find((r) => r.data.toLowerCase().includes('v=dmarc1'));

      // 3. Extract primary resolved IPv4
      const primaryIp = aRecs.length > 0 ? aRecs[0].data : undefined;

      // 4. Parallel fetch RDAP data & IP Geolocation if IP exists
      const [rdap, ipGeo] = await Promise.all([
        fetchRdapData(clean),
        primaryIp ? fetchIpGeolocation(primaryIp) : Promise.resolve(null),
      ]);

      // Parse RDAP details if available
      let registrar = 'N/A';
      let createdDate = 'N/A';
      let expiryDate = 'N/A';
      let updatedDate = 'N/A';
      let domainStatus: string[] = [];
      let nameServersList: string[] = nsRecs.map((ns) => ns.data.replace(/\.$/, ''));

      if (rdap) {
        // Registrar entity
        if (rdap.entities && Array.isArray(rdap.entities)) {
          const registrarEntity = rdap.entities.find((e: any) => e.roles && e.roles.includes('registrar'));
          if (registrarEntity && registrarEntity.vcardArray && Array.isArray(registrarEntity.vcardArray[1])) {
            const fnObj = registrarEntity.vcardArray[1].find((item: any) => item[0] === 'fn');
            if (fnObj) registrar = fnObj[3];
          }
        }
        if (registrar === 'N/A' && rdap.port43) {
          registrar = rdap.port43;
        }

        // Event dates
        if (rdap.events && Array.isArray(rdap.events)) {
          const regEvt = rdap.events.find((e: any) => e.eventAction === 'registration');
          if (regEvt) createdDate = regEvt.eventDate?.split('T')[0] || regEvt.eventDate;

          const expEvt = rdap.events.find((e: any) => e.eventAction === 'expiration');
          if (expEvt) expiryDate = expEvt.eventDate?.split('T')[0] || expEvt.eventDate;

          const updEvt = rdap.events.find((e: any) => e.eventAction === 'last changed');
          if (updEvt) updatedDate = updEvt.eventDate?.split('T')[0] || updEvt.eventDate;
        }

        // Status
        if (rdap.status && Array.isArray(rdap.status)) {
          domainStatus = rdap.status;
        }

        // Nameservers in RDAP
        if (rdap.nameservers && Array.isArray(rdap.nameservers) && nameServersList.length === 0) {
          nameServersList = rdap.nameservers.map((ns: any) => ns.ldhName || ns.unicodeName).filter(Boolean);
        }
      }

      // Check if DNS query returned no records at all
      const totalRecordsCount = aRecs.length + aaaaRecs.length + mxRecs.length + nsRecs.length + txtRecs.length + soaRecs.length + cnameRecs.length;
      if (totalRecordsCount === 0 && !rdap) {
        setError(`No DNS records or WHOIS records found for domain "${clean}". The domain may not exist or DNS is non-responsive.`);
      }

      const intelligence: DomainIntelligence = {
        domain: clean,
        queryTime: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        registrar,
        registrationDate: createdDate,
        expirationDate: expiryDate,
        updatedDate,
        domainStatus,
        dnssec: rdap ? (rdap.secureDNS?.delegationSigned ? 'Signed (DNSSEC Active)' : 'Unsigned') : 'N/A',
        nameServers: nameServersList,
        resolvedIp: primaryIp,
        ipGeo: ipGeo || undefined,
        dnsRecords: {
          A: aRecs,
          AAAA: aaaaRecs,
          MX: mxRecs,
          NS: nsRecs,
          TXT: txtRecs,
          SOA: soaRecs,
          CNAME: cnameRecs,
        },
        spfRecord: spfObj?.data,
        dmarcRecord: dmarcObj?.data,
        hasSpf: !!spfObj,
        hasDmarc: !!dmarcObj,
        isSecured: !!spfObj && !!dmarcObj,
        rawRdap: rdap || undefined,
      };

      setDomainData(intelligence);
      setDomainInput(clean);
      setPersistedDomain({ domainInput: clean, domainData: intelligence });
      triggerToast(`Successfully retrieved live domain intelligence for ${clean}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch domain information. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  // Initial mount check - do not auto query unless domain provided
  useEffect(() => {
    // Left clean for on-demand user input search
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeDomainQuery();
  };

  const handleCopyReport = () => {
    if (!domainData) return;
    const reportText = `
=== XHUNTER DOMAIN INTELLIGENCE REPORT ===
Domain Name: ${domainData.domain}
Query Time: ${domainData.queryTime}
Registrar: ${domainData.registrar || 'N/A'}
Creation Date: ${domainData.registrationDate || 'N/A'}
Expiration Date: ${domainData.expirationDate || 'N/A'}

[IP RESOLUTION & SERVER GEOLOCATION]
Resolved IPv4: ${domainData.resolvedIp || 'N/A'}
Hosting Provider / ISP: ${domainData.ipGeo?.isp || 'N/A'}
Location: ${domainData.ipGeo?.city || 'N/A'}, ${domainData.ipGeo?.country || 'N/A'}
ASN: ${domainData.ipGeo?.asn || 'N/A'}

[SECURITY ASSESSMENT]
SPF Record: ${domainData.spfRecord ? 'PRESENT (' + domainData.spfRecord + ')' : 'MISSING'}
DMARC Record: ${domainData.dmarcRecord ? 'PRESENT (' + domainData.dmarcRecord + ')' : 'MISSING'}
DNSSEC: ${domainData.dnssec || 'N/A'}

[NAMESERVERS]
${domainData.nameServers.map((ns) => '- ' + ns).join('\n')}

[DNS RECORDS SUMMARY]
A Records: ${domainData.dnsRecords.A.length}
AAAA Records: ${domainData.dnsRecords.AAAA.length}
MX Records: ${domainData.dnsRecords.MX.length}
NS Records: ${domainData.dnsRecords.NS.length}
TXT Records: ${domainData.dnsRecords.TXT.length}
SOA Records: ${domainData.dnsRecords.SOA.length}
CNAME Records: ${domainData.dnsRecords.CNAME.length}
`.trim();

    navigator.clipboard.writeText(reportText);
    triggerToast('Domain Intelligence Report copied to clipboard!');
  };

  const handleExportJson = () => {
    if (!domainData) return;
    const blob = new Blob([JSON.stringify(domainData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domainData.domain}_intelligence_report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast('JSON Report downloaded!');
  };

  // Helper to gather all DNS records as flat array for filtering
  const getAllDnsRecords = (): DnsRecord[] => {
    if (!domainData) return [];
    const { A, AAAA, MX, NS, TXT, SOA, CNAME } = domainData.dnsRecords;
    const all = [...A, ...AAAA, ...MX, ...NS, ...TXT, ...SOA, ...CNAME];
    if (selectedDnsFilter === 'ALL') return all;
    return all.filter((r) => r.type === selectedDnsFilter);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[100] bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-2xl flex items-center gap-2 backdrop-blur-md animate-bounce">
          <i className="fa-solid fa-circle-check text-emerald-400"></i>
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="p-2 hover:bg-[#1a2035] rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Back to Dashboard"
              >
                <i className="fa-solid fa-arrow-left"></i>
              </button>
            )}
            <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
              <i className="fa-solid fa-globe text-emerald-400"></i>
              xHunter Domain Intelligence & WHOIS
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Real-time DNS records, WHOIS registration data, email auth security check, and server IP geolocation lookup.
          </p>
        </div>

        {domainData && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleCopyReport}
              className="flex items-center gap-1.5 bg-[#141a2e] hover:bg-[#1f2845] text-gray-300 hover:text-white border border-[#232d48] px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <i className="fa-regular fa-copy text-emerald-400"></i>
              Copy Report
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <i className="fa-solid fa-file-arrow-down"></i>
              Export JSON
            </button>
          </div>
        )}
      </div>

      {/* Search Input & Quick Presets */}
      <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4 shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
              <i className="fa-solid fa-magnifying-glass"></i>
            </div>
            <input
              type="text"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="Enter domain name (e.g. google.com, github.com, openai.com)..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#141a2e] border border-[#232d48] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                Inspecting Domain...
              </>
            ) : (
              <>
                <i className="fa-solid fa-bolt"></i>
                Query Domain Details
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-sm"></i>
            {error}
          </div>
        )}
      </div>

      {/* Main Results Container */}
      {loading ? (
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-16 text-center space-y-4 shadow-lg">
          <div className="relative inline-flex">
            <i className="fa-solid fa-earth-americas text-4xl text-emerald-400 animate-spin"></i>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Querying Domain WHOIS & Live DNS Records</h3>
            <p className="text-xs text-gray-400 mt-1">Connecting to Google DNS-over-HTTPS & RDAP registries for {domainInput}...</p>
          </div>
        </div>
      ) : domainData ? (
        <div className="space-y-6">
          {/* Top Key Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Domain Name & Registrar */}
            <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4 space-y-1 shadow-md">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Domain & Registrar</span>
              <div className="text-white font-bold text-base font-mono truncate">{domainData.domain}</div>
              <div className="text-xs text-emerald-400 truncate font-semibold">{domainData.registrar || 'N/A'}</div>
            </div>

            {/* Resolved IP & Location */}
            <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4 space-y-1 shadow-md">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Primary Server IPv4</span>
              <div className="text-emerald-400 font-bold text-base font-mono truncate">
                {domainData.resolvedIp || 'No A Record'}
              </div>
              <div className="text-xs text-gray-300 truncate">
                {domainData.ipGeo?.country ? `${domainData.ipGeo.city || ''}, ${domainData.ipGeo.country}` : 'Location unavailable'}
              </div>
            </div>

            {/* Registration Dates */}
            <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4 space-y-1 shadow-md">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Created / Expiry Date</span>
              <div className="text-white font-semibold text-sm font-mono truncate">
                {domainData.registrationDate || 'N/A'}
              </div>
              <div className="text-xs text-gray-400 truncate">
                Expires: <strong className="text-emerald-400 font-mono">{domainData.expirationDate || 'N/A'}</strong>
              </div>
            </div>

            {/* Email Security Health */}
            <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4 space-y-1 shadow-md">
              <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Email Auth Security</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    domainData.hasSpf ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  SPF: {domainData.hasSpf ? 'PASS' : 'MISSING'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    domainData.hasDmarc ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  DMARC: {domainData.hasDmarc ? 'PASS' : 'MISSING'}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 truncate">
                DNSSEC: <span className="text-white">{domainData.dnssec}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'overview' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-chart-pie"></i>
                Domain Overview
              </button>
              <button
                onClick={() => setActiveTab('dns')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'dns' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-network-wired"></i>
                DNS Records ({getAllDnsRecords().length})
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'security' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-shield-halved"></i>
                Security & Email Auth
              </button>
              <button
                onClick={() => setActiveTab('whois')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'whois' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-address-card"></i>
                WHOIS / RDAP Data
              </button>
            </div>

            <span className="text-[11px] text-gray-500 font-mono pr-2">
              Last queried: {domainData.queryTime}
            </span>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Domain Registration Details */}
              <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4 shadow-lg">
                <h3 className="text-sm font-semibold text-white border-b border-[#1f2335] pb-3 flex items-center gap-2">
                  <i className="fa-solid fa-id-card text-emerald-400"></i>
                  Registration & Infrastructure
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between bg-[#141a2e] border border-[#232d48] rounded-lg p-3">
                    <span className="text-gray-400">Domain Name:</span>
                    <strong className="text-emerald-400 font-mono text-sm">{domainData.domain}</strong>
                  </div>

                  <div className="flex items-center justify-between bg-[#141a2e] border border-[#232d48] rounded-lg p-3">
                    <span className="text-gray-400">Registrar Name:</span>
                    <strong className="text-white">{domainData.registrar || 'N/A'}</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#141a2e] border border-[#232d48] rounded-lg p-3">
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Creation Date</span>
                      <span className="text-white font-mono font-semibold block mt-0.5">{domainData.registrationDate || 'N/A'}</span>
                    </div>
                    <div className="bg-[#141a2e] border border-[#232d48] rounded-lg p-3">
                      <span className="text-gray-400 block text-[10px] uppercase font-semibold">Expiration Date</span>
                      <span className="text-emerald-400 font-mono font-semibold block mt-0.5">{domainData.expirationDate || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="bg-[#141a2e] border border-[#232d48] rounded-lg p-3 space-y-1">
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Domain Status Flags</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {domainData.domainStatus && domainData.domainStatus.length > 0 ? (
                        domainData.domainStatus.map((st, idx) => (
                          <span key={idx} className="bg-[#0d111c] border border-[#232d48] text-gray-300 font-mono text-[10px] px-2 py-0.5 rounded">
                            {st}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 font-mono text-[10px]">No status returned</span>
                      )}
                    </div>
                  </div>

                  {/* Nameservers */}
                  <div className="bg-[#141a2e] border border-[#232d48] rounded-lg p-3 space-y-1.5">
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Authoritative Name Servers</span>
                    {domainData.nameServers.length > 0 ? (
                      <div className="space-y-1">
                        {domainData.nameServers.map((ns, idx) => (
                          <div key={idx} className="text-emerald-300 font-mono text-[11px] flex items-center gap-2">
                            <i className="fa-solid fa-server text-[10px] text-gray-500"></i>
                            {ns}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-500">No nameservers found</span>
                    )}
                  </div>
                </div>
              </div>

              {/* IP Geolocation & Server Hosting Card */}
              <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4 shadow-lg">
                <h3 className="text-sm font-semibold text-white border-b border-[#1f2335] pb-3 flex items-center gap-2">
                  <i className="fa-solid fa-location-dot text-emerald-400"></i>
                  Server IP & Host Geolocation
                </h3>

                {domainData.resolvedIp ? (
                  <div className="space-y-3 text-xs">
                    <div className="bg-[#141a2e] border border-[#232d48] rounded-lg p-3.5 space-y-1">
                      <span className="text-gray-400 text-[10px] uppercase font-semibold block">Primary Resolved IPv4</span>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold font-mono text-base">{domainData.resolvedIp}</span>
                        <a
                          href={`/dashboard?ip=${domainData.resolvedIp}`}
                          onClick={(e) => {
                            e.preventDefault();
                            triggerToast(`Copy resolved IP ${domainData.resolvedIp}`);
                            navigator.clipboard.writeText(domainData.resolvedIp || '');
                          }}
                          className="text-xs text-gray-400 hover:text-white bg-[#0d111c] border border-[#232d48] px-2.5 py-1 rounded transition cursor-pointer"
                        >
                          Copy IP
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#141a2e] border border-[#232d48] rounded-lg p-3">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">ISP / Hosting</span>
                        <span className="text-white font-semibold truncate block mt-0.5">{domainData.ipGeo?.isp || 'N/A'}</span>
                      </div>
                      <div className="bg-[#141a2e] border border-[#232d48] rounded-lg p-3">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">ASN / Network</span>
                        <span className="text-white font-semibold truncate font-mono block mt-0.5">{domainData.ipGeo?.asn || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#141a2e] border border-[#232d48] rounded-lg p-3">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Country</span>
                        <span className="text-white font-semibold truncate block mt-0.5">{domainData.ipGeo?.country || 'N/A'}</span>
                      </div>
                      <div className="bg-[#141a2e] border border-[#232d48] rounded-lg p-3">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">City / Region</span>
                        <span className="text-white font-semibold truncate block mt-0.5">{domainData.ipGeo?.city || 'N/A'}</span>
                      </div>
                    </div>

                    {domainData.ipGeo?.lat && domainData.ipGeo?.lon && (
                      <div className="bg-[#141a2e] border border-[#232d48] rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase font-semibold">GPS Coordinates</span>
                          <span className="text-emerald-300 font-mono text-[11px]">
                            {domainData.ipGeo.lat.toFixed(4)}, {domainData.ipGeo.lon.toFixed(4)}
                          </span>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${domainData.ipGeo.lat},${domainData.ipGeo.lon}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-[#0d111c] hover:bg-[#1a2035] border border-[#232d48] text-emerald-400 px-3 py-1.5 rounded text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          <i className="fa-solid fa-map-pin"></i>
                          View Map
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500 text-xs">
                    No IPv4 A Record resolved for this domain.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DNS RECORDS */}
          {activeTab === 'dns' && (
            <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1f2335] pb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <i className="fa-solid fa-network-wired text-emerald-400"></i>
                  Live Authoritative DNS Records Inspection
                </h3>

                {/* Type Filter */}
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedDnsFilter('ALL')}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      selectedDnsFilter === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-[#141a2e] text-gray-400 hover:text-white'
                    }`}
                  >
                    ALL
                  </button>
                  {RECORD_TYPES.map((rt) => (
                    <button
                      key={rt.type}
                      onClick={() => setSelectedDnsFilter(rt.type)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono transition cursor-pointer ${
                        selectedDnsFilter === rt.type ? 'bg-emerald-600 text-white' : 'bg-[#141a2e] text-gray-400 hover:text-white'
                      }`}
                    >
                      {rt.type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Records Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#141a2e] border-b border-[#232d48] text-gray-400 uppercase text-[10px] tracking-wider">
                      <th className="p-3 font-semibold">Type</th>
                      <th className="p-3 font-semibold">Record Name</th>
                      <th className="p-3 font-semibold">TTL</th>
                      <th className="p-3 font-semibold">Data / Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2335]">
                    {getAllDnsRecords().length > 0 ? (
                      getAllDnsRecords().map((rec, index) => (
                        <tr key={index} className="hover:bg-[#141a2e]/50 transition-colors">
                          <td className="p-3 font-mono">
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 rounded text-[10px]">
                              {rec.type}
                            </span>
                          </td>
                          <td className="p-3 text-gray-300 font-mono text-[11px]">{rec.name}</td>
                          <td className="p-3 text-gray-400 font-mono text-[11px]">{rec.TTL}s</td>
                          <td className="p-3 text-white font-mono text-[11px] break-all max-w-md">{rec.data}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500 text-xs">
                          No {selectedDnsFilter} DNS records found for {domainData.domain}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & EMAIL AUTH */}
          {activeTab === 'security' && (
            <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-6 shadow-lg">
              <h3 className="text-sm font-semibold text-white border-b border-[#1f2335] pb-3 flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-emerald-400"></i>
                Domain Security & Email Authentication
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SPF Record Card */}
                <div className="bg-[#141a2e] border border-[#232d48] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <i className="fa-solid fa-envelope-circle-check text-emerald-400"></i>
                      SPF (Sender Policy Framework)
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        domainData.hasSpf ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {domainData.hasSpf ? 'CONFIGURED' : 'NOT FOUND'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Prevents spammers from sending unauthorized emails spoofing this domain.
                  </p>
                  {domainData.spfRecord ? (
                    <div className="bg-[#0d111c] border border-[#232d48] p-3 rounded text-[11px] font-mono text-emerald-300 break-all">
                      {domainData.spfRecord}
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-400 italic">No SPF record detected in TXT entries.</div>
                  )}
                </div>

                {/* DMARC Record Card */}
                <div className="bg-[#141a2e] border border-[#232d48] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <i className="fa-solid fa-[#0d111c] fa-shield text-emerald-400"></i>
                      DMARC Policy Record
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        domainData.hasDmarc ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {domainData.hasDmarc ? 'CONFIGURED' : 'NOT FOUND'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Defines how receiver mail servers handle authentication failures (_dmarc record).
                  </p>
                  {domainData.dmarcRecord ? (
                    <div className="bg-[#0d111c] border border-[#232d48] p-3 rounded text-[11px] font-mono text-emerald-300 break-all">
                      {domainData.dmarcRecord}
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-400 italic">No DMARC record (_dmarc) detected.</div>
                  )}
                </div>
              </div>

              {/* DNSSEC Status Card */}
              <div className="bg-[#141a2e] border border-[#232d48] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-lock text-emerald-400"></i>
                    DNSSEC (Domain Name System Security Extensions)
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono font-bold bg-[#0d111c] px-3 py-1 rounded border border-[#232d48]">
                    {domainData.dnssec}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Adds cryptographic signatures to existing DNS records to protect against DNS spoofing and cache poisoning attacks.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: WHOIS / RDAP */}
          {activeTab === 'whois' && (
            <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#1f2335] pb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <i className="fa-solid fa-address-card text-emerald-400"></i>
                  WHOIS & RDAP Registry Data
                </h3>

                <button
                  onClick={() => setShowRawRdap(!showRawRdap)}
                  className="bg-[#141a2e] hover:bg-[#1f2845] border border-[#232d48] text-xs font-semibold text-gray-300 px-3 py-1.5 rounded transition cursor-pointer"
                >
                  {showRawRdap ? 'Hide Raw RDAP JSON' : 'Show Raw RDAP JSON'}
                </button>
              </div>

              {showRawRdap ? (
                <pre className="bg-[#080a10] border border-[#232d48] p-4 rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-96">
                  {JSON.stringify(domainData.rawRdap || { message: 'No RDAP response object' }, null, 2)}
                </pre>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-[#141a2e] border border-[#232d48] rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-white uppercase text-[10px] tracking-wider text-gray-400">Registrar Info</h4>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Registrar Name</span>
                      <span className="text-white font-semibold text-sm">{domainData.registrar || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Registration / Creation</span>
                      <span className="text-emerald-400 font-mono font-semibold">{domainData.registrationDate || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Expiration Date</span>
                      <span className="text-emerald-400 font-mono font-semibold">{domainData.expirationDate || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Last Updated</span>
                      <span className="text-gray-300 font-mono">{domainData.updatedDate || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="bg-[#141a2e] border border-[#232d48] rounded-xl p-4 space-y-3">
                    <h4 className="font-bold text-white uppercase text-[10px] tracking-wider text-gray-400">Registered Name Servers</h4>
                    <div className="space-y-1.5">
                      {domainData.nameServers.map((ns, idx) => (
                        <div key={idx} className="bg-[#0d111c] border border-[#232d48] p-2 rounded text-emerald-300 font-mono text-[11px]">
                          {ns}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-12 text-center space-y-4 shadow-lg">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#141a2e] border border-[#232d48] flex items-center justify-center text-emerald-400 text-2xl shadow-inner">
            <i className="fa-solid fa-globe"></i>
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-bold text-white">Live Real-Time Domain Intelligence</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Enter any domain name in the search box above (e.g. <span className="text-emerald-400 font-mono font-semibold">instagram.com</span>, <span className="text-emerald-400 font-mono font-semibold">bbc.com</span>, <span className="text-emerald-400 font-mono font-semibold">microsoft.com</span>) and click <strong>Query Domain Details</strong> to fetch live DNS records, WHOIS registration data, email auth security (SPF & DMARC), and server IP geolocation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
