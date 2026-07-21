let calendarViewDate = new Date();
let selectedCalendarDate = null;

function getWorkoutsByDate() {
    const history = safeParseLocalStorage('gym_history', []);
    const map = {};
    history.forEach((workout, index) => {
        if (!map[workout.date]) map[workout.date] = [];
        map[workout.date].push({ ...workout, _historyIndex: index });
    });
    return map;
}

function calendarShiftMonth(delta) {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + delta);
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('calendar-month-label');
    const detail = document.getElementById('calendar-day-detail');

    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    label.innerText = `${monthNames[month]} ${year}`;

    const workoutsByDate = getWorkoutsByDate();

    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    grid.innerHTML = '';

    ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach(d => {
        const el = document.createElement('div');
        el.className = 'text-xs font-semibold text-slate-500 py-1';
        el.innerText = d;
        grid.appendChild(el);
    });

    for (let i = 0; i < startOffset; i++) {
        const empty = document.createElement('div');
        grid.appendChild(empty);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasWorkout = !!workoutsByDate[dateStr];
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedCalendarDate;

        const cell = document.createElement('button');
        cell.onclick = () => selectCalendarDate(dateStr);

        let classes = 'aspect-square rounded-lg text-sm flex items-center justify-center relative transition ';
        if (isSelected) {
            classes += 'bg-indigo-600 text-white font-bold ';
        } else if (hasWorkout) {
            classes += 'bg-indigo-600/20 text-indigo-300 font-semibold hover:bg-indigo-600/30 ';
        } else {
            classes += 'text-slate-500 hover:bg-slate-800 ';
        }
        if (isToday && !isSelected) {
            classes += 'ring-1 ring-inset ring-slate-600 ';
        }

        cell.className = classes;
        cell.innerHTML = `${day}${hasWorkout ? '<span class="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-400"></span>' : ''}`;
        grid.appendChild(cell);
    }

    if (selectedCalendarDate) {
        renderCalendarDayDetail(selectedCalendarDate);
    } else {
        detail.innerHTML = '';
    }
}

function selectCalendarDate(dateStr) {
    selectedCalendarDate = selectedCalendarDate === dateStr ? null : dateStr;
    renderCalendar();
}

function renderCalendarDayDetail(dateStr) {
    const detail = document.getElementById('calendar-day-detail');
    const workoutsByDate = getWorkoutsByDate();
    const workouts = workoutsByDate[dateStr];

    if (!workouts || workouts.length === 0) {
        detail.innerHTML = `<p class="text-sm text-slate-500 text-center py-4">Kein Training an diesem Tag.</p>`;
        return;
    }

    const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    let html = `<h3 class="text-sm font-semibold text-slate-300 pt-2">${formattedDate}</h3>`;

    workouts.forEach(workout => {
        html += `<div class="bg-slate-800/60 border border-slate-800 rounded-xl p-3 space-y-2">
            <div class="flex justify-between items-center">
                <span class="text-xs text-slate-500">${workout.time || ''}</span>
                <button onclick="deleteWorkout(${workout._historyIndex})" class="text-xs text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 px-2 py-1 rounded-lg border border-red-900/50">
                    🗑️ Workout löschen
                </button>
            </div>`;

        workout.exercises.forEach((ex, exIdx) => {
            html += `<div class="pt-1">
                <div class="flex justify-between items-center mb-1">
                    <span class="font-semibold text-indigo-400 text-sm">${ex.name}</span>
                    <button onclick="deleteExercise(${workout._historyIndex}, ${exIdx})" class="text-xs text-slate-500 hover:text-red-400">
                        ✕ Übung entfernen
                    </button>
                </div>
                <div class="space-y-1">`;

            ex.sets.forEach((set, setIdx) => {
                html += `<div class="flex justify-between items-center text-xs text-slate-400 bg-slate-900/50 rounded-lg px-2 py-1.5">
                    <span>Satz ${set.setNumber}: ${set.weight} kg × ${set.reps} Wdh.</span>
                    <button onclick="deleteSet(${workout._historyIndex}, ${exIdx}, ${setIdx})" class="text-slate-600 hover:text-red-400 px-1">✕</button>
                </div>`;
            });

            html += `</div></div>`;
        });

        html += `</div>`;
    });

    detail.innerHTML = html;
}

function deleteWorkout(historyIndex) {
    if (!confirm('Dieses gesamte Workout wirklich löschen?')) return;
    const history = safeParseLocalStorage('gym_history', []);
    history.splice(historyIndex, 1);
    safeSetLocalStorage('gym_history', history);
    updateStatusText('Workout gelöscht.');
    renderCalendar();
}

function deleteExercise(historyIndex, exerciseIndex) {
    if (!confirm('Diese Übung wirklich aus dem Workout entfernen?')) return;
    const history = safeParseLocalStorage('gym_history', []);
    const workout = history[historyIndex];
    if (!workout) return;

    workout.exercises.splice(exerciseIndex, 1);

    if (workout.exercises.length === 0) {
        history.splice(historyIndex, 1);
    }

    safeSetLocalStorage('gym_history', history);
    updateStatusText('Übung entfernt.');
    renderCalendar();
}

function deleteSet(historyIndex, exerciseIndex, setIndex) {
    if (!confirm('Diesen Satz wirklich löschen?')) return;
    const history = safeParseLocalStorage('gym_history', []);
    const workout = history[historyIndex];
    if (!workout) return;
    const exercise = workout.exercises[exerciseIndex];
    if (!exercise) return;

    exercise.sets.splice(setIndex, 1);

    if (exercise.sets.length === 0) {
        workout.exercises.splice(exerciseIndex, 1);
    }
    if (workout.exercises.length === 0) {
        history.splice(historyIndex, 1);
    }

    safeSetLocalStorage('gym_history', history);
    updateStatusText('Satz gelöscht.');
    renderCalendar();
}
