import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, User, Phone, Mail, AlertTriangle,
  CheckCircle2, Clock, XCircle, MessageSquare, UserCheck,
  Building2, ArrowUpDown, Info, ChevronDown, Send, RefreshCw, Sparkles, Layers, Users
} from 'lucide-react';
import { complaintsAdminApi, workersAdminApi, departmentsAdminApi } from '../../services/adminApi';

const statusColors = { Pending: 'text-yellow-400 bg-yellow-500/15', Verified: 'text-blue-400 bg-blue-500/15', Assigned: 'text-purple-400 bg-purple-500/15', 'In Progress': 'text-orange-400 bg-orange-500/15', Resolved: 'text-emerald-400 bg-emerald-500/15', Rejected: 'text-red-400 bg-red-500/15' };
const priorityColors = { Low: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', Medium: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30', High: 'text-orange-400 bg-orange-500/15 border-orange-500/30', Emergency: 'text-red-400 bg-red-500/15 border-red-500/30' };
const timelineIcons = { Pending: Clock, Verified: CheckCircle2, Assigned: UserCheck, 'In Progress': RefreshCw, Resolved: CheckCircle2, Rejected: XCircle };
const timelineColors = { Pending: 'text-yellow-400 border-yellow-500/50', Verified: 'text-blue-400 border-blue-500/50', Assigned: 'text-purple-400 border-purple-500/50', 'In Progress': 'text-orange-400 border-orange-500/50', Resolved: 'text-emerald-400 border-emerald-500/50', Rejected: 'text-red-400 border-red-500/50' };

const STATUSES = ['Pending', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Emergency'];

const ActionPanel = ({ complaint, workers, departments, onUpdate }) => {
  const [newStatus, setNewStatus] = useState(complaint.status);
  const [newPriority, setNewPriority] = useState(complaint.priority);
  const [workerID, setWorkerID] = useState(complaint.assignedWorker?._id || '');
  const [deptID, setDeptID] = useState(complaint.assignedDepartment?._id || '');
  const [remark, setRemark] = useState('');
  const [moreInfo, setMoreInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('status');

  const handleSave = async () => {
    setSaving(true);
    const payload = {};
    if (newStatus !== complaint.status) {
      payload.status = newStatus;
      payload.timelineEntry = { status: newStatus, title: `Status changed to ${newStatus}`, description: `Admin updated status.` };
    }
    if (newPriority !== complaint.priority) payload.priority = newPriority;
    if (workerID !== (complaint.assignedWorker?._id || '')) payload.assignedWorker = workerID || null;
    if (deptID !== (complaint.assignedDepartment?._id || '')) payload.assignedDepartment = deptID || null;
    if (remark.trim()) payload.remarks = remark.trim();
    if (moreInfo.trim()) { payload.moreInfoRequested = true; payload.moreInfoText = moreInfo; }

    try {
      const res = await complaintsAdminApi.update(complaint._id, payload);
      onUpdate(res.data.complaint || res.data);
      setRemark('');
      setMoreInfo('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update complaint on server');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'status', label: 'Status & Priority', icon: ArrowUpDown },
    { id: 'assign', label: 'Assign', icon: UserCheck },
    { id: 'remarks', label: 'Remarks', icon: MessageSquare },
    { id: 'more', label: 'Request Info', icon: Info },
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="p-4 border-b border-white/8">
        <h2 className="text-sm font-semibold text-white">Admin Actions</h2>
      </div>
      
      {/* Section tabs */}
      <div className="flex border-b border-white/8">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${activeSection === s.id ? 'text-brand-400 border-b-2 border-brand-500' : 'text-surface-400 hover:text-surface-200'}`}>
            <s.icon size={12} /> <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {activeSection === 'status' && (
          <>
            <div>
              <label className="text-xs text-surface-400 mb-1.5 block">Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-700/60 border border-surface-600/50 text-white text-sm">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1.5 block">Priority</label>
              <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-700/60 border border-surface-600/50 text-white text-sm">
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </>
        )}

        {activeSection === 'assign' && (
          <>
            <div>
              <label className="text-xs text-surface-400 mb-1.5 block">Assign Department</label>
              <select value={deptID} onChange={e => setDeptID(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-700/60 border border-surface-600/50 text-white text-sm">
                <option value="">None</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-surface-400 mb-1.5 block">Assign Worker</label>
              <select value={workerID} onChange={e => setWorkerID(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-700/60 border border-surface-600/50 text-white text-sm">
                <option value="">None</option>
                {workers.map(w => <option key={w._id} value={w._id}>{w.name} ({w.status})</option>)}
              </select>
            </div>
          </>
        )}

        {activeSection === 'remarks' && (
          <div>
            <label className="text-xs text-surface-400 mb-1.5 block">Add Remark</label>
            <textarea value={remark} onChange={e => setRemark(e.target.value)} rows={4} placeholder="Write an official remark..."
              className="w-full px-3 py-2 rounded-xl bg-surface-700/60 border border-surface-600/50 text-white text-sm placeholder-surface-500 resize-none" />
          </div>
        )}

        {activeSection === 'more' && (
          <div>
            <label className="text-xs text-surface-400 mb-1.5 block">Request More Information</label>
            <textarea value={moreInfo} onChange={e => setMoreInfo(e.target.value)} rows={4} placeholder="Specify what additional info is needed from citizen..."
              className="w-full px-3 py-2 rounded-xl bg-surface-700/60 border border-surface-600/50 text-white text-sm placeholder-surface-500 resize-none" />
          </div>
        )}

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-accent-violet text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-glow hover:shadow-glow-lg transition-all disabled:opacity-60">
          {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><Send size={14} /> Apply Changes</>}
        </motion.button>
      </div>
    </div>
  );
};

export const AdminComplaintDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchComplaint = async () => {
    try {
      const [cRes, wRes, dRes] = await Promise.all([
        complaintsAdminApi.getById(id),
        workersAdminApi.getAll().catch(() => ({ data: [] })),
        departmentsAdminApi.getAll().catch(() => ({ data: [] }))
      ]);
      setComplaint(cRes.data);
      setWorkers(Array.isArray(wRes.data) ? wRes.data : []);
      setDepartments(Array.isArray(dRes.data) ? dRes.data : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load complaint details from server.');
      setComplaint(null);
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchComplaint().finally(() => setLoading(false));
    }
  }, [id]);

  const handleApproveResolution = async () => {
    if (!window.confirm('Are you sure you want to approve this field resolution and mark the complaint as Resolved?')) return;
    setVerifying(true);
    try {
      const res = await complaintsAdminApi.approveResolution(id);
      if (res.data?.complaint) setComplaint(res.data.complaint);
      else await fetchComplaint();
      alert('Resolution approved successfully. Complaint is now Resolved.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve resolution');
    } finally {
      setVerifying(false);
    }
  };

  const handleRejectResolution = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;
    setVerifying(true);
    try {
      const res = await complaintsAdminApi.rejectResolution(id, { rejectionReason: rejectionReason.trim() });
      if (res.data?.complaint) setComplaint(res.data.complaint);
      else await fetchComplaint();
      setRejectModalOpen(false);
      setRejectionReason('');
      alert('Resolution rejected. Task returned to In Progress for worker rework.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject resolution');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <div className="w-8 h-8 border-3 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-xs text-surface-400">Loading complaint intelligence...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 inline-block">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-lg font-bold text-white">Complaint Not Found</h2>
        <p className="text-xs text-surface-400 leading-relaxed">
          {error || 'Unable to retrieve complaint record from database.'}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => { setLoading(true); fetchComplaint().finally(() => setLoading(false)); }}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition-all"
          >
            Retry Fetch
          </button>
          <button
            onClick={() => navigate('/government/complaints')}
            className="px-4 py-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-xl text-xs font-bold transition-all"
          >
            Return to Complaints
          </button>
        </div>
      </div>
    );
  }

  const TLIcon = timelineIcons[complaint.status] || Clock;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/admin/complaints')}
        className="flex items-center gap-2 text-surface-400 hover:text-white transition-colors text-sm">
        <ArrowLeft size={16} /> Back to Complaints
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Main Info */}
        <div className="xl:col-span-2 space-y-5">
          {/* Header Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex flex-wrap gap-3 items-start justify-between mb-3">
              <div>
                <p className="text-xs text-surface-500 font-mono mb-1">#{complaint._id?.slice(-8).toUpperCase()}</p>
                <h1 className="text-xl font-bold text-white">{complaint.title}</h1>
                <p className="text-surface-400 text-sm mt-1 flex items-center gap-1.5"><MapPin size={13} /> {complaint.address}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-xl text-xs font-semibold border ${priorityColors[complaint.priority]}`}>{complaint.priority}</span>
                <span className={`px-3 py-1 rounded-xl text-xs font-semibold ${statusColors[complaint.status]}`}>{complaint.status}</span>
              </div>
            </div>
            {complaint.images?.[0] && (
              <img src={complaint.images[0]} alt="Complaint" className="w-full h-48 object-cover rounded-xl mt-3" />
            )}
            <p className="text-surface-300 text-sm mt-4 leading-relaxed">{complaint.description}</p>
          </motion.div>

          {/* AI DECISION SUPPORT & SMART PRIORITIZATION */}
          {complaint.decisionSupport && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
              className="p-5 rounded-2xl relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(35,18,65,0.85) 0%, rgba(18,10,32,0.95) 100%)', border: '1px solid rgba(168,85,247,0.35)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
              
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-glow">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      AI Municipal Decision Support
                    </h2>
                    <p className="text-[11px] text-surface-400">Dynamic operational priority scoring and response guidance</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const res = await complaintsAdminApi.getById(complaint._id);
                        setComplaint(res.data);
                      } catch {}
                    }}
                    className="p-1.5 rounded-lg bg-surface-800/80 text-brand-300 hover:bg-brand-500/10 border border-brand-500/30 text-xs transition-all"
                    title="Refresh AI Score"
                  >
                    <RefreshCw size={12} />
                  </button>
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                    complaint.decisionSupport.priorityLevel === 'Critical' ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-red-500/20 shadow-sm' :
                    complaint.decisionSupport.priorityLevel === 'High' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                    complaint.decisionSupport.priorityLevel === 'Medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {complaint.decisionSupport.priorityLevel?.toUpperCase()} PRIORITY
                  </span>
                </div>
              </div>

              {/* Main Score Bar & Level Banner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 rounded-xl bg-surface-900/60 border border-white/5">
                <div className="flex flex-col justify-center">
                  <span className="text-xs text-surface-400 mb-0.5">Government Priority Score</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">{complaint.decisionSupport.priorityScore}</span>
                    <span className="text-sm text-surface-400 font-medium">/ 100</span>
                  </div>
                  <div className="w-full bg-surface-800 h-2 rounded-full mt-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        complaint.decisionSupport.priorityScore >= 80 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                        complaint.decisionSupport.priorityScore >= 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                        complaint.decisionSupport.priorityScore >= 40 ? 'bg-gradient-to-r from-blue-500 to-yellow-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, complaint.decisionSupport.priorityScore))}%` }}
                    />
                  </div>
                </div>

                <div className="md:col-span-2 flex flex-col justify-center pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0">
                  <span className="text-[10px] text-brand-300 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Recommended Action
                  </span>
                  <p className="text-white text-xs font-semibold leading-relaxed">
                    {complaint.decisionSupport.recommendedAction}
                  </p>
                </div>
              </div>

              {/* Explainability Breakdown Factors */}
              <div className="mb-4">
                <p className="text-[11px] text-surface-400 font-medium uppercase tracking-wider mb-2">
                  Explainability &amp; Factor Breakdown
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-surface-400 text-[10px] block mb-0.5">Priority Weight</span>
                    <p className="font-bold text-white text-xs">
                      {complaint.decisionSupport.breakdown?.priorityContribution ?? 12.5} <span className="text-surface-500 font-normal">/ 25</span>
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-surface-400 text-[10px] block mb-0.5">Severity Weight</span>
                    <p className="font-bold text-white text-xs">
                      {complaint.decisionSupport.breakdown?.severityContribution ?? 12.5} <span className="text-surface-500 font-normal">/ 25</span>
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-surface-400 text-[10px] block mb-0.5">Citizen Impact</span>
                    <p className="font-bold text-violet-300 text-xs">
                      {complaint.decisionSupport.breakdown?.impactContribution ?? 4} <span className="text-surface-500 font-normal">/ 20</span>
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-surface-400 text-[10px] block mb-0.5">Complaint Age</span>
                    <p className="font-bold text-white text-xs">
                      {complaint.decisionSupport.breakdown?.ageContribution ?? 2} <span className="text-surface-500 font-normal">/ 10</span>
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-surface-400 text-[10px] block mb-0.5">Duplicate Factor</span>
                    <p className="font-bold text-amber-300 text-xs">
                      {complaint.decisionSupport.breakdown?.duplicateContribution ?? 0} <span className="text-surface-500 font-normal">/ 10</span>
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-surface-400 text-[10px] block mb-0.5">Urgency &amp; Safety</span>
                    <p className="font-bold text-red-300 text-xs">
                      {complaint.decisionSupport.breakdown?.urgencyContribution ?? 2} <span className="text-surface-500 font-normal">/ 10</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Explanation */}
              {complaint.decisionSupport.explanation && (
                <div className="p-3 rounded-xl bg-surface-900/80 border border-brand-500/20 text-xs">
                  <p className="text-brand-300 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                    <Sparkles size={11} /> AI Decision Explanation
                  </p>
                  <p className="text-surface-200 leading-relaxed italic">
                    "{complaint.decisionSupport.explanation}"
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* AI Analysis Card */}
          {complaint.aiAnalysis && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="p-5 rounded-2xl" style={{ background: 'rgba(25,16,39,0.7)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-brand-400" />
                  <h2 className="text-sm font-semibold text-white">AI Complaint Intelligence</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                    AI Confidence: {Math.round((complaint.aiAnalysis.confidence || 0) * 100)}%
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-surface-300 border border-white/10">
                    {complaint.aiAnalysis.classificationSource || 'AI Recommended'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-surface-400 text-[10px] uppercase">Category</p>
                  <p className="text-white font-semibold mt-0.5">{complaint.aiAnalysis.category || complaint.category}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-surface-400 text-[10px] uppercase">Department</p>
                  <p className="text-white font-semibold mt-0.5">{complaint.aiAnalysis.department || complaint.department}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-surface-400 text-[10px] uppercase">Priority</p>
                  <p className="text-white font-semibold mt-0.5">{complaint.aiAnalysis.priority || complaint.priority}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-surface-400 text-[10px] uppercase">Severity</p>
                  <p className="text-purple-300 font-semibold mt-0.5">{complaint.aiAnalysis.severity || 'Medium'}</p>
                </div>
              </div>
              {complaint.aiAnalysis.summary && (
                <div className="text-xs bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-surface-400 text-[10px] uppercase mb-1">AI Summary</p>
                  <p className="text-surface-200 italic">"{complaint.aiAnalysis.summary}"</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Related Duplicate Reports (Group Impact) */}
          {(complaint.duplicateCount > 1 || complaint.relatedDuplicates?.length > 0 || complaint.duplicateOf) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="p-5 rounded-2xl" style={{ background: 'rgba(25,16,39,0.7)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-amber-400" />
                  <h2 className="text-sm font-semibold text-white">Duplicate Reports Cluster</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Users size={12} /> {complaint.duplicateCount || (complaint.relatedDuplicates?.length || 0) + 1} citizens reported this issue
                </span>
              </div>
              <p className="text-xs text-surface-300 mb-3">
                Multiple citizens have reported this matching civic issue. High impact cluster.
              </p>
              {complaint.relatedDuplicates?.length > 0 && (
                <div className="space-y-2">
                  {complaint.relatedDuplicates.map((dup) => (
                    <div key={dup._id} className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-brand-400 font-semibold">#{dup.complaintId || dup._id.slice(-8).toUpperCase()}</span>
                        <span className="text-white font-medium truncate max-w-xs">{dup.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusColors[dup.status] || 'text-surface-400'}`}>{dup.status}</span>
                        <Link to={`/admin/complaints/${dup._id}`} className="text-brand-400 hover:underline text-[11px]">View</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Citizen Details */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="p-5 rounded-2xl" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-sm font-semibold text-white mb-3">Citizen Details</h2>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center text-white font-bold">
                {complaint.citizen?.name?.charAt(0)}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{complaint.citizen?.name}</p>
                <p className="text-surface-400 text-xs">{complaint.citizen?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {complaint.citizen?.email && (
                <div className="flex items-center gap-2 text-xs text-surface-400">
                  <Mail size={13} className="text-brand-400" /> {complaint.citizen.email}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-surface-400">
                <Building2 size={13} className="text-brand-400" /> {complaint.department}
              </div>
            </div>
          </motion.div>

          {/* FIELD WORK & RESOLUTION VERIFICATION */}
          {(complaint.assignedWorker || complaint.fieldWork || complaint.resolution?.notes || complaint.status === 'Resolution Pending Verification') && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
              className="p-5 rounded-2xl space-y-4"
              style={{
                background: complaint.status === 'Resolution Pending Verification' ? 'rgba(45, 25, 60, 0.85)' : 'rgba(25,16,39,0.6)',
                border: complaint.status === 'Resolution Pending Verification' ? '1.5px solid rgba(234, 179, 8, 0.5)' : '1px solid rgba(255,255,255,0.07)'
              }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-amber-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Field Work &amp; Resolution Verification</h2>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  complaint.status === 'Resolution Pending Verification' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' :
                  complaint.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                }`}>
                  {complaint.status}
                </span>
              </div>

              {/* Worker & Milestones */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-surface-400 uppercase block">Operative</span>
                  <p className="font-bold text-white truncate">{complaint.assignedWorker?.name || 'Assigned'}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-surface-400 uppercase block">Accepted At</span>
                  <p className="font-bold text-surface-200">{complaint.fieldWork?.acceptedAt ? new Date(complaint.fieldWork.acceptedAt).toLocaleDateString() : 'Pending'}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-surface-400 uppercase block">Work Started</span>
                  <p className="font-bold text-surface-200">{complaint.fieldWork?.startedAt ? new Date(complaint.fieldWork.startedAt).toLocaleDateString() : 'Pending'}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-surface-400 uppercase block">Submitted At</span>
                  <p className="font-bold text-amber-300">{complaint.fieldWork?.resolutionSubmittedAt ? new Date(complaint.fieldWork.resolutionSubmittedAt).toLocaleDateString() : 'Pending'}</p>
                </div>
              </div>

              {/* Worker Completion Notes */}
              {complaint.resolution?.notes && (
                <div className="p-3 rounded-xl bg-[#0d1117] border border-surface-700 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">Field Worker Resolution Notes:</span>
                  <p className="text-white italic leading-relaxed">"{complaint.resolution.notes}"</p>
                </div>
              )}

              {/* Evidence Gallery */}
              {complaint.evidence?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-surface-400 uppercase block">Field Work Evidence:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {complaint.evidence.map((ev, i) => (
                      <div key={i} className="p-2 rounded-xl bg-white/5 border border-white/5 space-y-1">
                        <span className="text-[9px] font-bold uppercase text-amber-300 block">{ev.type} Work</span>
                        <div className="h-20 bg-surface-900 rounded-lg overflow-hidden flex items-center justify-center">
                          {ev.url.startsWith('http') || ev.url.startsWith('data:') ? (
                            <img src={ev.url} alt={ev.type} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-surface-400 font-mono px-1 truncate">{ev.url}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Government Verification Actions */}
              {complaint.status === 'Resolution Pending Verification' && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Clock size={16} /> ACTION REQUIRED: Field resolution submitted. Verify evidence and take municipal decision:
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleApproveResolution}
                      disabled={verifying}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} /> Approve Resolution &amp; Mark Resolved
                    </button>
                    <button
                      onClick={() => setRejectModalOpen(true)}
                      disabled={verifying}
                      className="flex-1 py-2.5 bg-red-600/30 hover:bg-red-600/40 text-red-300 border border-red-500/40 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <XCircle size={15} /> Reject Resolution (Require Rework)
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* PHASE 7: SLA STATUS & TIMELINESS CARD */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}
            className="p-5 rounded-2xl space-y-3"
            style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-cyan-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">SLA Monitoring &amp; Timeliness</h2>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                complaint.sla?.status === 'Breached' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                complaint.sla?.status === 'At Risk' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' :
                complaint.sla?.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              }`}>
                {complaint.sla?.status || 'Within SLA'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-surface-400 uppercase block">Target Window</span>
                <p className="font-bold text-white">{complaint.sla?.targetHours || (complaint.priority === 'Emergency' ? 4 : 48)} Hours</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-surface-400 uppercase block">Elapsed Time</span>
                <p className="font-bold text-surface-200">{complaint.sla?.elapsedHours || 0} Hours</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-surface-400 uppercase block">Deadline</span>
                <p className="font-bold text-surface-200">
                  {complaint.sla?.deadline ? new Date(complaint.sla.deadline).toLocaleDateString() : 'Set by Priority'}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-surface-400 uppercase block">Compliance State</span>
                <p className={`font-bold ${complaint.sla?.status === 'Breached' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {complaint.sla?.status === 'Breached' ? 'Breached' : 'Compliant'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* PHASE 7: CITIZEN FEEDBACK & OUTCOME */}
          {complaint.citizenFeedback?.rating && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
              className="p-5 rounded-2xl space-y-3"
              style={{ background: 'rgba(25,16,39,0.7)', border: '1px solid rgba(234,179,8,0.35)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-yellow-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Citizen Feedback &amp; Verification</h2>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <span key={s} className={`text-xs ${s <= complaint.citizenFeedback.rating ? 'text-yellow-400' : 'text-surface-600'}`}>★</span>
                  ))}
                  <span className="text-xs font-bold text-white ml-1">{complaint.citizenFeedback.rating}/5</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0d1117] border border-surface-700 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-surface-400 uppercase">Citizen Confirmation:</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    complaint.citizenFeedback.resolvedByCitizen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {complaint.citizenFeedback.resolvedByCitizen ? '✓ Confirmed Resolved' : '✗ Issue Marked Unresolved'}
                  </span>
                </div>
                {complaint.citizenFeedback.comment && (
                  <p className="text-white italic">"{complaint.citizenFeedback.comment}"</p>
                )}
                <span className="text-[10px] text-surface-500 block pt-1">
                  Submitted on {new Date(complaint.citizenFeedback.submittedAt || Date.now()).toLocaleString()}
                </span>
              </div>
            </motion.div>
          )}

          {/* PHASE 7: AI RESOLUTION QUALITY ENGINE */}
          {complaint.resolutionQuality?.score && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="p-5 rounded-2xl space-y-4"
              style={{ background: 'linear-gradient(135deg, rgba(30,15,55,0.85) 0%, rgba(15,8,30,0.95) 100%)', border: '1px solid rgba(147,51,234,0.35)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">AI Resolution Quality Audit</h2>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  complaint.resolutionQuality.level === 'Excellent' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                  complaint.resolutionQuality.level === 'Good' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                  complaint.resolutionQuality.level === 'Needs Review' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                  'bg-red-500/20 text-red-300 border-red-500/40'
                }`}>
                  {complaint.resolutionQuality.level} Quality
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-surface-400 block uppercase">Overall Score</span>
                  <p className="font-extrabold text-white text-base">{complaint.resolutionQuality.score} <span className="text-xs text-surface-500 font-normal">/ 100</span></p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-surface-400 block uppercase">Evidence Quality</span>
                  <p className="font-bold text-cyan-300">{complaint.resolutionQuality.evidenceScore ?? 25} / 25</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-surface-400 block uppercase">Citizen Outcome</span>
                  <p className="font-bold text-amber-300">{complaint.resolutionQuality.feedbackScore ?? 25} / 25</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-surface-400 block uppercase">Work Detail</span>
                  <p className="font-bold text-emerald-300">{complaint.resolutionQuality.completionScore ?? 25} / 25</p>
                </div>
              </div>

              {complaint.resolutionQuality.aiExplanation && (
                <div className="p-3 rounded-xl bg-surface-900/80 border border-purple-500/20 text-xs">
                  <p className="text-purple-300 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                    <Sparkles size={11} /> AI Quality Assessment
                  </p>
                  <p className="text-surface-200 leading-relaxed italic">"{complaint.resolutionQuality.aiExplanation}"</p>
                </div>
              )}
            </motion.div>
          )}

          {/* PHASE 7: ESCALATION AUDIT */}
          {complaint.escalation?.isEscalated && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
              className="p-5 rounded-2xl bg-red-500/10 border border-red-500/40 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-red-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={15} /> Escalated to: {complaint.escalation.level}
                </span>
                <span className="text-[10px] text-surface-400">
                  {new Date(complaint.escalation.escalatedAt || Date.now()).toLocaleDateString()}
                </span>
              </div>
              <p className="text-white font-medium">{complaint.escalation.reason}</p>
            </motion.div>
          )}

          {/* Timeline */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
            className="p-5 rounded-2xl" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="text-sm font-semibold text-white mb-3">Timeline</h2>
            <div className="relative pl-4">
              <div className="absolute left-0 top-2 bottom-2 w-px bg-white/10" />
              {(complaint.timeline || []).map((t, i) => {
                const Icon = timelineIcons[t.status] || Clock;
                const color = timelineColors[t.status] || 'text-surface-400 border-surface-500/50';
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                    className="relative pl-6 pb-5 last:pb-0">
                    <div className={`absolute left-0 -translate-x-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-surface-900 ${color}`}>
                      <Icon size={10} />
                    </div>
                    <p className="text-white text-sm font-semibold">{t.title}</p>
                    <p className="text-surface-400 text-xs">{t.description}</p>
                    <p className="text-surface-600 text-xs mt-0.5">{new Date(t.createdAt).toLocaleString()}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Remarks */}
          {complaint.remarks?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="p-5 rounded-2xl" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="text-sm font-semibold text-white mb-3">Admin Remarks</h2>
              <div className="space-y-3">
                {complaint.remarks.map((r, i) => (
                  <div key={i} className="p-3 rounded-xl bg-surface-800/50 border border-surface-700/50">
                    <p className="text-xs font-semibold text-brand-400">{r.author}</p>
                    <p className="text-sm text-surface-200 mt-1">{r.text}</p>
                    <p className="text-xs text-surface-600 mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <ActionPanel complaint={complaint} workers={workers} departments={departments} onUpdate={setComplaint} />
          </motion.div>

          {/* Assigned Worker */}
          {complaint.assignedWorker && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
              className="p-4 rounded-2xl" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-3">Assigned Worker</h2>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                  {complaint.assignedWorker.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{complaint.assignedWorker.name}</p>
                  <p className="text-surface-400 text-xs">{complaint.assignedWorker.contact}</p>
                </div>
                <span className={`ml-auto px-2 py-0.5 rounded-lg text-xs ${complaint.assignedWorker.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400' : complaint.assignedWorker.status === 'Busy' ? 'bg-orange-500/20 text-orange-400' : 'bg-surface-700 text-surface-400'}`}>
                  {complaint.assignedWorker.status}
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* REJECT RESOLUTION MODAL */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-red-500/40 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <XCircle size={18} className="text-red-400" /> Reject Resolution &amp; Require Rework
              </h3>
              <button onClick={() => setRejectModalOpen(false)} className="text-surface-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-surface-300 leading-relaxed">
              Please specify the technical deficiency or rework required. The task will be returned to <strong>In Progress</strong> and assigned back to the operative.
            </p>

            <form onSubmit={handleRejectResolution} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-surface-300 uppercase mb-1">Rejection Reason (Required)</label>
                <textarea
                  required
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Repair evidence is incomplete. Debris still blocks the pedestrian walkway. Please revisit site."
                  className="w-full px-3 py-2 bg-[#0d1117] border border-surface-700 rounded-xl text-white text-xs focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="flex-1 py-2.5 bg-surface-800 text-surface-300 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs shadow disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
