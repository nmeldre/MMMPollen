Module.register("MMM-PollenGoogle", {
    defaults: {
        apiKey: "",
        latitude: 59.91,
        longitude: 10.75,
        language: "nb",
        updateInterval: 60 * 60 * 1000, 
        header: "Pollenvarsel",
        showHealthRecommendation: true,
        showHistory: true,              
        chartWidth: 120,
        chartHeight: 30,
        showValue: true,                
        plants: ["BIRCH", "ALDER", "HAZEL", "GRAMINALES"], 
        plantNames: {
            "BIRCH": "Bjørk",
            "ALDER": "Or",
            "HAZEL": "Hassel",
            "GRAMINALES": "Gress"
        },
        animationSpeed: 1000,
    },

    getStyles: function() { return ["MMM-PollenGoogle.css"]; },

    start: function() {
        Log.info("Starting module: " + this.name);
        this.pollenData = null;
        this.history = null;
        this.loaded = false;
        this.sendSocketNotification("CONFIG", this.config);
    },

    getHeader: function() { return this.config.header; },

    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.className = "pollen-wrapper";

        if (!this.loaded) {
            wrapper.innerHTML = "Laster pollen-data...";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        var table = document.createElement("table");
        table.className = "small pollen-table";

        this.config.plants.forEach(code => {
            const points = this.combineData(code);
            if (!points.some(p => p.value > 0)) return;

            var row = table.insertRow(-1);
            var nameCell = row.insertCell(-1);
            nameCell.innerHTML = this.config.plantNames[code] || code;
            nameCell.className = "pollen-name align-left";

            if (this.config.showHistory) {
                var graphCell = row.insertCell(-1);
                graphCell.className = "pollen-graph-cell";
                graphCell.appendChild(this.createSparkline(points));
            }

            if (this.config.showValue) {
                var todayVal = points[3].value;
                var valCell = row.insertCell(-1);
                valCell.innerHTML = todayVal > 0 ? todayVal : "-";
                valCell.className = "align-center bold day-val";
                if (todayVal > 0) valCell.style.color = this.getRGB(points[3].color);
            }
        });

        wrapper.appendChild(table);

        if (this.config.showHealthRecommendation && this.pollenData && this.pollenData[0].healthRecommendations) {
            var recommendation = document.createElement("div");
            recommendation.className = "xsmall dimmed light recommendation-text";
            recommendation.innerHTML = this.pollenData[0].healthRecommendations[0];
            wrapper.appendChild(recommendation);
        }

        return wrapper;
    },

    combineData: function(code) {
        let points = [];
        for (let i = 3; i > 0; i--) {
            let d = new Date(); d.setDate(d.getDate() - i);
            let ds = d.toISOString().split('T')[0];
            let h = (this.history && this.history[ds]) ? this.history[ds].find(p => p.code === code) : null;
            points.push({ value: h ? h.value : 0, color: h ? h.color : null });
        }
        for (let i = 0; i < 4; i++) {
            let day = this.pollenData[i];
            let p = day ? day.plantInfo.find(p => p.code === code) : null;
            points.push({ 
                value: (p && p.indexInfo) ? p.indexInfo.value : 0, 
                color: (p && p.indexInfo) ? p.indexInfo.color : null 
            });
        }
        return points;
    },

    createSparkline: function(points) {
        const w = this.config.chartWidth, h = this.config.chartHeight, max = 5;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", w); svg.setAttribute("height", h);
        svg.style.verticalAlign = "middle";
        
        points.forEach((p, i) => {
            const x = (i / (points.length - 1)) * w;
            const y = h - (p.value / max * (h - 6)) - 3;
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", x); circle.setAttribute("cy", y);
            if (i === 3) {
                circle.setAttribute("r", "4");
                circle.setAttribute("stroke", "white");
                circle.setAttribute("stroke-width", "1");
            } else { circle.setAttribute("r", "2.5"); }
            circle.setAttribute("fill", this.getRGB(p.color));
            svg.appendChild(circle);
        });
        return svg;
    },

    getRGB: function(c) {
        if (!c) return "#444";
        return `rgb(${Math.round(c.red*255)}, ${Math.round(c.green*255)}, ${Math.round(c.blue*255)})`;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "DATA_UPDATE") {
            this.pollenData = payload.forecast;
            this.history = payload.history;
            this.loaded = true;
            this.updateDom(this.config.animationSpeed);
        }
    }
});
