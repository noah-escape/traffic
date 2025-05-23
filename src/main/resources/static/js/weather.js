let map;
let currentMarker = null;

document.addEventListener("DOMContentLoaded", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError);
  } else {
    alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
    showFallback("위치 정보 없음");
  }
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

function updateMapAndWeather(lat, lon) {
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
      renderHourlyForecast(data.daily);
      renderDailyForecast(data.daily);

      const items = data.current?.response?.body?.items?.item ?? [];
      // console.log("🌤️ 현재 날씨 items", items);

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
  document.getElementById("weather-rain").textContent = rain !== null && rain !== "0" ? `${rain} mm` : "- mm";
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
    const key = `${item.fcstDate} ${item.fcstTime}`;
    if (!grouped[key]) grouped[key] = {};
    grouped[key][item.category] = item.fcstValue;
  });

  Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([time, values]) => {
      const hour = time.slice(-4, -2); // ex: "0800" -> "08"
      const icon = getWeatherIcon(values);
      const windDir = degToDir(values.VEC);
      const windDesc = values.WSD ? `${windDir} 약` : "-";

      const html = `
        <div class="weather-hour">
          <div class="time">${hour}시</div>
          <div class="icon">${icon}</div>
          <div class="temp">${values.TMP ?? "--"}℃</div>
          <div class="rain">${values.POP ?? "--"}%</div>
          <div class="wind">${windDesc}</div>
        </div>`;
      container.insertAdjacentHTML('beforeend', html);
    });
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
