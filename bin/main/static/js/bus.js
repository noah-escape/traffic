let busMarkers = []; // 🔸 지도 위 버스 마커 저장용 배열
let busTimer = null; // 🔸 갱신 타이머

// 🔹 기존 마커 제거
function clearBusMarkers() {
  busMarkers.forEach(marker => marker.setMap(null));
  busMarkers = [];
}

// 🔹 버스 위치 조회 및 지도에 마커 표시
function showBusPositions(routeId) {
  const url = `/api/proxy/busPos?routeId=${routeId}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const buses = data?.msgBody?.itemList ?? [];

      if (buses.length === 0) {
        console.warn("📭 실시간 버스 데이터 없음");
        clearBusMarkers();
        return;
      }

      clearBusMarkers(); // ✅ 이전 마커 제거

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
              url: 'https://cdn-icons-png.flaticon.com/512/61/61211.png',
              size: new naver.maps.Size(40, 40),
              anchor: new naver.maps.Point(20, 20)
            }
          });

          const info = new naver.maps.InfoWindow({
            content: `<div style="padding:6px;">🚌 차량번호: ${carNo}</div>`
          });

          naver.maps.Event.addListener(marker, 'click', () => {
            info.open(map, marker);
          });

          busMarkers.push(marker); // ✅ 마커 저장
        }
      });
    })
    .catch(err => {
      console.error("❌ 버스 위치 불러오기 실패", err);
    });
}

// 🔹 주기적 갱신 트래킹 시작
function startBusTracking(routeId) {
  if (busTimer) clearInterval(busTimer); // 이전 타이머 제거
  showBusPositions(routeId);              // 최초 호출
  busTimer = setInterval(() => showBusPositions(routeId), 10000); // 10초마다 호출
}

// 🔹 버튼 클릭 시 특정 노선 추적 시작
document.getElementById('sidebarBusBtn').addEventListener('click', () => {
  const defaultRouteId = '100100118'; // 🚍 예시: 100번 (강남역-숭례문)
  startBusTracking(defaultRouteId);
});
