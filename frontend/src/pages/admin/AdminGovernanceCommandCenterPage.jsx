import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Radio, AlertTriangle, Building2, Flame, Clock,
  CheckCircle2, Users, RefreshCw, ChevronRight, Activity, Bell,
  Sparkles, Sliders, Check, X, FileText, Send, Eye
} from 'lucide-react';
import { governanceAdminApi, predictionsAdminApi } from '../../services/adminApi';

export const AdminGovernanceCommandCenterPage = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [executiveReport, setExecutiveReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  // Modal State for Action Plan / Dispatch
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planActionType, setPlanActionType] = useState('Inspect');
  const [planWorkersCount, setPlanWorkersCount] = useState(1);
  const [planDuration, setPlanDuration] = useState('24 Hours');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [oRes, iRes, wRes, rRes] = await Promise.all([
        governanceAdminApi.getOverview().catch(() => ({ data: null })),
        governanceAdminApi.getIncidents({ limit: 30, sort: '-riskScore' }).catch(() => ({ data: { incidents: [] } })),
        predictionsAdminApi.getWarnings().catch(() => ({ data: { warnings: [] } })),
        governanceAdminApi.getExecutiveReport().catch(() => ({ data: { report: null } }))
      ]);

      if (oRes.data?.summary) setOverview(oRes.data.summary);
      if (iRes.data?.incidents) setIncidents(iRes.data.incidents);
      if (wRes.data?.warnings) setWarnings(wRes.data.warnings);
      if (rRes.data?.report) setExecutiveReport(rRes.data.report);
    } catch (err) {
      console.error('Failed to load command center:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await governanceAdminApi.recalculate();
      await fetchAll();
    } catch (err) {
      console.error('Recalculate error:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await governanceAdminApi.acknowledgeIncident(id);
      setIncidents(prev => prev.map(inc => inc._id === id ? { ...inc, status: 'Acknowledged' } : inc));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to acknowledge');
    }
  };

  const handleOpenActionModal = (incident) => {
    setSelectedIncident(incident);
    setPlanTitle(`Action Plan: ${incident.title}`);
    setPlanActionType(incident.incidentType === 'Civic Hotspot' ? 'Inspect' : (incident.incidentType === 'Emergency Cluster' ? 'Repair' : 'Deploy Workers'));
    setPlanWorkersCount(Math.ceil(incident.riskScore / 30) || 1);
    setActionModalOpen(true);
  };

  const handleCreateActionPlan = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;
    setSubmittingAction(true);
    try {
      await governanceAdminApi.createActionPlan(selectedIncident._id, {
        title: planTitle,
        actionType: planActionType,
        requiredWorkers: planWorkersCount,
        estimatedDuration: planDuration,
        description: selectedIncident.recommendedAction
      });
      setIncidents(prev => prev.map(inc => inc._id === selectedIncident._id ? { ...inc, status: 'Action Planned' } : inc));
      setActionModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create action plan');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. COMMAND CENTER HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-5 rounded-3xl bg-[#0f111a] border border-cyan-500/30 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center relative">
            <Radio size={24} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-[#0f111a]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-wide">
                MUNICIPAL AI GOVERNANCE COMMAND CENTER
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold font-mono">
                LIVE ORCHESTRATION
              </span>
            </div>
            <p className="text-xs text-surface-400 mt-0.5">
              Closed-loop civic situation monitoring, hazard containment, and autonomous response dispatch
            </p>
          </div>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all border border-cyan-400/40"
        >
          <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
          {recalculating ? 'Orchestrating Cycles...' : 'Recalculate Governance Cycles'}
        </button>
      </div>

      {/* 2. TOP KPI ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#161b26] border border-cyan-500/20">
          <span className="text-[10px] text-surface-400 block uppercase font-bold">Active Incidents</span>
          <p className="text-xl font-black text-white mt-1">{overview?.activeIncidents ?? 0}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#161b26] border border-red-500/30">
          <span className="text-[10px] text-red-400 block uppercase font-bold">Critical Level</span>
          <p className="text-xl font-black text-red-400 mt-1">{overview?.criticalIncidents ?? 0}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#161b26] border border-amber-500/20">
          <span className="text-[10px] text-amber-400 block uppercase font-bold">SLA Crises</span>
          <p className="text-xl font-black text-amber-300 mt-1">{overview?.slaCrises ?? 0}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#161b26] border border-yellow-500/20">
          <span className="text-[10px] text-yellow-400 block uppercase font-bold">Overloaded Depts</span>
          <p className="text-xl font-black text-yellow-300 mt-1">{overview?.overloadedDepts ?? 0}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#161b26] border border-purple-500/20">
          <span className="text-[10px] text-purple-400 block uppercase font-bold">Emergency Clusters</span>
          <p className="text-xl font-black text-purple-300 mt-1">{overview?.emergencyClusters ?? 0}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#161b26] border border-emerald-500/20">
          <span className="text-[10px] text-emerald-400 block uppercase font-bold">Pending Preventive</span>
          <p className="text-xl font-black text-emerald-400 mt-1">{overview?.pendingPreventiveActions ?? 0}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#161b26] border border-blue-500/20">
          <span className="text-[10px] text-blue-400 block uppercase font-bold">Available Crews</span>
          <p className="text-xl font-black text-blue-300 mt-1">{overview?.availableWorkers ?? 0} / {overview?.totalWorkers ?? 0}</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#161b26] border border-green-500/20">
          <span className="text-[10px] text-green-400 block uppercase font-bold">SLA Compliance</span>
          <p className="text-xl font-black text-green-300 mt-1">{overview?.responseCompliance ?? '95%'}</p>
        </div>
      </div>

      {/* 3. MAIN 2-COLUMN COMMAND CENTER LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: REQUIRES IMMEDIATE ACTION (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              Requires Immediate Action ({incidents.length})
            </h2>
            <span className="text-xs text-surface-400 font-mono">Ranked by Composite Risk Score</span>
          </div>

          <div className="space-y-3.5">
            {incidents.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[#121620] border border-surface-800 text-center space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
                <p className="text-sm font-bold text-white">All Civic Sectors Operating Normally</p>
                <p className="text-xs text-surface-400">No active governance incidents or critical hazards identified.</p>
              </div>
            ) : (
              incidents.map((incident) => (
                <div
                  key={incident._id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all space-y-3 relative overflow-hidden ${
                    incident.severity === 'CRITICAL' ? 'bg-[#181119] border-red-500/40 shadow-lg shadow-red-500/5' :
                    incident.severity === 'WARNING' ? 'bg-[#181512] border-yellow-500/40' :
                    'bg-[#121620] border-surface-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          incident.severity === 'CRITICAL' ? 'bg-red-500/30 text-red-300 border border-red-500/40' :
                          incident.severity === 'WARNING' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/40' :
                          'bg-blue-500/30 text-blue-300 border border-blue-500/40'
                        }`}>
                          {incident.severity}
                        </span>
                        <span className="text-xs font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-mono">
                          {incident.incidentType}
                        </span>
                        <span className="text-[11px] text-surface-400">
                          {incident.department} • {incident.area}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-base leading-tight">
                        {incident.title}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-surface-400 block uppercase font-mono">Risk Score</span>
                      <span className="text-2xl font-black text-red-400 leading-none">
                        {incident.riskScore}
                        <span className="text-xs text-surface-500 font-normal">/100</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-surface-300 leading-relaxed">
                    {incident.description}
                  </p>

                  <div className="p-3 rounded-2xl bg-surface-900/80 border border-white/5 space-y-1">
                    <span className="text-[10px] font-bold text-cyan-300 uppercase block tracking-wider">
                      AI RECOMMENDED ACTION
                    </span>
                    <p className="text-xs text-surface-200 font-medium">
                      {incident.recommendedAction || 'Dispatch emergency inspection crew.'}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                        incident.status === 'Closed' ? 'bg-surface-800 text-surface-400' :
                        incident.status === 'Dispatched' ? 'bg-purple-500/20 text-purple-300' :
                        incident.status === 'Action Planned' ? 'bg-blue-500/20 text-blue-300' :
                        incident.status === 'Acknowledged' ? 'bg-emerald-500/20 text-emerald-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        Status: {incident.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {incident.status === 'Detected' && (
                        <button
                          onClick={() => handleAcknowledge(incident._id)}
                          className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-500/30 transition-all flex items-center gap-1"
                        >
                          <Check size={13} /> Acknowledge
                        </button>
                      )}

                      {(incident.status === 'Detected' || incident.status === 'Acknowledged') && (
                        <button
                          onClick={() => handleOpenActionModal(incident)}
                          className="px-2.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 rounded-xl text-xs font-bold border border-cyan-500/30 transition-all flex items-center gap-1"
                        >
                          <FileText size={13} /> Create Action Plan
                        </button>
                      )}

                      <Link
                        to={`/government/incidents/${incident._id}`}
                        className="px-2.5 py-1.5 bg-surface-800 hover:bg-surface-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Eye size={13} /> View Intelligence <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: EARLY WARNING CENTER & SITUATION REPORT (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          {/* DAILY MUNICIPAL SITUATION REPORT */}
          {executiveReport && (
            <div className="p-5 rounded-3xl bg-[#121620] border border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={16} className="text-cyan-400" />
                  Daily Situation Report
                </h2>
                <span className="text-[10px] text-surface-400 font-mono">{executiveReport.date}</span>
              </div>

              <p className="text-xs text-surface-300 leading-relaxed font-medium bg-cyan-500/10 p-3 rounded-2xl border border-cyan-500/20">
                "{executiveReport.situationSummary}"
              </p>

              <div className="space-y-2">
                <span className="text-[10px] text-surface-400 uppercase font-bold tracking-wider block">
                  Recommended Municipal Decisions
                </span>
                <ul className="space-y-1.5 text-xs text-surface-200">
                  {executiveReport.recommendations?.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-surface-400">
                <span>Worker Capacity:</span>
                <span className="font-bold text-white">{executiveReport.workerCapacity}</span>
              </div>
            </div>
          )}

          {/* EARLY WARNING CENTER */}
          <div className="p-5 rounded-3xl bg-[#121620] border border-surface-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Bell size={16} className="text-pink-400" />
                Early Warning Center ({warnings.length})
              </h2>
            </div>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {warnings.length === 0 ? (
                <p className="text-xs text-surface-500 italic text-center py-4">No active warning triggers.</p>
              ) : (
                warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                      w.level === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30 text-red-200' :
                      w.level === 'WARNING' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200' :
                      w.level === 'WATCH' ? 'bg-purple-500/10 border-purple-500/30 text-purple-200' :
                      'bg-blue-500/10 border-blue-500/30 text-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[10px] uppercase tracking-wider">{w.level}</span>
                      <span className="text-[10px] text-surface-400 font-mono">{w.category}</span>
                    </div>
                    <p className="font-bold text-white text-xs">{w.title}</p>
                    <p className="text-surface-300 text-[11px] leading-relaxed">{w.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. ACTION PLAN CREATION MODAL */}
      <AnimatePresence>
        {actionModalOpen && selectedIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-6 rounded-3xl bg-[#161b26] border border-cyan-500/40 w-full max-w-lg shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-cyan-400" /> Create Municipal Action Plan
                </h3>
                <button onClick={() => setActionModalOpen(false)} className="text-surface-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateActionPlan} className="space-y-4 text-xs">
                <div>
                  <label className="text-surface-400 uppercase font-bold block mb-1">Plan Title</label>
                  <input
                    type="text"
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    required
                    className="input-field w-full text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-surface-400 uppercase font-bold block mb-1">Action Type</label>
                    <select
                      value={planActionType}
                      onChange={(e) => setPlanActionType(e.target.value)}
                      className="input-field w-full text-xs"
                    >
                      {['Inspect', 'Repair', 'Preventive Maintenance', 'Deploy Workers', 'Increase Capacity', 'Monitor', 'Public Advisory'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-surface-400 uppercase font-bold block mb-1">Required Workers</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={planWorkersCount}
                      onChange={(e) => setPlanWorkersCount(Number(e.target.value))}
                      className="input-field w-full text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-surface-400 uppercase font-bold block mb-1">Estimated Duration</label>
                  <input
                    type="text"
                    value={planDuration}
                    onChange={(e) => setPlanDuration(e.target.value)}
                    className="input-field w-full text-xs"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-surface-300">
                  <span className="font-bold text-cyan-300 block mb-0.5">Recommended Action Reference:</span>
                  <p>{selectedIncident.recommendedAction}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-surface-800 text-surface-300 font-bold hover:bg-surface-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAction}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {submittingAction ? 'Approving...' : 'Approve & Create Plan'}
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

export default AdminGovernanceCommandCenterPage;
