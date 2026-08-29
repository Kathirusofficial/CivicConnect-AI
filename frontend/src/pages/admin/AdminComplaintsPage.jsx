import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Eye, Trash2, ChevronLeft, ChevronRight, SlidersHorizontal, X, Sparkles, Flame, Users, ArrowUpDown } from 'lucide-react';
import { complaintsAdminApi } from '../../services/adminApi';

const priorityColors = { Low: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', Medium: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30', High: 'text-orange-400 bg-orange-500/15 border-orange-500/30', Emergency: 'text-red-400 bg-red-500/15 border-red-500/30' };
const aiLevelColors = {
  Critical: 'bg-red-500/20 text-red-300 border-red-500/40',
  High: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  Medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  Low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
};
const statusColors = { Pending: 'text-yellow-400 bg-yellow-500/15', Verified: 'text-blue-400 bg-blue-500/15', Assigned: 'text-purple-400 bg-purple-500/15', 'In Progress': 'text-orange-400 bg-orange-500/15', Resolved: 'text-emerald-400 bg-emerald-500/15', Rejected: 'text-red-400 bg-red-500/15' };

const STATUSES = ['', 'Pending', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITIES = ['', 'Low', 'Medium', 'High', 'Emergency'];
const AI_LEVELS = ['', 'Critical', 'High', 'Medium', 'Low'];
const CATEGORIES = ['', 'Road Damage', 'Electricity', 'Water Supply', 'Garbage Collection', 'Traffic Signal', 'Street Light', 'Drainage', 'Parks', 'Others'];

export const AdminComplaintsPage = () => {
  const [searchParams] = useSearchParams();
  const [complaints, setComplaints] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [aiPriorityLevel, setAiPriorityLevel] = useState(searchParams.get('aiPriorityLevel') || '');
  const [category, setCategory] = useState('');
  const [emergency, setEmergency] = useState(searchParams.get('emergency') === 'true');
  const [assigned, setAssigned] = useState(searchParams.get('assigned') || '');
  const [duplicateOnly, setDuplicateOnly] = useState(searchParams.get('duplicateOnly') === 'true');
  const [aiQueue, setAiQueue] = useState(searchParams.get('aiQueue') === 'true');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await complaintsAdminApi.getAll({ 
        search, status, priority, category, emergency, assigned, duplicateOnly, 
        aiPriorityLevel, aiQueue, page, limit: 10 
      });
      setComplaints(res.data.complaints || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load complaints from server.');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, [search, status, priority, category, emergency, assigned, duplicateOnly, aiPriorityLevel, aiQueue, page]);

  useEffect(() => {
    setStatus(searchParams.get('status') || '');
    setPriority(searchParams.get('priority') || '');
    setAiPriorityLevel(searchParams.get('aiPriorityLevel') || '');
    setCategory(searchParams.get('category') || '');
    setEmergency(searchParams.get('emergency') === 'true');
    setAssigned(searchParams.get('assigned') || '');
    setDuplicateOnly(searchParams.get('duplicateOnly') === 'true');
    setAiQueue(searchParams.get('aiQueue') === 'true');
    setPage(1);
  }, [searchParams]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this complaint?')) return;
    try {
      await complaintsAdminApi.delete(id);
      setComplaints(p => p.filter(c => c._id !== id));
    } catch { alert('Delete failed.'); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Government Complaint Operations
            {aiQueue && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/40 flex items-center gap-1 font-medium">
                <Sparkles size={11} /> AI Prioritized Queue
              </span>
            )}
          </h1>
          <p className="text-surface-400 text-sm mt-0.5">{total} total municipal citizen complaints</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setAiQueue(q => !q); setPage(1); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              aiQueue 
                ? 'bg-gradient-to-r from-brand-600 to-accent-violet text-white shadow-glow' 
                : 'bg-surface-800/80 text-brand-300 border border-brand-500/30 hover:bg-brand-500/10'
            }`}
          >
            <Sparkles size={13} />
            {aiQueue ? 'AI Priority Queue (Active)' : 'Sort by AI Priority'}
          </button>
          <button
            onClick={() => { setEmergency(e => !e); setPage(1); }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              emergency 
                ? 'bg-red-500 text-white shadow-red-500/30 shadow-md' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            Emergency Filter {emergency ? 'Active' : ''}
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            id="complaint-search"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by Complaint ID (#CMP-...), Title, Address, Landmark..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white placeholder-surface-500 text-sm focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <button onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${showFilters ? 'bg-brand-600/30 border-brand-500/50 text-brand-300' : 'bg-surface-800/60 border-surface-700/60 text-surface-300 hover:border-brand-500/40'}`}>
          <SlidersHorizontal size={15} /> Filters {(status || priority || aiPriorityLevel || category || assigned || duplicateOnly) && <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />}
        </button>
      </motion.div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-3 p-4 rounded-xl bg-surface-800/40 border border-surface-700/50">
            <div>
              <label className="text-xs text-surface-400 mb-1 block">AI Priority Level</label>
              <select value={aiPriorityLevel} onChange={e => { setAiPriorityLevel(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-lg bg-surface-700/60 border border-brand-500/40 text-sm text-white focus:border-brand-500/60 transition-all">
                {AI_LEVELS.map(l => <option key={l} value={l}>{l ? `AI: ${l}` : 'All AI Levels'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Citizen Priority</label>
              <select value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-lg bg-surface-700/60 border border-surface-600/50 text-sm text-white focus:border-brand-500/60 transition-all">
                {PRIORITIES.map(p => <option key={p} value={p}>{p || 'All Priorities'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Status</label>
              <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-lg bg-surface-700/60 border border-surface-600/50 text-sm text-white focus:border-brand-500/60 transition-all">
                {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Category</label>
              <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-lg bg-surface-700/60 border border-surface-600/50 text-sm text-white focus:border-brand-500/60 transition-all">
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat || 'All Categories'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Assignment</label>
              <select value={assigned} onChange={e => { setAssigned(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-lg bg-surface-700/60 border border-surface-600/50 text-sm text-white focus:border-brand-500/60 transition-all">
                <option value="">All Assignments</option>
                <option value="assigned">Assigned Only</option>
                <option value="unassigned">Unassigned Only</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1 block">Clusters</label>
              <button
                onClick={() => { setDuplicateOnly(d => !d); setPage(1); }}
                className={`px-3 py-2 rounded-lg text-sm transition-all border ${
                  duplicateOnly 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-surface-700/60 text-surface-300 border-surface-600/50'
                }`}
              >
                Duplicate Clusters {duplicateOnly ? '✓' : ''}
              </button>
            </div>
            {(status || priority || aiPriorityLevel || category || assigned || duplicateOnly || emergency) && (
              <div className="flex items-end">
                <button onClick={() => { setStatus(''); setPriority(''); setAiPriorityLevel(''); setCategory(''); setAssigned(''); setDuplicateOnly(false); setEmergency(false); }}
                  className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm flex items-center gap-1 hover:bg-red-500/30 transition-all">
                  <X size={13} /> Reset Filters
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['ID', 'Citizen', 'Title', 'Category', 'AI Decision Priority', 'Priority', 'Status', 'Department', 'Worker', 'Date', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-surface-700/50 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : complaints.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-surface-400">No complaints found.</td></tr>
              ) : (
                complaints.map((c, i) => {
                  const dsScore = c.decisionSupport?.priorityScore ?? (c.priority === 'Emergency' ? 95 : 50);
                  const dsLevel = c.decisionSupport?.priorityLevel ?? (c.priority === 'Emergency' ? 'Critical' : 'Medium');
                  const impact = c.decisionSupport?.citizenImpactCount ?? 1;

                  return (
                    <motion.tr key={c._id}
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="hover:bg-white/3 transition-colors group">
                      <td className="px-4 py-3 font-mono text-xs text-brand-400 font-medium">
                        #{c.complaintId || c._id?.slice(-6)?.toUpperCase()}
                        {c.duplicateGroupId && (
                          <span className="block mt-0.5 text-[10px] font-sans px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 w-fit">
                            Cluster
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white text-xs whitespace-nowrap">{c.citizen?.name || '—'}</td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="text-white font-medium truncate text-xs">{c.title}</p>
                        <p className="text-surface-500 text-xs truncate">{c.address}</p>
                      </td>
                      <td className="px-4 py-3 text-surface-300 text-xs whitespace-nowrap">{c.category || c.department}</td>
                      
                      {/* AI Decision Support Priority Score & Level */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border w-fit ${aiLevelColors[dsLevel]}`}>
                            {dsScore}/100 • {dsLevel}
                          </span>
                          {impact > 1 && (
                            <span className="text-[10px] text-violet-300 flex items-center gap-1 font-medium">
                              <Users size={10} /> {impact} reports
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-lg text-xs border font-medium ${priorityColors[c.priority]}`}>{c.priority}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[c.status]}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3 text-surface-400 text-xs whitespace-nowrap">{c.department}</td>
                      <td className="px-4 py-3 text-surface-400 text-xs whitespace-nowrap">{c.assignedWorker?.name || <span className="text-surface-600">Unassigned</span>}</td>
                      <td className="px-4 py-3 text-surface-500 text-xs whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link to={`/government/complaints/${c._id}`}
                            className="p-1.5 rounded-lg bg-brand-600/20 text-brand-400 hover:bg-brand-600/40 transition-all" title="View">
                            <Eye size={13} />
                          </Link>
                          <button onClick={() => handleDelete(c._id)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/25 transition-all" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-xs text-surface-400">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg bg-surface-700/50 text-surface-300 disabled:opacity-40 hover:bg-surface-700 transition-all">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg bg-surface-700/50 text-surface-300 disabled:opacity-40 hover:bg-surface-700 transition-all">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
