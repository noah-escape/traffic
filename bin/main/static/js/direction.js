let directionPolyline = null;
let directionInfoWindow = null;
let myLocationMarker = null;
let routeClickMarker = null;
let routeClickInfoWindow = null;
let routeActive = false;
let searchTimeout = null;
let startMarker = null;
let goalMarker = null;
let mapClickListener = null;

// ✅ 출발지 / 도착지 전역 상태
window.routeStart = { lat: null, lng: null, label: "내 위치" };
window.routeGoal = { lat: null, lng: null, label: "" };

// ✅ 현재 위치를 출발지로 초기화
window.setStartToCurrentLocation = function () {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    routeStart = { lat, lng, label: "내 위치" };
    document.getElementById('startPointLabel').value = "내 위치";

    const position = new naver.maps.LatLng(lat, lng);

    if (myLocationMarker) myLocationMarker.setMap(null);
    myLocationMarker = new naver.maps.Marker({
      position,
      map,
      icon: {
        content: `<div style="font-size: 24px;">🧍</div>`,
        anchor: new naver.maps.Point(12, 12)
      },
      title: "내 위치"
    });

    map.panTo(position);
  });
};

// ✅ 경로 클릭 이벤트
window.initRouteEvents = function () {
  if (mapClickListener) return; // 이미 등록됐으면 무시

  mapClickListener = naver.maps.Event.addListener(window.map, 'click', function (e) {
    const lat = e.coord.lat();
    const lng = e.coord.lng();
    showRouteChoice(lat, lng, "선택한 위치");
  });
};

// ✅ 이벤트 제거 함수도 추가
window.removeRouteEvents = function () {
  if (mapClickListener) {
    naver.maps.Event.removeListener(mapClickListener);
    mapClickListener = null;
  }
};

// ✅ 출/도 마커 선택 팝업
window.showRouteChoice = function (lat, lng, label) {
  if (routeClickMarker) routeClickMarker.setMap(null);
  if (routeClickInfoWindow) routeClickInfoWindow.close();

  const position = new naver.maps.LatLng(lat, lng);

  routeClickMarker = new naver.maps.Marker({ position, map });

  const content = `
    <div style="text-align:center; min-width:160px;">
      <strong>${label}</strong><br/>
      <button class="btn btn-sm btn-outline-success mt-2" onclick="setAsStart(${lat}, ${lng}, '${label}')">🚩 출발지로</button>
      <button class="btn btn-sm btn-outline-primary mt-1" onclick="setAsGoal(${lat}, ${lng}, '${label}')">🎯 도착지로</button>
    </div>
  `;

  routeClickInfoWindow = new naver.maps.InfoWindow({
    content,
    position,
    pixelOffset: new naver.maps.Point(0, -30)
  });

  routeClickInfoWindow.open(window.map, routeClickMarker);
  window.activeInfoWindow = routeClickInfoWindow;
};

// ✅ 경로 탐색
window.findDirection = function (startLat, startLng, goalLat, goalLng) {
  const url = `/api/proxy/naver-direction?startLat=${startLat}&startLng=${startLng}&goalLat=${goalLat}&goalLng=${goalLng}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const route = data?.route?.trafast?.[0];
      if (!route?.path) return alert("경로를 찾을 수 없습니다.");

      const path = route.path.map(([lng, lat]) => new naver.maps.LatLng(lat, lng));

      if (directionPolyline) directionPolyline.setMap(null);
      if (directionInfoWindow) directionInfoWindow.close();

      directionPolyline = new naver.maps.Polyline({
        path,
        map,
        strokeColor: '#0d6efd',
        strokeWeight: 6,
        strokeOpacity: 0.9
      });

      const mid = path[Math.floor(path.length / 2)];
      const durationMin = Math.round(route.summary.duration / 60000);

      directionInfoWindow = new naver.maps.InfoWindow({
        content: `<div style="padding:6px 12px;">🕒 예상 소요: <strong>${durationMin}분</strong></div>`,
        position: mid
      });

      directionInfoWindow.open(map);
      map.panTo(mid);
    })
    .catch(err => {
      console.error("❌ 경로 API 실패:", err);
      alert("경로를 가져올 수 없습니다.");
    });
};

// ✅ 출/도 설정
window.setAsStart = function (lat, lng, label) {
  if (startMarker) startMarker.setMap(null);

  routeStart = { lat, lng, label };
  document.getElementById('startPointLabel').value = label;

  startMarker = new naver.maps.Marker({
    position: new naver.maps.LatLng(lat, lng),
    map,
    icon: {
      content: `<div style="font-size: 32px;">🚩</div>`,
      anchor: new naver.maps.Point(16, 32)
    },
    title: "출발지"
  });

  tryFindRoute();
};

window.setAsGoal = function (lat, lng, label) {
  if (goalMarker) goalMarker.setMap(null);

  routeGoal = { lat, lng, label };
  document.getElementById('goalPointLabel').value = label;

  goalMarker = new naver.maps.Marker({
    position: new naver.maps.LatLng(lat, lng),
    map,
    icon: {
      content: `<div style="font-size: 32px;">🎯</div>`,
      anchor: new naver.maps.Point(16, 32)
    },
    title: "도착지"
  });

  if (!routeStart.lat || !routeStart.lng) {
    window.setStartToCurrentLocation(); // fallback
  }

  tryFindRoute();
};

// ✅ 경로 탐색 실행
function tryFindRoute() {
  if (routeStart.lat && routeGoal.lat) {
    findDirection(routeStart.lat, routeStart.lng, routeGoal.lat, routeGoal.lng);
    routeActive = true;
  }
}

// ✅ 경로 및 마커 초기화
window.clearRoute = function () {
  if (directionPolyline) directionPolyline.setMap(null);
  if (directionInfoWindow) directionInfoWindow.close();

  routeGoal = { lat: null, lng: null, label: "" };
  routeActive = false;
};

window.clearRouteMarkers = function () {
  if (startMarker) startMarker.setMap(null), startMarker = null;
  if (goalMarker) goalMarker.setMap(null), goalMarker = null;
  if (routeClickMarker) routeClickMarker.setMap(null), routeClickMarker = null;
  if (routeClickInfoWindow) routeClickInfoWindow.close(), routeClickInfoWindow = null;
};

window.resetRoutePanel = function () {
  clearRoute();
  clearRouteMarkers();

  document.getElementById('startPointLabel').value = '';
  document.getElementById('goalPointLabel').value = '';
  document.getElementById('startResultList').innerHTML = '';
  document.getElementById('goalResultList').innerHTML = '';
  document.getElementById('startResultList').style.display = 'none';
  document.getElementById('goalResultList').style.display = 'none';

  window.setStartToCurrentLocation();
};

// ✅ 자동완성
function setupAutoComplete(inputId, resultListId, isStart) {
  const input = document.getElementById(inputId);
  const resultList = document.getElementById(resultListId);

  input.addEventListener('input', function () {
    const keyword = this.value.trim();

    clearTimeout(searchTimeout);
    if (!keyword) {
      resultList.style.display = 'none';
      resultList.innerHTML = '';
      return;
    }

    searchTimeout = setTimeout(() => {
      fetch(`/api/proxy/kakao-place?query=${encodeURIComponent(keyword)}`)
        .then(res => res.json())
        .then(data => {
          const places = data.documents;
          resultList.innerHTML = '';

          if (!places.length) {
            resultList.style.display = 'none';
            return;
          }

          places.forEach(place => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.textContent = place.place_name;

            li.addEventListener('click', () => {
              const lat = parseFloat(place.y);
              const lng = parseFloat(place.x);
              const label = place.place_name;

              input.value = label;
              resultList.innerHTML = '';
              resultList.style.display = 'none';

              map.panTo(new naver.maps.LatLng(lat, lng));
              isStart ? setAsStart(lat, lng, label) : setAsGoal(lat, lng, label);
            });

            resultList.appendChild(li);
          });

          resultList.style.display = 'block';
        });
    }, 300);
  });
}

// ✅ 자동완성 바인딩
document.addEventListener("DOMContentLoaded", () => {
  setupAutoComplete('startPointLabel', 'startResultList', true);
  setupAutoComplete('goalPointLabel', 'goalResultList', false);
});
