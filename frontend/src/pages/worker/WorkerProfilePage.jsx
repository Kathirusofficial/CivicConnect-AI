import { useState, useEffect } from 'react';
import { User, HardHat, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Mail, Phone, Building2 } from 'lucide-react';
import { workerApi } from '../../services/workerApi';
import { useWorkerAuthStore } from '../../store/workerAuthStore';

export const WorkerProfilePage = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { workerUser } = useWorkerAuthStore();

  useEffect(() => {
    workerApi.getProfile()
      .then(res => {
        if (res.data?.success) {
          setProfileData(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const p = profileData?.profile || workerUser;
  const stats = profileData?.performance || {
    completedTasks: 0,
    activeTasks: 0,
    completionRate: '100%',
    averageResolutionHours: 24
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <User size={24} className="text-amber-400" /> Operative Profile &amp; Scorecard
        </h1>
        <p className="text-xs text-surface-400 mt-0.5">Municipal Field Worker Credentials and Performance Metrics</p>
      </div>

      {/* Identity Card */}
      <div className="p-6 rounded-3xl bg-[#161b22] border border-surface-800 space-y-6 shadow-xl">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-2xl shadow-lg">
            <HardHat size={32} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{p?.name || 'Field Operative'}</h2>
            <p className="text-xs font-mono text-amber-400 font-bold mt-0.5">{p?.employeeId || 'EMP-OPERATIONS'}</p>
            <p className="text-xs text-surface-400 mt-0.5">{p?.department || 'Municipal Operations'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-[#0d1117] border border-surface-800 flex items-center gap-2.5">
            <Mail size={16} className="text-surface-500" />
            <div>
              <span className="text-[10px] text-surface-500 block uppercase font-bold">Email</span>
              <span className="text-white font-medium truncate">{p?.email || 'operative@civicconnect.com'}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#0d1117] border border-surface-800 flex items-center gap-2.5">
            <Building2 size={16} className="text-surface-500" />
            <div>
              <span className="text-[10px] text-surface-500 block uppercase font-bold">Department</span>
              <span className="text-white font-medium truncate">{p?.department || 'Field Works'}</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#0d1117] border border-surface-800 flex items-center gap-2.5">
            <ShieldCheck size={16} className="text-emerald-400" />
            <div>
              <span className="text-[10px] text-surface-500 block uppercase font-bold">Role</span>
              <span className="text-emerald-300 font-bold">Verified Field Worker</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Performance Scorecard</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-[#161b22] border border-surface-800">
            <span className="text-xs text-surface-400 font-bold block">Tasks Completed</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">{stats.completedTasks}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#161b22] border border-surface-800">
            <span className="text-xs text-surface-400 font-bold block">Active Backlog</span>
            <p className="text-2xl font-black text-amber-400 mt-1">{stats.activeTasks}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#161b22] border border-surface-800">
            <span className="text-xs text-surface-400 font-bold block">Completion Rate</span>
            <p className="text-2xl font-black text-white mt-1">{stats.completionRate}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#161b22] border border-surface-800">
            <span className="text-xs text-surface-400 font-bold block">Avg Turnaround</span>
            <p className="text-2xl font-black text-white mt-1">{stats.averageResolutionHours}h</p>
          </div>
        </div>
      </div>
    </div>
  );
};
