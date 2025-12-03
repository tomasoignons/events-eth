/**
 * Service for fetching ETH events from the API
 */

const ETH_API_ENDPOINT = 'https://idapps.ethz.ch/pcm-pub-services/v2/entries?filters[0].min-till-end=0&rs-first=0&rs-size=9999&lang=en&client-id=wcms&filters[0].cals=1&comp-ext=true';
const UZH_API_ENDPOINT = 'https://www.webroot.uzh.ch/apps/agenda/api/V5/event/';
// Use the Vite proxy in development, direct URL in production
const VIS_API_ENDPOINT = import.meta.env.DEV ? '/api/vis/en/events/' : 'https://vis.ethz.ch/en/events/';
const ESN_API_ENDPOINT = import.meta.env.DEV ? '/api/esn/' : 'https://zurich.esn.ch/';
const VMP_API_ENDPOINT = import.meta.env.DEV ? '/api/vmp/en/events/alle_events' : 'https://vmp.ethz.ch/en/events/alle_events';

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
 * Fetches events from the VIS API
 * @returns {Promise<Array>} Array of VIS events
 */
export async function fetchVisEvents() {
  try {
    const response = await fetch(VIS_API_ENDPOINT);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    
    // Parse HTML to extract event data
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Find all event links - they follow the pattern /en/events/{id}/
    const eventLinks = doc.querySelectorAll('a[href*="/en/events/"]');
    const events = [];
    const seenIds = new Set();
    
    eventLinks.forEach(link => {
      const href = link.getAttribute('href');
      const match = href.match(/\/en\/events\/(\d+)\//);
      
      if (!match || seenIds.has(match[1])) return;
      const eventId = match[1];
      seenIds.add(eventId);
      
      // Get the event card container
      let eventCard = link.closest('a');
      if (!eventCard) return;
      
      // Extract event information from the card
      const textContent = eventCard.textContent || '';
      const lines = textContent.split('\n').map(l => l.trim()).filter(l => l);
      
      // Try to extract title, dates, and other info
      let title = '';
      let startTime = null;
      let endTime = null;
      let category = '';
      let registrationInfo = '';
      let isFree = true; // Assume free unless we find price info
      
      // Parse the text content
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Title is usually the first significant line
        if (!title && line.length > 5 && !line.includes('Event start time') && !line.includes('Event end time')) {
          title = line;
        }
        
        // Look for start time
        if (line.includes('Event start time')) {
          const dateStr = lines[i + 1];
          if (dateStr) {
            startTime = parseDateString(dateStr);
          }
        }
        
        // Look for end time
        if (line.includes('Event end time')) {
          const dateStr = lines[i + 1];
          if (dateStr) {
            endTime = parseDateString(dateStr);
          }
        }
        
        // Look for registration info
        if (line.includes('Registration:') || line.includes('registration')) {
          registrationInfo = line;
        }
        
        // Check for price indicators
        if (line.toLowerCase().includes('chf') || line.toLowerCase().includes('price') || line.toLowerCase().includes('fr.')) {
          // If we see price mentioned, mark as not free
          const priceMatch = line.match(/(\d+)/);
          if (priceMatch && parseInt(priceMatch[1]) > 0) {
            isFree = false;
          }
        }
        
        // Category detection
        if (line.includes('Calm & Culture Events') || line.includes('Tech Talk') || 
            line.includes('Workshops') || line.includes('Party Events')) {
          category = line;
        }
      }
      // Skip if we don't have minimum required data
      if (!title || !startTime || !endTime) {
        return;
      }
      
      // Skip paid events
      if (!isFree) {
        return;
      }

      const event = {
        id: eventId,
        source: 'VIS',
        content: {
          title: title,
          description: textContent.substring(0, 300).trim(),
          'link-url': `https://vis.ethz.ch${href}`,
          'link-body': 'More Information'
        },
        location: {
          internal: {
            'area-desc': '',
            building: '',
            room: '',
            addition: ''
          }
        },
        'date-time-indication': {
          'in-progress-timerange-array': [{
            'date-time-from': startTime.toISOString(),
            'date-time-to': endTime.toISOString()
          }]
        },
        organizers: {
          'ou-array': [{
            'name': 'VIS - Association of Computer Science Students at ETH',
            'name-short': 'VIS'
          }]
        },
        classification: {
          'entry-type-desc': category || 'VIS Event',
          'target-group-desc': null
        },
        vis: {
          category: category,
          price: 0,
          isFree: true,
          registration_info: registrationInfo
        }
      };
      
      events.push(event);
    });
    
    return events;
  } catch (error) {
    console.error('Error fetching VIS events:', error);
    return [];
  }
}

/**
 * Parse date string from VIS format (e.g., "2.12.2025 16:00")
 * @param {string} dateStr - Date string
 * @returns {Date|null} Parsed date or null
 */
function parseDateString(dateStr) {
  try {
    // VIS format: "2.12.2025 16:00" or "2.12.2025"
    const match = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s*(\d{1,2}):?(\d{2})?/);
    if (!match) return null;
    
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1; // JS months are 0-indexed
    const year = parseInt(match[3]);
    const hour = match[4] ? parseInt(match[4]) : 0;
    const minute = match[5] ? parseInt(match[5]) : 0;
    
    const date = new Date(year, month, day, hour, minute);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.warn('Error parsing date:', dateStr, error);
    return null;
  }
}

/**
 * Parse ESN date format (e.g., "Wed 3. December 2025 20:00 - 23:55")
 * @param {string} dateStr - Date string
 * @returns {Object|null} Object with startDate and endDate or null
 */
function parseEsnDateString(dateStr) {
  try {
    // ESN format: "Wed 3. December 2025 20:00 - 23:55" or "Fri 5. December 2025 07:10 - Sun 7. December 2025 20:25"
    const monthMap = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    
    // Try multi-day format first
    const multiDayMatch = dateStr.match(/\w+\s+(\d+)\.\s+(\w+)\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*-\s*\w+\s+(\d+)\.\s+(\w+)\s+(\d{4})\s+(\d{1,2}):(\d{2})/);
    if (multiDayMatch) {
      const startDay = parseInt(multiDayMatch[1]);
      const startMonth = monthMap[multiDayMatch[2]];
      const startYear = parseInt(multiDayMatch[3]);
      const startHour = parseInt(multiDayMatch[4]);
      const startMinute = parseInt(multiDayMatch[5]);
      
      const endDay = parseInt(multiDayMatch[6]);
      const endMonth = monthMap[multiDayMatch[7]];
      const endYear = parseInt(multiDayMatch[8]);
      const endHour = parseInt(multiDayMatch[9]);
      const endMinute = parseInt(multiDayMatch[10]);
      
      return {
        startDate: new Date(startYear, startMonth, startDay, startHour, startMinute),
        endDate: new Date(endYear, endMonth, endDay, endHour, endMinute)
      };
    }
    
    // Try single day format
    const singleDayMatch = dateStr.match(/\w+\s+(\d+)\.\s+(\w+)\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (singleDayMatch) {
      const day = parseInt(singleDayMatch[1]);
      const month = monthMap[singleDayMatch[2]];
      const year = parseInt(singleDayMatch[3]);
      const startHour = parseInt(singleDayMatch[4]);
      const startMinute = parseInt(singleDayMatch[5]);
      const endHour = parseInt(singleDayMatch[6]);
      const endMinute = parseInt(singleDayMatch[7]);
      
      return {
        startDate: new Date(year, month, day, startHour, startMinute),
        endDate: new Date(year, month, day, endHour, endMinute)
      };
    }
    
    return null;
  } catch (error) {
    console.warn('Error parsing ESN date:', dateStr, error);
    return null;
  }
}

/**
 * Fetches events from ESN Zurich
 * @returns {Promise<Array>} Array of ESN events
 */
export async function fetchEsnEvents() {
  try {
    const response = await fetch(ESN_API_ENDPOINT);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    
    // Parse HTML to extract event data
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Find all event links - they follow the pattern /event/{id}
    console.log(doc)
    const eventLinks = doc.querySelectorAll('a[href*="event/"]');
    const events = [];
    const seenIds = new Set();

    console.log(eventLinks)
    
    // First, collect all event IDs from the main page
    const eventIds = [];
    eventLinks.forEach(link => {
      const href = link.getAttribute('href');
      const match = href.match(/event\/(\d+)/);
      if (match && !seenIds.has(match[1])) {
        eventIds.push(match[1]);
        seenIds.add(match[1]);
      }
    });
    console.log(eventIds)
        
    // Fetch each event detail page to get the full information including price
    for (const eventId of eventIds) {
      try {
        const eventUrl = import.meta.env.DEV ? `/api/esn/event/${eventId}` : `https://zurich.esn.ch/event/${eventId}`;
        const eventResponse = await fetch(eventUrl);
        console.log(eventResponse)
        if (!eventResponse.ok) continue;
        
        const eventHtml = await eventResponse.text();
        const eventDoc = parser.parseFromString(eventHtml, 'text/html');
        
        // Extract event details from the table structure
        const tables = eventDoc.querySelectorAll('table');
        let title = '';
        let description = '';
        let dateStr = '';
        let location = '';
        let priceWithCard = null;
        let priceWithoutCard = null;
        let isFree = false;
        
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              const label = cells[0].textContent.trim();
              const value = cells[1].textContent.trim();
              
              if (label === 'When') {
                dateStr = value;
              } else if (label === 'Meeting place') {
                location = value;
              } else if (label.includes('Entrance') || label.includes('Fee')) {
                // Parse price: "without ESNcard: CHF 0.00 with ESNcard: CHF 0.00"
                const withoutMatch = value.match(/without ESNcard:\s*CHF\s*([\d.]+)/);
                const withMatch = value.match(/with ESNcard:\s*CHF\s*([\d.]+)/);
                
                if (withoutMatch) priceWithoutCard = parseFloat(withoutMatch[1]);
                if (withMatch) priceWithCard = parseFloat(withMatch[1]);
                
                // Event is free if both prices are 0 or if with ESNcard price is 0
                isFree = (priceWithCard === 0 || priceWithCard === null) && (priceWithoutCard === 0 || priceWithoutCard === null);
              }
            } else if (cells.length === 1) {
              const content = cells[0].textContent.trim();
              // The title is often in a single-cell row at the top
              if (!title && content.length > 5 && content.length < 100 && !content.includes('When') && !content.includes('Meeting')) {
                title = content;
              }
              // Description might be in a larger cell
              if (content.length > 100 && !description) {
                description = content;
              }
            }
          });
        });
        
        // Also try to get title from h1 or h2
        if (!title) {
          const heading = eventDoc.querySelector('h1, h2');
          if (heading) title = heading.textContent.trim();
        }
        
        // Parse dates
        const dates = parseEsnDateString(dateStr);
        if (!dates || !dates.startDate || !dates.endDate) {
          console.warn(`Could not parse dates for ESN event ${eventId}: ${dateStr}`);
          continue;
        }
        
        // Skip if we don't have minimum required data
        if (!title) {
          console.warn(`ESN event ${eventId} missing title`);
          continue;
        }
        
        // Only include free events (both prices are 0 or undefined)
        if (!isFree) {
          console.log(`Skipping paid ESN event ${eventId}: ${title} (CHF ${priceWithCard}/${priceWithoutCard})`);
          continue;
        }
        
        const event = {
          id: eventId,
          source: 'ESN',
          content: {
            title: title,
            description: description.substring(0, 300).trim(),
            'link-url': `https://zurich.esn.ch/event/${eventId}`,
            'link-body': 'More Information'
          },
          location: {
            internal: {
              'area-desc': location,
              building: '',
              room: '',
              addition: ''
            }
          },
          'date-time-indication': {
            'in-progress-timerange-array': [{
              'date-time-from': dates.startDate.toISOString(),
              'date-time-to': dates.endDate.toISOString()
            }]
          },
          organizers: {
            'ou-array': [{
              'name': 'ESN Zurich - Erasmus Student Network',
              'name-short': 'ESN'
            }]
          },
          classification: {
            'entry-type-desc': 'ESN Event',
            'target-group-desc': 'Exchange Students'
          },
          esn: {
            price_with_card: priceWithCard,
            price_without_card: priceWithoutCard,
            isFree: isFree,
            location: location
          }
        };
        
        events.push(event);
        console.log(`Added free ESN event: ${title}`);
      } catch (error) {
        console.warn(`Error fetching ESN event ${eventId}:`, error);
      }
    }
    
    console.log(`Successfully fetched ${events.length} free ESN events`);
    return events;
  } catch (error) {
    console.error('Error fetching ESN events:', error);
    return [];
  }
}

/**
 * Parse VMP date format (e.g., "Dec. 3, 2025, 6 p.m.")
 * @param {string} dateStr - Date string
 * @param {string} durationStr - Duration string (e.g., "4:00:00")
 * @returns {Object|null} Object with startDate and endDate or null
 */
function parseVmpDateString(dateStr, durationStr) {
  try {
    // VMP format: "Dec. 3, 2025, 6 p.m." with duration "4:00:00"
    const monthMap = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    // Match pattern: "Dec. 3, 2025, 6 p.m." or "Dec. 10, 2025, 6 p.m."
    const match = dateStr.match(/(\w+)\.\s+(\d+),\s+(\d{4}),\s+(\d+)(?::(\d+))?\s*(a\.m\.|p\.m\.|noon|midnight)?/i);
    if (!match) return null;
    
    const monthAbbr = match[1];
    const day = parseInt(match[2]);
    const year = parseInt(match[3]);
    let hour = parseInt(match[4]);
    const minute = match[5] ? parseInt(match[5]) : 0;
    const period = match[6];
    
    const month = monthMap[monthAbbr];
    if (month === undefined) return null;
    
    // Convert to 24-hour format
    if (period && period.toLowerCase().includes('p.m.') && hour !== 12) {
      hour += 12;
    } else if (period && period.toLowerCase().includes('a.m.') && hour === 12) {
      hour = 0;
    }
    
    const startDate = new Date(year, month, day, hour, minute);
    
    // Parse duration to calculate end date
    let endDate = new Date(startDate);
    if (durationStr) {
      const durationMatch = durationStr.match(/(\d+):(\d+):(\d+)/);
      if (durationMatch) {
        const durationHours = parseInt(durationMatch[1]);
        const durationMinutes = parseInt(durationMatch[2]);
        const durationSeconds = parseInt(durationMatch[3]);
        
        endDate = new Date(startDate.getTime() + 
          (durationHours * 60 * 60 * 1000) + 
          (durationMinutes * 60 * 1000) + 
          (durationSeconds * 1000));
      }
    } else {
      // Default to 2 hours if no duration specified
      endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000));
    }
    
    return {
      startDate: startDate,
      endDate: endDate
    };
  } catch (error) {
    console.warn('Error parsing VMP date:', dateStr, error);
    return null;
  }
}

/**
 * Fetches events from VMP (Physics Association)
 * @returns {Promise<Array>} Array of VMP events
 */
export async function fetchVmpEvents() {
  try {
    const response = await fetch(VMP_API_ENDPOINT);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    
    // Parse HTML to extract event data
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Find all event links - they follow the pattern /en/events/{slug}/
    const eventLinks = doc.querySelectorAll('a[href*="/en/events/"]');
    const events = [];
    const seenSlugs = new Set();
    
    // First, collect all event slugs from the main page
    const eventSlugs = [];
    eventLinks.forEach(link => {
      const href = link.getAttribute('href');
      const match = href.match(/\/en\/events\/([^/]+)\/?$/);
      if (match && match[1] !== 'alle_events' && match[1] !== 'meine_events' && 
          match[1] !== 'helper-recruitment' && !seenSlugs.has(match[1])) {
        eventSlugs.push(match[1]);
        seenSlugs.add(match[1]);
      }
    });
    
    console.log(`Found ${eventSlugs.length} VMP events to fetch`);
    
    // Fetch each event detail page to get the full information
    for (const slug of eventSlugs) {
      try {
        const eventUrl = import.meta.env.DEV ? `/api/vmp/en/events/${slug}/` : `https://vmp.ethz.ch/en/events/${slug}/`;
        const eventResponse = await fetch(eventUrl);
        if (!eventResponse.ok) continue;
        
        const eventHtml = await eventResponse.text();
        const eventDoc = parser.parseFromString(eventHtml, 'text/html');
        
        // Extract event details
        let title = '';
        let description = '';
        let dateStr = '';
        let durationStr = '';
        
        // Get title from h1
        const heading = eventDoc.querySelector('h1');
        if (heading) title = heading.textContent.trim();
        
        // Get description from the paragraph text
        const paragraphs = eventDoc.querySelectorAll('p');
        let descParts = [];
        paragraphs.forEach(p => {
          const text = p.textContent.trim();
          if (text && !text.includes('Please login') && !text.includes('Duration:') && 
              !text.toLowerCase().includes('dec.') && !text.toLowerCase().includes('jan.') &&
              !text.toLowerCase().includes('feb.') && text.length > 20) {
            descParts.push(text);
          }
        });
        description = descParts.join(' ');
        
        // Look for date and duration in the text
        const bodyText = eventDoc.body.textContent;
        
        // Find date pattern: "Dec. 3, 2025, 6 p.m."
        const dateMatch = bodyText.match(/(\w+\.\s+\d+,\s+\d{4},\s+\d+(?::\d+)?\s*(?:a\.m\.|p\.m\.|noon)?)/i);
        if (dateMatch) {
          dateStr = dateMatch[1];
        }
        
        // Find duration pattern: "Duration: 4:00:00"
        const durationMatch = bodyText.match(/Duration:\s*(\d+:\d+:\d+)/);
        if (durationMatch) {
          durationStr = durationMatch[1];
        }
        
        // Parse dates
        const dates = parseVmpDateString(dateStr, durationStr);
        if (!dates || !dates.startDate || !dates.endDate) {
          console.warn(`Could not parse dates for VMP event ${slug}: ${dateStr}`);
          continue;
        }
        
        // Skip if we don't have minimum required data
        if (!title) {
          console.warn(`VMP event ${slug} missing title`);
          continue;
        }
        
        // For VMP, we'll assume all events are free since price info requires login
        // We can't determine price without authentication
        
        const event = {
          id: slug,
          source: 'VMP',
          content: {
            title: title,
            description: description.substring(0, 300).trim(),
            'link-url': `https://vmp.ethz.ch/en/events/${slug}/`,
            'link-body': 'More Information'
          },
          location: {
            internal: {
              'area-desc': '',
              building: '',
              room: '',
              addition: ''
            }
          },
          'date-time-indication': {
            'in-progress-timerange-array': [{
              'date-time-from': dates.startDate.toISOString(),
              'date-time-to': dates.endDate.toISOString()
            }]
          },
          organizers: {
            'ou-array': [{
              'name': 'VMP - Physics Association at ETH',
              'name-short': 'VMP'
            }]
          },
          classification: {
            'entry-type-desc': 'VMP Event',
            'target-group-desc': 'Physics Students'
          },
          vmp: {
            slug: slug,
            duration: durationStr
          }
        };
        
        events.push(event);
        console.log(`Added VMP event: ${title}`);
      } catch (error) {
        console.warn(`Error fetching VMP event ${slug}:`, error);
      }
    }
    
    console.log(`Successfully fetched ${events.length} VMP events`);
    return events;
  } catch (error) {
    console.error('Error fetching VMP events:', error);
    return [];
  }
}

/**
 * Fetches events from ETH, UZH, VIS, ESN, and VMP APIs
 * @returns {Promise<Array>} Combined array of events
 */
export async function fetchEvents() {
  try {
    const [ethEvents, uzhEvents, visEvents, esnEvents, vmpEvents] = await Promise.all([
      fetchEthEvents(),
      fetchUzhEvents(),
      fetchVisEvents(),
      fetchEsnEvents(),
      fetchVmpEvents()
    ]);
    console.log(esnEvents)
    console.log(vmpEvents)
    
    return [...ethEvents, ...uzhEvents, ...visEvents, ...esnEvents, ...vmpEvents];
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
    if (event.source == 'VIS' || event.source == 'ESN' || event.source == 'VMP') {
      return true;
    }
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
 * Generates the official event page URL for an event (ETH, UZH, VIS, ESN, or VMP)
 * @param {Object} event - Event object
 * @returns {string|null} Official event page URL or null if not available
 */
export function getOfficialEventUrl(event) {
  if (!event.id || !event.content?.title) return null;
  
  if (event.source === 'UZH') {
    // UZH events link to their agenda system
    return `https://www.agenda.uzh.ch/en/events/${event.id}`;
  } else if (event.source === 'VIS') {
    // VIS events link to their events page
    return `https://vis.ethz.ch/en/events/${event.id}/`;
  } else if (event.source === 'ESN') {
    // ESN events link to their events page
    return `https://zurich.esn.ch/event/${event.id}`;
  } else if (event.source === 'VMP') {
    // VMP events link to their events page
    return `https://vmp.ethz.ch/en/events/${event.id}/`;
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