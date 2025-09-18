<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
    <div class="hero bg-slate-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-700/50 mb-8">
      <div class="hero-content text-center py-16">
        <div class="max-w-md">
          <h1 class="text-5xl font-bold text-white tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">ETH & UZH Events Dashboard</h1>
          <p class="text-xl text-slate-300 font-medium mt-3 mb-8">Events in the next 2 weeks</p>
          <div class="flex justify-center items-center gap-6 flex-wrap">
            <div class="badge badge-lg text-lg px-6 py-4 bg-red-600/80 text-white border-red-500">ETH: {{ ethEvents.length }}</div>
            <div class="badge badge-lg text-lg px-6 py-4 bg-blue-600/80 text-white border-blue-500">UZH: {{ uzhEvents.length }}</div>
            <div class="badge badge-lg text-lg px-6 py-4 bg-purple-600/80 text-white border-purple-500">Total: {{ totalFilteredEvents }}</div>
            <button @click="refreshEvents" class="btn btn-primary btn-lg shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 border-none hover:from-blue-700 hover:to-purple-700" :disabled="isLoading">
              <span v-if="isLoading" class="loading loading-spinner loading-sm"></span>
              {{ isLoading ? 'Loading...' : 'Refresh' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto">
      <div v-if="isLoading" class="card bg-slate-800/90 backdrop-blur-sm shadow-xl border border-slate-700/50">
        <div class="card-body items-center text-center py-16">
          <span class="loading loading-ring loading-lg text-blue-400"></span>
          <p class="text-lg mt-4 text-slate-300">Loading events...</p>
        </div>
      </div>

      <div v-else-if="error" class="alert bg-red-900/80 border-red-700 shadow-lg backdrop-blur-sm">
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3 class="font-bold text-red-200">Unable to load events</h3>
            <div class="text-xs text-red-300">{{ error }}</div>
          </div>
        </div>
        <div class="flex-none">
          <button @click="refreshEvents" class="btn btn-sm bg-red-700 hover:bg-red-600 border-red-600 text-white">Try Again</button>
        </div>
      </div>

      <div v-else-if="totalEvents === 0" class="card bg-slate-800/90 backdrop-blur-sm shadow-xl border border-slate-700/50">
        <div class="card-body items-center text-center py-16">
          <h3 class="card-title text-2xl text-white">No upcoming events</h3>
          <p class="text-slate-400">There are no events scheduled for the next 2 weeks.</p>
        </div>
      </div>

      <div v-else class="flex flex-col gap-8">
        <!-- Food Filter Toggle -->
        <div class="card bg-slate-800/90 backdrop-blur-sm shadow-xl border border-slate-700/50">
          <div class="card-body p-6">
            <div class="bg-gradient-to-r from-orange-900/40 to-yellow-900/30 p-5 rounded-2xl border-2 border-orange-600/50 backdrop-blur-sm">
              <label class="flex items-center gap-3 cursor-pointer text-lg font-semibold text-white">
                <input 
                  type="checkbox" 
                  :checked="showFoodOnly"
                  @change="toggleFoodFilter"
                  class="checkbox border-orange-500 [--chkbg:orange] [--chkfg:white] checkbox-lg"
                />
                <span class="text-xl">🍽️</span>
                <span class="flex-1">Show only events with food/refreshments</span>
                <div v-if="foodEventCount > 0" class="badge bg-orange-600 border-orange-500 text-white px-3 py-2 text-sm font-semibold">
                  {{ foodEventCount }} events
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- Events Display -->
        <div class="card bg-slate-800/90 backdrop-blur-sm shadow-2xl border border-slate-700/50">
          <div class="card-body p-8">
            <div v-if="totalFilteredEvents === 0" class="text-center py-16">
              <h3 class="text-2xl font-bold mb-4 text-white">No events match your filters</h3>
              <p class="text-slate-400">Try toggling the food filter to see more events.</p>
            </div>
            
            <div v-else class="max-w-full mx-auto">
              <div class="text-center mb-8 pb-6 border-b-4 border-slate-700">
                <h2 class="text-4xl font-bold text-white tracking-tight mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">📅 Upcoming Events</h2>
                <p class="text-lg text-slate-300 font-medium">ETH Zurich & University of Zurich</p>
              </div>
              
              <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <!-- ETH Events Column -->
                <div class="flex flex-col">
                  <div class="flex items-center gap-3 mb-6 p-4 bg-red-900/30 rounded-xl border border-red-700/50">
                    <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                    <h3 class="text-2xl font-bold text-white">ETH Zurich Events</h3>
                    <div class="badge bg-red-600 text-white px-3 py-1 ml-auto">{{ ethEvents.length }}</div>
                  </div>
                  
                  <div v-if="ethEvents.length === 0" class="text-center py-12 text-slate-400">
                    <p>No ETH events found</p>
                  </div>
                  
                  <div v-else class="flex flex-col gap-6 max-h-[80vh] overflow-y-auto pr-2">
                    <EventCard 
                      v-for="event in ethEvents" 
                      :key="`eth-${event.id}`" 
                      :event="event"
                      :show-organizer="true"
                    />
                  </div>
                </div>

                <!-- UZH Events Column -->
                <div class="flex flex-col">
                  <div class="flex items-center gap-3 mb-6 p-4 bg-blue-900/30 rounded-xl border border-blue-700/50">
                    <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h3 class="text-2xl font-bold text-white">University of Zurich Events</h3>
                    <div class="badge bg-blue-600 text-white px-3 py-1 ml-auto">{{ uzhEvents.length }}</div>
                  </div>
                  
                  <div v-if="uzhEvents.length === 0" class="text-center py-12 text-slate-400">
                    <p>No UZH events found</p>
                  </div>
                  
                  <div v-else class="flex flex-col gap-6 max-h-[80vh] overflow-y-auto pr-2">
                    <EventCard 
                      v-for="event in uzhEvents" 
                      :key="`uzh-${event.id}`" 
                      :event="event"
                      :show-organizer="true"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import EventCard from './EventCard.vue'
import { 
  fetchEvents, 
  filterEvents, 
  filterEventsWithFood,
  getNextEventDate 
} from '../services/eventService.js'

export default {
  name: 'Dashboard',
  components: {
    EventCard
  },
  data() {
    return {
      allEvents: [],
      events: [],
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
    totalFilteredEvents() {
      return this.events.length
    },
    chronologicalEvents() {
      // Sort all events chronologically
      return this.events.sort((a, b) => {
        const dateA = getNextEventDate(a)
        const dateB = getNextEventDate(b)
        
        if (!dateA && !dateB) return 0
        if (!dateA) return 1
        if (!dateB) return -1
        
        return dateA - dateB
      })
    },
    ethEvents() {
      return this.chronologicalEvents.filter(event => event.source === 'ETH')
    },
    uzhEvents() {
      return this.chronologicalEvents.filter(event => event.source === 'UZH')
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
      this.events = filterEvents(this.allEvents, {
        next2Weeks: true,
        foodOnly: this.showFoodOnly
      })
    },
    async refreshEvents() {
      await this.loadEvents()
    },
    toggleFoodFilter() {
      this.showFoodOnly = !this.showFoodOnly
      this.applyFilters()
    }
  }
}
</script>

