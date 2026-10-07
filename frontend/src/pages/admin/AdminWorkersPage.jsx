import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, HardHat, Phone, X, Save } from 'lucide-react';
import { workersAdminApi, departmentsAdminApi } from '../../services/adminApi';

const statusColors = { Available: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', Busy: 'bg-orange-500/20 text-orange-400 border-orange-500/30', Offline: 'bg-surface-700 text-surface-400 border-surface-600' };
const statusDots = { Available: 'bg-emerald-400', Busy: 'bg-orange-400', Offline: 'bg-surface-500' };

const WorkerModal = ({ worker, departments, onClose, onSave }) => {
  const [form, setForm] = useState({ name: worker?.name || '', department: worker?.department?._id || '', status: worker?.status || 'Available', contact: worker?.contact || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      let res;
      if (worker?._id) res = await workersAdminApi.update(worker._id, form);
      else res = await workersAdminApi.create(form);
      onSave(res.data, !!worker?._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save worker');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-md rounded-2xl p-6" style={{ background: 'rgba(20,12,32,0.98)', border: '1px solid rgba(147,51,234,0.3)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{worker ? 'Edit Worker' : 'Add New Worker'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-surface-700/50 text-surface-400 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          {[['Name', 'name', 'text', 'Worker full name'], ['Contact', 'contact', 'text', '+1 (555) xxx-xxxx']].map(([label, key, type, ph]) => (
            <div key={key}>
              <label className="text-xs text-surface-400 mb-1.5 block">{label}</label>
              <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-700/60 border border-surface-600/50 text-white text-sm placeholder-surface-500 focus:border-brand-500/60 transition-all" />
            </div>
          ))}
          <div>
            <label className="text-xs text-surface-400 mb-1.5 block">Department</label>
            <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-700/60 border border-surface-600/50 text-white text-sm focus:border-brand-500/60 transition-all">
              <option value="">Select department</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-surface-400 mb-1.5 block">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-700/60 border border-surface-600/50 text-white text-sm focus:border-brand-500/60 transition-all">
              {['Available', 'Busy', 'Offline'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-surface-700/50 text-surface-300 text-sm font-medium hover:bg-surface-700 transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-violet text-white text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-glow transition-all">
            <Save size={14} /> {worker ? 'Save Changes' : 'Add Worker'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const AdminWorkersPage = () => {
  const [searchParams] = useSearchParams();
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | worker object
  const [filter, setFilter] = useState(searchParams.get('status') || '');

  useEffect(() => {
    setFilter(searchParams.get('status') || '');
  }, [searchParams]);

  const fetchWorkersAndDepts = async () => {
    setLoading(true);
    try {
      const [w, d] = await Promise.all([
        workersAdminApi.getAll().catch(() => ({ data: [] })),
        departmentsAdminApi.getAll().catch(() => ({ data: [] }))
      ]);
      setWorkers(Array.isArray(w.data) ? w.data : []);
      setDepartments(Array.isArray(d.data) ? d.data : []);
    } catch {
      setWorkers([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkersAndDepts();
  }, []);

  const handleSave = (w, isEdit) => {
    if (isEdit) setWorkers(p => p.map(x => x._id === w._id ? w : x));
    else setWorkers(p => [w, ...p]);
    setModal(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this worker?')) return;
    try { await workersAdminApi.delete(id); } catch {}
    setWorkers(p => p.filter(w => w._id !== id));
  };

  const filtered = workers.filter(w => !filter || w.status === filter);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Worker Management</h1>
          <p className="text-surface-400 text-sm mt-0.5">{workers.length} workers total</p>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-violet text-white text-sm font-semibold shadow-glow hover:shadow-glow-lg transition-all">
          <Plus size={16} /> Add Worker
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'Available', 'Busy', 'Offline'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === s ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40' : 'bg-surface-800/50 text-surface-400 border border-surface-700/50 hover:border-surface-600'}`}>
            {s || 'All'} {s && <span className="ml-1 text-xs">({workers.filter(w => w.status === s).length})</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((w, i) => (
          <motion.div key={w._id}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            whileHover={{ y: -3 }}
            className="p-4 rounded-2xl relative group"
            style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
            
            {/* Actions */}
            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setModal(w)} className="p-1.5 rounded-lg bg-brand-600/20 text-brand-400 hover:bg-brand-600/40 transition-all"><Pencil size={12} /></button>
              <button onClick={() => handleDelete(w._id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/25 transition-all"><Trash2 size={12} /></button>
            </div>

            {/* Avatar & Employee ID */}
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/30 to-accent-violet/30 flex items-center justify-center text-white font-bold text-lg border border-white/10">
                {w.name.charAt(0)}
              </div>
              <span className="text-[10px] font-mono text-brand-300 font-bold bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                {w.employeeId || `EMP-${w._id.slice(-6).toUpperCase()}`}
              </span>
            </div>

            <h3 className="text-white font-semibold text-sm">{w.name}</h3>
            <p className="text-surface-400 text-xs mt-0.5 mb-2">{w.department?.name || 'Field Works'}</p>

            <div className="flex items-center justify-between mb-3">
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${statusColors[w.status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusDots[w.status]}`} /> {w.status}
              </span>
              <span className="text-[11px] font-bold text-white">
                {w.completionRate || '100%'} <span className="text-[10px] text-surface-500 font-normal">rate</span>
              </span>
            </div>

            {w.contact && (
              <div className="flex items-center gap-1.5 text-xs text-surface-500 mb-3">
                <Phone size={11} /> {w.contact}
              </div>
            )}

            <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-white/8 text-center text-xs">
              <div className="p-1.5 rounded-lg bg-white/5">
                <p className="text-sm font-bold text-amber-400">{w.activeTasks ?? w.assignedComplaints ?? 0}</p>
                <p className="text-[9px] text-surface-400 uppercase font-semibold">Active</p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5">
                <p className="text-sm font-bold text-emerald-400">{w.tasksCompleted ?? w.completedComplaints ?? 0}</p>
                <p className="text-[9px] text-surface-400 uppercase font-semibold">Resolved</p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5">
                <p className="text-sm font-bold text-white">{w.averageResolutionTime || '24h'}</p>
                <p className="text-[9px] text-surface-400 uppercase font-semibold">Avg Turn</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {modal && (
          <WorkerModal
            worker={modal === 'add' ? null : modal}
            departments={departments}
            onClose={() => setModal(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
