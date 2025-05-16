(() => {
  window.trafficLayer = null;

  const initTrafficLayer = () => {
    if (!window.map) return;

    // 최초 1회 레이어 생성
    if (!window.trafficLayer) {
      window.trafficLayer = new naver.maps.TrafficLayer({ interval: 300000 });
    }

    // ✅ maptype 변경 시 레이어 유지
    naver.maps.Event.addListener(window.map, 'maptype_changed', () => {
      if (window.trafficLayer?.getMap()) {
        window.trafficLayer.setMap(null);
        window.trafficLayer.setMap(window.map);
      }
    });

    // ✅ 줌 변경 시 레벨 안내
    naver.maps.Event.addListener(window.map, 'zoom_changed', () => {
      const zoom = window.map.getZoom();
      if (window.trafficLayer?.getMap() && zoom > 14) {
        console.warn("⚠️ 교통 정보는 너무 확대하면 안 보일 수 있습니다 (현재 줌:", zoom, ")");
      }
    });
  };

  // window.map 이 준비되면 init 실행
  document.addEventListener("DOMContentLoaded", () => {
    const wait = setInterval(() => {
      if (window.map) {
        clearInterval(wait);
        initTrafficLayer();
      }
    }, 100);
  });
})();
