let apiKey = "1e3e8f230b6064d27976e41163a82b77";
let searchinput = document.querySelector(`.searchinput`);
let suggestionsBox = document.querySelector('.suggestions');
let chartContainer = document.querySelector('.chart-container');
let funFactBox = document.querySelector('.fun-fact');
let themeToggle = document.querySelector('.theme-toggle');

// --- City Suggestions using Google Places Autocomplete API ---
let autocompleteService;
let sessionToken;
function loadGoogleMapsScript() {
  if (window.google && window.google.maps) {
    autocompleteService = new google.maps.places.AutocompleteService();
    sessionToken = new google.maps.places.AutocompleteSessionToken();
  } else {
    let script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_API_KEY&libraries=places&callback=initAutocomplete`;
    script.async = true;
    document.body.appendChild(script);
    window.initAutocomplete = function() {
      autocompleteService = new google.maps.places.AutocompleteService();
      sessionToken = new google.maps.places.AutocompleteSessionToken();
    }
  }
}
loadGoogleMapsScript();

searchinput.addEventListener('input', function() {
  let value = searchinput.value.trim();
  if (value.length < 2 || !autocompleteService) {
    suggestionsBox.classList.remove('active');
    suggestionsBox.innerHTML = '';
    return;
  }
  autocompleteService.getPlacePredictions(
    {
      input: value,
      types: ['(cities)'],
      sessionToken: sessionToken
    },
    function(predictions, status) {
      if (status !== 'OK' || !predictions) {
        suggestionsBox.classList.remove('active');
        suggestionsBox.innerHTML = '';
        return;
      }
      suggestionsBox.innerHTML = '';
      predictions.forEach(pred => {
        let li = document.createElement('li');
        li.textContent = pred.description;
        li.addEventListener('click', function() {
          searchinput.value = pred.description;
          suggestionsBox.classList.remove('active');
          suggestionsBox.innerHTML = '';
          searchByCity(pred.description);
        });
        suggestionsBox.appendChild(li);
      });
      suggestionsBox.classList.add('active');
    }
  );
});
document.addEventListener('click', function(e) {
  if (!suggestionsBox.contains(e.target) && e.target !== searchinput) {
    suggestionsBox.classList.remove('active');
  }
});

// --- Weather Search and 5-Day Forecast ---
async function searchByCity(city) {
  // Split city, state, country if possible
  let [cityName, state, country] = city.split(',').map(s => s.trim());
  await search(cityName, state || '', country || '');
}

async function search(city, state, country) {
  let url = await fetch(`https://api.openweathermap.org/data/2.5/weather?units=metric&q=${city},${state},${country}&appid=${apiKey}`);
  if (url.ok) {
    let data = await url.json();
    // ...existing code for displaying current weather...
    let box = document.querySelector(".return");
    box.style.display = "block";
    let message = document.querySelector(".message");
    message.style.display = "none";
    let errormessage = document.querySelector(".error-message");
    errormessage.style.display = "none";
    let weatherImg = document.querySelector(".weather-img");
    document.querySelector(".city-name").innerHTML = data.name;
    document.querySelector(".weather-temp").innerHTML = Math.floor(data.main.temp) + '°';
    document.querySelector(".wind").innerHTML = Math.floor(data.wind.speed) + " m/s";
    document.querySelector(".pressure").innerHTML = Math.floor(data.main.pressure) + " hPa";
    document.querySelector('.humidity').innerHTML = Math.floor(data.main.humidity)+ "%";
    document.querySelector(".sunrise").innerHTML =  new Date(data.sys.sunrise * 1000).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    document.querySelector(".sunset").innerHTML =  new Date(data.sys.sunset * 1000).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    if (data.weather[0].main === "Rain") {
      weatherImg.src = "img/rain.png";
    } else if (data.weather[0].main === "Clear") {
      weatherImg.src = "img/sun.png";
    } else if (data.weather[0].main === "Snow") {
      weatherImg.src = "img/snow.png";
    } else if (
      data.weather[0].main === "Clouds" ||
      data.weather[0].main === "Smoke"
    ) {
      weatherImg.src = "img/cloud.png";
    } else if (
      data.weather[0].main === "Mist" ||
      data.weather[0].main === "Fog"
    ) {
      weatherImg.src = "img/mist.png";
    } else if (data.weather[0].main === "Haze") {
      weatherImg.src = "img/haze.png";
    } else if (data.weather[0].main === "Thunderstorm") {
      weatherImg.src = "img/thunderstorm.png";
    }
    // Show chart and fun fact
    chartContainer.style.display = "block";
    funFactBox.style.display = "block";
    // Fetch and display 5-day forecast
    fetchForecast(data.name);
    // Show fun fact
    showFunFact();
  } else {
    let box = document.querySelector(".return");
    box.style.display = "none";
    let message = document.querySelector(".message");
    message.style.display = "none";
    let errormessage = document.querySelector(".error-message");
    errormessage.style.display = "block";
    chartContainer.style.display = "none";
    funFactBox.style.display = "none";
  }
}

searchinput.addEventListener('keydown', function(event) {
  if (event.keyCode === 13 || event.which === 13) {
    searchByCity(searchinput.value);
  }
});

// --- 5-Day Forecast Chart ---
async function fetchForecast(city) {
  let url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
  let res = await fetch(url);
  if (!res.ok) return;
  let data = await res.json();
  // Group by day
  let daily = {};
  data.list.forEach(item => {
    let date = item.dt_txt.split(' ')[0];
    if (!daily[date]) daily[date] = [];
    daily[date].push(item);
  });
  let labels = [];
  let temps = [];
  let count = 0;
  for (let date in daily) {
    if (count >= 5) break;
    let avgTemp = daily[date].reduce((sum, i) => sum + i.main.temp, 0) / daily[date].length;
    labels.push(new Date(date).toLocaleDateString(undefined, { weekday: 'short' }));
    temps.push(Math.round(avgTemp));
    count++;
  }
  renderChart(labels, temps);
}

let forecastChart;
function renderChart(labels, temps) {
  let ctx = document.getElementById('forecastChart').getContext('2d');
  if (forecastChart) forecastChart.destroy();
  forecastChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Avg Temp (°C)',
        data: temps,
        borderColor: '#332464',
        backgroundColor: 'rgba(51,36,100,0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// --- Theme Toggle ---
themeToggle.addEventListener('click', function() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
});
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
}

// --- Geolocation to auto-detect user’s location ---
function getLocationWeather() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(async pos => {
    let lat = pos.coords.latitude, lon = pos.coords.longitude;
    let geoUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
    let geoRes = await fetch(geoUrl);
    let geoData = await geoRes.json();
    if (geoData && geoData[0] && geoData[0].name) {
      searchByCity(geoData[0].name);
    }
  });
}
// Auto-detect on load
window.addEventListener('DOMContentLoaded', getLocationWeather);

// --- Weather-related fun facts ---
const funFacts = [
  "Did you know? The highest temperature ever recorded on Earth was 56.7°C (134°F) in Death Valley, USA.",
  "Raindrops can fall at speeds of about 22 miles per hour.",
  "Snowflakes always have six sides.",
  "The coldest temperature ever recorded was -89.2°C (-128.6°F) in Antarctica.",
  "A bolt of lightning is five times hotter than the surface of the sun.",
  "The wettest place on Earth is Mawsynram, India.",
  "Hurricanes can release energy equivalent to 10 atomic bombs per second.",
  "The fastest wind speed ever recorded was 253 mph during Tropical Cyclone Olivia."
];
function showFunFact() {
  let fact = funFacts[Math.floor(Math.random() * funFacts.length)];
  funFactBox.textContent = fact;
}

// --- END ---