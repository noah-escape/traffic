let map;
let currentMarker = null;

document.addEventListener("DOMContentLoaded", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError);
  } else {
    alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
    showFallback("위치 정보 없음");
  }

  let locationData = [];

  fetch('/json/weather.json') // 경로 확인!
    .then(res => res.json())
    .then(data => locationData = data);

  const input = document.getElementById("locationSearch");
  const list = document.getElementById("autocompleteList");

  input.addEventListener("input", () => {
    const keyword = input.value.trim();
    list.innerHTML = "";
    if (keyword.length < 1) {
      list.style.display = "none";
      return;
    }

    const matches = locationData.filter(loc => loc.name.includes(keyword)).slice(0, 10);
    if (matches.length === 0) {
      list.style.display = "none";
      return;
    }

    matches.forEach(loc => {
      const li = document.createElement("li");
      li.className = "list-group-item autocomplete-item";
      li.textContent = loc.name;
      li.addEventListener("click", () => {
        input.value = loc.name;
        list.innerHTML = "";
        list.style.display = "none";
        updateMapAndWeather(loc.lat, loc.lon);
      });
      list.appendChild(li);
    });

    list.style.display = "block";
  });

  document.getElementById("searchBtn").addEventListener("click", () => {
    const keyword = input.value.trim();
    const found = locationData.find(loc => loc.name === keyword);
    if (found) {
      updateMapAndWeather(found.lat, found.lon);
    } else {
      alert("해당 지역을 찾을 수 없습니다.");
    }
  });



});

function onLocationSuccess(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(lat, lon),
    zoom: 5
  });

  currentMarker = new naver.maps.Marker({
    position: new naver.maps.LatLng(lat, lon),
    map: map,
    title: "현재 위치"
  });

  naver.maps.Event.addListener(map, 'click', function (e) {
    const lat = e.coord.lat();
    const lon = e.coord.lng();
    updateMapAndWeather(lat, lon);
  });

  updateMapAndWeather(lat, lon);
}

function onLocationError(error) {
  console.error("❌ 위치 정보 에러:", error);
  showFallback("위치 정보 없음");
}

function showLoading() {
  const loading = document.getElementById("weather-loading");
  loading.classList.add("show");
}

function hideLoading() {
  const loading = document.getElementById("weather-loading");
  loading.classList.remove("show");
}

function updateMapAndWeather(lat, lon) {
  showLoading();
  const position = new naver.maps.LatLng(lat, lon);
  if (map) {
    if (currentMarker) {
      currentMarker.setMap(null);
    }

    currentMarker = new naver.maps.Marker({
      position,
      map,
      title: "선택 위치"
    });
  }

  fetch(`/api/weather/full?lat=${lat}&lon=${lon}`)
    .then(response => response.json())
    .then(data => {
      console.log("✅ 날씨 응답", data);
      renderHourlyForecast(data.daily);
      renderDailyForecast(data.daily);

      const items = data.current?.response?.body?.items?.item ?? [];
      updateWeatherCard({
        temp: safeFindValue(items, "T1H"),
        humidity: safeFindValue(items, "REH"),
        wind: safeFindValue(items, "WSD"),
        windDeg: safeFindValue(items, "VEC"),
        pty: safeFindValue(items, "PTY"),
        sky: safeFindValue(items, "SKY"),
        rain: safeFindValue(items, "RN1")
      });

      updateWeatherTime(items[0]?.baseDate, items[0]?.baseTime);
    })
    .catch(error => {
      console.error('🌩️ 날씨 불러오기 실패:', error);
      showFallback("날씨 정보 없음");
    })
    .finally(() => {
      hideLoading(); // ✅ 마지막에 숨기기
    });
}

function safeFindValue(items, category) {
  const item = items.find(i => i.category === category);
  return item?.obsrValue ?? null;
}

function updateWeatherTime(baseDate, baseTime) {
  if (!baseDate || !baseTime) return;

  const dateStr = baseDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
  const date = new Date(dateStr);
  const formattedDate = date.toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  }).replace(/\./g, '').replace(' ', '. ');

  const hour = parseInt(baseTime.substring(0, 2));
  const minute = parseInt(baseTime.substring(2));
  const dateObj = new Date();
  dateObj.setHours(hour, minute);
  const formattedTime = dateObj.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) + " 기준 데이터";

  document.getElementById("weather-date").textContent = formattedDate;
  document.getElementById("weather-time").textContent = formattedTime;
}

function updateWeatherCard(data) {
  const { temp, humidity, wind, windDeg, pty, sky, rain } = data;
  const feelsLike = estimateFeelsLike(temp, humidity, wind);

  document.getElementById("weather-temp").textContent = temp !== null ? `${temp}°C` : "--°C";
  document.getElementById("feels-like").textContent = feelsLike !== null ? `${feelsLike}°C` : "--°C";
  document.getElementById("weather-humidity").textContent = humidity !== null ? `${humidity}%` : "--%";
  document.getElementById("weather-wind").textContent = wind !== null ? `${wind} m/s` : "--";
  document.getElementById("weather-wind-dir").textContent = windDeg !== null ? degToDir(windDeg) : "--";
  document.getElementById("weather-rain").textContent = rain !== null && rain !== "0" ? `${rain} mm` : "0 mm";
}

function estimateFeelsLike(temp, humidity, wind) {
  if (!temp || !humidity || !wind) return null;
  return (parseFloat(temp) + parseFloat(humidity) * 0.05 - parseFloat(wind) * 0.3).toFixed(1);
}

function degToDir(deg) {
  const dirs = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동',
    '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];
  const index = Math.round(deg / 22.5) % 16;
  return dirs[index];
}

function getWindArrow8Dir(deg) {
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  const index = Math.round(deg / 45) % 8;
  return arrows[index]; // ✅ 화살표만 반환
}

function getWindStrengthDesc(speed) {
  const w = parseFloat(speed);
  if (isNaN(w)) return "-";
  if (w < 3.4) return "약";
  if (w < 6.7) return "보통";
  return "강";
}

function showFallback(message = "날씨 정보 없음") {
  document.getElementById("weather-temp").textContent = "--°C";
  document.getElementById("feels-like").textContent = "--°C";
  document.getElementById("weather-humidity").textContent = "--%";
  document.getElementById("weather-wind").textContent = "--";
  document.getElementById("weather-wind-dir").textContent = "--";
  document.getElementById("weather-rain").textContent = "- mm";
}

function renderDailyForecast(dailyData) {
  const tbody = document.querySelector('#daily-forecast-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const items = dailyData?.response?.body?.items?.item ?? [];
  const grouped = {};

  items.forEach(item => {
    const date = item.fcstDate;
    if (!grouped[date]) grouped[date] = {};
    grouped[date][item.category] = item.fcstValue;
  });

  Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([fcstDate, values]) => {
      const row = `<tr>
        <td>${fcstDate}</td>
        <td>${values.TMN ?? '-'}</td>
        <td>${values.TMX ?? '-'}</td>
        <td>${getWeatherDesc(values)}</td>
      </tr>`;
      tbody.insertAdjacentHTML('beforeend', row);
    });
}

function getWeatherDesc(values) {
  const sky = values.SKY;
  const pty = values.PTY;
  if (pty && pty !== "0") return "비";
  if (sky === "1") return "맑음";
  if (sky === "3") return "구름 많음";
  if (sky === "4") return "흐림";
  return "-";
}

function renderHourlyForecast(forecastData) {
  const container = document.querySelector('.weather-scroll');
  if (!container) return;
  container.innerHTML = '';

  const items = forecastData?.response?.body?.items?.item ?? [];
  const grouped = {};

  items.forEach(item => {
    const date = item.fcstDate;
    const time = item.fcstTime;
    if (!grouped[date]) grouped[date] = {};
    if (!grouped[date][time]) grouped[date][time] = {};
    grouped[date][time][item.category] = item.fcstValue;
  });

  Object.entries(grouped).sort().forEach(([date, timeGroup]) => {
    const block = document.createElement('div');
    block.className = 'weather-date-block';

    const label = document.createElement('div');
    label.className = 'weather-date-label';
    label.textContent = formatDateToKorean(date);

    const row = document.createElement('div');
    row.className = 'weather-hour-row';

    Object.entries(timeGroup).sort().forEach(([time, values]) => {
      const hour = time.slice(0, 2);
      const icon = getWeatherIcon(values);

      let windHTML = "-";
      if (values.VEC && values.WSD) {
        const arrow = getWindArrow8Dir(parseFloat(values.VEC));
        const strength = getWindStrengthDesc(values.WSD);
        windHTML = `
          <div class="text-center">
            <div style="font-size: 1.25rem;">${arrow}</div>
            <div class="small text-muted">${strength} (${parseFloat(values.WSD).toFixed(1)} m/s)</div>
          </div>
        `;
      }

      const card = document.createElement('div');
      card.className = 'weather-hour';
      card.innerHTML = `
        <div class="time">${hour}시</div>
        <div class="icon">${icon}</div>
        <div class="temp">${values.TMP ?? "--"}℃</div>
        <div class="rain">${values.POP ?? "--"}%</div>
        <div class="wind">${windHTML}</div>
      `;
      row.appendChild(card);
    });

    block.appendChild(label);
    block.appendChild(row);
    container.appendChild(block);
  });
}

function formatDateToKorean(dateStr) {
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  const date = new Date(`${y}-${m}-${d}`);
  const day = date.toLocaleDateString('ko-KR', { weekday: 'short' });
  return `${parseInt(m)}월 ${parseInt(d)}일 (${day})`;
}

function getWeatherIcon(values) {
  const pty = values.PTY;
  const sky = values.SKY;
  if (pty && pty !== "0") return "🌧️";
  if (sky === "1") return "☀️";
  if (sky === "3") return "⛅";
  if (sky === "4") return "☁️";
  return "❓";
}
