let map;
let busInterval = null;
let bikeRefreshTimeout = null;
let lastBikeRefreshTime = 0;

// ✅ 사이드 패널 상태 (이제 'cctv'도 포함!)
let panelStates = {
  bus: false,
  bike: false,
  route: false,
  traffic: false,
  event: false,
  cctv: false // ✅ 추가!
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOMContentLoaded');

  updatePanelVars();
  window.addEventListener('resize', updatePanelVars);

  map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(37.5665, 126.9780),
    zoom: 14
  });
  window.map = map;

  // ✅ 버튼 기능 정의
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
        panelStates.bike = true;
        window.moveToMyLocation?.();
      },
      onDeactivate: () => {
        console.log("🚲 따릉이 OFF");
        panelStates.bike = false;
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
        if (legendBox) legendBox.style.display = 'none';
      }
    },
    {
      id: 'sidebarEventBtn',
      key: 'event',
      onActivate: () => {
        console.log("📍 도로 이벤트 ON");
        panelStates.event = true;
        window.loadRoadEventsInView?.();
        document.getElementById('eventListPanel').style.display = 'block';
      },
      onDeactivate: () => {
        console.log("📍 도로 이벤트 OFF");
        window.clearEventMarkers?.();
        document.getElementById('eventListPanel').style.display = 'none';
      }
    },
    {
      id: 'sidebarCctvBtn',
      key: 'cctv',
      panelId: 'cctvFilterPanel',
      onActivate: () => {
        console.log("🎥 CCTV ON");
        window.applyCctvFilter?.();
      },
      onDeactivate: () => {
        console.log("🎥 CCTV OFF");
        window.clearCctvMarkers?.();
        document.getElementById('roadSearchInput').value = '';
        document.getElementById('roadList').innerHTML = '';
      }
    }
  ];

  // ✅ 버튼 공통 처리
  buttonConfigs.forEach(({ id, key, panelId, onActivate, onDeactivate }) => {
    const button = document.getElementById(id);
    if (!button) return;

    button.addEventListener('click', () => {
      const isActivating = !panelStates[key];

      // ✅ 모든 패널/버튼 초기화
      for (const k in panelStates) {
        panelStates[k] = false;
        document.getElementById(`sidebar${capitalize(k)}Btn`)?.classList.remove('active');
        const pnl = document.getElementById(`${k}FilterPanel`);
        if (pnl) pnl.style.display = 'none';
      }

      buttonConfigs.forEach(conf => conf.onDeactivate?.());

      if (isActivating) {
        panelStates[key] = true;
        button.classList.add('active');
        const panel = document.getElementById(panelId);
        if (panel) panel.style.display = 'flex';
        onActivate?.();
      }
    });
  });

  // ✅ 지도 이동 시 따릉이 자동 새로고침
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

  // ✅ CCTV 제어
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

// ✅ 유틸 함수
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function updatePanelVars() {
  const navbar = document.querySelector('nav.navbar');
  if (!navbar) return;

  const navHeight = navbar.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--navbar-height', `${navHeight}px`);
  console.log(`📐 네브바 높이 동기화: ${navHeight}px`);
}

window.addEventListener('load', updatePanelVars);
window.addEventListener('resize', updatePanelVars);

const navbar = document.querySelector('nav.navbar');
if (navbar) {
  const observer = new MutationObserver(() => {
    updatePanelVars();
  });

  observer.observe(navbar, {
    childList: true,
    subtree: true,
    attributes: true,
  });
}
