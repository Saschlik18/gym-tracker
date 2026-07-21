let activeCharts = {}; // Speichert Chart-Instanzen zum Aufräumen beim Neurendern

function renderStatistics() {
    const container = document.getElementById('stats-container');
    container.innerHTML = '';

    // Bestehende Charts zerstören, um Speicherlecks und Überlagerungen zu verhindern
    Object.values(activeCharts).forEach(chart => chart.destroy());
    activeCharts = {};

    const history = JSON.parse(localStorage.getItem('gym_history')) || [];

    if (history.length === 0) {
        container.innerHTML = `<p class="text-slate-500 text-sm text-center py-8">Noch keine Daten vorhanden. Führe erst Übungen aus und speichere sie!</p>`;
        return;
    }

    // 1. Gruppieren nach Übungen
    const exerciseMap = {};

    history.forEach(workout => {
        const date = workout.date;
        workout.exercises.forEach(ex => {
            if (!exerciseMap[ex.name]) {
                exerciseMap[ex.name] = {
                    count: 0,
                    dataPoints: [] // { date, max1RM, avgWeight, totalReps }
                };
            }

            exerciseMap[ex.name].count += ex.sets.length;

            let max1RM = 0;
            let totalWeightSum = 0;
            let totalReps = 0;

            ex.sets.forEach(set => {
                const w = set.weight;
                const r = set.reps;
                
                // Epley 1RM Formel: w * (1 + r / 30)
                const estimated1RM = w * (1 + r / 30);
                if (estimated1RM > max1RM) {
                    max1RM = estimated1RM;
                }

                totalWeightSum += w;
                totalReps += r;
            });

            const avgWeight = ex.sets.length > 0 ? (totalWeightSum / ex.sets.length) : 0;

            exerciseMap[ex.name].dataPoints.push({
                date: date,
                max1RM: parseFloat(max1RM.toFixed(1)),
                avgWeight: parseFloat(avgWeight.toFixed(1)),
                totalReps: totalReps
            });
        });
    });

    // 2. Sortieren: Häufigste Übungen ganz oben (nach Anzahl der geloggten Sätze)
    const sortedExercises = Object.keys(exerciseMap).sort((a, b) => exerciseMap[b].count - exerciseMap[a].count);

    // 3. Karten und separate Diagramme erzeugen
    sortedExercises.forEach((exName, index) => {
        const exData = exerciseMap[exName];

        // Chronologisch nach Datum sortieren
        exData.dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));

        const dates = exData.dataPoints.map(dp => dp.date);
        const rmValues = exData.dataPoints.map(dp => dp.max1RM);
        const avgValues = exData.dataPoints.map(dp => dp.avgWeight);
        const repsValues = exData.dataPoints.map(dp => dp.totalReps);

        // UI-Block für eine Übung
        const card = document.createElement('div');
        card.className = "bg-slate-800/60 border border-slate-800 rounded-xl p-4 space-y-4";
        
        const canvas1RM = `chart-1rm-${index}`;
        const canvasAvg = `chart-avg-${index}`;
        const canvasReps = `chart-reps-${index}`;

        card.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-700/50 pb-2">
                <h3 class="font-bold text-lg text-indigo-400">${exName}</h3>
                <span class="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full">${exData.count} Sätze</span>
            </div>

            <!-- Chart 1: 1RM -->
            <div class="space-y-1">
                <h4 class="text-xs font-semibold text-indigo-300 uppercase tracking-wider">One Rep Max (1RM)</h4>
                <div class="w-full relative h-40">
                    <canvas id="${canvas1RM}"></canvas>
                </div>
            </div>

            <!-- Chart 2: Ø Gewicht -->
            <div class="space-y-1 pt-2">
                <h4 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Durchschnittliches Gewicht (kg)</h4>
                <div class="w-full relative h-40">
                    <canvas id="${canvasAvg}"></canvas>
                </div>
            </div>

            <!-- Chart 3: Gesamt-Wiederholungen -->
            <div class="space-y-1 pt-2">
                <h4 class="text-xs font-semibold text-rose-400 uppercase tracking-wider">Gesamte Wiederholungen</h4>
                <div class="w-full relative h-40">
                    <canvas id="${canvasReps}"></canvas>
                </div>
            </div>
        `;
        container.appendChild(card);

        // Einzel-Diagramme erstellen
        createSingleLineChart(canvas1RM, dates, rmValues, '1RM (kg)', '#818cf8');
        createSingleLineChart(canvasAvg, dates, avgValues, 'Ø Gewicht (kg)', '#34d399');
        createSingleLineChart(canvasReps, dates, repsValues, 'Wiederholungen', '#f43f5e');
    });
}

function createSingleLineChart(canvasId, labels, data, labelName, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    activeCharts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: labelName,
                data: data,
                borderColor: color,
                backgroundColor: color,
                borderWidth: 2,
                tension: 0.2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: '#64748b', font: { size: 10 } },
                    grid: { color: 'rgba(51, 65, 85, 0.2)' }
                },
                y: {
                    ticks: { color: '#64748b', font: { size: 10 } },
                    grid: { color: 'rgba(51, 65, 85, 0.2)' }
                }
            }
        }
    });
}