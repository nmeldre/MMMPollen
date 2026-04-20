Module.register("MMMPollen", {
    defaults: {
        apiKey: "",
        latitude: 59.91,
        longitude: 10.75,
        language: "nb",
        updateInterval: 60 * 60 * 1000 * 3, 
        showHealthRecommendation: true,
        showHistory: true,
        hideOffSeason: true,
        chartWidth: 120,
        chartHeight: 30,
        plants: ["BIRCH", "ALDER", "HAZEL", "GRAMINALES", "MUGWORT"], 
        plantNames: {
            "BIRCH": "Bj\u00f8rk",
            "ALDER": "Or",
            "HAZEL": "Hassel",
            "GRAMINALES": "Gress",
            "MUGWORT": "Burot"
        },
        animationSpeed: 1000,
    },

    getStyles: function() { return ["MMMPollen.css"]; },

    start: function() {
        this.pollenData = null;
        this.forecast = null;
        this.history = null;
        this.loaded = false;
        this.sendSocketNotification("CONFIG", this.config);
    },

    getCategoryText: function(val) {
        const categories = ["Ingen", "Veldig lav", "Lav", "Moderat", "H\u00f8y", "Veldig h\u00f8y"];
        return categories[Math.min(val, 5)] || "Ingen";
    },

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
            if (points.length === 0) return;

            // Finn punktet for "i dag"
            const todayPoint = points.find(p => p.isToday) || points[points.length - 1];

            // DØRVAKT: Skjul hvis ikke i sesong ELLER hvis verdi er 0
          const shouldHideRecord = todayPoint.value === 0 || (this.config.hideOffSeason && todayPoint.inSeason === false);

    if (shouldHideRecord) {
        return;
    }

            var row = table.insertRow(-1);
            
            // 1. Plantenavn
            var nameCell = row.insertCell(-1);
            nameCell.innerHTML = this.config.plantNames[code] || code;
            nameCell.className = "pollen-name align-left";

            // 2. Varselstekst (I dag)
            var todayVal = todayPoint.value;
            var valCell = row.insertCell(-1);
            valCell.innerHTML = this.getCategoryText(todayVal);
            valCell.className = "align-left bold day-category";
            
            if (todayVal > 0 && todayPoint.color) {
                valCell.style.color = this.getRGB(todayPoint.color);
            }

            // 3. Graf
            if (this.config.showHistory) {
                var graphCell = row.insertCell(-1);
                graphCell.className = "pollen-graph-cell align-right";
                graphCell.appendChild(this.createSparkline(points));
            }
        });

        wrapper.appendChild(table);

        if (this.config.showHealthRecommendation && this.pollenData && this.pollenData[0].healthRecommendations) {
            var recommendation = document.createElement("div");
            recommendation.className = "xsmall dimmed light recommendation-text";
            recommendation.style.marginTop = "10px";
            recommendation.innerHTML = this.pollenData[0].healthRecommendations[0];
            wrapper.appendChild(recommendation);
        }

        return wrapper;
    },

    combineData: function(code) {
        const todayStr = moment().format("YYYY-MM-DD");
        let combined = [];

        if (this.history) {
            Object.keys(this.history).sort().forEach(date => {
                const dayData = this.history[date].find(p => p.code === code);
                if (dayData) {
                    combined.push({
                        date: date,
                        value: dayData.value,
                        color: dayData.color,
                        inSeason: dayData.inSeason,
                        isToday: date === todayStr
                    });
                }
            });
        }

        if (this.forecast) {
            this.forecast.forEach(day => {
                const dateStr = this.formatGoogleDate(day.date);
                if (dateStr > todayStr) {
                    const dayData = day.plantInfo.find(p => p.code === code);
                    if (dayData) {
                        combined.push({
                            date: dateStr,
                            value: dayData.indexInfo ? dayData.indexInfo.value : 0,
                            color: dayData.indexInfo ? dayData.indexInfo.color : null,
                            inSeason: dayData.inSeason,
                            isToday: false
                        });
                    }
                }
            });
        }
        return combined.slice(-7);
    },

    formatGoogleDate: function(dateObj) {
        return `${dateObj.year}-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
    },

    createSparkline: function(points) {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        const width = 120;
        const height = 45; 
        const margin = 12;
        const graphHeight = 18; 
        const textSpace = 15;   
        
        svg.setAttribute("width", width);
        svg.setAttribute("height", height);

        const maxVal = 5;
        const step = (width - margin * 2) / (points.length - 1);

        points.forEach((p, i) => {
            const x = margin + i * step;
            const y = height - margin - (p.value / maxVal) * graphHeight;

            let labelText = "";
            if (i === 0) {
                labelText = p.date.split("-")[2] + "." + p.date.split("-")[1];
            } else if (p.isToday) {
                labelText = "i dag";
            } else if (i === points.length - 1) {
                labelText = p.date.split("-")[2] + "." + p.date.split("-")[1];
            }

            if (labelText !== "") {
                const label = document.createElementNS(svgNS, "text");
                label.setAttribute("x", x);
                label.setAttribute("y", textSpace - 2);
                label.setAttribute("text-anchor", i === 0 ? "start" : (i === points.length - 1 ? "end" : "middle"));
                label.setAttribute("font-size", "9px");
                label.setAttribute("font-weight", p.isToday ? "bold" : "normal");
                label.setAttribute("fill", p.isToday ? "#fff" : "#777");
                label.textContent = labelText;
                svg.appendChild(label);
            }

            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", x);
            circle.setAttribute("cy", y);
            circle.setAttribute("r", p.isToday ? "3.5" : "1.5");
            circle.setAttribute("fill", p.value > 0 ? this.getRGB(p.color) : (p.isToday ? "#fff" : "#444"));
            if (p.isToday) {
                circle.setAttribute("stroke", "#fff");
                circle.setAttribute("stroke-width", "1");
            }
            svg.appendChild(circle);
        });

        let pathData = points.map((p, i) => {
            const x = margin + i * step;
            const y = height - margin - (p.value / maxVal) * graphHeight;
            return (i === 0 ? "M" : "L") + x + "," + y;
        }).join(" ");

        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", pathData);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#333");
        path.setAttribute("stroke-width", "1");
        svg.insertBefore(path, svg.firstChild);

        return svg;
    },

    getRGB: function(c) {
        if (!c || (c.red === undefined && c.green === undefined)) return "#333";
        return `rgb(${Math.round((c.red || 0)*255)}, ${Math.round((c.green || 0)*255)}, ${Math.round((c.blue || 0)*255)})`;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "DATA_UPDATE") {
            this.pollenData = payload.forecast;
            this.forecast = payload.forecast; 
            this.history = payload.history;
            this.loaded = true;
            this.updateDom(this.config.animationSpeed);
        }
    }
});
