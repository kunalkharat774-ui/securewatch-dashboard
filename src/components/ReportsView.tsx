import React, { useCallback, useEffect, useRef, useState } from 'react';
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

type ToastType = 'success' | 'info' | 'error';

/** Make sure a report from the API / storage always has the shape the UI needs. */
const normalizeReport = (raw: Partial<SecurityReport> | null | undefined, index = 0): SecurityReport => {
  const r = (raw || {}) as Partial<SecurityReport>;
  const m = (r.metrics || {}) as Partial<SecurityReport['metrics']>;
  return {
    reportId: r.reportId || `RPT-${Date.now()}-${index}`,
    reportType: r.reportType || 'Untitled Security Report',
    timeframe: r.timeframe || 'N/A',
    classification: r.classification || 'INTERNAL SECURITY USE',
    targetScope: r.targetScope || 'N/A',
    generatedAt: r.generatedAt || new Date().toISOString(),
    complianceScore: Number.isFinite(Number(r.complianceScore)) ? Number(r.complianceScore) : 0,
    complianceStatus: r.complianceStatus === 'NEEDS_ATTENTION' ? 'NEEDS_ATTENTION' : 'COMPLIANT',
    executiveSummary: r.executiveSummary || '',
    keyFindings: Array.isArray(r.keyFindings) ? r.keyFindings : [],
    frameworkBreakdown: Array.isArray(r.frameworkBreakdown) ? r.frameworkBreakdown : [],
    recommendedActions: Array.isArray(r.recommendedActions) ? r.recommendedActions : [],
    metrics: {
      totalThreatsBlocked: Number(m.totalThreatsBlocked) || 0,
      vulnerabilitiesMitigated: Number(m.vulnerabilitiesMitigated) || 0,
      apiUptimeSla: m.apiUptimeSla || 'N/A',
      avgApiLatency: m.avgApiLatency || 'N/A',
      activeDefenses: Array.isArray(m.activeDefenses) ? m.activeDefenses : [],
    },
  };
};

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const downloadBlob = (content: string, mime: string, filename: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const formatUTC = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'N/A' : d.toUTCString();
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
};

export const ReportsView: React.FC<ReportsViewProps> = ({ onBackToDashboard }) => {
  const [reportArchive, setReportArchive] = useState<SecurityReport[]>([]);
  const [activeReport, setActiveReport] = useState<SecurityReport | null>(null);

  // Generator Wizard Inputs
  const [reportTypeInput, setReportTypeInput] = useState<string>('SOC2 Type II Executive Compliance Audit');
  const [timeframeInput, setTimeframeInput] = useState<string>('Last 30 Days');
  const [classificationInput, setClassificationInput] = useState<string>('STRICTLY CONFIDENTIAL');
  const [targetScopeInput, setTargetScopeInput] = useState<string>('Securewatch Cloud Infrastructure');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type: ToastType = 'info') => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Load archive
  useEffect(() => {
    let cancelled = false;
    fetch('/api/reports', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : []))
      .then((reports) => {
        if (cancelled) return;
        if (Array.isArray(reports) && reports.length > 0) {
          const normalized = reports.map((r, i) => normalizeReport(r, i));
          setReportArchive(normalized);
          setActiveReport(normalized[0]);
          return;
        }
        setReportArchive([]);
        setActiveReport(null);
      })
      .catch(() => {
        if (cancelled) return;
        setReportArchive([]);
        setActiveReport(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close modal with Escape
  useEffect(() => {
    if (!isGeneratorModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) setIsGeneratorModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isGeneratorModalOpen, isGenerating]);

  const persistReports = async (reports: SecurityReport[]) => {
    try {
      const res = await fetch('/api/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports }),
      });
      if (!res.ok) showToast('Report archive could not be saved to the server', 'error');
    } catch {
      showToast('Report archive could not be saved to the server', 'error');
    }
  };

  // Compile Report Live via Backend AI
  const handleCompileReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isGenerating) return;
    setIsGenerating(true);
    showToast('Compiling Securewatch Executive Security Report live via AI engine...', 'info');

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
        const newRpt = normalizeReport(await res.json());
        const nextReports = [newRpt, ...reportArchive.filter((r) => r.reportId !== newRpt.reportId)];
        setReportArchive(nextReports);
        setActiveReport(newRpt);
        void persistReports(nextReports);
        setIsGeneratorModalOpen(false);
        showToast(`Report ${newRpt.reportId} successfully generated & compiled!`, 'success');
      } else {
        showToast('Failed to compile security report', 'error');
      }
    } catch {
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
    if (!activeReportData) return;
    const headers = ['Report ID', 'Standard/Rule', 'Compliance %', 'Status', 'Key Rule'];
    const rows = activeReportData.frameworkBreakdown.map((f) => [
      csvCell(activeReportData.reportId),
      csvCell(f.standard),
      csvCell(`${f.compliancePct}%`),
      csvCell(f.status),
      csvCell(f.keyRule),
    ]);
    const csv = [headers.map(csvCell).join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadBlob('\uFEFF' + csv, 'text/csv;charset=utf-8', `${activeReportData.reportId}_Compliance_Matrix.csv`);
    showToast('Exported report matrix as CSV file', 'success');
  };

  // Export JSON
  const handleExportJSON = () => {
    if (!activeReportData) return;
    downloadBlob(
      JSON.stringify(activeReportData, null, 2),
      'application/json;charset=utf-8',
      `${activeReportData.reportId}_Full_Report.json`
    );
    showToast('Exported complete JSON security report', 'success');
  };

  // Delete Archive Item
  const handleDeleteReport = (id: string) => {
    const nextReports = reportArchive.filter((r) => r.reportId !== id);
    setReportArchive(nextReports);
    void persistReports(nextReports);
    if (activeReport && activeReport.reportId === id) {
      setActiveReport(nextReports[0] || null);
    }
    showToast(`Deleted report ${id} from archive`, 'info');
  };

  const renderToast = () => (
    <AnimatePresence>
      {toast && (
        <motion.div
          key="toast"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 text-white border print:hidden ${
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
  );

  const renderGeneratorModal = () => (
    <AnimatePresence>
      {isGeneratorModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
          onClick={() => {
            if (!isGenerating) setIsGeneratorModalOpen(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0d111c] border border-[#1f2335] w-full max-w-xl rounded-xl p-6 shadow-2xl space-y-5"
          >
            <div className="flex justify-between items-center border-b border-[#1f2335] pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles text-purple-400" /> Securewatch AI Security Report Generator
              </h3>
              <button
                type="button"
                onClick={() => setIsGeneratorModalOpen(false)}
                disabled={isGenerating}
                className="text-gray-400 hover:text-white cursor-pointer text-sm disabled:opacity-50"
                aria-label="Close"
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
                <p>Live telemetry will be analyzed to compile executive summaries and key findings.</p>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsGeneratorModalOpen(false)}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-[#111524] hover:bg-[#1a1e30] text-gray-300 rounded-lg cursor-pointer disabled:opacity-50"
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
  );

  const activeReportData: SecurityReport | null = activeReport || reportArchive[0] || null;

  // Empty state
  if (!activeReportData) {
    return (
      <div className="space-y-6">
        {renderToast()}
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
                <i className="fa-solid fa-file-contract text-purple-400" /> Securewatch Executive Security & Compliance Reports
              </h2>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Generate, audit, export, and print SOC2 Type II, ISO 27001, PCI-DSS, and GDPR executive security reports.
            </p>
          </div>
          <button
            onClick={() => setIsGeneratorModalOpen(true)}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition shadow cursor-pointer flex items-center gap-1.5"
          >
            <i className="fa-solid fa-wand-magic-sparkles" /> Generate New Report
          </button>
        </div>

        <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-2xl">
            <i className="fa-solid fa-file-circle-plus" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-white">No generated reports yet</h3>
          <p className="mt-2 text-sm text-gray-400 max-w-xl mx-auto">
            The report archive is empty. Generate a live compliance report to populate the security register and audit timeline.
          </p>
        </div>
        {renderGeneratorModal()}
      </div>
    );
  }

  const isCompliant = activeReportData.complianceStatus === 'COMPLIANT';

  return (
    <div className="space-y-6 print:p-0 print:m-0 print:bg-white print:text-black">
      {renderToast()}

      {/* HEADER & ACTION TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 print:hidden">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onBackToDashboard}
              className="px-2.5 py-1 bg-[#15192b] hover:bg-[#1f243d] text-gray-300 rounded text-xs transition cursor-pointer flex items-center gap-1"
            >
              <i className="fa-solid fa-arrow-left text-[10px]" /> Back
            </button>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-file-contract text-purple-400" /> Securewatch Executive Security & Compliance Reports
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
            <i className="fa-solid fa-shield-halved text-purple-400 text-xl group-hover:scale-110 transition" />
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
            <i className="fa-solid fa-file-circle-check text-blue-400 text-xl group-hover:scale-110 transition" />
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
      <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-6 md:p-8 space-y-6 shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0 [print-color-adjust:exact]">
        {/* Document Header */}
        <div className="border-b border-[#1f2335] pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold font-mono bg-red-500/20 text-red-400 border border-red-500/30">
                {activeReportData.classification}
              </span>
              <span className="text-xs text-gray-400 font-mono">Report ID: {activeReportData.reportId}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white print:text-black tracking-tight">
              {activeReportData.reportType}
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Target Scope: <span className="text-white print:text-black font-medium">{activeReportData.targetScope}</span> |
              Timeframe: <span className="text-purple-300 print:text-purple-800 font-medium">{activeReportData.timeframe}</span>
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[#080a10] print:bg-gray-100 border border-[#1f2335] p-3.5 rounded-xl">
            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Audit Score</span>
              <div
                className={`text-3xl font-extrabold font-mono leading-none mt-1 ${
                  isCompliant ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {activeReportData.complianceScore}%
              </div>
            </div>
            <div className="h-9 w-px bg-[#1f2335]" />
            <div className="text-left">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Status</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold block mt-1 border ${
                  isCompliant
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}
              >
                {activeReportData.complianceStatus}
              </span>
            </div>
          </div>
        </div>

        {/* CISO Executive AI Summary */}
        <div className="bg-[#111524] print:bg-gray-50 border border-[#1f2335] rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-purple-300 print:text-purple-800 uppercase tracking-wider flex items-center gap-2">
            <i className="fa-solid fa-brain" /> CISO Executive AI Summary & Risk Analysis
          </h3>
          <p className="text-xs text-gray-200 print:text-black leading-relaxed font-sans whitespace-pre-line">
            {activeReportData.executiveSummary || 'No executive summary available.'}
          </p>
        </div>

        {/* Metrics Highlights Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#080a10] print:bg-gray-50 border border-[#1f2335] p-4 rounded-xl">
            <span className="text-[11px] text-gray-400 block font-medium">Attacks Blocked</span>
            <div className="text-xl font-bold text-red-400 font-mono mt-1">
              {activeReportData.metrics.totalThreatsBlocked.toLocaleString()}
            </div>
            <span className="text-[10px] text-gray-500 mt-1 block">Filtered at WAF level</span>
          </div>

          <div className="bg-[#080a10] print:bg-gray-50 border border-[#1f2335] p-4 rounded-xl">
            <span className="text-[11px] text-gray-400 block font-medium">Vulnerabilities Patched</span>
            <div className="text-xl font-bold text-purple-400 font-mono mt-1">
              {activeReportData.metrics.vulnerabilitiesMitigated.toLocaleString()}
            </div>
            <span className="text-[10px] text-gray-500 mt-1 block">Resolved in pipeline</span>
          </div>

          <div className="bg-[#080a10] print:bg-gray-50 border border-[#1f2335] p-4 rounded-xl">
            <span className="text-[11px] text-gray-400 block font-medium">API Availability SLA</span>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-1">{activeReportData.metrics.apiUptimeSla}</div>
            <span className="text-[10px] text-gray-500 mt-1 block">Zero catastrophic outages</span>
          </div>

          <div className="bg-[#080a10] print:bg-gray-50 border border-[#1f2335] p-4 rounded-xl">
            <span className="text-[11px] text-gray-400 block font-medium">Avg API Latency</span>
            <div className="text-xl font-bold text-blue-400 font-mono mt-1">{activeReportData.metrics.avgApiLatency}</div>
            <span className="text-[10px] text-gray-500 mt-1 block">Measured across gateways</span>
          </div>
        </div>

        {/* Key Audit Findings */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white print:text-black flex items-center gap-2">
            <i className="fa-solid fa-list-check text-emerald-400" /> Key Security Audit Findings & Verification
          </h3>
          {activeReportData.keyFindings.length === 0 ? (
            <p className="text-xs text-gray-500">No findings recorded.</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {activeReportData.keyFindings.map((finding, idx) => (
                <li
                  key={idx}
                  className="p-3 bg-[#111524] print:bg-gray-50 border border-[#1f2335] rounded-lg text-gray-300 print:text-black flex items-start gap-2.5"
                >
                  <i className="fa-solid fa-check-circle text-emerald-400 text-sm mt-0.5 shrink-0" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Regulatory Compliance Framework Matrix Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white print:text-black flex items-center gap-2">
            <i className="fa-solid fa-table-cells text-purple-400" /> Regulatory Compliance Controls Matrix
          </h3>
          <div className="overflow-x-auto border border-[#1f2335] rounded-xl">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-[#080a10] print:bg-gray-100 border-b border-[#1f2335] text-gray-400 uppercase text-[10px]">
                  <th className="p-3">Compliance Standard</th>
                  <th className="p-3">Primary Control Rule</th>
                  <th className="p-3">Compliance Level</th>
                  <th className="p-3 text-right">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2335] text-gray-300 print:text-black">
                {activeReportData.frameworkBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-3 text-gray-500 font-sans">
                      No framework data recorded.
                    </td>
                  </tr>
                ) : (
                  activeReportData.frameworkBreakdown.map((fw, idx) => (
                    <tr key={idx} className="hover:bg-[#111524]">
                      <td className="p-3 font-bold text-white print:text-black font-sans">{fw.standard}</td>
                      <td className="p-3 text-gray-400 text-[11px]">{fw.keyRule}</td>
                      <td className="p-3 font-mono font-bold text-purple-300 print:text-purple-800">{fw.compliancePct}%</td>
                      <td className="p-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            fw.status === 'PASSED'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {fw.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Strategic Recommended Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white print:text-black flex items-center gap-2">
            <i className="fa-solid fa-bullseye text-amber-400" /> Strategic Remediation & Action Recommendations
          </h3>
          {activeReportData.recommendedActions.length === 0 ? (
            <p className="text-xs text-gray-500">No actions recommended.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {activeReportData.recommendedActions.map((act, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#111524] print:bg-gray-50 border border-[#1f2335] rounded-lg text-gray-200 print:text-black flex items-center gap-3"
                >
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold font-mono text-[10px] shrink-0">
                    ACTION #{idx + 1}
                  </span>
                  <span className="flex-1">{act}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Meta */}
        <div className="border-t border-[#1f2335] pt-4 flex flex-col sm:flex-row justify-between items-center gap-1 text-[11px] text-gray-500 font-mono">
          <span>Generated by Securewatch Security Engine v4.8</span>
          <span>Timestamp: {formatUTC(activeReportData.generatedAt)}</span>
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
              className={`p-4 rounded-xl border transition cursor-pointer flex justify-between items-center gap-3 ${
                activeReportData.reportId === rpt.reportId
                  ? 'bg-purple-950/30 border-purple-500/60'
                  : 'bg-[#111524] hover:bg-[#171c30] border-[#1f2335]'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-purple-300">{rpt.reportId}</span>
                  <span className="text-[10px] text-gray-400">{formatDate(rpt.generatedAt)}</span>
                </div>
                <div className="font-bold text-white mt-1 truncate">{rpt.reportType}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 truncate">{rpt.targetScope}</div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span
                    className={`text-lg font-bold font-mono ${
                      rpt.complianceStatus === 'COMPLIANT' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {rpt.complianceScore}%
                  </span>
                  <span className="text-[10px] text-gray-500 block">Score</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteReport(rpt.reportId);
                  }}
                  className="text-gray-500 hover:text-red-400 p-1.5 cursor-pointer"
                  title="Delete Report"
                  aria-label={`Delete report ${rpt.reportId}`}
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REPORT GENERATOR WIZARD MODAL */}
      {renderGeneratorModal()}
    </div>
  );
};

export default ReportsView;