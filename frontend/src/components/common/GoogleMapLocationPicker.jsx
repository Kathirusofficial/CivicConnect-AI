import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, RefreshCw, CheckCircle2 } from 'lucide-react';
import { loadGoogleMapsScript, reverseGeocodeGoogle } from '../../services/googleMapsService';

export const GoogleMapLocationPicker = ({
  latitude,
  longitude,
  onLocationSelect,
  height = '260px'
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);

  const hasCoords = latitude != null && longitude != null && !isNaN(Number(latitude)) && !isNaN(Number(longitude)) && Number(latitude) !== 0;

  useEffect(() => {
    let isMounted = true;

    loadGoogleMapsScript()
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;

        const defaultPos = {
          lat: hasCoords ? Number(latitude) : 11.0168, // Default to Coimbatore / City Center
          lng: hasCoords ? Number(longitude) : 76.9558
        };

        const map = new maps.Map(mapContainerRef.current, {
          center: defaultPos,
          zoom: hasCoords ? 17 : 13,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          gestureHandling: 'cooperative'
        });

        mapInstanceRef.current = map;

        // Interactive Draggable Pin Marker
        const marker = new maps.Marker({
          position: defaultPos,
          map,
          draggable: true,
          title: 'Complaint Location (Drag to adjust)',
          animation: maps.Animation.DROP
        });

        markerInstanceRef.current = marker;

        // 1. Drag Marker Event
        marker.addListener('dragend', async () => {
          const newPos = marker.getPosition();
          const lat = newPos.lat();
          const lng = newPos.lng();

          const geoRes = await reverseGeocodeGoogle(lat, lng);
          if (onLocationSelect) {
            onLocationSelect({
              latitude: lat,
              longitude: lng,
              address: geoRes.formattedAddress
            });
          }
        });

        // 2. Click Map Event to reposition pin
        map.addListener('click', async (e) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          marker.setPosition({ lat, lng });

          const geoRes = await reverseGeocodeGoogle(lat, lng);
          if (onLocationSelect) {
            onLocationSelect({
              latitude: lat,
              longitude: lng,
              address: geoRes.formattedAddress
            });
          }
        });

        setIsLoaded(true);
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[Google Maps Location Picker] Script fallback engaged:', err.message);
          setMapError('Google Maps API unavailable. Manual address input remains available.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync map center and marker when latitude/longitude props update
  useEffect(() => {
    if (mapInstanceRef.current && markerInstanceRef.current && hasCoords) {
      const pos = { lat: Number(latitude), lng: Number(longitude) };
      markerInstanceRef.current.setPosition(pos);
      mapInstanceRef.current.panTo(pos);
      if (mapInstanceRef.current.getZoom() < 16) {
        mapInstanceRef.current.setZoom(17);
      }
    }
  }, [latitude, longitude, hasCoords]);

  return (
    <div className="rounded-2xl border border-surface-300 dark:border-surface-700 bg-surface-100 dark:bg-[#0f0b1a] overflow-hidden shadow-sm">
      {/* Map Header */}
      <div className="px-3.5 py-2 bg-surface-200/80 dark:bg-[#17132a] border-b border-surface-300 dark:border-surface-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-surface-700 dark:text-surface-300">
          <MapPin size={14} className="text-brand-500" />
          <span className="font-bold text-[11px] uppercase tracking-wider">
            Interactive Location Map (Click or Drag Marker to Adjust)
          </span>
        </div>
        {hasCoords && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono font-semibold">
            {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
          </span>
        )}
      </div>

      {/* Map Canvas */}
      {!mapError ? (
        <div className="relative w-full" style={{ height }}>
          <div ref={mapContainerRef} className="w-full h-full" />
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-100 dark:bg-[#120e24]/90 text-xs text-surface-500">
              <RefreshCw size={16} className="animate-spin mr-2 text-brand-500" />
              Loading Interactive Google Map...
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-surface-100 dark:bg-[#120e24] text-center text-xs text-surface-500 space-y-1">
          <p className="font-medium text-surface-700 dark:text-surface-300">{mapError}</p>
          {hasCoords && (
            <p className="font-mono text-[11px] text-brand-500">
              Pinned Coordinates: {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
