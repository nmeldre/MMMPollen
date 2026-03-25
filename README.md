# MMM-PollenGoogle

A MagicMirror² module that displays a 7-day pollen trend using the **Google Pollen API**. 

This module visualizes pollen levels for specific plants (Birch, Alder, Hazel, and Grasses) using a sleek sparkline that combines 3 days of local history with a 4-day forecast.

## Features
- **7-Day Trend:** A visual graph showing where the pollen levels are heading (3 days back, today, 3 days forward).
- **Google API Integration:** Uses high-accuracy data from the Google Maps Pollen API.
- **Dynamic Coloring:** Graph points change color based on Google's official UPI (Universal Pollen Index) scale.
- **Smart Filtering:** Automatically hides plants that are out of season (value 0).
- **Localized Advice:** Displays health recommendations in your chosen language.

## Installation

1. Navigate to your MagicMirror modules directory:
   ```bash
   cd ~/MagicMirror/modules
   ```

2. Clone the repository:
   ```bash
   git clone [https://github.com/nmeldre/MMMPollen.git](https://github.com/nmeldre/MMMPollen.git)
   ```
   
   

3. Install dependencies:
   ```bash
   cd MMM-PollenGoogle
   npm install
   ```
   

## Configuration

To use this module, you need a **Google Maps API Key** with the **Pollen API** enabled. You can get one at the [Google Cloud Console](https://console.cloud.google.com/).

Add the following to your config/config.js:

```javascript
{
    module: "MMM-PollenGoogle",
    position: "top_right",
    header: "Pollenvarsel",
    config: {
        apiKey: "YOUR_GOOGLE_API_KEY",
        latitude: 59.91,
        longitude: 10.75,
        language: "nb", // Supports 'nb', 'en', 'sv', etc.
        updateInterval: 60 * 60 * 1000, // 1 hour
        showHistory: true,
        showHealthRecommendation: true,
        chartWidth: 120,
        chartHeight: 30
    }
}
```


## Configuration Options

| Option | Description | Default |
| --- | --- | --- |
| `apiKey` | Your Google Pollen API Key. | `""` |
| `latitude` | Latitude for your location. | `59.91` |
| `longitude` | Longitude for your location. | `10.75` |
| `updateInterval` | How often to fetch new data. | `3600000` (1h) |
| `plants` | Array of plant codes to track. | `["BIRCH", "ALDER", "HAZEL", "GRAMINALES"]` |
| `showHistory` | Whether to show the sparkline graph. | `true` |
| `showValue` | Show the current index value (0-5). | `true` |
| `chartWidth` | Width of the sparkline in pixels. | `120` |
| `chartHeight` | Height of the sparkline in pixels. | `30` |

## Important Note on History
The historical data (the first 3 points on the graph) is generated locally by the module. When you first install the module, the history will be empty. It will take 3 days to build a full 7-day trend graph.
