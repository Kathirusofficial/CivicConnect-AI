import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, TrendingUp, AlertTriangle, MapPin, Building2,
  Sparkles, RefreshCw, Layers, Users, Clock, ShieldAlert,
  ArrowUpRight, ArrowDownRight, CheckCircle2, ChevronRight,
  Flame, BarChart3, Activity, Info
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { predictiveAdminApi } from '../../services/adminApi';

const riskLevelColors = {
  Critical: 'bg-red-500/20 text-red-300 border-red-500/40 shadow-red-500/10 shadow-sm',
  'High Risk': 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  High: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  Busy: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  Medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  Normal: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl bg-surface-900/95 border border-surface-700/80 shadow-xl text-xs">
      {label && <p className="text-surface-400 mb-1 font-semibold">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value} complaints</p>
      ))}
    </div>
  );
};

export const AdminPredictiveIntelligencePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  const fetchPredictiveData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await predictiveAdminApi.getDashboard();
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load predictive data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPredictiveData();
  }, [fetchPredictiveData]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await predictiveAdminApi.recalculate();
      await fetchPredictiveData();
    } catch (err) {
      alert('Failed to recalculate predictive models.');
    } finally {
      setRecalculating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center animate-pulse">
          <BrainCircuit size={24} className="text-brand-400 animate-spin" />
        </div>
        <p className="text-surface-300 text-sm font-medium">Synthesizing municipal risk patterns &amp; historical trajectories...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const hotspots = data?.hotspots || [];
  const categoryTrends = data?.categoryTrends || [];
  const departmentRisks = data?.departmentRisks || [];
  const emergingIssues = data?.emergingIssues || [];
  const forecast = data?.forecast || {};

  // Category comparison chart data
  const chartData = categoryTrends.map(t => ({
    category: t.name,
    Current: t.complaintCount,
    Previous: t.previousCount || 0
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-brand-600 to-accent-violet text-white shadow-glow">
              <BrainCircuit size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                AI Civic Risk &amp; Predictive Planning
              </h1>
              <p className="text-surface-400 text-xs mt-0.5">
                Proactive municipal risk modeling, geographic hotspot clustering &amp; operational capacity forecasting
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-violet hover:opacity-95 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-glow disabled:opacity-50"
          >
            <RefreshCw size={13} className={recalculating ? 'animate-spin' : ''} />
            {recalculating ? 'Analyzing City Data...' : 'Recalculate Predictive Models'}
          </button>
        </div>
      </div>

      {/* 1. Civic Risk Overview KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="p-4 rounded-2xl bg-surface-900/80 border border-red-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400 font-medium">Critical Risk Hotspots</span>
            <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400"><MapPin size={15} /></div>
          </div>
          <p className="text-3xl font-extrabold text-red-300">{summary.highRiskHotspotsCount ?? 0}</p>
          <p className="text-[11px] text-surface-400 mt-1">Geographic clusters requiring immediate field review</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-4 rounded-2xl bg-surface-900/80 border border-orange-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400 font-medium">Emerging Civic Spikes</span>
            <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400"><TrendingUp size={15} /></div>
          </div>
          <p className="text-3xl font-extrabold text-orange-300">{summary.emergingIssuesCount ?? 0}</p>
          <p className="text-[11px] text-surface-400 mt-1">Rapid velocity spikes in the last 7 days</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="p-4 rounded-2xl bg-surface-900/80 border border-yellow-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400 font-medium">Departments Under Strain</span>
            <div className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400"><Building2 size={15} /></div>
          </div>
          <p className="text-3xl font-extrabold text-yellow-300">{summary.departmentsAtRiskCount ?? 0}</p>
          <p className="text-[11px] text-surface-400 mt-1">Departments with high backlog-to-worker ratios</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="p-4 rounded-2xl bg-surface-900/80 border border-brand-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-surface-400 font-medium">Fastest Growing Category</span>
            <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400"><Flame size={15} /></div>
          </div>
          <p className="text-lg font-bold text-white truncate">{summary.fastestGrowingCategory || 'Stable'}</p>
          <p className="text-[11px] text-surface-400 mt-1">Leading accelerating municipal grievance category</p>
        </motion.div>
      </div>

      {/* 2. Emerging Civic Issues Banner (if any) */}
      {emergingIssues.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-gradient-to-r from-orange-950/40 via-surface-900/80 to-surface-900/80 border border-orange-500/30 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle size={15} className="text-orange-400" /> Emerging Civic Risks Detected
              </h2>
            </div>
            <span className="text-[11px] text-orange-300 font-semibold bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">
              {emergingIssues.length} active velocity spike{emergingIssues.length > 1 ? 's' : ''} (7-Day Velocity)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {emergingIssues.map((e, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs">{e.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${riskLevelColors[e.riskLevel] || 'text-surface-300'}`}>
                      {e.riskLevel}
                    </span>
                  </div>
                  <p className="text-surface-300 text-xs leading-relaxed">{e.explanation}</p>
                </div>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-orange-300 font-semibold flex items-center gap-1">
                    <TrendingUp size={12} /> {e.growthPercentage >= 0 ? '+' : ''}{e.growthPercentage}% weekly
                  </span>
                  <span className="text-surface-400">{e.complaintCount} reports this week</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 3. High-Risk Civic Hotspots Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden bg-surface-900/70 border border-white/5">
        <div className="p-5 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin size={17} className="text-brand-400" /> Geographic Civic Hotspots &amp; Spatial Risk
            </h2>
            <p className="text-surface-400 text-xs mt-0.5">
              Spatial clustering (500m radius) analyzing complaint frequency, trend velocity, severity, and duplicate clusters
            </p>
          </div>
          <span className="text-xs text-surface-400">{hotspots.length} detected cluster{hotspots.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                {['Hotspot Location', 'Dominant Category', 'Complaints', 'Trend Growth', 'Unresolved', 'Citizen Impact', 'Risk Score', 'Risk Level', 'Preventive Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {hotspots.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-surface-400">
                    No geographic civic hotspots detected in the current analysis window.
                  </td>
                </tr>
              ) : (
                hotspots.map((h, i) => (
                  <tr key={i} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-xs font-semibold text-white max-w-[200px] truncate">
                      📍 {h.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-300 whitespace-nowrap">
                      {h.category}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-white whitespace-nowrap">
                      {h.complaintCount}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">
                      <span className={h.growthPercentage > 0 ? 'text-orange-400' : 'text-emerald-400'}>
                        {h.growthPercentage >= 0 ? '+' : ''}{h.growthPercentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-yellow-300 font-medium whitespace-nowrap">
                      {h.unresolvedCount} active
                    </td>
                    <td className="px-4 py-3 text-xs text-violet-300 font-medium whitespace-nowrap">
                      <span className="flex items-center gap-1"><Users size={11} /> {h.citizenImpact} citizens</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-white whitespace-nowrap">
                      {h.riskScore} <span className="text-surface-500 font-normal">/ 100</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${riskLevelColors[h.riskLevel] || 'text-surface-300'}`}>
                        {h.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-300 max-w-[240px] truncate">
                      {h.recommendedAction}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* 4. Category Trends Chart & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-surface-900/70 border border-white/5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <BarChart3 size={17} className="text-brand-400" /> Category Velocity Comparison
            </h2>
            <p className="text-surface-400 text-xs mb-4">
              Current period vs. previous period complaint volume by category
            </p>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={50} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <Bar dataKey="Previous" fill="#64748b" radius={[4, 4, 0, 0]} name="Previous Period" />
                <Bar dataKey="Current" fill="#a855f7" radius={[4, 4, 0, 0]} name="Current Period" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* 5. Statistical Forecast Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-surface-900/70 border border-brand-500/20 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles size={17} className="text-brand-400" /> Trend-Based Municipal Volume Forecast
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/40">
                Statistical Trend
              </span>
            </div>
            <p className="text-surface-400 text-xs">
              Rolling moving-average velocity projection based on current historical rate
            </p>
          </div>

          {forecast.isSufficient ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[11px] text-surface-400 block mb-1">Next 7-Day Forecast</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">~{forecast.projected7DayVolume}</span>
                    <span className="text-xs text-surface-400">complaints</span>
                  </div>
                  <span className="text-[10px] text-surface-500 mt-1 block">Current 7-day: {forecast.current7DayVolume}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[11px] text-surface-400 block mb-1">Next 30-Day Forecast</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-brand-300">~{forecast.projected30DayVolume}</span>
                    <span className="text-xs text-surface-400">complaints</span>
                  </div>
                  <span className="text-[10px] text-surface-500 mt-1 block">Current 30-day: {forecast.current30DayVolume}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs">
                <p className="text-brand-200 leading-relaxed font-medium">
                  {forecast.message}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-white/5 border border-white/5 text-center space-y-2">
              <Info size={24} className="text-surface-400 mx-auto" />
              <p className="text-white font-semibold text-sm">Insufficient Historical Data</p>
              <p className="text-surface-400 text-xs">
                Statistical trend forecast requires at least 3 historical complaint records in the current window.
              </p>
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-surface-950/60 border border-white/5 flex items-start gap-2 text-[11px] text-surface-400">
            <Info size={14} className="text-surface-400 shrink-0 mt-0.5" />
            <span>
              <strong>Predictive Disclaimer:</strong> Projections represent mathematical statistical trajectories based on historical report patterns and do not claim guaranteed future events.
            </span>
          </div>
        </motion.div>
      </div>

      {/* 6. Department Workload Risks & Capacity Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden bg-surface-900/70 border border-white/5">
        <div className="p-5 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 size={17} className="text-brand-400" /> Department Capacity &amp; Operational Risk
            </h2>
            <p className="text-surface-400 text-xs mt-0.5">
              Workload strain analysis comparing active complaint backlog against available municipal workforce
            </p>
          </div>
          <span className="text-xs text-surface-400">{departmentRisks.length} departments evaluated</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                {['Department', 'Active Backlog', 'Critical Issues', 'Available Workers', 'Busy Workers', 'Workload Ratio', 'Avg Resolution Time', 'Risk Level', 'Recommendation'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-surface-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {departmentRisks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-surface-400">
                    No department capacity records found.
                  </td>
                </tr>
              ) : (
                departmentRisks.map((d, i) => (
                  <tr key={i} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-xs font-semibold text-white whitespace-nowrap">
                      🏢 {d.name}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-white whitespace-nowrap">
                      {d.activeComplaintCount}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className={d.criticalActive > 0 ? 'text-red-400 font-bold' : 'text-surface-400'}>
                        {d.criticalActive}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-emerald-400 font-semibold whitespace-nowrap">
                      {d.availableWorkers}
                    </td>
                    <td className="px-4 py-3 text-xs text-orange-400 font-semibold whitespace-nowrap">
                      {d.busyWorkers}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-white whitespace-nowrap">
                      {d.loadRatio}:1
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-300 whitespace-nowrap">
                      {d.avgResolutionHours}h
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${riskLevelColors[d.riskLevel] || 'text-surface-300'}`}>
                        {d.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-surface-300 max-w-[240px] truncate">
                      {d.recommendedAction}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* 7. Preventive Recommendations Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-2xl bg-surface-900/70 border border-white/5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 size={17} className="text-emerald-400" /> Actionable Preventive Municipal Recommendations
          </h2>
          <p className="text-surface-400 text-xs mt-0.5">
            System-generated operational interventions to mitigate upcoming civic risks before escalation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categoryTrends.filter(t => t.growthPercentage > 0).slice(0, 3).map((t, idx) => (
            <div key={`cat-${idx}`} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2.5">
              <span className="text-base mt-0.5">🛠️</span>
              <div>
                <p className="text-xs font-bold text-white">{t.name} Mitigation</p>
                <p className="text-surface-300 text-xs mt-1 leading-relaxed">{t.recommendedAction}</p>
              </div>
            </div>
          ))}

          {hotspots.slice(0, 3).map((h, idx) => (
            <div key={`hot-${idx}`} className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2.5">
              <span className="text-base mt-0.5">📍</span>
              <div>
                <p className="text-xs font-bold text-white">{h.name} Hotspot</p>
                <p className="text-surface-300 text-xs mt-1 leading-relaxed">{h.recommendedAction}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
