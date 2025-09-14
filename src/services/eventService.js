/**
 * Service for fetching ETH events from the API
 */

const API_ENDPOINT = 'https://idapps.ethz.ch/pcm-pub-services/v2/entries?filters[0].min-till-end=0&rs-first=0&rs-size=9999&lang=en&client-id=wcms&filters[0].cals=1&comp-ext=true';

/**
 * Fetches events from the ETH API
 * @returns {Promise<Array>} Array of events
 */
export async function fetchEvents() {
  try {
    const response = await fetch(API_ENDPOINT);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data['entry-array'] || [];
  } catch (error) {
    console.error('Error fetching events:', error);
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
    'repas', 'dîner', 'déjeuner', 'petit-déjeuner', 'café', 'thé',
    'vin d\'honneur', 'réception', 'pause-café'
  ],
  // German
  german: [
    'apéro', 'aperitif', 'imbiss', 'buffet', 'cocktail', 'verkostung',
    'essen', 'abendessen', 'mittagessen', 'frühstück', 'kaffee', 'tee',
    'empfang', 'kaffeepause', 'erfrischungen', 'verpflegung',
    'fingerfood', 'snacks', 'getränke'
  ],
  // English
  english: [
    'aperitif', 'apéro', 'refreshments', 'buffet', 'cocktail', 'tasting',
    'food', 'dinner', 'lunch', 'breakfast', 'coffee', 'tea',
    'reception', 'coffee break', 'snacks', 'catering',
    'finger food', 'drinks', 'beverages', 'networking lunch',
    'wine reception', 'light refreshments'
  ],
  // Additional common terms
  common: [
    'free food', 'kostenlos essen', 'gratuit', 'gratis',
    'networking', 'social', 'meet & greet', 'mingle'
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