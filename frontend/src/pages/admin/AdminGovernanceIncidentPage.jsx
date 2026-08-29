import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldAlert, ArrowLeft, Building2, MapPin, Clock, Users,
  CheckCircle2, AlertTriangle, Sparkles, Send, Check, X,
  FileText, HardHat, ExternalLink
} from 'lucide-react';
import { governanceAdminApi } from '../../services/adminApi';

export const AdminGovernanceIncidentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorkers, setSelectedWorkers] = useState([]);
  const [dispatching, setDispatching] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');

  const fetchIncident = async () => {
    try {
      setLoading(true);
      const res = await governanceAdminApi.getIncidentById(id);
      if (res.data?.incident) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load incident detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [id]);

  const handleToggleWorker = (workerId) => {
    setSelectedWorkers(prev =>
      prev.includes(workerId) ? prev.filter(w => w !== workerId) : [...prev, workerId]
    );
  };

  const handleDispatch = async () => {
    if (selectedWorkers.length === 0) {
      alert('Please select at least one available field worker to dispatch.');
      return;
    }
    setDispatching(true);
    try {
      await governanceAdminApi.dispatchIncident(id, {
        workerIds: selectedWorkers,
        instructions: data?.incident?.recommendedAction
      });
      await fetchIncident();
    } catch (err) {
      alert(err.response?.data?.message || 'Dispatch failed');
    } finally {
      setDispatching(false);
    }
  };

  const handleClose = async () => {
    setClosing(true);
    try {
      await governanceAdminApi.closeIncident(id, {
        resolutionNotes: closeNotes || 'Incident resolved and verified by municipal authority.'
      });
      await fetchIncident();
    } catch (err) {
      alert(err.response?.data?.message || 'Close failed');
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-surface-400">
        Loading Incident Intelligence...
      </div>
    );
  }

  if (!data?.incident) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-white font-bold">Governance Incident Not Found</p>
        <Link to="/government/command-center" className="text-xs text-cyan-400 underline">
          Return to Command Center
        </Link>
      </div>
    );
  }

  const { incident, actionPlans, availableWorkers, departmentStats } = data;
  const cf = incident.contributingFactors || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/government/command-center')}
        className="flex items-center gap-1.5 text-xs text-surface-400 hover:text-white font-medium transition-colors"
      >
        <ArrowLeft size={14} /> Back to Command Center
      </button>

      {/* 1. INCIDENT HEADER CARD */}
      <div className="p-6 rounded-3xl bg-[#161b26] border border-cyan-500/30 shadow-xl space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                incident.severity === 'CRITICAL' ? 'bg-red-500/30 text-red-300 border border-red-500/40' :
                incident.severity === 'WARNING' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/40' :
                'bg-blue-500/30 text-blue-300 border border-blue-500/40'
              }`}>
                {incident.severity}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold font-mono">
                {incident.incidentType}
              </span>
              <span className="text-xs font-mono text-surface-400">
                #{incident.incidentId}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              {incident.title}
            </h1>
            <p className="text-xs text-surface-400 flex items-center gap-2">
              <Building2 size={13} /> {incident.department} • <MapPin size={13} /> {incident.area}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-900/80 border border-white/5 text-right min-w-[130px]">
            <span className="text-[10px] text-surface-400 uppercase font-mono block">Composite Risk</span>
            <span className="text-3xl font-black text-red-400">
              {incident.riskScore}
              <span className="text-xs text-surface-500 font-normal">/100</span>
            </span>
            <span className="block text-[10px] text-surface-400 mt-0.5">Status: {incident.status}</span>
          </div>
        </div>

        <p className="text-xs text-surface-300 leading-relaxed font-medium">
          {incident.description}
        </p>
      </div>

      {/* 2. EXPLAINABILITY: CONTRIBUTING FACTORS BREAKDOWN */}
      <div className="p-5 rounded-3xl bg-[#121620] border border-surface-800 space-y-3">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={14} className="text-cyan-400" />
          Explainability: Risk Score Contributing Factors
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-surface-900/80 border border-white/5">
            <span className="text-[10px] text-surface-400 block uppercase">Complaint Surge</span>
            <p className="text-lg font-bold text-white mt-0.5">+{cf.complaintSurge || 0} pts</p>
          </div>
          <div className="p-3 rounded-2xl bg-surface-900/80 border border-white/5">
            <span className="text-[10px] text-surface-400 block uppercase">Severity Weight</span>
            <p className="text-lg font-bold text-red-300 mt-0.5">+{cf.severity || 0} pts</p>
          </div>
          <div className="p-3 rounded-2xl bg-surface-900/80 border border-white/5">
            <span className="text-[10px] text-surface-400 block uppercase">SLA Breaches</span>
            <p className="text-lg font-bold text-amber-300 mt-0.5">+{cf.slaBreach || 0} pts</p>
          </div>
          <div className="p-3 rounded-2xl bg-surface-900/80 border border-white/5">
            <span className="text-[10px] text-surface-400 block uppercase">Citizen Dissatisfaction</span>
            <p className="text-lg font-bold text-purple-300 mt-0.5">+{cf.citizenDissatisfaction || 0} pts</p>
          </div>
          <div className="p-3 rounded-2xl bg-surface-900/80 border border-white/5">
            <span className="text-[10px] text-surface-400 block uppercase">Dept Overload</span>
            <p className="text-lg font-bold text-cyan-300 mt-0.5">+{cf.departmentOverload || 0} pts</p>
          </div>
        </div>
      </div>

      {/* 3. AI ACTION RECOMMENDATION & WORKER DISPATCH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI RECOMMENDATION CARD */}
        <div className="p-5 rounded-3xl bg-[#121620] border border-cyan-500/30 space-y-3">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-cyan-400" />
            AI Decision Support &amp; Recommended Action
          </h2>

          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-2">
            <p className="text-white font-bold text-sm">
              "{incident.recommendedAction}"
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-surface-300">
              <span>Department: {incident.department}</span>
              <span>Deadline: {incident.responseDeadline ? new Date(incident.responseDeadline).toLocaleTimeString() : 'Immediate'}</span>
            </div>
          </div>

          {incident.status !== 'Closed' && (
            <div className="pt-2 border-t border-white/5 space-y-2">
              <label className="text-[11px] font-bold text-surface-400 block uppercase">
                Resolve and Close Incident
              </label>
              <input
                type="text"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Enter operational verification notes..."
                className="input-field w-full text-xs"
              />
              <button
                onClick={handleClose}
                disabled={closing}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                <Check size={14} /> {closing ? 'Closing Incident...' : 'Mark Incident Resolved & Closed'}
              </button>
            </div>
          )}
        </div>

        {/* WORKER DISPATCH CARD */}
        <div className="p-5 rounded-3xl bg-[#121620] border border-surface-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <HardHat size={14} className="text-amber-400" />
              Dispatch Available Field Crews
            </h2>
            <span className="text-[10px] text-surface-400">{availableWorkers?.length || 0} Available</span>
          </div>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {availableWorkers?.length === 0 ? (
              <p className="text-xs text-surface-500 italic py-4 text-center">No field workers currently available.</p>
            ) : (
              availableWorkers?.map(w => (
                <label
                  key={w._id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs ${
                    selectedWorkers.includes(w._id)
                      ? 'bg-cyan-500/20 border-cyan-500 text-white'
                      : 'bg-surface-900/60 border-surface-800 text-surface-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedWorkers.includes(w._id)}
                      onChange={() => handleToggleWorker(w._id)}
                      className="rounded text-cyan-500"
                    />
                    <div>
                      <p className="font-bold text-white text-xs">{w.name}</p>
                      <span className="text-[10px] text-surface-400 font-mono">ID: {w.employeeId}</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    Available
                  </span>
                </label>
              ))
            )}
          </div>

          <button
            onClick={handleDispatch}
            disabled={dispatching || selectedWorkers.length === 0}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50 transition-all"
          >
            <Send size={13} /> {dispatching ? 'Dispatching Crews...' : `Dispatch Selected Crew (${selectedWorkers.length})`}
          </button>
        </div>
      </div>

      {/* 4. RELATED COMPLAINTS & ACTION PLANS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RELATED COMPLAINTS */}
        <div className="p-5 rounded-3xl bg-[#121620] border border-surface-800 space-y-3">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={14} className="text-purple-400" />
            Related Complaints ({incident.sourceReferences?.complaintIds?.length || 0})
          </h2>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {incident.sourceReferences?.complaintIds?.length === 0 ? (
              <p className="text-xs text-surface-500 italic py-4 text-center">No individual complaints directly linked.</p>
            ) : (
              incident.sourceReferences?.complaintIds?.map(c => (
                <div key={c._id} className="p-2.5 rounded-xl bg-surface-900/60 border border-surface-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">{c.title}</span>
                    <span className="text-[10px] text-surface-400 font-mono">#{c.complaintId} • {c.priority} • {c.status}</span>
                  </div>
                  <Link to={`/government/complaints/${c._id}`} className="text-cyan-400 hover:text-cyan-300">
                    <ExternalLink size={14} />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* TIMELINE */}
        <div className="p-5 rounded-3xl bg-[#121620] border border-surface-800 space-y-3">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={14} className="text-indigo-400" />
            Incident Operational Timeline
          </h2>

          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {incident.timeline?.map((t, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-surface-900/60 border border-surface-800 text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 text-[11px]">{t.eventType}</span>
                  <span className="text-[10px] text-surface-400">{new Date(t.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-surface-300 text-[11px] leading-tight">{t.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminGovernanceIncidentPage;
