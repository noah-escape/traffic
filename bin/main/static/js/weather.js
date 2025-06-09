let map;
let currentMarker = null;
let locationData = [];
<<<<<<< HEAD
let holidayDates = [];
let currentAstroMode = 'sun'; // 🌞 or 🌙
let currentAstroData = null;

const EARTH_RADIUS_KM = 6371;

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = angle => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

document.addEventListener("DOMContentLoaded", async () => {
  await initLocationData();
  await fetchHolidayDates();

  // ✅ 무조건 맨 먼저 지도 생성
  map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(36.5, 127.8), // 대한민국 중심
    zoom: 6
  });

  // ✅ 위치 정보 요청
=======

document.addEventListener("DOMContentLoaded", async () => {
  // 1. 지역 데이터 먼저 로드
  await initLocationData();

  // 2. 위치 가져오기 → 지역 데이터 로드 이후에 실행돼야 함
>>>>>>> develop
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError);
  } else {
    alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
    showFallback("위치 정보 없음");
  }

<<<<<<< HEAD
  // 나머지 초기화 코드들은 그대로 유지
  initLocationSearchEvents();

  // ✅ 4. 대기질 이모지 설명 toggle
=======
  // 3. 검색 이벤트 등록
  initLocationSearchEvents();

>>>>>>> develop
  const toggleBtn = document.getElementById("emojiInfoToggle");
  const card = document.getElementById("emojiInfoCard");
  const closeBtn = document.getElementById("emojiInfoClose");

  toggleBtn.addEventListener("click", () => {
    card.style.display = (card.style.display === "none") ? "block" : "none";
  });

  closeBtn.addEventListener("click", () => {
    card.style.display = "none";
  });

  document.addEventListener("click", (event) => {
    if (!card.contains(event.target) && !toggleBtn.contains(event.target)) {
      card.style.display = "none";
    }
  });
<<<<<<< HEAD

  // ✅ 5. 드래그 스크롤 초기화
  const scrollContainers = document.querySelectorAll('.draggable-scroll');
  scrollContainers.forEach(container => {
    let isDown = false;
    let startX;
    let scrollLeft;

    container.addEventListener('mousedown', e => {
      isDown = true;
      container.classList.add('scrolling');
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });

    container.addEventListener('mouseleave', () => {
      isDown = false;
      container.classList.remove('scrolling');
    });

    container.addEventListener('mouseup', () => {
      isDown = false;
      container.classList.remove('scrolling');
    });

    container.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      container.scrollLeft = scrollLeft - walk;
    });
  });

  // ✅ 자동완성 닫기 (외부 클릭 시)
  document.addEventListener("click", function (e) {
    const input = document.getElementById("locationSearch");
    const list = document.getElementById("autocompleteList");
    const clearBtn = document.getElementById("clearInputBtn");

    if (!input.contains(e.target) && !list.contains(e.target) && !clearBtn.contains(e.target)) {
      list.style.display = "none";
    }
  });

  // ✅ Astro toggle button
  const astroToggleBtn = document.getElementById("astroToggleBtn");
  astroToggleBtn?.addEventListener("click", () => {
    currentAstroMode = currentAstroMode === "sun" ? "moon" : "sun";
    updateAstroDisplay(currentAstroData);
  });
=======
>>>>>>> develop
});

// ✅ 1. 지역 데이터 안전하게 불러오기
async function initLocationData() {
  try {
    const res = await fetch('/json/weather.json');
    locationData = await res.json();
<<<<<<< HEAD
    // console.log("✅ 지역 데이터 로드 완료", locationData.length);
=======
    console.log("✅ 지역 데이터 로드 완료", locationData.length);
>>>>>>> develop
  } catch (error) {
    console.error("❌ 지역 데이터 로드 실패", error);
    alert("지역 데이터 로딩에 실패했습니다.");
  }
}

// ✅ 2. 검색 입력 및 자동완성 처리
function initLocationSearchEvents() {
  const input = document.getElementById("locationSearch");
  const list = document.getElementById("autocompleteList");
<<<<<<< HEAD
  const clearBtn = document.getElementById("clearInputBtn");
  let currentIndex = -1;
=======
>>>>>>> develop

  input.addEventListener("input", () => {
    const keyword = input.value.trim();
    list.innerHTML = "";
<<<<<<< HEAD
    currentIndex = -1; // 방향키 탐색 초기화

    // X 버튼 표시 여부
    clearBtn.classList.toggle("d-none", keyword.length === 0);
    if (keyword.length === 0) {
=======

    if (keyword.length < 1) {
>>>>>>> develop
      list.style.display = "none";
      return;
    }

<<<<<<< HEAD
    const matches = locationData.filter(loc => loc.name.includes(keyword));
=======
    const matches = locationData.filter(loc => loc.name.includes(keyword)).slice(0, 10);
>>>>>>> develop
    if (matches.length === 0) {
      list.style.display = "none";
      return;
    }

    matches.forEach(loc => {
      const li = document.createElement("li");
      li.className = "list-group-item autocomplete-item";
<<<<<<< HEAD
      const regex = new RegExp(`(${keyword})`, 'gi');
      li.innerHTML = loc.name.replace(regex, '<span class="text-primary">$1</span>');

      li.addEventListener("click", () => {
        input.value = "";
        list.innerHTML = "";
        list.style.display = "none";
        clearBtn.classList.add("d-none");
=======
      li.textContent = loc.name;
      li.addEventListener("click", () => {
        input.value = loc.name;
        list.innerHTML = "";
        list.style.display = "none";
>>>>>>> develop
        updateMapAndWeather(loc.lat, loc.lon);
      });
      list.appendChild(li);
    });

    list.style.display = "block";
  });

<<<<<<< HEAD
  // 키보드 탐색 및 Enter 처리
  input.addEventListener("keydown", (e) => {
    const items = list.querySelectorAll(".autocomplete-item");
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      currentIndex = (currentIndex + 1) % items.length;
      updateActiveItem(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      currentIndex = (currentIndex - 1 + items.length) % items.length;
      updateActiveItem(items);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (currentIndex >= 0 && currentIndex < items.length) {
        items[currentIndex].click(); // 선택 항목 클릭
      } else {
        document.getElementById("searchBtn").click(); // 일반 검색 실행
      }
    }
  });

  function updateActiveItem(items) {
    items.forEach((item, idx) => {
      if (idx === currentIndex) {
        item.classList.add("active");
        item.scrollIntoView({
          block: "nearest",
          behavior: "smooth"
        });
      } else {
        item.classList.remove("active");
      }
    });
  }

  // 검색 버튼 클릭
=======
>>>>>>> develop
  document.getElementById("searchBtn").addEventListener("click", () => {
    const keyword = input.value.trim();
    const found = locationData.find(loc => loc.name === keyword);
    if (found) {
      updateMapAndWeather(found.lat, found.lon);
<<<<<<< HEAD
      input.value = "";
      list.innerHTML = "";
      list.style.display = "none";
      clearBtn.classList.add("d-none");
=======
>>>>>>> develop
    } else {
      alert("해당 지역을 찾을 수 없습니다.");
    }
  });
<<<<<<< HEAD

  // X 아이콘 클릭 → 초기화
  clearBtn.addEventListener("click", () => {
    input.value = "";
    list.innerHTML = "";
    list.style.display = "none";
    clearBtn.classList.add("d-none");
    input.focus();
  });
}

function syncHeights() {
  const left = document.querySelector('.left-wrapper');
  const right = document.querySelector('.right-wrapper');
  if (!left || !right) return;

  left.style.height = `${right.offsetHeight}px`;
}

window.addEventListener("load", syncHeights);
window.addEventListener("resize", syncHeights);
setTimeout(syncHeights, 1000);

=======
}

>>>>>>> develop
function onLocationSuccess(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

<<<<<<< HEAD
  const KOREA_BOUNDS = new naver.maps.LatLngBounds(
    new naver.maps.LatLng(32.5, 124.5),
    new naver.maps.LatLng(39.6, 132.0)
  );

  function setMapCursor(cursorStyle) {
    const mapCanvas = document.querySelector('#map > div');
    if (mapCanvas) {
      mapCanvas.style.cursor = cursorStyle;
    }
  }

  function isCloseToAnyRegisteredLocation(lat, lon, maxDistanceKm = 25) {
    return locationData.some(loc => {
      const distance = haversineDistance(lat, lon, loc.lat, loc.lon);
      return distance <= maxDistanceKm;
    });
  }

  naver.maps.Event.addListener(map, 'mousemove', function (e) {
    const lat = e.coord.lat();
    const lon = e.coord.lng();
    const inside = KOREA_BOUNDS.hasLatLng(e.coord);
    const nearValid = isCloseToAnyRegisteredLocation(lat, lon);

    setMapCursor((inside && nearValid) ? 'pointer' : 'not-allowed');
  });

  naver.maps.Event.addListener(map, 'click', function (e) {
    const lat = e.coord.lat();
    const lon = e.coord.lng();
    const inside = KOREA_BOUNDS.hasLatLng(e.coord);
    const nearValid = isCloseToAnyRegisteredLocation(lat, lon);

    if (!inside || !nearValid) return;
    updateMapAndWeather(lat, lon);
=======
  map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(lat, lon),
    zoom: 5
>>>>>>> develop
  });

  currentMarker = new naver.maps.Marker({
    position: new naver.maps.LatLng(lat, lon),
    map: map,
    title: "현재 위치"
  });

<<<<<<< HEAD
  updateMapAndWeather(lat, lon, false);
=======
  naver.maps.Event.addListener(map, 'click', function (e) {
    const lat = e.coord.lat();
    const lon = e.coord.lng();
    updateMapAndWeather(lat, lon);
  });

  updateMapAndWeather(lat, lon);
>>>>>>> develop
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

<<<<<<< HEAD
function extractTomorrowFromHourly(daily) {
  const items = daily?.response?.body?.items?.item ?? [];
  const now = new Date();
  const tomorrowStr = new Date(now.setDate(now.getDate() + 1)).toISOString().slice(0, 10).replace(/-/g, '');

  const amHours = ["0600", "0900", "1200"];
  const pmHours = ["1500", "1800", "2100"];

  const amItems = items.filter(i => i.fcstDate === tomorrowStr && amHours.includes(i.fcstTime));
  const pmItems = items.filter(i => i.fcstDate === tomorrowStr && pmHours.includes(i.fcstTime));

  function avg(category, list) {
    const nums = list
      .filter(i => i.category === category)
      .map(i => parseFloat(i.fcstValue))
      .filter(v => !isNaN(v) && v > -50 && v < 50); // ✔️ 이 범위로 걸러줘야 함
    return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : "--";
  }

  function mode(category, list) {
    const values = list.filter(i => i.category === category).map(i => i.fcstValue);
    return values.length ? values.sort((a, b) =>
      values.filter(v => v === a).length - values.filter(v => v === b).length).pop() : "";
  }

  return {
    min: avg("TMP", amItems),
    max: avg("TMP", pmItems),
    wfAm: mode("SKY", amItems),
    wfPm: mode("SKY", pmItems),
    rainAm: mode("POP", amItems),
    rainPm: mode("POP", pmItems)
  };
}

function updateMapAndWeather(lat, lon, zoomChange = true) {
  showLoading();

  loadAirQuality(lat, lon);
  fetchAstroInfo(lat, lon);
  fetchWeatherAlerts();

  const position = new naver.maps.LatLng(lat, lon);
  if (map) {
    if (zoomChange) {
      map.setCenter(position);  // 줌 바꿀 때만 center도 같이!
      map.setZoom(9);
    }

=======
function updateMapAndWeather(lat, lon) {
  showLoading();

  console.log("📍 선택된 위치:", lat, lon); // ✅ 지역명 대신 좌표 출력
  loadAirQuality(lat, lon); // ✅ 이제 진짜 좌표로 API 호출

  const position = new naver.maps.LatLng(lat, lon);
  if (map) {
>>>>>>> develop
    if (currentMarker) {
      currentMarker.setMap(null);
    }

    currentMarker = new naver.maps.Marker({
      position,
      map,
<<<<<<< HEAD
      icon: {
        url: '/image/weather/marker.png',
        size: new naver.maps.Size(24, 24),
        origin: new naver.maps.Point(0, 0),
        anchor: new naver.maps.Point(12, 24)
      },
=======
>>>>>>> develop
      title: "선택 위치"
    });
  }

<<<<<<< HEAD
  const regionName = getNearestRegionName(lat, lon);
  document.getElementById("selected-location").textContent = `선택한 위치: ${regionName}`;

  fetch(`/api/weather/full?lat=${lat}&lon=${lon}`)
    .then(response => response.json())
    .then(data => {
      // console.log("✅ 날씨 응답", data);
      renderHourlyForecastSimple(data.daily);
      renderCompactDailyForecast(data.middleTa, data.middleLand, holidayDates, extractTomorrowFromHourly(data.daily));
=======
  fetch(`/api/weather/full?lat=${lat}&lon=${lon}`)
    .then(response => response.json())
    .then(data => {
      console.log("✅ 날씨 응답", data);
      renderHourlyForecastSimple(data.daily);
      renderCompactDailyForecast(data.middleTa, data.middleLand);
>>>>>>> develop

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
      hideLoading();
    });
}

<<<<<<< HEAD
function fetchAstroInfo(lat, lon) {
  fetch(`/api/weather/astro?lat=${lat}&lon=${lon}`)
    .then(res => res.json())
    .then(data => {
      currentAstroData = data;

      const now = new Date();
      const { h: riseH, m: riseM } = parseTimeStr(data.sunrise);
      const { h: setH, m: setM } = parseTimeStr(data.sunset);

      if (!isNaN(riseH) && !isNaN(setH)) {
        const riseDate = new Date();
        riseDate.setHours(riseH, riseM, 0);
        riseDate.setSeconds(0);

        const setDate = new Date();
        setDate.setHours(setH, setM, 0);
        setDate.setSeconds(0);

        // 해가 떠있는 시간: 일출 <= 현재 < 일몰
        if (now >= riseDate && now < setDate) {
          currentAstroMode = "sun";
        } else {
          currentAstroMode = "moon";
        }
      }

      startAstroUpdater(data);
    });
}

let astroInterval;

function parseTimeStr(raw) {
  if (typeof raw === "string") {
    const str = raw.trim().replace(":", "").padStart(4, "0");
    const h = parseInt(str.slice(0, 2), 10);
    const m = parseInt(str.slice(2, 4), 10);
    if (!isNaN(h) && !isNaN(m)) return { h, m };
  }
  return { h: NaN, m: NaN };
}

function formatTimeString(timeStr) {
  if (!timeStr) return "--:--";
  const str = timeStr.trim().replace(":", "").padStart(4, "0");
  if (!/^\d{4}$/.test(str)) return "--:--";
  return str.slice(0, 2) + ":" + str.slice(2);
}

function getMoonPhaseByDate(date) {
  const synodicMonth = 29.53058867;
  const newMoon = new Date(Date.UTC(2000, 0, 6, 18, 14)); // 기준 신월 날짜

  const days = (date - newMoon) / (1000 * 60 * 60 * 24);
  const age = (days % synodicMonth + synodicMonth) % synodicMonth;

  if (age < 1.84566) return "신월";
  if (age < 5.53699) return "초승달";
  if (age < 9.22831) return "상현달";
  if (age < 12.91963) return "상현망";
  if (age < 16.61096) return "보름달";
  if (age < 20.30228) return "하현망";
  if (age < 23.99361) return "하현달";
  if (age < 27.68493) return "그믐달";
  return "신월";
}

function updateAstroDisplay(data) {
  if (!data) return;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;

  const isSun = currentAstroMode === "sun";
  const riseRaw = isSun ? data.sunrise : data.moonrise;
  const setRaw = isSun ? data.sunset : data.moonset;

  // console.log("🌄 Astro raw values:", { riseRaw, setRaw });

  const rise = formatTimeString(riseRaw);
  const set = formatTimeString(setRaw);

  const { h: riseH, m: riseM } = parseTimeStr(riseRaw);
  const { h: setH, m: setM } = parseTimeStr(setRaw);

  // 기본 UI 설정
  document.getElementById("astro-title").textContent = isSun ? "일출/일몰" : "월출/월몰";
  document.getElementById("astro-rise-label").textContent = isSun ? "일출" : "월출";
  document.getElementById("astro-set-label").textContent = isSun ? "일몰" : "월몰";
  document.getElementById("astro-rise").textContent = rise;
  document.getElementById("astro-set").textContent = set;

  if (rise === "--:--" || set === "--:--" || isNaN(riseH) || isNaN(setH)) {
    document.getElementById("astro-remaining").innerHTML = "";
    updateAstroBodyOnArc(0); // 위치 초기화
    return;
  }

  const riseDate = new Date(todayStr);
  riseDate.setHours(riseH, riseM, 0);
  const setDate = new Date(todayStr);
  setDate.setHours(setH, setM, 0);
  if (setDate <= riseDate) {
    setDate.setDate(setDate.getDate() + 1); // 🌙 moonset이 익일 새벽일 경우 보정
  }

  const totalMins = (setDate - riseDate) / 60000;
  const elapsed = (now - riseDate) / 60000;
  const remaining = Math.max(totalMins - elapsed, 0);
  let ratio = elapsed / totalMins;

  // 상태 분기
  if (!isSun) {
    const moonPhase = getMoonPhaseByDate(now);
    if (elapsed < 0) {
      document.getElementById("astro-remaining").innerHTML =
        `달이 아직 뜨지 않았습니다. 오늘 위상은 <span class="text-primary">${moonPhase}</span>입니다.`;
      ratio = 0;
    } else if (elapsed > totalMins) {
      document.getElementById("astro-remaining").innerHTML =
        `달이 이미 졌습니다. 오늘 위상은 <span class="text-primary">${moonPhase}</span>입니다.`;
      ratio = 1;
    } else {
      document.getElementById("astro-remaining").innerHTML =
        `오늘 위상은 <span class="text-primary">${moonPhase}</span>입니다.`;
    }
  } else {
    if (elapsed < 0) {
      const hrs = Math.floor(Math.abs(elapsed) / 60).toString().padStart(2, "0");
      const mins = Math.floor(Math.abs(elapsed) % 60).toString().padStart(2, "0");
      document.getElementById("astro-remaining").innerHTML =
        `일출까지 <span class="text-primary">${hrs}:${mins}</span> 남았습니다.`;
      ratio = 0;
    } else if (elapsed > totalMins) {
      document.getElementById("astro-remaining").innerHTML = "오늘의 해는 이미 졌습니다.";
      ratio = 1;
    } else {
      const hrs = Math.floor(remaining / 60).toString().padStart(2, "0");
      const mins = Math.floor(remaining % 60).toString().padStart(2, "0");
      document.getElementById("astro-remaining").innerHTML =
        `일몰까지 <span class="text-primary">${hrs}:${mins}</span> 남았습니다.`;
    }
  }

  // ✅ 원 위치 조정
  updateAstroBodyOnArc(Math.min(Math.max(ratio, 0), 1));
}

function updateAstroBodyOnArc(ratio) {
  const motion = document.getElementById("astroMotion");
  const clamped = Math.min(Math.max(ratio, 0), 1);
  motion.setAttribute("keyPoints", `0;${clamped}`);
  motion.beginElement();
}

function startAstroUpdater(data) {
  updateAstroDisplay(data);
  clearInterval(astroInterval);
  astroInterval = setInterval(() => updateAstroDisplay(data), 60000);
}

=======
>>>>>>> develop
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

<<<<<<< HEAD
function getWindDirectionIcon(deg) {
  const angle = parseFloat(deg);
  return `<i class="bi bi-cursor-fill" style="display:inline-block; transform: rotate(${angle}deg);"></i>`;
=======
function getWindArrow8Dir(deg) {
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  const index = Math.round(deg / 45) % 8;
  return arrows[index]; // ✅ 화살표만 반환
>>>>>>> develop
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

function renderHourlyForecastSimple(forecastData) {
  const items = forecastData?.response?.body?.items?.item ?? [];
  const grouped = {};

  items.forEach(item => {
    const key = `${item.fcstDate}_${item.fcstTime}`;
    if (!grouped[key]) grouped[key] = {};
    grouped[key][item.category] = item.fcstValue;
    grouped[key].date = item.fcstDate;
    grouped[key].time = item.fcstTime;
  });

  const sorted = Object.values(grouped).sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time)
  );

  const hourRow = document.getElementById("forecast-hour-row");
  const dateRow = document.getElementById("forecast-date-row");
  const iconRow = document.getElementById("row-icon");
  const tempRow = document.getElementById("row-temp");
  const rainRow = document.getElementById("row-rain");
  const humidRow = document.getElementById("row-humidity");
  const windRow = document.getElementById("row-wind");

  hourRow.innerHTML = `<th>시간</th>`;
<<<<<<< HEAD
  dateRow.innerHTML = `<th>날짜</th>`;
=======
  dateRow.innerHTML = `<th>날짜</th>`; // 첫 칸 비움
>>>>>>> develop
  iconRow.innerHTML = `<th>날씨</th>`;
  tempRow.innerHTML = `<th>기온</th>`;
  rainRow.innerHTML = `<th>강수량</th>`;
  humidRow.innerHTML = `<th>습도</th>`;
  windRow.innerHTML = `<th>바람</th>`;

<<<<<<< HEAD
=======
  // 날짜별 그룹 카운트 (colspan용)
>>>>>>> develop
  const dateGroups = {};
  sorted.forEach(({ date }) => {
    dateGroups[date] = (dateGroups[date] || 0) + 1;
  });

<<<<<<< HEAD
  for (const [date, count] of Object.entries(dateGroups)) {
    const formatted = formatDateToKorean(date);
    dateRow.innerHTML += `<th colspan="${count}" class="text-center">${formatted}</th>`;
  }

  sorted.slice(0, -1).forEach(values => {
=======
  // 날짜 병합 헤더
  for (const [date, count] of Object.entries(dateGroups)) {
    const formatted = formatDateToKorean(date); // ex: 5월 28일 (화)
    dateRow.innerHTML += `<th colspan="${count}" class="text-center">${formatted}</th>`;
  }

  // 각 시간별 데이터 출력
  sorted.forEach(values => {
>>>>>>> develop
    const hour = `${values.time.slice(0, 2)}시`;
    const iconSrc = getWeatherIconImageSrc(values);
    const temp = values.TMP ?? "--";
    const rain = (values.PCP && values.PCP !== "강수없음") ? values.PCP : "0";
<<<<<<< HEAD
    const isPureNumber = /^[\d.]+$/.test(rain);
=======
    const isPureNumber = /^[\d.]+$/.test(rain); // 정규표현식으로 숫자만인지 확인
>>>>>>> develop
    const rainDisplay = isPureNumber ? `${rain} mm` : rain;

    const humidity = values.REH ?? "--";
    const wind = values.WSD ?? "--";
<<<<<<< HEAD
    const windDirIcon = values.VEC ? getWindDirectionIcon(values.VEC) : "–";
=======
    const windArrow = values.VEC ? getWindArrow8Dir(values.VEC) : "–";
>>>>>>> develop
    const windStrength = getWindStrengthDesc(wind);

    hourRow.innerHTML += `<th>${hour}</th>`;
    iconRow.innerHTML += `<td><img src="${iconSrc}" alt="날씨아이콘" width="35" height="36"></td>`;
    tempRow.innerHTML += `<td>${temp}°C</td>`;
    rainRow.innerHTML += `<td>${rainDisplay}</td>`;
    humidRow.innerHTML += `<td>${humidity}%</td>`;
    windRow.innerHTML += `
<<<<<<< HEAD
      <td>
        ${wind} m/s<br>
        ${windDirIcon}
        <div class="text-muted small">${windStrength}</div>
      </td>`;
=======
    <td>
      ${wind} m/s<br>
      <div style="font-size: 1.25rem;">${windArrow}</div>
      <div class="text-muted small">${windStrength}</div>
    </td>`;
>>>>>>> develop
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

function getWeatherIconImageSrc(values) {
  const pty = values.PTY;
  const sky = values.SKY;
  const hour = parseInt(values.time?.slice(0, 2));
  const isNight = hour >= 18 || hour < 6;

<<<<<<< HEAD
=======
  // 강수 상태 우선
>>>>>>> develop
  if (pty === "1" || pty === "2" || pty === "4" || pty === "5" || pty === "6" || pty === "9") {
    return "/image/weather/rain.png";
  }
  if (pty === "3" || pty === "7") {
    return "/image/weather/snow.png";
  }

<<<<<<< HEAD
=======
  // 하늘 상태 + 시간
>>>>>>> develop
  if (sky === "1") return isNight ? "/image/weather/clear-night.png" : "/image/weather/clear-day.png";
  if (sky === "3") return isNight ? "/image/weather/cloudy-night.png" : "/image/weather/cloudy-day.png";
  if (sky === "4") return "/image/weather/cloudy.png";

<<<<<<< HEAD
  return "/image/weather/unknown.png";
}

=======
  return "/image/weather/unknown.png"; // 예외 상황
}


>>>>>>> develop
function getFutureDate(daysAhead, returnObj = false) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  const day = date.toLocaleDateString('ko-KR', { weekday: 'short' });
  const month = date.getMonth() + 1;
  const dayNum = date.getDate();
  if (returnObj) {
<<<<<<< HEAD
    return { day, month, dayNum };
=======
    return { day, month, dayNum }; // ✅ 정확한 key 이름 사용
>>>>>>> develop
  } else {
    return `${month}월 ${dayNum}일 (${day})`;
  }
}

<<<<<<< HEAD
function renderCompactDailyForecast(middleTa, middleLand, holidayList = [], dailyFallback = null) {
=======
function renderCompactDailyForecast(middleTa, middleLand) {
>>>>>>> develop
  const container = document.getElementById("daily-forecast-cards");
  if (!container) return;

  const taItem = middleTa?.response?.body?.items?.item?.[0];
  const landItem = middleLand?.response?.body?.items?.item?.[0];

<<<<<<< HEAD
  container.innerHTML = "";

  for (let i = 4; i <= 10; i++) {
    const dateObj = getFutureDate(i - 3, true);
    const fullDateStr = `2025-${String(dateObj.month).padStart(2, '0')}-${String(dateObj.dayNum).padStart(2, '0')}`;

    const isSunday = dateObj.day === "일";
    const isSaturday = dateObj.day === "토";
    const isHoliday = holidayList.includes(fullDateStr);

    let dayColor = "text-dark fw-bold";
    if (isHoliday || isSunday) dayColor = "text-danger fw-bold";
    else if (isSaturday) dayColor = "text-primary fw-bold";

    // ⛔️ i === 4 이고, 예보 데이터 없으면 fallback 사용
    let taMin = taItem?.[`taMin${i}`];
    let taMax = taItem?.[`taMax${i}`];
    let wfAm = landItem?.[`wf${i}Am`] ?? landItem?.[`wf${i}`];
    let wfPm = landItem?.[`wf${i}Pm`] ?? landItem?.[`wf${i}`];
    let rnAm = landItem?.[`rnSt${i}Am`] ?? landItem?.[`rnSt${i}`] ?? "0";
    let rnPm = landItem?.[`rnSt${i}Pm`] ?? landItem?.[`rnSt${i}`] ?? "0";

    // ✅ 내일 데이터 없을 경우 단기예보로 대체
    if (i === 4 && (!taMin || !wfAm)) {
      if (dailyFallback) {
        taMin = dailyFallback.min;
        taMax = dailyFallback.max;
        wfAm = dailyFallback.wfAm;
        wfPm = dailyFallback.wfPm;
        rnAm = dailyFallback.rainAm;
        rnPm = dailyFallback.rainPm;
      }
    }

    const iconAmSrc = getWeatherImageSrcByText(wfAm, true);
    const iconPmSrc = getWeatherImageSrcByText(wfPm, false);
=======
  if (!taItem || !landItem) {
    container.innerHTML = "<div class='text-muted'>예보 데이터를 불러올 수 없습니다.</div>";
    return;
  }

  container.innerHTML = "";

  // ✅ 3일 뒤부터 시작 (D+3 ~ D+10)
  for (let i = 4; i <= 10; i++) {
    const dateObj = getFutureDate(i - 3, true);
    const taMin = taItem[`taMin${i}`] ?? "--";
    const taMax = taItem[`taMax${i}`] ?? "--";
    const wfAm = landItem[`wf${i}Am`] ?? landItem[`wf${i}`] ?? "";
    const wfPm = landItem[`wf${i}Pm`] ?? landItem[`wf${i}`] ?? "";
    const rnAm = landItem[`rnSt${i}Am`] ?? landItem[`rnSt${i}`] ?? "0";
    const rnPm = landItem[`rnSt${i}Pm`] ?? landItem[`rnSt${i}`] ?? "0";

    const iconAmSrc = getWeatherImageSrcByText(wfAm, true);   // 오전
    const iconPmSrc = getWeatherImageSrcByText(wfPm, false);  // 오후
>>>>>>> develop
    const rainProbAm = `${parseInt(rnAm || 0)}%`;
    const rainProbPm = `${parseInt(rnPm || 0)}%`;

    const card = document.createElement("div");
    card.className = "daily-card text-center p-3 rounded shadow-sm";

    card.innerHTML = `
<<<<<<< HEAD
      <div class="${dayColor}">${dateObj.day}</div>
      <div class="text-muted mb-1" style="font-size: 0.85rem;">${dateObj.month}/${dateObj.dayNum}</div>
      <div class="d-flex justify-content-center gap-1 mb-1">
        <img src="${iconAmSrc}" width="36" height="36" alt="오전">
        <img src="${iconPmSrc}" width="36" height="36" alt="오후">
      </div>
      <div class="mt-2"><span class="text-primary">${taMin ?? "--"}°</span> / <span class="text-danger">${taMax ?? "--"}°</span></div>
      <div class="text-info fw-semibold mt-1" style="font-size: 0.85rem;">${rainProbAm} / ${rainProbPm}</div>
    `;
=======
  <div class="fw-bold">${dateObj.day}</div>
  <div class="text-muted mb-1" style="font-size: 0.85rem;">${dateObj.month}/${dateObj.dayNum}</div>
  <div class="d-flex justify-content-center gap-1 mb-1">
  <img src="${iconAmSrc}" width="36" height="36" alt="오전">
  <img src="${iconPmSrc}" width="36" height="36" alt="오후">
  </div>
  <div class="mt-2"><span class="text-primary">${taMin}°</span> / <span class="text-danger">${taMax}°</span></div>
  <div class="text-info fw-semibold mt-1" style="font-size: 0.85rem;">${rainProbAm} / ${rainProbPm}</div>
`;

>>>>>>> develop

    container.appendChild(card);
  }
}

function getWeatherImageSrcByText(text) {
  if (!text) return "/image/weather/unknown.png";

  const lower = text.toLowerCase();

  if (lower.includes("비")) return "/image/weather/rain.png";
  if (lower.includes("눈")) return "/image/weather/snow.png";
  if (lower.includes("흐림")) return "/image/weather/cloudy.png";
<<<<<<< HEAD
  if (lower.includes("구름")) return "/image/weather/cloudy-day.png";
  if (lower.includes("맑음")) return "/image/weather/clear-day.png";
=======
  if (lower.includes("구름")) return "/image/weather/cloudy-day.png";  // ✅ 항상 주간 아이콘
  if (lower.includes("맑음")) return "/image/weather/clear-day.png";   // ✅ 항상 주간 아이콘
>>>>>>> develop

  return "/image/weather/unknown.png";
}

function loadAirQuality(lat, lon) {
  fetch(`/api/weather/quality?lat=${lat}&lon=${lon}`)
    .then(res => res.json())
    .then(data => {
<<<<<<< HEAD
      // console.log("✅ 대기 정보", data);
=======
      console.log("✅ 대기 정보", data);
>>>>>>> develop

      const khaiLabel = getAirQualityLabel(data.khaiGrade);
      const pm10Label = getAirQualityLabel(data.pm10Grade);
      const pm25Label = getAirQualityLabel(data.pm25Grade);

      document.getElementById("air-station").textContent = data.station || "--";
      document.getElementById("air-khai").textContent = data.khaiValue || "--";
      document.getElementById("air-khai-grade").textContent = khaiLabel;

      document.getElementById("air-pm10").textContent = data.pm10Value || "--";
      document.getElementById("air-pm10-grade").textContent = pm10Label;

      document.getElementById("air-pm25").textContent = data.pm25Value || "--";
      document.getElementById("air-pm25-grade").textContent = pm25Label;

<<<<<<< HEAD
=======
      // ✅ 이모지 설정
>>>>>>> develop
      setAirQualityEmoji('khai', khaiLabel);
      setAirQualityEmoji('pm10', pm10Label);
      setAirQualityEmoji('pm25', pm25Label);
    })
    .catch(err => {
      console.error("❌ 대기 정보 실패", err);
    });
}

function setAirQualityEmoji(idPrefix, gradeLabel) {
  const emojiMap = {
    '좋음': 'good.png',
    '보통': 'normal.png',
    '나쁨': 'bad.png',
    '매우나쁨': 'verybad.png',
    '기본': 'neutral.png',
<<<<<<< HEAD
    '--': 'neutral.png'
=======
    '--': 'neutral.png' // 잘못된 값도 대비
>>>>>>> develop
  };

  const emoji = document.getElementById(`air-${idPrefix}-emoji`);
  if (emoji) {
    emoji.src = `/image/weather/${emojiMap[gradeLabel] || emojiMap['기본']}`;
  }
}

<<<<<<< HEAD
=======

>>>>>>> develop
function getAirQualityLabel(grade) {
  switch (grade) {
    case "1": return "좋음";
    case "2": return "보통";
    case "3": return "나쁨";
    case "4": return "매우나쁨";
    default: return "--";
  }
}

function getNearestRegionName(lat, lon) {
  if (!locationData || locationData.length === 0) {
    console.warn("⚠️ locationData가 비어 있습니다.", locationData);
    return null;
  }

  let closest = locationData[0];
  let minDist = getDistance(lat, lon, closest.lat, closest.lon);

  for (let i = 1; i < locationData.length; i++) {
    const dist = getDistance(lat, lon, locationData[i].lat, locationData[i].lon);
    if (dist < minDist) {
      minDist = dist;
      closest = locationData[i];
    }
  }

<<<<<<< HEAD
=======
  console.log("🧭 가장 가까운 지역 객체:", closest);
>>>>>>> develop
  return closest.name;
}

function getDistance(lat1, lon1, lat2, lon2) {
  const dx = lat1 - lat2;
  const dy = lon1 - lon2;
  return dx * dx + dy * dy;
}

<<<<<<< HEAD
async function fetchHolidayDates() {
  try {
    const res = await fetch("/api/weather/holidays");
    const data = await res.json();
    holidayDates = data.dates;
  } catch (e) {
    console.error("❌ 공휴일 API 실패", e);
  }
}

function getDateColorClass(ymdStr) {
  const date = new Date(ymdStr);
  const day = date.getDay();
  const isHoliday = holidayDates.includes(ymdStr);

  if (day === 0 || isHoliday) return "text-danger fw-bold";
  if (day === 6) return "text-primary fw-bold";
  return "text-dark";
}

function fetchWeatherAlerts() {
  const slideText = document.getElementById("alert-slide-text");
  const container = document.getElementById("weather-alert-slider");

  fetch("/api/weather/alerts")
    .then(res => res.json())
    .then(data => {
      // ✅ 중복 제거
      const seen = new Set();
      const uniqueAlerts = data.filter(alert => {
        const key = `${alert.regionName}_${alert.alertTitle}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // ✅ 특보 없을 경우 처리
      if (uniqueAlerts.length === 0) {
        slideText.textContent = "📢 현재 발효 중인 기상 특보가 없습니다.";
        slideText.style.position = "absolute";
        slideText.style.left = "0";
        slideText.style.animation = "none";
        slideText.style.transform = "translateY(-50%)";
        slideText.style.textAlign = "left";
        slideText.style.paddingLeft = "1rem";
        return;
      }

      // ✅ 메시지 생성
      const message = uniqueAlerts.map(alert =>
        `📢 ${alert.regionName} : ${alert.alertTitle}`
      ).join("   |   ");
      slideText.textContent = message;

      // ✅ 먼저 스타일 초기화
      slideText.style.animation = "none";
      slideText.style.left = "0";
      slideText.style.transform = "translateY(-50%)";
      slideText.style.textAlign = "left";

      setTimeout(() => {
        const messageWidth = slideText.offsetWidth;
        const containerWidth = container.offsetWidth;
        const duration = Math.max(message.length / 5, 15);

        if (messageWidth <= containerWidth) {
          // ✅ 고정 표시
          slideText.style.position = "absolute";
          slideText.style.left = "0";
          slideText.style.animation = "none";
          slideText.style.paddingLeft = "1rem";
        } else {
          // ✅ 슬라이드
          slideText.style.position = "absolute";
          slideText.style.left = "100%";
          slideText.offsetHeight; // 강제 reflow
          slideText.style.animation = `slide-left ${duration}s linear infinite`;
          slideText.style.paddingLeft = "0";
        }
      }, 100);
    })
    .catch(err => {
      console.error("❌ 특보 로딩 실패", err);
      slideText.textContent = "⚠️ 기상 특보 정보를 가져오지 못했습니다.";
      slideText.style.left = "0";
      slideText.style.animation = "none";
      slideText.style.transform = "translateY(-50%)";
    });
}

$(document).ready(function () {
  $.get("/api/weather/news", function (data) {
    const list = $("#weather-news-list");
    data.forEach(item => {
      const li = $(`
        <li class="news-item">
          <a href="${item.url}" class="news-title">${item.title}</a>
          <span class="news-date">${item.published_at.split('T')[0]}</span>
        </li>
      `);
      list.append(li);
    });
  });
});
=======
>>>>>>> develop
