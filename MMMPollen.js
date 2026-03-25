Module.register("MMMPollen", {
    defaults: {
        apiKey: "",
        latitude: 59.91,
        longitude: 10.75,
        language: "nb",
        updateInterval: 60 * 60 * 1000, 
        showHealthRecommendation: true,
        showHistory: true,              
        chartWidth: 120,
        chartHeight: 30,
        plants: ["BIRCH", "ALDER", "HAZEL", "GRAMINALES", "MUGWORT"], 
        plantNames: {
            "BIRCH": "BjÃ¸rk",
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
        this.history = null;
        this.loaded = false;
        this.sendSocketNotification("CONFIG", this.config);
    },

    getHeader: function() { 
    return null;
},

    getCategoryText: function(val) {
        const categories = ["Ingen", "Veldig lav", "Lav", "Moderat", "HÃ¸y", "Veldig hÃ¸y"];
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

            var todayVal = points[3].value;
            var valCell = row.insertCell(-1);
            // Endret fra tall til tekst-kategori
            valCell.innerHTML = this.getCategoryText(todayVal);
            valCell.className = "align-right bold day-category";
            if (todayVal > 0 && points[3].color) {
                valCell.style.color = this.getRGB(points[3].color);
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
    let points = [];
    
    // 1. HISTORIKK (3 dager tilbake) - Beholder faktiske verdier fra filen din
    for (let i = 3; i > 0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        let ds = d.toISOString().split('T')[0];
        let h = (this.history && this.history[ds]) ? this.history[ds].find(p => p.code === code) : null;
        
        points.push({ 
            value: h ? h.value : 0, 
            color: h ? h.color : null 
        });
    }

    // 2. PROGNOSE (Idag + 3 frem) - Sjekker inSeason for alle typer
    for (let i = 0; i < 4; i++) {
        let dayData = (this.pollenData && this.pollenData[i]) ? this.pollenData[i] : null;
        let plant = null;
        if (dayData && dayData.plantInfo) {
            plant = dayData.plantInfo.find(p => p.code === code);
        }

        // SJEKKEN: Kun hvis planten er "inSeason" bruker vi Googles verdi.
        // Hvis ikke (som for BjÃ¸rk nÃ¥), tvinger vi den til 0.
        if (plant && plant.inSeason && plant.indexInfo) {
            points.push({ 
                value: plant.indexInfo.value || 0, 
                color: plant.indexInfo.color || null 
            });
        } else {
            // Dette punktet blir nÃ¥ en grÃ¥ prikk pÃ¥ bunnlinjen for alt som er "out of season"
            points.push({ value: 0, color: null });
        }
    }
    return points;
},
    
createSparkline: function(points) {
    const w = this.config.chartWidth, h = this.config.chartHeight, max = 5;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", w); svg.setAttribute("height", h);
    svg.style.verticalAlign = "middle";
    svg.style.overflow = "visible";

    // Funksjon for Ã¥ lage en myk kurve mellom punkter
    const solve = (data) => {
        if (data.length < 2) return "";
        let d = `M ${data[0].x},${data[0].y}`;
        for (let i = 0; i < data.length - 1; i++) {
            const cp1x = data[i].x + (data[i + 1].x - data[i].x) / 2;
            d += ` C ${cp1x},${data[i].y} ${cp1x},${data[i+1].y} ${data[i+1].x},${data[i+1].y}`;
        }
        return d;
    };

    // Lag koordinatene for punktene
    const coords = points.map((p, i) => ({
        x: (i / (points.length - 1)) * w,
        y: h - (p.value / max * (h - 6)) - 3
    }));

    // 1. Tegn den myke linjen
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", solve(coords));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "rgba(255, 255, 255, 0.4)");
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);

    // 2. Tegn prikkene oppÃ¥ (IDAG-prikken fÃ¥r ring)
    coords.forEach((c, i) => {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", c.x); 
        circle.setAttribute("cy", c.y);
        
        if (i === 3) { // IDAG
            circle.setAttribute("r", "4");
            circle.setAttribute("stroke", "white");
            circle.setAttribute("stroke-width", "1");
        } else { 
            circle.setAttribute("r", "2.5"); 
        }
        
        circle.setAttribute("fill", this.getRGB(points[i].color));
        svg.appendChild(circle);
    });

    return svg;
},


    getRGB: function(c) {
        if (!c || (c.red === undefined && c.green === undefined)) return "#333";
        return `rgb(${Math.round((c.red || 0)*255)}, ${Math.round((c.green || 0)*255)}, ${Math.round((c.blue || 0)*255)})`;
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
