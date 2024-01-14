document.addEventListener('DOMContentLoaded', () => {
    const viewport = document.querySelector("meta[name=viewport]");
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    searchInput.addEventListener('focus', () => {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    });

    searchInput.addEventListener('blur', () => {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
    });

    searchButton.addEventListener('click', () => {
        const location = searchInput.value.trim();
        if (location) {
            fetchWeatherData(location);
            searchInput.value = ''; // Clear the search field
        } else {
            alert('Por favor, ingresa una ubicación para buscar.');
        }
    });

    // Llamar a handleResize inicialmente para configurar la UI
    handleResize();
    window.addEventListener('resize', handleResize);
});

function handleResize() {
    const width = window.innerWidth;
    if (width < 768) {
        adjustForMobile();
    } else {
        adjustForDesktop();
    }
}

function adjustForMobile() {
    // Ejemplo de ajustes para pantallas pequeñas (móviles)

    // Cambiar tamaño de fuente para mejorar la legibilidad en pantallas pequeñas
    document.body.style.fontSize = '14px';

    // Ocultar elementos que no son necesarios en dispositivos móviles
    const elementsToHide = document.querySelectorAll('.desktop-only');
    elementsToHide.forEach(element => {
        element.style.display = 'none';
    });

    // Ajustar tamaños de botones o controles para ser más accesibles en pantalla táctil
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.style.padding = '12px 20px';
    });

    // Otros ajustes específicos para móviles
    // ...
}

function adjustForDesktop() {
    // Ejemplo de ajustes para pantallas más grandes

    // Revertir el tamaño de fuente a la normalidad para pantallas de escritorio
    document.body.style.fontSize = '16px';

    // Mostrar elementos ocultados en móviles
    const elementsToShow = document.querySelectorAll('.desktop-only');
    elementsToShow.forEach(element => {
        element.style.display = 'block';
    });

    // Revertir ajustes de tamaño de botones o controles
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.style.padding = '10px 15px';
    });

    // Otros ajustes específicos para escritorio
    // ...
}

function fetchWeatherData(location) {
    const apiKey = 'a48dcf2fa537accdf63b97384b5ed0fc'; // Reemplaza con tu API key real
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric&lang=es`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${location}&appid=${apiKey}&units=metric&lang=es`;

    fetch(weatherUrl)
        .then(response => response.json())
        .then(data => {
            if (data.cod === '404') {
                alert('Ubicación no encontrada.');
                return;
            }
            updateCurrentWeather(data);
        })
        .catch(error => console.error('Error al obtener los datos del clima actual:', error));

    fetch(forecastUrl)
        .then(response => response.json())
        .then(data => {
            if (data.cod === '404') {
                alert('Previsión no encontrada.');
                return;
            }
            updateForecast(data);
        })
        .catch(error => console.error('Error al obtener la previsión del clima:', error));
}

function updateCurrentWeather(data) {
    const locationElement = document.getElementById('location');
    const dateElement = document.getElementById('date');
    const tempElement = document.getElementById('temp-now');
    const tempHighLowElement = document.getElementById('temp-high-low');
    const windElement = document.getElementById('wind');
    const humidityElement = document.getElementById('humidity');
    const sunriseElement = document.getElementById('sunrise');
    const sunsetElement = document.getElementById('sunset');
    const weatherIconElement = document.getElementById('weather-icon');

    locationElement.textContent = `${data.name}, ${data.sys.country}`;
    dateElement.textContent = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    tempElement.textContent = `${Math.round(data.main.temp)}°C`;
    tempHighLowElement.textContent = `${Math.round(data.main.temp_max)}°C / ${Math.round(data.main.temp_min)}°C`;
    windElement.textContent = `Viento: ${data.wind.speed} km/h`;
    humidityElement.textContent = `Humedad: ${data.main.humidity}%`;
    sunriseElement.textContent = `Amanecer: ${new Date(data.sys.sunrise * 1000).toLocaleTimeString('es-ES')}`;
    sunsetElement.textContent = `Atardecer: ${new Date(data.sys.sunset * 1000).toLocaleTimeString('es-ES')}`;
    weatherIconElement.textContent = getWeatherEmoji(data.weather[0].id);
}

function updateForecast(data) {
    const forecastContainer = document.getElementById('forecast-container');
    forecastContainer.innerHTML = ''; // Clear previous forecasts

    for (let i = 0; i < data.list.length; i += 8) {
        const forecast = data.list[i];
        const date = new Date(forecast.dt * 1000);
        const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
        const icon = getWeatherEmoji(forecast.weather[0].id);
        const temp = `${Math.round(forecast.main.temp)}°C`;

        const forecastElement = document.createElement('div');
        forecastElement.classList.add('forecast-item');
        forecastElement.innerHTML = `
            <h3>${dayName}</h3>
            <div class="forecast-item-icon">${icon}</div>
            <p>Temp: ${temp}</p>
        `;
        forecastContainer.appendChild(forecastElement);
    }
}

function getWeatherEmoji(id) {
    if (id >= 200 && id <= 232) {
        return '⛈️'; // thunderstorm
    } else if (id >= 300 && id <= 321) {
        return '🌧️'; // drizzle
    } else if (id >= 500 && id <= 531) {
        return '🌦️'; // rain
    } else if (id >= 600 && id <= 622) {
        return '❄️'; // snow
    } else if (id >= 701 && id <= 781) {
        return '🌫️'; // mist, smoke, haze, dust, fog
    } else if (id === 800) {
        return '☀️'; // clear sky
    } else if (id === 801) {
        return '🌤️'; // few clouds
    } else if (id === 802) {
        return '⛅'; // scattered clouds
    } else if (id === 803 || id === 804) {
        return '☁️'; // broken clouds, overcast clouds
    } else {
        return '🌀'; // unknown, could be used for extreme or other weather conditions
    }
}
