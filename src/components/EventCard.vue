<template>
  <div class="card bg-slate-800/90 backdrop-blur-sm shadow-xl border-l-4 border border-slate-700/50 transition-all duration-200 hover:shadow-2xl hover:-translate-y-1 hover:border-slate-600" 
       :class="[
         hasFood ? 'border-l-orange-500 bg-gradient-to-r from-orange-900/30 to-slate-800/90' : 'border-l-blue-500',
         isRegistered ? 'ring-2 ring-green-500/50 bg-gradient-to-r from-green-900/20 to-slate-800/90' : ''
       ]">
    <div class="card-body p-7">
      <div class="mb-5">
        <div class="flex items-start gap-3 mb-3">
          <h3 class="card-title text-xl font-bold text-white leading-snug tracking-tight flex-1" v-html="titleWithHighlight">
          </h3>
          <div v-if="hasFood" 
               class="tooltip tooltip-left" 
               :data-tip="`Food/refreshments likely included (keyword: '${foodKeyword}')`">
            <span class="badge bg-orange-600 border-orange-500 text-white p-2 shadow-lg">🍽️</span>
          </div>
        </div>
        <div class="text-slate-300 text-lg font-semibold">{{ formattedDate }}</div>
      </div>
      
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-3">
          <div class="flex gap-3 flex-wrap" v-if="event.classification">
            <div class="badge bg-blue-600/80 border-blue-500 text-white badge-lg px-4 py-3 text-sm font-semibold shadow-sm">
              {{ event.classification['entry-type-desc'] }}
            </div>
            <div v-if="event.classification['target-group-desc']" 
                 class="badge bg-purple-600/80 border-purple-500 text-white badge-lg px-4 py-3 text-sm font-semibold shadow-sm">
              {{ event.classification['target-group-desc'] }}
            </div>
          </div>
          
          <div v-if="showOrganizer && organizer" 
               class="flex items-center gap-2 bg-slate-700/60 p-3 rounded-lg border border-slate-600/50">
            <span class="text-base">🏛️</span>
            <span class="font-semibold text-slate-300 text-sm">{{ organizer }}</span>
            <div class="badge badge-sm ml-auto" 
                 :class="event.source === 'ETH' ? 'badge-info' : 'badge-secondary'">
              {{ event.source }}
            </div>
          </div>
        </div>
        
        <!-- UZH Speaker Information -->
        <div v-if="event.source === 'UZH' && event.uzh && event.uzh.speaker" 
             class="flex items-start gap-2 text-slate-300 font-medium bg-slate-700/40 p-3 rounded-lg">
          <span class="text-lg mt-1">🎤</span>
          <span>{{ event.uzh.speaker }}</span>
        </div>

        <div v-if="event.location && event.location.internal" 
             class="flex items-start gap-2 text-slate-400 font-medium">
          <span class="text-lg mt-1">📍</span>
          <span>
            {{ event.location.internal['area-desc'] }}
            <span v-if="event.location.internal.building">
              - {{ event.location.internal.building }}
              <span v-if="event.location.internal.room"> {{ event.location.internal.room }}</span>
            </span>
            <span v-if="event.location.internal.addition">
              ({{ event.location.internal.addition }})
            </span>
          </span>
        </div>

        <div v-if="event.content.description" class="prose prose-sm max-w-none">
          <p class="text-slate-400 leading-relaxed m-0" v-html="truncatedDescription"></p>
          <button 
            v-if="event.content.description.length > 150" 
            @click="toggleDescription"
            class="btn btn-ghost btn-sm p-0 mt-3 font-semibold text-blue-400 hover:text-blue-300"
          >
            {{ showFullDescription ? 'Show Less' : 'Show More' }}
          </button>
        </div>

        <div class="flex gap-3 items-center flex-wrap">
          <!-- Registration Toggle Button -->
          <button 
            @click="toggleRegistration"
            class="btn btn-sm shadow-lg transition-all duration-200"
            :class="isRegistered ? 'bg-green-600 hover:bg-green-700 border-green-500 text-white' : 'bg-slate-600 hover:bg-slate-500 border-slate-500 text-white'"
          >
            <span v-if="isRegistered">✓ Registered</span>
            <span v-else>+ Register Interest</span>
          </button>

          <!-- Official Event Page Link -->
          <a 
            v-if="officialEventUrl" 
            :href="officialEventUrl"
            target="_blank"
            class="btn btn-sm shadow-lg hover:shadow-xl transition-all duration-200"
            :class="event.source === 'ETH' ? 'bg-red-600 hover:bg-red-700 border-red-500 text-white' : 'bg-blue-600 hover:bg-blue-700 border-blue-500 text-white'"
          >
            📄 {{ event.source }} Page
          </a>
          
          <!-- Original Event Link -->
          <a 
            v-if="event.content['link-url']" 
            :href="event.content['link-url']"
            target="_blank"
            class="btn bg-gradient-to-r from-blue-600 to-purple-600 border-none text-white btn-sm shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
          >
            {{ event.content['link-body'] || 'More Information' }}
          </a>
          
          <!-- Registration Required Alert -->
          <div 
            v-if="event.classification && event.classification['registration-required']"
            class="alert bg-yellow-900/60 border-yellow-700 py-2 px-4 rounded-lg shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <span class="text-sm font-semibold text-yellow-200">Registration Required</span>
          </div>
        </div>

        <div v-if="timeDetails" class="bg-slate-700/60 p-4 rounded-xl border border-slate-600/50">
          <div class="flex items-center gap-2 text-slate-300 font-medium">
            <span class="text-base">🕐</span>
            <span>{{ timeDetails }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { formatEventDate, eventHasFood, getFoodKeyword, getOfficialEventUrl, isUserRegistered, toggleUserRegistration } from '../services/eventService.js'

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
      showFullDescription: false,
      isRegistered: false
    }
  },
  mounted() {
    // Initialize registration status
    this.isRegistered = isUserRegistered(this.event.id);
  },
  computed: {
    formattedDate() {
      return formatEventDate(this.event)
    },
    hasFood() {
      return eventHasFood(this.event)
    },
    foodKeyword() {
      return getFoodKeyword(this.event)
    },
    officialEventUrl() {
      return getOfficialEventUrl(this.event)
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
      
      let description = this.event.content.description.replace(/\n\n/g, ' ').trim()
      
      // Highlight the food keyword if present
      if (this.foodKeyword) {
        const regex = new RegExp(`(${this.foodKeyword})`, 'gi')
        description = description.replace(regex, '<span class="font-bold text-red-400 bg-red-900/30 px-1 rounded">$1</span>')
      }
      
      if (this.showFullDescription || description.length <= 150) {
        return description
      }
      return description.substring(0, 150) + '...'
    },
    titleWithHighlight() {
      if (!this.event.content.title) return ''
      
      let title = this.event.content.title
      
      // Highlight the food keyword if present in title
      if (this.foodKeyword) {
        const regex = new RegExp(`(${this.foodKeyword})`, 'gi')
        title = title.replace(regex, '<span class="font-bold text-red-400 bg-red-900/30 px-1 rounded">$1</span>')
      }
      
      return title
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
    },
    toggleRegistration() {
      this.isRegistered = toggleUserRegistration(this.event.id);
    }
  }
}
</script>

