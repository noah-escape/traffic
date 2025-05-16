(() => {
  window.trafficLayer = null;

  const initTrafficLayer = () => {
    const trafficBtn = document.getElementById("sidebarTrafficBtn");
    const legendBox = document.getElementById("trafficLegendBox");

    if (!trafficBtn || !window.map) return;

    // ✅ 지도 타입을 NORMAL로 고정
    window.map.setMapTypeId(naver.maps.MapTypeId.NORMAL);

    if (!window.trafficLayer) {
      window.trafficLayer = new naver.maps.TrafficLayer({
        interval: 300000 // 5분 자동 갱신
      });
    }

    trafficBtn.addEventListener("click", () => {
      const isOn = window.trafficLayer.getMap() !== null;
      console.log(`🛣️ 교통 레이어 상태: ${isOn ? '켜짐' : '꺼짐'}`);

      if (isOn) {
        window.trafficLayer.setMap(null);
        trafficBtn.classList.remove("active");
        legendBox?.style.setProperty("display", "none");
      } else {
        if (window.map.getZoom() > 13) {
          window.map.setZoom(13); // ✅ 너무 확대되면 안 보이므로 조정
        }

        window.map.setMapTypeId(naver.maps.MapTypeId.NORMAL); // ✅ 타입도 다시 보정
        window.trafficLayer.setMap(window.map);
        trafficBtn.classList.add("active");
        legendBox?.style.setProperty("display", "block");
      }
    });

    // ✅ 지도 타입 변경 시 교통 레이어 다시 적용
    naver.maps.Event.addListener(window.map, 'maptype_changed', () => {
      if (window.trafficLayer?.getMap()) {
        window.trafficLayer.setMap(null);
        window.trafficLayer.setMap(window.map);
      }
    });

    // ✅ 줌 변경 시 경고 또는 재적용 유도
    naver.maps.Event.addListener(window.map, 'zoom_changed', () => {
      const zoom = window.map.getZoom();
      if (window.trafficLayer?.getMap() && zoom > 14) {
        console.warn("⚠️ 줌이 너무 커서 교통 정보가 희미하거나 보이지 않을 수 있습니다:", zoom);
      }
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    const waitForMap = setInterval(() => {
      if (window.map) {
        clearInterval(waitForMap);
        initTrafficLayer();
      }
    }, 100);
  });
})();
