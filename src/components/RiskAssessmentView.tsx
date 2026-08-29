import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface RiskItem {
  id: string;
  assetName: string;
  category: 'Cloud' | 'Database' | 'Endpoint' | 'Human / Phishing' | 'Supply Chain' | 'Network' | 'API';
  threatVector: string;
  assetCriticality: number; // 1 to 5
  likelihood: number; // 1 to 5
  impact: number; // 1 to 5
  controlsImplemented: boolean;
  mitigationNotes: string;
  nistControl: string;
}

interface RiskAssessmentViewProps {
  onBackToDashboard?: () => void;
}

export const RiskAssessmentView: React.FC<RiskAssessmentViewProps> = ({ onBackToDashboard }) => {
  const [framework, setFramework] = useState<string>('NIST SP 800-30');
  const [riskItems, setRiskItems] = useState<RiskItem[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ likelihood: number; impact: number } | null>(null);

  // New Item Form State
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);
  const [newAsset, setNewAsset] = useState<string>('');
  const [newCategory, setNewCategory] = useState<RiskItem['category']>('Cloud');
  const [newThreat, setNewThreat] = useState<string>('');
  const [newCriticality, setNewCriticality] = useState<number>(3);
  const [newLikelihood, setNewLikelihood] = useState<number>(3);
  const [newImpact, setNewImpact] = useState<number>(3);
  const [newMitigated, setNewMitigated] = useState<boolean>(false);
  const [newNotes, setNewNotes] = useState<string>('');

  // AI Evaluation State
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    executiveSummary: string;
    complianceGaps: string[];
    recommendedActions: string[];
    evaluatedAt: string;
    displayDate: string;
    overallPosture: string;
  } | null>(null);

  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  const persistRiskItems = (items: RiskItem[]) => {
    void fetch('/api/risk-items', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riskItems: items }),
    });
  };

  useEffect(() => {
    fetch('/api/risk-items', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : [])
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          setRiskItems(items);
          return;
        }
        setRiskItems([]);
      })
      .catch(() => setRiskItems([]));
  }, []);

  // Helper score calculator
  const calculateInherentScore = (item: RiskItem) => {
    return Number((item.likelihood * item.impact * (item.assetCriticality / 3)).toFixed(1));
  };

  const calculateResidualScore = (item: RiskItem) => {
    const inherent = calculateInherentScore(item);
    return item.controlsImplemented ? Number((inherent * 0.4).toFixed(1)) : inherent;
  };

  const getRiskBadge = (score: number) => {
    if (score >= 18) return { label: 'CRITICAL', bg: 'bg-red-500/20 text-red-400 border-red-500/40' };
    if (score >= 12) return { label: 'HIGH', bg: 'bg-orange-500/20 text-orange-400 border-orange-500/40' };
    if (score >= 6) return { label: 'MEDIUM', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
    return { label: 'LOW', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
  };

  // Add Item Handler
  const handleAddItem = () => {
    if (!newAsset.trim() || !newThreat.trim()) return;

    const item: RiskItem = {
      id: 'risk-' + Date.now(),
      assetName: newAsset,
      category: newCategory,
      threatVector: newThreat,
      assetCriticality: newCriticality,
      likelihood: newLikelihood,
      impact: newImpact,
      controlsImplemented: newMitigated,
      mitigationNotes: newNotes || 'Control mitigation under review.',
      nistControl: 'AC-2, SC-7 (Access & Perimeter Control)',
    };

    const nextItems = [item, ...riskItems];
    setRiskItems(nextItems);
    persistRiskItems(nextItems);
    setIsAddingItem(false);
    setNewAsset('');
    setNewThreat('');
    setNewNotes('');
  };

  const toggleControlStatus = (id: string) => {
    const nextItems = riskItems.map((item) =>
        item.id === id ? { ...item, controlsImplemented: !item.controlsImplemented } : item
      );
    setRiskItems(nextItems);
    persistRiskItems(nextItems);
  };

  const deleteRiskItem = (id: string) => {
    const nextItems = riskItems.filter((item) => item.id !== id);
    setRiskItems(nextItems);
    persistRiskItems(nextItems);
  };

  // Run Real AI Evaluation API
  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/evaluate-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          framework,
          riskItems,
          organizationType: 'Enterprise Technology',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEvaluationResult(data);
      }
    } catch (e) {
      console.warn('Risk Evaluation Fallback:', e);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Aggregate Metrics
  const totalAssets = riskItems.length;
  const criticalCount = riskItems.filter((i) => calculateResidualScore(i) >= 12).length;
  const mitigatedCount = riskItems.filter((i) => i.controlsImplemented).length;
  const avgResidual = totalAssets > 0
    ? (riskItems.reduce((acc, curr) => acc + calculateResidualScore(curr), 0) / totalAssets).toFixed(1)
    : '0';

  // Filter items by cell click
  const filteredRiskItems = selectedCell
    ? riskItems.filter((i) => i.likelihood === selectedCell.likelihood && i.impact === selectedCell.impact)
    : riskItems;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(riskItems, null, 2));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0a0803]/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-amber-500/20 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-clipboard-check text-amber-400" /> Cybersecurity Risk Assessment Framework & Matrix
              </h2>
            </div>
            <p className="text-xs text-amber-200/70 mt-1">
              Enterprise Risk Quantification based on NIST SP 800-30, ISO 27001 & FAIR quantitative risk modeling standards.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="px-3.5 py-1.5 bg-[#141008] hover:bg-[#20180a] border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-arrow-left" /> Back to Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Framework & Preset Toolbar */}
        <div className="pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400 font-semibold">Active Framework:</span>
            {['NIST SP 800-30', 'ISO 27001 Risk Matrix', 'FAIR Quantitative Model'].map((fw) => (
              <button
                key={fw}
                onClick={() => setFramework(fw)}
                className={`px-3 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  framework === fw
                    ? 'bg-[#3b28cc] text-white'
                    : 'bg-[#111524] border border-[#1f2335] text-gray-400 hover:text-gray-200'
                }`}
              >
                {fw}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0d111c] border border-[#1f2335] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium block">Total Evaluated Assets</span>
            <div className="text-2xl font-bold font-mono text-white mt-0.5">{totalAssets}</div>
            <span className="text-[11px] text-gray-400 mt-1 block font-mono">Infrastructure & Data Vectors</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#111524] border border-[#1f2335] flex items-center justify-center text-purple-400">
            <i className="fa-solid fa-server" />
          </div>
        </div>

        <div className="p-4 bg-[#0d111c] border border-[#1f2335] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium block">High / Critical Risks</span>
            <div className="text-2xl font-bold font-mono text-red-400 mt-0.5">{criticalCount}</div>
            <span className="text-[11px] text-gray-400 mt-1 block font-mono">Requires Immediate Control</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
        </div>

        <div className="p-4 bg-[#0d111c] border border-[#1f2335] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium block">Mitigating Controls Applied</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
              {mitigatedCount} <span className="text-xs text-gray-500 font-normal">/ {totalAssets}</span>
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block font-mono">
              {totalAssets > 0 ? Math.round((mitigatedCount / totalAssets) * 100) : 0}% Coverage Rate
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <i className="fa-solid fa-shield-halved" />
          </div>
        </div>

        <div className="p-4 bg-[#0d111c] border border-[#1f2335] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium block">Avg Residual Risk Score</span>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">{avgResidual}</div>
            <span className="text-[11px] text-gray-400 mt-1 block font-mono">Post-Mitigation Index</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <i className="fa-solid fa-chart-line" />
          </div>
        </div>
      </div>

      {/* 5x5 NIST RISK HEATMAP MATRIX & AI AUDIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Heatmap Section */}
        <div className="lg:col-span-7 bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-border-all text-[#9f86ff]" /> NIST 5x5 Risk Likelihood vs Impact Matrix
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Click any cell to filter assets sitting at specific risk coordinates.
              </p>
            </div>

            {selectedCell && (
              <button
                onClick={() => setSelectedCell(null)}
                className="text-[11px] text-purple-300 hover:text-white font-mono bg-[#111524] px-2.5 py-1 rounded border border-[#1f2335] cursor-pointer"
              >
                Reset Filter (Show All)
              </button>
            )}
          </div>

          <div className="relative pt-2">
            <div className="flex">
              {/* Y-Axis Label */}
              <div className="w-8 flex items-center justify-center text-[10px] font-bold text-gray-400 font-mono rotate-180 uppercase tracking-widest text-center" style={{ writingMode: 'vertical-lr' }}>
                Likelihood (1 → 5)
              </div>

              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map((lh) => (
                  <div key={lh} className="flex items-center gap-1">
                    <span className="w-5 text-[10px] text-gray-400 font-mono font-bold text-right pr-1">{lh}</span>
                    <div className="grid grid-cols-5 gap-1 flex-1">
                      {[1, 2, 3, 4, 5].map((imp) => {
                        const cellScore = lh * imp;
                        let cellBg = 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400';
                        if (cellScore >= 16) cellBg = 'bg-red-950/60 border-red-700/60 text-red-400';
                        else if (cellScore >= 10) cellBg = 'bg-orange-950/50 border-orange-700/50 text-orange-400';
                        else if (cellScore >= 6) cellBg = 'bg-amber-950/40 border-amber-700/40 text-amber-400';

                        const countInCell = riskItems.filter((i) => i.likelihood === lh && i.impact === imp).length;
                        const isSelected = selectedCell?.likelihood === lh && selectedCell?.impact === imp;

                        return (
                          <button
                            key={imp}
                            onClick={() => setSelectedCell({ likelihood: lh, impact: imp })}
                            className={`h-11 rounded border ${cellBg} transition cursor-pointer flex flex-col items-center justify-center relative ${
                              isSelected ? 'ring-2 ring-white scale-[1.03] z-10' : 'hover:scale-[1.02]'
                            }`}
                          >
                            <span className="text-[10px] font-mono font-semibold opacity-70">L{lh}×I{imp}</span>
                            {countInCell > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-purple-600 text-white font-bold text-[10px] rounded-full border border-white/40 flex items-center justify-center shadow-lg animate-pulse">
                                {countInCell}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* X-Axis Label */}
                <div className="flex items-center gap-1 pt-1">
                  <div className="w-5" />
                  <div className="grid grid-cols-5 gap-1 flex-1 text-center font-mono text-[10px] text-gray-400 font-bold">
                    <span>Impact 1</span>
                    <span>Impact 2</span>
                    <span>Impact 3</span>
                    <span>Impact 4</span>
                    <span>Impact 5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Control Audit Panel */}
        <div className="lg:col-span-5 bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-brain text-[#9f86ff]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                AI Risk Audit & NIST Controls Generator
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Automated compliance gap evaluation, NIST SP 800-53 control mappings, and executive security recommendations.
            </p>

            <div className="mt-4 p-3 bg-[#080a10] border border-[#1f2335] rounded-lg space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Risk Matrix Items:</span>
                <strong className="text-white font-mono">{riskItems.length} Scenarios</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Framework Target:</span>
                <strong className="text-purple-300 font-mono">{framework}</strong>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleRunEvaluation}
              disabled={isEvaluating || riskItems.length === 0}
              className="w-full py-2.5 bg-gradient-to-r from-[#3b28cc] to-[#5b48e3] hover:from-[#4d3be3] hover:to-[#6d5bf5] text-white text-xs font-bold rounded-lg transition shadow-[0_0_15px_rgba(59,40,204,0.25)] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isEvaluating ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin" /> Evaluating NIST Controls...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles" /> Evaluate Compliance & Run AI Audit
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI EVALUATION OUTPUT BOX */}
      <AnimatePresence>
        {evaluationResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-5 bg-[#0d111c] border border-[#3b28cc]/40 rounded-xl space-y-4 shadow-[0_0_20px_rgba(59,40,204,0.15)]"
          >
            <div className="flex justify-between items-center border-b border-[#1f2335] pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  AI Risk Evaluation & Compliance Audit Results
                </h4>
              </div>
              <span className="text-xs text-gray-400 font-mono">
                Evaluated: {evaluationResult.displayDate}
              </span>
            </div>

            <div className="p-3 bg-[#111524] border border-[#1f2335] rounded-lg">
              <span className="text-[11px] font-bold text-purple-300 uppercase block mb-1">Executive Summary:</span>
              <p className="text-xs text-gray-200 leading-relaxed font-sans">
                {evaluationResult.executiveSummary}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-[#111524] border border-[#1f2335] rounded-lg space-y-2">
                <span className="font-bold text-amber-400 block flex items-center gap-1.5">
                  <i className="fa-solid fa-circle-exclamation" /> Mandatory Compliance Controls (NIST/ISO):
                </span>
                <ul className="space-y-1.5 text-gray-300">
                  {evaluationResult.complianceGaps.map((gap, idx) => (
                    <li key={idx} className="p-2 bg-[#080a10] rounded border border-[#1f2335] font-mono text-[11px]">
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 bg-[#111524] border border-[#1f2335] rounded-lg space-y-2">
                <span className="font-bold text-emerald-400 block flex items-center gap-1.5">
                  <i className="fa-solid fa-shield-virus" /> Recommended Technical Mitigations:
                </span>
                <ul className="space-y-1.5 text-gray-300">
                  {evaluationResult.recommendedActions.map((act, idx) => (
                    <li key={idx} className="p-2 bg-[#080a10] rounded border border-[#1f2335] font-mono text-[11px]">
                      {act}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RISK INVENTORY & MITIGATION REGISTER TABLE */}
      <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl overflow-hidden space-y-4 p-5">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-list-check text-purple-400" /> Organizational Risk Register & Asset Inventory ({filteredRiskItems.length})
            </h3>
            {selectedCell && (
              <span className="text-[11px] text-purple-300 font-mono">
                Filtered by Matrix Coordinate: Likelihood {selectedCell.likelihood}, Impact {selectedCell.impact}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsAddingItem(!isAddingItem)}
              className="px-3 py-1.5 bg-[#3b28cc] hover:bg-[#4d3be3] text-white text-xs font-bold rounded transition cursor-pointer flex items-center gap-1.5"
            >
              <i className="fa-solid fa-plus" /> Add Risk Item
            </button>
            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-gray-300 text-xs font-semibold rounded transition cursor-pointer flex items-center gap-1.5"
            >
              <i className="fa-regular fa-copy" />
              {copiedReport ? 'Copied JSON!' : 'Export Register'}
            </button>
          </div>
        </div>

        {/* Add Item Form Collapse */}
        <AnimatePresence>
          {isAddingItem && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-[#111524] border border-[#3b28cc]/30 rounded-xl space-y-3"
            >
              <h4 className="text-xs font-bold text-white">Register New Risk Asset Scenario</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-gray-400 block mb-1">Asset / System Name</label>
                  <input
                    type="text"
                    value={newAsset}
                    onChange={(e) => setNewAsset(e.target.value)}
                    placeholder="e.g. Production Redis Cluster"
                    className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded outline-none font-mono cursor-pointer"
                  >
                    <option value="Cloud">Cloud</option>
                    <option value="Database">Database</option>
                    <option value="Endpoint">Endpoint</option>
                    <option value="Human / Phishing">Human / Phishing</option>
                    <option value="Supply Chain">Supply Chain</option>
                    <option value="Network">Network</option>
                    <option value="API">API</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Threat Vector / Vulnerability</label>
                  <input
                    type="text"
                    value={newThreat}
                    onChange={(e) => setNewThreat(e.target.value)}
                    placeholder="e.g. Unauthenticated Remote Access"
                    className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-gray-400 block mb-1">Asset Criticality (1 - 5): {newCriticality}</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={newCriticality}
                    onChange={(e) => setNewCriticality(Number(e.target.value))}
                    className="w-full accent-[#3b28cc] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Likelihood (1 - 5): {newLikelihood}</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={newLikelihood}
                    onChange={(e) => setNewLikelihood(Number(e.target.value))}
                    className="w-full accent-[#3b28cc] cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Impact Level (1 - 5): {newImpact}</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={newImpact}
                    onChange={(e) => setNewImpact(Number(e.target.value))}
                    className="w-full accent-[#3b28cc] cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMitigated}
                    onChange={(e) => setNewMitigated(e.target.checked)}
                    className="accent-[#3b28cc]"
                  />
                  Mitigating Controls Already Implemented
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsAddingItem(false)}
                    className="px-3 py-1.5 bg-[#080a10] text-gray-400 text-xs rounded hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddItem}
                    className="px-4 py-1.5 bg-[#3b28cc] text-white text-xs font-bold rounded hover:bg-[#4d3be3] cursor-pointer"
                  >
                    Save Risk Asset
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table Content */}
        <div className="overflow-x-auto border border-[#1f2335] rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#080a10] border-b border-[#1f2335] text-gray-400 font-mono text-[11px]">
                <th className="py-3 px-3">Asset & Threat Vector</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Likelihood × Impact</th>
                <th className="py-3 px-3">Inherent Risk</th>
                <th className="py-3 px-3">Residual Risk</th>
                <th className="py-3 px-3">Control Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2335] bg-[#0d111c] text-gray-300">
              {filteredRiskItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 italic">
                    No risk items found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredRiskItems.map((item) => {
                  const inherent = calculateInherentScore(item);
                  const residual = calculateResidualScore(item);
                  const badge = getRiskBadge(residual);

                  return (
                    <tr key={item.id} className="hover:bg-[#111524] transition">
                      <td className="py-3 px-3">
                        <strong className="text-white text-xs block">{item.assetName}</strong>
                        <span className="text-[11px] text-gray-400 font-mono">{item.threatVector}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-400 text-[11px]">{item.category}</td>
                      <td className="py-3 px-3 font-mono text-gray-300">
                        L{item.likelihood} × I{item.impact}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-gray-400">{inherent}</td>
                      <td className="py-3 px-3 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                          {residual} ({badge.label})
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => toggleControlStatus(item.id)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                            item.controlsImplemented
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          <i className={`fa-solid ${item.controlsImplemented ? 'fa-check' : 'fa-xmark'}`} />
                          {item.controlsImplemented ? 'Mitigated' : 'Unmitigated'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => deleteRiskItem(item.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition cursor-pointer"
                          title="Delete Risk Item"
                        >
                          <i className="fa-solid fa-trash text-xs" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
