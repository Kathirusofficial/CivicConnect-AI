import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, FileText, CheckCircle2, Clock, HardHat, ChevronRight, Zap, Droplets, Truck, TrafficCone, Trash2, Activity, Lightbulb, Globe, BrainCircuit, AlertTriangle, Sparkles, ArrowUpRight } from 'lucide-react';
import { departmentsAdminApi, predictionsAdminApi } from '../../services/adminApi';

const deptIcons = {
  'Water Supply': Droplets, 'Electricity': Zap, 'Road Department': Activity,
  'Traffic Management': TrafficCone, 'Garbage Collection': Trash2,
  'Drainage': Droplets, 'Street Lights': Lightbulb, 'Municipality': Globe,
};

const deptGradients = [
  'from-cyan-500/20 to-blue-500/20', 'from-yellow-500/20 to-orange-500/20',
  'from-slate-500/20 to-gray-500/20', 'from-red-500/20 to-pink-500/20',
  'from-green-500/20 to-emerald-500/20', 'from-indigo-500/20 to-violet-500/20',
  'from-amber-500/20 to-yellow-500/20', 'from-brand-500/20 to-violet-500/20',
];

export const getDepartmentSlug = (deptName) => {
  if (!deptName) return 'municipality';
  const map = {
    'Road Department': 'road',
    'Water Supply': 'water',
    'Electricity': 'electricity',
    'Garbage Collection': 'garbage',
    'Traffic Management': 'traffic',
    'Drainage': 'drainage',
    'Street Lights': 'street-lights',
    'Municipality': 'municipality'
  };
  return map[deptName] || deptName.toLowerCase().replace(/\s+/g, '-');
};

export const AdminDepartmentsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get('filter') || '');
  const [departments, setDepartments] = useState([]);
  const [predictionsMap, setPredictionsMap] = useState({});
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setFilter(searchParams.get('filter') || '');
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      departmentsAdminApi.getAll().catch(() => ({ data: [] })),
      predictionsAdminApi.getDepartments().catch(() => ({ data: { departments: [] } }))
    ]).then(([dRes, pRes]) => {
      if (Array.isArray(dRes.data)) setDepartments(dRes.data);
      if (pRes.data?.departments) {
        const map = {};
        pRes.data.departments.forEach(p => {
          map[p.department] = p;
        });
        setPredictionsMap(map);
      }
    }).finally(() => setLoading(false));
  }, []);

  const isDeptOverloaded = (dept) => {
    const pRisk = predictionsMap[dept.name]?.overloadRisk;
    if (pRisk === 'Overloaded') return true;
    if (dept.aiWorkload === 'Overloaded' || dept.aiWorkload === 'Critical') return true;
    const active = (dept.liveStats?.pending || 0) + (dept.liveStats?.inProgress || 0);
    return active >= 3;
  };

  const filteredDepartments = departments.filter(dept => {
    if (filter === 'overloaded') return isDeptOverloaded(dept);
    return true;
  });

  const handleCardClick = (dept) => {
    setSelectedDepartment(dept);
    const slug = getDepartmentSlug(dept.name);
    navigate(`/government/departments/${slug}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Department Management
            {filter === 'overloaded' && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold">
                ⚠️ Overloaded Departments Filter
              </span>
            )}
          </h1>
          <p className="text-surface-400 text-sm mt-0.5">Click any department card to manage complaints and execute resolutions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFilter(''); setSearchParams({}); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              !filter ? 'bg-brand-600 text-white shadow-md' : 'bg-surface-800/80 text-surface-400 border border-surface-700'
            }`}
          >
            All ({departments.length})
          </button>
          <button
            onClick={() => { setFilter('overloaded'); setSearchParams({ filter: 'overloaded' }); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'overloaded'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-md'
                : 'bg-surface-800/80 text-surface-400 border border-surface-700 hover:text-yellow-300'
            }`}
          >
            Overloaded ({departments.filter(isDeptOverloaded).length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDepartments.length === 0 ? (
          <div className="col-span-full p-8 rounded-2xl bg-surface-900/60 border border-surface-800 text-center space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
            <p className="text-sm font-bold text-white">No Overloaded Departments</p>
            <p className="text-xs text-surface-400">All municipal departments are currently operating within capacity limits.</p>
          </div>
        ) : (
          filteredDepartments.map((dept, i) => {
          const Icon = deptIcons[dept.name] || Building2;
          const grad = deptGradients[i % deptGradients.length];
          const isSelected = selectedDepartment?._id === dept._id;
          const totalVal = dept.liveStats?.total ?? 0;
          const activeVal = (dept.liveStats?.pending ?? 0) + (dept.liveStats?.inProgress ?? 0);
          const solvedVal = dept.liveStats?.resolved ?? 0;

          return (
            <motion.div key={dept._id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              whileHover={{ y: -6, scale: 1.015 }}
              onClick={() => handleCardClick(dept)}
              className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 group hover:border-purple-500/60 hover:shadow-xl hover:shadow-purple-500/10 relative overflow-hidden ${
                isSelected ? 'ring-2 ring-brand-500/60 border-purple-500/40' : ''
              }`}
              style={{ background: 'rgba(25,16,39,0.6)', border: `1px solid ${isSelected ? 'rgba(147,51,234,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
              
              {/* Subtle hover glow backdrop */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 via-transparent to-brand-500/5 group-hover:to-brand-500/15 transition-all pointer-events-none" />

              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={22} className="text-white" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  {predictionsMap[dept.name] ? (
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      predictionsMap[dept.name].overloadRisk === 'Overloaded' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                      'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {predictionsMap[dept.name].overloadRisk}
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      dept.aiWorkload === 'Critical' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                      dept.aiWorkload === 'Overloaded' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                      'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      AI: {dept.aiWorkload || 'Normal'}
                    </span>
                  )}
                  {predictionsMap[dept.name] && (
                    <span className="text-[10px] text-amber-300 font-bold">
                      7d: +{predictionsMap[dept.name].predicted7DayDemand} cases
                    </span>
                  )}
                </div>
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-bold text-base group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                    {dept.name}
                  </h3>
                  <ArrowUpRight size={16} className="text-surface-500 group-hover:text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <p className="text-surface-400 text-xs mb-3 truncate">{dept.head || 'Supervised Office'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 relative z-10">
                <div className="bg-surface-800/40 rounded-lg px-2.5 py-1.5 border border-white/5">
                  <p className="text-surface-500 text-[10px] font-medium">Total</p>
                  <p className="font-bold text-base leading-tight text-white">{totalVal}</p>
                </div>
                <div className="bg-surface-800/40 rounded-lg px-2.5 py-1.5 border border-white/5">
                  <p className="text-surface-500 text-[10px] font-medium">Active</p>
                  <p className="font-bold text-base leading-tight text-yellow-400">{activeVal}</p>
                </div>
                <div className="bg-surface-800/40 rounded-lg px-2.5 py-1.5 border border-white/5">
                  <p className="text-surface-500 text-[10px] font-medium">Solved</p>
                  <p className="font-bold text-base leading-tight text-emerald-400">{solvedVal}</p>
                </div>
                <div className="bg-surface-800/40 rounded-lg px-2.5 py-1.5 border border-white/5">
                  <p className="text-surface-500 text-[10px] font-medium">Workers (Req)</p>
                  <p className="font-bold text-base leading-tight text-cyan-300">
                    {dept.workerCount || 1} ({predictionsMap[dept.name]?.recommendedWorkers ?? dept.workerCount ?? 1})
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-white/8 text-xs text-surface-400 relative z-10">
                <div className="flex items-center gap-1.5">
                  <HardHat size={12} className="text-surface-500" /> {dept.availableWorkers ?? dept.workerCount} Available • {dept.busyWorkers ?? 0} Busy
                </div>
                <span className="text-purple-400 group-hover:translate-x-1 transition-transform flex items-center gap-0.5 text-xs font-semibold">
                  Manage <ChevronRight size={13} />
                </span>
              </div>
            </motion.div>
          );
        }))}
      </div>

      {/* Expanded Detail with Phase 8 Workforce Planning */}
      {selectedDepartment && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="p-6 rounded-2xl space-y-4" style={{ background: 'rgba(25,16,39,0.7)', border: '1px solid rgba(168,85,247,0.4)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 size={20} className="text-purple-400" /> {selectedDepartment.name}
              </h2>
              <p className="text-xs text-surface-400">Supervised by {selectedDepartment.head} ({selectedDepartment.contactEmail})</p>
            </div>
            {predictionsMap[selectedDepartment.name] && (
              <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                Capacity Risk: {predictionsMap[selectedDepartment.name].riskLevel} ({predictionsMap[selectedDepartment.name].capacityUtilization} Utilization)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface-800/60 rounded-xl p-3.5 border border-white/5">
              <span className="text-[10px] text-surface-400 block uppercase">Current Active Load</span>
              <p className="text-xl font-black text-white mt-1">{(selectedDepartment.liveStats?.pending ?? 0) + (selectedDepartment.liveStats?.inProgress ?? 0)} Issues</p>
            </div>
            <div className="bg-surface-800/60 rounded-xl p-3.5 border border-white/5">
              <span className="text-[10px] text-surface-400 block uppercase">Predicted 7-Day Demand</span>
              <p className="text-xl font-black text-amber-300 mt-1">{predictionsMap[selectedDepartment.name]?.predicted7DayDemand ?? 0} Reports</p>
            </div>
            <div className="bg-surface-800/60 rounded-xl p-3.5 border border-white/5">
              <span className="text-[10px] text-surface-400 block uppercase">Predicted 30-Day Demand</span>
              <p className="text-xl font-black text-indigo-300 mt-1">{predictionsMap[selectedDepartment.name]?.predicted30DayDemand ?? 0} Reports</p>
            </div>
            <div className="bg-surface-800/60 rounded-xl p-3.5 border border-white/5">
              <span className="text-[10px] text-surface-400 block uppercase">Recommended Workforce</span>
              <p className="text-xl font-black text-cyan-300 mt-1">{predictionsMap[selectedDepartment.name]?.recommendedWorkers ?? selectedDepartment.workerCount ?? 1} Workers</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
