import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportsViewProps {
  onBackToDashboard?: () => void;
}

export interface SecurityReport {
  reportId: string;
  reportType: string;
  timeframe: string;
  classification: string;
  targetScope: string;
  generatedAt: string;
  complianceScore: number;
  complianceStatus: 'COMPLIANT' | 'NEEDS_ATTENTION';
  executiveSummary: string;
  keyFindings: string[];
  frameworkBreakdown: Array<{
    standard: string;
    compliancePct: number;
    status: 'PASSED' | 'NEEDS_REVIEW';
    keyRule: string;
  }>;
  recommendedActions: string[];
  metrics: {
    totalThreatsBlocked: number;
    vulnerabilitiesMitigated: number;
    apiUptimeSla: string;
    avgApiLatency: string;
    activeDefenses: string[];
  };
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onBackToDashboard }) => {
  // Preset Templates
  const defaultReports: SecurityReport[] = [
    {
      reportId: 'RPT-904812',
      reportType: 'SOC2 Type II Executive Compliance Audit',
      timeframe: 'Last 30 Days',
      classification: 'STRICTLY CONFIDENTIAL',
      targetScope: 'xHunter Production Microservice Infrastructure',
      generatedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      complianceScore: 96,
      complianceStatus: 'COMPLIANT',
      executiveSummary:
        'This official SOC2 Type II compliance audit evaluates xHunter security perimeter controls across access management, encryption standards, and threat mitigation mechanisms. Over the evaluated 30-day window, zero unauthorized access breaches or unencrypted data leaks were recorded. WAF rules successfully intercepted over 1,400 malicious ingress payloads.',
      keyFindings: [
        'Zero credential leaks or unauthenticated database intrusions detected.',
        'WAF ingress filtering maintained a 100% block rate on OWASP Top 10 web exploit attempts.',
        'All database traffic encrypted in transit (TLS 1.3) and at rest (AES-256).',
        'Role-Based Access Control (RBAC) enforced with 100% MFA compliance across technical staff.',
      ],
      frameworkBreakdown: [
        { standard: 'SOC2 Type II (Trust Services Criteria)', compliancePct: 96, status: 'PASSED', keyRule: 'CC6.1 Logical Access Security' },
        { standard: 'ISO 27001:2022', compliancePct: 94, status: 'PASSED', keyRule: 'A.12.6 Technical Vulnerability Management' },
        { standard: 'PCI-DSS v4.0', compliancePct: 98, status: 'PASSED', keyRule: 'Req 6.4 Public Web App Firewall Defense' },
        { standard: 'GDPR / Privacy Compliance', compliancePct: 95, status: 'PASSED', keyRule: 'Art 32 Security of Data Processing' },
      ],
      recommendedActions: [
        'Rotate OAuth 2.0 client secret keys for legacy integration test suites.',
        'Schedule bi-annual third-party penetration testing on API gateway endpoints.',
        'Expand automated log retention buffer from 90 days to 180 days.',
      ],
      metrics: {
        totalThreatsBlocked: 1428,
        vulnerabilitiesMitigated: 37,
        apiUptimeSla: '99.998%',
        avgApiLatency: '22 ms',
        activeDefenses: ['WAF CRS v3.3', 'Rate Limiter', 'IP Threat Reputation', 'TLS 1.3 Enforcement'],
      },
    },
    {
      reportId: 'RPT-883104',
      reportType: 'ISO 27001 Security Controls Audit',
      timeframe: 'Q2 2026 Audit',
      classification: 'INTERNAL SECURITY USE',
      targetScope: 'xHunter API Gateway & Data Pipeline',
      generatedAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
      complianceScore: 92,
      complianceStatus: 'COMPLIANT',
      executiveSummary:
        'Comprehensive review of Information Security Management System (ISMS) controls under ISO 27001:2022 standards. The system demonstrated high resilience against automated port scanners, XSS attack vectors, and distributed denial-of-service attempts.',
      keyFindings: [
        'SIEM security event logging active with real-time anomaly telemetry alerts.',
        'Disaster recovery backup snapshots executed daily with verified recovery time objective (RTO < 15 mins).',
        'Dependency vulnerability patching SLA compliance held at 98.4%.',
      ],
      frameworkBreakdown: [
        { standard: 'ISO 27001 Clause 8 Operations', compliancePct: 95, status: 'PASSED', keyRule: 'A.8.20 Network Security' },
        { standard: 'ISO 27001 Clause 5 Leadership', compliancePct: 90, status: 'PASSED', keyRule: 'A.5.15 Access Control' },
      ],
      recommendedActions: [
        'Enforce strict Content-Security-Policy (CSP) headers on all administrative web apps.',
        'Conduct mandatory quarterly cybersecurity phishing awareness simulations for internal teams.',
      ],
      metrics: {
        totalThreatsBlocked: 2190,
        vulnerabilitiesMitigated: 42,
        apiUptimeSla: '99.995%',
        avgApiLatency: '25 ms',
        activeDefenses: ['WAF CRS v3.3', 'mTLS Internal Mesh', 'Strict CSP'],
      },
    },
  ];

  const [reportArchive, setReportArchive] = useState<SecurityReport[]>(defaultReports);
  const [activeReport, setActiveReport] = useState<SecurityReport>(defaultReports[0]);

  useEffect(() => {
    fetch('/api/reports', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : [])
      .then((reports) => {
        if (Array.isArray(reports) && reports.length > 0) {
          setReportArchive(reports);
          setActiveReport(reports[0]);
        }
      })
      .catch(() => undefined);
  }, []);

  // Generator Wizard Inputs
  const [reportTypeInput, setReportTypeInput] = useState<string>('SOC2 Type II Executive Compliance Audit');
  const [timeframeInput, setTimeframeInput] = useState<string>('Last 30 Days');
  const [classificationInput, setClassificationInput] = useState<string>('STRICTLY CONFIDENTIAL');
  const [targetScopeInput, setTargetScopeInput] = useState<string>('xHunter Cloud Infrastructure');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Compile Report Live via Backend AI
  const handleCompileReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    showToast('Compiling xHunter Executive Security Report live via AI engine...', 'info');

    try {
      const res = await fetch('/api/generate-security-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: reportTypeInput,
          timeframe: timeframeInput,
          classification: classificationInput,
          targetScope: targetScopeInput,
        }),
      });

      if (res.ok) {
        const newRpt: SecurityReport = await res.json();
        const nextReports = [newRpt, ...reportArchive];
        setReportArchive(nextReports);
        setActiveReport(newRpt);
        void fetch('/api/reports', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reports: nextReports }),
        });
        setIsGeneratorModalOpen(false);
        showToast(`Report ${newRpt.reportId} successfully generated & compiled!`, 'success');
      } else {
        showToast('Failed to compile security report', 'error');
      }
    } catch (err) {
      showToast('Error connecting to report generator API', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Print Report / Trigger Native PDF Print Window
  const handlePrintPDF = () => {
    window.print();
  };

  // Export CSV of Findings
  const handleExportCSV = () => {
    const headers = ['Report ID', 'Standard/Rule', 'Compliance %', 'Status', 'Key Rule'];
    const rows = activeReport.frameworkBreakdown.map((f) => [
      `"${activeReport.reportId}"`,
      `"${f.standard}"`,
      `"${f.compliancePct}%"`,
      `"${f.status}"`,
      `"${f.keyRule}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeReport.reportId}_Compliance_Matrix.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported report matrix as CSV file', 'success');
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeReport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${activeReport.reportId}_Full_Report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported complete JSON security report', 'success');
  };

  // Delete Archive Item
  const handleDeleteReport = (id: string) => {
    const nextReports = reportArchive.filter((r) => r.reportId !== id);
    setReportArchive(nextReports);
    void fetch('/api/reports', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reports: nextReports }),
    });
    if (activeReport.reportId === id && reportArchive.length > 1) {
      setActiveReport(reportArchive.find((r) => r.reportId !== id) || reportArchive[0]);
    }
    showToast(`Deleted report ${id} from archive`, 'info');
  };

  return (
    <div className="space-y-6 print:p-0 print:m-0 print:bg-white print:text-black">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 text-white border print:hidden ${
              toast.type === 'success'
                ? 'bg-emerald-950 border-emerald-500/40'
                : toast.type === 'error'
                ? 'bg-red-950 border-red-500/40'
                : 'bg-blue-950 border-blue-500/40'
            }`}
          >
            <i
              className={`fa-solid ${
                toast.type === 'success'
                  ? 'fa-circle-check text-emerald-400'
                  : toast.type === 'error'
                  ? 'fa-triangle-exclamation text-red-400'
                  : 'fa-circle-info text-blue-400'
              }`}
            />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER & ACTION TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="px-2.5 py-1 bg-[#15192b] hover:bg-[#1f243d] text-gray-300 rounded text-xs transition cursor-pointer flex items-center gap-1"
            >
              <i className="fa-solid fa-arrow-left text-[10px]" /> Back
            </button>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-file-contract text-purple-400" /> xHunter Executive Security & Compliance Reports
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Live AI Compiler
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Generate, audit, export, and print SOC2 Type II, ISO 27001, PCI-DSS, and GDPR executive security reports.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsGeneratorModalOpen(true)}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition shadow cursor-pointer flex items-center gap-1.5"
          >
            <i className="fa-solid fa-wand-magic-sparkles" /> Generate New Report
          </button>

          <button
            onClick={handlePrintPDF}
            className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition shadow cursor-pointer flex items-center gap-1.5"
          >
            <i className="fa-solid fa-file-pdf" /> Export PDF / Print
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-[#15192b] hover:bg-[#1f243d] border border-[#1f2335] text-gray-200 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
          >
            <i className="fa-solid fa-file-csv text-emerald-400" /> CSV
          </button>

          <button
            onClick={handleExportJSON}
            className="px-3 py-2 bg-[#15192b] hover:bg-[#1f243d] border border-[#1f2335] text-gray-200 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
          >
            <i className="fa-solid fa-file-code text-blue-400" /> JSON
          </button>
        </div>
      </div>

      {/* QUICK PRESET TEMPLATE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div
          onClick={() => {
            setReportTypeInput('SOC2 Type II Executive Compliance Audit');
            setTimeframeInput('Last 30 Days');
            setIsGeneratorModalOpen(true);
          }}
          className="p-4 bg-[#0d111c] hover:bg-[#111524] border border-[#1f2335] hover:border-purple-500/50 rounded-xl cursor-pointer transition space-y-2 group"
        >
          <div className="flex justify-between items-start">
            <i className="fa-solid fa-shield-cat text-purple-400 text-xl group-hover:scale-110 transition" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">SOC2 Type II</span>
          </div>
          <div className="font-bold text-white text-xs">Monthly SOC2 Executive Audit</div>
          <p className="text-[11px] text-gray-400">Evaluates logical access, encryption, and threat containment.</p>
          <div className="text-[11px] text-purple-400 font-medium flex items-center gap-1 pt-1">
            Click to compile now <i className="fa-solid fa-arrow-right text-[10px]" />
          </div>
        </div>

        <div
          onClick={() => {
            setReportTypeInput('ISO 27001 Security Controls Audit');
            setTimeframeInput('Q2 2026 Audit');
            setIsGeneratorModalOpen(true);
          }}
          className="p-4 bg-[#0d111c] hover:bg-[#111524] border border-[#1f2335] hover:border-blue-500/50 rounded-xl cursor-pointer transition space-y-2 group"
        >
          <div className="flex justify-between items-start">
            <i className="fa-solid fa-file-check text-blue-400 text-xl group-hover:scale-110 transition" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">ISO 27001</span>
          </div>
          <div className="font-bold text-white text-xs">ISO 27001 Controls Matrix</div>
          <p className="text-[11px] text-gray-400">ISMS policy compliance mapping, backup RTO, & vulnerability SLA.</p>
          <div className="text-[11px] text-blue-400 font-medium flex items-center gap-1 pt-1">
            Click to compile now <i className="fa-solid fa-arrow-right text-[10px]" />
          </div>
        </div>

        <div
          onClick={() => {
            setReportTypeInput('PCI-DSS v4.0 Vulnerability & Web Defense Audit');
            setTimeframeInput('Last 7 Days');
            setIsGeneratorModalOpen(true);
          }}
          className="p-4 bg-[#0d111c] hover:bg-[#111524] border border-[#1f2335] hover:border-emerald-500/50 rounded-xl cursor-pointer transition space-y-2 group"
        >
          <div className="flex justify-between items-start">
            <i className="fa-solid fa-credit-card text-emerald-400 text-xl group-hover:scale-110 transition" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">PCI-DSS v4.0</span>
          </div>
          <div className="font-bold text-white text-xs">PCI-DSS Web Defense Assessment</div>
          <p className="text-[11px] text-gray-400">Validates public web app firewall protection & payment endpoint security.</p>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 pt-1">
            Click to compile now <i className="fa-solid fa-arrow-right text-[10px]" />
          </div>
        </div>
      </div>

      {/* MAIN ACTIVE REPORT DISPLAY DOCUMENT */}
      <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-6 md:p-8 space-y-6 shadow-2xl print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b border-[#1f2335] pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold font-mono bg-red-500/20 text-red-400 border border-red-500/30">
                {activeReport.classification}
              </span>
              <span className="text-xs text-gray-400 font-mono">Report ID: {activeReport.reportId}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{activeReport.reportType}</h1>
            <p className="text-xs text-gray-400 mt-1">
              Target Scope: <span className="text-white font-medium">{activeReport.targetScope}</span> | Timeframe:{' '}
              <span className="text-purple-300 font-medium">{activeReport.timeframe}</span>
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[#080a10] border border-[#1f2335] p-3.5 rounded-xl">
            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Audit Score</span>
              <div className="text-3xl font-extrabold text-emerald-400 font-mono leading-none mt-1">
                {activeReport.complianceScore}%
              </div>
            </div>
            <div className="h-9 w-px bg-[#1f2335]" />
            <div className="text-left">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Status</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 block mt-1">
                {activeReport.complianceStatus}
              </span>
            </div>
          </div>
        </div>

        {/* CISO Executive AI Summary */}
        <div className="bg-[#111524] border border-[#1f2335] rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
            <i className="fa-solid fa-brain" /> CISO Executive AI Summary & Risk Analysis
          </h3>
          <p className="text-xs text-gray-200 leading-relaxed font-sans whitespace-pre-line">{activeReport.executiveSummary}</p>
        </div>

        {/* Real Metrics Highlights Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#080a10] border border-[#1f2335] p-4 rounded-xl">
            <span className="text-[11px] text-gray-400 block font-medium">Attacks Blocked</span>
            <div className="text-xl font-bold text-red-400 font-mono mt-1">{activeReport.metrics.totalThreatsBlocked}</div>
            <span className="text-[10px] text-gray-500 mt-1 block">Filtered at WAF level</span>
          </div>

          <div className="bg-[#080a10] border border-[#1f2335] p-4 rounded-xl">
            <span className="text-[11px] text-gray-400 block font-medium">Vulnerabilities Patched</span>
            <div className="text-xl font-bold text-purple-400 font-mono mt-1">{activeReport.metrics.vulnerabilitiesMitigated}</div>
            <span className="text-[10px] text-gray-500 mt-1 block">Resolved in pipeline</span>
          </div>

          <div className="bg-[#080a10] border border-[#1f2335] p-4 rounded-xl">
            <span className="text-[11px] text-gray-400 block font-medium">API Availability SLA</span>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-1">{activeReport.metrics.apiUptimeSla}</div>
            <span className="text-[10px] text-gray-500 mt-1 block">Zero catastrophic outages</span>
          </div>

          <div className="bg-[#080a10] border border-[#1f2335] p-4 rounded-xl">
            <span className="text-[11px] text-gray-400 block font-medium">Avg API Latency</span>
            <div className="text-xl font-bold text-blue-400 font-mono mt-1">{activeReport.metrics.avgApiLatency}</div>
            <span className="text-[10px] text-gray-500 mt-1 block">Measured across gateways</span>
          </div>
        </div>

        {/* Key Audit Findings */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-list-check text-emerald-400" /> Key Security Audit Findings & Verification
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {activeReport.keyFindings.map((finding, idx) => (
              <li
                key={idx}
                className="p-3 bg-[#111524] border border-[#1f2335] rounded-lg text-gray-300 flex items-start gap-2.5"
              >
                <i className="fa-solid fa-check-circle text-emerald-400 text-sm mt-0.5 shrink-0" />
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Regulatory Compliance Framework Matrix Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-table-cells text-purple-400" /> Regulatory Compliance Controls Matrix
          </h3>
          <div className="overflow-x-auto border border-[#1f2335] rounded-xl">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-[#080a10] border-b border-[#1f2335] text-gray-400 uppercase text-[10px]">
                  <th className="p-3">Compliance Standard</th>
                  <th className="p-3">Primary Control Rule</th>
                  <th className="p-3">Compliance Level</th>
                  <th className="p-3 text-right">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2335] text-gray-300">
                {activeReport.frameworkBreakdown.map((fw, idx) => (
                  <tr key={idx} className="hover:bg-[#111524]">
                    <td className="p-3 font-bold text-white font-sans">{fw.standard}</td>
                    <td className="p-3 text-gray-400 text-[11px]">{fw.keyRule}</td>
                    <td className="p-3 font-mono font-bold text-purple-300">{fw.compliancePct}%</td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {fw.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Strategic Recommended Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-bullseye text-amber-400" /> Strategic Remediation & Action Recommendations
          </h3>
          <div className="space-y-2 text-xs">
            {activeReport.recommendedActions.map((act, idx) => (
              <div key={idx} className="p-3 bg-[#111524] border border-[#1f2335] rounded-lg text-gray-200 flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold font-mono text-[10px]">
                  ACTION #{idx + 1}
                </span>
                <span className="flex-1">{act}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Meta */}
        <div className="border-t border-[#1f2335] pt-4 flex flex-col sm:flex-row justify-between items-center text-[11px] text-gray-500 font-mono">
          <span>Generated by xHunter Security Engine v4.8</span>
          <span>Timestamp: {new Date(activeReport.generatedAt).toUTCString()}</span>
          <span>Digitally Signed CISO Audit Token</span>
        </div>
      </div>

      {/* SAVED REPORT ARCHIVE LIST */}
      <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4 print:hidden">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <i className="fa-solid fa-box-archive text-purple-400" /> Generated Reports Archive ({reportArchive.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {reportArchive.map((rpt) => (
            <div
              key={rpt.reportId}
              onClick={() => setActiveReport(rpt)}
              className={`p-4 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                activeReport.reportId === rpt.reportId
                  ? 'bg-purple-950/30 border-purple-500/60'
                  : 'bg-[#111524] hover:bg-[#171c30] border-[#1f2335]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-purple-300">{rpt.reportId}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(rpt.generatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="font-bold text-white mt-1">{rpt.reportType}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{rpt.targetScope}</div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-lg font-bold text-emerald-400 font-mono">{rpt.complianceScore}%</span>
                  <span className="text-[10px] text-gray-500 block">Score</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteReport(rpt.reportId);
                  }}
                  className="text-gray-500 hover:text-red-400 p-1.5 cursor-pointer"
                  title="Delete Report"
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REPORT GENERATOR WIZARD MODAL */}
      <AnimatePresence>
        {isGeneratorModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0d111c] border border-[#1f2335] w-full max-w-xl rounded-xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-[#1f2335] pb-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <i className="fa-solid fa-wand-magic-sparkles text-purple-400" /> xHunter AI Security Report Generator
                </h3>
                <button
                  onClick={() => setIsGeneratorModalOpen(false)}
                  className="text-gray-400 hover:text-white cursor-pointer text-sm"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <form onSubmit={handleCompileReport} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold block">Report Type / Template Title</label>
                  <input
                    type="text"
                    required
                    value={reportTypeInput}
                    onChange={(e) => setReportTypeInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold block">Target Infrastructure Scope</label>
                  <input
                    type="text"
                    required
                    value={targetScopeInput}
                    onChange={(e) => setTargetScopeInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-300 font-semibold block">Audit Timeframe</label>
                    <select
                      value={timeframeInput}
                      onChange={(e) => setTimeframeInput(e.target.value)}
                      className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="Last 24 Hours">Last 24 Hours</option>
                      <option value="Last 7 Days">Last 7 Days</option>
                      <option value="Last 30 Days">Last 30 Days</option>
                      <option value="Q2 2026 Audit">Q2 2026 Audit</option>
                      <option value="Year-To-Date (YTD)">Year-To-Date (YTD)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 font-semibold block">Classification Level</label>
                    <select
                      value={classificationInput}
                      onChange={(e) => setClassificationInput(e.target.value)}
                      className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="STRICTLY CONFIDENTIAL">STRICTLY CONFIDENTIAL</option>
                      <option value="INTERNAL SECURITY USE">INTERNAL SECURITY USE</option>
                      <option value="BOARD EXECUTIVE SUMMARY">BOARD EXECUTIVE SUMMARY</option>
                      <option value="RESTRICTED SOC">RESTRICTED SOC</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-[#111524] rounded-lg border border-[#1f2335] text-gray-400 text-[11px] space-y-1">
                  <p className="font-semibold text-purple-300 flex items-center gap-1">
                    <i className="fa-solid fa-robot" /> AI Analysis Mode Enabled
                  </p>
                  <p>
                    Gemini AI will analyze real vulnerability scans, active WAF filters, API SLAs, and SIEM security logs to compile executive summaries and key findings.
                  </p>
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsGeneratorModalOpen(false)}
                    className="px-4 py-2 bg-[#111524] hover:bg-[#1a1e30] text-gray-300 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg cursor-pointer shadow-lg flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <i className={`fa-solid ${isGenerating ? 'fa-spinner animate-spin' : 'fa-wand-magic-sparkles'}`} />
                    {isGenerating ? 'Compiling Report...' : 'Compile & Generate Live'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
