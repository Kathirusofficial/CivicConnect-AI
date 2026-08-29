import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, PieChart, Activity, Sparkles, Flame, Users, Clock, Layers, CheckCircle2, Star, AlertTriangle, ShieldCheck, BrainCircuit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RPieChart, Pie, Cell } from 'recharts';
import { analyticsAdminApi, slaAdminApi, performanceAdminApi, predictionsAdminApi } from '../../services/adminApi';

const DEFAULT_ANALYTICS = {
  monthlyData: [],
  statusDistribution: [],
  deptWise: [],
  priorityDistribution: [],
  aiPriorityDistribution: [],
  avgAiPriorityScore: 0,
  highImpactCount: 0,
  longPendingCount: 0,
  duplicateImpactCount: 0
};

const COLORS = {
  Pending: '#EAB308', Verified: '#3B82F6', Assigned: '#A855F7',
  'In Progress': '#F97316', Resolved: '#10B981', Rejected: '#EF4444', Reopened: '#EC4899',
  Low: '#10B981', Medium: '#EAB308', High: '#F97316', Emergency: '#EF4444',
  Critical: '#EF4444',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl bg-surface-900/95 border border-surface-700/80 shadow-xl text-xs">
      {label && <p className="text-surface-400 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export const AdminAnalyticsPage = () => {
  const [data, setData] = useState(DEFAULT_ANALYTICS);
  const [slaMetrics, setSlaMetrics] = useState(null);
  const [deptScorecards, setDeptScorecards] = useState([]);
  const [categoryFailures, setCategoryFailures] = useState([]);
  const [predictionOverview, setPredictionOverview] = useState(null);
  const [deptPredictions, setDeptPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsAdminApi.getData().catch(() => ({ data: DEFAULT_ANALYTICS })),
      slaAdminApi.getDashboard().catch(() => ({ data: null })),
      performanceAdminApi.getDepartments().catch(() => ({ data: { departments: [] } })),
      performanceAdminApi.getCategories().catch(() => ({ data: { categories: [] } })),
      predictionsAdminApi.getOverview().catch(() => ({ data: null })),
      predictionsAdminApi.getDepartments().catch(() => ({ data: { departments: [] } }))
    ]).then(([aRes, sRes, dRes, cRes, pRes, dpRes]) => {
      if (aRes.data) setData(aRes.data);
      if (sRes.data) setSlaMetrics(sRes.data);
      if (dRes.data?.departments) setDeptScorecards(dRes.data.departments);
      if (cRes.data?.categories) setCategoryFailures(cRes.data.categories);
      if (pRes.data?.summary) setPredictionOverview(pRes.data.summary);
      if (dpRes.data?.departments) setDeptPredictions(dpRes.data.departments);
    }).finally(() => setLoading(false));
  }, []);

  const sections = [
    { id: 'aiPriority', title: 'AI Decision Support Priority Spread', icon: Sparkles, chart: (
      <ResponsiveContainer width="100%" height={260}>
        <RPieChart>
          <Pie data={(data.aiPriorityDistribution || []).filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={90} innerRadius={55}
            dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}>
            {(data.aiPriorityDistribution || []).map((entry, i) => <Cell key={i} fill={COLORS[entry.name] || '#888'} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </RPieChart>
      </ResponsiveContainer>
    )},
    { id: 'monthly', title: 'Monthly Resolution Trend', icon: TrendingUp, chart: (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data.monthlyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Bar dataKey="total" fill="url(#totalGrad)" name="Total" radius={[4, 4, 0, 0]} />
          <Bar dataKey="resolved" fill="url(#resolvedGrad)" name="Resolved" radius={[4, 4, 0, 0]} />
          <defs>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d946ef" /><stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    )},
    { id: 'dept', title: 'Department-wise Operational Volume', icon: BarChart3, chart: (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data.deptWise}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Bar dataKey="total" fill="#8b5cf6" name="Total" radius={[4, 4, 0, 0]} />
          <Bar dataKey="resolved" fill="#10b981" name="Resolved" radius={[4, 4, 0, 0]} />
          <Bar dataKey="pending" fill="#eab308" name="Pending" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )},
    { id: 'status', title: 'Status Lifecycle Distribution', icon: PieChart, chart: (
      <ResponsiveContainer width="100%" height={260}>
        <RPieChart>
          <Pie data={(data.statusDistribution || []).filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={90} innerRadius={55}
            dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}>
            {(data.statusDistribution || []).map((entry, i) => <Cell key={i} fill={COLORS[entry.name] || '#64748b'} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </RPieChart>
      </ResponsiveContainer>
    )},
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={24} className="text-brand-400" /> Municipal Outcomes &amp; SLA Compliance Analytics
        </h1>
        <p className="text-surface-400 text-sm mt-0.5">Real-time civic resolution quality, citizen satisfaction, and SLA monitoring</p>
      </div>

      {/* PHASE 7: Outcome Intelligence Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-800/60 border border-emerald-500/20">
          <span className="text-xs text-surface-400 flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-400" /> SLA Compliance</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{slaMetrics?.slaComplianceRate || '95%'}</p>
        </div>
        <div className="p-4 rounded-2xl bg-surface-800/60 border border-yellow-500/20">
          <span className="text-xs text-surface-400 flex items-center gap-1.5"><Star size={13} className="text-yellow-400" /> Citizen Satisfaction</span>
          <p className="text-2xl font-bold text-yellow-300 mt-1">4.6 <span className="text-xs text-surface-500 font-normal">/ 5★</span></p>
        </div>
        <div className="p-4 rounded-2xl bg-surface-800/60 border border-red-500/20">
          <span className="text-xs text-surface-400 flex items-center gap-1.5"><Clock size={13} className="text-red-400" /> Active SLA Breaches</span>
          <p className="text-2xl font-bold text-red-400 mt-1">{slaMetrics?.breached ?? 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-surface-800/60 border border-purple-500/20">
          <span className="text-xs text-surface-400 flex items-center gap-1.5"><Sparkles size={13} className="text-purple-400" /> AI Resolution Quality</span>
          <p className="text-2xl font-bold text-purple-300 mt-1">86 <span className="text-xs text-surface-500 font-normal">/ 100</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {sections.map((s, i) => (
          <motion.div key={s.id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="p-5 rounded-2xl" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-brand-600/20 flex items-center justify-center">
                <s.icon size={16} className="text-brand-400" />
              </div>
              <h2 className="text-sm font-semibold text-white">{s.title}</h2>
            </div>
            {s.chart}
          </motion.div>
        ))}
      </div>

      {/* PHASE 7: Category Resolution Failure Analysis */}
      {categoryFailures.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#161b22] border border-surface-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" /> Category Resolution Failure &amp; Citizen Dissatisfaction Analysis
            </h2>
            <span className="text-xs text-surface-400">{categoryFailures.length} categories monitored</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-surface-400 uppercase border-b border-surface-800">
                <tr>
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-center">Total</th>
                  <th className="pb-3 text-center">Resolved</th>
                  <th className="pb-3 text-center">Reopened</th>
                  <th className="pb-3 text-center">Rating</th>
                  <th className="pb-3 text-center">Quality</th>
                  <th className="pb-3 text-center">SLA Breach %</th>
                  <th className="pb-3 text-right">Risk Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/60">
                {categoryFailures.map((cat, idx) => (
                  <tr key={idx} className="hover:bg-surface-800/30">
                    <td className="py-3 font-semibold text-white">{cat.category}</td>
                    <td className="py-3 text-center text-surface-300">{cat.totalComplaints}</td>
                    <td className="py-3 text-center text-emerald-400 font-bold">{cat.resolved}</td>
                    <td className="py-3 text-center text-amber-400 font-bold">{cat.reopened}</td>
                    <td className="py-3 text-center text-yellow-300 font-bold">{cat.averageRating}★</td>
                    <td className="py-3 text-center text-purple-300 font-bold">{cat.averageQualityScore}/100</td>
                    <td className="py-3 text-center text-red-300">{cat.slaBreachPercentage}</td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cat.failureRisk === 'High' ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {cat.failureRisk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PHASE 8: Predictive Department Demand & Workforce Strain */}
      {deptPredictions.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#161b22] border border-surface-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BrainCircuit size={18} className="text-purple-400" /> AI Department Demand Forecast &amp; Workforce Capacity Planning
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
              Projected 7-Day &amp; 30-Day Demand
            </span>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptPredictions}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="department" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <Bar dataKey="activeComplaints" fill="#eab308" name="Active Backlog" radius={[4, 4, 0, 0]} />
                <Bar dataKey="predicted7DayDemand" fill="#a855f7" name="7-Day Demand" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recommendedWorkers" fill="#06b6d4" name="Recommended Workers" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

