'use strict';

class Workout {
  //public class fields
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
  }
}

// const run1 = new Running([39, -12], 5.3, 24, 178);
// const cycle1 = new Cycling([39, -12], 25, 95, 163);

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//////////////////////////////////////////////////////////
//APP
class App {
  //private class fields
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;
  #bindedNewWorkoutListener;
  #currentWorkout;

  constructor() {
    // Get user position
    this._getPosition();

    // Get data from localStorage
    this._getLocalStorage();

    this.#bindedNewWorkoutListener = this._newWorkout.bind(this);

    // Add event handlers
    form.addEventListener('submit', this.#bindedNewWorkoutListener);
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //handling click on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //Clear the fields
    inputDistance.value =
      inputCadence.value =
      inputElevation.value =
      inputDuration.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    //Input validation helper methods
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositives = (...inputs) => inputs.every(inp => inp > 0);

    //Get value from inputs
    const type = inputType.value;
    const duration = +inputDuration.value;
    const distance = +inputDistance.value;

    const {
      latlng: { lat, lng },
    } = this.#mapEvent;

    let workout;

    //If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //Validate input value
      if (
        !validInputs(duration, distance, elevation) ||
        !allPositives(duration, distance)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(duration, distance, cadence) ||
        !allPositives(duration, distance, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //Add new workout to workout array
    this.#workouts.push(workout);

    //Add workout to list
    this._renderWorkout(workout);

    //Hide form
    this._hideForm();

    //Set workouts to local storage
    this._setLocalStorage();

    //Render workout on map as marker
    this._renderWorkoutMarker(workout);
  }

  _renderWorkoutMarker(workout) {
    const { coords, type, description } = workout;

    const marker = new L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${type}-popup`,
        })
      )
      .setPopupContent(`${type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${description}`)
      .openPopup();
  }

  _renderWorkout(workout) {
    const { type, id, description, duration, distance } = workout;

    let html = `
    <li class="workout workout--${type}" data-id="${id}">
      <button class="three-dots-btn">
        <span class="material-symbols-outlined">
        more_horiz
        </span>
      </button>
      <div class="more-options-container hidden">
        <button class="more-option__button option-edit">Edit</button>
        <button class="more-option__button option-delete">Delete</button>
      </div>
      <h2 class="workout__title">${description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
        <span class="workout__value">${distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${duration}</span>
        <span class="workout__unit">min</span>
      </div>
    `;

    if (type === 'running') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>
      `;
    }

    if (type === 'cycling') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);

    //Add event listener to three dots button
    const btnMoreOptions = document.querySelector('.three-dots-btn');
    const btnDelete = document.querySelector('.option-delete');
    const btnEdit = document.querySelector('.option-edit');

    //To show more options
    btnMoreOptions.addEventListener('click', this._showMoreOptions);

    //Delete a workout
    btnDelete.addEventListener('click', this._deleteWorkout.bind(this));

    //Delete a workout
    btnEdit.addEventListener('click', this._editWorkout.bind(this));
  }

  _showMoreOptions(e) {
    const moreOptions = e.currentTarget.nextElementSibling;

    moreOptions.classList.toggle('hidden');
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    if (
      e.target.closest('.three-dots-btn') ||
      e.target.closest('.more-options-container')
    )
      return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const workouts = JSON.parse(localStorage.getItem('workouts'));

    if (!workouts) return;

    this.#workouts = workouts;

    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  _getCurrentWorkOut(id) {
    return this.#workouts.find(work => work.id === id);
  }

  _deleteWorkout(e) {
    const currentWorkoutEl = e.currentTarget.parentElement.parentElement;

    const filteredWorkouts = this.#workouts.filter(
      workout => workout.id !== currentWorkoutEl.dataset.id
    );

    this.#workouts = filteredWorkouts;

    //Remove current workout from DOM
    currentWorkoutEl.remove();

    //Set new workouts to local storage
    this._setLocalStorage();

    location.reload();
  }

  /*
    const inputType = document.querySelector('.form__input--type');
    const inputDistance = document.querySelector('.form__input--distance');
    const inputDuration = document.querySelector('.form__input--duration');
    const inputCadence = document.querySelector('.form__input--cadence');
    const inputElevation = document.querySelector('.form__input--elevation');
   */

  _editWorkout(e) {
    //Get current workout element
    const currentWorkoutEl = e.currentTarget.parentElement.parentElement;

    //Get current workout element from workouts element
    const currentWorkout = this._getCurrentWorkOut(currentWorkoutEl.dataset.id);

    //Hide current workout element
    currentWorkoutEl.style.display = 'none';

    //Show form with current workout properties
    inputDistance.value = currentWorkout.distance;
    inputDuration.value = currentWorkout.duration;
    inputType.value = currentWorkout.type;

    if (currentWorkout.type === 'running') {
      inputCadence.value = currentWorkout.cadence;
    } else {
      inputElevation.value = currentWorkout.elevationGain;
    }

    form.classList.remove('hidden');

    // const formButton = form.lastChild.previousSibling;
    // formButton.style.display = 'block';

    this.#currentWorkout = currentWorkout;

    //Remove old submit listener to form
    form.removeEventListener('submit', this.#bindedNewWorkoutListener);

    //Add new submit listener to form
    form.addEventListener('submit', this._updateWorkout.bind(this));
  }

  _updateWorkout(e) {
    e.preventDefault();

    //Input validation helper methods
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositives = (...inputs) => inputs.every(inp => inp > 0);

    //Get value from inputs
    const type = inputType.value;
    const duration = +inputDuration.value;
    const distance = +inputDistance.value;

    let newWorkout;

    //If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //Validate input value
      if (
        !validInputs(duration, distance, elevation) ||
        !allPositives(duration, distance)
      )
        return alert('Inputs have to be positive numbers!');

      newWorkout = new Cycling(
        this.#currentWorkout.coords,
        distance,
        duration,
        elevation
      );
    }

    //If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(duration, distance, cadence) ||
        !allPositives(duration, distance, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      newWorkout = new Running(
        this.#currentWorkout.coords,
        distance,
        duration,
        cadence
      );
    }

    //Replace new created workout from currentWorkout to be updated
    this.#workouts = this.#workouts.map(work =>
      work.id === this.#currentWorkout.id ? newWorkout : work
    );

    //Close form
    form.classList.add('hidden');

    //Set updated workouts to local Storage
    this._setLocalStorage();

    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
