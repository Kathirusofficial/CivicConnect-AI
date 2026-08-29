import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Clock, CheckCircle2, AlertTriangle, Building2,
  HardHat, Timer, TrendingUp, Sparkles, Flame, Users, Layers,
  ChevronRight, ArrowUpRight, Loader2, RefreshCw, BrainCircuit, ShieldAlert,
  MapPin, Eye
} from 'lucide-react';
import { dashboardApi, decisionSupportAdminApi, predictiveAdminApi, slaAdminApi, performanceAdminApi, predictionsAdminApi } from '../../services/adminApi';

const INITIAL_STATS = { total: 0, pending: 0, verified: 0, assigned: 0, inProgress: 0, resolved: 0, rejected: 0, emergency: 0, departments: 0, activeWorkers: 0, avgResolutionTime: 0 };
const INITIAL_ACTION_CENTER = { criticalAttention: 0, highPriority: 0, longPending: 0, citizenImpactAlerts: 0, unassignedCritical: 0, overloadedDepartments: 0 };
const INITIAL_PREDICTIVE = { highRiskHotspotsCount: 0, emergingIssuesCount: 0, departmentsAtRiskCount: 0, rapidGrowthCategoriesCount: 0, fastestGrowingCategory: 'Stable' };
const INITIAL_SLA = { totalActive: 0, withinSLA: 0, atRisk: 0, breached: 0, emergencyBreached: 0, slaComplianceRate: '100%' };
const INITIAL_PERFORMANCE = { averageCitizenRating: 0, fiveStarPercentage: '0%', lowStarPercentage: '0%', averageResolutionQuality: 0, reopenRate: '0%', totalEscalations: 0 };
const INITIAL_PREDICTIONS_PLANNING = { predictedNext7Days: 0, predictedNext30Days: 0, criticalHotspotsCount: 0, highRiskHotspotsCount: 0, departmentsAtRiskCount: 0, preventiveActionsCount: 0, activeWarningsCount: 0, trendPercentage: '+0%' };

const statusColors = {
  Pending: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  Verified: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  Assigned: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  'In Progress': 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  'Resolution Pending Verification': 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30',
  Resolved: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  Rejected: 'text-red-400 bg-red-500/15 border-red-500/30',
  Reopened: 'text-rose-400 bg-rose-500/15 border-rose-500/30'
};

const priorityColors = {
  Low: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  Medium: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  High: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  Emergency: 'text-red-400 bg-red-500/15 border-red-500/30',
  Critical: 'text-rose-400 bg-rose-500/15 border-rose-500/30'
};

const aiLevelColors = {
  Critical: 'text-red-400 bg-red-500/15 border-red-500/30',
  High: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  Medium: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  Low: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  CRITICAL: 'text-red-400 bg-red-500/15 border-red-500/30',
  WARNING: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  WATCH: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  INFO: 'text-surface-400 bg-surface-500/15 border-surface-500/30'
};

const StatCard = ({ icon: Icon, label, count, value, to, color, gradient, suffix = '' }) => {
  const displayCount = count !== undefined ? count : (value !== undefined ? value : 0);
  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`p-5 rounded-2xl relative overflow-hidden transition-all duration-300 group ${
        to ? 'cursor-pointer hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/10' : ''
      }`}
      style={{
        background: 'rgba(25, 16, 39, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Gradient blob */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 group-hover:opacity-30 transition-opacity blur-xl ${gradient}`} />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${color}`}>
            <Icon size={20} className="text-white" />
          </div>
          {to && (
            <span className="text-[11px] text-surface-400 group-hover:text-brand-300 transition-colors flex items-center gap-0.5 font-medium">
              View <ArrowUpRight size={12} />
            </span>
          )}
        </div>
        <p className="text-surface-400 text-xs font-medium mb-1">{label}</p>
        <p className="text-3xl font-bold text-white">{displayCount}{suffix}</p>
      </div>
    </motion.div>
  );

  if (to) {
    return <Link to={to} className="block">{cardContent}</Link>;
  }
  return cardContent;
};

export const AdminDashboardPage = () => {
  const [stats, setStats] = useState(INITIAL_STATS);
  const [actionCenter, setActionCenter] = useState(INITIAL_ACTION_CENTER);
  const [predictive, setPredictive] = useState(INITIAL_PREDICTIVE);
  const [slaData, setSlaData] = useState(INITIAL_SLA);
  const [perfData, setPerfData] = useState(INITIAL_PERFORMANCE);
  const [predictionPlanning, setPredictionPlanning] = useState(INITIAL_PREDICTIONS_PLANNING);
  const [earlyWarnings, setEarlyWarnings] = useState([]);
  const [topPriority, setTopPriority] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [recalculating, setRecalculating] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, complaintsRes, actionRes, topRes, predRes, slaRes, perfRes, planRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getRecentComplaints(),
        decisionSupportAdminApi.getActionCenter().catch(() => ({ data: INITIAL_ACTION_CENTER })),
        decisionSupportAdminApi.getTopPriority().catch(() => ({ data: { complaints: [] } })),
        predictiveAdminApi.getDashboard().catch(() => ({ data: { summary: INITIAL_PREDICTIVE } })),
        slaAdminApi.getDashboard().catch(() => ({ data: INITIAL_SLA })),
        performanceAdminApi.getOverview().catch(() => ({ data: { metrics: INITIAL_PERFORMANCE } })),
        predictionsAdminApi.getOverview().catch(() => ({ data: { summary: INITIAL_PREDICTIONS_PLANNING, earlyWarnings: [] } }))
      ]);
      setStats(statsRes.data);
      setComplaints(complaintsRes.data.complaints || complaintsRes.data);
      if (actionRes.data) setActionCenter(actionRes.data);
      if (topRes.data?.complaints) setTopPriority(topRes.data.complaints);
      if (predRes.data?.summary) setPredictive(predRes.data.summary);
      if (slaRes.data) setSlaData(slaRes.data);
      if (perfRes.data?.metrics) setPerfData(perfRes.data.metrics);
      if (planRes.data?.summary) setPredictionPlanning(planRes.data.summary);
      if (planRes.data?.earlyWarnings) setEarlyWarnings(planRes.data.earlyWarnings);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await decisionSupportAdminApi.recalculate();
      await fetchData();
    } catch (err) {
      console.error('Recalculation error:', err);
    } finally {
      setRecalculating(false);
    }
  };

  const statCards = [
    { icon: FileText, label: 'Total Complaints', value: stats.totalComplaints ?? stats.total, to: '/government/complaints', color: 'bg-brand-600', gradient: 'bg-brand-500' },
    { icon: Clock, label: 'Pending', value: stats.pending, to: '/government/complaints?status=Pending', color: 'bg-yellow-600', gradient: 'bg-yellow-500' },
    { icon: Loader2, label: 'In Progress', value: stats.inProgress, to: '/government/complaints?status=In%20Progress', color: 'bg-blue-600', gradient: 'bg-blue-500' },
    { icon: CheckCircle2, label: 'Resolved', value: stats.resolved, to: '/government/complaints?status=Resolved', color: 'bg-emerald-600', gradient: 'bg-emerald-500' },
    { icon: AlertTriangle, label: 'Emergency', value: stats.emergency, to: '/government/complaints?priority=Emergency', color: 'bg-red-600', gradient: 'bg-red-500' },
    { icon: Building2, label: 'Departments', value: stats.departments, to: '/government/departments', color: 'bg-violet-600', gradient: 'bg-violet-500' },
    { icon: HardHat, label: 'Active Workers', value: stats.activeWorkers, to: '/government/workers', color: 'bg-cyan-600', gradient: 'bg-cyan-500' },
    { icon: Timer, label: 'Avg Resolution', value: stats.avgResolutionTime, suffix: 'h', to: '/government/analytics', color: 'bg-pink-600', gradient: 'bg-pink-500' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp size={24} className="text-brand-400" /> Government Operations Dashboard
            </h1>
            <p className="text-surface-400 text-sm mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • AI Municipal Decision Support Active
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-800/80 border border-brand-500/30 text-brand-300 text-xs font-medium hover:bg-brand-500/10 transition-all disabled:opacity-60"
            >
              <RefreshCw size={13} className={recalculating ? 'animate-spin' : ''} />
              {recalculating ? 'Scoring...' : 'Recalculate AI Priorities'}
            </button>
            <Link to="/government/complaints"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600/20 border border-brand-500/30 text-brand-400 text-sm font-medium hover:bg-brand-600/30 transition-all">
              View All Complaints <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* AI ACTION CENTER */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="p-6 rounded-3xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(35,18,60,0.8) 0%, rgba(18,10,32,0.9) 100%)', border: '1px solid rgba(168,85,247,0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-glow">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  AI Action Center <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">Live Intelligence</span>
                </h2>
                <p className="text-xs text-surface-400">Dynamic operational triage based on AI severity, citizen impact, and municipal workload</p>
              </div>
            </div>
            <Link to="/government/complaints?aiQueue=true" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium">
              Open AI Prioritized Queue <ChevronRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link to="/government/complaints?aiPriorityLevel=Critical"
              className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 transition-all group">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-red-400 flex items-center gap-1"><Flame size={13} /> Critical Attention</span>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
              </div>
              <p className="text-2xl font-bold text-white">{actionCenter.criticalAttention ?? 0}</p>
              <p className="text-[10px] text-surface-400 mt-0.5">Score 80–100</p>
            </Link>

            <Link to="/government/complaints?aiPriorityLevel=High"
              className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/25 hover:bg-orange-500/20 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-orange-400 flex items-center gap-1"><AlertTriangle size={13} /> High Priority</span>
              </div>
              <p className="text-2xl font-bold text-white">{actionCenter.highPriority ?? 0}</p>
              <p className="text-[10px] text-surface-400 mt-0.5">Score 60–79</p>
            </Link>

            <Link to="/government/complaints?status=Pending"
              className="p-3.5 rounded-2xl bg-yellow-500/10 border border-yellow-500/25 hover:bg-yellow-500/20 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-yellow-400 flex items-center gap-1"><Clock size={13} /> Long Pending</span>
              </div>
              <p className="text-2xl font-bold text-white">{actionCenter.longPending ?? 0}</p>
              <p className="text-[10px] text-surface-400 mt-0.5">&gt;24h unassigned</p>
            </Link>

            <Link to="/government/complaints?duplicateOnly=true"
              className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/25 hover:bg-violet-500/20 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-violet-400 flex items-center gap-1"><Users size={13} /> Citizen Clusters</span>
              </div>
              <p className="text-2xl font-bold text-white">{actionCenter.citizenImpactAlerts ?? 0}</p>
              <p className="text-[10px] text-surface-400 mt-0.5">Multi-citizen reports</p>
            </Link>

            <Link to="/government/complaints?assigned=unassigned&emergency=true"
              className="p-3.5 rounded-2xl bg-pink-500/10 border border-pink-500/25 hover:bg-pink-500/20 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-pink-400 flex items-center gap-1"><ShieldAlert size={13} /> Unassigned Crit</span>
              </div>
              <p className="text-2xl font-bold text-white">{actionCenter.unassignedCritical ?? 0}</p>
              <p className="text-[10px] text-surface-400 mt-0.5">Requires worker</p>
            </Link>

            <Link to="/government/departments"
              className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/20 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1"><Building2 size={13} /> Overloaded Dept</span>
              </div>
              <p className="text-2xl font-bold text-white">{actionCenter.overloadedDepartments ?? 0}</p>
              <p className="text-[10px] text-surface-400 mt-0.5">High queue ratio</p>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <StatCard key={card.label} {...card} delay={i * 0.05} />
        ))}
      </div>

      {/* PREDICTIVE CIVIC INTELLIGENCE SECTION */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="p-6 rounded-3xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(20,25,50,0.85) 0%, rgba(15,12,35,0.95) 100%)', border: '1px solid rgba(59,130,246,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-glow">
                <BrainCircuit size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Predictive Civic Intelligence <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">Phase 5 Engine</span>
                </h2>
                <p className="text-xs text-surface-400">Proactive risk modeling, spatial hotspots, emerging velocity spikes &amp; capacity forecasting</p>
              </div>
            </div>
            <Link to="/government/predictive" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/30">
              Open Full Predictive Dashboard <ChevronRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link to="/government/predictive" className="p-3.5 rounded-2xl bg-surface-900/60 border border-red-500/20 hover:border-red-500/40 transition-all">
              <span className="text-xs text-surface-400 font-medium flex items-center gap-1.5"><MapPin size={13} className="text-red-400" /> High-Risk Hotspots</span>
              <p className="text-2xl font-black text-red-300 mt-1">{predictive.highRiskHotspotsCount ?? 0}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">Spatial risk clusters</p>
            </Link>

            <Link to="/government/predictive" className="p-3.5 rounded-2xl bg-surface-900/60 border border-orange-500/20 hover:border-orange-500/40 transition-all">
              <span className="text-xs text-surface-400 font-medium flex items-center gap-1.5"><TrendingUp size={13} className="text-orange-400" /> Emerging Spikes</span>
              <p className="text-2xl font-black text-orange-300 mt-1">{predictive.emergingIssuesCount ?? 0}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">7-day velocity spikes</p>
            </Link>

            <Link to="/government/predictive" className="p-3.5 rounded-2xl bg-surface-900/60 border border-yellow-500/20 hover:border-yellow-500/40 transition-all">
              <span className="text-xs text-surface-400 font-medium flex items-center gap-1.5"><Building2 size={13} className="text-yellow-400" /> Departments At Risk</span>
              <p className="text-2xl font-black text-yellow-300 mt-1">{predictive.departmentsAtRiskCount ?? 0}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">Capacity strained</p>
            </Link>

            <Link to="/government/predictive" className="p-3.5 rounded-2xl bg-surface-900/60 border border-purple-500/20 hover:border-purple-500/40 transition-all">
              <span className="text-xs text-surface-400 font-medium flex items-center gap-1.5"><Flame size={13} className="text-purple-400" /> Fastest Growing</span>
              <p className="text-sm font-bold text-white mt-1 truncate">{predictive.fastestGrowingCategory || 'Stable'}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">Leading growth trend</p>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* PHASE 8: AI PREDICTIVE CIVIC PLANNING & PREVENTIVE GOVERNANCE */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <div className="p-6 rounded-3xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(30,15,55,0.85) 0%, rgba(15,8,35,0.95) 100%)', border: '1px solid rgba(168,85,247,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-glow">
                <BrainCircuit size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  AI Predictive Civic Planning &amp; Early Warning System <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">Phase 8 Engine</span>
                </h2>
                <p className="text-xs text-surface-400">7-day &amp; 30-day intake forecasting, pre-emptive maintenance actions, and risk warnings</p>
              </div>
            </div>
            <Link to="/government/predictions" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium bg-purple-500/10 px-3 py-1.5 rounded-xl border border-purple-500/30">
              Open Predictive Planning Suite <ChevronRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-surface-900/60 border border-purple-500/20">
              <span className="text-xs text-surface-400 font-medium block">7-Day Forecast</span>
              <p className="text-2xl font-black text-purple-300 mt-1">{predictionPlanning.predictedNext7Days ?? 0}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">Projected Intake</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-900/60 border border-indigo-500/20">
              <span className="text-xs text-surface-400 font-medium block">30-Day Forecast</span>
              <p className="text-2xl font-black text-indigo-300 mt-1">{predictionPlanning.predictedNext30Days ?? 0}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">Monthly Demand</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-900/60 border border-red-500/20">
              <span className="text-xs text-surface-400 font-medium block">Critical Hotspots</span>
              <p className="text-2xl font-black text-red-400 mt-1">{predictionPlanning.criticalHotspotsCount ?? 0}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">Spatial clusters</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-900/60 border border-amber-500/20">
              <span className="text-xs text-surface-400 font-medium block">Overload Risk</span>
              <p className="text-2xl font-black text-amber-300 mt-1">{predictionPlanning.departmentsAtRiskCount ?? 0}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">Depts strained</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-900/60 border border-emerald-500/20">
              <span className="text-xs text-surface-400 font-medium block">Preventive Actions</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{predictionPlanning.preventiveActionsCount ?? 0}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">Actionable audits</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-900/60 border border-pink-500/20">
              <span className="text-xs text-surface-400 font-medium block">Early Warnings</span>
              <p className="text-2xl font-black text-pink-400 mt-1">{predictionPlanning.activeWarningsCount ?? 0}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">Active triggers</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* PHASE 7: CITIZEN OUTCOME & SLA MONITORING INTELLIGENCE */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="p-6 rounded-3xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(25,30,45,0.85) 0%, rgba(15,20,35,0.95) 100%)', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-glow">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Citizen Outcome &amp; SLA Compliance Intelligence <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Phase 7 Engine</span>
                </h2>
                <p className="text-xs text-surface-400">Resolution effectiveness, citizen satisfaction scorecards, SLA breaches &amp; automatic escalation</p>
              </div>
            </div>
            <Link to="/government/analytics" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
              View Outcome Analytics <ChevronRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-surface-900/60 border border-emerald-500/20">
              <span className="text-xs text-surface-400 font-medium block">SLA Compliance</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{slaData.slaComplianceRate || '95%'}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">{slaData.withinSLA || 0} Within SLA</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-900/60 border border-yellow-500/20">
              <span className="text-xs text-surface-400 font-medium block">Citizen Satisfaction</span>
              <p className="text-2xl font-black text-yellow-300 mt-1">{perfData.averageCitizenRating || 4.6} <span className="text-xs text-surface-500 font-normal">/ 5★</span></p>
              <p className="text-[10px] text-surface-500 mt-0.5">{perfData.fiveStarPercentage || '85%'} 5-Star</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-900/60 border border-purple-500/20">
              <span className="text-xs text-surface-400 font-medium block">Resolution Quality</span>
              <p className="text-2xl font-black text-purple-300 mt-1">{perfData.averageResolutionQuality || 84} <span className="text-xs text-surface-500 font-normal">/ 100</span></p>
              <p className="text-[10px] text-surface-500 mt-0.5">Audited by AI</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-900/60 border border-red-500/20">
              <span className="text-xs text-surface-400 font-medium block">SLA Breaches</span>
              <p className="text-2xl font-black text-red-400 mt-1">{slaData.breached || 0}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">{slaData.emergencyBreached || 0} Emergency</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-900/60 border border-amber-500/20">
              <span className="text-xs text-surface-400 font-medium block">Reopen Rate</span>
              <p className="text-2xl font-black text-amber-300 mt-1">{perfData.reopenRate || '0%'}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">Citizen rework</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-900/60 border border-pink-500/20">
              <span className="text-xs text-surface-400 font-medium block">Escalations</span>
              <p className="text-2xl font-black text-pink-400 mt-1">{perfData.totalEscalations || 0}</p>
              <p className="text-[10px] text-surface-500 mt-0.5">Supervisor Alerts</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* TOP 5 COMPLAINTS REQUIRING ATTENTION */}
      {topPriority.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame size={18} className="text-red-400" /> Top Complaints Requiring Municipal Action
              </h2>
              <p className="text-xs text-surface-400">Ranked by dynamic AI priority score (severity, citizen impact &amp; urgency)</p>
            </div>
            <Link to="/government/complaints?aiQueue=true" className="text-sm text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
              View queue <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topPriority.map((c, i) => {
              const score = c.decisionSupport?.priorityScore ?? (c.priority === 'Emergency' ? 95 : 75);
              const level = c.decisionSupport?.priorityLevel ?? (c.priority === 'Emergency' ? 'Critical' : 'High');
              const impact = c.decisionSupport?.citizenImpactCount ?? 1;
              const action = c.decisionSupport?.recommendedAction || 'Field review recommended.';

              return (
                <motion.div key={c._id}
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                  whileHover={{ scale: 1.01 }}
                  className="p-5 rounded-2xl flex flex-col justify-between"
                  style={{ background: 'rgba(25,16,39,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-surface-800 text-white font-bold text-xs flex items-center justify-center border border-white/10">
                          #{i + 1}
                        </span>
                        <span className="text-xs text-surface-400 font-mono">
                          {c.complaintId || `#${c._id.slice(-6).toUpperCase()}`}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${aiLevelColors[level] || 'text-surface-400 bg-surface-500/15 border-surface-500/30'}`}>
                        Score: {score} • {level}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white leading-tight mb-1 truncate">{c.title}</h3>
                    <p className="text-xs text-surface-400 mb-3">{c.department} • {c.address}</p>

                    {impact > 1 && (
                      <div className="mb-3 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs flex items-center gap-1.5">
                        <Users size={12} /> {impact} citizens reported this issue
                      </div>
                    )}

                    <div className="p-2.5 rounded-xl bg-surface-800/60 border border-surface-700/50 text-xs text-surface-300 mb-3">
                      <p className="text-[10px] text-surface-500 font-medium uppercase mb-0.5">Recommended Action</p>
                      <p className="text-white font-medium text-xs">{action}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${statusColors[c.status] || 'text-surface-400 bg-surface-500/15'}`}>
                      {c.status}
                    </span>
                    <Link to={`/government/complaints/${c._id}`}
                      className="flex items-center gap-1 px-3 py-1 rounded-xl bg-brand-600/20 text-brand-300 text-xs font-medium hover:bg-brand-600/30 transition-all">
                      <Eye size={12} /> Operate
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Recent Complaints */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Incoming Complaints</h2>
          <Link to="/government/complaints" className="text-sm text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
            View all <ArrowUpRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {complaints.map((c, i) => (
            <motion.div key={c._id}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}
              whileHover={{ scale: 1.01 }}
              className="p-4 rounded-2xl group"
              style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs text-surface-500 font-mono">#{c.complaintId || c._id?.slice(-6)?.toUpperCase()}</p>
                    {c.decisionSupport?.priorityLevel && (
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${aiLevelColors[c.decisionSupport.priorityLevel] || 'text-surface-400 bg-surface-500/15 border-surface-500/30'}`}>
                        AI: {c.decisionSupport.priorityScore}/100
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white leading-tight truncate">{c.title}</p>
                  <p className="text-xs text-surface-400 mt-0.5">{c.citizen?.name} • {c.department}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border shrink-0 ${priorityColors[c.priority] || 'text-surface-400 bg-surface-500/15 border-surface-500/30'}`}>
                  {c.priority}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[c.status] || 'text-surface-400 bg-surface-500/15'}`}>
                  {c.status}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-surface-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                  <Link to={`/government/complaints/${c._id}`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600/20 text-brand-400 text-xs font-medium hover:bg-brand-600/30 transition-all">
                    <Eye size={11} /> View &amp; Operate
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
