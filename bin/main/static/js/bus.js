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

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📦 전체 응답:', data);

    if (!data.msgHeader || data.msgHeader.headerCd !== '0') {
      clearBusMarkers();
      alert('버스 위치 데이터를 가져오지 못했습니다: ' + (data.msgHeader?.headerMsg || '서버 오류'));
      return;
    }

    const itemList = data?.msgBody?.itemList;
    const buses = Array.isArray(itemList) ? itemList : (itemList ? [itemList] : []);

    console.log('🚌 받아온 버스 수:', buses.length);

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
    console.log('🔄 기존 타이머 제거');
  }

  showBusPositions({ routeId, routeNumber });

  busTimer = setInterval(() => {
    console.log('🔄 버스 위치 갱신:', new Date().toLocaleTimeString());
    showBusPositions({ routeId, routeNumber });
  }, 10000);
}

function stopBusTracking() {
  if (busTimer) {
    clearInterval(busTimer);
    busTimer = null;
    console.log('🛑 버스 트래킹 중지');
    clearBusMarkers();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('sidebarBusBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const defaultRouteId = '100100118';
      if (busTimer) {
        stopBusTracking();
      } else {
        startBusTracking({ routeId: defaultRouteId });
      }
    });
  } else {
    console.warn('❌ sidebarBusBtn 버튼이 DOM에 없습니다.');
  }
});

// ------------------- 정류장 --------------------

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

  const markers = stops.map(stop => {
    const marker = new naver.maps.Marker({
      position: new naver.maps.LatLng(parseFloat(stop.lat), parseFloat(stop.lng)),
      title: stop.name
    });

    const info = new naver.maps.InfoWindow({
      content: `<div style="padding:4px;">🚌 ${stop.name}</div>`
    });

    naver.maps.Event.addListener(marker, 'click', () => {
      info.open(map, marker);
      onBusStopClick(stop.id);
    });

    return marker;
  });

  markers.forEach(marker => marker.setMap(map)); 
  stopMarkers = markers;
}

function filterStopsInView() {
  if (!map || allStops.length === 0) return;

  const bounds = map.getBounds();

  const visibleStops = allStops.filter(stop => {
    const lat = parseFloat(stop.lat);
    const lng = parseFloat(stop.lng);
    return bounds.hasLatLng(new naver.maps.LatLng(lat, lng));
  });

  drawStopMarkers(visibleStops);
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

function onBusStopClick(stopId) {
  fetch(`/api/proxy/bus/routes?stopId=${stopId}`)
    .then(res => res.json())
    .then(routes => {
      showRouteListModal(routes);
    });
}

function onRouteSelected(routeId) {
  stopBusTracking();
  startBusTracking({ routeId });
}

window.addEventListener("DOMContentLoaded", async () => {

  initClusterer();

  const res = await fetch("/api/proxy/bus/regions");
  const cities = await res.json();
  const selector = document.getElementById("regionSelector");

  cities.forEach(city => {
    const opt = document.createElement("option");
    opt.value = city;
    opt.textContent = city;
    selector.appendChild(opt);
  });

  naver.maps.Event.addListener(map, 'idle', () => {
    if (map.getZoom() < 12) {
      clearStopMarkers();
      return;
    }
    filterStopsInView();
  });
});

document.getElementById("regionSelector").addEventListener("change", e => {
  const region = e.target.value;
  stopBusTracking();
  clearStopMarkers();
  if (region) {
    loadBusStopsByRegion(region);
  }
});

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

    // 🔥 실시간 추적 시작 (버스 번호로)
    startBusTracking({ routeNumber });

  } catch (err) {
    console.error("버스 경로 조회 실패", err);
    alert("버스 노선 정보를 불러오는 데 실패했습니다.");
  }
};

// 전역 등록
window.startBusTracking = startBusTracking;
window.stopBusTracking = stopBusTracking;
window.clearBusMarkers = clearBusMarkers;
window.showBusPositions = showBusPositions;