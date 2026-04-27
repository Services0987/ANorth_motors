import axios from 'axios';

const API = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

/**
 * Custom Intelligence Engine Tracker
 * Tracks user behavior without 3rd party cookies or paid APIs.
 */
export const trackEvent = async (type, vehicleId = null, metadata = {}) => {
  try {
    // Only track in production or if explicitly enabled
    // We use a simple fetch/axios call to our internal analytics endpoint
    await axios.post(`${API}/analytics/track`, {
      event_type: type,
      vehicle_id: vehicleId,
      metadata: {
        ...metadata,
        url: window.location.href,
        referrer: document.referrer,
        screen_size: `${window.innerWidth}x${window.innerHeight}`
      }
    });
  } catch (err) {
    // Silent fail to not interrupt user experience
    console.debug('Analytics capture suppressed', err);
  }
};

/**
 * Predefined Event Helpers
 */
export const Analytics = {
  viewVehicle: (id, title) => trackEvent('view', id, { title }),
  clickVehicle: (id, title) => trackEvent('click', id, { title }),
  startLead: (id, type) => trackEvent('lead_start', id, { lead_type: type }),
  search: (query, resultsCount) => trackEvent('search', null, { query, resultsCount }),
  chatInteract: (messageCount) => trackEvent('chat_interaction', null, { messageCount }),
};
