document.addEventListener("DOMContentLoaded", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError);
  } else {
    alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
  }
});

function onLocationSuccess(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  // ✅ 지도 표시
  const map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(lat, lon),
    zoom: 5
  });

  new naver.maps.Marker({
    position: new naver.maps.LatLng(lat, lon),
    map: map,
    title: "현재 위치"
  });

  // ✅ 날씨 API 호출
  fetch(`/api/proxy/kma-weather?lat=${lat}&lon=${lon}`)
    .then(res => res.text())
    .then(raw => {
      try {
        const data = JSON.parse(raw);
        const items = data.response?.body?.items?.item ?? [];

        const temp = safeFindValue(items, "T1H");        // 기온
        const humidity = safeFindValue(items, "REH");    // 습도
        const wind = safeFindValue(items, "WSD");        // 풍속
        const windDeg = safeFindValue(items, "VEC");     // 풍향
        const pty = safeFindValue(items, "PTY");         // 강수형태
        const sky = safeFindValue(items, "SKY");         // 하늘상태
        const rain = safeFindValue(items, "RN1");        // 1시간 강수량

        updateWeatherCard({
          temp,
          humidity,
          wind,
          windDeg,
          pty,
          sky,
          rain
        });

        const baseDate = items[0]?.baseDate;
        const baseTime = items[0]?.baseTime;
        updateWeatherTime(baseDate, baseTime);

      } catch (err) {
        console.error("❌ JSON 파싱 실패:", raw);
        showFallback("날씨 응답 오류");
      }
    });
}

function onLocationError(error) {
  console.error("❌ 위치 정보를 가져올 수 없습니다.", error);
  showFallback("위치 정보 없음");
}

function safeFindValue(items, category) {
  const item = items.find(i => i.category === category);
  return item?.obsrValue ?? null;
}

function updateWeatherTime(baseDate, baseTime) {
  // 날짜 포맷: 20250520 → 05.20. (화)
  const dateStr = baseDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
  const date = new Date(dateStr);
  const formattedDate = date.toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  }).replace(/\./g, '').replace(' ', '. '); // → 05.20. (화)

  // 시간 포맷: 1800 → 오후 6:00 기준
  const hour = parseInt(baseTime.substring(0, 2));
  const minute = parseInt(baseTime.substring(2));
  const dateObj = new Date();
  dateObj.setHours(hour, minute);
  const formattedTime = dateObj.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) + " 기준 데이터";

  // 화면에 출력
  document.getElementById("weather-date").textContent = formattedDate;
  document.getElementById("weather-time").textContent = formattedTime;
}

function updateWeatherCard(data) {
  const { temp, humidity, wind, windDeg, pty, sky, rain } = data;

  const feelsLike = estimateFeelsLike(temp, humidity, wind);

  document.getElementById("weather-temp").textContent = temp !== null ? `${temp}°C` : "--°C";
  document.getElementById("feels-like").textContent = feelsLike !== null ? `${feelsLike}°C` : "--°C";
  document.getElementById("weather-humidity").textContent = humidity !== null ? `${humidity}%` : "--%";

  const windText = wind !== null ? `${wind} m/s` : "-- m/s";
  const windDir = windDeg !== null ? ` ${degToDir(windDeg)}` : "";
  document.getElementById("weather-wind").textContent = wind !== null ? `${wind} m/s` : "--";
  document.getElementById("weather-wind-dir").textContent = windDeg !== null ? degToDir(windDeg) : "--";


  document.getElementById("weather-rain").textContent =
    rain !== null && rain !== "0" ? `${rain} mm` : "- mm";
}

function estimateFeelsLike(temp, humidity, wind) {
  if (!temp || !humidity || !wind) return null;
  return (parseFloat(temp) + parseFloat(humidity) * 0.05 - parseFloat(wind) * 0.3).toFixed(1);
}

function getWeatherDescription(pty, sky) {
  if (pty === "0") {
    switch (sky) {
      case "1": return "맑음";
      case "3": return "구름 많음";
      case "4": return "흐림";
      default: return "알 수 없음";
    }
  }
  switch (pty) {
    case "1": return "비";
    case "2": return "비/눈";
    case "3": return "눈";
    case "4": return "소나기";
    default: return "강수정보 없음";
  }
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
  document.getElementById("weather-wind").textContent = "-- m/s";
  document.getElementById("weather-rain").textContent = "- mm";
}
