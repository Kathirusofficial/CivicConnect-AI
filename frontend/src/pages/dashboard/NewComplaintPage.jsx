import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, ArrowRight, Check, MapPin, UploadCloud, X, Camera, AlertCircle, FileText, CheckCircle, 
  Sparkles, Loader2, RefreshCw, Shield, AlertTriangle, CheckSquare, ExternalLink, Layers, Copy
} from 'lucide-react';
import { useComplaintStore } from '../../store/complaintStore';
import { PageTransition } from '../../components/animations/PageTransition';
import { FadeIn } from '../../components/animations/FadeIn';
import { CategorySelect, PrioritySelect, CATEGORIES, PRIORITIES } from '../../components/ui/CustomSelects';
import { AppInput, AppTextarea, AppMediaCapture } from '../../components/ui/FormControls';
import { complaintAPI, aiAPI } from '../../services/api';


export const NewComplaintPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addComplaint = useComplaintStore((s) => s.addComplaint);
  const [step, setStep] = useState(1);
  const [media, setMedia] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // AI Classification state
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [aiError, setAiError] = useState('');
  const [classificationSource, setClassificationSource] = useState('AI Recommended');
  const [isEditingAfterAi, setIsEditingAfterAi] = useState(false);

  // AI Duplicate Detection state
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState(null);
  const [selectedDuplicateToLink, setSelectedDuplicateToLink] = useState(null);

  // Load drafted form data from localStorage or provide defaults
  const getDraft = () => {
    const draft = localStorage.getItem('complaintDraft');
    return draft ? JSON.parse(draft) : { title: '', category: '', description: '', priority: '', address: '', landmark: '' };
  };

  const { register, handleSubmit, watch, setValue, formState: { errors, isValid }, trigger, control } = useForm({
    defaultValues: getDraft(),
    mode: 'onTouched'
  });

  const formValues = watch();

  // Auto-save draft
  useEffect(() => {
    if (step < 6) {
      localStorage.setItem('complaintDraft', JSON.stringify(formValues));
    }
  }, [formValues, step]);

  const runAiAnalysisAndDuplicateCheck = async () => {
    setIsAiAnalyzing(true);
    setIsCheckingDuplicates(true);
    setAiError('');
    setDuplicateResult(null);

    // 1. Run Classification
    try {
      const res = await aiAPI.classifyComplaint({
        title: formValues.title,
        description: formValues.description,
        category: formValues.category,
        priority: formValues.priority,
        address: formValues.address,
        landmark: formValues.landmark || ''
      });

      if (res.data?.data) {
        setAiRecommendation(res.data.data);
      }
    } catch (err) {
      console.warn('AI classification fallback:', err);
      setAiRecommendation({
        category: formValues.category || 'Others',
        department: formValues.category || 'Municipality',
        priority: formValues.priority || 'Medium',
        severity: 'Medium',
        summary: formValues.description ? formValues.description.substring(0, 120) : formValues.title,
        confidence: 0
      });
    } finally {
      setIsAiAnalyzing(false);
    }

    // 2. Run Duplicate Check
    try {
      const dupRes = await aiAPI.checkDuplicate({
        title: formValues.title,
        description: formValues.description,
        category: formValues.category,
        address: formValues.address,
        landmark: formValues.landmark || '',
        latitude: formValues.latitude,
        longitude: formValues.longitude
      });

      if (dupRes.data?.data) {
        setDuplicateResult(dupRes.data.data);
      }
    } catch (err) {
      console.warn('Duplicate check error:', err);
      setDuplicateResult({
        possibleDuplicate: false,
        strongDuplicate: false,
        matches: []
      });
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleNextStep = async () => {
    let valid = false;
    if (step === 1) {
      valid = await trigger(['title', 'category', 'description', 'priority']);
    } else if (step === 2) {
      valid = await trigger(['address']);
    } else if (step === 3) {
      valid = true; // Evidence is optional
    } else if (step === 4) {
      valid = true;
      // Moving from Review (4) to AI Analysis (5) -> trigger AI analysis & duplicate check
      runAiAnalysisAndDuplicateCheck();
    }

    if (valid) setStep((s) => s + 1);
  };

  const handlePrevStep = () => {
    setStep((s) => s - 1);
  };

  const handleAcceptAi = () => {
    if (aiRecommendation) {
      setValue('category', aiRecommendation.category);
      setValue('priority', aiRecommendation.priority);
      setClassificationSource('AI Recommended');
      setIsEditingAfterAi(false);
    }
  };

  const handleModifySelection = () => {
    setIsEditingAfterAi(true);
    setClassificationSource('Citizen Modified');
  };

  const onSubmitForm = async (overrideDuplicateOf = null) => {
    const isConfirmed = window.confirm("Are you sure you want to submit this complaint?");
    if (!isConfirmed) return;

    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      const payload = {
        title: formValues.title,
        category: formValues.category,
        department: aiRecommendation?.department || formValues.category || 'Municipality',
        priority: formValues.priority,
        description: formValues.description,
        address: formValues.address,
        landmark: formValues.landmark || '',
        latitude: formValues.latitude,
        longitude: formValues.longitude,
        images: media.map(m => m.url || m.preview || m),
        duplicateOf: overrideDuplicateOf || selectedDuplicateToLink || undefined,
        aiAnalysis: aiRecommendation ? {
          category: aiRecommendation.category,
          department: aiRecommendation.department,
          priority: aiRecommendation.priority,
          severity: aiRecommendation.severity || 'Medium',
          summary: aiRecommendation.summary || formValues.description,
          confidence: typeof aiRecommendation.confidence === 'number' ? aiRecommendation.confidence : 0,
          analyzedAt: new Date(),
          classificationSource: classificationSource
        } : undefined
      };

      const res = await complaintAPI.create(payload);
      const createdComplaint = res.data?.complaint;
      const trackingId = createdComplaint?.complaintId || createdComplaint?._id;

      if (!trackingId) {
        throw new Error('Complaint ID was not returned by the server.');
      }

      // Add to store and invalidate React Query cache
      addComplaint(createdComplaint);
      await queryClient.invalidateQueries({ queryKey: ['my-complaints'] });
      await queryClient.invalidateQueries({ queryKey: ['complaints'] });

      localStorage.removeItem('complaintDraft');
      setSubmittedId(trackingId);
      setStep(6);
    } catch (err) {
      console.error('Complaint submission error:', err);
      setErrorMessage(err.message || 'Failed to submit complaint. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = ["Details", "Location", "Evidence", "Review", "AI Analysis", "Done"];

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header & Progress */}
        {step < 6 && (
          <FadeIn>
            <div className="flex items-center justify-between mb-8">
              <div>
                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-surface-500 hover:text-brand-500 transition-colors mb-4 text-sm font-medium">
                  <ArrowLeft size={16} /> Cancel & Return to Dashboard
                </button>
                <h1 className="font-display text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50 flex items-center gap-3">
                  Register New Complaint
                  {step === 5 && <Sparkles className="text-brand-500 animate-pulse" size={24} />}
                </h1>
                <p className="mt-1 text-surface-500 dark:text-surface-400">Step {step} of 5: {stepTitles[step-1]}</p>
              </div>
            </div>

            <div className="relative mb-10">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-surface-200 dark:bg-surface-800 -translate-y-1/2 rounded-full" />
              <motion.div 
                initial={false}
                animate={{ width: `${(step - 1) * 25}%` }}
                className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-brand-500 to-accent-emerald -translate-y-1/2 rounded-full transition-all duration-500 ease-out" 
              />
              <div className="relative flex justify-between z-10">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-surface-50 dark:border-surface-950 transition-colors duration-300
                      ${step > i ? 'bg-brand-500 text-white' : step === i ? 'bg-surface-50 dark:bg-surface-900 border-brand-500 text-brand-500 shadow-glow' : 'bg-surface-200 dark:bg-surface-800 text-surface-500'}`}
                    >
                      {step > i ? <Check size={18} /> : (
                        i === 5 ? <Sparkles size={16} /> : <span className="font-semibold">{i}</span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-surface-500 dark:text-surface-400 mt-1 hidden sm:block">
                      {stepTitles[i - 1]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        )}

        {/* Multi-step Form Views */}
        <div className="glass-strong rounded-3xl p-6 md:p-8 shadow-glass border border-surface-200 dark:border-surface-800 min-h-[400px] overflow-hidden relative">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: Details */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold flex items-center gap-2"><FileText className="text-brand-500" /> Complaint Information</h2>
                
                <div className="space-y-4">
                  <Controller
                    name="title"
                    control={control}
                    rules={{ required: "Title is required", minLength: { value: 5, message: "Title must be at least 5 characters" } }}
                    render={({ field }) => (
                      <AppInput
                        label={<span>Complaint Title <span className="text-red-500">*</span></span>}
                        placeholder="E.g. Broken street light on 5th Ave"
                        error={errors.title}
                        {...field}
                      />
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-surface-700 dark:text-surface-300 block mb-1.5">Category <span className="text-red-500">*</span></label>
                      <Controller
                        name="category"
                        control={control}
                        rules={{ required: "Category is required" }}
                        render={({ field }) => (
                          <CategorySelect
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.category}
                          />
                        )}
                      />
                      {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-surface-700 dark:text-surface-300 block mb-1.5">Priority <span className="text-red-500">*</span></label>
                      <Controller
                        name="priority"
                        control={control}
                        rules={{ required: "Priority is required" }}
                        render={({ field }) => (
                          <PrioritySelect
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.priority}
                          />
                        )}
                      />
                      {errors.priority && <p className="text-red-500 text-xs mt-1">{errors.priority.message}</p>}
                    </div>
                  </div>

                  <Controller
                    name="description"
                    control={control}
                    rules={{ required: "Description is required", minLength: { value: 10, message: "Please provide more details" } }}
                    render={({ field }) => (
                      <AppTextarea
                        label={<span>Description <span className="text-red-500">*</span></span>}
                        placeholder="Please provide detailed information about the issue..."
                        error={errors.description}
                        maxLength={500}
                        {...field}
                      />
                    )}
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 2: Location */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold flex items-center gap-2"><MapPin className="text-brand-500" /> Location Details</h2>
                <p className="text-surface-500 text-sm">Pinpoint exactly where the issue is located to help authorities find it faster.</p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <button type="button" className="flex-1 py-3 px-4 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium flex items-center justify-center gap-2 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
                    <MapPin size={18} /> Detect Current Location
                  </button>
                </div>

                <div className="relative w-full h-[220px] bg-surface-200 dark:bg-surface-800 rounded-2xl overflow-hidden border border-surface-300 dark:border-surface-700 flex items-center justify-center shadow-inner">
                  <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800&h=400&fit=crop" alt="Map Preview" className="absolute inset-0 w-full h-full object-cover opacity-70" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center drop-shadow-lg">
                    <div className="w-10 h-10 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg"><MapPin size={24} /></div>
                    <div className="w-4 h-4 rounded-full bg-black/20 mt-1 blur-[2px]" />
                  </div>
                  <div className="absolute top-4 left-4 bg-white/90 dark:bg-surface-900/90 backdrop-blur px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm">
                    Interactive Map Preview
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="address"
                    control={control}
                    rules={{ required: "Address is required" }}
                    render={({ field }) => (
                      <AppInput
                        label={<span>Address / Street <span className="text-red-500">*</span></span>}
                        placeholder="Enter complete street address"
                        error={errors.address}
                        {...field}
                      />
                    )}
                  />

                  <Controller
                    name="landmark"
                    control={control}
                    render={({ field }) => (
                      <AppInput
                        label={<span>Landmark (Optional)</span>}
                        placeholder="Nearby school, park, or hospital"
                        {...field}
                      />
                    )}
                  />
                </div>
              </motion.div>
            )}

            {/* STEP 3: Evidence */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold flex items-center gap-2"><Camera className="text-brand-500" /> Evidence (Optional)</h2>
                <p className="text-surface-500 text-sm">Upload clear photos or videos to help us understand the issue better.</p>
                
                <AppMediaCapture media={media} setMedia={setMedia} />
              </motion.div>
            )}

            {/* STEP 4: Review */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center gap-2"><CheckCircle className="text-brand-500" /> Review Details</h2>
                </div>
                <p className="text-surface-500 text-sm mb-4">Please verify your inputs. In the next step, our AI service will analyze your complaint for department routing and urgency.</p>

                <div className="space-y-4">
                  <div className="glass-strong rounded-xl p-5 border border-surface-200 dark:border-surface-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                      <div>
                        <p className="text-xs text-surface-500 uppercase font-semibold tracking-wider mb-1">Title</p>
                        <p className="font-medium text-surface-900 dark:text-surface-50">{formValues.title}</p>
                      </div>
                      <div>
                        <p className="text-xs text-surface-500 uppercase font-semibold tracking-wider mb-1">Category & Priority</p>
                        <p className="font-medium text-surface-900 dark:text-surface-50">{formValues.category} • <span className={formValues.priority === 'High' || formValues.priority === 'Emergency' ? 'text-red-500' : 'text-orange-500'}>{formValues.priority}</span></p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-surface-500 uppercase font-semibold tracking-wider mb-1">Description</p>
                        <p className="text-sm text-surface-700 dark:text-surface-300 bg-surface-100 dark:bg-surface-900/50 p-3 rounded-lg leading-relaxed">{formValues.description}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-surface-500 uppercase font-semibold tracking-wider mb-1">Location Details</p>
                        <p className="text-sm text-surface-900 dark:text-surface-50 flex items-center gap-2">
                          <MapPin size={16} className="text-surface-400" /> {formValues.address} {formValues.landmark ? `(Landmark: ${formValues.landmark})` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="glass-strong rounded-xl p-5 border border-surface-200 dark:border-surface-800">
                    <p className="text-xs text-surface-500 uppercase font-semibold tracking-wider mb-3">Evidence Attached</p>
                    {media.length > 0 ? (
                      <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                        {media.map((item, idx) => (
                          <div key={idx} className="relative shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-surface-300 dark:border-surface-700 shadow-sm bg-black">
                             {item.type === 'image' ? (
                               <img src={item.url} alt="Evidence" className="w-full h-full object-cover" />
                             ) : (
                               <video src={item.url} className="w-full h-full object-cover" />
                             )}
                             <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white px-1 py-0.5 truncate text-center">
                               {item.name}
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-surface-500 flex items-center gap-2"><AlertCircle size={16} /> No evidence uploaded</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: AI Analysis & Recommendation */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Sparkles className="text-brand-500" /> AI Intelligence Analysis
                  </h2>
                  <button 
                    type="button"
                    onClick={runAiClassification}
                    disabled={isAiAnalyzing}
                    className="text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:underline disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={isAiAnalyzing ? 'animate-spin' : ''} /> Re-analyze
                  </button>
                </div>
                <p className="text-surface-500 text-sm">
                  CivicConnect AI analyzes your complaint to classify department routing, evaluate severity, and accelerate municipal resolution.
                </p>

                {isAiAnalyzing ? (
                  <div className="py-14 text-center space-y-4 glass-strong rounded-2xl border border-brand-500/20 p-8">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 rounded-full border-4 border-brand-500/20 animate-ping" />
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-500 to-accent-cyan flex items-center justify-center text-white shadow-glow">
                        <Sparkles size={28} className="animate-spin" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
                      Analyzing complaint with AI Intelligence...
                    </h3>
                    <p className="text-xs text-surface-500 max-w-md mx-auto">
                      Extracting urgency indicators, matching municipal departments, and generating civic summary.
                    </p>
                  </div>
                ) : aiRecommendation ? (
                  <div className="space-y-5">
                    {/* Recommendation Card */}
                    <div className="glass-strong rounded-2xl p-6 border-2 border-brand-500/30 dark:border-brand-500/40 bg-brand-50/20 dark:bg-brand-950/20 shadow-glass space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-200 dark:border-surface-800 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                            <Sparkles size={18} />
                          </span>
                          <span className="font-semibold text-surface-900 dark:text-surface-50">AI Recommendation</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full text-xs font-semibold border border-brand-500/20">
                            AI Confidence: {Math.round((aiRecommendation.confidence || 0) * 100)}%
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${classificationSource === 'AI Recommended' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'}`}>
                            {classificationSource}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-surface-50/80 dark:bg-surface-900/60 p-3.5 rounded-xl border border-surface-200/60 dark:border-surface-800/60">
                          <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Category</p>
                          <p className="text-sm font-bold text-surface-900 dark:text-surface-50">{aiRecommendation.category}</p>
                        </div>
                        <div className="bg-surface-50/80 dark:bg-surface-900/60 p-3.5 rounded-xl border border-surface-200/60 dark:border-surface-800/60">
                          <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Department</p>
                          <p className="text-sm font-bold text-surface-900 dark:text-surface-50">{aiRecommendation.department}</p>
                        </div>
                        <div className="bg-surface-50/80 dark:bg-surface-900/60 p-3.5 rounded-xl border border-surface-200/60 dark:border-surface-800/60">
                          <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Priority</p>
                          <p className={`text-sm font-bold ${aiRecommendation.priority === 'High' || aiRecommendation.priority === 'Emergency' ? 'text-red-500' : 'text-orange-500'}`}>
                            {aiRecommendation.priority}
                          </p>
                        </div>
                        <div className="bg-surface-50/80 dark:bg-surface-900/60 p-3.5 rounded-xl border border-surface-200/60 dark:border-surface-800/60">
                          <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider mb-1">Severity</p>
                          <p className="text-sm font-bold text-purple-600 dark:text-purple-400">{aiRecommendation.severity || 'Medium'}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5">AI Summary</p>
                        <p className="text-sm text-surface-700 dark:text-surface-300 bg-surface-50/60 dark:bg-surface-900/40 p-3.5 rounded-xl border border-surface-200/50 dark:border-surface-800/50 leading-relaxed italic">
                          "{aiRecommendation.summary}"
                        </p>
                      </div>

                      {/* Citizen Action Choice */}
                      <div className="pt-2 flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={handleAcceptAi}
                          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                            classificationSource === 'AI Recommended'
                              ? 'bg-emerald-600 text-white shadow-emerald-600/30 shadow-md'
                              : 'bg-surface-200 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-emerald-500 hover:text-white'
                          }`}
                        >
                          <CheckSquare size={16} /> Accept Recommendation
                        </button>

                        <button
                          type="button"
                          onClick={handleModifySelection}
                          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                            classificationSource === 'Citizen Modified'
                              ? 'bg-brand-600 text-white shadow-brand-600/30 shadow-md'
                              : 'bg-surface-200 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-700'
                          }`}
                        >
                          <AlertTriangle size={16} /> Modify / Keep My Values
                        </button>
                      </div>
                    </div>

                    {/* Inline Editor if Citizen chooses to modify */}
                    {isEditingAfterAi && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="glass-strong rounded-2xl p-5 border border-surface-200 dark:border-surface-800 space-y-4"
                      >
                        <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                          Customize Your Complaint Classification
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-surface-700 dark:text-surface-300 block mb-1">
                              Final Category
                            </label>
                            <Controller
                              name="category"
                              control={control}
                              render={({ field }) => (
                                <CategorySelect
                                  value={field.value}
                                  onChange={(v) => {
                                    field.onChange(v);
                                    setClassificationSource('Citizen Modified');
                                  }}
                                />
                              )}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-surface-700 dark:text-surface-300 block mb-1">
                              Final Priority
                            </label>
                            <Controller
                              name="priority"
                              control={control}
                              render={({ field }) => (
                                <PrioritySelect
                                  value={field.value}
                                  onChange={(v) => {
                                    field.onChange(v);
                                    setClassificationSource('Citizen Modified');
                                  }}
                                />
                              )}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* AI Duplicate Detection Section */}
                    <div className="pt-2 space-y-4">
                      {isCheckingDuplicates ? (
                        <div className="p-4 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/30 flex items-center gap-3 text-xs text-surface-500">
                          <Loader2 size={16} className="animate-spin text-brand-500 shrink-0" />
                          <span>Checking municipal database for similar civic complaints nearby...</span>
                        </div>
                      ) : duplicateResult?.matches?.length > 0 ? (
                        <div className="glass-strong rounded-2xl p-5 border-2 border-amber-500/40 bg-amber-500/10 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                                <AlertTriangle size={18} />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                                  {duplicateResult.strongDuplicate ? 'Strong Duplicate Complaint Detected' : 'Possible Duplicate Complaint'}
                                </h4>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                                  We found a similar civic issue already reported in this vicinity.
                                </p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              {duplicateResult.matches.length} Match{duplicateResult.matches.length > 1 ? 'es' : ''} Found
                            </span>
                          </div>

                          <div className="space-y-3">
                            {duplicateResult.matches.map((match) => (
                              <div 
                                key={match._id}
                                className="p-4 rounded-xl bg-surface-50/90 dark:bg-surface-900/80 border border-amber-500/20 space-y-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                                      #{match.complaintId}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300">
                                      {match.status}
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                                      {match.category}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    {match.distanceMeters !== null && match.distanceMeters !== undefined && (
                                      <span className="flex items-center gap-1 text-surface-500 dark:text-surface-400">
                                        <MapPin size={12} className="text-brand-500" /> {match.distanceMeters}m away
                                      </span>
                                    )}
                                    <span className="px-2 py-0.5 rounded-full font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                                      Similarity: {Math.round(match.similarity * 100)}%
                                    </span>
                                  </div>
                                </div>

                                <p className="text-xs font-medium text-surface-800 dark:text-surface-200">
                                  <span className="text-surface-400 font-normal">Issue: </span>"{match.summary}"
                                </p>

                                {match.reason && (
                                  <p className="text-[11px] text-surface-500 dark:text-surface-400 italic bg-black/5 dark:bg-white/5 p-2 rounded-lg">
                                    <span className="font-medium not-italic">Why this may be the same issue: </span>{match.reason}
                                  </p>
                                )}

                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => window.open(`/complaints/${match.complaintId || match._id}`, '_blank')}
                                    className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
                                  >
                                    <ExternalLink size={12} /> View Existing Complaint
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onSubmitForm(match._id)}
                                    disabled={isSubmitting}
                                    className="btn-primary py-1.5 px-3 text-xs bg-amber-600 hover:bg-amber-700 shadow-amber-600/20 flex items-center gap-1.5"
                                  >
                                    <Layers size={12} /> Link to this Existing Issue
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                          <CheckCircle size={14} className="shrink-0" />
                          <span>No duplicate civic complaints detected in this vicinity. Your complaint will be logged as a new issue.</span>
                        </div>
                      )}
                    </div>

                    {errorMessage && (
                      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-xl text-sm flex items-start gap-3 border border-red-200 dark:border-red-800">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <p>{errorMessage}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </motion.div>
            )}

            {/* STEP 6: Success state */}
            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-center py-12 space-y-6"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15, delay: 0.2 }}
                  className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center relative"
                >
                  <Check size={48} strokeWidth={3} />
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
                </motion.div>
                
                <div>
                  <h2 className="text-3xl font-display font-bold text-surface-900 dark:text-surface-50 mb-2">Complaint Registered!</h2>
                  <p className="text-surface-500 dark:text-surface-400 max-w-sm mx-auto">Your issue has been successfully classified and logged in the municipal database.</p>
                </div>

                <div className="bg-surface-50 dark:bg-surface-900/50 py-3 px-6 rounded-xl border border-surface-200 dark:border-surface-800 inline-block font-mono text-lg font-semibold text-brand-600 dark:text-brand-400 shadow-inner">
                  {submittedId}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 mt-4 w-full sm:w-auto">
                  <button 
                    onClick={() => navigate(`/complaints/${submittedId}`)}
                    className="btn-primary w-full sm:w-auto"
                  >
                    View My Complaint
                  </button>
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="btn-secondary w-full sm:w-auto"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation Buttons UI */}
        {step < 6 && (
          <div className="flex items-center justify-between pt-4 pb-12">
            <button 
              onClick={handlePrevStep}
              disabled={step === 1 || isSubmitting}
              className={`px-6 py-2.5 rounded-xl font-medium transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : 'bg-surface-200 hover:bg-surface-300 text-surface-700 dark:bg-surface-800 dark:hover:bg-surface-700 dark:text-surface-300'}`}
            >
              Back
            </button>
            
            {step < 5 ? (
              <button 
                onClick={handleNextStep}
                className="btn-primary flex items-center gap-2"
              >
                {step === 4 ? (
                  <>AI Analysis & Recommendation <Sparkles size={16} /></>
                ) : (
                  <>Proceed Next <ArrowRight size={16} /></>
                )}
              </button>
            ) : (
              <button 
                onClick={onSubmitForm}
                disabled={isSubmitting || isAiAnalyzing}
                className={`btn-primary bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30 flex items-center gap-2 ${isSubmitting || isAiAnalyzing ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isSubmitting ? (
                  <>Logging Complaint in Database <Loader2 size={16} className="animate-spin" /></>
                ) : (
                  <>Finalize & Submit Complaint <Check size={18} /></>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
};
