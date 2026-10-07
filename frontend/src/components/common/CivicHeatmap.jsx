import React, { useEffect, useRef, useState } from 'react';
import { Filter, RefreshCw } from 'lucide-react';

/**
 * OpenStreetMap & Leaflet Interactive Civic Intelligence Heatmap
 * Single-instance map lifecycle, non-destructive filter updates & full-width layout.
 */
export const CivicHeatmap = ({
  heatPoints = [],
  clusters = [],
  summary = null,
  onSelectCluster,
  selectedCategory,
  setSelectedCategory,
  selectedSeverity,
  setSelectedSeverity,
  selectedStatus,
  setSelectedStatus,
  selectedTimeframe,
  setSelectedTimeframe,
  loading = false,
  onRefresh
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const initialBoundsSetRef = useRef(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Validate lat/lng coordinates strictly
  const isValidCoord = (lat, lng) => {
    const nLat = Number(lat);
    const nLng = Number(lng);
    return !isNaN(nLat) && !isNaN(nLng) && nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180 && (nLat !== 0 || nLng !== 0);
  };

  // 1. Initialize Map Instance EXACTLY ONCE per component mount
  useEffect(() => {
    let isMounted = true;

    const loadLeafletScript = () => {
      return new Promise((resolve, reject) => {
        if (window.L) return resolve(window.L);
        const existingScript = document.getElementById('leaflet-js');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve(window.L));
          existingScript.addEventListener('error', () => reject(new Error('Failed to load Leaflet script')));
          return;
        }
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve(window.L);
        script.onerror = () => reject(new Error('Failed to load Leaflet script'));
        document.head.appendChild(script);
      });
    };

    loadLeafletScript()
      .then((L) => {
        if (!isMounted || !mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
          // Default center: Coimbatore / Municipal Center
          const defaultCenter = [11.0168, 76.9558];

          const map = L.map(mapContainerRef.current, {
            center: defaultCenter,
            zoom: 13,
            zoomControl: true,
            attributionControl: true
          });

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors | CivicConnect AI',
            maxZoom: 19
          }).addTo(map);

          const layerGroup = L.layerGroup().addTo(map);

          mapInstanceRef.current = map;
          layerGroupRef.current = layerGroup;

          // Force invalidateSize after container layout stabilization
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          }, 150);
        }

        if (isMounted) {
          setIsMapReady(true);
        }
      })
      .catch((err) => {
        console.warn('Leaflet map initialization warning:', err.message);
      });

    // ResizeObserver to handle layout container size changes cleanly
    let resizeObserver = null;
    if (mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      isMounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  // 2. Update Map Markers & Clusters non-destructively when points/clusters change
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !layerGroupRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;

    layerGroup.clearLayers();
    const validCoords = [];

    if (clusters && clusters.length > 0) {
      clusters.forEach((cluster) => {
        if (!isValidCoord(cluster.centerLat, cluster.centerLng)) return;
        const lat = Number(cluster.centerLat);
        const lng = Number(cluster.centerLng);
        validCoords.push([lat, lng]);

        const isCritical = (cluster.criticalComplaints || 0) > 0 || (cluster.highComplaints || 0) > 0;
        const color = isCritical ? '#EF4444' : ((cluster.openComplaints || 0) > 0 ? '#F59E0B' : '#10B981');
        const radius = Math.min(35, Math.max(14, (cluster.totalComplaints || 1) * 4));

        const circleMarker = L.circleMarker([lat, lng], {
          radius,
          fillColor: color,
          color: '#FFFFFF',
          weight: 2,
          opacity: 0.95,
          fillOpacity: 0.65
        });

        const popupContent = `
          <div style="padding: 4px; min-width: 180px;">
            <strong style="font-size: 13px; color: #F8FAFC;">${cluster.zoneName || 'Municipal Zone'}</strong>
            <hr style="margin: 6px 0; border: 0; border-top: 1px solid rgba(148,163,184,0.2);" />
            <div style="font-size: 11px; color: #CBD5E1; line-height: 1.6;">
              <div>📋 <b>Total Reports:</b> ${cluster.totalComplaints}</div>
              <div>🔴 <b>Critical / High:</b> ${(cluster.criticalComplaints || 0) + (cluster.highComplaints || 0)}</div>
              <div>⏳ <b>Open Issues:</b> ${cluster.openComplaints || 0}</div>
              <div>✅ <b>Resolved:</b> ${cluster.resolvedComplaints || 0}</div>
              <div>👥 <b>Affected Citizens:</b> ${cluster.affectedCitizens || 0}</div>
            </div>
          </div>
        `;

        circleMarker.bindPopup(popupContent);
        circleMarker.on('click', () => {
          if (onSelectCluster) onSelectCluster(cluster);
        });
        layerGroup.addLayer(circleMarker);
      });
    } else if (heatPoints && heatPoints.length > 0) {
      heatPoints.forEach((point) => {
        if (!isValidCoord(point.lat, point.lng)) return;
        const lat = Number(point.lat);
        const lng = Number(point.lng);
        validCoords.push([lat, lng]);

        const isCritical = point.priority === 'Emergency' || point.priority === 'High';
        const color = isCritical ? '#EF4444' : (point.status === 'Resolved' ? '#10B981' : '#F59E0B');

        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: color,
          color: '#FFFFFF',
          weight: 1.5,
          opacity: 0.95,
          fillOpacity: 0.75
        });

        marker.bindPopup(`
          <div style="padding: 4px;">
            <b style="font-size: 12px; color: #F8FAFC;">#${point.complaintId || ''} - ${point.title || 'Complaint'}</b><br/>
            <span style="font-size: 11px; color: #94A3B8;">Category: ${point.category || ''} | Priority: ${point.priority || 'Normal'}</span>
          </div>
        `);
        layerGroup.addLayer(marker);
      });
    }

    // Set initial bounds ONCE when data first arrives
    if (!initialBoundsSetRef.current && validCoords.length > 0) {
      try {
        const bounds = L.latLngBounds(validCoords);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
          initialBoundsSetRef.current = true;
        }
      } catch (err) {
        console.warn('Map fitBounds warning:', err);
      }
    }

    // Always invalidate size to guarantee full container width rendering
    map.invalidateSize();
  }, [clusters, heatPoints, isMapReady, onSelectCluster]);

  return (
    <div className="space-y-4 w-full">
      {/* Filter Controls Bar */}
      <div className="glass-strong rounded-2xl p-4 border border-surface-200 dark:border-surface-800 flex flex-wrap items-center justify-between gap-3 text-xs w-full">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-surface-900 dark:text-surface-100">
            <Filter size={14} className="text-brand-500" />
            <span>Map Intelligence Filters:</span>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100"
          >
            <option value="All">All Categories</option>
            <option value="Road">Road Department</option>
            <option value="Water">Water Supply</option>
            <option value="Electricity">Electricity</option>
            <option value="Garbage">Garbage Collection</option>
            <option value="Drainage">Drainage</option>
            <option value="Street Light">Street Lights</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100"
          >
            <option value="All">All Severities</option>
            <option value="Emergency">Emergency</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open / Active</option>
            <option value="Resolved">Resolved / Solved</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
          </select>

          {/* Timeframe Filter */}
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-surface-100"
          >
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Heatmap</span>
        </button>
      </div>

      {/* Real-time Summary Metrics Bar */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
          <div className="bg-surface-900/60 p-2.5 rounded-xl border border-surface-800"><span className="text-surface-400 block text-[10px] uppercase font-bold">Total</span><b className="text-white text-sm font-extrabold">{summary.total ?? 0}</b></div>
          <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/20"><span className="text-red-400 block text-[10px] uppercase font-bold">Critical</span><b className="text-red-400 text-sm font-extrabold">{summary.critical ?? 0}</b></div>
          <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20"><span className="text-amber-400 block text-[10px] uppercase font-bold">High</span><b className="text-amber-400 text-sm font-extrabold">{summary.high ?? 0}</b></div>
          <div className="bg-yellow-500/10 p-2.5 rounded-xl border border-yellow-500/20"><span className="text-yellow-400 block text-[10px] uppercase font-bold">Medium</span><b className="text-yellow-400 text-sm font-extrabold">{summary.medium ?? 0}</b></div>
          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20"><span className="text-emerald-400 block text-[10px] uppercase font-bold">Low</span><b className="text-emerald-400 text-sm font-extrabold">{summary.low ?? 0}</b></div>
          <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20"><span className="text-blue-400 block text-[10px] uppercase font-bold">Open</span><b className="text-blue-400 text-sm font-extrabold">{summary.open ?? 0}</b></div>
          <div className="bg-purple-500/10 p-2.5 rounded-xl border border-purple-500/20"><span className="text-purple-400 block text-[10px] uppercase font-bold">In Progress</span><b className="text-purple-400 text-sm font-extrabold">{summary.inProgress ?? 0}</b></div>
          <div className="bg-green-500/10 p-2.5 rounded-xl border border-green-500/20"><span className="text-green-400 block text-[10px] uppercase font-bold">Resolved</span><b className="text-green-400 text-sm font-extrabold">{summary.resolved ?? 0}</b></div>
        </div>
      )}

      {/* Map Canvas Container */}
      <div className="relative w-full rounded-2xl border border-surface-300 dark:border-surface-800 overflow-hidden shadow-lg bg-surface-950 h-[550px] min-h-[400px]">
        {/* Leaflet canvas target container */}
        <div ref={mapContainerRef} className="w-full h-full relative z-10" />

        {/* Non-intrusive loading badge overlay */}
        {loading && (
          <div className="absolute top-4 right-4 z-20 px-3.5 py-2 rounded-xl bg-surface-900/90 text-white text-xs border border-brand-500/40 shadow-xl flex items-center gap-2 backdrop-blur-md">
            <RefreshCw size={14} className="animate-spin text-brand-400" />
            <span>Updating heatmap data...</span>
          </div>
        )}

        {/* Density Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-20 p-3 rounded-xl bg-surface-900/90 text-white text-[11px] backdrop-blur-md border border-surface-700/60 space-y-1.5 shadow-xl">
          <div className="font-bold uppercase tracking-wider text-[10px] text-surface-400 mb-1">Density Legend</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Critical / High Risk Zone</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Active Open Complaints</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Resolved / Solved Issues</div>
        </div>
      </div>
    </div>
  );
};
