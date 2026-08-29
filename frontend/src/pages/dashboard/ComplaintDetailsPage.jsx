import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, MapPin, Calendar, Clock, User, MessageSquare, Star, CheckCircle, Image as ImageIcon, AlertCircle, Loader2, Shield, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PageTransition } from '../../components/animations/PageTransition';
import { FadeIn } from '../../components/animations/FadeIn';
import { complaintAPI, feedbackAPI } from '../../services/api';

export const ComplaintDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(5);
  const [resolvedByCitizen, setResolvedByCitizen] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const { data: complaintData, isLoading, error } = useQuery({
    queryKey: ['complaint', id],
    queryFn: async () => {
      const res = await complaintAPI.getById(id);
      return res.data?.complaint || res.data;
    },
    enabled: !!id,
    refetchOnWindowFocus: true
  });

  const complaint = complaintData;

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setSubmittingFeedback(true);
    try {
      await feedbackAPI.submitFeedback(id, {
        rating,
        resolvedByCitizen,
        comment: comment.trim()
      });
      setFeedbackSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['complaint', id] });
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto py-16 text-center space-y-4">
          <Loader2 size={36} className="animate-spin mx-auto text-brand-500" />
          <p className="text-surface-500 font-medium text-sm">Loading complaint details from database...</p>
        </div>
      </PageTransition>
    );
  }

  if (error || !complaint) {
    return (
      <PageTransition>
        <div className="max-w-xl mx-auto py-16 text-center space-y-4 glass-strong p-8 rounded-3xl">
          <AlertCircle size={40} className="mx-auto text-red-500" />
          <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">Complaint Not Found</h2>
          <p className="text-sm text-surface-500">
            {error?.message || 'Could not find the requested complaint record in the system.'}
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Return to Dashboard
          </button>
        </div>
      </PageTransition>
    );
  }

  const trackingId = complaint.complaintId || complaint._id;
  const submittedDate = complaint.createdAt 
    ? new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recent';
  const deptName = complaint.assignedDepartment?.name || complaint.department || complaint.category || 'Municipal Department';
  const workerName = complaint.assignedWorker ? complaint.assignedWorker.name : 'Officer Pending Assignment';
  const workerContact = complaint.assignedWorker?.contact;
  const mainImage = (complaint.images && complaint.images.length > 0)
    ? complaint.images[0]
    : 'https://images.unsplash.com/photo-1542013936693-884638332954?q=80&w=800&h=400&fit=crop';

  const remarksList = complaint.remarks || [];
  const latestRemark = remarksList.length > 0 ? remarksList[remarksList.length - 1] : null;

  // Real timeline events from DB or formatted steps
  const timelineEvents = complaint.timeline && complaint.timeline.length > 0 ? complaint.timeline : [
    {
      status: complaint.status || 'Pending',
      title: 'Complaint Logged',
      description: 'Complaint registered in municipal database.',
      createdAt: complaint.createdAt
    }
  ];

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-surface-500 hover:text-brand-500 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Complaint Header */}
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="px-3 py-1 bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 rounded-full font-mono text-sm font-semibold">
                  #{trackingId}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800">
                  {complaint.status}
                </span>
                <span className="px-3 py-1 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 rounded-full text-xs font-medium">
                  Priority: {complaint.priority}
                </span>
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
                {complaint.title}
              </h1>
            </div>
            
            {/* Meta tags */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-surface-500 dark:text-surface-400">
              <span className="flex items-center gap-1"><Calendar size={14} /> {submittedDate}</span>
              <span className="flex items-center gap-1"><Shield size={14} /> {deptName}</span>
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            <FadeIn delay={0.1}>
              <div className="rounded-2xl overflow-hidden shadow-glass border border-surface-200 dark:border-surface-800 relative group">
                <img src={mainImage} alt={complaint.title} className="w-full h-[300px] object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium border border-white/20">
                  <ImageIcon size={14} /> Photo Evidence
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="glass-strong rounded-2xl p-6 shadow-glass border border-surface-200 dark:border-surface-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-50">Description</h2>
                  <span className="px-3 py-1 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 rounded text-sm font-medium mt-2 sm:mt-0">
                    Category: {complaint.category || deptName}
                  </span>
                </div>
                <p className="text-surface-600 dark:text-surface-300 leading-relaxed whitespace-pre-line">
                  {complaint.description}
                </p>
              </div>
            </FadeIn>

            {/* AI Intelligence Card */}
            {complaint.aiAnalysis && (
              <FadeIn delay={0.22}>
                <div className="glass-strong rounded-2xl p-6 shadow-glass border-2 border-brand-500/30 dark:border-brand-500/40 bg-brand-50/20 dark:bg-brand-950/20 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-200 dark:border-surface-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        <Sparkles size={16} />
                      </span>
                      <h3 className="font-semibold text-surface-900 dark:text-surface-50 text-base">
                        AI Complaint Intelligence
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full text-xs font-semibold border border-brand-500/20">
                        AI Confidence: {Math.round((complaint.aiAnalysis.confidence || 0) * 100)}%
                      </span>
                      <span className="px-2.5 py-0.5 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-full text-xs font-medium">
                        {complaint.aiAnalysis.classificationSource || 'AI Recommended'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-surface-50/80 dark:bg-surface-900/60 p-3 rounded-xl border border-surface-200/50 dark:border-surface-800/50">
                      <p className="text-surface-400 font-medium mb-0.5">Category</p>
                      <p className="font-bold text-surface-900 dark:text-surface-100">{complaint.aiAnalysis.category || complaint.category}</p>
                    </div>
                    <div className="bg-surface-50/80 dark:bg-surface-900/60 p-3 rounded-xl border border-surface-200/50 dark:border-surface-800/50">
                      <p className="text-surface-400 font-medium mb-0.5">Department</p>
                      <p className="font-bold text-surface-900 dark:text-surface-100">{complaint.aiAnalysis.department || deptName}</p>
                    </div>
                    <div className="bg-surface-50/80 dark:bg-surface-900/60 p-3 rounded-xl border border-surface-200/50 dark:border-surface-800/50">
                      <p className="text-surface-400 font-medium mb-0.5">Priority</p>
                      <p className={`font-bold ${complaint.aiAnalysis.priority === 'High' || complaint.aiAnalysis.priority === 'Emergency' ? 'text-red-500' : 'text-orange-500'}`}>
                        {complaint.aiAnalysis.priority || complaint.priority}
                      </p>
                    </div>
                    <div className="bg-surface-50/80 dark:bg-surface-900/60 p-3 rounded-xl border border-surface-200/50 dark:border-surface-800/50">
                      <p className="text-surface-400 font-medium mb-0.5">Severity</p>
                      <p className="font-bold text-purple-600 dark:text-purple-400">{complaint.aiAnalysis.severity || 'Medium'}</p>
                    </div>
                  </div>

                  {complaint.aiAnalysis.summary && (
                    <div className="text-xs">
                      <p className="text-surface-400 font-medium mb-1">AI Summary</p>
                      <p className="text-surface-700 dark:text-surface-300 italic bg-surface-50/60 dark:bg-surface-900/40 p-3 rounded-xl border border-surface-200/40 dark:border-surface-800/40">
                        "{complaint.aiAnalysis.summary}"
                      </p>
                    </div>
                  )}
                </div>
              </FadeIn>
            )}

            {/* Government Remarks */}
            {latestRemark && (
              <FadeIn delay={0.25}>
                <div className="glass-strong rounded-2xl p-6 shadow-glass border border-surface-200 dark:border-surface-800 bg-brand-50/50 dark:bg-brand-900/10 border-l-4 border-l-brand-500">
                  <h2 className="text-lg font-semibold mb-2 text-surface-900 dark:text-surface-50 flex items-center gap-2">
                    <User size={18} className="text-brand-500" /> Official Remarks ({latestRemark.author || 'Authority'})
                  </h2>
                  <p className="text-surface-600 dark:text-surface-300 leading-relaxed">
                    "{latestRemark.text}"
                  </p>
                  <p className="text-xs text-surface-400 mt-2">
                    {new Date(latestRemark.createdAt).toLocaleString()}
                  </p>
                </div>
              </FadeIn>
            )}

            {/* Additional Info Notice if requested */}
            {complaint.moreInfoRequested && (
              <FadeIn delay={0.28}>
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 space-y-1">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <AlertCircle size={16} /> Additional Information Requested by Officer
                  </h3>
                  <p className="text-xs">{complaint.moreInfoText || 'Please contact the assigned municipal officer with further details.'}</p>
                </div>
              </FadeIn>
            )}

            {/* Citizen Feedback Form / Outcome Card */}
            <FadeIn delay={0.3}>
              <div className="glass-strong rounded-2xl p-6 shadow-glass border border-surface-200 dark:border-surface-800 space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-surface-900 dark:text-surface-50">
                  <MessageSquare className="text-brand-500" /> Citizen Feedback &amp; Service Rating
                </h2>

                {complaint.citizenFeedback?.rating ? (
                  <div className="p-4 rounded-xl bg-surface-100 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={20}
                            className={star <= complaint.citizenFeedback.rating ? 'text-yellow-400 fill-yellow-400' : 'text-surface-400'}
                          />
                        ))}
                        <span className="text-xs font-bold text-surface-700 dark:text-surface-300 ml-2">
                          {complaint.citizenFeedback.rating} / 5 Stars
                        </span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        complaint.citizenFeedback.resolvedByCitizen 
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-red-500/20 text-red-600 dark:text-red-400'
                      }`}>
                        {complaint.citizenFeedback.resolvedByCitizen ? '✓ Confirmed Resolved' : '✗ Marked Unresolved'}
                      </span>
                    </div>

                    {complaint.citizenFeedback.comment && (
                      <p className="text-xs text-surface-600 dark:text-surface-300 italic">
                        "{complaint.citizenFeedback.comment}"
                      </p>
                    )}

                    <span className="text-[10px] text-surface-400 block">
                      Submitted on {new Date(complaint.citizenFeedback.submittedAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-surface-500">
                      {['Resolved', 'Reopened', 'Completed'].includes(complaint.status)
                        ? 'Your complaint has been resolved by municipal field operations. Please evaluate the outcome:'
                        : 'Feedback rating will become active once your complaint is marked as Resolved.'}
                    </p>

                    {['Resolved', 'Reopened', 'Completed'].includes(complaint.status) && (
                      <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                        {feedbackSuccess && (
                          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                            <CheckCircle size={15} /> Thank you! Your feedback has been recorded.
                          </div>
                        )}

                        <div>
                          <label className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase block mb-1.5">
                            Rate the Service (1 to 5 Stars)
                          </label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                type="button"
                                key={star}
                                onClick={() => setRating(star)}
                                className="text-surface-300 dark:text-surface-600 hover:text-yellow-400 transition-colors focus:outline-none"
                              >
                                <Star
                                  size={28}
                                  className={star <= rating ? 'text-yellow-400 fill-yellow-400' : ''}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase block mb-1.5">
                            Was your civic issue actually resolved?
                          </label>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setResolvedByCitizen(true)}
                              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                                resolvedByCitizen === true
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                  : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-300 dark:border-surface-700'
                              }`}
                            >
                              ✓ YES — Issue Resolved
                            </button>
                            <button
                              type="button"
                              onClick={() => setResolvedByCitizen(false)}
                              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                                resolvedByCitizen === false
                                  ? 'bg-red-600 text-white border-red-600 shadow-md'
                                  : 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-300 dark:border-surface-700'
                              }`}
                            >
                              ✕ NO — Still Needs Work
                            </button>
                          </div>

                          {resolvedByCitizen === false && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-2 font-medium">
                              ⚠️ Your complaint will be reopened for further municipal action and supervisor investigation.
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase block mb-1.5">
                            Comments / Remarks (Optional)
                          </label>
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Add details on whether the repair was satisfactory or what remains incomplete..."
                            className="input-field w-full min-h-[90px] resize-y text-xs"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submittingFeedback}
                          className="btn-primary w-full sm:w-auto text-xs font-bold disabled:opacity-50"
                        >
                          {submittingFeedback ? 'Submitting Feedback...' : 'Submit Feedback'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </FadeIn>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <FadeIn delay={0.2}>
              <div className="glass-strong rounded-2xl p-6 shadow-glass border border-surface-200 dark:border-surface-800">
                <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-4 border-b border-surface-200 dark:border-surface-800 pb-2">Status & Assignment</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-surface-500 mb-1">Assigned Field Worker</p>
                    <div className="flex items-center gap-2 text-surface-900 dark:text-surface-50 font-medium bg-surface-50 dark:bg-surface-900/40 p-2.5 rounded-lg border border-surface-200 dark:border-surface-800">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{workerName}</p>
                        {workerContact && <p className="text-xs text-surface-400">{workerContact}</p>}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500 mb-1">Department</p>
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-50">{deptName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-surface-500 mb-1">Current Status</p>
                    <p className="flex items-center gap-2 text-surface-900 dark:text-surface-50 font-medium">
                      <Clock size={16} className="text-orange-500" /> {complaint.status}
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="glass-strong rounded-2xl p-6 shadow-glass border border-surface-200 dark:border-surface-800">
                <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-6 flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-500" /> Progress Timeline
                </h3>
                <div className="relative pl-3">
                  <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-surface-200 dark:bg-surface-700" />
                  <div className="space-y-6">
                    {timelineEvents.map((step, idx) => (
                      <div key={idx} className="relative pl-6">
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2 + (idx * 0.08) }}
                          className="absolute -left-[5px] top-1 w-6 h-6 rounded-full border-4 border-surface-50 dark:border-surface-950 flex items-center justify-center z-10 bg-brand-500 text-white"
                        >
                          <div className="w-2 h-2 bg-white rounded-full"/>
                        </motion.div>
                        <div>
                          <p className="font-semibold text-sm text-surface-900 dark:text-surface-50">{step.title || step.status}</p>
                          {step.description && <p className="text-xs text-surface-600 dark:text-surface-300 mt-0.5">{step.description}</p>}
                          <p className="text-[11px] text-surface-400 mt-1">
                            {step.createdAt ? new Date(step.createdAt).toLocaleString() : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="glass-strong rounded-2xl p-6 shadow-glass border border-surface-200 dark:border-surface-800">
                <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-brand-500" /> Location Details
                </h3>
                <p className="text-sm text-surface-600 dark:text-surface-300 mb-2 font-medium">{complaint.address}</p>
                {complaint.landmark && (
                  <p className="text-xs text-surface-400 mb-4">Landmark: {complaint.landmark}</p>
                )}
                <div className="w-full h-36 bg-surface-200 dark:bg-surface-800 rounded-xl overflow-hidden relative">
                  <div className="absolute inset-0 bg-blue-100/50 dark:bg-blue-900/10 flex items-center justify-center">
                    <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=400&h=300&fit=crop" alt="Map" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute flex flex-col items-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-md">
                      <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center">
                        <MapPin size={18} />
                      </div>
                      <div className="w-16 h-16 rounded-full bg-brand-500/20 absolute -z-10 animate-ping" />
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};
