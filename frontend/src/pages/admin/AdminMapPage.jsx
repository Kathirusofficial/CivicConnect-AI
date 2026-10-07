import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, ExternalLink, AlertTriangle, Clock, CheckCircle2, Loader2, Layers, BrainCircuit, Flame, Sparkles, Users, TrendingUp } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { mapAdminApi, predictiveAdminApi } from '../../services/adminApi';

const PIN_COLORS = {
  Pending: '#EAB308',
  Verified: '#3B82F6',
  Assigned: '#A855F7',
  'In Progress': '#F97316',
  Resolved: '#10B981',
  Rejected: '#EF4444',
};

const HOTSPOT_COLORS = {
  Critical: '#EF4444',
  High: '#F97316',
  Medium: '#EAB308',
  Low: '#10B981',
};

const LEGEND = [
  { status: 'Pending', color: '#EAB308', label: 'Pending' },
  { status: 'Verified', color: '#3B82F6', label: 'Verified' },
  { status: 'Assigned', color: '#A855F7', label: 'Assigned' },
  { status: 'In Progress', color: '#F97316', label: 'In Progress' },
  { status: 'Resolved', color: '#10B981', label: 'Resolved' },
  { status: 'Rejected', color: '#EF4444', label: 'Rejected' },
];

export const AdminMapPage = () => {
  const [searchParams] = useSearchParams();
  const [complaints, setComplaints] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [showHotspotsLayer, setShowHotspotsLayer] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [filter, setFilter] = useState(searchParams.get('filter') || searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const f = searchParams.get('filter') || searchParams.get('search') || '';
    setFilter(f);
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      mapAdminApi.getComplaints().catch(() => ({ data: [] })),
      predictiveAdminApi.getHotspots({ days: 30, radius: 500 }).catch(() => ({ data: { hotspots: [] } }))
    ])
      .then(([compRes, hotRes]) => {
        if (Array.isArray(compRes.data)) {
          setComplaints(compRes.data);
        }
        if (hotRes.data?.hotspots) {
          setHotspots(hotRes.data.hotspots);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Compute dynamic bounding box for pins & hotspots
  const allCoords = [
    ...complaints.filter(c => (c.latitude || c.lat) && (c.longitude || c.lng)).map(c => ({ lat: Number(c.latitude || c.lat), lng: Number(c.longitude || c.lng) })),
    ...hotspots.map(h => ({ lat: Number(h.latitude), lng: Number(h.longitude) }))
  ];

  const lats = allCoords.map(c => c.lat);
  const lngs = allCoords.map(c => c.lng);
  
  const minLat = lats.length ? Math.min(...lats) - 0.005 : 11.00;
  const maxLat = lats.length ? Math.max(...lats) + 0.005 : 11.05;
  const minLng = lngs.length ? Math.min(...lngs) - 0.005 : 76.94;
  const maxLng = lngs.length ? Math.max(...lngs) + 0.005 : 76.98;

  const latToY = (lat) => {
    const v = Number(lat);
    if (isNaN(v) || maxLat === minLat) return 50;
    return Math.max(10, Math.min(90, ((maxLat - v) / (maxLat - minLat)) * 100));
  };

  const lngToX = (lng) => {
    const v = Number(lng);
    if (isNaN(v) || maxLng === minLng) return 50;
    return Math.max(10, Math.min(90, ((v - minLng) / (maxLng - minLng)) * 100));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin size={22} className="text-brand-400" /> City Live Operations &amp; Predictive Risk Map
          </h1>
          <p className="text-surface-400 text-sm mt-0.5">
            Geographic complaint pins with predictive municipal hotspot risk modeling layer
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowHotspotsLayer(l => !l)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showHotspotsLayer 
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-glow' 
                : 'bg-surface-800/80 text-surface-400 border border-surface-700 hover:bg-surface-700'
            }`}
          >
            <BrainCircuit size={13} />
            Predictive Risk Layer {showHotspotsLayer ? '(Active)' : '(Hidden)'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {[
          { key: '', label: 'All Issues' },
          { key: 'hotspots_only', label: '🔥 Civic Hotspots Layer' },
          { key: 'ai_critical', label: '🚨 Critical AI Priority' },
          { key: 'ai_high', label: '⚡ High AI Priority' },
          { key: 'emergency', label: '🚨 Emergency' },
          { key: 'cluster', label: '👥 Duplicate Clusters' },
          { key: 'Pending', label: 'Pending' },
          { key: 'In Progress', label: 'In Progress' },
          { key: 'Resolved', label: 'Resolved' },
        ].map(item => {
          const isActive = filter === item.key;
          return (
            <button key={item.key} onClick={() => setFilter(item.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive 
                  ? 'bg-brand-600 text-white shadow-glow' 
                  : 'bg-surface-800/80 text-surface-300 border border-surface-700/60 hover:bg-surface-700'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Map Area */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex-1 relative rounded-2xl overflow-hidden"
          style={{ height: '540px', background: 'rgba(10,5,20,0.85)', border: '1px solid rgba(255,255,255,0.07)' }}>
          
          {/* Grid/Map Background */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(139,92,246,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
          
          {/* Center lines */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute left-0 right-0 h-px bg-brand-500/10" />
            <div className="absolute top-0 bottom-0 w-px bg-brand-500/10" />
          </div>

          {/* Map Label */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-surface-900/80 text-xs text-surface-300 border border-surface-700/50 flex items-center gap-1.5 z-20">
            📍 City Geo-Operations &amp; Hotspots Map
          </div>

          {/* PREDICTIVE HOTSPOTS LAYER */}
          {showHotspotsLayer && hotspots.map((h, idx) => {
            const x = lngToX(h.longitude);
            const y = latToY(h.latitude);
            const isSelected = selectedHotspot?.name === h.name;
            const color = HOTSPOT_COLORS[h.riskLevel] || '#EF4444';

            return (
              <motion.div key={`hotspot-${idx}`}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', zIndex: isSelected ? 30 : 15 }}
                onClick={() => { setSelectedHotspot(isSelected ? null : h); setSelected(null); }}
                className="cursor-pointer group">
                
                {/* Hotspot radius aura */}
                <div 
                  className="absolute -inset-4 rounded-full opacity-40 group-hover:opacity-70 animate-pulse transition-opacity pointer-events-none"
                  style={{ backgroundColor: `${color}30`, border: `1.5px dashed ${color}80` }}
                />

                {/* Hotspot Core Badge */}
                <div 
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-125 ${isSelected ? 'scale-125 ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}80` }}
                >
                  <Flame size={18} className="text-white animate-bounce" />
                </div>

                {/* Hotspot Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-52 px-2.5 py-1.5 rounded-lg bg-surface-900/95 border border-red-500/50 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-40 text-center shadow-2xl whitespace-nowrap overflow-hidden text-ellipsis">
                  <p className="font-bold text-red-300">🔥 Hotspot: {h.name}</p>
                  <p className="text-[10px] text-surface-400">Risk Score: {h.riskScore}/100 • {h.complaintCount} reports</p>
                </div>
              </motion.div>
            );
          })}

          {/* COMPLAINT PINS */}
          {filter !== 'hotspots_only' && complaints.filter(c => {
            if (!filter) return true;
            if (filter === 'ai_critical') return c.decisionSupport?.priorityLevel === 'Critical' || c.priority === 'Emergency';
            if (filter === 'ai_high') return c.decisionSupport?.priorityLevel === 'High';
            if (filter === 'emergency') return c.priority === 'Emergency';
            if (filter === 'cluster') return c.duplicateGroupId || (c.decisionSupport?.citizenImpactCount > 1);
            return c.status === filter;
          }).map(c => {
            const x = lngToX(c.longitude || c.lng);
            const y = latToY(c.latitude || c.lat);
            const pinColor = PIN_COLORS[c.status] || '#888';
            const isSelected = selected?._id === c._id;
            const isCritical = c.decisionSupport?.priorityLevel === 'Critical' || c.priority === 'Emergency';

            return (
              <motion.div key={c._id}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -100%)', zIndex: isSelected ? 25 : 10 }}
                onClick={() => { setSelected(isSelected ? null : c); setSelectedHotspot(null); }}
                className="cursor-pointer group">
                
                {/* Pulse ring for Emergency / Critical */}
                {isCritical && (
                  <div className="absolute -inset-2 rounded-full animate-ping" style={{ backgroundColor: `${pinColor}30` }} />
                )}

                <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-125 ${isSelected ? 'scale-125 ring-2 ring-white/50' : ''}`}
                  style={{ backgroundColor: pinColor, boxShadow: `0 0 12px ${pinColor}60` }}>
                  <MapPin size={14} className="text-white" />
                </div>
                
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 px-2.5 py-1.5 rounded-lg bg-surface-900/95 border border-surface-700 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 text-center shadow-xl whitespace-nowrap overflow-hidden text-ellipsis">
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-[10px] text-surface-400">Score: {c.decisionSupport?.priorityScore ?? 50}/100 • {c.status}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Side Panel */}
        <div className="lg:w-80 space-y-3">
          {/* Selected Predictive Hotspot Detail */}
          <AnimatePresence mode="wait">
            {selectedHotspot && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-2xl bg-surface-900/90 border-2 border-red-500/60 shadow-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white font-extrabold text-[10px] tracking-wider uppercase">
                      PREDICTED RISK
                    </span>
                    <span className="text-xs font-bold text-red-300">Phase 8 Hotspot</span>
                  </div>
                  <button onClick={() => setSelectedHotspot(null)} className="text-surface-400 hover:text-white"><X size={14} /></button>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm leading-tight">
                    {selectedHotspot.dominantCategory || selectedHotspot.name || 'Civic Risk Zone'}
                  </h3>
                  <p className="text-surface-400 text-xs mt-0.5">
                    Dept: {selectedHotspot.dominantDepartment || selectedHotspot.category} • Radius: {selectedHotspot.radiusMeters || 800}m
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[10px] text-surface-400 block">Risk Score</span>
                    <span className="font-bold text-red-300">{selectedHotspot.riskScore} / 100 ({selectedHotspot.riskLevel})</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[10px] text-surface-400 block">Incident Count</span>
                    <span className="font-bold text-white">{selectedHotspot.complaintCount} reports</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[10px] text-surface-400 block">7-Day Projected Volume</span>
                    <span className="font-bold text-yellow-300">+{selectedHotspot.predictedVolume?.next7Days ?? selectedHotspot.unresolvedCount ?? 4} complaints</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-[10px] text-surface-400 block">30-Day Projection</span>
                    <span className="font-bold text-violet-300">+{selectedHotspot.predictedVolume?.next30Days ?? 12} complaints</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs">
                  <span className="text-[10px] font-bold text-red-300 block mb-0.5">PREVENTIVE ACTION GUIDANCE</span>
                  <p className="text-surface-200 text-[11px] leading-relaxed">
                    {selectedHotspot.recommendation || selectedHotspot.recommendedAction || 'Dispatch maintenance crew to audit sector.'}
                  </p>
                </div>

                <Link to="/government/predictions"
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-purple-600/20 text-purple-300 text-xs font-semibold hover:bg-purple-600/30 transition-all border border-purple-500/30">
                  <BrainCircuit size={13} /> Open in Predictive Planning Suite
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Selected Complaint Detail */}
          <AnimatePresence mode="wait">
            {selected && !selectedHotspot && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-2xl" style={{ background: 'rgba(25,16,39,0.85)', border: `2px solid ${PIN_COLORS[selected.status]}40` }}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-mono text-brand-400 font-bold">
                    #{selected.complaintId || selected._id?.slice(-6)?.toUpperCase()}
                  </span>
                  <button onClick={() => setSelected(null)} className="text-surface-500 hover:text-white transition-colors"><X size={14} /></button>
                </div>

                <h3 className="text-white font-semibold text-sm leading-tight mb-1">{selected.title}</h3>
                <p className="text-surface-400 text-xs mb-3 flex items-center gap-1"><MapPin size={11} /> {selected.address}</p>
                
                {selected.decisionSupport && (
                  <div className="mb-3 p-2 rounded-xl bg-white/5 border border-white/5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-surface-400 font-medium">AI Priority Score</span>
                      <span className="font-bold text-white">{selected.decisionSupport.priorityScore}/100</span>
                    </div>
                    <p className="text-brand-300 text-[11px] font-medium">{selected.decisionSupport.recommendedAction}</p>
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded-lg text-xs font-medium" style={{ backgroundColor: `${PIN_COLORS[selected.status]}20`, color: PIN_COLORS[selected.status] }}>{selected.status}</span>
                  <span className="text-xs text-surface-400">{selected.citizen?.name}</span>
                </div>
                
                <Link to={`/government/complaints/${selected._id}`}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-brand-600/20 text-brand-400 text-xs font-medium hover:bg-brand-600/30 transition-all">
                  <ExternalLink size={13} /> View &amp; Operate Complaint
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* All Civic Hotspots & Issues List */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="px-3 py-2.5 text-xs font-semibold text-surface-400 uppercase tracking-wide border-b border-white/5 flex items-center justify-between">
              <span>Civic Hotspots &amp; Issues</span>
              <span className="text-[10px] text-brand-400">{hotspots.length} hotspots • {complaints.length} issues</span>
            </p>
            <div className="max-h-72 overflow-y-auto scrollbar-hide divide-y divide-white/5">
              {hotspots.map((h, i) => (
                <button key={`h-${i}`} onClick={() => { setSelectedHotspot(h); setSelected(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/4 transition-colors ${selectedHotspot?.name === h.name ? 'bg-red-500/10' : ''}`}>
                  <Flame size={14} className="text-red-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-semibold truncate">{h.name}</p>
                    <p className="text-surface-400 text-[10px] truncate">{h.complaintCount} reports • {h.category}</p>
                  </div>
                  <span className="text-[10px] font-bold text-red-300 bg-red-500/15 px-1.5 py-0.5 rounded border border-red-500/30">
                    {h.riskScore}
                  </span>
                </button>
              ))}

              {complaints.map(c => (
                <button key={c._id} onClick={() => { setSelected(s => s?._id === c._id ? null : c); setSelectedHotspot(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/4 transition-colors ${selected?._id === c._id ? 'bg-brand-500/10' : ''}`}>
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIN_COLORS[c.status] }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-medium truncate">{c.title}</p>
                    <p className="text-surface-500 text-[10px] truncate">{c.address}</p>
                  </div>
                  {c.decisionSupport?.priorityScore && (
                    <span className="text-[10px] font-bold text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
                      {c.decisionSupport.priorityScore}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="p-3 rounded-xl" style={{ background: 'rgba(25,16,39,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">Map Legend</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="flex items-center gap-1.5"><Flame size={12} className="text-red-400" /><span className="text-surface-300">Hotspot Cluster</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /><span className="text-surface-400">Pending</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /><span className="text-surface-400">Verified</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /><span className="text-surface-400">Assigned</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" /><span className="text-surface-400">In Progress</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /><span className="text-surface-400">Resolved</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
