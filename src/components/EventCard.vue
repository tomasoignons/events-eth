<template>
  <div class="event-card" :class="{ 'has-food': hasFood }">
    <div class="event-header">
      <div class="title-row">
        <h3 class="event-title">{{ event.content.title }}</h3>
        <span v-if="hasFood" class="food-indicator" title="This event likely has food/refreshments">🍽️</span>
      </div>
      <div class="event-date">{{ formattedDate }}</div>
    </div>
    
    <div class="event-details">
      <div class="event-meta">
        <div class="event-type" v-if="event.classification">
          <span class="type-badge">{{ event.classification['entry-type-desc'] }}</span>
          <span class="target-badge" v-if="event.classification['target-group-desc']">
            {{ event.classification['target-group-desc'] }}
          </span>
        </div>
        
        <div class="event-organizer" v-if="showOrganizer && organizer">
          <span class="organizer-icon">🏛️</span>
          <span class="organizer-name">{{ organizer }}</span>
        </div>
      </div>
      
      <div class="event-location" v-if="event.location && event.location.internal">
        <span class="location-icon">📍</span>
        <span>
          {{ event.location.internal['area-desc'] }}
          <span v-if="event.location.internal.building">
            - {{ event.location.internal.building }}
            <span v-if="event.location.internal.room">{{ event.location.internal.room }}</span>
          </span>
          <span v-if="event.location.internal.addition">
            ({{ event.location.internal.addition }})
          </span>
        </span>
      </div>

      <div class="event-description" v-if="event.content.description">
        <p>{{ truncatedDescription }}</p>
        <button 
          v-if="event.content.description.length > 150" 
          @click="toggleDescription"
          class="toggle-btn"
        >
          {{ showFullDescription ? 'Show Less' : 'Show More' }}
        </button>
      </div>

      <div class="event-actions" v-if="hasActions">
        <a 
          v-if="event.content['link-url']" 
          :href="event.content['link-url']"
          target="_blank"
          class="info-link"
        >
          {{ event.content['link-body'] || 'More Information' }}
        </a>
        
        <span 
          v-if="event.classification && event.classification['registration-required']"
          class="registration-required"
        >
          Registration Required
        </span>
      </div>

      <div class="event-time-details" v-if="timeDetails">
        <div class="time-info">
          <span class="time-icon">🕐</span>
          <span>{{ timeDetails }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { formatEventDate, eventHasFood } from '../services/eventService.js'

export default {
  name: 'EventCard',
  props: {
    event: {
      type: Object,
      required: true
    },
    showOrganizer: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      showFullDescription: false
    }
  },
  computed: {
    formattedDate() {
      return formatEventDate(this.event)
    },
    hasFood() {
      return eventHasFood(this.event)
    },
    organizer() {
      if (!this.event.organizers || !this.event.organizers['ou-array'] || this.event.organizers['ou-array'].length === 0) {
        return null
      }
      const org = this.event.organizers['ou-array'][0]
      return org['name-short'] || org['name'] || 'Unknown Organizer'
    },
    truncatedDescription() {
      if (!this.event.content.description) return ''
      
      const description = this.event.content.description.replace(/\n\n/g, ' ').trim()
      
      if (this.showFullDescription || description.length <= 150) {
        return description
      }
      return description.substring(0, 150) + '...'
    },
    hasActions() {
      return this.event.content['link-url'] || 
             (this.event.classification && this.event.classification['registration-required'])
    },
    timeDetails() {
      if (!this.event['date-time-indication']) return null
      
      const dateTimeIndicator = this.event['date-time-indication']
      
      // For ongoing events with regular hours
      if (dateTimeIndicator['opening-hours'] && dateTimeIndicator['opening-hours']['regular-array']) {
        const regularHours = dateTimeIndicator['opening-hours']['regular-array']
        if (regularHours.length > 0) {
          const hours = regularHours.map(h => 
            `${h['weekday-desc']}: ${h['time-from']}-${h['time-to']}`
          ).join(', ')
          return hours
        }
      }
      
      return null
    }
  },
  methods: {
    toggleDescription() {
      this.showFullDescription = !this.showFullDescription
    }
  }
}
</script>

<style scoped>
.event-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
  padding: 28px;
  margin-bottom: 24px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border-left: 6px solid #0066cc;
  border: 1px solid #e9ecef;
}

.event-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
  border-color: #0066cc;
}

.event-card.has-food {
  border-left-color: #ff6b35;
  background: linear-gradient(135deg, #fff8f0 0%, #ffffff 100%);
}

.event-header {
  margin-bottom: 20px;
}

.title-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.event-title {
  margin: 0;
  color: #333;
  font-size: 1.3em;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  flex: 1;
}

.food-indicator {
  font-size: 1.2em;
  background-color: #ff6b35;
  color: white;
  padding: 4px 8px;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(255, 107, 53, 0.3);
  cursor: help;
}

.event-date {
  color: #666;
  font-size: 1.05em;
  font-weight: 600;
}

.event-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.event-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-type {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.event-organizer {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #f8f9fa;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.organizer-icon {
  font-size: 1em;
}

.organizer-name {
  font-weight: 600;
  color: #495057;
  font-size: 0.95em;
}

.type-badge, .target-badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9em;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.type-badge {
  background-color: #e3f2fd;
  color: #1976d2;
}

.target-badge {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.event-location {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #555;
  font-size: 1em;
  font-weight: 500;
}

.location-icon {
  margin-top: 3px;
  font-size: 1.1em;
}

.event-description p {
  margin: 0;
  color: #555;
  line-height: 1.6;
  font-size: 1em;
}

.toggle-btn {
  background: none;
  border: none;
  color: #0066cc;
  cursor: pointer;
  font-size: 0.9em;
  margin-top: 12px;
  padding: 0;
  text-decoration: underline;
  font-weight: 600;
}

.toggle-btn:hover {
  color: #0052a3;
}

.event-actions {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.info-link {
  background-color: #0066cc;
  color: white;
  padding: 12px 24px;
  border-radius: 10px;
  text-decoration: none;
  font-size: 1em;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 102, 204, 0.3);
}

.info-link:hover {
  background-color: #0052a3;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.4);
}

.registration-required {
  background-color: #fff3cd;
  color: #856404;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.9em;
  font-weight: 600;
  border: 1px solid #ffeaa7;
  box-shadow: 0 2px 6px rgba(133, 100, 4, 0.1);
}

.event-time-details {
  background-color: #f8f9fa;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.time-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1em;
  color: #555;
  font-weight: 500;
}

.time-icon {
  font-size: 1em;
}

@media (max-width: 768px) {
  .event-card {
    padding: 20px;
    margin-bottom: 20px;
  }
  
  .event-title {
    font-size: 1.2em;
  }
  
  .event-date {
    font-size: 1em;
  }
  
  .event-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .info-link {
    text-align: center;
    padding: 10px 20px;
  }
  
  .type-badge, .target-badge {
    padding: 6px 12px;
    font-size: 0.85em;
  }
}

@media (max-width: 480px) {
  .event-card {
    padding: 16px;
  }
  
  .event-title {
    font-size: 1.1em;
  }
  
  .event-header {
    margin-bottom: 16px;
  }
  
  .event-details {
    gap: 12px;
  }
}
</style>