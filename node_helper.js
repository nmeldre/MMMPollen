const NodeHelper = require("node_helper");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
    start: function() {
        this.historyPath = path.join(__dirname, "pollen-history.json");
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "CONFIG") {
            this.config = payload;
            this.updateData();
            // Sørger for at vi ikke lager hundrevis av intervaller hvis modulen restarter
            if (this.interval) clearInterval(this.interval);
            this.interval = setInterval(() => this.updateData(), this.config.updateInterval);
        }
    },

    // Hjelpefunksjon for å konvertere Googles dato-objekt til YYYY-MM-DD
    formatGoogleDate: function(dateObj) {
        const y = dateObj.year;
        const m = String(dateObj.month).padStart(2, '0');
        const d = String(dateObj.day).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    async updateData() {
        const url = `https://pollen.googleapis.com/v1/forecast:lookup?key=${this.config.apiKey}&location.latitude=${this.config.latitude}&location.longitude=${this.config.longitude}&days=5&languageCode=${this.config.language}`;
        
        try {
            const response = await axios.get(url);
            const body = response.data;

            if (body.dailyInfo) {
                let history = this.getHistory();
                
                // Gå gjennom alle dagene Google sendte (vanligvis 5 dager)
                body.dailyInfo.forEach(day => {
                    const dateStr = this.formatGoogleDate(day.date);
                    const todayStr = new Date().toISOString().split('T')[0];

                    // Vi lagrer kun data i historikk-filen hvis datoen er i dag eller i fortiden
                    if (dateStr <= todayStr) {
                        history[dateStr] = day.plantInfo.map(p => ({
                            code: p.code,
                            value: p.indexInfo ? p.indexInfo.value : 0,
                            color: p.indexInfo ? p.indexInfo.color : null
                        }));
                    }
                });

                // Rydd i historikken: Behold kun de siste 14 dagene så fila ikke vokser evig
                const keys = Object.keys(history).sort();
                const keptKeys = keys.slice(-14);
                let newHistory = {};
                keptKeys.forEach(k => newHistory[k] = history[k]);
                
                fs.writeFileSync(this.historyPath, JSON.stringify(newHistory));

                // Send både ferske varsler og den vaskede historikken til modulen
                this.sendSocketNotification("DATA_UPDATE", { 
                    forecast: body.dailyInfo, 
                    history: newHistory 
                });
            }
        } catch (error) {
            console.error("MMM-PollenGoogle: Feil ved henting av data", error.message);
        }
    },

    getHistory: function() {
        if (fs.existsSync(this.historyPath)) {
            try { 
                return JSON.parse(fs.readFileSync(this.historyPath, "utf8")); 
            } catch (e) { 
                return {}; 
            }
        }
        return {};
    }
});
