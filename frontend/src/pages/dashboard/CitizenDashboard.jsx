import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Clock, CheckCircle, XCircle, ArrowRight, MapPin, Calendar, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/animations/FadeIn';
import { PageTransition } from '../../components/animations/PageTransition';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { complaintAPI } from '../../services/api';


const StatusBadge = ({ status }) => {
  const getColors = () => {
    switch(status) {
      case 'Resolved': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'In Progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'Verified': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
      case 'Assigned': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'Pending': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'Rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getColors()}`}>
      {status}
    </span>
  );
};

const PriorityBadge = ({ priority }) => {
  const getColors = () => {
    switch(priority) {
      case 'Emergency': return 'text-red-700 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 font-bold';
      case 'High': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'Medium': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'Low': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-50';
    }
  };
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getColors()}`}>
      <AlertCircle size={12} /> {priority}
    </span>
  );
};

export const CitizenDashboard = () => {
  const { profile } = useUserStore();
  const authUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data: complaints = [], isLoading, error } = useQuery({
    queryKey: ['my-complaints'],
    queryFn: async () => {
      const res = await complaintAPI.getMyComplaints();
      return Array.isArray(res.data) ? res.data : (res.data?.complaints || []);
    },
    refetchOnWindowFocus: true
  });

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'Pending').length,
    inProgress: complaints.filter(c => c.status === 'In Progress' || c.status === 'Verified' || c.status === 'Assigned').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
    rejected: complaints.filter(c => c.status === 'Rejected').length,
  };

  const displayName = profile?.fullName?.split(' ')[0] || authUser?.name?.split(' ')[0] || 'Citizen';

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-8">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
                Welcome back, <span className="text-gradient">{displayName}</span>
              </h1>
              <p className="mt-1 text-surface-500 dark:text-surface-400">
                Track your reported issues and help keep the city clean and safe.
              </p>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/citizen/new-complaint')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-accent-violet text-white rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 font-medium transition-all group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <Plus size={18} className="relative z-10 group-hover:rotate-90 transition-transform duration-300" />
              <span className="relative z-10">Register New Complaint</span>
            </motion.button>
          </div>
        </FadeIn>

        {/* Stats Cards */}
        <StaggerContainer className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" staggerDelay={0.08}>
          <StaggerItem>
            <motion.div
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => navigate('/my-complaints')}
              className="glass-strong rounded-2xl p-5 shadow-glass relative overflow-hidden group cursor-pointer border border-transparent hover:border-brand-500/40 hover:shadow-lg transition-all"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-accent-violet opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-glow">
                  <FileText size={20} className="text-white" />
                </div>
                <span className="text-xs text-surface-400 group-hover:text-brand-500 flex items-center gap-1 font-medium transition-colors">
                  View <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-surface-900 dark:text-surface-50">{stats.total}</p>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">My Complaints</p>
              </div>
            </motion.div>
          </StaggerItem>
          
          <StaggerItem>
            <motion.div
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => navigate('/my-complaints?status=Pending')}
              className="glass-strong rounded-2xl p-5 shadow-glass relative overflow-hidden group cursor-pointer border border-transparent hover:border-orange-500/40 hover:shadow-lg transition-all"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-glow-yellow">
                  <Clock size={20} className="text-white" />
                </div>
                <span className="text-xs text-surface-400 group-hover:text-orange-500 flex items-center gap-1 font-medium transition-colors">
                  View <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-surface-900 dark:text-surface-50">{stats.pending}</p>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">Pending</p>
              </div>
            </motion.div>
          </StaggerItem>
          
          <StaggerItem>
            <motion.div
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => navigate('/my-complaints?status=Resolved')}
              className="glass-strong rounded-2xl p-5 shadow-glass relative overflow-hidden group cursor-pointer border border-transparent hover:border-emerald-500/40 hover:shadow-lg transition-all"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-glow-cyan">
                  <CheckCircle size={20} className="text-white" />
                </div>
                <span className="text-xs text-surface-400 group-hover:text-emerald-500 flex items-center gap-1 font-medium transition-colors">
                  View <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-surface-900 dark:text-surface-50">{stats.resolved}</p>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">Resolved</p>
              </div>
            </motion.div>
          </StaggerItem>

          <StaggerItem>
            <motion.div
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => navigate('/my-complaints?status=Rejected')}
              className="glass-strong rounded-2xl p-5 shadow-glass relative overflow-hidden group cursor-pointer border border-transparent hover:border-rose-500/40 hover:shadow-lg transition-all"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-lg shadow-glow-pink">
                  <XCircle size={20} className="text-white" />
                </div>
                <span className="text-xs text-surface-400 group-hover:text-rose-500 flex items-center gap-1 font-medium transition-colors">
                  View <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-surface-900 dark:text-surface-50">{stats.rejected}</p>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">Rejected</p>
              </div>
            </motion.div>
          </StaggerItem>
        </StaggerContainer>

        {/* My Recent Complaints Table */}
        <FadeIn delay={0.2}>
          <div className="glass-strong rounded-2xl shadow-glass border border-surface-200 dark:border-surface-800 overflow-hidden">
            <div className="p-6 border-b border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/30 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-surface-900 dark:text-surface-100">
                <FileText className="text-brand-500" /> My Recent Complaints
              </h2>
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-brand-500 font-medium">
                  <Loader2 size={14} className="animate-spin" /> Loading from database...
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-surface-500">
                <Loader2 size={32} className="animate-spin mx-auto text-brand-500 mb-3" />
                <p className="text-sm">Fetching your live complaints from MongoDB...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">
                <AlertCircle size={28} className="mx-auto mb-2 text-red-500" />
                <p className="font-medium text-sm">Failed to load complaints from backend.</p>
                <p className="text-xs text-surface-400 mt-1">{error.message}</p>
              </div>
            ) : complaints.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto text-surface-400">
                  <FileText size={28} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">No complaints filed yet</h3>
                  <p className="text-sm text-surface-500 max-w-sm mx-auto mt-1">
                    You have not registered any civic complaints yet. Notice an issue in your area? Report it directly to municipal officers.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/citizen/new-complaint')}
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                >
                  <Plus size={16} /> Lodge First Complaint
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-100 dark:bg-surface-800/50 text-surface-500 dark:text-surface-400 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-medium">Complaint ID</th>
                      <th className="px-6 py-4 font-medium">Title</th>
                      <th className="px-6 py-4 font-medium">Department</th>
                      <th className="px-6 py-4 font-medium">Priority</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Submitted Date</th>
                      <th className="px-6 py-4 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                    {complaints.map((complaint) => {
                      const trackingId = complaint.complaintId || complaint._id;
                      const dateStr = complaint.createdAt 
                        ? new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Recent';
                      const deptName = complaint.assignedDepartment?.name || complaint.department || complaint.category || 'General';

                      return (
                        <tr key={complaint._id || trackingId} className="hover:bg-surface-50 dark:hover:bg-surface-900/40 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-brand-600 dark:text-brand-400 font-semibold">{trackingId}</td>
                          <td className="px-6 py-4 text-sm font-medium text-surface-900 dark:text-surface-100 max-w-xs truncate">{complaint.title}</td>
                          <td className="px-6 py-4 text-sm text-surface-500 dark:text-surface-400">{deptName}</td>
                          <td className="px-6 py-4">
                            <PriorityBadge priority={complaint.priority || 'Medium'} />
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={complaint.status || 'Pending'} />
                          </td>
                          <td className="px-6 py-4 text-sm text-surface-500 dark:text-surface-400">{dateStr}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => navigate(`/complaints/${trackingId}`)}
                              className="btn-secondary h-8 px-3 text-xs"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
};
