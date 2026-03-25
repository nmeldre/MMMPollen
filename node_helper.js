const NodeHelper = require("node_helper");
const axios = require("axios"); // Vi bytter fra request til axios
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
            setInterval(() => this.updateData(), this.config.updateInterval);
        }
    },

    async updateData() {
        const url = `https://pollen.googleapis.com/v1/forecast:lookup?key=${this.config.apiKey}&location.latitude=${this.config.latitude}&location.longitude=${this.config.longitude}&days=5&languageCode=${this.config.language}`;
        
        try {
            const response = await axios.get(url);
            const body = response.data;

            let history = this.getHistory();
            const today = new Date().toISOString().split('T')[0];
            
            if (body.dailyInfo && body.dailyInfo[0]) {
                history[today] = body.dailyInfo[0].plantInfo.map(p => ({
                    code: p.code,
                    value: p.indexInfo ? p.indexInfo.value : 0,
                    color: p.indexInfo ? p.indexInfo.color : null
                }));

                const keys = Object.keys(history).sort().slice(-10);
                let newHistory = {};
                keys.forEach(k => newHistory[k] = history[k]);
                
                fs.writeFileSync(this.historyPath, JSON.stringify(newHistory));
                this.sendSocketNotification("DATA_UPDATE", { forecast: body.dailyInfo, history: newHistory });
            }
        } catch (error) {
            console.error("MMM-PollenGoogle: Feil ved henting av data", error.message);
        }
    },

    getHistory: function() {
        if (fs.existsSync(this.historyPath)) {
            try { return JSON.parse(fs.readFileSync(this.historyPath, "utf8")); } catch (e) { return {}; }
        }
        return {};
    }
});
