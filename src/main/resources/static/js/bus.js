let busStopMarkers = [];
window.activeInfoWindow = null;

// ✅ 마커 초기화
window.clearBusStopMarkers = function () {
  busStopMarkers.forEach(m => m.setMap(null));
  busStopMarkers = [];

  if (window.activeInfoWindow) {
    window.activeInfoWindow.close();
    window.activeInfoWindow = null;
  }
};

// ✅ 버스 정류장 검색
window.searchBusStops = function () {
  console.log("🚏 정류장 검색 함수 실행됨!");

  const input = document.getElementById("busStopInput");
  if (!input) return alert("검색 입력 필드를 찾을 수 없습니다.");
  const keyword = input.value.trim();
  if (!keyword) return alert("정류장 이름을 입력하세요!");

  const url = `/api/proxy/busStationList?keyword=${encodeURIComponent(keyword)}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      console.log("📡 버스 API 응답:", data);

      const raw = data?.msgBody?.itemList;
      const stations = Array.isArray(raw) ? raw : raw ? [raw] : [];

      if (stations.length === 0) {
        alert("검색 결과가 없습니다.");
        return;
      }

      window.clearBusStopMarkers();

      const bounds = new naver.maps.LatLngBounds();

      stations.forEach(stop => {
        const name = stop.stNm;
        const lat = parseFloat(stop.tmY);
        const lng = parseFloat(stop.tmX);
        const arsId = stop.arsId;

        if (isNaN(lat) || isNaN(lng)) return;

        const position = new naver.maps.LatLng(lat, lng);
        bounds.extend(position);

        const marker = new naver.maps.Marker({
          map,
          position,
          title: name,
          icon: {
            url: '/image/bus-stop.png',
            size: new naver.maps.Size(30, 40),
            anchor: new naver.maps.Point(15, 40)
          }
        });

        const info = new naver.maps.InfoWindow({
          content: `
            <div style="padding:6px 12px;">
              🚏 <strong>${name}</strong><br/>
              정류장번호: ${arsId}
            </div>
          `,
          position
        });

        naver.maps.Event.addListener(marker, 'click', () => {
          if (window.activeInfoWindow) window.activeInfoWindow.close();
          window.activeInfoWindow = info;
          info.open(map, marker);
        });

        busStopMarkers.push(marker);
      });

      // ✅ 전체 정류장이 보이도록 지도 조정
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
      }
    })
    .catch(err => {
      console.error("❌ 정류장 검색 실패", err);
      alert("정류장 검색 중 오류 발생");
    });
};
