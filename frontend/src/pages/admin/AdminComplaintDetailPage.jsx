import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MapPin, User, Phone, Mail, AlertTriangle,
  CheckCircle2, Clock, XCircle, MessageSquare, UserCheck,
  Building2, ArrowUpDown, Info, ChevronDown, Send, RefreshCw,
  Sparkles, Layers, Users, ShieldCheck, Camera, Trash2, Maximize2,
  Check, X, Eye, ExternalLink, HardHat
} from 'lucide-react';
import { complaintsAdminApi, workersAdminApi, departmentsAdminApi } from '../../services/adminApi';
import { useToast } from '../../components/ui/Toast';

const statusColors = {
  Pending: 'text-yellow-400 bg-yellow-500/15 border border-yellow-500/30',
  Verified: 'text-blue-400 bg-blue-500/15 border border-blue-500/30',
  Assigned: 'text-purple-400 bg-purple-500/15 border border-purple-500/30',
  'In Progress': 'text-cyan-400 bg-cyan-500/15 border border-cyan-500/30',
  'Resolution Pending Verification': 'text-amber-400 bg-amber-500/15 border border-amber-500/30',
  Resolved: 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30',
  SOLVED: 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30',
  Rejected: 'text-red-400 bg-red-500/15 border border-red-500/30'
};
const priorityColors = {
  Low: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  Medium: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  High: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  Emergency: 'text-red-400 bg-red-500/15 border-red-500/30'
};
const timelineIcons = {
  Pending: Clock,
  Verified: CheckCircle2,
  Assigned: UserCheck,
  'In Progress': RefreshCw,
  Resolved: CheckCircle2,
  SOLVED: CheckCircle2,
  Rejected: XCircle
};
const timelineColors = {
  Pending: 'text-yellow-400 border-yellow-500/50',
  Verified: 'text-blue-400 border-blue-500/50',
  Assigned: 'text-purple-400 border-purple-500/50',
  'In Progress': 'text-cyan-400 border-cyan-500/50',
  Resolved: 'text-emerald-400 border-emerald-500/50',
  SOLVED: 'text-emerald-400 border-emerald-500/50',
  Rejected: 'text-red-400 border-red-500/50'
};

const STATUSES = ['Pending', 'Verified', 'Assigned', 'In Progress', 'Rejected'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Emergency'];

const ActionPanel = ({ complaint, workers, departments, onUpdate, onOpenResolve, onMarkInProgress }) => {
  const [newStatus, setNewStatus] = useState(complaint.status === 'Resolved' || complaint.status === 'SOLVED' ? 'In Progress' : complaint.status);
  const [newPriority, setNewPriority] = useState(complaint.priority);
  const [workerID, setWorkerID] = useState(complaint.assignedWorker?._id || '');
  const [deptID, setDeptID] = useState(complaint.assignedDepartment?._id || '');
  const [remark, setRemark] = useState('');
  const [moreInfo, setMoreInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('status');

  const isSolved = complaint.status === 'Resolved' || complaint.status === 'SOLVED';

  const handleSave = async () => {
    setSaving(true);
    const payload = {};
    if (newStatus !== complaint.status && !isSolved) {
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
    <div className="rounded-2xl overflow-hidden space-y-4" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Quick Action Button for Resolution */}
      {!isSolved && (
        <div className="p-4 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-b border-emerald-500/30">
          <p className="text-xs text-emerald-300 font-semibold mb-2">Municipal Resolution Workflow</p>
          <button
            type="button"
            onClick={onOpenResolve}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all"
          >
            <ShieldCheck size={16} /> Resolve / Solve Complaint
          </button>
        </div>
      )}

      <div className="p-4 border-b border-white/8">
        <h2 className="text-sm font-semibold text-white">Admin Operations</h2>
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
              {complaint.status === 'Pending' && (
                <button
                  type="button"
                  onClick={() => onMarkInProgress()}
                  className="w-full mb-2 py-2 px-3 rounded-xl bg-surface-800 hover:bg-surface-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <RefreshCw size={12} /> Change Pending → In Progress
                </button>
              )}
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-700/60 border border-surface-600/50 text-white text-sm">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <p className="text-[10px] text-surface-500 mt-1">To mark as Solved, please use the Resolve Complaint button with proof photo.</p>
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
  const { addToast } = useToast();

  const [complaint, setComplaint] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Solve Modal & Verification State
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [proofImageName, setProofImageName] = useState('');
  const [officerLocation, setOfficerLocation] = useState({ latitude: null, longitude: null, accuracy: null, status: 'idle', error: '' });
  const [isAcquiringLocation, setIsAcquiringLocation] = useState(false);
  const [isVerifyingResolution, setIsVerifyingResolution] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);
  const [resolutionError, setResolutionError] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);
  const fileInputRef = useRef(null);

  const fetchComplaint = async () => {
    try {
      const [cRes, wRes, dRes] = await Promise.all([
        complaintsAdminApi.getById(id),
        workersAdminApi.getAll().catch(() => ({ data: [] })),
        departmentsAdminApi.getAll().catch(() => ({ data: [] }))
      ]);
      setComplaint(cRes.data);
      if (cRes.data?.resolutionVerification) {
        setVerificationResult(cRes.data.resolutionVerification);
      }
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

  const handleMarkInProgress = async () => {
    try {
      const res = await complaintsAdminApi.updateStatus(id, 'In Progress');
      if (res.data?.success) {
        setComplaint(res.data.complaint);
        addToast({ type: 'success', message: 'Complaint status changed to In Progress' });
      }
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to update status.' });
    }
  };

  const handleApproveResolution = async () => {
    if (!window.confirm('Are you sure you want to approve this field resolution and mark the complaint as Resolved?')) return;
    setVerifying(true);
    try {
      const res = await complaintsAdminApi.approveResolution(id);
      if (res.data?.complaint) setComplaint(res.data.complaint);
      else await fetchComplaint();
      addToast({ type: 'success', message: 'Resolution approved successfully. Complaint is now Resolved.' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to approve resolution' });
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
      addToast({ type: 'info', message: 'Resolution rejected. Task returned to In Progress.' });
    } catch (err) {
      addToast({ type: 'error', message: err.response?.data?.message || 'Failed to reject resolution' });
    } finally {
      setVerifying(false);
    }
  };

  // Acquire Officer Current GPS Location
  const acquireOfficerLocation = () => {
    if (!navigator.geolocation) {
      setOfficerLocation({ latitude: null, longitude: null, accuracy: null, status: 'error', error: 'Geolocation not supported by browser' });
      return;
    }

    setIsAcquiringLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOfficerLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          status: 'success',
          error: ''
        });
        setIsAcquiringLocation(false);
      },
      (error) => {
        console.warn('Geolocation acquisition error:', error);
        setOfficerLocation({
          latitude: null,
          longitude: null,
          accuracy: null,
          status: 'error',
          error: error.message || 'GPS location permission denied or timed out'
        });
        setIsAcquiringLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const openResolveModal = () => {
    setResolutionNotes(complaint?.resolution?.notes || '');
    setProofImage(complaint?.resolution?.proofImage || '');
    setProofImageName('');
    setResolutionError('');
    setVerificationResult(complaint?.resolutionVerification || null);
    setIsResolveModalOpen(true);
    acquireOfficerLocation();
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setResolutionError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setResolutionError('Proof image size must not exceed 15MB.');
      return;
    }

    setResolutionError('');
    setProofImageName(file.name);
    setVerificationResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setProofImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Step 1: AI & GPS Verification
  const handleVerifyResolution = async () => {
    if (!resolutionNotes.trim()) {
      setResolutionError('Please enter resolution notes describing the work completed before verifying.');
      return;
    }

    if (!proofImage) {
      setResolutionError('Please upload a resolution proof photo before verifying.');
      return;
    }

    setIsVerifyingResolution(true);
    setResolutionError('');

    try {
      const res = await complaintsAdminApi.verifyResolution(complaint._id, {
        notes: resolutionNotes.trim(),
        proofImage,
        latitude: officerLocation.latitude,
        longitude: officerLocation.longitude
      });

      if (res.data?.success) {
        setVerificationResult(res.data.verification);
        setComplaint(res.data.complaint || complaint);
        if (res.data.verification.status === 'VERIFIED') {
          addToast({ type: 'success', message: 'Resolution verified successfully by AI & GPS!' });
        } else {
          addToast({ type: 'warning', message: `Verification status: ${res.data.verification.status}` });
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      setResolutionError(err.response?.data?.message || 'Resolution verification failed.');
    } finally {
      setIsVerifyingResolution(false);
    }
  };

  // Step 2: Confirm & Solve Complaint
  const handleSubmitResolution = async (e) => {
    e.preventDefault();
    if (!verificationResult || verificationResult.status !== 'VERIFIED') {
      setResolutionError('You must run and pass AI & GPS Resolution Verification before marking this complaint as SOLVED.');
      return;
    }

    setIsSubmittingResolution(true);
    setResolutionError('');

    try {
      const res = await complaintsAdminApi.resolveComplaint(complaint._id, {
        notes: resolutionNotes.trim(),
        proofImage: proofImage
      });

      if (res.data?.success) {
        addToast({ type: 'success', message: 'Complaint marked as SOLVED successfully!' });
        setComplaint(res.data.complaint);
        setIsResolveModalOpen(false);
        setResolutionNotes('');
        setProofImage('');
      }
    } catch (err) {
      setResolutionError(err.response?.data?.message || 'Unable to solve complaint. Please try again.');
    } finally {
      setIsSubmittingResolution(false);
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

  const isSolved = complaint.status === 'Resolved' || complaint.status === 'SOLVED';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Back */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-surface-400 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Back
        </button>

        {!isSolved && (
          <button
            type="button"
            onClick={() => setIsResolveModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition-all"
          >
            <ShieldCheck size={15} /> Resolve Complaint
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Main Info */}
        <div className="xl:col-span-2 space-y-5">
          {/* Header Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex flex-wrap gap-3 items-start justify-between mb-3">
              <div>
                <p className="text-xs text-surface-500 font-mono mb-1">#{complaint.complaintId || complaint._id?.slice(-8).toUpperCase()}</p>
                <h1 className="text-xl font-bold text-white">{complaint.title}</h1>
                <p className="text-surface-400 text-sm mt-1 flex items-center gap-1.5"><MapPin size={13} /> {complaint.address}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-xl text-xs font-semibold border ${priorityColors[complaint.priority]}`}>{complaint.priority}</span>
                <span className={`px-3 py-1 rounded-xl text-xs font-semibold ${statusColors[complaint.status]}`}>
                  {isSolved ? '✓ SOLVED' : complaint.status}
                </span>
              </div>
            </div>
            {complaint.images?.[0] && (
              <div
                onClick={() => setLightboxImage(complaint.images[0])}
                className="relative h-48 rounded-xl overflow-hidden mt-3 cursor-pointer group"
              >
                <img src={complaint.images[0]} alt="Complaint" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Maximize2 size={16} className="text-white" />
                </div>
              </div>
            )}
            <p className="text-surface-300 text-sm mt-4 leading-relaxed">{complaint.description}</p>
          </motion.div>

          {/* SOLVED RESOLUTION CARD */}
          {isSolved && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-300 text-base">✓ SOLVED</h3>
                    <p className="text-xs text-surface-400">
                      Solved by: <strong className="text-white">{complaint.resolution?.solvedBy?.name || 'Government Officer'}</strong> • {complaint.resolution?.solvedAt ? new Date(complaint.resolution.solvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Completed'}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Municipal Verification Complete
                </span>
              </div>

              {complaint.resolution?.notes && (
                <div className="p-3.5 rounded-xl bg-surface-900/80 border border-white/5 text-xs space-y-1">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Resolution Summary:</p>
                  <p className="text-surface-100 italic leading-relaxed">"{complaint.resolution.notes}"</p>
                </div>
              )}

              {complaint.resolution?.proofImage && (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Resolution Proof Evidence:</p>
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => setLightboxImage(complaint.resolution.proofImage)}
                      className="relative w-36 h-24 rounded-xl overflow-hidden border border-emerald-500/40 cursor-pointer group shrink-0"
                    >
                      <img
                        src={complaint.resolution.proofImage}
                        alt="Resolution Proof"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Maximize2 size={16} className="text-white" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLightboxImage(complaint.resolution.proofImage)}
                      className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1.5 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      <Eye size={13} /> View Full Proof Photo
                    </button>
                  </div>
                </div>
              )}

              {/* AI & GPS Verification Audit Details */}
              {complaint.resolutionVerification?.status && (
                <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-500/20 text-xs space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <Sparkles size={12} /> AI & Geolocation Verification
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300">
                      {complaint.resolutionVerification.confidence}% Confidence • {complaint.resolutionVerification.status}
                    </span>
                  </div>
                  {complaint.resolutionVerification.aiReason && (
                    <p className="text-[11px] text-surface-300 italic leading-relaxed">
                      "{complaint.resolutionVerification.aiReason}"
                    </p>
                  )}
                  {complaint.resolutionVerification.distanceMeters !== null && (
                    <p className="text-[10px] text-surface-400 flex items-center gap-1">
                      <MapPin size={11} className="text-brand-400" />
                      Officer GPS was {complaint.resolutionVerification.distanceMeters}m from the complaint site during resolution verification.
                    </p>
                  )}
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
                {complaint.citizen?.name?.charAt(0) || 'C'}
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
        </div>

        {/* Right: Actions */}
        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <ActionPanel
              complaint={complaint}
              workers={workers}
              departments={departments}
              onUpdate={setComplaint}
              onOpenResolve={openResolveModal}
              onMarkInProgress={handleMarkInProgress}
            />
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

      {/* SOLVE COMPLAINT RESOLUTION MODAL WITH AI & GPS VERIFICATION */}
      <AnimatePresence>
        {isResolveModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#190f2b] border border-emerald-500/40 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-white/8 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">AI-Powered Resolution Verification</h3>
                    <p className="text-[11px] text-surface-400 font-mono">#{complaint.complaintId || complaint._id} • {complaint.department}</p>
                  </div>
                </div>
                <button onClick={() => setIsResolveModalOpen(false)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-400 hover:text-white transition-all">
                  <X size={18} />
                </button>
              </div>

              {/* Officer GPS Geolocation Status */}
              <div className="p-3.5 rounded-2xl bg-surface-900/70 border border-white/5 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${officerLocation.status === 'success' ? 'bg-emerald-400 animate-pulse' : officerLocation.status === 'error' ? 'bg-amber-400' : 'bg-cyan-400 animate-ping'}`} />
                  <div>
                    <p className="font-semibold text-white">
                      {officerLocation.status === 'success'
                        ? 'GPS Coordinates Locked'
                        : isAcquiringLocation
                          ? 'Acquiring GPS Coordinates...'
                          : 'GPS Benchmark'}
                    </p>
                    <p className="text-[11px] text-surface-400">
                      {officerLocation.status === 'success'
                        ? `Lat: ${officerLocation.latitude.toFixed(4)}, Lng: ${officerLocation.longitude.toFixed(4)}`
                        : officerLocation.error || 'Acquiring device GPS for location verification'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={acquireOfficerLocation}
                  disabled={isAcquiringLocation}
                  className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white border border-white/10 text-[11px] font-medium flex items-center gap-1 transition-all"
                >
                  <RefreshCw size={11} className={isAcquiringLocation ? 'animate-spin' : ''} />
                  Refresh GPS
                </button>
              </div>

              <form onSubmit={handleSubmitResolution} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-surface-200 uppercase mb-1.5 flex justify-between">
                    <span>1. Resolution Notes <span className="text-red-400">*</span></span>
                    <span className="text-[10px] text-surface-500">Required for AI Context</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={resolutionNotes}
                    onChange={(e) => {
                      setResolutionNotes(e.target.value);
                      if (verificationResult) setVerificationResult(null);
                    }}
                    placeholder="Describe specific field work completed (e.g. Road repaired and pothole filled successfully)..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#120a1f] border border-surface-700 text-white text-xs placeholder-surface-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-surface-200 uppercase mb-1.5 flex justify-between">
                    <span>2. Photographic Proof of Resolution <span className="text-red-400">*</span></span>
                    <span className="text-[10px] text-emerald-400">Gemini Vision AI Verified</span>
                  </label>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    className="hidden"
                  />

                  {proofImage ? (
                    <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-black/40 p-3 flex items-center gap-3">
                      <img
                        src={proofImage}
                        alt="Resolution Proof Preview"
                        className="w-20 h-16 rounded-lg object-cover border border-white/10 shrink-0"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-semibold text-white truncate flex items-center gap-1">
                          <Check size={14} className="text-emerald-400 shrink-0" />
                          {proofImageName || 'Resolution_Proof.jpg'}
                        </p>
                        <p className="text-[11px] text-emerald-400 mt-0.5">Proof photo attached</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setProofImage(''); setProofImageName(''); setVerificationResult(null); }}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/40 transition-all"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-surface-700 hover:border-emerald-500/60 rounded-2xl p-5 text-center cursor-pointer bg-surface-900/30 hover:bg-emerald-500/5 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                        <Camera size={20} />
                      </div>
                      <p className="text-xs font-semibold text-white">Capture / Upload Resolution Proof Photo</p>
                      <p className="text-[10px] text-surface-500 mt-1">Supports PNG, JPG, JPEG, WebP (Max 15MB)</p>
                    </div>
                  )}
                </div>

                {/* STEP 1: Verify Resolution Action Button */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/30 via-brand-900/20 to-surface-900/50 border border-purple-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-purple-400" />
                      Step 1: AI & Location Verification
                    </span>
                    {verificationResult && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        verificationResult.status === 'VERIFIED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : verificationResult.status === 'REVIEW_REQUIRED'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}>
                        {verificationResult.status}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isVerifyingResolution || !proofImage || !resolutionNotes.trim()}
                    onClick={handleVerifyResolution}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all"
                  >
                    {isVerifyingResolution ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Analyzing Proof Photo & GPS Location...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        {verificationResult ? 'Re-Verify Resolution with AI' : 'Verify Resolution (AI & GPS)'}
                      </>
                    )}
                  </button>
                </div>

                {/* AI & GPS Verification Scorecard Card */}
                {verificationResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl border text-xs space-y-3 ${
                      verificationResult.status === 'VERIFIED'
                        ? 'bg-emerald-950/30 border-emerald-500/40'
                        : verificationResult.status === 'REVIEW_REQUIRED'
                          ? 'bg-amber-950/30 border-amber-500/40'
                          : 'bg-red-950/30 border-red-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {verificationResult.status === 'VERIFIED' ? (
                          <CheckCircle2 size={18} className="text-emerald-400" />
                        ) : (
                          <AlertTriangle size={18} className={verificationResult.status === 'REVIEW_REQUIRED' ? 'text-amber-400' : 'text-red-400'} />
                        )}
                        <div>
                          <p className="font-bold text-white text-xs">
                            Verification: <span className={verificationResult.status === 'VERIFIED' ? 'text-emerald-300' : verificationResult.status === 'REVIEW_REQUIRED' ? 'text-amber-300' : 'text-red-300'}>{verificationResult.status}</span>
                          </p>
                          <p className="text-[10px] text-surface-400">
                            {verificationResult.status === 'VERIFIED'
                              ? 'All visual and location safeguards passed.'
                              : 'Requirements not fully met.'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-white">{verificationResult.confidence}%</span>
                        <p className="text-[9px] uppercase tracking-wider text-surface-400">AI Confidence</p>
                      </div>
                    </div>

                    {/* Confidence Meter Bar */}
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          verificationResult.confidence >= 75
                            ? 'bg-gradient-to-r from-teal-400 to-emerald-400'
                            : verificationResult.confidence >= 50
                              ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                              : 'bg-gradient-to-r from-rose-500 to-red-500'
                        }`}
                        style={{ width: `${Math.min(100, verificationResult.confidence)}%` }}
                      />
                    </div>

                    {/* Breakdown Badges */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-black/30 flex items-center justify-between">
                        <span className="text-surface-400">Resolution Evidence:</span>
                        <span className={`font-semibold ${verificationResult.resolutionEvidenceDetected ? 'text-emerald-400' : 'text-red-400'}`}>
                          {verificationResult.resolutionEvidenceDetected ? '✓ Detected' : '✗ Missing'}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/30 flex items-center justify-between">
                        <span className="text-surface-400">Problem Match:</span>
                        <span className={`font-semibold ${verificationResult.matchesComplaint ? 'text-emerald-400' : 'text-red-400'}`}>
                          {verificationResult.matchesComplaint ? '✓ Matched' : '✗ Mismatch'}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/30 flex items-center justify-between">
                        <span className="text-surface-400">Civic Scene:</span>
                        <span className={`font-semibold ${verificationResult.imageRelevant ? 'text-emerald-400' : 'text-red-400'}`}>
                          {verificationResult.imageRelevant ? '✓ Relevant' : '✗ Invalid'}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/30 flex items-center justify-between">
                        <span className="text-surface-400">Location (GPS):</span>
                        <span className={`font-semibold ${verificationResult.locationVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {verificationResult.distanceMeters !== null
                            ? `${verificationResult.distanceMeters}m from site`
                            : verificationResult.locationVerified ? '✓ Verified' : '⚠ Required'}
                        </span>
                      </div>
                    </div>

                    {/* AI Reasoning Summary */}
                    {verificationResult.aiReason && (
                      <p className="text-[11px] text-surface-300 leading-relaxed bg-black/20 p-2.5 rounded-xl border border-white/5 italic">
                        "{verificationResult.aiReason}"
                      </p>
                    )}
                  </motion.div>
                )}

                {resolutionError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{resolutionError}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2 border-t border-white/8">
                  <button
                    type="button"
                    onClick={() => setIsResolveModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-surface-800 text-surface-300 hover:bg-surface-700 text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingResolution || !verificationResult || verificationResult.status !== 'VERIFIED'}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    title={!verificationResult || verificationResult.status !== 'VERIFIED' ? 'Pass AI & GPS verification above first' : 'Confirm & Solve Complaint'}
                  >
                    {isSubmittingResolution ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Finalizing Resolution...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} /> Confirm & Solve Complaint
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX PREVIEW */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
              <img
                src={lightboxImage}
                alt="Full preview"
                className="max-w-full max-h-[85vh] object-contain rounded-xl"
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
