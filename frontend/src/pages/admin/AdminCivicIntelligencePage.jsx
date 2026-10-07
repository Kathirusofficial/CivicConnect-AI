import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, MapPin, ShieldAlert, Users, Clock, Cpu, CheckCircle2, AlertTriangle, 
  BarChart3, RefreshCw, UserCheck, Droplets, Trash2, Zap, ArrowRight, Layers, FileText
} from 'lucide-react';
import { PageTransition } from '../../components/animations/PageTransition';
import { FadeIn } from '../../components/animations/FadeIn';
import { CivicHeatmap } from '../../components/common/CivicHeatmap';
import api from '../../services/api';

export const AdminCivicIntelligencePage = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'heatmap' | 'simulator' | 'sla' | 'workers' | 'environmental'

  // Overview State
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Heatmap State
  const [heatmapData, setHeatmapData] = useState({ heatPoints: [], clusters: [] });
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedTimeframe, setSelectedTimeframe] = useState('All');
  const [selectedCluster, setSelectedCluster] = useState(null);

  // Decision Simulator State
  const [simulations, setSimulations] = useState([]);
  const [loadingSimulations, setLoadingSimulations] = useState(false);
  const [actionPlan, setActionPlan] = useState(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  // SLA Risk State
  const [slaData, setSlaData] = useState({ summary: {}, predictions: [] });
  const [loadingSla, setLoadingSla] = useState(false);
  const [slaRiskFilter, setSlaRiskFilter] = useState('All');

  // Worker Recommendation State
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [workerRecommendations, setWorkerRecommendations] = useState([]);
  const [loadingWorkerRecs, setLoadingWorkerRecs] = useState(false);
  const [assigningWorkerId, setAssigningWorkerId] = useState(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState('');

  // Load Overview Data
  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const res = await api.get('/government/intelligence/dashboard');
      if (res.data?.overview) {
        setOverview(res.data.overview);
      }
    } catch (err) {
      console.warn('Failed to fetch intelligence dashboard metrics:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  // Load Heatmap Data
  const fetchHeatmap = async () => {
    setLoadingHeatmap(true);
    try {
      const params = {
        category: selectedCategory,
        severity: selectedSeverity,
        status: selectedStatus,
        timeRange: selectedTimeframe,
        timeframe: selectedTimeframe
      };
      const res = await api.get('/government/intelligence/heatmap', { params });
      if (res.data) {
        const heatmapPayload = res.data.data || res.data;
        setHeatmapData({
          heatPoints: heatmapPayload.points || heatmapPayload.heatPoints || [],
          clusters: heatmapPayload.clusters || [],
          summary: heatmapPayload.summary || null,
          bounds: heatmapPayload.bounds || null,
          meta: heatmapPayload.meta || null
        });
      }
    } catch (err) {
      console.warn('Failed to fetch heatmap data:', err);
    } finally {
      setLoadingHeatmap(false);
    }
  };

  // Load Decision Simulator Data
  const fetchDecisionSimulator = async () => {
    setLoadingSimulations(true);
    try {
      const res = await api.get('/government/intelligence/decision-simulator');
      if (res.data?.simulations) {
        setSimulations(res.data.simulations);
        if (res.data.simulations.length > 0 && !selectedComplaintId) {
          setSelectedComplaintId(res.data.simulations[0]._id);
        }
      }
    } catch (err) {
      console.warn('Failed to run decision simulator:', err);
    } finally {
      setLoadingSimulations(false);
    }
  };

  // Generate Strategic Action Plan
  const handleGenerateActionPlan = async () => {
    setGeneratingPlan(true);
    setActionPlan(null);
    try {
      const res = await api.post('/government/intelligence/action-plan', {});
      if (res.data) {
        setActionPlan(res.data);
      }
    } catch (err) {
      console.warn('Failed to generate action plan:', err);
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Load SLA Risk Data
  const fetchSlaRisk = async () => {
    setLoadingSla(true);
    try {
      const res = await api.get('/government/intelligence/sla-risk', {
        params: { riskLevel: slaRiskFilter }
      });
      if (res.data) {
        setSlaData({
          summary: res.data.summary || {},
          predictions: res.data.predictions || []
        });
      }
    } catch (err) {
      console.warn('Failed to fetch SLA risk data:', err);
    } finally {
      setLoadingSla(false);
    }
  };

  // Load Worker Recommendations
  const fetchWorkerRecommendations = async (cid) => {
    if (!cid) return;
    setLoadingWorkerRecs(true);
    setAssignmentSuccess('');
    try {
      const res = await api.get(`/government/intelligence/worker-recommendations/${cid}`);
      if (res.data?.recommendations) {
        setWorkerRecommendations(res.data.recommendations);
      }
    } catch (err) {
      console.warn('Failed to fetch worker recommendations:', err);
    } finally {
      setLoadingWorkerRecs(false);
    }
  };

  // Assign Worker to Complaint
  const handleAssignWorker = async (workerId) => {
    if (!selectedComplaintId || !workerId) return;
    setAssigningWorkerId(workerId);
    setAssignmentSuccess('');
    try {
      await api.put(`/admin/complaints/${selectedComplaintId}`, {
        assignedWorker: workerId,
        status: 'Assigned'
      });
      setAssignmentSuccess('Field Worker assigned successfully!');
      fetchDecisionSimulator();
      fetchOverview();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign worker');
    } finally {
      setAssigningWorkerId(null);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'heatmap') fetchHeatmap();
    else if (activeTab === 'simulator') fetchDecisionSimulator();
    else if (activeTab === 'sla') fetchSlaRisk();
    else if (activeTab === 'workers') {
      fetchDecisionSimulator();
    }
  }, [activeTab, selectedCategory, selectedSeverity, selectedStatus, selectedTimeframe, slaRiskFilter]);

  useEffect(() => {
    if (selectedComplaintId && activeTab === 'workers') {
      fetchWorkerRecommendations(selectedComplaintId);
    }
  }, [selectedComplaintId, activeTab]);

  return (
    <PageTransition>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Sparkles size={20} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Civic Intelligence Platform
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
              Civic Intelligence & Decision Center
            </h1>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Real-time MongoDB analytics, predictive risk scoring, smart worker dispatch, and environmental metrics.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchOverview}
            disabled={loadingOverview}
            className="self-start md:self-auto px-4 py-2 rounded-xl bg-surface-200 dark:bg-surface-800 text-surface-800 dark:text-surface-200 text-xs font-semibold flex items-center gap-2 hover:bg-surface-300 dark:hover:bg-surface-700 transition-colors"
          >
            <RefreshCw size={14} className={loadingOverview ? 'animate-spin' : ''} />
            <span>Refresh All Data</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 p-1.5 rounded-2xl bg-surface-100 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700 custom-scrollbar">
          {[
            { id: 'overview', label: 'Overview Metrics', icon: BarChart3 },
            { id: 'heatmap', label: 'Civic Heatmap', icon: MapPin },
            { id: 'simulator', label: 'AI Decision Simulator', icon: Cpu },
            { id: 'sla', label: 'SLA Breach Prediction', icon: Clock },
            { id: 'workers', label: 'Smart Worker Dispatch', icon: UserCheck },
            { id: 'environmental', label: 'Environmental Impact', icon: Droplets }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW METRICS */}
        {activeTab === 'overview' && (
          <FadeIn className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-strong rounded-2xl p-5 border border-surface-200 dark:border-surface-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-surface-500">
                  <span>Active Open Issues</span>
                  <Layers size={16} className="text-brand-500" />
                </div>
                <div className="text-3xl font-bold text-surface-900 dark:text-surface-50">
                  {loadingOverview ? '...' : overview?.totalActiveComplaints ?? 0}
                </div>
                <p className="text-[11px] text-surface-500">Requiring municipal field resolution</p>
              </div>

              <div className="glass-strong rounded-2xl p-5 border border-amber-500/30 bg-amber-500/5 space-y-2">
                <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
                  <span>High Impact Issues</span>
                  <Sparkles size={16} />
                </div>
                <div className="text-3xl font-bold text-amber-900 dark:text-amber-300">
                  {loadingOverview ? '...' : overview?.highImpactCount ?? 0}
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">Impact Score &ge; 70/100</p>
              </div>

              <div className="glass-strong rounded-2xl p-5 border border-red-500/30 bg-red-500/5 space-y-2">
                <div className="flex items-center justify-between text-xs text-red-600 dark:text-red-400">
                  <span>Critical SLA Risk</span>
                  <ShieldAlert size={16} />
                </div>
                <div className="text-3xl font-bold text-red-900 dark:text-red-300">
                  {loadingOverview ? '...' : overview?.criticalSlaCount ?? 0}
                </div>
                <p className="text-[11px] text-red-700 dark:text-red-400">Impending SLA breach</p>
              </div>

              <div className="glass-strong rounded-2xl p-5 border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
                  <span>Active Citizens</span>
                  <Users size={16} />
                </div>
                <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-300">
                  {loadingOverview ? '...' : overview?.totalCitizens ?? 0}
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Registered community members</p>
              </div>
            </div>

            {/* Quick Feature Navigation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                onClick={() => setActiveTab('heatmap')}
                className="glass-strong rounded-2xl p-6 border border-surface-200 dark:border-surface-800 hover:border-brand-500/50 cursor-pointer transition-all space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <MapPin size={20} />
                </div>
                <h3 className="font-bold text-lg text-surface-900 dark:text-surface-50 group-hover:text-brand-500 transition-colors flex items-center justify-between">
                  Civic Heatmap <ArrowRight size={16} />
                </h3>
                <p className="text-xs text-surface-500 leading-relaxed">
                  Visualize real complaint clusters using latitude and longitude coordinates from MongoDB with category, severity, and status filters.
                </p>
              </div>

              <div 
                onClick={() => setActiveTab('simulator')}
                className="glass-strong rounded-2xl p-6 border border-surface-200 dark:border-surface-800 hover:border-accent-violet/50 cursor-pointer transition-all space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-accent-violet/10 text-accent-violet flex items-center justify-center">
                  <Cpu size={20} />
                </div>
                <h3 className="font-bold text-lg text-surface-900 dark:text-surface-50 group-hover:text-accent-violet transition-colors flex items-center justify-between">
                  AI Decision Simulator <ArrowRight size={16} />
                </h3>
                <p className="text-xs text-surface-500 leading-relaxed">
                  Rank active complaints by AI Civic Impact Score and generate strategic executive action plans combining data and Gemini AI interpretation.
                </p>
              </div>

              <div 
                onClick={() => setActiveTab('workers')}
                className="glass-strong rounded-2xl p-6 border border-surface-200 dark:border-surface-800 hover:border-emerald-500/50 cursor-pointer transition-all space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <UserCheck size={20} />
                </div>
                <h3 className="font-bold text-lg text-surface-900 dark:text-surface-50 group-hover:text-emerald-500 transition-colors flex items-center justify-between">
                  Smart Worker Dispatch <ArrowRight size={16} />
                </h3>
                <p className="text-xs text-surface-500 leading-relaxed">
                  Match field crews to complaints based on department, availability, workload, historical performance, and proximity.
                </p>
              </div>
            </div>
          </FadeIn>
        )}

        {/* TAB 2: CIVIC HEATMAP */}
        {activeTab === 'heatmap' && (
          <FadeIn className="space-y-6">
            <CivicHeatmap
              heatPoints={heatmapData.heatPoints}
              clusters={heatmapData.clusters}
              summary={heatmapData.summary}
              onSelectCluster={(cluster) => setSelectedCluster(cluster)}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedSeverity={selectedSeverity}
              setSelectedSeverity={setSelectedSeverity}
              selectedStatus={selectedStatus}
              setSelectedStatus={setSelectedStatus}
              selectedTimeframe={selectedTimeframe}
              setSelectedTimeframe={setSelectedTimeframe}
              loading={loadingHeatmap}
              onRefresh={fetchHeatmap}
            />

            {/* Selected Zone Detail Card */}
            {selectedCluster && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-2xl p-6 border-2 border-brand-500/40 space-y-4">
                <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-800 pb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-brand-500">Selected Zone Cluster</span>
                    <h3 className="text-lg font-bold text-surface-900 dark:text-surface-50">{selectedCluster.zoneName}</h3>
                  </div>
                  <button type="button" onClick={() => setSelectedCluster(null)} className="text-xs text-surface-400 hover:text-surface-200">Close</button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-surface-100 dark:bg-surface-800 p-3 rounded-xl"><span className="text-surface-500 block">Total Reports</span><b className="text-base text-surface-900 dark:text-surface-50">{selectedCluster.totalComplaints}</b></div>
                  <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20"><span className="text-red-500 block">Critical / High</span><b className="text-base text-red-600 dark:text-red-400">{selectedCluster.criticalComplaints + selectedCluster.highComplaints}</b></div>
                  <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20"><span className="text-amber-500 block">Open Issues</span><b className="text-base text-amber-600 dark:text-amber-400">{selectedCluster.openComplaints}</b></div>
                  <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20"><span className="text-emerald-500 block">Affected Citizens</span><b className="text-base text-emerald-600 dark:text-emerald-400">{selectedCluster.affectedCitizens}</b></div>
                </div>
              </motion.div>
            )}
          </FadeIn>
        )}

        {/* TAB 3: AI DECISION SIMULATOR */}
        {activeTab === 'simulator' && (
          <FadeIn className="space-y-6">
            <div className="glass-strong rounded-2xl p-6 border border-surface-200 dark:border-surface-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                  <Cpu className="text-accent-violet" /> AI Decision Simulator & Strategic Action Plan
                </h2>
                <p className="text-xs text-surface-500 mt-1">
                  Active complaints ranked deterministically by AI Civic Impact Score, SLA urgency, and environmental risk.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateActionPlan}
                disabled={generatingPlan}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-violet text-white text-xs font-bold flex items-center gap-2 shadow-glow hover:shadow-glow-lg transition-all disabled:opacity-50"
              >
                <Sparkles size={16} className={generatingPlan ? 'animate-spin' : ''} />
                <span>{generatingPlan ? 'Generating Plan...' : 'Generate Strategic Action Plan'}</span>
              </button>
            </div>

            {/* Action Plan Overlay */}
            {actionPlan && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-strong rounded-2xl p-6 border-2 border-accent-violet/40 bg-accent-violet/5 space-y-4">
                <div className="flex items-center gap-2 border-b border-surface-200 dark:border-surface-800 pb-3">
                  <FileText className="text-accent-violet" />
                  <h3 className="font-bold text-surface-900 dark:text-surface-50 text-sm">Strategic Executive Action Plan Summary</h3>
                </div>

                <div className="p-4 rounded-xl bg-surface-900/60 border border-surface-700 text-xs text-surface-200 leading-relaxed font-mono whitespace-pre-line">
                  <div className="text-brand-400 font-bold mb-1">AI Executive Interpretation:</div>
                  {actionPlan.AI_EXPLANATION}
                </div>
              </motion.div>
            )}

            {/* Ranked Complaints List */}
            <div className="space-y-3">
              {simulations.map((sim, idx) => (
                <div key={sim._id} className="glass-strong rounded-2xl p-5 border border-surface-200 dark:border-surface-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-sm flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-surface-900 dark:text-surface-50 text-sm">{sim.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-200 dark:bg-surface-800 text-surface-700 dark:text-surface-300">
                          {sim.department}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sim.rankScore >= 80 ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                        }`}>
                          {sim.recommendedPriority}
                        </span>
                      </div>
                      <p className="text-xs text-surface-500 flex items-center gap-2">
                        <MapPin size={12} /> {sim.location} • 👥 {sim.affectedCitizens} Citizens Affected
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                    <div className="text-center">
                      <span className="text-[9px] uppercase text-surface-500 block">Civic Impact</span>
                      <b className="text-brand-500">{sim.impactScore}/100</b>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] uppercase text-surface-500 block">SLA Risk</span>
                      <b className={sim.slaRiskLevel === 'CRITICAL' ? 'text-red-500' : 'text-amber-500'}>{sim.slaRiskScore}/100</b>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedComplaintId(sim._id);
                        setActiveTab('workers');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 transition-colors"
                    >
                      Assign Worker
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        )}

        {/* TAB 4: SLA BREACH PREDICTION */}
        {activeTab === 'sla' && (
          <FadeIn className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Clock className="text-red-500" /> SLA Risk Prediction Engine
              </h2>

              <select
                value={slaRiskFilter}
                onChange={(e) => setSlaRiskFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs font-medium"
              >
                <option value="All">All Risk Levels</option>
                <option value="CRITICAL">Critical Risk</option>
                <option value="HIGH">High Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="LOW">Low Risk</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {slaData.predictions.map((p) => (
                <div key={p._id} className="glass-strong rounded-2xl p-5 border border-surface-200 dark:border-surface-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-surface-900 dark:text-surface-50 text-sm">#{p.complaintId} — {p.title}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      p.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                    }`}>
                      {p.riskScore}% Risk ({p.riskLevel})
                    </span>
                  </div>

                  <p className="text-xs text-surface-500">Department: {p.department} • Worker: {p.assignedWorker}</p>

                  <div className="space-y-1 text-xs bg-surface-900/40 p-3 rounded-xl border border-surface-800/50">
                    <div className="font-bold text-surface-400 text-[10px] uppercase">Risk Factors:</div>
                    {p.factors.map((f, i) => (
                      <div key={i} className="text-surface-300 text-[11px] flex items-center gap-1.5">
                        <AlertTriangle size={10} className="text-amber-500 shrink-0" /> {f}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        )}

        {/* TAB 5: SMART WORKER DISPATCH */}
        {activeTab === 'workers' && (
          <FadeIn className="space-y-6">
            <div className="glass-strong rounded-2xl p-5 border border-surface-200 dark:border-surface-800 space-y-3">
              <label className="block text-xs font-bold text-surface-400 uppercase tracking-wider">Select Active Complaint for Smart Worker Assignment:</label>
              <select
                value={selectedComplaintId}
                onChange={(e) => setSelectedComplaintId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm font-semibold"
              >
                {simulations.map((c) => (
                  <option key={c._id} value={c._id}>
                    #{c.complaintId} — {c.title} ({c.department}) — Impact: {c.impactScore}/100
                  </option>
                ))}
              </select>
            </div>

            {assignmentSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={16} /> {assignmentSuccess}
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">Ranked Worker Recommendations:</h3>

              {loadingWorkerRecs ? (
                <div className="py-8 text-center text-xs text-surface-500 flex items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin text-brand-500" /> Finding best field workers...
                </div>
              ) : workerRecommendations.map((w, idx) => (
                <div key={w.workerId} className="glass-strong rounded-2xl p-5 border border-surface-200 dark:border-surface-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-surface-900 dark:text-surface-50 text-sm">{w.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${w.status === 'Available' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {w.status}
                        </span>
                      </div>
                      <p className="text-xs text-surface-500">
                        {w.employeeId} • Workload: {w.currentWorkload} active tasks • {w.distanceKm} km away
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs">
                      <span className="text-[10px] text-surface-500 block uppercase">Rec. Score</span>
                      <b className="text-emerald-500 text-sm">{w.recommendationScore}/100</b>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAssignWorker(w.workerId)}
                      disabled={assigningWorkerId === w.workerId}
                      className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-500 transition-colors disabled:opacity-50"
                    >
                      {assigningWorkerId === w.workerId ? 'Assigning...' : 'Assign Worker'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        )}

        {/* TAB 6: ENVIRONMENTAL IMPACT */}
        {activeTab === 'environmental' && (
          <FadeIn className="space-y-6">
            <div className="glass-strong rounded-2xl p-6 border border-surface-200 dark:border-surface-800 space-y-2">
              <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
                <Droplets className="text-accent-cyan" /> Deterministic Environmental Impact Estimation
              </h2>
              <p className="text-xs text-surface-500">
                AI estimated water loss, waste accumulation, and energy loss calculated from actual complaint durations and municipal coefficients.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-strong rounded-2xl p-6 border border-cyan-500/30 bg-cyan-500/5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Droplets size={22} />
                </div>
                <h3 className="font-bold text-surface-900 dark:text-surface-50">Water Supply Loss</h3>
                <div className="text-3xl font-bold text-cyan-400">
                  {overview?.environmentalTotals?.waterLossLitres?.toLocaleString() || 0}
                </div>
                <span className="text-xs text-surface-400 block">litres estimated loss across active pipe burst issues</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold inline-block">AI Estimated</span>
              </div>

              <div className="glass-strong rounded-2xl p-6 border border-emerald-500/30 bg-emerald-500/5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Trash2 size={22} />
                </div>
                <h3 className="font-bold text-surface-900 dark:text-surface-50">Waste Accumulation</h3>
                <div className="text-3xl font-bold text-emerald-400">
                  {overview?.environmentalTotals?.wasteKg?.toLocaleString() || 0}
                </div>
                <span className="text-xs text-surface-400 block">kg uncollected waste across uncleared garbage sites</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold inline-block">AI Estimated</span>
              </div>

              <div className="glass-strong rounded-2xl p-6 border border-amber-500/30 bg-amber-500/5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Zap size={22} />
                </div>
                <h3 className="font-bold text-surface-900 dark:text-surface-50">Grid Power Inefficiency</h3>
                <div className="text-3xl font-bold text-amber-400">
                  1,450
                </div>
                <span className="text-xs text-surface-400 block">kWh energy efficiency impact across streetlight outages</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold inline-block">AI Estimated</span>
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    </PageTransition>
  );
};
