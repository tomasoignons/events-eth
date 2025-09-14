<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>ETH Events Dashboard</h1>
      <p class="subtitle">Events in the next 2 weeks</p>
      <div class="dashboard-stats">
        <span class="stat">{{ totalFilteredEvents }} events</span>
        <span class="stat">{{ selectedSources.length }} of {{ Object.keys(allGroupedEvents).length }} sources</span>
        <button @click="refreshEvents" class="refresh-btn" :disabled="isLoading">
          {{ isLoading ? 'Loading...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <div class="dashboard-content">
      <div v-if="isLoading" class="loading">
        <div class="loading-spinner"></div>
        <p>Loading events...</p>
      </div>

      <div v-else-if="error" class="error">
        <div class="error-message">
          <h3>Unable to load events</h3>
          <p>{{ error }}</p>
          <button @click="refreshEvents" class="retry-btn">Try Again</button>
        </div>
      </div>

      <div v-else-if="totalEvents === 0" class="no-events">
        <div class="no-events-message">
          <h3>No upcoming events</h3>
          <p>There are no events scheduled for the next 2 weeks.</p>
        </div>
      </div>

      <div v-else class="dashboard-main">
        <!-- Filter Component -->
        <EventFilter
          :available-sources="sourceCounts"
          :selected-sources="selectedSources"
          :show-food-only="showFoodOnly"
          :food-event-count="foodEventCount"
          @toggle-source="toggleSource"
          @select-all="selectAllSources"
          @clear-all="clearAllSources"
          @toggle-food-filter="toggleFoodFilter"
        />

        <!-- Events Display -->
        <div class="events-display">
          <div v-if="totalFilteredEvents === 0" class="no-filtered-events">
            <div class="no-events-message">
              <h3>No events match your filters</h3>
              <p>Try selecting different sources or clear all filters.</p>
            </div>
          </div>
          
          <div v-else class="events-timeline">
            <div class="timeline-header">
              <h2 class="timeline-title">📅 Upcoming Events</h2>
              <p class="timeline-subtitle">Sorted chronologically</p>
            </div>
            
            <div class="events-list">
              <EventCard 
                v-for="event in chronologicalEvents" 
                :key="event.id" 
                :event="event"
                :show-organizer="true"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import EventCard from './EventCard.vue'
import EventFilter from './EventFilter.vue'
import { 
  fetchEvents, 
  filterEvents, 
  filterEventsWithFood,
  groupEventsBySource, 
  getNextEventDate 
} from '../services/eventService.js'

export default {
  name: 'Dashboard',
  components: {
    EventCard,
    EventFilter
  },
  data() {
    return {
      allEvents: [],
      events: [],
      allGroupedEvents: {},
      selectedSources: [],
      showFoodOnly: true, // Default to showing only food events
      isLoading: false,
      error: null
    }
  },
  computed: {
    totalEvents() {
      return this.events.length
    },
    foodEventCount() {
      if (!this.allEvents.length) return 0
      const foodEvents = filterEventsWithFood(this.allEvents)
      return foodEvents.length
    },
    sourceCounts() {
      const counts = {}
      for (const [source, events] of Object.entries(this.allGroupedEvents)) {
        counts[source] = events.length
      }
      return counts
    },
    filteredGroupedEvents() {
      const filtered = {}
      for (const source of this.selectedSources) {
        if (this.allGroupedEvents[source]) {
          filtered[source] = this.allGroupedEvents[source]
        }
      }
      return filtered
    },
    totalFilteredEvents() {
      return Object.values(this.filteredGroupedEvents).reduce((sum, events) => sum + events.length, 0)
    },
    chronologicalEvents() {
      // Get all events from filtered sources and sort them chronologically
      const allFilteredEvents = []
      for (const source of this.selectedSources) {
        if (this.allGroupedEvents[source]) {
          allFilteredEvents.push(...this.allGroupedEvents[source])
        }
      }
      
      // Sort by next occurrence date
      return allFilteredEvents.sort((a, b) => {
        const dateA = getNextEventDate(a)
        const dateB = getNextEventDate(b)
        
        if (!dateA && !dateB) return 0
        if (!dateA) return 1
        if (!dateB) return -1
        
        return dateA - dateB
      })
    }
  },
  async mounted() {
    await this.loadEvents()
  },
  methods: {
    async loadEvents() {
      this.isLoading = true
      this.error = null
      
      try {
        // Fetch all events first
        this.allEvents = await fetchEvents()
        
        // Apply filters
        this.applyFilters()
      } catch (err) {
        this.error = err.message || 'Failed to load events'
        console.error('Error loading events:', err)
      } finally {
        this.isLoading = false
      }
    },
    applyFilters() {
      // Apply both date and food filters
      const filteredEvents = filterEvents(this.allEvents, {
        next2Weeks: true,
        foodOnly: this.showFoodOnly
      })
      
      this.events = filteredEvents
      this.allGroupedEvents = groupEventsBySource(filteredEvents)
      
      // Update selected sources to show all available after filtering
      this.selectedSources = Object.keys(this.allGroupedEvents)
    },
    async refreshEvents() {
      await this.loadEvents()
    },
    toggleSource(source) {
      const index = this.selectedSources.indexOf(source)
      if (index > -1) {
        this.selectedSources.splice(index, 1)
      } else {
        this.selectedSources.push(source)
      }
    },
    selectAllSources() {
      this.selectedSources = Object.keys(this.allGroupedEvents).slice()
    },
    clearAllSources() {
      this.selectedSources = []
    },
    toggleFoodFilter() {
      this.showFoodOnly = !this.showFoodOnly
      this.applyFilters()
    }
  }
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 24px;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 32px;
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
}

.dashboard-header h1 {
  margin: 0 0 12px 0;
  color: #333;
  font-size: 3.2em;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.subtitle {
  color: #666;
  font-size: 1.3em;
  margin: 0 0 32px 0;
  font-weight: 500;
}

.dashboard-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}

.stat {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 12px 24px;
  border-radius: 24px;
  font-weight: 600;
  font-size: 1.1em;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.15);
}

.refresh-btn {
  background-color: #0066cc;
  color: white;
  border: none;
  padding: 14px 28px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.1em;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(0, 102, 204, 0.3);
}

.refresh-btn:hover:not(:disabled) {
  background-color: #0052a3;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 102, 204, 0.4);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.dashboard-content {
  max-width: 1800px;
  margin: 0 auto;
}

.dashboard-main {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #0066cc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error, .no-events {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.error-message h3, .no-events-message h3 {
  color: #333;
  margin: 0 0 16px 0;
}

.error-message p, .no-events-message p {
  color: #666;
  margin: 0 0 24px 0;
}

.retry-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s ease;
}

.retry-btn:hover {
  background-color: #c82333;
}

.events-display {
  background: white;
  border-radius: 20px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  padding: 32px;
}

.no-filtered-events {
  text-align: center;
  padding: 60px 20px;
}

.events-timeline {
  max-width: 1000px;
  margin: 0 auto;
}

.timeline-header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 3px solid #f0f0f0;
}

.timeline-title {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 2.2em;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.timeline-subtitle {
  margin: 0;
  color: #666;
  font-size: 1.1em;
  font-weight: 500;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.events-list::-webkit-scrollbar {
  width: 8px;
}

.events-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.events-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.events-list::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

@media (max-width: 1400px) {
  .events-columns {
    gap: 24px;
  }
  
  .event-column {
    flex: 0 0 420px;
  }
}

@media (max-width: 1200px) {
  .events-columns {
    gap: 20px;
  }
  
  .event-column {
    flex: 0 0 380px;
  }
  
  .dashboard-content {
    max-width: 1200px;
  }
}

@media (max-width: 768px) {
  .dashboard {
    padding: 16px;
  }
  
  .dashboard-header {
    padding: 32px 20px;
  }
  
  .dashboard-header h1 {
    font-size: 2.4em;
  }
  
  .subtitle {
    font-size: 1.1em;
  }
  
  .dashboard-stats {
    gap: 16px;
  }
  
  .stat {
    padding: 10px 20px;
    font-size: 1em;
  }
  
  .refresh-btn {
    padding: 12px 24px;
    font-size: 1em;
  }
  
  .events-display {
    padding: 24px 20px;
  }
  
  .events-timeline {
    max-width: 100%;
  }
  
  .timeline-header {
    margin-bottom: 24px;
    padding-bottom: 20px;
  }
  
  .timeline-title {
    font-size: 1.8em;
  }
  
  .timeline-subtitle {
    font-size: 1em;
  }
  
  .events-list {
    gap: 20px;
  }
}

@media (max-width: 480px) {
  .dashboard {
    padding: 12px;
  }
  
  .dashboard-header h1 {
    font-size: 2em;
  }
  
  .dashboard-stats {
    flex-direction: column;
    gap: 12px;
  }
  
  .events-display {
    padding: 20px 16px;
  }
  
  .timeline-title {
    font-size: 1.6em;
  }
  
  .events-list {
    gap: 16px;
  }
}
</style>