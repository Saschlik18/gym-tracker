function createNewWorkout() {
    return {
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        exercises: []
    };
}

let currentWorkout = createNewWorkout();
let activeExercise = { name: "", sets: [] };
let setCounter = 1;

// Default-Übungen, die fest im Code hinterlegt sind
const DEFAULT_EXERCISES = [
    "🏋️‍♂️ Bankdrücken",
    "🦵 Kniebeugen",
    "🍑 Kreuzheben",
    "🦅 Klimmzüge",
    "🚀 Schulterdrücken"
];

// DOM Elemente
const stepSelect = document.getElementById('step-select-exercise');
const stepLogSet = document.getElementById('step-log-set');
const currentExerciseTitle = document.getElementById('current-exercise-title');
const currentSetNumber = document.getElementById('current-set-number');
const weightInput = document.getElementById('weight-input');
const repsInput = document.getElementById('reps-input');
const logStatus = document.getElementById('log-status');
const sideMenu = document.getElementById('side-menu');

const viewTracker = document.getElementById('view-tracker');
const viewStats = document.getElementById('view-stats');

// Beim Laden der Seite direkt die Übungen im Dropdown bereitstellen
document.addEventListener('DOMContentLoaded', () => {
    loadExerciseDropdown();
});

function toggleMenu() {
    sideMenu.classList.toggle('hidden');
}

function showTab(tabName) {
    toggleMenu();
    if (tabName === 'tracker') {
        viewStats.classList.add('hidden');
        viewTracker.classList.remove('hidden');
    } else if (tabName === 'stats') {
        viewTracker.classList.add('hidden');
        viewStats.classList.remove('hidden');
        renderStatistics(); // Funktion aus stats.js aufrufen
    }
}

// Dropdown befüllen (Kombination aus Default + Custom aus LocalStorage)
function loadExerciseDropdown() {
    const dropdown = document.getElementById('exercise-dropdown');
    dropdown.innerHTML = '';

    const customExercises = JSON.parse(localStorage.getItem('gym_custom_exercises')) || [];
    const allExercises = [...DEFAULT_EXERCISES, ...customExercises];

    allExercises.forEach(ex => {
        const option = document.createElement('option');
        option.value = ex;
        option.textContent = ex;
        dropdown.appendChild(option);
    });
}

// Eingabefeld ein-/ausblenden
function toggleAddExerciseInput() {
    const form = document.getElementById('custom-exercise-form');
    const input = document.getElementById('custom-exercise-input');
    
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) {
        input.focus();
    } else {
        input.value = '';
    }
}

// Neue Übung speichern
function saveCustomExercise() {
    const input = document.getElementById('custom-exercise-input');
    const name = input.value.trim();

    if (!name) {
        alert('Bitte gib einen Namen für die Übung ein.');
        return;
    }

    const formattedName = name.startsWith('💪') ? name : `💪 ${name}`;
    const customExercises = JSON.parse(localStorage.getItem('gym_custom_exercises')) || [];

    if (DEFAULT_EXERCISES.includes(formattedName) || customExercises.includes(formattedName)) {
        alert('Diese Übung existiert bereits!');
        return;
    }

    customExercises.push(formattedName);
    localStorage.setItem('gym_custom_exercises', JSON.stringify(customExercises));

    loadExerciseDropdown();
    dropdownSelectValue('exercise-dropdown', formattedName);
    
    input.value = '';
    toggleAddExerciseInput();
    updateStatusText(`Neue Übung "${formattedName}" hinzugefügt.`);
}

function dropdownSelectValue(dropdownId, value) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.value = value;
}

function startExercise() {
    const selectedExercise = document.getElementById('exercise-dropdown').value;
    if (!selectedExercise) {
        alert("Bitte wähle eine Übung aus.");
        return;
    }
    activeExercise = { name: selectedExercise, sets: [] };
    setCounter = 1;
    
    currentExerciseTitle.innerText = selectedExercise;
    currentSetNumber.innerText = setCounter;
    
    weightInput.value = "";
    repsInput.value = "";
    
    stepSelect.classList.add('hidden');
    stepLogSet.classList.remove('hidden');
    
    setTimeout(() => weightInput.focus(), 50);
}

function cancelExercise() {
    if (activeExercise.sets.length > 0) {
        if (!confirm("Du hast für diese Übung bereits Sätze eingetragen. Möchtest du sie wirklich verwerfen?")) {
            return;
        }
    }
    
    weightInput.value = "";
    repsInput.value = "";
    
    stepLogSet.classList.add('hidden');
    stepSelect.classList.remove('hidden');
    updateStatusText("Übung abgebrochen. Keine Daten gespeichert.");
}

function nextSet() {
    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value);

    if (!weight || !reps) {
        alert("Bitte trage Gewicht und Wiederholungen ein.");
        return;
    }

    activeExercise.sets.push({
        setNumber: setCounter,
        weight: weight,
        reps: reps
    });

    setCounter++;
    currentSetNumber.innerText = setCounter;
    
    weightInput.value = "";
    repsInput.value = "";
    weightInput.focus();
    
    updateStatusText(`Satz ${setCounter - 1} gesichert.`);
}

function finishExercise() {
    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value);
    
    if (weight && reps) {
        activeExercise.sets.push({
            setNumber: setCounter,
            weight: weight,
            reps: reps
        });
    }

    if (activeExercise.sets.length === 0) {
        alert("Es wurden keine Sätze für diese Übung erfasst.");
        return;
    }

    currentWorkout.exercises.push(activeExercise);

    const history = JSON.parse(localStorage.getItem('gym_history')) || [];
    history.push(currentWorkout);
    localStorage.setItem('gym_history', JSON.stringify(history));

    // Reset current workout for next session
    currentWorkout = createNewWorkout();

    weightInput.value = "";
    repsInput.value = "";

    stepSelect.classList.remove('hidden');
    stepLogSet.classList.add('hidden');

    updateStatusText(`Erfolgreich gespeichert: ${activeExercise.name} (${activeExercise.sets.length} Sätze).`);
}

function clearAllData() {
    const dynamicCheck = confirm("🚨 BIST DU DIR SICHER?\n\nDadurch werden ALLE gespeicherten Trainingseinheiten unwiderruflich gelöscht.");
    
    if (dynamicCheck) {
        localStorage.removeItem('gym_history');
        localStorage.removeItem('gym_custom_exercises');
        loadExerciseDropdown();
        updateStatusText("Speicher wurde komplett geleert.");
        alert("Alle lokalen Daten wurden gelöscht.");
        if (!viewStats.classList.contains('hidden')) {
            renderStatistics();
        }
    }
}

function updateStatusText(text) {
    logStatus.innerText = text;
}

function exportData() {
    const data = localStorage.getItem('gym_history');
    if (!data || JSON.parse(data).length === 0) {
        alert("Noch keine Daten im Speicher zum Exportieren vorhanden.");
        return;
    }
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}