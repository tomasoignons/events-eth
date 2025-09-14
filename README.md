# ETH Events Dashboard

A Vue 3 dashboard application that displays ETH Zurich events in an organized, easy-to-read format. The dashboard shows events from different sources in horizontal columns and filters to display only events happening in the next 2 weeks.

## Features

- **📅 Smart Filtering**: Automatically shows only events in the next 2 weeks
- **🏛️ Source Organization**: Groups events by their source/organizer in separate columns
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **🔄 Real-time Updates**: Refresh button to fetch the latest events
- **📝 Rich Information**: Displays event title, date, location, description, and registration links
- **🎨 Modern UI**: Clean, professional design with smooth animations

## Project Structure

```
src/
├── components/
│   ├── Dashboard.vue          # Main dashboard component
│   └── EventCard.vue          # Individual event card component
├── services/
│   └── eventService.js        # API service and utility functions
├── App.vue                    # Root component
├── main.js                    # Application entry point
└── style.css                  # Global styles
```

## API Integration

The application fetches events from the ETH Zurich public API:
```
https://idapps.ethz.ch/pcm-pub-services/v2/entries?filters[0].min-till-end=0&rs-first=0&rs-size=9999&lang=en&client-id=wcms&filters[0].cals=1&comp-ext=true
```

### Event Data Structure

Each event contains:
- **Basic Info**: ID, title, description, status
- **Classification**: Event type, target group, language, registration requirements
- **Location**: Building, room, area details
- **Timing**: Date ranges, opening hours, recurring schedules
- **Contact**: Organizer information, links, phone numbers

## Components

### Dashboard.vue
The main dashboard component that:
- Fetches and manages event data
- Handles loading and error states
- Groups events by source
- Provides refresh functionality
- Renders the column-based layout

### EventCard.vue
Individual event display component featuring:
- Event title and formatted date
- Event type and target audience badges
- Location information with icons
- Expandable description text
- Action buttons for registration/information
- Time details for recurring events

### eventService.js
Service module providing:
- `fetchEvents()`: API data fetching
- `filterEventsNext2Weeks()`: Date-based filtering
- `groupEventsBySource()`: Organization by source
- `formatEventDate()`: Date formatting utilities
- `getNextEventDate()`: Next occurrence calculation

## Setup and Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

## Customization

### Adding New Event Sources

The dashboard automatically adapts to new event sources. To customize how sources are identified, modify the `groupEventsBySource()` function in `eventService.js`:

```javascript
// Current logic uses organizer name or calendar description
let source = 'Other';
if (event.organizers && event.organizers['ou-array'] && event.organizers['ou-array'].length > 0) {
  source = event.organizers['ou-array'][0]['name-short'] || event.organizers['ou-array'][0]['name'] || 'Other';
} else if (event.classification && event.classification['cal-desc']) {
  source = event.classification['cal-desc'];
}
```

### Adjusting Time Filter

To change the time window from 2 weeks, modify the `filterEventsNext2Weeks()` function:

```javascript
const twoWeeksFromNow = new Date();
twoWeeksFromNow.setDate(now.getDate() + 14); // Change 14 to desired number of days
```

### Styling Themes

The dashboard uses CSS custom properties for easy theming. Key color variables are defined in the component styles:

- Primary blue: `#0066cc`
- Background gradient: `#f5f7fa` to `#c3cfe2`
- Card shadows: `rgba(0, 0, 0, 0.1)`

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+
- Mobile browsers with ES6 support

## Performance

- Lazy loading for event descriptions
- Efficient date filtering and sorting
- Responsive images and optimized assets
- Minimal bundle size with Vite

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the application
5. Submit a pull request

## License

This project is open source and available under the MIT License.
# events-eth
