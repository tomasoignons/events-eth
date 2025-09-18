<template>
  <div class="card bg-slate-800/90 backdrop-blur-sm shadow-xl border border-slate-700/50">
    <div class="card-body p-6">
      <div class="flex justify-between items-center mb-5 pb-4 border-b-2 border-slate-700">
        <h3 class="card-title text-2xl font-semibold text-white">Event Filters</h3>
        <div class="flex gap-3">
          <button @click="selectAll" class="btn btn-outline border-slate-600 text-slate-300 hover:bg-slate-700 btn-sm">Select All</button>
          <button @click="clearAll" class="btn btn-outline border-slate-600 text-slate-300 hover:bg-slate-700 btn-sm">Clear All</button>
        </div>
      </div>
      
      <!-- Food Filter Toggle -->
      <div class="bg-gradient-to-r from-orange-900/40 to-yellow-900/30 p-5 rounded-2xl border-2 border-orange-600/50 mb-6 backdrop-blur-sm">
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
      
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
        <div 
          v-for="(count, source) in availableSources" 
          :key="source"
          class="card bg-slate-700/60 hover:bg-blue-600/80 hover:text-white transition-all duration-200 cursor-pointer border-2 backdrop-blur-sm"
          :class="selectedSources.includes(source) ? 'bg-blue-600/80 text-white border-blue-500 shadow-lg' : 'border-slate-600/50 hover:border-blue-500'"
          @click="toggleSource(source)"
        >
          <div class="card-body p-4">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-3 flex-1">
                <input 
                  type="checkbox" 
                  :checked="selectedSources.includes(source)"
                  @change="toggleSource(source)"
                  class="checkbox border-slate-500 [--chkbg:theme(colors.blue.600)] [--chkfg:white]"
                  :class="selectedSources.includes(source) ? '[--chkbg:theme(colors.blue.500)]' : '[--chkbg:theme(colors.blue.600)]'"
                />
                <span class="font-semibold truncate" :class="selectedSources.includes(source) ? 'text-white' : 'text-slate-300'">{{ source }}</span>
              </div>
              <div class="badge text-white px-3 py-1 text-xs font-semibold whitespace-nowrap"
                   :class="selectedSources.includes(source) ? 'bg-blue-500 border-blue-400' : 'bg-slate-600 border-slate-500'">
                {{ count }} event{{ count !== 1 ? 's' : '' }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="text-center pt-4 border-t-2 border-slate-700">
        <div class="text-slate-400 font-medium">
          Showing {{ totalFilteredEvents }} of {{ totalEvents }} events 
          from {{ selectedSources.length }} of {{ Object.keys(availableSources).length }} sources
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EventFilter',
  props: {
    availableSources: {
      type: Object,
      required: true,
      default: () => ({})
    },
    selectedSources: {
      type: Array,
      required: true,
      default: () => []
    },
    showFoodOnly: {
      type: Boolean,
      default: false
    },
    foodEventCount: {
      type: Number,
      default: 0
    }
  },
  computed: {
    totalEvents() {
      return Object.values(this.availableSources).reduce((sum, count) => sum + count, 0)
    },
    totalFilteredEvents() {
      return this.selectedSources.reduce((sum, source) => {
        return sum + (this.availableSources[source] || 0)
      }, 0)
    }
  },
  methods: {
    toggleSource(source) {
      this.$emit('toggle-source', source)
    },
    selectAll() {
      this.$emit('select-all')
    },
    clearAll() {
      this.$emit('clear-all')
    },
    toggleFoodFilter() {
      this.$emit('toggle-food-filter')
    }
  }
}
</script>

