/**
 * Google Maps Platform Reusable Loader & Geolocation Service
 * CivicConnect AI Government Operations Portal
 */

let mapsPromise = null;

/**
 * Diagnostic helper to verify environment key configuration without printing key.
 */
export const isGoogleMapsKeyConfigured = () => {
  const isConfigured = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  if (import.meta.env.DEV) {
    console.log("Google Maps API key configured:", isConfigured);
  }
  return isConfigured;
};

/**
 * Dynamically loads Google Maps JavaScript API with places & geocoding libraries.
 * Uses a Singleton Promise to ensure script is loaded only ONCE.
 */
export const loadGoogleMapsScript = () => {
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (mapsPromise) {
    return mapsPromise;
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const isConfigured = isGoogleMapsKeyConfigured();

  if (!isConfigured || !apiKey || apiKey === 'YOUR_GOOGLE_MAPS_KEY') {
    const err = new Error('Google Maps API key is not configured.');
    console.error('[Google Maps Service] Load error:', err.message);
    return Promise.reject(err);
  }

  mapsPromise = new Promise((resolve, reject) => {
    // Check if script tag already exists in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google.maps));
      existingScript.addEventListener('error', (err) => {
        console.error('[Google Maps Service] Script tag load error:', err);
        reject(new Error('Google Maps script failed to load.'));
      });
      return;
    }

    // Set up global error listener for Google Maps authentication / billing / referrer errors
    window.gm_authFailure = () => {
      console.error('[Google Maps Service] Authentication error (gm_authFailure): Key invalid, API not activated, billing inactive, or referrer restriction.');
      window.googleMapsAuthFailed = true;
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geocoding&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        const err = new Error('Google Maps script loaded but google.maps namespace is unavailable.');
        console.error('[Google Maps Service]', err);
        reject(err);
      }
    };

    script.onerror = (err) => {
      console.error('[Google Maps Service] Script network error:', err);
      reject(new Error('Unable to load Google Maps script. Check network or API key configuration.'));
    };

    document.head.appendChild(script);
  });

  return mapsPromise;
};

/**
 * Reverse Geocoding using Google Maps Geocoder API
 * Converts (latitude, longitude) to formatted address
 */
export const reverseGeocodeGoogle = async (latitude, longitude) => {
  if (latitude == null || longitude == null || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
    return {
      formattedAddress: null,
      reverseGeocoded: false,
      placeId: null,
      addressComponents: [],
      error: 'Invalid coordinates provided for reverse geocoding.'
    };
  }

  try {
    const maps = await loadGoogleMapsScript();
    const geocoder = new maps.Geocoder();

    return new Promise((resolve) => {
      geocoder.geocode(
        { location: { lat: Number(latitude), lng: Number(longitude) } },
        (results, status) => {
          if (status === 'OK' && results && results.length > 0 && results[0].formatted_address) {
            resolve({
              formattedAddress: results[0].formatted_address,
              reverseGeocoded: true,
              placeId: results[0].place_id,
              addressComponents: results[0].address_components,
              error: null
            });
          } else {
            console.error(`[Google Maps Service] Geocoder status error: ${status}`, { latitude, longitude });
            let userError = 'Unable to automatically retrieve address. Please enter it manually.';
            
            if (status === 'REQUEST_DENIED') {
              userError = 'Google Maps API request denied (REQUEST_DENIED). Ensure Geocoding API is enabled on Google Cloud Console.';
            } else if (status === 'OVER_QUERY_LIMIT') {
              userError = 'Google Maps API query limit exceeded (OVER_QUERY_LIMIT). Please enter address manually.';
            } else if (status === 'ZERO_RESULTS') {
              userError = 'No address found for these coordinates (ZERO_RESULTS). Please enter address manually.';
            } else if (status === 'UNKNOWN_ERROR') {
              userError = 'Server error occurred during geocoding (UNKNOWN_ERROR). Please try again.';
            }

            resolve({
              formattedAddress: null,
              reverseGeocoded: false,
              placeId: null,
              addressComponents: [],
              error: userError,
              status
            });
          }
        }
      );
    });
  } catch (err) {
    console.error('[Google Maps Service] Reverse geocode exception:', err);
    return {
      formattedAddress: null,
      reverseGeocoded: false,
      placeId: null,
      addressComponents: [],
      error: err.message || 'Unable to automatically retrieve the address. Please enter the address manually.'
    };
  }
};

/**
 * Haversine formula distance calculation in meters
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const R = 6371e3; // Earth radius in meters
  const φ1 = (Number(lat1) * Math.PI) / 180;
  const φ2 = (Number(lat2) * Math.PI) / 180;
  const Δφ = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const Δλ = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

/**
 * Format distance in meters or kilometers
 */
export const formatDistance = (meters) => {
  if (meters === null || meters === undefined || isNaN(meters)) return 'N/A';
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};
