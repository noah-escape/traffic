let busMarkers = [];
let busTimer = null;
let stopMarkers = [];
let allStops = [];
let clusterer;
let routeLine = null;
let routeMarkers = [];
let arrivalTimers = {};
let visibleStops = [];     // 현재 지도 내 표시되는 정류소
let routeStops = [];       // 검색한 노선의 정류소
let currentRouteId = null; // 현재 활성화된 노선 ID

const typeColorMap = {
  "간선": "bg-primary",
  "지선": "bg-success",
  "광역": "bg-danger",
  "마을": "bg-warning",
  "순환": "bg-info",
  "공항": "bg-dark",
  "경기": "bg-secondary",
  "인천": "bg-secondary",
  "기타": "bg-light text-dark"
};

// 🔹 기존 마커 제거
function clearBusMarkers() {
  busMarkers.forEach(marker => marker.setMap(null));
  busMarkers = [];
}

async function showBusPositions({ routeId, routeNumber }) {
  let url = '';
  if (routeId) {
    url = `/api/proxy/busPos?routeId=${encodeURIComponent(routeId)}`;
  } else if (routeNumber) {
    url = `/api/proxy/busPosByNumber?routeNumber=${encodeURIComponent(routeNumber)}`;
  } else {
    alert("버스 노선 정보가 부족합니다 (routeId 또는 routeNumber)");
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.msgHeader || data.msgHeader.headerCd !== '0') {
      clearBusMarkers();
      alert('버스 위치 데이터를 가져오지 못했습니다: ' + (data.msgHeader?.headerMsg || '서버 오류'));
      return;
    }

    const itemList = data?.msgBody?.itemList;
    const buses = Array.isArray(itemList) ? itemList : (itemList ? [itemList] : []);

    if (buses.length === 0) {
      clearBusMarkers();
      alert('현재 운행 중인 버스가 없습니다.');
      return;
    }

    clearBusMarkers();

    buses.forEach(bus => {
      const lat = parseFloat(bus.gpsY);
      const lng = parseFloat(bus.gpsX);
      const carNo = bus.vehId;

      if (!isNaN(lat) && !isNaN(lng)) {
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(lat, lng),
          map: map,
          title: `버스 번호: ${carNo}`,
          icon: {
            url: '/image/bus/icon-bus.png',
            size: new naver.maps.Size(24, 24),
            origin: new naver.maps.Point(0, 0),
            anchor: new naver.maps.Point(8, 24)
          }
        });

        const info = new naver.maps.InfoWindow({
          content: `<div style="padding:6px;">🚌 차량번호: ${carNo}</div>`
        });

        naver.maps.Event.addListener(marker, 'click', () => {
          info.open(map, marker);
        });

        busMarkers.push(marker);
      }
    });
  } catch (err) {
    clearBusMarkers();
    alert('버스 위치를 불러오는 중 오류가 발생했습니다: ' + err.message);
  }
}

function startBusTracking({ routeId, routeNumber }) {
  if (busTimer) {
    clearInterval(busTimer);
  }

  showBusPositions({ routeId, routeNumber });

  busTimer = setInterval(() => {
    showBusPositions({ routeId, routeNumber });
  }, 10000);
}

function stopBusTracking() {
  if (busTimer) {
    clearInterval(busTimer);
    busTimer = null;
    clearBusMarkers();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.getElementById('sidebarBusBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      stopBusTracking();      // 실시간 추적 중지
      clearStopMarkers();     // 기존 정류소 마커 제거
      clearRouteDisplay();    // 노선 경로 라인, 마커 제거
      currentRouteId = null;  // 현재 노선 초기화
      routeStops = [];        // 경로 정류소 초기화

      // 서울시 전체 정류소 다시 보여줌
      if (allStops.length > 0) {
        filterStopsInView();
      }
    });
  }

  if (typeof initClusterer === "function") initClusterer();

  try {
    const res = await fetch("/api/proxy/bus/regions");
    const cities = await res.json();
    const selector = document.getElementById("regionSelector");

    if (selector) {
      cities.forEach(city => {
        const opt = document.createElement("option");
        opt.value = city;
        opt.textContent = city;
        selector.appendChild(opt);
      });

      selector.addEventListener("change", e => {
        const region = e.target.value;

        stopBusTracking();
        clearStopMarkers();
        clearRouteDisplay();

        if (!region) return;

        if (region === '서울특별시') {
          loadBusStopsByRegion(region);
        } else {
          alert(`[${region}] 지역의 버스 정류소 정보는 준비 중입니다.\n추후 업데이트 예정입니다.`);
        }
      });
    }
  } catch (e) {
    console.error("도시 목록 로딩 실패", e);
  }

  let idleTimer = null;
  naver.maps.Event.addListener(map, 'idle', () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (map.getZoom() < 12) {
        clearStopMarkers();
        return;
      }

      if (!currentRouteId) {  // ✅ 경로 검색 안 한 상태일 때만
        filterStopsInView();
      }
    }, 300);
  });
});

const cityCenters = {
  '서울특별시': [37.5665, 126.9780],
  '부산광역시': [35.1796, 129.0756],
  '대구광역시': [35.8714, 128.6014],
  '인천광역시': [37.4563, 126.7052],
  '광주광역시': [35.1595, 126.8526],
  '대전광역시': [36.3504, 127.3845],
  '울산광역시': [35.5384, 129.3114],
  '세종특별자치시': [36.4800, 127.2891],
  '경기도': [37.4138, 127.5183],
  '강원특별자치도': [37.8228, 128.1555],
  '충청북도': [36.6357, 127.4917],
  '충청남도': [36.5184, 126.8000],
  '전라북도': [35.7167, 127.1444],
  '전라남도': [34.8161, 126.4630],
  '경상북도': [36.4919, 128.8889],
  '경상남도': [35.4606, 128.2132],
  '제주특별자치도': [33.4996, 126.5312]
};

function clearStopMarkers() {
  stopMarkers.forEach(m => m.setMap(null));
  stopMarkers = [];
}

function drawStopMarkers(stops, isRouteMarkers = false) {
  if (!isRouteMarkers) clearStopMarkers();

  let index = 0;
  const batchSize = 200;
  const delay = 50;

  function drawBatch() {
    const nextBatch = stops.slice(index, index + batchSize);

    nextBatch.forEach(stop => {
      const lat = parseFloat(stop.lat || stop.latitude);
      const lng = parseFloat(stop.lng || stop.longitude);
      const name = stop.name || stop.stationName;

      // ✅ 확실한 통합 ID 사용
      const stopId = stop.stopId || stop.nodeId || stop.id;
      const arsId = stop.arsId || "01";

      if (!stopId) {
        console.warn("❗ 정류소 ID 누락됨", stop);
        return;
      }

      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(lat, lng),
        map: map,
        title: name,
        icon: {
          url: isRouteMarkers ? "/image/bus/bus-stop-route.png" : "/image/bus/bus-stop.png",
          size: new naver.maps.Size(16, 16),
          anchor: new naver.maps.Point(8, 16)
        }
      });

      const info = new naver.maps.InfoWindow({
        content: `<div style="padding:4px;">🚌 ${name}</div>`
      });

      naver.maps.Event.addListener(marker, 'click', () => {
        console.log("🧭 정류소 클릭:", stopId, arsId);
        info.open(map, marker);
        onBusStopClick(stopId, arsId, name);
      });

      if (isRouteMarkers) {
        routeMarkers.push(marker);
      } else {
        stopMarkers.push(marker);
      }
    });

    index += batchSize;
    if (index < stops.length) setTimeout(drawBatch, delay);
  }

  drawBatch();
}

let lastBounds = null;
const MAX_MARKERS = 500;

function filterStopsInView() {
  if (!map || allStops.length === 0) return;

  const bounds = map.getBounds();
  if (lastBounds && bounds.equals(lastBounds)) return;
  lastBounds = bounds;

  visibleStops = allStops.filter(stop => {
    const lat = parseFloat(stop.lat);
    const lng = parseFloat(stop.lng);
    return bounds.hasLatLng(new naver.maps.LatLng(lat, lng));
  });

  if (visibleStops.length > MAX_MARKERS) {
    console.warn(`정류장 ${visibleStops.length}개 → ${MAX_MARKERS}개 제한`);
  }

  drawStopMarkers(visibleStops.slice(0, MAX_MARKERS));
}

async function loadBusStopsByRegion(region) {
  if (!region) return;

  if (cityCenters[region]) {
    const [lat, lng] = cityCenters[region];
    map.setCenter(new naver.maps.LatLng(lat, lng));
    map.setZoom(13);
  }

  try {
    const res = await fetch(`/api/proxy/bus/stops?region=${encodeURIComponent(region)}`);
    allStops = await res.json();
    if (!currentRouteId) {
      filterStopsInView();
    }
  } catch (err) {
    console.error("정류소 불러오기 실패", err);
  }
}

function onBusStopClick(stopId, arsId = "01", stopName = "정류소") {
  fetch(`/api/proxy/bus/arrivals?stopId=${stopId}&arsId=${arsId}`)
    .then(res => res.json())
    .then(arrivals => {
      showArrivalModal(arrivals, stopName); // ✅ 정류소명 전달
    });

  fetch(`/api/proxy/bus/routes?stopId=${stopId}`)
    .then(res => res.json())
    .then(routes => showRouteListModal(routes));
}

function showArrivalModal(arrivals, stopName = "정류소") {
  const container = document.getElementById("arrivalPanelBody");
  if (!container) return;

  // 기존 타이머 제거
  Object.values(arrivalTimers).forEach(clearInterval);
  arrivalTimers = {};

  const soon = [], running = [], waiting = [], turning = [], ended = [], unknown = [];

  const sorted = [...arrivals].sort((a, b) =>
    a.routeNumber.localeCompare(b.routeNumber, 'ko', { numeric: true })
  );

  sorted.forEach((item, idx) => {
    const routeNumber = item.routeNumber;
    const routeType = item.routeType || "기타";
    const typeClass = typeColorMap[routeType] || "bg-light text-dark";
    const congestionClass = getCongestionClass(item.congestion);

    let statusText = item.arrivalTime;
    let category = 'unknown';
    const sec = parseArrivalSeconds(item.arrivalTime);

    // 상태 분류
    if (statusText === "운행 종료") {
      category = "ended";
    } else if (statusText?.includes("회차")) {
      statusText = "회차 대기";
      category = "turning";
    } else if (statusText?.includes("대기")) {
      statusText = "운행 대기";
      category = "waiting";
    } else if (sec !== null && sec <= 60) {
      statusText = "곧 도착";
      category = "soon";
    } else if (sec !== null) {
      statusText = `⏱ ${formatArrivalSec(sec)}`;
      category = "running";
    }

    const html = `
      <div class="arrival-card border-bottom py-2 arrival-item" data-route="${routeNumber}" style="cursor: pointer;">
        <div class="d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center flex-grow-1">
            <div class="bus-number-box ${typeClass} text-white fw-bold text-center me-2"
                 style="min-width: 50px; height: 32px; line-height: 32px; border-radius: 4px;">
              ${routeNumber}
            </div>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between small">
                <div id="arrivalTime${idx}" class="${congestionClass}">
                  ${statusText}
                </div>
                <div class="${congestionClass}" style="min-width: 50px; text-align: right;">
                  ${item.congestion || '정보 없음'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    switch (category) {
      case 'soon': soon.push({ html, idx, sec }); break;
      case 'running': running.push({ html, idx, sec }); break;
      case 'waiting': waiting.push({ html, idx }); break;
      case 'turning': turning.push({ html, idx }); break;
      case 'ended': ended.push({ html, idx }); break;
      default: unknown.push({ html, idx }); break;
    }
  });

  // 렌더링
  container.innerHTML = `<h5 class="mb-3"><i class="bi bi-bus-front-fill me-1"></i>${stopName}</h5>`;

  if (soon.length > 0) {
    container.innerHTML += `<div class="text-danger fw-bold mb-2">🚨 곧 도착</div>`;
    container.innerHTML += soon.map(e => e.html).join('');
  }
  if (running.length > 0) {
    container.innerHTML += `<div class="text-success mt-3 mb-2">🟢 운행 중</div>`;
    container.innerHTML += running.map(e => e.html).join('');
  }
  if (waiting.length > 0 || turning.length > 0) {
    container.innerHTML += `<div class="text-warning mt-3 mb-2">⏳ 운행 대기</div>`;
    container.innerHTML += [...waiting, ...turning].map(e => e.html).join('');
  }
  if (ended.length > 0) {
    container.innerHTML += `<div class="text-danger mt-3 mb-2">⛔ 운행 종료</div>`;
    container.innerHTML += ended.map(e => e.html).join('');
  }

  // 타이머 실행
  [...soon, ...running].forEach(({ idx, sec }) => {
    if (sec == null) return;
    arrivalTimers[idx] = setInterval(() => {
      const el = document.getElementById(`arrivalTime${idx}`);
      if (!el) return;
      sec--;
      if (sec <= 0) {
        el.textContent = "도착";
        clearInterval(arrivalTimers[idx]);
      } else {
        el.textContent = `⏱ ${formatArrivalSec(sec)}`;
      }
    }, 1000);
  });
}

function formatArrivalSec(sec) {
  if (sec < 60) return `${sec}초`;
  const min = Math.floor(sec / 60);
  const remain = sec % 60;
  return `${min}분 ${remain}초`;
}

function makeHtml(idx, routeNumber, typeClass, statusText, congestionClass, item) {
  return `
    <div class="arrival-card border-bottom py-2 arrival-item" data-route="${routeNumber}">
      <div class="d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center flex-grow-1">
          <div class="bus-number-box ${typeClass} text-white fw-bold text-center me-2"
               style="min-width: 50px; height: 32px; line-height: 32px; border-radius: 4px;">
            ${routeNumber}
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between small">
              <div id="arrivalTime${idx}" class="${congestionClass}">
                ${statusText}
              </div>
              <div class="${congestionClass}" style="min-width: 50px; text-align: right;">
                ${item.congestion || '정보 없음'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getCongestionClass(text) {
  if (text === "여유") return "text-success";
  if (text === "보통") return "text-warning";
  if (text === "혼잡") return "text-danger";
  return "text-muted";
}

// 🔧 이벤트 위임으로 상세 표시
document.body.addEventListener('click', e => {
  const target = e.target.closest('.arrival-item');
  if (target && target.dataset.route) {
    const route = target.dataset.route;
    loadRouteDetail(route, target); // 💡 상세정보 패널 띄우기
  }
});

function showRouteListModal(routes) {
  const container = document.getElementById("routeListModalBody");
  if (!container) return;

  if (!Array.isArray(routes) || routes.length === 0) {
    container.innerHTML = "<p>이 정류장을 경유하는 버스가 없습니다.</p>";
  } else {
    container.innerHTML = routes.map(route => `
      <div class="d-flex justify-content-between align-items-center border-bottom py-2">
        <div>
          <strong>${route.routeNumber}</strong>
          <span class="text-muted">(${route.routeType})</span>
        </div>
        <button class="btn btn-sm btn-primary" onclick="onRouteSelected('${route.routeId}')">실시간 위치</button>
      </div>
    `).join('');
  }

  const modal = new bootstrap.Modal(document.getElementById('routeListModal'));
  modal.show();
}

function onRouteSelected(routeId) {
  stopBusTracking();
  startBusTracking({ routeId });
}

function clearRouteDisplay() {
  if (routeLine) {
    routeLine.setMap(null);
    routeLine = null;
  }
  routeMarkers.forEach(m => m.setMap(null));
  routeMarkers = [];
}

window.searchBusRoute = async function () {
  const input = document.getElementById("routeInput");
  const routeNumber = input?.value?.trim();

  if (!routeNumber) {
    alert("버스 번호를 입력해주세요.");
    return;
  }

  stopBusTracking();
  clearStopMarkers();
  clearRouteDisplay();
  currentRouteId = null;

  try {
    const res = await fetch(`/api/proxy/bus/routes?routeNumber=${encodeURIComponent(routeNumber)}`);
    const stops = await res.json();

    if (stops.length === 0) {
      alert("해당 버스 노선 정보를 찾을 수 없습니다.");
      return;
    }

    const path = stops.map(stop =>
      new naver.maps.LatLng(parseFloat(stop.lat), parseFloat(stop.lng))
    );

    // ✅ 경로 라인 그리기
    routeLine = new naver.maps.Polyline({
      path: path,
      strokeColor: '#0078ff',
      strokeWeight: 4,
      map: map
    });

    map.setCenter(path[0]);
    map.setZoom(13);

    // ✅ 노선 경로 정류소 마커는 따로 표시
    drawStopMarkers(stops, true); // <-- 핵심 수정
    drawStopMarkers(visibleStops);

    // ✅ 노선 기반 버스 위치 추적
    startBusTracking({ routeNumber });

    // ✅ 상태 저장
    routeStops = stops;
    currentRouteId = routeNumber;
  } catch (err) {
    console.error("버스 경로 조회 실패", err);
    alert("버스 노선 정보를 불러오는 데 실패했습니다.");
  }
};


async function loadRouteDetail(routeNumber, triggerEl) {
  try {
    const res = await fetch(`/api/proxy/bus/detail?routeNumber=${routeNumber}`);
    const data = await res.json();

    const html = `
      <div class="fw-bold mb-1">${data.routeNumber}번 버스</div>
      <div>🕒 배차: ${data.interval || '정보 없음'}</div>
      <div>🚏 첫차: ${data.firstTime || '정보 없음'}</div>
      <div>🌙 막차: ${data.lastTime || '정보 없음'}</div>
      <div class="mt-2 text-end">
        <button class="btn btn-sm btn-outline-primary" onclick="openBusRoutePanel('${data.routeNumber}')">
          노선 보기
        </button>
      </div>
    `;

    const popup = document.getElementById('routeDetailPopup');
    const content = document.getElementById('routeDetailPopupContent');
    content.innerHTML = html;

    // 위치 조정 - 화면 오른쪽 상단에 고정
    const rect = triggerEl.getBoundingClientRect();
    popup.style.top = `${window.scrollY + 60}px`;  // 화면 상단 기준 위치
    popup.style.right = `20px`;

    popup.classList.remove('d-none');

  } catch (err) {
    console.error("상세 정보 불러오기 실패", err);
  }
}

async function openBusRoutePanel(routeNumber) {
  try {
    const [routeDetail, stops] = await Promise.all([
      fetch(`/api/proxy/bus/detail?routeNumber=${routeNumber}`).then(r => r.json()),
      fetch(`/api/proxy/bus/routes?routeNumber=${routeNumber}`).then(r => r.json())
    ]);

    document.getElementById("routeHeader").textContent = `${routeNumber}번`;
    document.getElementById("routeSubInfo").textContent =
      `배차 ${routeDetail.interval}, 첫차 ${routeDetail.firstTime}, 막차 ${routeDetail.lastTime}`;

    const container = document.getElementById("busStopListContainer");
    container.innerHTML = stops.map(stop => `
      <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
        <div>
          <div class="fw-bold">${stop.stationName}</div>
          <div class="text-muted small">(${stop.nodeId})</div>
        </div>
        <button class="btn btn-sm btn-outline-secondary"
                onclick="loadArrivalAtStop('${stop.nodeId}', '${stop.arsId || '01'}')">도착</button>
      </div>
    `).join("");

    new bootstrap.Offcanvas(document.getElementById("busRoutePanel")).show();
  } catch (err) {
    console.error("노선 정보 로딩 실패", err);
    alert("버스 노선 상세 정보를 가져오는 데 실패했습니다.");
  }
}

async function loadArrivalAtStop(stopId, arsId) {
  try {
    const res = await fetch(`/api/proxy/bus/arrivals?stopId=${stopId}&arsId=${arsId}`);
    const arrivals = await res.json();

    const stopElem = [...document.querySelectorAll(`#busStopListContainer .border-bottom`)]
      .find(div => div.innerHTML.includes(stopId));
    if (!stopElem) return;

    const arrivalHtml = arrivals.map(arrival => `
      <div class="small text-primary mt-1">
        🚌 ${arrival.routeNumber} → ${arrival.arrivalTime} (${arrival.congestion})
      </div>
    `).join("");

    stopElem.insertAdjacentHTML('beforeend', arrivalHtml);
  } catch (e) {
    console.error("도착 정보 불러오기 오류", e);
    alert("도착 정보를 불러오는 중 오류 발생");
  }
}

// 이벤트 위임 방식으로 상세 버튼 작동
document.body.addEventListener("click", e => {
  if (e.target.classList.contains("route-detail-btn")) {
    const route = e.target.dataset.route;
    loadRouteDetail(route, e.target);
  }
});

document.addEventListener("click", function (e) {
  const popup = document.getElementById("routeDetailPopup");
  if (!popup.contains(e.target) && !e.target.classList.contains("route-detail-btn")) {
    popup.classList.add("d-none");
  }
});

function parseArrivalSeconds(arrivalText) {
  if (!arrivalText) return null;
  const secOnly = arrivalText.match(/^(\d+)\s*초$/);
  if (secOnly) return parseInt(secOnly[1], 10);

  const full = arrivalText.match(/^(\d+)\s*분\s*(\d+)?\s*초?/);
  if (full) {
    const min = parseInt(full[1], 10);
    const sec = full[2] ? parseInt(full[2], 10) : 0;
    return min * 60 + sec;
  }

  const minOnly = arrivalText.match(/^(\d+)\s*분$/);
  if (minOnly) return parseInt(minOnly[1], 10) * 60;

  return null;
}

// 전역 등록
window.loadRouteDetail = loadRouteDetail;
window.openBusRoutePanel = openBusRoutePanel;
window.loadArrivalAtStop = loadArrivalAtStop;
window.startBusTracking = startBusTracking;
window.stopBusTracking = stopBusTracking;
window.clearBusMarkers = clearBusMarkers;
window.showBusPositions = showBusPositions;