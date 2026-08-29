import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, FileText, CheckCircle2, Clock, HardHat, ChevronRight, Zap, Droplets, Truck, TrafficCone, Trash2, Activity, Lightbulb, Globe, BrainCircuit, AlertTriangle, Sparkles } from 'lucide-react';
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

export const AdminDepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [predictionsMap, setPredictionsMap] = useState({});
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Department Management</h1>
        <p className="text-surface-400 text-sm mt-0.5">{departments.length} departments registered</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {departments.map((dept, i) => {
          const Icon = deptIcons[dept.name] || Building2;
          const grad = deptGradients[i % deptGradients.length];
          const isSelected = selected?._id === dept._id;
          return (
            <motion.div key={dept._id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              onClick={() => setSelected(isSelected ? null : dept)}
              className={`p-5 rounded-2xl cursor-pointer transition-all ${isSelected ? 'ring-2 ring-brand-500/60' : ''}`}
              style={{ background: 'rgba(25,16,39,0.6)', border: `1px solid ${isSelected ? 'rgba(147,51,234,0.4)' : 'rgba(255,255,255,0.07)'}` }}>
              
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center border border-white/10`}>
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

              <h3 className="text-white font-semibold text-sm mb-1">{dept.name}</h3>
              <p className="text-surface-500 text-xs mb-3">{dept.head}</p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: 'Total', val: dept.liveStats?.total ?? 0, color: 'text-white' },
                  { label: 'Active', val: (dept.liveStats?.pending ?? 0) + (dept.liveStats?.inProgress ?? 0), color: 'text-yellow-400' },
                  { label: 'Predicted 7d', val: predictionsMap[dept.name]?.predicted7DayDemand ?? '—', color: 'text-amber-300' },
                  { label: 'Workers (Req)', val: `${dept.workerCount || 1} (${predictionsMap[dept.name]?.recommendedWorkers ?? dept.workerCount ?? 1})`, color: 'text-cyan-300' },
                ].map(s => (
                  <div key={s.label} className="bg-surface-800/40 rounded-lg px-2 py-1.5">
                    <p className="text-surface-500 text-[10px]">{s.label}</p>
                    <p className={`font-bold text-base leading-tight ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-white/8">
                <div className="flex items-center gap-1.5 text-xs text-surface-400">
                  <HardHat size={12} className="text-surface-500" /> {dept.availableWorkers ?? dept.workerCount} Available • {dept.busyWorkers ?? 0} Busy
                </div>
                <ChevronRight size={14} className={`text-surface-500 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Expanded Detail with Phase 8 Workforce Planning */}
      {selected && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="p-6 rounded-2xl space-y-4" style={{ background: 'rgba(25,16,39,0.7)', border: '1px solid rgba(168,85,247,0.4)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 size={20} className="text-purple-400" /> {selected.name}
              </h2>
              <p className="text-xs text-surface-400">Supervised by {selected.head} ({selected.contactEmail})</p>
            </div>
            {predictionsMap[selected.name] && (
              <span className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                Capacity Risk: {predictionsMap[selected.name].riskLevel} ({predictionsMap[selected.name].capacityUtilization} Utilization)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface-800/60 rounded-xl p-3.5 border border-white/5">
              <span className="text-[10px] text-surface-400 block uppercase">Current Active Load</span>
              <p className="text-xl font-black text-white mt-1">{(selected.liveStats?.pending ?? 0) + (selected.liveStats?.inProgress ?? 0)} Issues</p>
            </div>
            <div className="bg-surface-800/60 rounded-xl p-3.5 border border-white/5">
              <span className="text-[10px] text-surface-400 block uppercase">Predicted 7-Day Demand</span>
              <p className="text-xl font-black text-amber-300 mt-1">{predictionsMap[selected.name]?.predicted7DayDemand ?? 0} Reports</p>
            </div>
            <div className="bg-surface-800/60 rounded-xl p-3.5 border border-white/5">
              <span className="text-[10px] text-surface-400 block uppercase">Predicted 30-Day Demand</span>
              <p className="text-xl font-black text-indigo-300 mt-1">{predictionsMap[selected.name]?.predicted30DayDemand ?? 0} Reports</p>
            </div>
            <div className="bg-surface-800/60 rounded-xl p-3.5 border border-white/5">
              <span className="text-[10px] text-surface-400 block uppercase">Recommended Workforce</span>
              <p className="text-xl font-black text-cyan-300 mt-1">{predictionsMap[selected.name]?.recommendedWorkers ?? selected.workerCount ?? 1} Workers</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
