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
            if (this.interval) clearInterval(this.interval);
            this.interval = setInterval(() => this.updateData(), this.config.updateInterval);
        }
    },

    formatGoogleDate: function(dateObj) {
        return `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
    },

    async updateData() {
        if (!this.config || !this.config.apiKey) return;

        const url = `https://pollen.googleapis.com/v1/forecast:lookup?key=${this.config.apiKey}&location.latitude=${this.config.latitude}&location.longitude=${this.config.longitude}&days=5&languageCode=${this.config.language}`;
        
        try {
            const response = await axios.get(url);
            const body = response.data;

            if (body.dailyInfo) {
                let history = this.getHistory();
                const todayStr = new Date().toISOString().split('T')[0];

                body.dailyInfo.forEach(day => {
                    const dateStr = this.formatGoogleDate(day.date);
                    if (dateStr <= todayStr) {
                        history[dateStr] = day.plantInfo.map(p => ({
                            code: p.code,
                            value: p.indexInfo ? p.indexInfo.value : 0,
                            color: p.indexInfo ? p.indexInfo.color : null,
                            inSeason: p.inSeason
                        }));
                    }
                });

                const keys = Object.keys(history).sort();
                const keptKeys = keys.slice(-14);
                let newHistory = {};
                keptKeys.forEach(k => newHistory[k] = history[k]);

                fs.writeFileSync(this.historyPath, JSON.stringify(newHistory, null, 4));

                this.sendSocketNotification("DATA_UPDATE", { 
                    forecast: body.dailyInfo, 
                    history: newHistory 
                });
            }
        } catch (error) {
            console.error("MMM-Pollen: Feil ved henting av data:", error.message);
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
