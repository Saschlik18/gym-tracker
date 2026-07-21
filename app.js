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

const DEFAULT_EXERCISES = [
    "Bankdrücken",
    "Kniebeugen",
    "Kreuzheben",
    "Klimmzüge",
    "Schulterdrücken"
];

const MAX_WEIGHT_KG = 500;
const MAX_REPS = 200;

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
const viewCalendar = document.getElementById('view-calendar');

document.addEventListener('DOMContentLoaded', () => {
    loadExerciseDropdown();
});

function safeParseLocalStorage(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return parsed !== null && parsed !== undefined ? parsed : fallback;
    } catch (e) {
        console.error(`Korrupte Daten in localStorage["${key}"]:`, e);
        return fallback;
    }
}

function safeSetLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error(`Fehler beim Speichern in localStorage["${key}"]:`, e);
        alert("Fehler beim Speichern der Daten. Möglicherweise ist der Speicher voll.");
        return false;
    }
}

function toggleMenu() {
    sideMenu.classList.toggle('hidden');
}

function showTab(tabName) {
    toggleMenu();
    viewTracker.classList.add('hidden');
    viewStats.classList.add('hidden');
    viewCalendar.classList.add('hidden');

    if (tabName === 'tracker') {
        viewTracker.classList.remove('hidden');
    } else if (tabName === 'stats') {
        viewStats.classList.remove('hidden');
        renderStatistics();
    } else if (tabName === 'calendar') {
        viewCalendar.classList.remove('hidden');
        renderCalendar();
    }
}

function loadExerciseDropdown() {
    const dropdown = document.getElementById('exercise-dropdown');
    dropdown.innerHTML = '';

    const customExercises = safeParseLocalStorage('gym_custom_exercises', []);
    const allExercises = [...DEFAULT_EXERCISES, ...customExercises];

    allExercises.forEach(ex => {
        const option = document.createElement('option');
        option.value = ex;
        option.textContent = ex;
        dropdown.appendChild(option);
    });
}

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

function normalizeExerciseName(name) {
    return name
        .replace(/\s+/g, '')
        .trim()
        .toLowerCase();
}

function saveCustomExercise() {
    const input = document.getElementById('custom-exercise-input');
    const name = input.value.trim();

    if (!name) {
        alert('Bitte gib einen Namen für die Übung ein.');
        return;
    }

    const customExercises = safeParseLocalStorage('gym_custom_exercises', []);

    const normalizedNew = normalizeExerciseName(name);
    const allExisting = [...DEFAULT_EXERCISES, ...customExercises];
    const isDuplicate = allExisting.some(ex => normalizeExerciseName(ex) === normalizedNew);

    if (isDuplicate) {
        alert('Diese Übung existiert bereits!');
        return;
    }

    customExercises.push(name);
    if (!safeSetLocalStorage('gym_custom_exercises', customExercises)) {
        return;
    }

    loadExerciseDropdown();
    dropdownSelectValue('exercise-dropdown', name);

    input.value = '';
    toggleAddExerciseInput();
    updateStatusText(`Neue Übung "${name}" hinzugefügt.`);
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

function validateSetInput(weight, reps) {
    if (weightInput.value.trim() === "" || repsInput.value.trim() === "") {
        return { valid: false, message: "Bitte trage Gewicht und Wiederholungen ein." };
    }
    if (isNaN(weight) || isNaN(reps)) {
        return { valid: false, message: "Bitte gültige Zahlen für Gewicht und Wiederholungen eintragen." };
    }
    if (weight < 0 || reps < 0) {
        return { valid: false, message: "Gewicht und Wiederholungen dürfen nicht negativ sein." };
    }
    if (reps === 0) {
        return { valid: false, message: "Wiederholungen müssen mindestens 1 sein." };
    }
    if (weight > MAX_WEIGHT_KG) {
        return { valid: false, message: `Gewicht darf ${MAX_WEIGHT_KG} kg nicht überschreiten. Bitte prüfe deine Eingabe.` };
    }
    if (reps > MAX_REPS) {
        return { valid: false, message: `Wiederholungen dürfen ${MAX_REPS} nicht überschreiten. Bitte prüfe deine Eingabe.` };
    }
    return { valid: true };
}

function nextSet() {
    const weight = parseFloat(weightInput.value);
    const reps = parseInt(repsInput.value);

    const validation = validateSetInput(weight, reps);
    if (!validation.valid) {
        alert(validation.message);
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
    const weightRaw = weightInput.value.trim();
    const repsRaw = repsInput.value.trim();

    if (weightRaw !== "" || repsRaw !== "") {
        const weight = parseFloat(weightInput.value);
        const reps = parseInt(repsInput.value);
        const validation = validateSetInput(weight, reps);

        if (!validation.valid) {
            alert(validation.message + "\n\nÜbung wurde noch nicht beendet — bitte korrigiere die Eingabe oder leere beide Felder, um den letzten Satz zu verwerfen.");
            return;
        }

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

    const history = safeParseLocalStorage('gym_history', []);
    history.push(currentWorkout);

    if (!safeSetLocalStorage('gym_history', history)) {
        currentWorkout.exercises.pop();
        return;
    }

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
        if (!viewCalendar.classList.contains('hidden')) {
            renderCalendar();
        }
    }
}

function updateStatusText(text) {
    logStatus.innerText = text;
}

function exportData() {
    const data = safeParseLocalStorage('gym_history', []);
    if (!data || data.length === 0) {
        alert("Noch keine Daten im Speicher zum Exportieren vorhanden.");
        return;
    }

    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
