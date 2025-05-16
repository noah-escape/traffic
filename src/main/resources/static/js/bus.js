let busMarkers = [];
let busTimer = null;
let stopMarkers = [];
let allStops = [];
let clusterer;
let routeLine = null;
let routeMarkers = [];

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
          title: `버스 번호: ${carNo}`
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
      if (busTimer) stopBusTracking();
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
        if (region) loadBusStopsByRegion(region);
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
      filterStopsInView();
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

function drawStopMarkers(stops) {
  clearStopMarkers();

  let index = 0;
  const batchSize = 200;
  const delay = 50;

  function drawBatch() {
    const nextBatch = stops.slice(index, index + batchSize);

    nextBatch.forEach(stop => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(parseFloat(stop.lat), parseFloat(stop.lng)),
        map: map,
        title: stop.name,
        icon: {
          url: "/image/bus/bus-stop.png",
          size: new naver.maps.Size(16, 16),
          origin: new naver.maps.Point(0, 0),
          anchor: new naver.maps.Point(8, 16)
        }
      });

      const info = new naver.maps.InfoWindow({
        content: `<div style="padding:4px;">🚌 ${stop.name}</div>`
      });

      naver.maps.Event.addListener(marker, 'click', () => {
        info.open(map, marker);
        onBusStopClick(stop.id, stop.arsId || "01");
      });

      stopMarkers.push(marker);
    });

    index += batchSize;
    if (index < stops.length) {
      setTimeout(drawBatch, delay);
    }
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

  const visibleStops = allStops.filter(stop => {
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
    filterStopsInView();
  } catch (err) {
    console.error("정류소 불러오기 실패", err);
  }
}

function onBusStopClick(stopId, arsId = "01") {
  fetch(`/api/proxy/bus/arrivals?stopId=${stopId}&arsId=${arsId}`)
    .then(res => res.json())
    .then(arrivals => showArrivalModal(arrivals));

  fetch(`/api/proxy/bus/routes?stopId=${stopId}`)
    .then(res => res.json())
    .then(routes => showRouteListModal(routes));
}

function showArrivalModal(arrivals) {
  const container = document.getElementById("arrivalPanelBody");
  if (!container) return;

  if (!arrivals || arrivals.length === 0) {
    container.innerHTML = "<p>도착 예정인 버스가 없습니다.</p>";
  } else {
    container.innerHTML = arrivals.map(item => {
      const congestionText = item.congestion || "정보 없음";
      let congestionClass = "text-muted";

      if (congestionText === "여유") congestionClass = "text-success";
      else if (congestionText === "보통") congestionClass = "text-warning";
      else if (congestionText === "혼잡") congestionClass = "text-danger";

      const arrivalText = item.arrivalTime || "출발대기";
      const routeNumber = item.routeNumber;

      return `
        <div class="arrival-card d-flex justify-content-between align-items-start border-bottom py-2">
          <div class="d-flex flex-column">
            <div class="bus-number-box mb-1" title="${routeNumber}">${routeNumber}</div>
            <div class="arrival-status small ${congestionClass}">
              🚥 ${congestionText} ⏱ ${arrivalText}
            </div>
          </div>
          <div class="align-self-center">
            <button class="btn btn-detail route-detail-btn" data-route="${routeNumber}">상세</button>
          </div>
        </div>
      `;
    }).join('');
  }
}

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

  try {
    const res = await fetch(`/api/proxy/bus/routes?routeNumber=${encodeURIComponent(routeNumber)}`);
    const stops = await res.json();

    if (stops.length === 0) {
      alert("해당 버스 노선 정보를 찾을 수 없습니다.");
      return;
    }

    const path = [];
    stops.forEach(stop => {
      const lat = parseFloat(stop.lat);
      const lng = parseFloat(stop.lng);
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(lat, lng),
        title: stop.name,
        map: map
      });
      routeMarkers.push(marker);
      path.push(new naver.maps.LatLng(lat, lng));
    });

    routeLine = new naver.maps.Polyline({
      path: path,
      strokeColor: '#0078ff',
      strokeWeight: 4,
      map: map
    });

    map.setCenter(path[0]);
    map.setZoom(13);

    startBusTracking({ routeNumber });
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
    `;

    const popup = document.getElementById('routeDetailPopup');
    const content = document.getElementById('routeDetailPopupContent');
    content.innerHTML = html;

    // 위치 조정
    const rect = triggerEl.getBoundingClientRect();
    popup.style.top = `${rect.top + window.scrollY + 5}px`;
    popup.style.left = `${rect.left + window.scrollX - 260}px`; // 버튼 왼쪽에 표시

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

// 전역 등록
window.loadRouteDetail = loadRouteDetail;
window.openBusRoutePanel = openBusRoutePanel;
window.loadArrivalAtStop = loadArrivalAtStop;
window.startBusTracking = startBusTracking;
window.stopBusTracking = stopBusTracking;
window.clearBusMarkers = clearBusMarkers;
window.showBusPositions = showBusPositions;