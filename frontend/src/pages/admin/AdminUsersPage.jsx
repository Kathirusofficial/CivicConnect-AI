import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, FileText, CheckCircle2, Eye, ShieldOff, ShieldCheck } from 'lucide-react';
import { usersAdminApi } from '../../services/adminApi';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersAdminApi.getAll({ search, role, page, limit: 10 });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, role, page]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = users.filter(u => {
    if (role && u.role !== role) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const roleColors = { Citizen: 'bg-blue-500/15 text-blue-400', Admin: 'bg-brand-500/15 text-brand-400', Government: 'bg-violet-500/15 text-violet-400' };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Users size={22} className="text-brand-400" /> Users</h1>
        <p className="text-surface-400 text-sm mt-0.5">{total} registered users</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white placeholder-surface-500 text-sm focus:border-brand-500/60 transition-all" />
        </div>
        <select value={role} onChange={e => setRole(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white text-sm focus:border-brand-500/60 transition-all">
          <option value="">All Roles</option>
          {['Citizen', 'Admin', 'Government'].map(r => <option key={r}>{r}</option>)}
        </select>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['User', 'Email', 'Role', 'Joined', 'Complaints', 'Resolved', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((u, i) => (
                <motion.tr key={u._id}
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500/30 to-accent-violet/30 flex items-center justify-center text-white text-sm font-bold">
                        {u.name.charAt(0)}
                      </div>
                      <span className="text-white font-medium text-sm whitespace-nowrap">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-surface-400 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${roleColors[u.role] || 'bg-surface-700 text-surface-300'}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-surface-500 text-xs whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center gap-1.5 text-sm">
                      <FileText size={13} className="text-surface-500" />
                      <span className="text-white font-semibold">{u.totalComplaints ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center gap-1.5 text-sm">
                      <CheckCircle2 size={13} className="text-emerald-500" />
                      <span className="text-emerald-400 font-semibold">{u.resolvedComplaints ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelected(selected?._id === u._id ? null : u)}
                        className="p-1.5 rounded-lg bg-brand-600/20 text-brand-400 hover:bg-brand-600/40 transition-all" title="View">
                        <Eye size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Panel */}
      {selected && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl" style={{ background: 'rgba(25,16,39,0.7)', border: '1px solid rgba(147,51,234,0.3)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center text-white text-2xl font-bold">
              {selected.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{selected.name}</h2>
              <p className="text-surface-400 text-sm">{selected.email}</p>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-xs font-medium ${roleColors[selected.role]}`}>{selected.role}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[{ label: 'Total Complaints', val: selected.totalComplaints ?? 0 }, { label: 'Resolved', val: selected.resolvedComplaints ?? 0 }, { label: 'Member Since', val: new Date(selected.createdAt).toLocaleDateString() }].map(s => (
              <div key={s.label} className="bg-surface-800/50 rounded-xl p-3 text-center border border-surface-700/50">
                <p className="text-white font-bold text-xl">{s.val}</p>
                <p className="text-surface-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
