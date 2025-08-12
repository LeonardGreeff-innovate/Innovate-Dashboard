const dataURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXQVIPN42E20By0btiM2IFinhYkeNeYuz66b7bA5QEukcD_gLN-g7LGyArw05zaMJssbMxJm68DAkX/pub?gid=0&single=true&output=csv";

fetch(dataURL)
    .then(response => response.text())
    .then(data => {
        const rows = data.split("\n").map(row => row.split(","));
        const headers = rows[0];
        const months = rows.slice(1).map(row => row[0]);

        function getColumnData(colName) {
            const index = headers.indexOf(colName);
            return rows.slice(1).map(row => parseInt(row[index]) || 0);
        }

        // KPI Data
        const kpiMetrics = [
            "Total Man Hours worked",
            "Safe Man Hours Worked Without LTI",
            "Average Manpower",
            "Nearmiss Incidents Reported",
            "Risk Assessments",
            "HSE Audits conducted"
        ];

        // Add summary cards
        const summaryCardsContainer = document.getElementById("summaryCards");
        kpiMetrics.forEach(metric => {
            const total = getColumnData(metric).reduce((a,b) => a+b, 0);
            const card = document.createElement("div");
            card.classList.add("col-md-2");
            card.innerHTML = `<div class="card-kpi">
                                <div class="value">${total}</div>
                                <div class="label">${metric}</div>
                              </div>`;
            summaryCardsContainer.appendChild(card);
        });

        // Charts
        const mtiData = getColumnData("Medical Treatment Injury");
        const ltiData = getColumnData("Lost Time Injury");
        const fatalData = getColumnData("Fatal Incidents");
        const rtiData = getColumnData("Road Traffic Incident");
        const pdiData = getColumnData("Property Damage Incident");
        const envData = getColumnData("Environmental Incidents");
        const clientObsData = getColumnData("Client HSE observation");
        const internalObsData = getColumnData("Internal HSE observation");
        const totalManhoursData = getColumnData("Total Man Hours worked");
        const safeManhoursData = getColumnData("Safe Man Hours Worked Without LTI");
        const avgManpowerData = getColumnData("Average Manpower");

        // Incidents Chart
        new Chart(document.getElementById("incidentsChart"), {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: 'Medical Treatment Injury', data: mtiData, backgroundColor: 'rgba(255,99,132,0.6)' },
                    { label: 'Lost Time Injury', data: ltiData, backgroundColor: 'rgba(255,159,64,0.6)' },
                    { label: 'Fatal Incidents', data: fatalData, backgroundColor: 'rgba(54,162,235,0.6)' },
                    { label: 'Road Traffic Incident', data: rtiData, backgroundColor: 'rgba(75,192,192,0.6)' },
                    { label: 'Property Damage Incident', data: pdiData, backgroundColor: 'rgba(153,102,255,0.6)' },
                    { label: 'Environmental Incidents', data: envData, backgroundColor: 'rgba(255,206,86,0.6)' }
                ]
            }
        });

        // Observations Chart
        new Chart(document.getElementById("observationsChart"), {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    { label: 'Client HSE Observations', data: clientObsData, borderColor: 'rgba(255,99,132,1)', fill: false },
                    { label: 'Internal HSE Observations', data: internalObsData, borderColor: 'rgba(54,162,235,1)', fill: false }
                ]
            }
        });

        // Manhours & Manpower Chart
        new Chart(document.getElementById("manhoursChart"), {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    { label: 'Total Man Hours Worked', data: totalManhoursData, borderColor: 'rgba(75,192,192,1)', fill: false },
                    { label: 'Safe Man Hours Without LTI', data: safeManhoursData, borderColor: 'rgba(255,206,86,1)', fill: false },
                    { label: 'Average Manpower', data: avgManpowerData, borderColor: 'rgba(153,102,255,1)', fill: false }
                ]
            }
        });

        // Training & Audits Chart
        const inductionData = getColumnData("Induction Training");
        const auditsData = getColumnData("HSE Audits conducted");

        new Chart(document.getElementById("trainingChart"), {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: 'Induction Training', data: inductionData, backgroundColor: 'rgba(75,192,192,0.6)' },
                    { label: 'HSE Audits Conducted', data: auditsData, backgroundColor: 'rgba(255,159,64,0.6)' }
                ]
            }
        });
    })
    .catch(err => console.error("Error loading data: ", err));
