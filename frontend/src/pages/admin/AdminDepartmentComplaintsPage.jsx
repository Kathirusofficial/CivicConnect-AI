import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Filter, RefreshCw, Eye, CheckCircle2,
  Clock, AlertTriangle, Building2, MapPin, User, Calendar,
  ShieldCheck, UploadCloud, X, Camera, Image as ImageIcon,
  Check, ChevronRight, SlidersHorizontal, HardHat, FileText,
  Sparkles, ExternalLink, Maximize2, Zap, Droplets, TrafficCone, Trash2, Activity, Lightbulb, Globe
} from 'lucide-react';
import { departmentsAdminApi, complaintsAdminApi } from '../../services/adminApi';
import { useToast } from '../../components/ui/Toast';

const deptIcons = {
  'Water Supply': Droplets, 'Electricity': Zap, 'Road Department': Activity,
  'Traffic Management': TrafficCone, 'Garbage Collection': Trash2,
  'Drainage': Droplets, 'Street Lights': Lightbulb, 'Municipality': Globe,
};

const priorityColors = {
  Low: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  Medium: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  High: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
  Emergency: 'text-red-400 bg-red-500/15 border-red-500/30'
};

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

export const AdminDepartmentComplaintsPage = () => {
  const { department: deptSlug } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [department, setDepartment] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, solved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // All | Pending | In Progress | Solved
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Complaint Modal & Resolution Modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [complaintToResolve, setComplaintToResolve] = useState(null);

  // Resolution Form State & Verification
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [proofImageName, setProofImageName] = useState('');
  const [officerLocation, setOfficerLocation] = useState({ latitude: null, longitude: null, accuracy: null, status: 'idle', error: '' });
  const [isAcquiringLocation, setIsAcquiringLocation] = useState(false);
  const [isVerifyingResolution, setIsVerifyingResolution] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [resolutionError, setResolutionError] = useState('');

  // Image Lightbox Modal
  const [lightboxImage, setLightboxImage] = useState(null);
  const fileInputRef = useRef(null);

  const fetchDepartmentData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await departmentsAdminApi.getDepartmentComplaints(deptSlug, {
        search,
        status: statusFilter === 'All' ? '' : statusFilter,
        priority: priorityFilter === 'All' ? '' : priorityFilter,
        page,
        limit: 15,
        sort: '-createdAt'
      });

      if (res.data?.success) {
        setDepartment(res.data.department);
        setStats(res.data.stats || { total: 0, pending: 0, inProgress: 0, solved: 0 });
        setComplaints(res.data.complaints || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch department complaints:', err);
      setError(err.response?.data?.message || 'Failed to load department complaint operations.');
    } finally {
      setLoading(false);
    }
  }, [deptSlug, search, statusFilter, priorityFilter, page]);

  useEffect(() => {
    fetchDepartmentData();
  }, [fetchDepartmentData]);

  // Handle Changing Status (e.g. Pending -> In Progress)
  const handleStatusChange = async (complaintId, nextStatus) => {
    setIsUpdatingStatus(true);
    try {
      const res = await complaintsAdminApi.updateStatus(complaintId, nextStatus);
      if (res.data?.success) {
        addToast({
          type: 'success',
          message: `Complaint marked as ${nextStatus}`
        });

        // Update local list & modal
        const updatedDoc = res.data.complaint;
        setComplaints(prev => prev.map(c => c._id === complaintId ? updatedDoc : c));
        if (selectedComplaint?._id === complaintId) {
          setSelectedComplaint(updatedDoc);
        }
        // Refresh department stats
        fetchDepartmentData();
      }
    } catch (err) {
      addToast({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update complaint status.'
      });
    } finally {
      setIsUpdatingStatus(false);
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

  // Open Resolve Modal
  const openResolveModal = (complaint) => {
    setComplaintToResolve(complaint);
    setResolutionNotes(complaint.resolution?.notes || '');
    setProofImage(complaint.resolution?.proofImage || '');
    setProofImageName('');
    setResolutionError('');
    setVerificationResult(complaint.resolutionVerification || null);
    setIsResolveModalOpen(true);
    acquireOfficerLocation();
  };

  // Handle Image File Selection for Proof
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
    // Reset prior verification on new image upload
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
      const res = await complaintsAdminApi.verifyResolution(complaintToResolve._id, {
        notes: resolutionNotes.trim(),
        proofImage,
        latitude: officerLocation.latitude,
        longitude: officerLocation.longitude
      });

      if (res.data?.success) {
        setVerificationResult(res.data.verification);
        const updatedDoc = res.data.complaint;
        setComplaints(prev => prev.map(c => c._id === complaintToResolve._id ? updatedDoc : c));
        if (selectedComplaint?._id === complaintToResolve._id) {
          setSelectedComplaint(updatedDoc);
        }
        if (res.data.verification.status === 'VERIFIED') {
          addToast({
            type: 'success',
            message: 'Resolution verified successfully by AI & GPS!'
          });
        } else {
          addToast({
            type: 'warning',
            message: `Verification Status: ${res.data.verification.status}. Please check details.`
          });
        }
      }
    } catch (err) {
      console.error('Verification error:', err);
      setResolutionError(err.response?.data?.message || 'Resolution verification failed. Please try again.');
    } finally {
      setIsVerifyingResolution(false);
    }
  };

  // Step 2: Finalize & Solve Complaint
  const handleSubmitResolution = async (e) => {
    e.preventDefault();
    if (!verificationResult || verificationResult.status !== 'VERIFIED') {
      setResolutionError('You must run and pass AI & GPS Resolution Verification before marking this complaint as SOLVED.');
      return;
    }

    setIsSubmittingResolution(true);
    setResolutionError('');

    try {
      const res = await complaintsAdminApi.resolveComplaint(complaintToResolve._id, {
        notes: resolutionNotes.trim(),
        proofImage: proofImage
      });

      if (res.data?.success) {
        addToast({
          type: 'success',
          message: 'Complaint solved successfully'
        });

        const updatedDoc = res.data.complaint;
        setComplaints(prev => prev.map(c => c._id === complaintToResolve._id ? updatedDoc : c));
        if (selectedComplaint?._id === complaintToResolve._id) {
          setSelectedComplaint(updatedDoc);
        }

        setIsResolveModalOpen(false);
        setComplaintToResolve(null);
        fetchDepartmentData();
      }
    } catch (err) {
      console.error('Resolve error:', err);
      setResolutionError(err.response?.data?.message || 'Unable to solve complaint. Please try again.');
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const DeptIcon = deptIcons[department?.name] || Building2;

  const isComplaintSolved = (c) => {
    return c?.status === 'Resolved' || c?.status === 'SOLVED';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate('/government/departments')}
          className="flex items-center gap-2 text-surface-400 hover:text-white transition-colors text-sm font-medium group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Departments
        </button>

        <button
          onClick={fetchDepartmentData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-800/80 text-surface-300 hover:text-white border border-white/5 hover:border-brand-500/30 text-xs font-semibold transition-all"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh Operations
        </button>
      </div>

      {/* Department Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(30,16,50,0.9) 0%, rgba(18,10,32,0.95) 100%)',
          border: '1px solid rgba(168,85,247,0.35)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center text-white shadow-glow shrink-0 border border-white/10">
              <DeptIcon size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {department?.name || 'Department Complaint Management'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Government Operations
                </span>
              </div>
              <p className="text-surface-400 text-xs mt-1">
                Supervised by <strong className="text-surface-200">{department?.head || 'Officer In-Charge'}</strong> {department?.contactEmail ? `• ${department.contactEmail}` : ''}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4 Statistics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Complaints', count: stats.total, color: 'text-white', border: 'border-white/10', bg: 'from-white/5 to-white/0', icon: FileText },
          { label: 'Pending', count: stats.pending, color: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'from-yellow-500/10 to-transparent', icon: Clock },
          { label: 'In Progress', count: stats.inProgress, color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'from-cyan-500/10 to-transparent', icon: RefreshCw },
          { label: 'Solved', count: stats.solved, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'from-emerald-500/10 to-transparent', icon: CheckCircle2 }
        ].map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br ${kpi.bg} border ${kpi.border} backdrop-blur-md`}
            style={{ background: 'rgba(25,16,39,0.6)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-surface-400 font-medium uppercase tracking-wider">{kpi.label}</span>
              <kpi.icon size={16} className={kpi.color} />
            </div>
            <p className={`text-2xl sm:text-3xl font-extrabold ${kpi.color}`}>{kpi.count}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search Control Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-900/80 border border-white/5 overflow-x-auto">
          {['All', 'Pending', 'In Progress', 'Solved'].map((tab) => {
            const active = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => { setStatusFilter(tab); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-brand-600 text-white shadow-glow'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
                }`}
              >
                {tab}
                {tab === 'All' && ` (${stats.total})`}
                {tab === 'Pending' && ` (${stats.pending})`}
                {tab === 'In Progress' && ` (${stats.inProgress})`}
                {tab === 'Solved' && ` (${stats.solved})`}
              </button>
            );
          })}
        </div>

        {/* Search & Priority Controls */}
        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search ID, Title, Location..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-800/60 border border-white/10 text-white placeholder-surface-500 text-xs focus:border-brand-500/60 focus:outline-none transition-all"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-surface-800/60 border border-white/10 text-xs text-white focus:border-brand-500/60 focus:outline-none transition-all"
          >
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>
      </div>

      {/* Complaints Table Card */}
      <div className="rounded-3xl overflow-hidden border border-white/8 shadow-2xl" style={{ background: 'rgba(25,16,39,0.7)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/8 bg-surface-900/60 text-surface-400 uppercase tracking-wider font-semibold">
                <th className="px-5 py-3.5 whitespace-nowrap">Complaint ID</th>
                <th className="px-5 py-3.5">Complaint Title</th>
                <th className="px-5 py-3.5">Location</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Citizen</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Reported Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-surface-200">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-surface-700/50 rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-surface-400">
                    <AlertTriangle size={24} className="mx-auto text-surface-500 mb-2" />
                    No complaints match the current filter criteria for this department.
                  </td>
                </tr>
              ) : (
                complaints.map((item, idx) => {
                  const trackingId = item.complaintId || item._id?.slice(-8).toUpperCase();
                  const isSolved = isComplaintSolved(item);

                  return (
                    <motion.tr
                      key={item._id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-white/4 transition-colors group cursor-pointer"
                      onClick={() => setSelectedComplaint(item)}
                    >
                      {/* Complaint ID */}
                      <td className="px-5 py-4 font-mono font-bold text-brand-400 whitespace-nowrap">
                        #{trackingId}
                      </td>

                      {/* Title & Category */}
                      <td className="px-5 py-4 max-w-[200px]">
                        <p className="font-semibold text-white truncate text-xs group-hover:text-brand-300 transition-colors">
                          {item.title}
                        </p>
                        <span className="text-[10px] text-surface-400 truncate block">
                          {item.category || item.department}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4 max-w-[180px]">
                        <p className="text-surface-300 truncate flex items-center gap-1">
                          <MapPin size={11} className="text-surface-500 shrink-0" />
                          {item.address}
                        </p>
                        {item.landmark && (
                          <span className="text-[10px] text-surface-500 truncate block pl-3.5">
                            Near: {item.landmark}
                          </span>
                        )}
                      </td>

                      {/* Priority Badge */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${priorityColors[item.priority] || 'text-surface-300 border-white/10'}`}>
                          {item.priority}
                        </span>
                      </td>

                      {/* Citizen */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="font-medium text-white">{item.citizen?.name || 'Citizen'}</p>
                        <span className="text-[10px] text-surface-400">{item.citizen?.email || item.citizen?.mobile || '—'}</span>
                      </td>

                      {/* Reported Date */}
                      <td className="px-5 py-4 whitespace-nowrap text-surface-400">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusColors[item.status] || 'bg-white/10 text-white'}`}>
                          {isSolved ? '✓ SOLVED' : item.status}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedComplaint(item)}
                            className="px-2.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1 transition-all"
                            title="View Details"
                          >
                            <Eye size={12} /> View
                          </button>

                          {!isSolved && (
                            <button
                              type="button"
                              onClick={() => openResolveModal(item)}
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 flex items-center gap-1 transition-all"
                              title="Resolve Complaint"
                            >
                              <ShieldCheck size={12} /> Solve
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-white/8 flex items-center justify-between text-xs text-surface-400">
            <span>Showing page {page} of {totalPages} ({totalCount} items)</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-surface-800 disabled:opacity-40 hover:bg-surface-700 text-white transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg bg-surface-800 disabled:opacity-40 hover:bg-surface-700 text-white transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4 & 11. COMPLAINT DETAILS MODAL */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedComplaint && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#170e26] border border-purple-500/30 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/8 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-400">
                      #{selectedComplaint.complaintId || selectedComplaint._id}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColors[selectedComplaint.status] || 'bg-white/10'}`}>
                      {isComplaintSolved(selectedComplaint) ? '✓ SOLVED' : selectedComplaint.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${priorityColors[selectedComplaint.priority]}`}>
                      {selectedComplaint.priority} Priority
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">
                    {selectedComplaint.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-400 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Solved Banner & Resolution Details if solved */}
              {isComplaintSolved(selectedComplaint) && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-emerald-300">✓ SOLVED</h4>
                        <p className="text-[11px] text-surface-400">
                          Solved by: <strong className="text-white">{selectedComplaint.resolution?.solvedBy?.name || department?.head || 'Government Officer'}</strong> • {selectedComplaint.resolution?.solvedAt ? new Date(selectedComplaint.resolution.solvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Verified'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Resolution Notes */}
                  {selectedComplaint.resolution?.notes && (
                    <div className="p-3 rounded-xl bg-surface-900/80 border border-white/5 text-xs text-surface-200">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Resolution Summary:</p>
                      <p className="leading-relaxed italic">"{selectedComplaint.resolution.notes}"</p>
                    </div>
                  )}

                  {/* Resolution Proof Image */}
                  {selectedComplaint.resolution?.proofImage && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Resolution Proof Photo:</p>
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => setLightboxImage(selectedComplaint.resolution.proofImage)}
                          className="relative w-28 h-20 rounded-xl overflow-hidden border border-emerald-500/40 cursor-pointer group shrink-0"
                        >
                          <img
                            src={selectedComplaint.resolution.proofImage}
                            alt="Resolution Proof"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Maximize2 size={14} className="text-white" />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLightboxImage(selectedComplaint.resolution.proofImage)}
                          className="btn-secondary py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
                        >
                          <Eye size={12} /> View Full Photo
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI & GPS Verification Audit Details */}
                  {selectedComplaint.resolutionVerification?.status && (
                    <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/20 text-xs space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                          <Sparkles size={12} /> AI & Geolocation Verification
                        </span>
                        <span className="text-[10px] font-bold text-emerald-300">
                          {selectedComplaint.resolutionVerification.confidence}% Confidence • {selectedComplaint.resolutionVerification.status}
                        </span>
                      </div>
                      {selectedComplaint.resolutionVerification.aiReason && (
                        <p className="text-[11px] text-surface-300 italic">
                          "{selectedComplaint.resolutionVerification.aiReason}"
                        </p>
                      )}
                      {selectedComplaint.resolutionVerification.distanceMeters !== null && (
                        <p className="text-[10px] text-surface-400 flex items-center gap-1">
                          <MapPin size={11} className="text-brand-400" />
                          Officer was {selectedComplaint.resolutionVerification.distanceMeters}m from the complaint site during verification.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Main Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-surface-800/40 border border-white/5 space-y-1">
                  <span className="text-surface-500 uppercase text-[10px] font-semibold">Location</span>
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <MapPin size={13} className="text-brand-400 shrink-0" />
                    {selectedComplaint.address}
                  </p>
                  {selectedComplaint.landmark && (
                    <p className="text-surface-400 text-[11px]">Landmark: {selectedComplaint.landmark}</p>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-800/40 border border-white/5 space-y-1">
                  <span className="text-surface-500 uppercase text-[10px] font-semibold">Citizen Details</span>
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <User size={13} className="text-brand-400 shrink-0" />
                    {selectedComplaint.citizen?.name || 'Citizen'}
                  </p>
                  <p className="text-surface-400 text-[11px]">{selectedComplaint.citizen?.email || selectedComplaint.citizen?.mobile || 'No contact provided'}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-800/40 border border-white/5 space-y-1">
                  <span className="text-surface-500 uppercase text-[10px] font-semibold">Department & Category</span>
                  <p className="font-semibold text-white">{selectedComplaint.department}</p>
                  <p className="text-surface-400 text-[11px]">Category: {selectedComplaint.category || 'General'}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-800/40 border border-white/5 space-y-1">
                  <span className="text-surface-500 uppercase text-[10px] font-semibold">Assigned Officer / Operative</span>
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <HardHat size={13} className="text-cyan-400 shrink-0" />
                    {selectedComplaint.assignedWorker?.name || department?.head || 'Unassigned Staff'}
                  </p>
                  <p className="text-surface-400 text-[11px]">{selectedComplaint.assignedWorker?.status || 'Active Department Operations'}</p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-surface-400 uppercase text-[10px] font-semibold tracking-wider">Description</span>
                <p className="text-xs text-surface-200 bg-surface-900/60 p-4 rounded-2xl border border-white/5 leading-relaxed">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Original Complaint Images if attached */}
              {selectedComplaint.images?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-surface-400 uppercase text-[10px] font-semibold tracking-wider">Original Complaint Photos</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {selectedComplaint.images.map((imgUrl, i) => (
                      <div
                        key={i}
                        onClick={() => setLightboxImage(imgUrl)}
                        className="relative h-24 rounded-xl overflow-hidden border border-white/10 bg-black cursor-pointer group"
                      >
                        <img src={imgUrl} alt={`Evidence ${i+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Maximize2 size={14} className="text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Workflow Action Buttons */}
              <div className="pt-4 border-t border-white/8 flex flex-col sm:flex-row gap-3">
                {selectedComplaint.status === 'Pending' && (
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleStatusChange(selectedComplaint._id, 'In Progress')}
                    className="flex-1 py-3 px-4 rounded-xl bg-surface-800 hover:bg-surface-700 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw size={14} className={isUpdatingStatus ? 'animate-spin' : ''} />
                    Mark In Progress
                  </button>
                )}

                {!isComplaintSolved(selectedComplaint) && (
                  <button
                    type="button"
                    onClick={() => {
                      openResolveModal(selectedComplaint);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all"
                  >
                    <ShieldCheck size={16} />
                    Resolve Complaint
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate(`/government/complaints/${selectedComplaint._id}`)}
                  className="py-3 px-4 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <ExternalLink size={13} /> Full Audit Page
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 6 & 7. SOLVE COMPLAINT RESOLUTION MODAL WITH AI & GPS VERIFICATION */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isResolveModalOpen && complaintToResolve && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#190f2b] border border-emerald-500/40 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-5 my-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/8 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">AI-Powered Resolution Verification</h3>
                    <p className="text-[11px] text-surface-400 font-mono">#{complaintToResolve.complaintId || complaintToResolve._id} • {complaintToResolve.department}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsResolveModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-400 hover:text-white transition-all"
                >
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
                {/* 1. Resolution Notes */}
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
                    placeholder="Describe specific field work completed (e.g., Pothole filled with fresh asphalt and leveled with road surface)..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#120a1f] border border-surface-700 text-white text-xs placeholder-surface-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all resize-none"
                  />
                </div>

                {/* 2. Proof Photo Upload Field */}
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

                {/* Actions: Solve button enabled only if VERIFIED */}
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
                        <CheckCircle2 size={15} />
                        Confirm & Solve Complaint
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 11. LIGHTBOX IMAGE PREVIEW MODAL */}
      {/* ======================================================== */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
              <img
                src={lightboxImage}
                alt="Full resolution evidence"
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
