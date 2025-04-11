document.addEventListener('DOMContentLoaded', function() {
    // API key for OpenWeatherMap - Using the provided API key
    const API_KEY = 'a48dcf2fa537accdf63b97384b5ed0fc';
    
    // DOM elements
    const cityInput = document.getElementById('city-input');
    const searchBtn = document.getElementById('search-btn');
    const locationBtn = document.getElementById('location-btn');
    const errorMessage = document.getElementById('error-message');
    const loadingElement = document.getElementById('loading');
    const weatherContent = document.getElementById('weather-content');
    const mapLayerBtns = document.querySelectorAll('.map-layer-btn');
    const legendContent = document.getElementById('legend-content');
    const hourlyModal = document.getElementById('hourly-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalTitle = document.getElementById('modal-title');
    const hourlyDate = document.getElementById('hourly-date');
    const hourlyForecastContainer = document.getElementById('hourly-forecast-container');
    const graphTooltip = document.getElementById('graph-tooltip');
    
    // Map variables
    let map = null;
    let currentTileLayer = null;
    let currentCoordinates = [41.3851, 2.1734]; // Default to Barcelona
    let currentZoom = 8;
    
    // Store forecast data
    let forecastData = null;
    let currentHourlyData = null;
    
    // Set current date
    updateDate();
    
    // Add event listeners
    searchBtn.addEventListener('click', function() {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherByCity(city);
        } else {
            showError('Por favor, introduce una ciudad');
        }
    });
    
    cityInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const city = cityInput.value.trim();
            if (city) {
                getWeatherByCity(city);
            } else {
                showError('Por favor, introduce una ciudad');
            }
        }
    });
    
    locationBtn.addEventListener('click', function() {
        getUserLocation();
    });
    
    // Map layer buttons event listeners
    mapLayerBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const layer = this.getAttribute('data-layer');
            
            // Update active button
            mapLayerBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update map layer
            updateMapLayer(layer);
        });
    });
    
    // Modal close button event listener
    modalCloseBtn.addEventListener('click', function() {
        closeModal();
    });
    
    // Close modal when clicking outside
    hourlyModal.addEventListener('click', function(e) {
        if (e.target === hourlyModal) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && hourlyModal.classList.contains('show')) {
            closeModal();
        }
    });
    
    // Try to get user location on page load
    getUserLocation();
    
    // Functions
    function updateDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('date').textContent = now.toLocaleDateString('es-ES', options);
    }
    
    function getUserLocation() {
        showLoading();
        clearError();
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                // Success callback
                function(position) {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    currentCoordinates = [lat, lon];
                    getWeatherByCoordinates(lat, lon);
                },
                // Error callback
                function(error) {
                    hideLoading();
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            showError('Permiso de ubicación denegado. Por favor, busca una ciudad manualmente.');
                            break;
                        case error.POSITION_UNAVAILABLE:
                            showError('Información de ubicación no disponible. Por favor, busca una ciudad manualmente.');
                            break;
                        case error.TIMEOUT:
                            showError('Tiempo de espera agotado. Por favor, busca una ciudad manualmente.');
                            break;
                        default:
                            showError('Error desconocido. Por favor, busca una ciudad manualmente.');
                            break;
                    }
                    // Load default city as fallback
                    getWeatherByCity('Barcelona');
                }
            );
        } else {
            hideLoading();
            showError('Geolocalización no soportada en este navegador. Por favor, busca una ciudad manualmente.');
            // Load default city as fallback
            getWeatherByCity('Barcelona');
        }
    }
    
    function getWeatherByCity(city) {
        showLoading();
        clearError();
        
        // Fetch current weather
        fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city},es&units=metric&lang=es&appid=${API_KEY}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Ciudad no encontrada');
                }
                return response.json();
            })
            .then(data => {
                updateCurrentWeather(data);
                
                // Get coordinates for forecast and map
                const lat = data.coord.lat;
                const lon = data.coord.lon;
                currentCoordinates = [lat, lon];
                
                // Fetch 5-day forecast
                return fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${API_KEY}`);
            })
            .then(response => response.json())
            .then(data => {
                forecastData = data; // Store forecast data
                updateForecast(data);
                hideLoading();
                showWeatherContent();
                
                // Initialize or update map
                if (map === null) {
                    initMap();
                } else {
                    updateMapView();
                }
            })
            .catch(error => {
                hideLoading();
                showError(error.message);
                console.error('Error:', error);
            });
    }
    
    function getWeatherByCoordinates(lat, lon) {
        showLoading();
        clearError();
        
        // Fetch current weather
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${API_KEY}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('No se pudieron obtener datos meteorológicos para esta ubicación');
                }
                return response.json();
            })
            .then(data => {
                updateCurrentWeather(data);
                
                // Fetch 5-day forecast
                return fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${API_KEY}`);
            })
            .then(response => response.json())
            .then(data => {
                forecastData = data; // Store forecast data
                updateForecast(data);
                hideLoading();
                showWeatherContent();
                
                // Initialize or update map
                if (map === null) {
                    initMap();
                } else {
                    updateMapView();
                }
            })
            .catch(error => {
                hideLoading();
                showError(error.message);
                console.error('Error:', error);
                // Load default city as fallback
                getWeatherByCity('Barcelona');
            });
    }
    
    function updateCurrentWeather(data) {
        // Update location
        let locationText = data.name;
        if (data.sys && data.sys.country) {
            if (data.sys.country === 'ES') {
                locationText += ', España';
            } else {
                locationText += `, ${data.sys.country}`;
            }
        }
        document.getElementById('location').textContent = locationText;
        
        // Update temperature and description
        document.getElementById('temperature').textContent = Math.round(data.main.temp);
        document.getElementById('weather-description').textContent = data.weather[0].description;
        
        // Update details
        document.getElementById('wind-speed').textContent = `${Math.round(data.wind.speed * 3.6)} km/h`; // Convert m/s to km/h
        document.getElementById('humidity').textContent = `${data.main.humidity}%`;
        document.getElementById('feels-like').textContent = `${Math.round(data.main.feels_like)}°C`;
        
        // Update weather icon
        updateWeatherIcon(data.weather[0].icon);
    }
    
    function updateForecast(data) {
        const forecastContainer = document.getElementById('forecast-container');
        forecastContainer.innerHTML = '';
        
        // Process forecast data - get one forecast per day at noon
        const dailyForecasts = {};
        
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const day = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            
            // If we don't have this day yet, or if this forecast is closer to noon
            if (!dailyForecasts[day] || Math.abs(date.getHours() - 12) < Math.abs(new Date(dailyForecasts[day].dt * 1000).getHours() - 12)) {
                dailyForecasts[day] = item;
            }
        });
        
        // Convert to array and sort by date
        const sortedForecasts = Object.values(dailyForecasts)
            .sort((a, b) => a.dt - b.dt)
            .slice(0, 5); // Limit to 5 days
        
        // Create forecast items
        sortedForecasts.forEach(forecast => {
            const date = new Date(forecast.dt * 1000);
            const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
            const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            
            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            forecastItem.setAttribute('data-date', dateStr);
            forecastItem.innerHTML = `
                <div class="forecast-day">${capitalizedDayName}</div>
                <div class="forecast-icon">
                    <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png" alt="${forecast.weather[0].description}">
                </div>
                <div class="forecast-temp">${Math.round(forecast.main.temp_min)}° / ${Math.round(forecast.main.temp_max)}°</div>
                <div class="forecast-desc">${forecast.weather[0].description}</div>
            `;
            
            // Add click event to show hourly forecast
            forecastItem.addEventListener('click', function() {
                const selectedDate = this.getAttribute('data-date');
                showHourlyForecast(selectedDate, capitalizedDayName);
            });
            
            forecastContainer.appendChild(forecastItem);
        });
    }
    
    function showHourlyForecast(dateStr, dayName) {
        if (!forecastData || !forecastData.list) {
            showError('No hay datos de pronóstico disponibles');
            return;
        }
        
        // Filter forecast data for the selected date
        const hourlyData = forecastData.list.filter(item => {
            const itemDate = new Date(item.dt * 1000);
            return itemDate.toISOString().split('T')[0] === dateStr;
        });
        
        if (hourlyData.length === 0) {
            showError('No hay datos horarios disponibles para esta fecha');
            return;
        }
        
        // Store current hourly data for tooltip use
        currentHourlyData = hourlyData;
        
        // Format date for display
        const date = new Date(dateStr);
        const formattedDate = date.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
        
        // Update modal title and date
        modalTitle.textContent = `Pronóstico por Horas - ${dayName}`;
        hourlyDate.textContent = capitalizedDate;
        
        // Clear previous hourly forecast
        hourlyForecastContainer.innerHTML = '';
        
        // Create hourly forecast items
        hourlyData.forEach(hourData => {
            const hourTime = new Date(hourData.dt * 1000);
            const formattedTime = hourTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            
            const hourlyItem = document.createElement('div');
            hourlyItem.className = 'hourly-item';
            hourlyItem.innerHTML = `
                <div class="hourly-time">${formattedTime}</div>
                <div class="hourly-icon">
                    <img src="https://openweathermap.org/img/wn/${hourData.weather[0].icon}.png" alt="${hourData.weather[0].description}">
                </div>
                <div class="hourly-temp">${Math.round(hourData.main.temp)}°C</div>
                <div class="hourly-desc">${hourData.weather[0].description}</div>
                <div class="hourly-details">
                    <div class="hourly-detail">
                        <span class="hourly-detail-label">Viento:</span>
                        <span>${Math.round(hourData.wind.speed * 3.6)} km/h</span>
                    </div>
                    <div class="hourly-detail">
                        <span class="hourly-detail-label">Humedad:</span>
                        <span>${hourData.main.humidity}%</span>
                    </div>
                </div>
            `;
            
            hourlyForecastContainer.appendChild(hourlyItem);
        });
        
        // Draw temperature graph
        drawTemperatureGraph(hourlyData);
        
        // Show modal
        openModal();
    }
    
    function drawTemperatureGraph(hourlyData) {
        const canvas = document.getElementById('temperature-graph');
        const ctx = canvas.getContext('2d');
        
        // Clear previous graph
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set canvas dimensions
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 200;
        
        // Extract temperature and time data
        const temperatures = hourlyData.map(item => Math.round(item.main.temp));
        const times = hourlyData.map(item => {
            const date = new Date(item.dt * 1000);
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        });
        
        // Find min and max temperatures for scaling
        const minTemp = Math.min(...temperatures) - 2;
        const maxTemp = Math.max(...temperatures) + 2;
        const tempRange = maxTemp - minTemp;
        
        // Graph dimensions
        const padding = 40;
        const graphWidth = canvas.width - (padding * 2);
        const graphHeight = canvas.height - (padding * 2);
        
        // Draw axes
        ctx.beginPath();
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();
        
        // Draw temperature line
        ctx.beginPath();
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        
        hourlyData.forEach((item, index) => {
            const temp = Math.round(item.main.temp);
            const x = padding + (index * (graphWidth / (hourlyData.length - 1)));
            const y = canvas.height - padding - ((temp - minTemp) / tempRange * graphHeight);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Store point coordinates for hover detection
        const pointCoordinates = [];
        
        // Draw temperature points and labels
        hourlyData.forEach((item, index) => {
            const temp = Math.round(item.main.temp);
            const x = padding + (index * (graphWidth / (hourlyData.length - 1)));
            const y = canvas.height - padding - ((temp - minTemp) / tempRange * graphHeight);
            
            // Store point coordinates
            pointCoordinates.push({ x, y, data: item, index });
            
            // Draw point
            ctx.beginPath();
            ctx.fillStyle = '#3498db';
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw temperature label
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${temp}°C`, x, y - 15);
            
            // Draw time label
            const time = new Date(item.dt * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            ctx.fillText(time, x, canvas.height - padding + 15);
        });
        
        // Draw y-axis labels (temperature)
        ctx.textAlign = 'right';
        ctx.fillStyle = '#666';
        
        // Draw min and max temperature on y-axis
        ctx.fillText(`${minTemp}°C`, padding - 10, canvas.height - padding);
        ctx.fillText(`${maxTemp}°C`, padding - 10, padding);
        
        // Draw title
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#3498db';
        ctx.fillText('Temperatura por Hora', canvas.width / 2, 20);
        
        // Add mouse move event for tooltip
        canvas.addEventListener('mousemove', function(e) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Check if mouse is over any point
            let hoveredPoint = null;
            for (const point of pointCoordinates) {
                const distance = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));
                if (distance <= 15) { // Increased detection radius for better UX
                    hoveredPoint = point;
                    break;
                }
            }
            
            if (hoveredPoint) {
                showGraphTooltip(hoveredPoint, e.clientX, e.clientY);
            } else {
                hideGraphTooltip();
            }
        });
        
        // Hide tooltip when mouse leaves canvas
        canvas.addEventListener('mouseleave', hideGraphTooltip);
    }
    
    function showGraphTooltip(point, clientX, clientY) {
        const data = point.data;
        const temp = Math.round(data.main.temp);
        const time = new Date(data.dt * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const description = data.weather[0].description;
        const humidity = data.main.humidity;
        const windSpeed = Math.round(data.wind.speed * 3.6); // Convert m/s to km/h
        const iconCode = data.weather[0].icon;
        
        // Create tooltip content
        graphTooltip.innerHTML = `
            <div class="tooltip-title">${time}</div>
            <div class="tooltip-content">
                <div class="tooltip-row">
                    <img class="tooltip-icon" src="https://openweathermap.org/img/wn/${iconCode}.png" alt="${description}">
                    <span>${temp}°C</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Clima:</span>
                    <span>${description}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Humedad:</span>
                    <span>${humidity}%</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">Viento:</span>
                    <span>${windSpeed} km/h</span>
                </div>
            </div>
        `;
        
        // Position tooltip
        const tooltipRect = graphTooltip.getBoundingClientRect();
        const canvasRect = document.getElementById('temperature-graph').getBoundingClientRect();
        
        // Calculate position to keep tooltip within viewport
        let left = clientX - canvasRect.left;
        let top = clientY - canvasRect.top - tooltipRect.height - 10;
        
        // Adjust if tooltip would go off the right edge
        if (left + tooltipRect.width > canvasRect.width) {
            left = canvasRect.width - tooltipRect.width;
        }
        
        // Adjust if tooltip would go off the top
        if (top < 0) {
            top = clientY - canvasRect.top + 20; // Show below cursor instead
        }
        
        // Set tooltip position
        graphTooltip.style.left = `${left}px`;
        graphTooltip.style.top = `${top}px`;
        
        // Show tooltip
        graphTooltip.classList.remove('hidden');
    }
    
    function hideGraphTooltip() {
        graphTooltip.classList.add('hidden');
    }
    
    function updateWeatherIcon(iconCode) {
        const iconElement = document.querySelector('.weather-icon');
        iconElement.innerHTML = `<img src="https://openweathermap.org/img/wn/${iconCode}@4x.png" alt="Weather icon">`;
    }
    
    function openModal() {
        hourlyModal.classList.remove('hidden');
        setTimeout(() => {
            hourlyModal.classList.add('show');
        }, 10);
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
    
    function closeModal() {
        hourlyModal.classList.remove('show');
        setTimeout(() => {
            hourlyModal.classList.add('hidden');
        }, 300);
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    // Declare L before using it
    let L;

    function initMap() {
        // Create map
        map = L.map('weather-map').setView(currentCoordinates, currentZoom);
        
        // Add OpenStreetMap base layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18
        }).addTo(map);
        
        // Add marker for current location
        L.marker(currentCoordinates).addTo(map)
            .bindPopup('Ubicación actual')
            .openPopup();
        
        // Add initial weather layer (radar by default)
        updateMapLayer('radar');
        
        // Update map size after it's visible
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
    }
    
    function updateMapView() {
        if (map) {
            // Update map center and marker
            map.setView(currentCoordinates, currentZoom);
            
            // Clear existing markers
            map.eachLayer(layer => {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });
            
            // Add new marker
            L.marker(currentCoordinates).addTo(map)
                .bindPopup('Ubicación actual')
                .openPopup();
            
            // Update weather layer
            const activeLayer = document.querySelector('.map-layer-btn.active').getAttribute('data-layer');
            updateMapLayer(activeLayer);
        }
    }
    
    let animationTimer;
    let animationPosition = 0;
    let radarFrames = [];

    function updateMapLayer(layerType) {
        // Stop any running animations
        if (animationTimer) {
            clearInterval(animationTimer);
            animationTimer = null;
        }
        
        // Remove current tile layer if exists
        if (currentTileLayer) {
            map.removeLayer(currentTileLayer);
            currentTileLayer = null;
        }
        
        // Clear existing radar frames
        radarFrames = [];
        
        // Update legend
        updateLegend(layerType);
        
        // Map OpenWeatherMap layer types to their API layer names
        const layerMapping = {
            'radar': 'precipitation_new',
            'precipitation': 'precipitation_new',
            'temp': 'temp_new',
            'clouds': 'clouds_new',
            'wind': 'wind_new'
        };
        
        // Get the OpenWeatherMap layer name
        const owmLayer = layerMapping[layerType] || 'precipitation_new';
        
        // Add new OpenWeatherMap tile layer
        currentTileLayer = L.tileLayer(`https://tile.openweathermap.org/map/${owmLayer}/{z}/{x}/{y}.png?appid=${API_KEY}`, {
            attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>',
            maxZoom: 18,
            opacity: 0.7
        }).addTo(map);
    }
    
    function updateLegend(layerType) {
        legendContent.innerHTML = '';
        
        switch (layerType) {
            case 'radar':
            case 'precipitation':
                // Precipitation legend
                const precipGradient = document.createElement('div');
                precipGradient.className = 'legend-gradient';
                precipGradient.style.background = 'linear-gradient(to right, rgba(0,0,255,0.5), rgba(0,255,255,0.5), rgba(0,255,0,0.5), rgba(255,255,0,0.5), rgba(255,0,0,0.5))';
                
                const precipLabels = document.createElement('div');
                precipLabels.className = 'legend-labels';
                precipLabels.style.display = 'flex';
                precipLabels.style.justifyContent = 'space-between';
                precipLabels.innerHTML = `
                    <span>0 mm</span>
                    <span>1 mm</span>
                    <span>5 mm</span>
                    <span>10 mm</span>
                    <span>20+ mm</span>
                `;
                
                legendContent.appendChild(document.createTextNode('Precipitación (mm/h):'));
                legendContent.appendChild(document.createElement('br'));
                legendContent.appendChild(precipGradient);
                legendContent.appendChild(precipLabels);
                break;
                
            case 'temp':
                // Temperature legend
                const tempGradient = document.createElement('div');
                tempGradient.className = 'legend-gradient';
                tempGradient.style.background = 'linear-gradient(to right, rgba(130,22,146,0.5), rgba(130,87,219,0.5), rgba(32,140,236,0.5), rgba(32,196,232,0.5), rgba(35,221,221,0.5), rgba(194,255,40,0.5), rgba(255,240,40,0.5), rgba(255,194,40,0.5), rgba(252,128,20,0.5))';
                
                const tempLabels = document.createElement('div');
                tempLabels.className = 'legend-labels';
                tempLabels.style.display = 'flex';
                tempLabels.style.justifyContent = 'space-between';
                tempLabels.innerHTML = `
                    <span>-40°C</span>
                    <span>-20°C</span>
                    <span>0°C</span>
                    <span>20°C</span>
                    <span>40°C</span>
                `;
                
                legendContent.appendChild(document.createTextNode('Temperatura:'));
                legendContent.appendChild(document.createElement('br'));
                legendContent.appendChild(tempGradient);
                legendContent.appendChild(tempLabels);
                break;
                
            case 'clouds':
                // Cloud cover legend
                const cloudGradient = document.createElement('div');
                cloudGradient.className = 'legend-gradient';
                cloudGradient.style.background = 'linear-gradient(to right, rgba(255,255,255,0.0), rgba(240,240,240,0.3), rgba(200,200,200,0.5), rgba(150,150,150,0.7), rgba(100,100,100,0.9))';
                
                const cloudLabels = document.createElement('div');
                cloudLabels.className = 'legend-labels';
                cloudLabels.style.display = 'flex';
                cloudLabels.style.justifyContent = 'space-between';
                cloudLabels.innerHTML = `
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                `;
                
                legendContent.appendChild(document.createTextNode('Cobertura de nubes:'));
                legendContent.appendChild(document.createElement('br'));
                legendContent.appendChild(cloudGradient);
                legendContent.appendChild(cloudLabels);
                break;
                
            case 'wind':
                // Wind legend
                const windGradient = document.createElement('div');
                windGradient.className = 'legend-gradient';
                windGradient.style.background = 'linear-gradient(to right, rgba(37,74,255,0.5), rgba(0,140,255,0.5), rgba(0,200,200,0.5), rgba(0,255,0,0.5), rgba(255,255,0,0.5), rgba(255,40,0,0.5), rgba(200,0,0,0.5))';
                
                const windLabels = document.createElement('div');
                windLabels.className = 'legend-labels';
                windLabels.style.display = 'flex';
                windLabels.style.justifyContent = 'space-between';
                windLabels.innerHTML = `
                    <span>1 m/s</span>
                    <span>5 m/s</span>
                    <span>10 m/s</span>
                    <span>20 m/s</span>
                    <span>30+ m/s</span>
                `;
                
                legendContent.appendChild(document.createTextNode('Velocidad del viento:'));
                legendContent.appendChild(document.createElement('br'));
                legendContent.appendChild(windGradient);
                legendContent.appendChild(windLabels);
                break;
        }
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
    
    function clearError() {
        errorMessage.textContent = '';
        errorMessage.classList.add('hidden');
    }
    
    function showLoading() {
        loadingElement.classList.remove('hidden');
        weatherContent.classList.add('hidden');
    }
    
    function hideLoading() {
        loadingElement.classList.add('hidden');
    }
    
    function showWeatherContent() {
        weatherContent.classList.remove('hidden');
    }
});