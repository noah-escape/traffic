// 🚲 따릉이 마커 및 경로 관련 전역 상태
let bikeMarkers = [];
let allBikeStations = [];
let bikeRoutePolyline = null;
let bikeRouteLabel = null;
let isBikeRouting = false;

// 📌 사용자 위치 및 추천 대여소 관련 전역
window.userPositionMarker = null;
window.recommendedStation = null;
window.activeInfoWindow = null;
window.userLat = null;
window.userLng = null;
window.skipBikeRecommendation = false;

// ✅ 마커 및 경로 제거
window.clearBikeStations = function () {
  bikeMarkers.forEach(m => m.marker.setMap(null));
  bikeMarkers = [];

  if (window.activeInfoWindow) window.activeInfoWindow.close();
  window.activeInfoWindow = null;

  if (bikeRoutePolyline) bikeRoutePolyline.setMap(null);
  bikeRoutePolyline = null;

  if (bikeRouteLabel) bikeRouteLabel.close();
  bikeRouteLabel = null;
};

// ✅ 거리 계산 (Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

// ✅ 내 위치로 이동
window.moveToMyLocation = function (skipRecommendation = false) {
  if (!navigator.geolocation) return alert("위치 정보를 지원하지 않습니다.");

  navigator.geolocation.getCurrentPosition(pos => {
    window.userLat = pos.coords.latitude;
    window.userLng = pos.coords.longitude;

    const userPos = new naver.maps.LatLng(window.userLat, window.userLng);

    if (window.userPositionMarker) window.userPositionMarker.setMap(null);

    window.userPositionMarker = new naver.maps.Marker({
      position: userPos,
      map,
      icon: {
        url: '/image/my-marker.png', // 👉 여기에 네 이미지 경로 넣기
        size: new naver.maps.Size(44, 66),   // 👉 이미지 크기
        anchor: new naver.maps.Point(22, 22) // 👉 이미지 중심점
      },
      title: '내 위치',
      zIndex: 999
    });    

    map.panTo(userPos);
    window.skipBikeRecommendation = skipRecommendation;
  }, () => alert("위치 정보를 가져올 수 없습니다."));
};

// ✅ 추천 대여소 표시
window.recommendNearestStation = function () {
  if (!window.userLat || !window.userLng) return;

  const nearby = bikeMarkers
    .map(m => ({
      ...m,
      distance: getDistance(window.userLat, window.userLng, m.position.lat(), m.position.lng())
    }))
    .filter(m => m.distance <= 500)
    .sort((a, b) => a.distance - b.distance);

  if (!nearby.length) return alert('500m 이내에 추천 가능한 대여소가 없습니다.');

  const best = nearby[0];
  map.panTo(best.position);

  window.recommendedStation = {
    stationLatitude: best.position.lat(),
    stationLongitude: best.position.lng(),
    stationName: best.name,
    rackTotCnt: best.station.rackTotCnt,
    parkingBikeTotCnt: best.station.parkingBikeTotCnt,
    shared: best.station.shared
  };

  if (window.activeInfoWindow) window.activeInfoWindow.close();
  window.activeInfoWindow = null;

  showStationDetailPanel(
    `🚲 ${best.name}`,
    `잔여 자전거: ${best.station.parkingBikeTotCnt}대 / 거치대: ${best.station.rackTotCnt}대`,
    best.distance
  );
};

// ✅ 경로 안내
window.goToNaverRoute = function () {
  if (!navigator.geolocation) return alert("위치 정보를 지원하지 않습니다.");

  navigator.geolocation.getCurrentPosition(pos => {
    const userLat = pos.coords.latitude;
    const userLng = pos.coords.longitude;

    if (!window.recommendedStation) return alert('추천 대여소가 없습니다.');

    const { stationLatitude, stationLongitude } = window.recommendedStation;

    const apiUrl = `/api/proxy/naver-direction?startLat=${userLat}&startLng=${userLng}&goalLat=${stationLatitude}&goalLng=${stationLongitude}`;

    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        const route = data?.route?.trafast?.[0];
        if (!route?.path) return alert("경로를 불러올 수 없습니다.");

        isBikeRouting = true;

        const durationMin = Math.round(route.summary?.duration / 60000);
        const path = route.path.map(([lng, lat]) => new naver.maps.LatLng(lat, lng));

        bikeRoutePolyline = new naver.maps.Polyline({
          path,
          map,
          strokeColor: '#0d6efd',
          strokeWeight: 6,
          strokeOpacity: 0.9,
          strokeStyle: 'solid'
        });

        const mid = path[Math.floor(path.length / 2)];
        bikeRouteLabel = new naver.maps.InfoWindow({
          content: `<div style="font-size:14px; padding:6px 12px;">🕒 예상 소요시간: <strong>${durationMin}분</strong></div>`,
          position: mid,
          pixelOffset: new naver.maps.Point(0, -20),
          backgroundColor: '#fff',
          borderColor: '#0d6efd',
          borderWidth: 1
        });

        bikeRouteLabel.open(map);
        map.panTo(mid);

        bikeMarkers.forEach(b => {
          if (b.position.lat() !== stationLatitude || b.position.lng() !== stationLongitude) {
            b.marker.setMap(null);
          }
        });
      })
      .catch(err => {
        console.error("❌ 경로 불러오기 실패", err);
        alert("경로 안내에 실패했습니다.");
      });
  }, () => alert("위치 정보를 가져올 수 없습니다."));
};

// ✅ 경로 취소
window.cancelBikeRoute = function () {
  isBikeRouting = false;

  if (bikeRoutePolyline) bikeRoutePolyline.setMap(null);
  if (bikeRouteLabel) bikeRouteLabel.close();

  bikeRoutePolyline = null;
  bikeRouteLabel = null;
  if (window.activeInfoWindow) window.activeInfoWindow.close();
  window.activeInfoWindow = null;

  window.recommendedStation = null;

  window.clearBikeStations();
  window.moveToMyLocation();
};

// ✅ 따릉이 데이터 호출
window.loadBikeStations = function () {
  if (isBikeRouting) return;

  const pageUrls = [
    'http://openapi.seoul.go.kr:8088/75436b6c78776a643536507267774e/json/bikeList/1/1000/',
    // 'http://openapi.seoul.go.kr:8088/75436b6c78776a643536507267774e/json/bikeList/1001/2000/',
    // 'http://openapi.seoul.go.kr:8088/75436b6c78776a643536507267774e/json/bikeList/2001/3000/'
    // 필요 시 더 추가 가능
  ];

  Promise.all(pageUrls.map(url => fetch(url).then(res => res.json())))
    .then(results => {
      allBikeStations = results.flatMap(result => result?.rentBikeStatus?.row || []);
      window.renderVisibleBikeMarkers();
    })
    .catch(err => {
      console.error("❌ 따릉이 API 오류", err);
      alert('따릉이 데이터를 불러오는 중 오류가 발생했습니다.');
    });
};

// ✅ 마커 렌더링
window.renderVisibleBikeMarkers = function () {
  const bounds = map.getBounds();
  window.clearBikeStations();

  allBikeStations.forEach(station => {
    const lat = parseFloat(station.stationLatitude);
    const lng = parseFloat(station.stationLongitude);
    const name = station.stationName.replace(/^\d+\.\s*/, '');
    const bikeCount = parseInt(station.parkingBikeTotCnt);
    if (isNaN(lat) || isNaN(lng)) return;

    const position = new naver.maps.LatLng(lat, lng);
    if (!bounds.hasLatLng(position)) return;

    const defaultImageUrl =
      bikeCount === 0 ? '/image/bike-marker-red.png' :
        bikeCount <= 5 ? '/image/bike-marker-yellow.png' :
          '/image/bike-marker-green.png';

    const hoverImageUrl = `/image/bike-hover/bike-hover-${bikeCount > 9 ? '9plus' : bikeCount}.png`;

    const imageSize = new naver.maps.Size(44, 70);
    const imageAnchor = new naver.maps.Point(22, 70);

    const marker = new naver.maps.Marker({
      position,
      map,
      icon: { url: defaultImageUrl, size: imageSize, anchor: imageAnchor },
      title: name
    });

    const hoverInfoWindow = new naver.maps.InfoWindow({
      content: `<div style="padding:5px; font-size:13px;">${name}</div>`,
      backgroundColor: "#fff",
      borderColor: "#999",
      borderWidth: 1,
      disableAnchor: true
    });

    naver.maps.Event.addListener(marker, 'mouseover', () => {
      hoverInfoWindow.open(map, marker);
      marker.setIcon({ url: hoverImageUrl, size: imageSize, anchor: imageAnchor });
    });

    naver.maps.Event.addListener(marker, 'mouseout', () => {
      hoverInfoWindow.close();
      marker.setIcon({ url: defaultImageUrl, size: imageSize, anchor: imageAnchor });
    });

    naver.maps.Event.addListener(marker, 'click', () => {
      window.recommendedStation = {
        stationLatitude: lat,
        stationLongitude: lng,
        stationName: name,
        rackTotCnt: station.rackTotCnt,
        parkingBikeTotCnt: station.parkingBikeTotCnt,
        shared: station.shared
      };

      showStationDetailPanel(
        `🚲 ${name}`,
        `잔여 자전거: ${station.parkingBikeTotCnt}대 / 거치대: ${station.rackTotCnt}대`
      );

      if (window.activeInfoWindow) window.activeInfoWindow.close();
      window.activeInfoWindow = null;
    });

    bikeMarkers.push({ marker, name, position, bikeCount, station });
  });
};

// ✅ 패널 열기
function showStationDetailPanel(name, info, distance = null) {
  const panel = document.getElementById("stationDetailPanel");
  if (!panel) return console.warn("⛔ stationDetailPanel 요소 없음");

  document.getElementById("detailStationName").textContent = name;
  document.getElementById("detailStationInfo").textContent = info;

  document.getElementById("detailStationDistance").textContent =
    distance !== null ? `거리: ${Math.round(distance)}m` : "";

  panel.style.display = "block";
}

// ✅ 패널 닫기
function hideStationDetailPanel() {
  const panel = document.getElementById("stationDetailPanel");
  if (panel) panel.style.display = "none";
}

// ✅ 즉시 실행 - 버튼 리스너 등록
(() => {
  document.getElementById("moveToMyLocation")?.addEventListener("click", () => {
    window.moveToMyLocation();
  });

  document.getElementById("recommendBtn")?.addEventListener("click", () => {
    if (!window.userLat || !window.userLng) {
      alert("먼저 위치를 불러와 주세요.");
      return;
    }
    window.recommendNearestStation();
  });

  document.getElementById("closeDetailPanel")?.addEventListener("click", () => {
    hideStationDetailPanel();
  });

  const sidebarButtons = document.querySelectorAll(".sidebar button");
  sidebarButtons.forEach(button => {
    button.addEventListener("click", () => {
      hideStationDetailPanel();
    });
  });
})();
