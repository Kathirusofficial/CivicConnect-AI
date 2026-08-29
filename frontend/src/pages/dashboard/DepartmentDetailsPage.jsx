import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, Filter, Download, MoreVertical, MapPin, Loader2 } from 'lucide-react';
import { PageTransition } from '../../components/animations/PageTransition';
import { FadeIn, StaggerContainer, StaggerItem } from '../../components/animations/FadeIn';
import { complaintAPI } from '../../services/api';

export const DepartmentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const departmentName = id ? id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Department';

  const { data: allComplaints = [], isLoading } = useQuery({
    queryKey: ['complaints', 'department', departmentName],
    queryFn: async () => {
      const res = await complaintAPI.getAll();
      return Array.isArray(res.data) ? res.data : (res.data?.complaints || []);
    },
    refetchOnWindowFocus: true
  });

  const deptComplaints = allComplaints.filter(c => {
    const dName = c.assignedDepartment?.name || c.department || c.category || '';
    if (id && !dName.toLowerCase().includes(id.toLowerCase().replace('-', ' '))) {
      return false;
    }
    const trackingId = c.complaintId || c._id || '';
    const title = c.title || '';
    if (searchTerm && !title.toLowerCase().includes(searchTerm.toLowerCase()) && !trackingId.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const departmentStats = {
    total: deptComplaints.length,
    pending: deptComplaints.filter(c => c.status === 'Pending').length,
    assigned: deptComplaints.filter(c => c.status === 'Assigned').length,
    inProgress: deptComplaints.filter(c => c.status === 'In Progress' || c.status === 'Verified').length,
    resolved: deptComplaints.filter(c => c.status === 'Resolved').length,
    rejected: deptComplaints.filter(c => c.status === 'Rejected').length,
  };

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-surface-500 hover:text-brand-500 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50 flex items-center gap-3">
                <MapPin className="text-brand-500" /> {departmentName}
              </h1>
              <p className="mt-1 text-surface-500 dark:text-surface-400">Manage all issues and track performance.</p>
            </div>
            <button className="btn-primary flex items-center gap-2">
              <Download size={16} /> Export Report
            </button>
          </div>
        </FadeIn>

        {/* Stats */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" staggerDelay={0.05}>
          {[
            { label: 'Total', value: departmentStats.total, color: 'text-surface-900 dark:text-surface-50' },
            { label: 'Pending', value: departmentStats.pending, color: 'text-orange-500' },
            { label: 'Assigned', value: departmentStats.assigned, color: 'text-purple-500' },
            { label: 'In Progress', value: departmentStats.inProgress, color: 'text-blue-500' },
            { label: 'Resolved', value: departmentStats.resolved, color: 'text-emerald-500' },
            { label: 'Rejected', value: departmentStats.rejected, color: 'text-red-500' },
          ].map((stat, idx) => (
            <StaggerItem key={idx}>
              <div className="glass-strong rounded-xl p-4 shadow-sm border border-surface-200 dark:border-surface-800 text-center">
                <p className="text-sm font-medium text-surface-500 dark:text-surface-400">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Complaints Table section */}
        <FadeIn delay={0.2}>
          <div className="glass-strong rounded-2xl shadow-glass border border-surface-200 dark:border-surface-800 overflow-hidden mt-8">
            <div className="p-6 border-b border-surface-200 dark:border-surface-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-50/50 dark:bg-surface-900/30">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Department Complaints</h2>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input 
                    type="text" 
                    placeholder="Search ID or Title..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pl-9 h-9 text-sm w-48 lg:w-64" 
                  />
                </div>
                <button className="btn-secondary h-9 px-3 flex items-center gap-2 text-sm">
                  <Filter size={14} /> Filter
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-100 dark:bg-surface-800/50 text-surface-500 dark:text-surface-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">ID</th>
                    <th className="px-6 py-4 font-medium">Title</th>
                    <th className="px-6 py-4 font-medium">Citizen</th>
                    <th className="px-6 py-4 font-medium">Priority</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Worker</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-surface-400">
                        <Loader2 size={24} className="animate-spin mx-auto text-brand-500 mb-2" />
                        Loading department complaints...
                      </td>
                    </tr>
                  ) : deptComplaints.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-surface-400 text-sm">
                        No complaints registered under this department yet.
                      </td>
                    </tr>
                  ) : (
                    deptComplaints.map((item) => {
                      const trackingId = item.complaintId || item._id;
                      const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
                      const workerName = item.assignedWorker ? item.assignedWorker.name : 'Unassigned';
                      const citizenName = item.citizen?.name || 'Citizen';

                      return (
                        <tr key={item._id || trackingId} className="hover:bg-surface-50 dark:hover:bg-surface-900/40 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-brand-600 dark:text-brand-400 font-semibold">{trackingId}</td>
                          <td className="px-6 py-4 text-sm font-medium text-surface-900 dark:text-surface-100">{item.title}</td>
                          <td className="px-6 py-4 text-sm text-surface-500 dark:text-surface-400">{citizenName}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300">
                              {item.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border
                              ${item.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 border-emerald-200' :
                                item.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 border-blue-200' :
                                item.status === 'Assigned' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 border-purple-200' :
                                item.status === 'Verified' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 border-indigo-200' :
                                'bg-orange-100 text-orange-700 dark:bg-orange-900/30 border-orange-200'
                              }
                            `}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-surface-500 dark:text-surface-400">{workerName}</td>
                          <td className="px-6 py-4 text-sm text-surface-500 dark:text-surface-400">{dateStr}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => navigate(`/complaints/${trackingId}`)} className="text-surface-400 hover:text-brand-500 transition-colors p-1">
                              <MoreVertical size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
};
