let busMarkers = []; // 🔸 지도 위 버스 마커 저장용 배열
let busTimer = null; // 🔸 갱신 타이머
let stopMarkers = [];// 🔸 전국 정류소 배열
let allStops = []; // 전체 정류소
let clusterer;

// 실시간 버스번호별 위치

// 🔹 기존 마커 제거
function clearBusMarkers() {
  busMarkers.forEach(marker => marker.setMap(null));
  busMarkers = [];
}

// 🔹 버스 위치 조회 및 지도에 마커 표시
async function showBusPositions(routeId) {
  const url = `/api/proxy/busPos?routeId=${routeId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      // console.error('❌ Response error:', errorText);
      throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📦 전체 응답:', data);

    if (!data.msgHeader || data.msgHeader.headerCd !== '0') {
      // console.warn('⚠️ 서울시 API 비정상 응답:', data.msgHeader?.headerMsg || '응답 오류');
      clearBusMarkers();
      alert('버스 위치 데이터를 가져오지 못했습니다: ' + (data.msgHeader?.headerMsg || '서버 오류'));
      return;
    }

    const itemList = data?.msgBody?.itemList;
    // console.log('🔍 itemList:', itemList);
    // console.log('🔍 itemList 타입:', typeof itemList);
    // console.log('🔍 itemList 배열 여부:', Array.isArray(itemList));

    const buses = Array.isArray(itemList) ? itemList : (itemList ? [itemList] : []);
    console.log('🚌 받아온 버스 수:', buses.length);

    if (buses.length === 0) {
      // console.warn('📭 실시간 버스 데이터 없음');
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
      } else {
        // console.warn(`⚠️ 유효하지 않은 좌표: 차량 ${carNo}, gpsY=${bus.gpsY}, gpsX=${bus.gpsX}`);
      }
    });
  } catch (err) {
    // console.error('❌ 버스 위치 불러오기 실패:', err.message);
    clearBusMarkers();
    alert('버스 위치를 불러오는 중 오류가 발생했습니다: ' + err.message);
  }
}

// 🔹 주기적 갱신 트래킹 시작
function startBusTracking(routeId) {
  if (busTimer) {
    clearInterval(busTimer);
    console.log('🔄 기존 타이머 제거');
  }
  showBusPositions(routeId); // 최초 호출
  busTimer = setInterval(() => {
    console.log('🔄 버스 위치 갱신:', new Date().toLocaleTimeString());
    showBusPositions(routeId);
  }, 10000); // 10초마다 호출
}

// 🔹 추적 중지
function stopBusTracking() {
  if (busTimer) {
    clearInterval(busTimer);
    busTimer = null;
    console.log('🛑 버스 트래킹 중지');
    clearBusMarkers();
  }
}

// 🔹 버튼 연결
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('sidebarBusBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const defaultRouteId = '100100118'; // 🚍 예시: 100번
      if (busTimer) {
        stopBusTracking();
      } else {
        startBusTracking(defaultRouteId);
      }
    });
  } else {
    console.warn('❌ sidebarBusBtn 버튼이 DOM에 없습니다.');
  }
});


// 버스 정류장

// ✅ 시/도별 시청 좌표 맵
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

// ✅ 클러스터러 초기화
function initClusterer() {
  if (!clusterer) {
    clusterer = new naver.maps.MarkerClustering({
      map: map,
      maxZoom: 16,
      gridSize: 60,
      markers: []
    });
  }
}

// ✅ 정류소 마커 제거
function clearStopMarkers() {
  stopMarkers.forEach(m => m.setMap(null));
  stopMarkers = [];
  clusterer?.clear();
}

// ✅ 지도 뷰포트 내 정류소 필터링 후 마커 표시
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

// ✅ 마커 찍기 (클러스터 적용)
function drawStopMarkers(stops) {
  clearStopMarkers();

  const markers = stops.map(stop => {
    const lat = parseFloat(stop.lat);
    const lng = parseFloat(stop.lng);

    const marker = new naver.maps.Marker({
      position: new naver.maps.LatLng(lat, lng),
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

  stopMarkers = markers;
  clusterer.setMarkers(markers);
}

// ✅ 시/도 선택 시 전체 정류소 가져오기 (하지만 안 찍음)
async function loadBusStopsByRegion(region) {
  if (!region) return;
  const res = await fetch(`/api/proxy/bus/stops?region=${encodeURIComponent(region)}`);
  allStops = await res.json();
  filterStopsInView(); // 지도 뷰포트 내만 표시
}

// ✅ 노선 모달 (추후 연결)
function onBusStopClick(stopId) {
  fetch(`/api/proxy/bus/routes?stopId=${stopId}`)
    .then(res => res.json())
    .then(routes => {
      showRouteListModal(routes);
    });
}

function onRouteSelected(routeId) {
  stopBusTracking();
  startBusTracking(routeId);
}

// ✅ DOM 초기화
window.addEventListener("DOMContentLoaded", async () => {
  map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(37.57, 126.98),
    zoom: 13
  });

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

  // ✅ 지도 이동 시 정류소 필터링 (줌 제한 포함)
  naver.maps.Event.addListener(map, 'idle', () => {
    if (map.getZoom() < 12) {
      clearStopMarkers();
      return;
    }
    filterStopsInView();
  });
});

// ✅ 시/도 변경 이벤트
document.getElementById("regionSelector").addEventListener("change", e => {
  const region = e.target.value;
  stopBusTracking();
  clearStopMarkers();
  if (region) {
    loadBusStopsByRegion(region);
  }
});