import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, MapPin, Navigation, ArrowLeft, Clock, CheckCircle2,
  AlertTriangle, Upload, FileText, Send, Camera, ShieldCheck, Flame, X, RefreshCw
} from 'lucide-react';
import { workerApi } from '../../services/workerApi';

export const WorkerTaskDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Evidence modal state
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceType, setEvidenceType] = useState('before');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  // Resolution modal state
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionAfterUrl, setResolutionAfterUrl] = useState('');

  const fetchTask = async () => {
    setLoading(true);
    try {
      const res = await workerApi.getTaskById(id);
      if (res.data?.success) {
        setTask(res.data.task);
      } else {
        setError(res.data?.message || 'Task not found');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unauthorized or task does not exist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, [id]);

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await workerApi.acceptTask(id);
      await fetchTask();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await workerApi.startTask(id);
      await fetchTask();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start field work');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceUrl.trim()) return;
    setActionLoading(true);
    try {
      await workerApi.uploadEvidence(id, { type: evidenceType, url: evidenceUrl.trim() });
      setShowEvidenceModal(false);
      setEvidenceUrl('');
      await fetchTask();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload evidence');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitResolution = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) return;
    setActionLoading(true);
    try {
      const payload = { notes: resolutionNotes.trim() };
      if (resolutionAfterUrl.trim()) {
        payload.evidence = [{ type: 'after', url: resolutionAfterUrl.trim() }];
      }
      await workerApi.submitResolution(id, payload);
      setShowResolutionModal(false);
      setResolutionNotes('');
      setResolutionAfterUrl('');
      await fetchTask();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit resolution');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-surface-400 text-sm">Loading task details...</div>;
  }

  if (error || !task) {
    return (
      <div className="p-8 rounded-2xl bg-[#161b22] border border-red-500/30 text-center space-y-3">
        <AlertTriangle size={32} className="mx-auto text-red-400" />
        <p className="text-white font-bold text-sm">{error || 'Task Unavailable'}</p>
        <Link to="/worker/tasks" className="text-xs text-amber-400 font-bold underline">Return to Task List</Link>
      </div>
    );
  }

  const mapUrl = task.latitude && task.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${task.latitude},${task.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.address + ' ' + (task.landmark || ''))}`;

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
    <div className="space-y-6 max-w-4xl">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link to="/worker/tasks" className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-white font-bold">
          <ArrowLeft size={16} /> Back to Tasks
        </Link>
        <button onClick={fetchTask} className="p-2 bg-surface-800 rounded-xl text-surface-300 hover:text-white">
          <RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Rejection Alert if present */}
      {task.resolution?.status === 'Rejected' && task.resolution?.rejectionReason && (
        <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/40 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-red-400">
            <AlertTriangle size={16} /> REWORK REQUIRED BY ADMINISTRATION
          </div>
          <p className="text-xs text-surface-200">
            Reason: <span className="font-semibold text-white">{task.resolution.rejectionReason}</span>
          </p>
        </div>
      )}

      {/* Main Task Header Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#161b22] border border-surface-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
            {task.complaintId}
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${priorityBadgeColor[task.priority] || priorityBadgeColor.Medium}`}>
              {task.priority} Priority
            </span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${statusBadgeColor[task.status] || statusBadgeColor.Assigned}`}>
              {task.status}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-xl font-black text-white">{task.title}</h1>
          <p className="text-xs text-amber-400 font-semibold mt-0.5">{task.category} • {task.department}</p>
          <p className="text-sm text-surface-300 mt-2 leading-relaxed">{task.description}</p>
        </div>

        {/* Location & Navigation */}
        <div className="p-4 rounded-2xl bg-[#0d1117] border border-surface-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2.5 min-w-0">
            <MapPin size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white leading-tight">{task.address}</p>
              {task.landmark && <p className="text-[11px] text-surface-400">Landmark: {task.landmark}</p>}
              {task.latitude && task.longitude ? (
                <p className="text-[10px] text-surface-500 font-mono mt-0.5">GPS: {task.latitude}, {task.longitude}</p>
              ) : (
                <p className="text-[10px] text-surface-500 mt-0.5">GPS coordinates unavailable</p>
              )}
            </div>
          </div>

          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all shrink-0"
          >
            <Navigation size={14} /> Open Location / GPS
          </a>
        </div>

        {/* AI Operational Guidance */}
        {task.decisionSupport && (
          <div className="p-4 rounded-2xl bg-surface-900 border border-surface-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame size={14} /> AI Municipal Priority Score
              </span>
              <span className="font-black text-white">{task.decisionSupport.priorityScore}/100 ({task.decisionSupport.priorityLevel})</span>
            </div>
            {task.decisionSupport.recommendedAction && (
              <p className="text-xs text-surface-300">
                <strong className="text-surface-100">Recommended Action:</strong> {task.decisionSupport.recommendedAction}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ACTION CONTROLS */}
      <div className="p-5 rounded-3xl bg-[#161b22] border border-surface-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Field Operations Actions</h2>

        {task.status === 'Assigned' && (
          <div className="space-y-2">
            <p className="text-xs text-surface-400">Review task information and accept this assignment to begin scheduling work.</p>
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50"
            >
              <CheckSquare size={16} /> Accept Assignment &amp; Start Work
            </button>
          </div>
        )}

        {task.status === 'In Progress' && (
          <div className="space-y-3">
            {!task.fieldWork?.startedAt ? (
              <button
                onClick={handleStart}
                disabled={actionLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow disabled:opacity-50"
              >
                <Clock size={16} /> Record Arrival / Start Field Work
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2">
                <Clock size={14} /> Field work started on: {new Date(task.fieldWork.startedAt).toLocaleString()}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => { setEvidenceType('before'); setShowEvidenceModal(true); }}
                className="py-3 px-4 bg-surface-800 hover:bg-surface-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 border border-surface-700"
              >
                <Camera size={15} className="text-amber-400" /> Upload Work Evidence
              </button>

              <button
                onClick={() => setShowResolutionModal(true)}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg"
              >
                <Send size={15} /> Submit Resolution
              </button>
            </div>
          </div>
        )}

        {task.status === 'Resolution Pending Verification' && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1.5">
            <Clock size={24} className="mx-auto text-amber-400" />
            <p className="text-white font-bold text-sm">Resolution Submitted</p>
            <p className="text-xs text-surface-400">Work completion notes and evidence have been submitted. Waiting for Government verification.</p>
          </div>
        )}

        {task.status === 'Resolved' && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1.5">
            <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
            <p className="text-white font-bold text-sm">Task Verified &amp; Resolved</p>
            <p className="text-xs text-surface-400">Government administration verified the resolution. Task completed.</p>
          </div>
        )}
      </div>

      {/* EVIDENCE GALLERY */}
      <div className="p-5 rounded-3xl bg-[#161b22] border border-surface-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Camera size={16} className="text-amber-400" /> Work Evidence ({task.evidence?.length || 0})
          </h2>
          {task.status === 'In Progress' && (
            <button
              onClick={() => setShowEvidenceModal(true)}
              className="text-xs text-amber-400 hover:underline font-bold"
            >
              + Add Evidence
            </button>
          )}
        </div>

        {(!task.evidence || task.evidence.length === 0) ? (
          <p className="text-xs text-surface-500 italic">No work evidence recorded yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {task.evidence.map((ev, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-[#0d1117] border border-surface-800 space-y-2">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  ev.type === 'before' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {ev.type} Work
                </span>
                <div className="h-24 bg-surface-900 rounded-xl overflow-hidden flex items-center justify-center border border-surface-800">
                  {ev.url.startsWith('http') || ev.url.startsWith('data:') ? (
                    <img src={ev.url} alt={ev.type} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-surface-400 font-mono px-2 truncate">{ev.url}</span>
                  )}
                </div>
                <p className="text-[10px] text-surface-500">{new Date(ev.uploadedAt).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TIMELINE */}
      <div className="p-5 rounded-3xl bg-[#161b22] border border-surface-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Clock size={16} className="text-amber-400" /> Operational Timeline
        </h2>
        <div className="space-y-3">
          {task.timeline?.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 text-xs border-l-2 border-surface-700 pl-3 py-1">
              <div>
                <p className="font-bold text-white">{item.title}</p>
                <p className="text-surface-400 mt-0.5">{item.description}</p>
                <p className="text-[10px] text-surface-500 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EVIDENCE UPLOAD MODAL */}
      {showEvidenceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-surface-700 rounded-3xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Add Work Evidence</h3>
              <button onClick={() => setShowEvidenceModal(false)} className="text-surface-400 hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={handleAddEvidence} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-surface-300 mb-1.5 uppercase">Evidence Stage</label>
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-surface-700 rounded-xl text-white text-xs focus:border-amber-500 focus:outline-none"
                >
                  <option value="before">Before Work Photo</option>
                  <option value="after">After Work Photo</option>
                  <option value="general">General Site Evidence</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-300 mb-1.5 uppercase">Evidence URL or Photo Reference</label>
                <input
                  type="text"
                  required
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://... or photo_ref_01.jpg"
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-surface-700 rounded-xl text-white text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="flex-1 py-2.5 bg-surface-800 text-surface-300 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs shadow"
                >
                  Save Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLUTION SUBMISSION MODAL */}
      {showResolutionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-surface-700 rounded-3xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Submit Field Resolution</h3>
              <button onClick={() => setShowResolutionModal(false)} className="text-surface-400 hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmitResolution} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-surface-300 mb-1.5 uppercase">Work Completion Notes (Required)</label>
                <textarea
                  required
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Detailed description of repairs completed, materials used, and site conditions..."
                  className="w-full px-3 py-2 bg-[#0d1117] border border-surface-700 rounded-xl text-white text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-surface-300 mb-1.5 uppercase">After-Work Photo URL (Optional)</label>
                <input
                  type="text"
                  value={resolutionAfterUrl}
                  onChange={(e) => setResolutionAfterUrl(e.target.value)}
                  placeholder="https://... photo link of finished repair"
                  className="w-full px-3 py-2 bg-[#0d1117] border border-surface-700 rounded-xl text-white text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                ⚠️ This task will be sent to the municipal administration for formal verification before being marked as resolved.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolutionModal(false)}
                  className="flex-1 py-2.5 bg-surface-800 text-surface-300 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow"
                >
                  Submit for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
