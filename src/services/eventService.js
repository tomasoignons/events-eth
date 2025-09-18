/**
 * Service for fetching ETH events from the API
 */

const ETH_API_ENDPOINT = 'https://idapps.ethz.ch/pcm-pub-services/v2/entries?filters[0].min-till-end=0&rs-first=0&rs-size=9999&lang=en&client-id=wcms&filters[0].cals=1&comp-ext=true';
const UZH_API_ENDPOINT = 'https://www.webroot.uzh.ch/apps/agenda/api/V5/event/';

/**
 * Fetches events from the ETH API
 * @returns {Promise<Array>} Array of ETH events
 */
export async function fetchEthEvents() {
  try {
    const response = await fetch(ETH_API_ENDPOINT);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return (data['entry-array'] || []).map(event => ({ ...event, source: 'ETH' }));
  } catch (error) {
    console.error('Error fetching ETH events:', error);
    return [];
  }
}

/**
 * Fetches events from the UZH API
 * @returns {Promise<Array>} Array of UZH events
 */
export async function fetchUzhEvents() {
  try {
    const response = await fetch(UZH_API_ENDPOINT);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Check if data has events array
    if (!data.events || !Array.isArray(data.events)) {
      console.warn('UZH API response does not contain events array');
      return [];
    }
    
    // Convert UZH format to standardized format
    const events = data.events.map(uzhEvent => {
      // Skip events without required fields
      if (!uzhEvent.id || !uzhEvent.dtstart || !uzhEvent.dtend || !uzhEvent.title) {
        console.warn('UZH event missing required fields:', uzhEvent);
        return null;
      }

      // Safely parse dates with validation
      let startDate, endDate;
      try {
        const startTimestamp = parseInt(uzhEvent.dtstart);
        const endTimestamp = parseInt(uzhEvent.dtend);
        
        if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
          console.warn('Invalid timestamp for UZH event:', uzhEvent.id, 'start:', uzhEvent.dtstart, 'end:', uzhEvent.dtend);
          return null; // Skip this event
        }
        
        startDate = new Date(startTimestamp);
        endDate = new Date(endTimestamp);
        
        // Check if dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.warn('Invalid date for UZH event:', uzhEvent.id);
          return null; // Skip this event
        }
      } catch (error) {
        console.warn('Error parsing dates for UZH event:', uzhEvent.id, error);
        return null; // Skip this event
      }

      return {
        id: uzhEvent.id,
        source: 'UZH',
        content: {
          title: uzhEvent.title,
          description: uzhEvent.description || '',
          'link-url': uzhEvent.more || null,
          'link-body': 'More Information'
        },
        location: {
          internal: {
            'area-desc': uzhEvent.address || '',
            building: uzhEvent.bldg || uzhEvent.building || '',
            room: uzhEvent.room || '',
            addition: uzhEvent.room_nr ? `Room ${uzhEvent.room_nr}` : ''
          }
        },
        'date-time-indication': {
          'in-progress-timerange-array': [{
            'date-time-from': startDate.toISOString(),
            'date-time-to': endDate.toISOString()
          }]
        },
        organizers: {
          'ou-array': [{
            'name': 'University of Zurich',
            'name-short': 'UZH'
          }]
        },
        classification: {
          'entry-type-desc': 'UZH Event',
          'target-group-desc': uzhEvent.speaker ? 'Speaker Event' : null
        },
        // UZH specific fields
        uzh: {
          speaker: uzhEvent.speaker,
          contact_name: uzhEvent.contact_name,
          contact_mail: uzhEvent.contact_mail,
          is_virtual: uzhEvent.is_virtual,
          virtual_url: uzhEvent.virtual_url,
          virtual_location: uzhEvent.virtual_location,
          start_date: uzhEvent.start_date,
          top: uzhEvent.top,
          note: uzhEvent.note
        }
      };
    }).filter(event => event !== null); // Remove events with invalid dates
    
    // Filter out virtual events
    return events.filter(event => !event.uzh.is_virtual || event.uzh.is_virtual === '');
  } catch (error) {
    console.error('Error fetching UZH events:', error);
    return [];
  }
}

/**
 * Fetches events from both ETH and UZH APIs
 * @returns {Promise<Array>} Combined array of events
 */
export async function fetchEvents() {
  try {
    const [ethEvents, uzhEvents] = await Promise.all([
      fetchEthEvents(),
      fetchUzhEvents()
    ]);
    
    return [...ethEvents, ...uzhEvents];
  } catch (error) {
    console.error('Error fetching combined events:', error);
    return [];
  }
}

/**
 * Filters events to only include those in the next 2 weeks
 * @param {Array} events - Array of events
 * @returns {Array} Filtered events
 */
export function filterEventsNext2Weeks(events) {
  const now = new Date();
  const twoWeeksFromNow = new Date();
  twoWeeksFromNow.setDate(now.getDate() + 14);

  return events.filter(event => {
    // Check if event has date-time information
    if (!event['date-time-indication']) return false;

    // Check for both single events and ongoing events
    const dateTimeIndicator = event['date-time-indication'];
    
    // For events with in-progress-timerange-array
    if (dateTimeIndicator['in-progress-timerange-array']) {
      return dateTimeIndicator['in-progress-timerange-array'].some(timeRange => {
        const eventDate = new Date(timeRange['date-time-from']);
        return eventDate >= now && eventDate <= twoWeeksFromNow;
      });
    }

    // For events with opening hours (ongoing exhibitions)
    if (dateTimeIndicator['opening-hours']) {
      const dateFrom = new Date(dateTimeIndicator['opening-hours']['date-from']);
      const dateTo = new Date(dateTimeIndicator['opening-hours']['date-to']);
      
      // Check if the ongoing event overlaps with our 2-week window
      return (dateFrom <= twoWeeksFromNow && dateTo >= now);
    }

    return false;
  });
}

/**
 * Groups events by their source/organizer
 * @param {Array} events - Array of events
 * @returns {Object} Events grouped by organizer
 */
export function groupEventsBySource(events) {
  const grouped = {};

  events.forEach(event => {
    // Use the main organizer or calendar description as the source
    let source = 'Other';
    
    if (event.organizers && event.organizers['ou-array'] && event.organizers['ou-array'].length > 0) {
      source = event.organizers['ou-array'][0]['name-short'] || event.organizers['ou-array'][0]['name'] || 'Other';
    } else if (event.classification && event.classification['cal-desc']) {
      source = event.classification['cal-desc'];
    }

    if (!grouped[source]) {
      grouped[source] = [];
    }
    grouped[source].push(event);
  });

  return grouped;
}

/**
 * Formats event date for display
 * @param {Object} event - Event object
 * @returns {string} Formatted date string
 */
export function formatEventDate(event) {
  if (!event['date-time-indication']) return 'Date TBD';

  const dateTimeIndicator = event['date-time-indication'];

  // For events with specific time ranges
  if (dateTimeIndicator['in-progress-timerange-array'] && dateTimeIndicator['in-progress-timerange-array'].length > 0) {
    const firstEvent = dateTimeIndicator['in-progress-timerange-array'][0];
    const date = new Date(firstEvent['date-time-from']);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // For ongoing events with opening hours
  if (dateTimeIndicator['opening-hours']) {
    const openingHours = dateTimeIndicator['opening-hours'];
    const dateFrom = new Date(openingHours['date-from']);
    const dateTo = new Date(openingHours['date-to']);
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${dateFrom.toLocaleDateString('en-US', options)} - ${dateTo.toLocaleDateString('en-US', options)}`;
  }

  return 'Date TBD';
}

/**
 * Gets the next occurrence date for recurring events
 * @param {Object} event - Event object
 * @returns {Date|null} Next occurrence date
 */
export function getNextEventDate(event) {
  if (!event['date-time-indication']) return null;

  const dateTimeIndicator = event['date-time-indication'];
  const now = new Date();

  // For events with specific time ranges
  if (dateTimeIndicator['in-progress-timerange-array']) {
    const upcomingEvents = dateTimeIndicator['in-progress-timerange-array']
      .map(timeRange => new Date(timeRange['date-time-from']))
      .filter(date => date >= now)
      .sort((a, b) => a - b);
    
    return upcomingEvents.length > 0 ? upcomingEvents[0] : null;
  }

  return null;
}

/**
 * Food-related keywords in multiple languages
 */
const FOOD_KEYWORDS = {
  // French
  french: [
    'apéritif', 'apéro', 'collation', 'buffet', 'cocktail', 'dégustation',
    'repas', 'dîner', 'déjeuner', 'petit-déjeuner', 'café',
    'vin d\'honneur', 'réception', 'pause-café'
  ],
  // German
  german: [
    'apéro', 'aperitif', 'imbiss', 'buffet', 'cocktail', 'verkostung',
   'abendessen', 'mittagessen', 'frühstück', 'kaffee',
    'empfang', 'kaffeepause', 'erfrischungen', 'verpflegung',
    'fingerfood', 'snacks', 'getränke'
  ],
  // English
  english: [
    'aperitif', 'apéro', 'refreshments', 'buffet', 'cocktail', 'tasting',
    'food', 'dinner', 'lunch', 'breakfast', 'coffee',
    'reception', 'coffee break', 'snacks', 'catering',
    'finger food', 'drinks', 'beverages', 'networking lunch',
    'wine reception', 'light refreshments'
  ],
  // Additional common terms
  common: [
    //'free food', 'kostenlos essen',
  ]
};

/**
 * Filters events that likely have food/refreshments
 * @param {Array} events - Array of events
 * @returns {Array} Events that mention food-related terms
 */
export function filterEventsWithFood(events) {
  // Flatten all keywords into a single array
  const allKeywords = Object.values(FOOD_KEYWORDS).flat();
  
  return events.filter(event => {
    // Check title and description for food keywords
    const title = event.content.title?.toLowerCase() || '';
    const description = event.content.description?.toLowerCase() || '';
    const combinedText = `${title} ${description}`;
    
    // Check if any food keyword is present
    return allKeywords.some(keyword => 
      combinedText.includes(keyword.toLowerCase())
    );
  });
}

/**
 * Enhanced filtering function that combines date and food filters
 * @param {Array} events - Array of events
 * @param {Object} options - Filtering options
 * @param {boolean} options.foodOnly - Whether to show only food events
 * @param {boolean} options.next2Weeks - Whether to filter by next 2 weeks
 * @returns {Array} Filtered events
 */
export function filterEvents(events, options = {}) {
  let filteredEvents = events;
  
  // Apply date filter if requested
  if (options.next2Weeks !== false) {
    filteredEvents = filterEventsNext2Weeks(filteredEvents);
  }
  
  // Apply food filter if requested
  if (options.foodOnly) {
    filteredEvents = filterEventsWithFood(filteredEvents);
  }
  
  return filteredEvents;
}

/**
 * Checks if an event likely has food based on keywords
 * @param {Object} event - Event object
 * @returns {boolean} True if event likely has food
 */
export function eventHasFood(event) {
  const allKeywords = Object.values(FOOD_KEYWORDS).flat();
  const title = event.content.title?.toLowerCase() || '';
  const description = event.content.description?.toLowerCase() || '';
  const combinedText = `${title} ${description}`;
  
  return allKeywords.some(keyword => 
    combinedText.includes(keyword.toLowerCase())
  );
}

/**
 * Finds the first food keyword that matches in an event
 * @param {Object} event - Event object
 * @returns {string|null} The matched keyword or null if no match
 */
export function getFoodKeyword(event) {
  const allKeywords = Object.values(FOOD_KEYWORDS).flat();
  const title = event.content.title?.toLowerCase() || '';
  const description = event.content.description?.toLowerCase() || '';
  const combinedText = `${title} ${description}`;
  
  for (const keyword of allKeywords) {
    if (combinedText.includes(keyword.toLowerCase())) {
      return keyword;
    }
  }
  
  return null;
}

/**
 * Generates the official event page URL for an event (ETH or UZH)
 * @param {Object} event - Event object
 * @returns {string|null} Official event page URL or null if not available
 */
export function getOfficialEventUrl(event) {
  if (!event.id || !event.content?.title) return null;
  
  if (event.source === 'UZH') {
    // UZH events link to their agenda system
    return `https://www.agenda.uzh.ch/en/events/${event.id}`;
  } else {
    // ETH events
    const titleSlug = event.content.title
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ýÿ]/g, 'y')
      .replace(/[ñ]/g, 'n')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    return `https://ethz.ch/en/news-and-events/events/details.${titleSlug}.${event.id}.html`;
  }
}

/**
 * @deprecated Use getOfficialEventUrl instead
 */
export const getEthEventUrl = getOfficialEventUrl;

/**
 * Checks if user has registered for an event
 * @param {string} eventId - Event ID
 * @returns {boolean} True if user is registered
 */
export function isUserRegistered(eventId) {
  try {
    const registrations = JSON.parse(localStorage.getItem('ethEventRegistrations') || '[]');
    return registrations.includes(eventId);
  } catch (error) {
    console.error('Error reading registrations from localStorage:', error);
    return false;
  }
}

/**
 * Toggles user registration status for an event
 * @param {string} eventId - Event ID
 * @returns {boolean} New registration status
 */
export function toggleUserRegistration(eventId) {
  try {
    const registrations = JSON.parse(localStorage.getItem('ethEventRegistrations') || '[]');
    const isRegistered = registrations.includes(eventId);
    
    if (isRegistered) {
      // Remove registration
      const updatedRegistrations = registrations.filter(id => id !== eventId);
      localStorage.setItem('ethEventRegistrations', JSON.stringify(updatedRegistrations));
      return false;
    } else {
      // Add registration
      registrations.push(eventId);
      localStorage.setItem('ethEventRegistrations', JSON.stringify(registrations));
      return true;
    }
  } catch (error) {
    console.error('Error updating registrations in localStorage:', error);
    return false;
  }
}

/**
 * Gets all registered event IDs
 * @returns {Array} Array of registered event IDs
 */
export function getUserRegistrations() {
  try {
    return JSON.parse(localStorage.getItem('ethEventRegistrations') || '[]');
  } catch (error) {
    console.error('Error reading registrations from localStorage:', error);
    return [];
  }
}