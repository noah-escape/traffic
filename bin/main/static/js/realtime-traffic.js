(() => {
  let trafficPolylines = [];         // 🚦 지도에 표시된 교통 Polyline 저장 배열
  let isTrafficVisible = false;     // 🚦 실시간 교통 표시 여부 플래그

  // ✅ 지도 범위 기반 bbox 문자열 생성 함수
  function getCurrentBbox() {
    const bounds = map.getBounds();
    const sw = bounds.getSW(); // 남서쪽
    const ne = bounds.getNE(); // 북동쪽
    const bbox = `${sw.x},${sw.y},${ne.x},${ne.y}`;
    console.log("📦 현재 bbox:", bbox); // ⬅ 이거 찍어줘
    return bbox;
  }  

  // ✅ 현재 bbox 기준 실시간 교통 데이터 요청 & 지도에 선 그리기
  function loadRealTimeTraffic() {
    const bbox = getCurrentBbox(); // 지도의 현재 범위 계산

    fetch(`/api/proxy/traffic-data?bbox=${bbox}`)
      .then(res => res.json())
      .then(data => {
        const segments = data?.response?.body?.items?.item || [];
        console.log("✅ 교통 세그먼트 수:", segments.length);
        console.log("🧪 예시 데이터:", segments[0]);
        segments.forEach(drawTrafficSegment);
      })
      .catch(err => {
        console.error("❌ 실시간 교통 데이터 오류:", err);
      });
  }

  // ✅ 지도 위 실시간 교통 선들 모두 제거
  function clearRealTimeTraffic() {
    trafficPolylines.forEach(p => p.setMap(null));
    trafficPolylines = [];
  }

  // ✅ 각 도로 구간(Polyline) 그리기
  function drawTrafficSegment(segment) {
    const coords = segment.geometry?.coordinates;
    const speed = segment.speed;

    if (!coords || !Array.isArray(coords)) {
      console.warn("❌ 좌표 없음:", segment);
      return;
    }

    const path = coords.map(([lng, lat]) => new naver.maps.LatLng(lat, lng));

    if (!path.length || !speed) {
      console.warn("❌ path 또는 speed 없음", segment);
      return;
    }

    const polyline = new naver.maps.Polyline({
      map,
      path,
      strokeColor: getTrafficColor(speed),  // 평균 속도에 따라 색상 지정
      strokeWeight: 6,
      strokeOpacity: 0.9
    });

    // ✅ 마우스 호버 시 속도 정보 InfoWindow 표시
    const infoWindow = new naver.maps.InfoWindow({
      content: `<div style="padding:6px;">🚗 평균속도: ${speed}km/h</div>`
    });

    naver.maps.Event.addListener(polyline, 'mouseover', () => {
      const mid = path[Math.floor(path.length / 2)];
      infoWindow.setPosition(mid);
      infoWindow.open(map);
    });

    naver.maps.Event.addListener(polyline, 'mouseout', () => {
      infoWindow.close();
    });

    trafficPolylines.push(polyline);
  }

  // ✅ 속도에 따라 선 색상 반환
  function getTrafficColor(speed) {
    if (speed > 60) return "#00C851";   // 빠름 (초록)
    if (speed > 30) return "#ffbb33";   // 보통 (주황)
    return "#ff4444";                   // 느림 (빨강)
  }

  // ✅ 실시간 교통 버튼 토글 이벤트 등록
  document.addEventListener("DOMContentLoaded", () => {
    const trafficBtn = document.getElementById("sidebarTrafficBtn");
    const legendBox = document.getElementById("trafficLegendBox");

    if (!trafficBtn) return;

    trafficBtn.addEventListener("click", () => {
      if (isTrafficVisible) {
        clearRealTimeTraffic();             // 끌 때 기존 선 제거
        trafficBtn.classList.remove("active");
        if (legendBox) legendBox.style.display = "none";
      } else {
        loadRealTimeTraffic();              // 켤 때 새로 데이터 로딩
        trafficBtn.classList.add("active");
        if (legendBox) legendBox.style.display = "block";
      }
      isTrafficVisible = !isTrafficVisible;
    });
  });
})();
