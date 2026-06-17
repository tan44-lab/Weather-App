const API_KEY = 'e6565153274c7b326562280402f6efa9';

const $ = id => document.getElementById(id);

function iconUrl(code) {
  return `https://openweathermap.org/img/wn/${code}@2x.png`;
}

// Map OpenWeather `main` values to your local filenames (don't rename files)
const localNameMap = {
  Clear: 'clear.png',
  Clouds: 'cloud.png',
  Rain: 'rain.png',
  Drizzle: 'rain.png',
  Thunderstorm: 'rain.png',
  Snow: 'snow.png',
  Haze: 'haze.png',
  Mist: 'haze.png',
  Fog: 'haze.png'
};

function dayName(dt) {
  return new Date(dt * 1000).toLocaleDateString('en', { weekday: 'short' });
}

function setIconWithCandidates(imgEl, candidates, remoteIcon) {
  let i = 0;
  function tryNext() {
    if (i >= candidates.length) {
      imgEl.onerror = null;
      imgEl.src = remoteIcon;
      return;
    }
    imgEl.onerror = () => { i++; tryNext(); };
    imgEl.src = `images/${candidates[i]}`;
  }
  tryNext();
}

function setLoading(on) {
  $('loading').style.display = on ? 'block' : 'none';
  if (on) {
    $('mainCard').style.display = 'none';
    $('errorCard').style.display = 'none';
    $('forecastHeading').style.display = 'none';
    ['fc0', 'fc1', 'fc2'].forEach(id => { $(id).style.display = 'none'; });
  }
}

function showError(msg) {
  $('loading').style.display = 'none';
  $('errorCard').style.display = 'block';
  $('mainCard').style.display = 'none';
  $('forecastHeading').style.display = 'none';
  ['fc0', 'fc1', 'fc2'].forEach(id => { $(id).style.display = 'none'; });
  $('errorMsg').textContent = msg;
}

function renderCurrent(data) {
  $('errorCard').style.display = 'none';
  $('cityName').textContent = `${data.name}, ${data.sys.country}`;
  $('cityDate').textContent = new Date().toLocaleDateString('en', {
    weekday: 'long', month: 'long', day: 'numeric'
  });
  $('tempBig').innerHTML = `${Math.round(data.main.temp)}<sup>°C</sup>`;
  $('descText').textContent = data.weather[0].description;
  $('humVal').textContent = `${data.main.humidity}%`;
  $('windVal').textContent = `${Math.round(data.wind.speed)} km/h`;
  $('feelsVal').textContent = `${Math.round(data.main.feels_like)}°`;
  const mainImg = $('mainIcon');
  const main = data.weather[0].main || '';
  const desc = data.weather[0].description || '';
  const ic = data.weather[0].icon || '';
  const mappedMain = main && localNameMap[main] ? localNameMap[main] : (main ? `${main.toLowerCase().replace(/\s+/g,'-')}.png` : null);
  const candidates = [];
  if (mappedMain) candidates.push(mappedMain);
  if (desc) candidates.push(`${desc.toLowerCase().replace(/\s+/g,'-')}.png`);
  candidates.push(`${ic}.png`);
  setIconWithCandidates(mainImg, candidates, iconUrl(ic));
  $('mainCard').style.display = 'block';
}

function renderForecast(list) {
  const days = {};
  const today = new Date().toDateString();

  list.forEach(item => {
    const key = new Date(item.dt * 1000).toDateString();
    if (key === today) return;
    if (!days[key]) days[key] = { dt: item.dt, temps: [], icons: {}, descs: {}, mains: {} };
    days[key].temps.push(item.main.temp);
    const ic = item.weather[0].icon;
    days[key].icons[ic] = (days[key].icons[ic] || 0) + 1;
    const dc = item.weather[0].description;
    days[key].descs[dc] = (days[key].descs[dc] || 0) + 1;
    const mn = item.weather[0].main;
    days[key].mains[mn] = (days[key].mains[mn] || 0) + 1;
  });

  const keys = Object.keys(days).slice(0, 3);
  $('forecastHeading').style.display = keys.length ? 'block' : 'none';

  keys.forEach((key, i) => {
    const d = days[key];
    const id = `fc${i}`;
    const topIcon = Object.entries(d.icons).sort((a, b) => b[1] - a[1])[0][0];
    const topDesc = Object.entries(d.descs).sort((a, b) => b[1] - a[1])[0][0];
    const topMain = Object.entries(d.mains).length ? Object.entries(d.mains).sort((a,b)=>b[1]-a[1])[0][0] : '';
    $(`${id}day`).textContent = dayName(d.dt);
    const icEl = $(`${id}icon`);
    const fk = topIcon; // icon code
    // try files: mapped main name, full description, then icon code
    const mapped = topMain && localNameMap[topMain] ? localNameMap[topMain] : (topMain ? `${topMain.toLowerCase().replace(/\s+/g,'-')}.png` : null);
    const candidatesFc = [];
    if (mapped) candidatesFc.push(mapped);
    if (topDesc) candidatesFc.push(`${topDesc.toLowerCase().replace(/\s+/g,'-')}.png`);
    candidatesFc.push(`${fk}.png`);
    setIconWithCandidates(icEl, candidatesFc, iconUrl(fk));
    $(`${id}hi`).textContent = `${Math.round(Math.max(...d.temps))}°`;
    $(`${id}lo`).textContent = `${Math.round(Math.min(...d.temps))}°`;
    $(`${id}desc`).textContent = topDesc;
    $(id).style.display = 'block';
  });
}

async function fetchByCity(city) {
  if (!city) return;
  setLoading(true);
  try {
    const [curRes, fcRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`)
    ]);
    const cur = await curRes.json();
    if (!curRes.ok) { showError(cur.message || 'City not found.'); return; }
    const fc = await fcRes.json();
    renderCurrent(cur);
    if (fc.list) renderForecast(fc.list);
  } catch (e) {
    showError('Network error. Check your connection.');
  } finally {
    $('loading').style.display = 'none';
  }
}

async function fetchByCoords(lat, lon) {
  setLoading(true);
  try {
    const [curRes, fcRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`)
    ]);
    const cur = await curRes.json();
    if (!curRes.ok) { showError('Could not get weather for your location.'); return; }
    const fc = await fcRes.json();
    renderCurrent(cur);
    if (fc.list) renderForecast(fc.list);
  } catch (e) {
    showError('Network error. Check your connection.');
  } finally {
    $('loading').style.display = 'none';
  }
}

// Search button
$('searchBtn').addEventListener('click', () => {
  fetchByCity($('cityInput').value.trim());
});

// Enter key
$('cityInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') fetchByCity($('cityInput').value.trim());
});

// Location button
$('locBtn').addEventListener('click', () => {
  if (!navigator.geolocation) { showError('Geolocation not supported by your browser.'); return; }
  setLoading(true);
  navigator.geolocation.getCurrentPosition(
    pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    () => showError('Location access denied. Search manually.')
  );
});

// Auto-detect on load
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    () => {} // silent fail — user can search manually
  );
}