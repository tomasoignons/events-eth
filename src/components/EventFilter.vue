<template>
  <div class="event-filter">
    <div class="filter-header">
      <h3>Event Filters</h3>
      <div class="filter-actions">
        <button @click="selectAll" class="action-btn">Select All</button>
        <button @click="clearAll" class="action-btn">Clear All</button>
      </div>
    </div>
    
    <!-- Food Filter Toggle -->
    <div class="special-filters">
      <div class="food-filter">
        <label class="food-filter-label">
          <input 
            type="checkbox" 
            :checked="showFoodOnly"
            @change="toggleFoodFilter"
            class="food-checkbox"
          />
          <span class="food-icon">🍽️</span>
          <span class="food-text">Show only events with food/refreshments</span>
          <span class="food-count" v-if="foodEventCount > 0">({{ foodEventCount }} events)</span>
        </label>
      </div>
    </div>
    
    <div class="filter-options">
      <div 
        v-for="(count, source) in availableSources" 
        :key="source"
        class="filter-option"
        :class="{ active: selectedSources.includes(source) }"
        @click="toggleSource(source)"
      >
        <div class="option-content">
          <div class="option-main">
            <input 
              type="checkbox" 
              :checked="selectedSources.includes(source)"
              @change="toggleSource(source)"
              class="option-checkbox"
            />
            <span class="option-label">{{ source }}</span>
          </div>
          <span class="option-count">{{ count }} event{{ count !== 1 ? 's' : '' }}</span>
        </div>
      </div>
    </div>
    
    <div class="filter-summary">
      <span class="summary-text">
        Showing {{ totalFilteredEvents }} of {{ totalEvents }} events 
        from {{ selectedSources.length }} of {{ Object.keys(availableSources).length }} sources
      </span>
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

<style scoped>
.event-filter {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 24px;
  margin-bottom: 24px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.filter-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.4em;
  font-weight: 600;
}

.special-filters {
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #fff8e1 0%, #fffbf0 100%);
  border-radius: 12px;
  border: 2px solid #ffcc02;
}

.food-filter-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 1.1em;
  font-weight: 600;
  color: #333;
}

.food-checkbox {
  width: 20px;
  height: 20px;
  accent-color: #ff6b35;
  cursor: pointer;
}

.food-icon {
  font-size: 1.2em;
}

.food-text {
  flex: 1;
}

.food-count {
  background-color: #ff6b35;
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.9em;
  font-weight: 600;
}

.filter-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  background-color: #f8f9fa;
  color: #495057;
  border: 2px solid #dee2e6;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9em;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: #e9ecef;
  border-color: #adb5bd;
}

.filter-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.filter-option {
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8f9fa;
}

.filter-option:hover {
  border-color: #0066cc;
  background: #f0f8ff;
}

.filter-option.active {
  border-color: #0066cc;
  background: linear-gradient(135deg, #e3f2fd 0%, #f0f8ff 100%);
  box-shadow: 0 2px 8px rgba(0, 102, 204, 0.15);
}

.option-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.option-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.option-checkbox {
  width: 20px;
  height: 20px;
  accent-color: #0066cc;
  cursor: pointer;
}

.option-label {
  font-weight: 600;
  color: #333;
  font-size: 1em;
}

.option-count {
  background-color: #0066cc;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 600;
  white-space: nowrap;
}

.filter-option.active .option-count {
  background-color: #004499;
}

.filter-summary {
  padding-top: 16px;
  border-top: 2px solid #f0f0f0;
  text-align: center;
}

.summary-text {
  color: #666;
  font-size: 1em;
  font-weight: 500;
}

@media (max-width: 768px) {
  .event-filter {
    padding: 20px 16px;
    margin-bottom: 20px;
  }
  
  .filter-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
    text-align: center;
  }
  
  .filter-actions {
    justify-content: center;
  }
  
  .special-filters {
    padding: 16px;
  }
  
  .food-filter-label {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
  
  .filter-options {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .filter-option {
    padding: 14px;
  }
  
  .option-content {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .option-main {
    justify-content: center;
  }
  
  .option-count {
    align-self: center;
  }
}

@media (max-width: 480px) {
  .filter-header h3 {
    font-size: 1.2em;
  }
  
  .action-btn {
    padding: 6px 12px;
    font-size: 0.85em;
  }
}
</style>