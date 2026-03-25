# MMM-PollenGoogle

A MagicMirror² module that displays a 7-day pollen trend using the Google Pollen API. It shows data for Birch, Alder, Hazel, and Grasses, with a visual sparkline showing the development from 3 days ago to 3 days into the future.

## Features
- **7-Day Trend:** Combines local history with Google's forecast.
- **Dynamic Colors:** Uses Google's official UPI (Universal Pollen Index) color scale.
- **Smart Filtering:** Only shows plant types that are currently in season (value > 0).
- **Health Recommendations:** Localized advice based on pollen levels.

## Installation
1. Clone this repo into your `modules` folder.
2. Run `npm install` inside the module folder.
3. Get a Google Maps Pollen API Key from [Google Cloud Console](https://console.cloud.google.com/).

## Configuration
Add the following to your `config/config.js`:

```javascript
{
    module: "MMM-PollenGoogle",
    position: "top_right",
    config: {
        apiKey: "YOUR_GOOGLE_API_KEY",
        latitude: 59.91,
        longitude: 10.75,
        language: "nb"
    }
}
