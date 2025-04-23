let map;
let busInterval = null;
let bikeRefreshTimeout = null;
let lastBikeRefreshTime = 0;

// ✅ 각 사이드 패널 상태 추적
let panelStates = {
  bus: false,
  bike: false,
  route: false,
  traffic: false
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOMContentLoaded');

  // ✅ 네이버 지도 초기화
  map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(37.5665, 126.9780),
    zoom: 14
  });
  window.map = map;

  // ✅ 버튼별 기능 구성
  const buttonConfigs = [
    {
      id: 'sidebarBusBtn',
      key: 'bus',
      panelId: 'busFilterPanel',
      onActivate: () => {
        console.log("🚌 버스 ON");
        window.loadBusPositions?.();
        busInterval = setInterval(window.loadBusPositions, 15000);
      },
      onDeactivate: () => {
        console.log("🚌 버스 OFF");
        window.clearBusMarkers?.();
        clearInterval(busInterval);
        busInterval = null;
      }
    },
    {
      id: 'sidebarBikeBtn',
      key: 'bike',
      onActivate: () => {
        console.log("🚲 따릉이 ON");
        panelStates.bike = true; // ✅ 지도 idle 시 조건에 꼭 필요
        window.moveToMyLocation?.();
      },
      onDeactivate: () => {
        console.log("🚲 따릉이 OFF");
        panelStates.bike = false; // ✅ 상태를 false로 설정 안 하면 지도 idle에서 계속 실행됨
        window.clearBikeStations?.();
        if (window.userPositionMarker) {
          window.userPositionMarker.setMap(null);
          window.userPositionMarker = null;
        }
      }
    },
    {
      id: 'sidebarRouteBtn',
      key: 'route',
      panelId: 'routeFilterPanel',
      onActivate: () => {
        console.log("🚶‍➡️ 경로 ON");
        window.setStartToCurrentLocation?.();
        window.initRouteEvents?.();
      },
      onDeactivate: () => {
        console.log("🚶‍➡️ 경로 OFF");
        window.clearRoute?.();
        window.clearRouteMarkers?.();
        window.removeRouteEvents?.();
      }
    },
    {
      id: 'sidebarTrafficBtn',
      key: 'traffic',
      onActivate: () => {
        console.log("🚦 실시간 교통 ON");
        window.loadRealTimeTraffic?.();
        const legendBox = document.getElementById('trafficLegendBox');
        if (legendBox) legendBox.style.display = 'block';
      },
      onDeactivate: () => {
        console.log("🚦 실시간 교통 OFF");
        window.clearRealTimeTraffic?.();
        const legendBox = document.getElementById('trafficLegendBox');
        if (legendBox) legendBox.style.display = 'none'; // ✅ 여기 추가!
      }
    },
    {
      id: 'sidebarEventBtn',
      key: 'event',
      onActivate: () => {
        console.log("📍 도로 이벤트 ON");
        panelStates.event = true;
        window.loadRoadEventsInView?.(); // ✅ 지도 기준으로 호출
        document.getElementById('eventListPanel').style.display = 'block';
      },
      onDeactivate: () => {
        console.log("📍 도로 이벤트 OFF");
        window.clearEventMarkers?.();
        document.getElementById('eventListPanel').style.display = 'none';
      }
    }    
  ];

  // ✅ 모든 사이드 버튼 공통 처리
  buttonConfigs.forEach(({ id, key, panelId, onActivate, onDeactivate }) => {
    const button = document.getElementById(id);
    if (!button) return;

    button.addEventListener('click', () => {
      const isActivating = !panelStates[key];

      // ✅ CCTV 패널은 항상 OFF
      const cctvPanel = document.getElementById('cctvFilterPanel');
      if (cctvPanel) cctvPanel.style.display = 'none';
      window.clearCctvMarkers?.();
      document.getElementById('roadSearchInput').value = '';
      document.getElementById('roadList').innerHTML = '';

      // ✅ 모든 패널 상태 false 및 비활성화 처리
      for (const k in panelStates) {
        panelStates[k] = false;
        document.getElementById(`sidebar${capitalize(k)}Btn`)?.classList.remove('active');
        const pnl = document.getElementById(`${k}FilterPanel`);
        if (pnl) pnl.style.display = 'none';
      }

      // ✅ 모든 기능 해제
      buttonConfigs.forEach(conf => conf.onDeactivate?.());

      // ✅ 클릭한 버튼만 ON 처리
      if (isActivating) {
        panelStates[key] = true;
        button.classList.add('active');
        const panel = document.getElementById(panelId);
        if (panel) panel.style.display = 'block';
        onActivate?.();
      }
    });
  });

  // ✅ CCTV는 독립적이며 토글 방식
  document.getElementById('sidebarCctvBtn')?.addEventListener('click', () => {
    const panel = document.getElementById('cctvFilterPanel');
    const isVisible = getComputedStyle(panel).display !== 'none';
    panel.style.display = isVisible ? 'none' : 'flex';

    if (!isVisible) {
      window.applyCctvFilter?.();
    } else {
      window.clearCctvMarkers?.();
      document.getElementById('roadSearchInput').value = '';
      document.getElementById('roadList').innerHTML = '';
    }

    // ✅ 여기도 bike 끄기 강제 보장
    panelStates.bike = false;
    window.clearBikeStations?.();
    if (window.userPositionMarker) {
      window.userPositionMarker.setMap(null);
      window.userPositionMarker = null;
    }
  });

  // ✅ 지도 이동 시 따릉이 자동 새로고침 (디바운스)
  naver.maps.Event.addListener(map, 'idle', () => {
    if (!panelStates.bike) return;

    const now = Date.now();
    const elapsed = now - lastBikeRefreshTime;

    if (elapsed < 5000) return;
    clearTimeout(bikeRefreshTimeout);

    bikeRefreshTimeout = setTimeout(() => {
      console.log("🚲 지도 이동에 따라 따릉이 새로고침");
      window.loadBikeStations?.();
      lastBikeRefreshTime = Date.now();
    }, 500);
  });

  // ✅ CCTV 영상 제어
  document.getElementById('closeVideoBtn')?.addEventListener('click', () => {
    window.hideVideo?.();
  });

  document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
    document.getElementById('cctvVideo')?.requestFullscreen?.();
  });

  document.getElementById('openNewTabBtn')?.addEventListener('click', () => {
    const videoUrl = window.currentVideoUrl;
    const title = document.getElementById('videoTitle')?.textContent || 'CCTV';
    if (!videoUrl) return;

    const encodedUrl = encodeURIComponent(videoUrl);

    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(`
      <html><head><title>${title}</title>
      <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
      <style>body{margin:0;background:#000;} video{width:100%;height:100vh;object-fit:contain;}</style>
      </head><body>
      <video id="video" controls autoplay muted></video>
      <script>
        const video = document.getElementById('video');
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource('${encodedUrl}');
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = '${encodedUrl}';
          video.play();
        }
      </script></body></html>
    `);
  });
});

// ✅ 문자열 첫 글자 대문자 변환
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
