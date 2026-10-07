import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BrainCircuit, TrendingUp, AlertTriangle, Building2, MapPin,
  ShieldAlert, RefreshCw, CheckCircle2, Clock, Users, ArrowRight,
  Sparkles, Layers, Sliders, ChevronRight, Check, X, Bell
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { predictionsAdminApi } from '../../services/adminApi';

export const AdminPredictionsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get('filter') || searchParams.get('status') || '');
  const [overview, setOverview] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [deptForecasts, setDeptForecasts] = useState([]);
  const [preventiveActions, setPreventiveActions] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    setFilter(searchParams.get('filter') || searchParams.get('status') || '');
  }, [searchParams]);

  // Simulation State
  const [simDept, setSimDept] = useState('Road Department');
  const [simExtraWorkers, setSimExtraWorkers] = useState(2);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [oRes, hRes, dRes, pRes, wRes, fRes] = await Promise.all([
        predictionsAdminApi.getOverview().catch(() => ({ data: null })),
        predictionsAdminApi.getHotspots().catch(() => ({ data: { hotspots: [] } })),
        predictionsAdminApi.getDepartments().catch(() => ({ data: { departments: [] } })),
        predictionsAdminApi.getPreventiveActions().catch(() => ({ data: { actions: [] } })),
        predictionsAdminApi.getWarnings().catch(() => ({ data: { warnings: [] } })),
        predictionsAdminApi.getForecast().catch(() => ({ data: { forecast: null } }))
      ]);

      if (oRes.data) setOverview(oRes.data.summary);
      if (hRes.data?.hotspots) setHotspots(hRes.data.hotspots);
      if (dRes.data?.departments) {
        setDeptForecasts(dRes.data.departments);
        if (dRes.data.departments.length > 0 && !simDept) {
          setSimDept(dRes.data.departments[0].department);
        }
      }
      if (pRes.data?.actions) setPreventiveActions(pRes.data.actions);
      if (wRes.data?.warnings) setWarnings(wRes.data.warnings);
      if (fRes.data?.forecast) setForecastData(fRes.data.forecast);
    } catch (err) {
      console.error('Failed to load predictions:', err);
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
      await predictionsAdminApi.recalculate();
      await fetchAll();
    } catch (err) {
      console.error('Recalculate failed:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const res = await predictionsAdminApi.simulate({
        department: simDept,
        additionalWorkers: simExtraWorkers
      });
      if (res.data?.simulation) {
        setSimulationResult(res.data.simulation);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleUpdateActionStatus = async (id, status) => {
    try {
      await predictionsAdminApi.updateActionStatus(id, status);
      setPreventiveActions(prev => prev.map(a => a._id === id ? { ...a, status } : a));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update action status');
    }
  };

  const handleAcknowledgeWarning = async (id) => {
    try {
      await predictionsAdminApi.acknowledgeWarning(id);
      setWarnings(prev => prev.map(w => w._id === id ? { ...w, status: 'Acknowledged' } : w));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to acknowledge warning');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/40">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                AI Predictive Civic Planning &amp; Preventive Governance
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Phase 8
                </span>
              </h1>
              <p className="text-xs text-surface-400 mt-0.5">
                Pre-emptive risk modeling, spatial hazard clustering, workforce demand forecasting &amp; early warnings
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all"
        >
          <RefreshCw size={14} className={recalculating ? 'animate-spin' : ''} />
          {recalculating ? 'Recalculating Models...' : 'Recalculate Predictive Intelligence'}
        </button>
      </div>

      {/* 1. EXECUTIVE PREDICTIVE KPI GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-surface-900/60 border border-purple-500/20">
          <span className="text-xs text-surface-400 flex items-center gap-1"><TrendingUp size={13} className="text-purple-400" /> Forecast (7 Days)</span>
          <p className="text-2xl font-black text-purple-300 mt-1">{overview?.predictedNext7Days ?? 0}</p>
          <p className="text-[10px] text-surface-500 mt-0.5">{overview?.trendPercentage || '+0%'} Pace</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-indigo-500/20">
          <span className="text-xs text-surface-400 flex items-center gap-1"><Clock size={13} className="text-indigo-400" /> Forecast (30 Days)</span>
          <p className="text-2xl font-black text-indigo-300 mt-1">{overview?.predictedNext30Days ?? 0}</p>
          <p className="text-[10px] text-surface-500 mt-0.5">Projected Intake</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-red-500/20">
          <span className="text-xs text-surface-400 flex items-center gap-1"><MapPin size={13} className="text-red-400" /> Critical Hotspots</span>
          <p className="text-2xl font-black text-red-400 mt-1">{overview?.criticalHotspotsCount ?? 0}</p>
          <p className="text-[10px] text-surface-500 mt-0.5">Immediate hazard</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-amber-500/20">
          <span className="text-xs text-surface-400 flex items-center gap-1"><Building2 size={13} className="text-amber-400" /> Strained Depts</span>
          <p className="text-2xl font-black text-amber-300 mt-1">{overview?.departmentsAtRiskCount ?? 0}</p>
          <p className="text-[10px] text-surface-500 mt-0.5">Capacity alert</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-emerald-500/20">
          <span className="text-xs text-surface-400 flex items-center gap-1"><CheckCircle2 size={13} className="text-emerald-400" /> Preventive Actions</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{overview?.preventiveActionsCount ?? 0}</p>
          <p className="text-[10px] text-surface-500 mt-0.5">Pre-emptive tasks</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-900/60 border border-pink-500/20">
          <span className="text-xs text-surface-400 flex items-center gap-1"><ShieldAlert size={13} className="text-pink-400" /> Early Warnings</span>
          <p className="text-2xl font-black text-pink-400 mt-1">{overview?.activeWarningsCount ?? 0}</p>
          <p className="text-[10px] text-surface-500 mt-0.5">Active triggers</p>
        </div>
      </div>

      {/* 2. EARLY WARNING CENTER */}
      {warnings.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#131024] border border-surface-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Bell size={18} className="text-pink-400" /> Municipal Early Warning Center
            </h2>
            <span className="text-xs text-surface-400">{warnings.length} Active System Alerts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {warnings.map((w, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all text-xs space-y-2 ${
                  w.level === 'CRITICAL' ? 'bg-red-500/10 border-red-500/40 text-red-200' :
                  w.level === 'WARNING' ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-200' :
                  w.level === 'WATCH' ? 'bg-purple-500/10 border-purple-500/40 text-purple-200' :
                  'bg-blue-500/10 border-blue-500/40 text-blue-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    w.level === 'CRITICAL' ? 'bg-red-500/30 text-red-300' :
                    w.level === 'WARNING' ? 'bg-yellow-500/30 text-yellow-300' :
                    w.level === 'WATCH' ? 'bg-purple-500/30 text-purple-300' :
                    'bg-blue-500/30 text-blue-300'
                  }`}>
                    {w.level}
                  </span>
                  <span className="text-[10px] text-surface-400 font-mono">{w.category}</span>
                </div>
                <h3 className="font-bold text-white text-sm">{w.title}</h3>
                <p className="text-surface-300 leading-relaxed">{w.message}</p>
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-[10px] text-surface-400">{w.metric}</span>
                  {w.status !== 'Acknowledged' ? (
                    <button
                      onClick={() => handleAcknowledgeWarning(w._id)}
                      className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] font-bold flex items-center gap-1"
                    >
                      <Check size={11} /> Acknowledge
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-bold">✓ Acknowledged</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. WHAT-IF RESOURCE SIMULATION & PREVENTIVE ACTIONS (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WHAT-IF SIMULATION CARD */}
        <div className="p-6 rounded-3xl bg-[#161b22] border border-surface-800 space-y-4">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-cyan-400" />
            <h2 className="text-base font-bold text-white">What-If Resource &amp; Capacity Simulator</h2>
          </div>
          <p className="text-xs text-surface-400">
            Simulate workforce scaling impacts on backlog reduction and SLA compliance without altering live records.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase text-surface-400 block mb-1.5">Select Department</label>
              <select
                value={simDept}
                onChange={(e) => setSimDept(e.target.value)}
                className="input-field w-full text-xs"
              >
                {deptForecasts.map(d => (
                  <option key={d.department} value={d.department}>{d.department}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-surface-400 block mb-1.5">Additional Field Workers</label>
              <div className="flex gap-2">
                {[1, 2, 3, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => setSimExtraWorkers(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      simExtraWorkers === num
                        ? 'bg-cyan-600 text-white border-cyan-500 shadow-md'
                        : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-white'
                    }`}
                  >
                    +{num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            <Sparkles size={14} />
            {simulating ? 'Computing Simulation...' : 'Run Mathematical Capacity Simulation'}
          </button>

          {simulationResult && (
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-surface-900/80 border border-white/5">
                  <span className="text-surface-400 block uppercase text-[9px]">Current Workload</span>
                  <p className="font-bold text-white text-sm mt-0.5">{simulationResult.currentWorkload}</p>
                  <p className="text-[10px] text-surface-500">SLA: {simulationResult.currentSlaCompliance}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-900/80 border border-cyan-500/30">
                  <span className="text-cyan-300 block uppercase text-[9px]">Simulated (+{simulationResult.additionalWorkers} Workers)</span>
                  <p className="font-bold text-cyan-300 text-sm mt-0.5">{simulationResult.projectedWorkload}</p>
                  <p className="text-[10px] text-emerald-400 font-bold">SLA: {simulationResult.projectedSlaCompliance}</p>
                </div>
              </div>
              <p className="text-surface-200 italic leading-relaxed">"{simulationResult.estimatedImpact}"</p>
            </div>
          )}
        </div>

        {/* PREVENTIVE ACTIONS WORKFLOW */}
        <div className="p-6 rounded-3xl bg-[#161b22] border border-surface-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" /> Preventive Maintenance Actions
            </h2>
            <span className="text-xs text-surface-400">{preventiveActions.length} Actions</span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {preventiveActions.length === 0 ? (
              <p className="text-xs text-surface-500 italic py-6 text-center">No recurring defect patterns identified.</p>
            ) : (
              preventiveActions.map((action, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-surface-900/70 border border-surface-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{action.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      action.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' :
                      action.status === 'Dispatched' ? 'bg-blue-500/20 text-blue-300' :
                      action.status === 'Planned' ? 'bg-yellow-500/20 text-yellow-300' :
                      action.status === 'Dismissed' ? 'bg-red-500/20 text-red-300' :
                      'bg-purple-500/20 text-purple-300'
                    }`}>
                      {action.status}
                    </span>
                  </div>
                  <p className="text-surface-300 leading-relaxed">{action.recommendedAction}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-[10px] text-surface-400">Impact: {action.estimatedImpact?.slice(0, 45)}...</span>
                    <div className="flex gap-1.5">
                      {action.status === 'Recommended' && (
                        <button
                          onClick={() => handleUpdateActionStatus(action._id, 'Planned')}
                          className="px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded text-[10px] font-bold"
                        >
                          Plan Work
                        </button>
                      )}
                      {action.status === 'Planned' && (
                        <button
                          onClick={() => handleUpdateActionStatus(action._id, 'Dispatched')}
                          className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-[10px] font-bold"
                        >
                          Dispatch Crew
                        </button>
                      )}
                      {action.status === 'Dispatched' && (
                        <button
                          onClick={() => handleUpdateActionStatus(action._id, 'Completed')}
                          className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-[10px] font-bold"
                        >
                          Mark Completed
                        </button>
                      )}
                      {action.status !== 'Dismissed' && action.status !== 'Completed' && (
                        <button
                          onClick={() => handleUpdateActionStatus(action._id, 'Dismissed')}
                          className="px-2 py-1 bg-surface-800 hover:bg-red-500/20 text-surface-400 hover:text-red-300 rounded text-[10px]"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. GEOGRAPHIC HOTSPOTS TABLE & DEPARTMENT DEMAND */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HOTSPOTS */}
        <div className="p-6 rounded-3xl bg-[#161b22] border border-surface-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin size={18} className="text-red-400" /> Geographic Hazard Hotspots
            </h2>
            <span className="text-xs text-surface-400">{hotspots.length} Clusters</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-surface-400 uppercase border-b border-surface-800">
                <tr>
                  <th className="pb-2.5">Category</th>
                  <th className="pb-2.5 text-center">Incidents</th>
                  <th className="pb-2.5 text-center">Risk Score</th>
                  <th className="pb-2.5 text-center">Trend</th>
                  <th className="pb-2.5 text-right">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/50">
                {hotspots.map((h, i) => (
                  <tr key={i} className="hover:bg-surface-800/30">
                    <td className="py-2.5 font-bold text-white">
                      {h.dominantCategory}
                      <span className="block text-[10px] text-surface-500 font-normal font-mono">{h.latitude}, {h.longitude}</span>
                    </td>
                    <td className="py-2.5 text-center text-surface-300">{h.complaintCount}</td>
                    <td className="py-2.5 text-center font-bold text-white">{h.riskScore}</td>
                    <td className="py-2.5 text-center text-purple-300">{h.trend}</td>
                    <td className="py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.riskLevel === 'Critical' ? 'bg-red-500/20 text-red-300' :
                        h.riskLevel === 'High' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {h.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DEPARTMENT DEMAND FORECAST */}
        <div className="p-6 rounded-3xl bg-[#161b22] border border-surface-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 size={18} className="text-amber-400" /> Department Demand &amp; Workforce Strain
            </h2>
            <span className="text-xs text-surface-400">{deptForecasts.length} Departments</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-surface-400 uppercase border-b border-surface-800">
                <tr>
                  <th className="pb-2.5">Department</th>
                  <th className="pb-2.5 text-center">Active</th>
                  <th className="pb-2.5 text-center">7d Demand</th>
                  <th className="pb-2.5 text-center">Workers</th>
                  <th className="pb-2.5 text-right">Capacity Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/50">
                {deptForecasts.map((d, i) => (
                  <tr key={i} className="hover:bg-surface-800/30">
                    <td className="py-2.5 font-bold text-white">{d.department}</td>
                    <td className="py-2.5 text-center text-surface-300">{d.activeComplaints}</td>
                    <td className="py-2.5 text-center font-bold text-amber-300">{d.predicted7DayDemand}</td>
                    <td className="py-2.5 text-center text-surface-300">{d.currentWorkers} (Req: {d.recommendedWorkers})</td>
                    <td className="py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.overloadRisk === 'Overloaded' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {d.overloadRisk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPredictionsPage;
