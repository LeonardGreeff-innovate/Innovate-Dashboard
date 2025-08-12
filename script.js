// Link to your published Google Sheet CSV
const dataURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXQVIPN42E20By0btiM2IFinhYkeNeYuz66b7bA5QEukcD_gLN-g7LGyArw05zaMJssbMxJm68DAkX/pub?gid=0&single=true&output=csv";

// Fetch CSV and parse
fetch(dataURL)
    .then(response => response.text())
    .then(data => {
        const rows = data.split("\n").map(row => row.split(","));
        const headers = rows[0];
        const months = rows.slice(1).map(row => row[0]);

        // Function to get data for a specific KPI column
        function getColumnData(colName) {
            const index = headers.indexOf(colName);
            return rows.slice(1).map(row => parseInt(row[index]) || 0);
        }

        // KPI Data
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

        // Chart - Incidents Overview
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
            },
            options: { responsive: true, plugins: { legend: { position: 'top' } } }
        });

        // Chart - Observations
        new Chart(document.getElementById("observationsChart"), {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    { label: 'Client HSE Observations', data: clientObsData, borderColor: 'rgba(255,99,132,1)', fill: false },
                    { label: 'Internal HSE Observations', data: internalObsData, borderColor: 'rgba(54,162,235,1)', fill: false }
                ]
            },
            options: { responsive: true, plugins: { legend: { position: 'top' } } }
        });

        // Chart - Manhours & Manpower
        new Chart(document.getElementById("manhoursChart"), {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    { label: 'Total Man Hours Worked', data: totalManhoursData, borderColor: 'rgba(75,192,192,1)', fill: false },
                    { label: 'Safe Man Hours Without LTI', data: safeManhoursData, borderColor: 'rgba(255,206,86,1)', fill: false },
                    { label: 'Average Manpower', data: avgManpowerData, borderColor: 'rgba(153,102,255,1)', fill: false }
                ]
            },
            options: { responsive: true, plugins: { legend: { position: 'top' } } }
        });
    })
    .catch(err => console.error("Error loading data: ", err));
