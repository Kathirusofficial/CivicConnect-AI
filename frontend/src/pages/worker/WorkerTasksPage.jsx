import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckSquare, Search, Filter, MapPin, ArrowUpRight, Flame,
  AlertTriangle, CheckCircle2, Clock, RefreshCw
} from 'lucide-react';
import { workerApi } from '../../services/workerApi';

export const WorkerTasksPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [emergencyOnly, setEmergencyOnly] = useState(searchParams.get('emergency') === 'true');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (emergencyOnly) params.emergency = 'true';
      if (search.trim()) params.search = search.trim();

      const res = await workerApi.getTasks(params);
      if (res.data?.success) {
        setTasks(res.data.tasks || []);
      }
    } catch (err) {
      console.error('Failed to fetch worker tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, emergencyOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTasks();
  };

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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <CheckSquare size={24} className="text-amber-400" /> My Field Tasks
          </h1>
          <p className="text-xs text-surface-400 mt-0.5">Assigned municipal complaints requiring field response</p>
        </div>

        <button
          onClick={fetchTasks}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-surface-300 hover:text-white text-xs font-semibold"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters & Search */}
      <div className="space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Complaint ID, Title, Address or Landmark..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#161b22] border border-surface-700 rounded-xl text-white text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2 flex-wrap items-center">
          {[
            { label: 'All Tasks', status: '', emergency: false },
            { label: '🔥 Emergency Only', status: '', emergency: true },
            { label: 'Assigned', status: 'Assigned', emergency: false },
            { label: 'In Progress', status: 'In Progress', emergency: false },
            { label: 'Pending Gov Verification', status: 'Resolution Pending Verification', emergency: false },
            { label: 'Completed', status: 'Resolved', emergency: false },
          ].map((btn, idx) => {
            const isActive = statusFilter === btn.status && emergencyOnly === btn.emergency;
            return (
              <button
                key={idx}
                onClick={() => {
                  setStatusFilter(btn.status);
                  setEmergencyOnly(btn.emergency);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-black shadow'
                    : 'bg-surface-800/80 text-surface-300 border border-surface-700 hover:bg-surface-700'
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="p-12 text-center text-surface-400 text-sm">Loading field assignments...</div>
      ) : tasks.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#161b22] border border-surface-800 text-center space-y-2">
          <CheckCircle2 size={36} className="mx-auto text-surface-500" />
          <p className="text-white font-bold text-sm">No Matching Tasks Found</p>
          <p className="text-xs text-surface-400">Try adjusting your search criteria or filter tags.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isEmergency = task.priority === 'Emergency' || task.decisionSupport?.priorityLevel === 'Critical';

            return (
              <div
                key={task._id}
                className={`p-4 sm:p-5 rounded-2xl bg-[#161b22] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isEmergency ? 'border-red-500/50 shadow-md' : 'border-surface-800 hover:border-surface-700'
                }`}
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {task.complaintId}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${priorityBadgeColor[task.priority] || priorityBadgeColor.Medium}`}>
                      {task.priority}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${statusBadgeColor[task.status] || statusBadgeColor.Assigned}`}>
                      {task.status}
                    </span>
                    <span className="text-xs text-surface-400 font-medium">
                      {task.category}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug">{task.title}</h3>
                  <p className="text-xs text-surface-400 line-clamp-1">{task.description}</p>

                  <div className="flex items-center gap-1.5 text-xs text-surface-400">
                    <MapPin size={13} className="text-amber-400 shrink-0" />
                    <span className="truncate">{task.address} {task.landmark ? `(${task.landmark})` : ''}</span>
                  </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-surface-800">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-surface-500 block uppercase font-bold">AI Priority</span>
                    <span className="text-xs font-bold text-white">{task.decisionSupport?.priorityScore || 50}/100</span>
                  </div>

                  <Link
                    to={`/worker/tasks/${task._id}`}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl flex items-center gap-1.5 shadow"
                  >
                    Manage Task <ArrowUpRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
