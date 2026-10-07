import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { loadGoogleMapsScript, formatDistance } from '../../services/googleMapsService';

export const GoogleMapLocationVerifier = ({
  complaintLat,
  complaintLng,
  complaintAddress = 'Complaint Location Benchmark',
  officerLat,
  officerLng,
  officerAddress = 'Officer Current Location',
  distanceMeters,
  allowedRadiusMeters = 100,
  locationVerified = false
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapError, setMapError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const hasComplaintCoords = complaintLat != null && complaintLng != null && !isNaN(complaintLat) && !isNaN(complaintLng) && Number(complaintLat) !== 0;
  const hasOfficerCoords = officerLat != null && officerLng != null && !isNaN(officerLat) && !isNaN(officerLng) && Number(officerLat) !== 0;

  useEffect(() => {
    if (!hasComplaintCoords && !hasOfficerCoords) return;

    let isMounted = true;

    loadGoogleMapsScript()
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;

        const centerLat = hasOfficerCoords ? Number(officerLat) : Number(complaintLat);
        const centerLng = hasOfficerCoords ? Number(officerLng) : Number(complaintLng);

        // Dark modern map style
        const darkMapStyle = [
          { elementType: 'geometry', stylers: [{ color: '#171427' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#171427' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8d8ba7' }] },
          { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c4b5fd' }] },
          { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#a78bfa' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e2849' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1f1a35' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1329' }] }
        ];

        const map = new maps.Map(mapContainerRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 17,
          styles: darkMapStyle,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative'
        });

        mapInstanceRef.current = map;
        const bounds = new maps.LatLngBounds();

        // 1. Complaint Benchmark Location Marker
        if (hasComplaintCoords) {
          const complaintPos = { lat: Number(complaintLat), lng: Number(complaintLng) };
          bounds.extend(complaintPos);

          new maps.Marker({
            position: complaintPos,
            map,
            title: `Complaint Location: ${complaintAddress}`,
            icon: {
              path: maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#ef4444', // Red
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2
            }
          });

          // Allowed Radius Circle Overlay
          new maps.Circle({
            map,
            center: complaintPos,
            radius: Number(allowedRadiusMeters),
            fillColor: locationVerified ? '#10b981' : '#f59e0b',
            fillOpacity: 0.15,
            strokeColor: locationVerified ? '#10b981' : '#f59e0b',
            strokeOpacity: 0.5,
            strokeWeight: 1.5
          });
        }

        // 2. Officer Current Location Marker
        if (hasOfficerCoords) {
          const officerPos = { lat: Number(officerLat), lng: Number(officerLng) };
          bounds.extend(officerPos);

          new maps.Marker({
            position: officerPos,
            map,
            title: `Officer GPS: ${officerAddress}`,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: locationVerified ? '#10b981' : '#3b82f6', // Green or Blue
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2.5
            }
          });
        }

        // 3. Draw Connecting Line between Officer and Complaint
        if (hasComplaintCoords && hasOfficerCoords) {
          const polylinePath = [
            { lat: Number(complaintLat), lng: Number(complaintLng) },
            { lat: Number(officerLat), lng: Number(officerLng) }
          ];

          new maps.Polyline({
            path: polylinePath,
            map,
            geodesic: true,
            strokeColor: locationVerified ? '#10b981' : '#ef4444',
            strokeOpacity: 0.8,
            strokeWeight: 3
          });

          map.fitBounds(bounds);
          if (map.getZoom() > 18) map.setZoom(18);
        }

        setIsLoaded(true);
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[Google Maps Verifier Component] Maps script fallback engaged:', err.message);
          setMapError('Google Maps API service unavailable or unconfigured. Displaying tactical diagram fallback.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [complaintLat, complaintLng, officerLat, officerLng, allowedRadiusMeters, locationVerified]);

  return (
    <div className="rounded-2xl border border-surface-700 bg-[#0f0b1a] overflow-hidden">
      {/* Map Header Bar */}
      <div className="px-3.5 py-2 bg-[#17132a] border-b border-surface-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Navigation size={13} className="text-cyan-400" />
          <span className="font-bold text-white text-[11px] uppercase tracking-wider">
            Google Maps On-Site Verification
          </span>
        </div>
        <div className="flex items-center gap-2">
          {distanceMeters !== null && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              locationVerified
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              Dist: {formatDistance(distanceMeters)} (Max {allowedRadiusMeters}m)
            </span>
          )}
        </div>
      </div>

      {/* Map View Canvas or Tactical Diagram Fallback */}
      {!mapError ? (
        <div className="relative w-full h-[180px] bg-[#120e24]">
          <div ref={mapContainerRef} className="w-full h-full" />
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#120e24]/80 text-[11px] text-surface-400">
              Loading Google Maps Platform...
            </div>
          )}
        </div>
      ) : (
        /* Tactical Visual Diagram Fallback when Maps JS API is unavailable */
        <div className="p-4 bg-[#120e24] space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-900/60 border border-surface-800 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                <MapPin size={16} />
              </div>
              <div>
                <span className="text-[10px] text-surface-400 uppercase font-bold block">Complaint Site Benchmark</span>
                <p className="font-semibold text-white truncate max-w-[180px]">{complaintAddress}</p>
              </div>
            </div>

            <div className="text-center font-mono">
              <div className={`text-xs font-extrabold ${locationVerified ? 'text-emerald-400' : 'text-red-400'}`}>
                ↔ {formatDistance(distanceMeters)}
              </div>
              <span className="text-[9px] text-surface-500">Allowed: {allowedRadiusMeters}m</span>
            </div>

            <div className="flex items-center gap-2 text-right">
              <div>
                <span className="text-[10px] text-surface-400 uppercase font-bold block">Officer GPS</span>
                <p className="font-semibold text-cyan-300 truncate max-w-[180px]">{officerAddress}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Navigation size={16} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Legend Footer */}
      <div className="px-3.5 py-1.5 bg-[#0b0814] border-t border-surface-800/80 flex items-center justify-between text-[10px] text-surface-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Complaint Location📍
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Officer Location 🔵
          </span>
        </div>
        <span className="font-mono">Radius Limit: {allowedRadiusMeters}m</span>
      </div>
    </div>
  );
};
