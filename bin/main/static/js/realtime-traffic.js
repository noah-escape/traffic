(() => {
  let trafficPolylines = [];
  let isTrafficVisible = false;

  // ✅ 현재 지도의 bbox 계산
  function getCurrentBbox() {
    const { x: minX, y: minY } = map.getBounds().getSW();
    const { x: maxX, y: maxY } = map.getBounds().getNE();
    const bbox = `${minX},${minY},${maxX},${maxY}`;
    console.log("📦 현재 bbox:", bbox);
    return bbox;
  }

  // ✅ 교통 데이터 로딩
  function loadRealTimeTraffic() {
    const bbox = getCurrentBbox();

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

  // ✅ 교통 선 제거
  function clearRealTimeTraffic() {
    trafficPolylines.forEach(p => p.setMap(null));
    trafficPolylines = [];
  }

  // ✅ 도로 선 그리기
  function drawTrafficSegment(segment) {
    const coords = segment.geometry?.coordinates;
    const speed = segment.speed;

    if (!Array.isArray(coords) || !speed) {
      console.warn("❌ 좌표 또는 속도 없음:", segment);
      return;
    }

    const path = coords.map(([lng, lat]) => new naver.maps.LatLng(lat, lng));
    if (!path.length) return;

    const polyline = new naver.maps.Polyline({
      map,
      path,
      strokeColor: getTrafficColor(speed),
      strokeWeight: 6,
      strokeOpacity: 0.9
    });

    const infoWindow = new naver.maps.InfoWindow({
      content: `<div style="padding:6px;">🚗 평균속도: ${speed}km/h</div>`
    });

    naver.maps.Event.addListener(polyline, 'mouseover', () => {
      infoWindow.setPosition(path[Math.floor(path.length / 2)]);
      infoWindow.open(map);
    });

    naver.maps.Event.addListener(polyline, 'mouseout', () => infoWindow.close());

    trafficPolylines.push(polyline);
  }

  // ✅ 속도 → 색상
  function getTrafficColor(speed) {
    return speed > 60 ? "#00C851" : speed > 30 ? "#ffbb33" : "#ff4444";
  }

  // ✅ UI 버튼 처리
  document.addEventListener("DOMContentLoaded", () => {
    const trafficBtn = document.getElementById("sidebarTrafficBtn");
    const legendBox = document.getElementById("trafficLegendBox");

    if (!trafficBtn) return;

    trafficBtn.addEventListener("click", () => {
      isTrafficVisible = !isTrafficVisible;

      if (isTrafficVisible) {
        loadRealTimeTraffic();
        trafficBtn.classList.add("active");
        legendBox && (legendBox.style.display = "block");
      } else {
        clearRealTimeTraffic();
        trafficBtn.classList.remove("active");
        legendBox && (legendBox.style.display = "none");
      }
    });
  });
})();
