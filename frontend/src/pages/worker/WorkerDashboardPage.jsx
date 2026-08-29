import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckSquare, Clock, CheckCircle2, AlertTriangle, Flame,
  MapPin, ArrowUpRight, Navigation, Sparkles, RefreshCw, ShieldAlert
} from 'lucide-react';
import { workerApi } from '../../services/workerApi';
import { useWorkerAuthStore } from '../../store/workerAuthStore';

export const WorkerDashboardPage = () => {
  const [summary, setSummary] = useState({
    assignedTasks: 0,
    inProgress: 0,
    resolutionPending: 0,
    completed: 0,
    emergency: 0,
    critical: 0
  });
  const [activeTasks, setActiveTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { workerUser } = useWorkerAuthStore();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await workerApi.getDashboard();
      if (res.data?.success) {
        setSummary(res.data.summary);
        setActiveTasks(res.data.activeTasks || []);
      }
    } catch (err) {
      console.error('Failed to load worker dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const priorityBadgeColor = {
    Emergency: 'bg-red-500/20 text-red-400 border-red-500/40',
    High: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    Low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
  };

  const statusBadgeColor = {
    Assigned: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    'In Progress': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    'Resolution Pending Verification': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    Resolved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">
            Welcome, {workerUser?.name || 'Field Operative'} 👋
          </h1>
          <p className="text-xs text-surface-400 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • Field Terminal Active
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-surface-300 hover:text-white text-xs font-semibold"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh Tasks
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-[#161b22] border border-surface-800 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-surface-400">
            <span>Assigned</span>
            <CheckSquare size={16} className="text-purple-400" />
          </div>
          <p className="text-3xl font-black text-white">{summary.assignedTasks}</p>
          <p className="text-[10px] text-surface-500">Pending acceptance</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#161b22] border border-surface-800 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-surface-400">
            <span>In Progress</span>
            <Clock size={16} className="text-blue-400" />
          </div>
          <p className="text-3xl font-black text-white">{summary.inProgress}</p>
          <p className="text-[10px] text-surface-500">Active field work</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#161b22] border border-surface-800 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-surface-400">
            <span>Pending Review</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <p className="text-3xl font-black text-white">{summary.resolutionPending}</p>
          <p className="text-[10px] text-surface-500">Gov verification</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#161b22] border border-surface-800 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-surface-400">
            <span>Completed</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white">{summary.completed}</p>
          <p className="text-[10px] text-surface-500">Resolved tasks</p>
        </div>

        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs font-bold text-red-400">
            <span>Emergency</span>
            <Flame size={16} className="text-red-400" />
          </div>
          <p className="text-3xl font-black text-red-300">{summary.emergency}</p>
          <p className="text-[10px] text-red-400/80">Immediate attention</p>
        </div>
      </div>

      {/* ACTIVE TASKS QUEUE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckSquare size={20} className="text-amber-400" /> Active Field Assignments
            </h2>
            <p className="text-xs text-surface-400">Ranked by AI Municipal Decision Score &amp; Urgency</p>
          </div>
          <Link to="/worker/tasks" className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1">
            View All ({activeTasks.length}) <ArrowUpRight size={14} />
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#161b22] border border-surface-800 text-center space-y-2">
            <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
            <p className="text-white font-bold text-sm">No Active Tasks Assigned</p>
            <p className="text-xs text-surface-400">All assigned field complaints have been completed or you are currently available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTasks.map((task) => {
              const isEmergency = task.priority === 'Emergency' || task.decisionSupport?.priorityLevel === 'Critical';
              const aiScore = task.decisionSupport?.priorityScore || 50;

              return (
                <div
                  key={task._id}
                  className={`p-5 rounded-2xl bg-[#161b22] border transition-all flex flex-col justify-between space-y-4 ${
                    isEmergency ? 'border-red-500/50 shadow-lg shadow-red-500/5' : 'border-surface-800 hover:border-surface-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {task.complaintId}
                      </span>
                      
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${priorityBadgeColor[task.priority] || priorityBadgeColor.Medium}`}>
                          {task.priority}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${statusBadgeColor[task.status] || statusBadgeColor.Assigned}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white leading-snug line-clamp-1">{task.title}</h3>
                      <p className="text-xs text-surface-400 line-clamp-2 mt-0.5">{task.description}</p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-surface-400">
                      <MapPin size={13} className="text-amber-400 shrink-0" />
                      <span className="truncate">{task.address} {task.landmark ? `(${task.landmark})` : ''}</span>
                    </div>

                    {task.decisionSupport?.recommendedAction && (
                      <div className="p-2.5 rounded-xl bg-surface-900 border border-surface-800 text-[11px] text-surface-300">
                        <span className="font-bold text-amber-400 block mb-0.5">ACTION GUIDANCE:</span>
                        <p>{task.decisionSupport.recommendedAction}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-surface-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-surface-400">
                      AI Priority: <span className="text-white">{aiScore}/100</span>
                    </span>

                    <Link
                      to={`/worker/tasks/${task._id}`}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow"
                    >
                      Open Task <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
