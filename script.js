// Link to your published Google Sheet CSV
const dataURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXQVIPN42E20By0btiM2IFinhYkeNeYuz66b7bA5QEukcD_gLN-g7LGyArw05zaMJssbMxJm68DAkX/pub?gid=0&single=true&output=csv";

// Fetch CSV and parse
fetch(dataURL)
    .then(response => response.text())
    .then(data => {
        const rows = data.split("\n").map(row => row.split(","));
        const headers = rows[0];
        const months = rows.slice(1).map(row => row[0]);
        
        // Example: Medical Treatment Injury column
        const mtiIndex = headers.indexOf("Medical Treatment Injury");
        const mtiData = rows.slice(1).map(row => parseInt(row[mtiIndex]) || 0);

        // Example: Total Man Hours worked
        const mhIndex = headers.indexOf("Total Man Hours worked");
        const mhData = rows.slice(1).map(row => parseInt(row[mhIndex]) || 0);

        // Chart 1 - Incidents
        new Chart(document.getElementById("incidentsChart"), {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Medical Treatment Injuries',
                    data: mtiData,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)'
                }]
            }
        });

        // Chart 2 - Manhours
        new Chart(document.getElementById("manhoursChart"), {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Total Man Hours Worked',
                    data: mhData,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    fill: false
                }]
            }
        });
    })
    .catch(err => console.error("Error loading data: ", err));
