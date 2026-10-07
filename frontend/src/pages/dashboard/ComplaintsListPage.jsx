import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, AlertCircle, Clock, MapPin, FileText, ChevronRight, CheckCircle, XCircle, Plus, Loader2, ThumbsUp } from 'lucide-react';
import { PageTransition } from '../../components/animations/PageTransition';
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/animations/FadeIn';
import { complaintAPI } from '../../services/api';

const STATUS_TABS = ['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'];

export const ComplaintsListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status') || '';
  const [searchTerm, setSearchTerm] = useState('');

  const { data: myComplaints = [], isLoading, error } = useQuery({
    queryKey: ['my-complaints'],
    queryFn: async () => {
      const res = await complaintAPI.getMyComplaints();
      return Array.isArray(res.data) ? res.data : (res.data?.complaints || []);
    },
    refetchOnWindowFocus: true
  });

  const handleTabChange = (tab) => {
    if (tab === 'All') {
      searchParams.delete('status');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ ...Object.fromEntries(searchParams.entries()), status: tab });
    }
  };

  // Filter based on statusParam and searchTerm
  const filteredComplaints = myComplaints.filter(c => {
    if (statusParam && c.status && c.status.toLowerCase() !== statusParam.toLowerCase()) {
      return false;
    }
    const trackingId = c.complaintId || c._id || '';
    const title = c.title || '';
    const dept = c.assignedDepartment?.name || c.department || c.category || '';
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!title.toLowerCase().includes(term) && !trackingId.toLowerCase().includes(term) && !dept.toLowerCase().includes(term)) {
        return false;
      }
    }
    return true;
  });

  const pageTitle = statusParam ? `${statusParam} Complaints` : 'My Complaints';

  const StatusBadge = ({ s }) => {
    switch (s) {
      case 'Resolved': return <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 w-max"><CheckCircle size={12}/>{s}</span>;
      case 'In Progress': return <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-800 flex items-center gap-1 w-max"><Clock size={12}/>{s}</span>;
      case 'Verified': return <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 w-max"><Clock size={12}/>{s}</span>;
      case 'Assigned': return <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-800 flex items-center gap-1 w-max"><Clock size={12}/>{s}</span>;
      case 'Pending': return <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-orange-200 dark:border-orange-800 flex items-center gap-1 w-max"><Clock size={12}/>{s}</span>;
      case 'Rejected': return <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-red-200 dark:border-red-800 flex items-center gap-1 w-max"><XCircle size={12}/>{s}</span>;
      default: return <span className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700">{s}</span>;
    }
  };

  const PriorityBadge = ({ p }) => {
    const isHigh = p === 'High' || p === 'Emergency' || p === 'Critical';
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 w-max ${isHigh ? 'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/40' : 'text-surface-600 bg-surface-100 dark:bg-surface-800 dark:text-surface-300'}`}>
        <AlertCircle size={12} /> {p || 'Medium'}
      </span>
    );
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="flex items-center gap-2 text-sm text-surface-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors font-medium"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          
          <button
            onClick={() => navigate('/citizen/new-complaint')}
            className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5"
          >
            <Plus size={15} /> New Complaint
          </button>
        </div>

        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50 flex items-center gap-3">
                <FileText className="text-brand-500" /> {pageTitle}
              </h1>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                Live list of your filed complaints in the municipal system.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input 
                  type="text" 
                  placeholder="Search by title, ID, department..." 
                  className="input-field pl-9 h-10 w-full sm:w-72 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 mt-4 scrollbar-hide">
            {STATUS_TABS.map((tab) => {
              const isActive = (tab === 'All' && !statusParam) || (tab.toLowerCase() === statusParam.toLowerCase());
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                      : 'bg-surface-100 dark:bg-surface-800/70 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700/60'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </FadeIn>

        <StaggerContainer className="space-y-3" staggerDelay={0.05}>
          {isLoading ? (
            <div className="p-12 text-center text-surface-500 glass-strong rounded-2xl">
              <Loader2 size={32} className="animate-spin mx-auto text-brand-500 mb-3" />
              <p className="text-sm font-medium">Fetching your complaints from MongoDB...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 glass-strong rounded-2xl border border-red-500/30">
              <AlertCircle size={28} className="mx-auto mb-2 text-red-500" />
              <p className="font-medium text-sm">Failed to load complaints from server.</p>
              <p className="text-xs text-surface-400 mt-1">{error.message}</p>
            </div>
          ) : filteredComplaints.length > 0 ? (
            filteredComplaints.map((complaint) => {
              const trackingId = complaint.complaintId || complaint._id;
              const dateStr = complaint.createdAt 
                ? new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Recent';
              const deptName = complaint.assignedDepartment?.name || complaint.department || complaint.category || 'General';

              return (
                <StaggerItem key={complaint._id || trackingId}>
                  <div 
                    onClick={() => navigate(`/complaints/${trackingId}`)}
                    className="glass-strong rounded-2xl p-4 md:p-5 shadow-glass border border-surface-200/70 dark:border-surface-800/80 hover:border-brand-500/40 dark:hover:border-brand-500/40 cursor-pointer transition-all hover:shadow-lg group flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-2 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-base text-surface-900 dark:text-surface-50 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                          {complaint.title}
                        </h3>
                        <PriorityBadge p={complaint.priority} />
                        <StatusBadge s={complaint.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-surface-500 dark:text-surface-400">
                        <span className="font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded text-brand-600 dark:text-brand-400 font-semibold">{trackingId}</span>
                        <span className="flex items-center gap-1"><MapPin size={13} /> {deptName}</span>
                        <span className="flex items-center gap-1"><Clock size={13} /> Reported: {dateStr}</span>
                        {complaint.supportCount > 0 && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <ThumbsUp size={12} /> {complaint.supportCount} Supported
                          </span>
                        )}
                        {complaint.address && (
                          <span className="truncate max-w-xs text-surface-400">• {complaint.address}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end items-center shrink-0">
                      <div className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:text-brand-500">
                        View Details <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              );
            })
          ) : (
            <div className="text-center py-16 bg-surface-50 dark:bg-surface-900/30 rounded-2xl border border-dashed border-surface-300 dark:border-surface-700">
              <FileText size={42} className="mx-auto text-surface-300 dark:text-surface-600 mb-3" />
              <h3 className="text-base font-semibold text-surface-900 dark:text-surface-50">
                {statusParam ? `No ${statusParam.toLowerCase()} complaints found` : 'No complaints found'}
              </h3>
              <p className="text-xs text-surface-500 mt-1 max-w-sm mx-auto">
                {statusParam 
                  ? `You currently do not have any complaints with status "${statusParam}".`
                  : 'You have not registered any complaints yet.'}
              </p>
              <button
                onClick={() => navigate('/citizen/new-complaint')}
                className="btn-primary inline-flex items-center gap-1.5 text-xs mt-4 py-2 px-3.5"
              >
                <Plus size={14} /> Report New Issue
              </button>
            </div>
          )}
        </StaggerContainer>
      </div>
    </PageTransition>
  );
};
