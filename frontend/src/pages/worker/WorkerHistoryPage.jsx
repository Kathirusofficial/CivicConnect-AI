import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History, CheckCircle2, MapPin, ArrowUpRight, Clock, RefreshCw } from 'lucide-react';
import { workerApi } from '../../services/workerApi';

export const WorkerHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await workerApi.getHistory();
      if (res.data?.success) {
        setHistory(res.data.history || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <History size={24} className="text-amber-400" /> Completed Task History
          </h1>
          <p className="text-xs text-surface-400 mt-0.5">Record of all verified and resolved field tasks</p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 text-surface-300 hover:text-white text-xs font-semibold"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh History
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-surface-400 text-sm">Loading task history...</div>
      ) : history.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#161b22] border border-surface-800 text-center space-y-2">
          <CheckCircle2 size={36} className="mx-auto text-surface-500" />
          <p className="text-white font-bold text-sm">No Completed Tasks Yet</p>
          <p className="text-xs text-surface-400">Completed field assignments verified by the administration will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((task) => (
            <div
              key={task._id}
              className="p-4 sm:p-5 rounded-2xl bg-[#161b22] border border-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {task.complaintId}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Verified Resolved
                  </span>
                  <span className="text-xs text-surface-400 font-medium">
                    {task.category}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white leading-snug">{task.title}</h3>

                {task.resolution?.notes && (
                  <p className="text-xs text-surface-300 italic bg-[#0d1117] p-2 rounded-lg border border-surface-800">
                    "{task.resolution.notes}"
                  </p>
                )}

                <div className="flex items-center gap-1.5 text-xs text-surface-400">
                  <MapPin size={13} className="text-amber-400 shrink-0" />
                  <span className="truncate">{task.address}</span>
                </div>
              </div>

              <div className="flex items-center sm:flex-col sm:items-end justify-between gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-surface-800">
                <div className="text-left sm:text-right text-xs text-surface-400">
                  <span className="block text-[10px] text-surface-500">Resolved Date</span>
                  <span className="font-semibold text-white">
                    {task.fieldWork?.resolvedAt ? new Date(task.fieldWork.resolvedAt).toLocaleDateString() : 'Resolved'}
                  </span>
                </div>

                <Link
                  to={`/worker/tasks/${task._id}`}
                  className="px-3.5 py-1.5 bg-surface-800 hover:bg-surface-700 text-surface-200 text-xs font-bold rounded-xl flex items-center gap-1 border border-surface-700"
                >
                  View Details <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
