let map;
let busInterval = null;
let bikeRefreshTimeout = null;
let lastBikeRefreshTime = 0;

let panelStates = {
  bus: false,
  bike: false,
  route: false,
  traffic: false,
  event: false,
  cctv: false,
  subway: false
};

function resetPanelsAndCloseVideo() {
  for (const k in panelStates) {
    panelStates[k] = false;
    document.getElementById(`sidebar${capitalize(k)}Btn`)?.classList.remove('active');
    document.getElementById(`${k}FilterPanel`)?.style.setProperty('display', 'none');
  }
  document.getElementById('eventListPanel')?.style.setProperty('display', 'none');
  hideVideoContainer();
}

function hideVideoContainer() {
  const container = document.getElementById('videoContainer');
  if (container) container.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  updatePanelVars();
  adjustMapSizeToSidebar();

  map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(37.5700, 127.0100),
    zoom: 14,
    mapTypeControl: false,
    scrollWheel: true,
    zoomControl: false
  });
  window.map = map;

  // ✅ 지도 타입 버튼
  document.querySelectorAll('#mapTypeControl .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      switch (type) {
        case 'NORMAL':
          map.setMapTypeId(naver.maps.MapTypeId.NORMAL);
          break;
        case 'SATELLITE':
          map.setMapTypeId(naver.maps.MapTypeId.SATELLITE);
          break;
        case 'HYBRID':
          map.setMapTypeId(naver.maps.MapTypeId.HYBRID);
          break;
      }
      document.querySelectorAll('#mapTypeControl .btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const zoomSlider = document.getElementById('zoomSlider');

  function updateZoomSliderFromMap() {
    const zoom = map.getZoom();
    zoomSlider.value = 26 - zoom; // ✅ 반전: min+max = 26
  }

  zoomSlider.addEventListener('input', () => {
    const reversedZoom = 26 - parseInt(zoomSlider.value); // ✅ 반전
    map.setZoom(reversedZoom);
  });

  document.getElementById('zoomInBtn').addEventListener('click', () => {
    const z = Math.min(20, map.getZoom() + 1);
    map.setZoom(z);
    updateZoomSliderFromMap();
  });

  document.getElementById('zoomOutBtn').addEventListener('click', () => {
    const z = Math.max(6, map.getZoom() - 1);
    map.setZoom(z);
    updateZoomSliderFromMap();
  });

  naver.maps.Event.addListener(map, 'zoom_changed', updateZoomSliderFromMap);

  // 초기화
  zoomSlider.min = 6;
  zoomSlider.max = 20;
  updateZoomSliderFromMap();

  // ✅ CCTV 패널
  let cctvLoaded = false;
  const sidebarCctvBtn = document.getElementById('sidebarCctvBtn');
  sidebarCctvBtn?.addEventListener('click', () => {
    const panel = document.getElementById('cctvFilterPanel');
    if (!panel) return;

    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
    if (panel.style.display === 'flex') {
      if (!cctvLoaded && window.preloadAllCctvs) {
        window.preloadAllCctvs();
        cctvLoaded = true;
      }
      window.loadRoadList?.();
    } else {
      window.clearCctvMarkers?.();
      window.hideVideo?.();
    }
  });

  // ✅ 패널 버튼 등록
  const buttonConfigs = [
    {
      id: 'sidebarBusBtn',
      key: 'bus',
      panelId: 'busFilterPanel',
      onActivate: () => {
        window.loadBusPositions?.();
        busInterval = setInterval(window.loadBusPositions, 15000);
      },
      onDeactivate: () => {
        window.clearBusMarkers?.();
        clearInterval(busInterval);
        busInterval = null;
      }
    },
    {
      id: 'sidebarBikeBtn',
      key: 'bike',
      onActivate: () => {
        panelStates.bike = true;
        window.moveToMyLocation?.();
      },
      onDeactivate: () => {
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
        window.setStartToCurrentLocation?.();
        window.initRouteEvents?.();
      },
      onDeactivate: () => {
        window.clearRoute?.();
        window.clearRouteMarkers?.();
        window.removeRouteEvents?.();
      }
    },
    {
      id: 'sidebarTrafficBtn',
      key: 'traffic',
      onActivate: () => {
        if (!window.trafficLayer) {
          window.trafficLayer = new naver.maps.TrafficLayer({ interval: 300000 });
        }
        window.trafficLayer.setMap(map);
        document.getElementById('trafficLegendBox')?.style.setProperty('display', 'block');
      },
      onDeactivate: () => {
        window.trafficLayer?.setMap(null);
        document.getElementById('trafficLegendBox')?.style.setProperty('display', 'none');
      }
    },
    {
      id: 'sidebarEventBtn',
      key: 'event',
      onActivate: () => {
        panelStates.event = true;
        window.loadRoadEventsInView?.();
        document.getElementById('eventListPanel')?.style.setProperty('display', 'block');
      },
      onDeactivate: () => {
        window.clearEventMarkers?.();
        document.getElementById('eventListPanel')?.style.setProperty('display', 'none');
      }
    },
    {
      id: 'sidebarCctvBtn',
      key: 'cctv',
      panelId: 'cctvFilterPanel',
      onActivate: () => {
        window.applyCctvFilter?.();
      },
      onDeactivate: () => {
        window.clearCctvMarkers?.();
        const roadList = document.getElementById('roadList');
        if (roadList) roadList.innerHTML = '';
      }
    },
    {
      id: 'sidebarSubwayBtn',
      key: 'subway',
      panelId: 'subwayFilterPanel',
      onActivate: () => {
        window.subwayLayerVisible = true;
        Promise.all([
          window.generateSubwayGraph?.(),
          window.loadStationCoordMapFromJson?.()
        ]).then(([graph]) => {
          window.subwayGraph = graph;
          window.renderLineCheckboxes?.();
          window.loadSubwayStations?.();
        });
      },
      onDeactivate: () => {
        window.subwayLayerVisible = false;
        window.clearSubwayLayer?.();
        window.clearStationMarkers?.();
        clearInterval(window.subwayRefreshInterval);
        window.subwayRefreshInterval = null;
      }
    }
  ];

  // ✅ 버튼 클릭 등록
  buttonConfigs.forEach(({ id, key, panelId, onActivate, onDeactivate }) => {
    const button = document.getElementById(id);
    if (!button) return;

    button.addEventListener('click', () => {
      const isActivating = !panelStates[key];
      resetPanelsAndCloseVideo();
      buttonConfigs.forEach(conf => conf.onDeactivate?.());

      if (window.routeClickInfoWindow) {
        window.routeClickInfoWindow.setMap(null);
        window.routeClickInfoWindow = null;
      }

      if (isActivating) {
        panelStates[key] = true;
        button.classList.add('active');
        const panel = document.getElementById(panelId);
        if (panel) panel.style.display = 'flex';
        onActivate?.();
      }

      adjustMapSizeToSidebar();
      setTimeout(() => naver.maps.Event.trigger(map, 'resize'), 300);
    });
  });

  // ✅ 자전거 마커 지도 이동 시 debounce
  naver.maps.Event.addListener(map, 'idle', () => {
    if (!panelStates.bike) return;

    const now = Date.now();
    if (now - lastBikeRefreshTime < 5000) return;

    clearTimeout(bikeRefreshTimeout);
    bikeRefreshTimeout = setTimeout(() => {
      if (typeof window.loadBikeStations === 'function') {
        window.loadBikeStations();
        lastBikeRefreshTime = Date.now();
      }
    }, 500);
  });

  // ✅ 모바일 메뉴 토글 대응
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) {
    new MutationObserver(() => {
      adjustMapSizeToSidebar();
      setTimeout(() => naver.maps.Event.trigger(map, 'resize'), 300);
    }).observe(mobileMenu, { attributes: true, attributeFilter: ['class'] });
  }

  // ✅ URL param 패널 자동 열기
  const urlParams = new URLSearchParams(window.location.search);
  const autoPanelKey = urlParams.get('panel');
  if (autoPanelKey) {
    const autoBtn = document.getElementById(`sidebar${capitalize(autoPanelKey)}Btn`);
    if (autoBtn) setTimeout(() => autoBtn.click(), 400);
  }
});

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function updatePanelVars() {
  const navbar = document.querySelector('nav.navbar');
  if (!navbar) return;
  const navHeight = navbar.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--navbar-height', `${navHeight}px`);
}

function adjustMapSizeToSidebar() {
  const sidebar = document.querySelector('aside.sidebar');
  const mapElement = document.getElementById('map');
  const navbar = document.querySelector('.navbar');

  if (!sidebar || !mapElement || !navbar) return;

  const sidebarWidth = sidebar.offsetWidth;
  const navbarHeight = navbar.offsetHeight;

  mapElement.style.width = `calc(100vw - ${sidebarWidth}px)`;
  mapElement.style.height = `calc(100vh - ${navbarHeight}px)`;
}

function updateLayoutVars() {
  const navbar = document.querySelector('.navbar');
  const sidebar = document.querySelector('.sidebar');

  if (navbar) {
    const h = navbar.offsetHeight;
    document.documentElement.style.setProperty('--navbar-height', `${h}px`);
  }

  if (sidebar) {
    const w = sidebar.offsetWidth;
    document.documentElement.style.setProperty('--sidebar-width', `${w}px`);
  }

  setTimeout(() => naver.maps.Event.trigger(map, 'resize'), 100);
}

function adjustMapHeight() {
  const navbar = document.querySelector('.navbar');
  const map = document.getElementById('map');
  if (navbar && map) {
    const navbarHeight = navbar.offsetHeight;
    map.style.height = `calc(100vh - ${navbarHeight}px)`;
  }
}

window.addEventListener('load', () => {
  updatePanelVars();
  adjustMapSizeToSidebar();
});

window.addEventListener('resize', () => {
  updatePanelVars();
  adjustMapSizeToSidebar();
});

window.addEventListener('DOMContentLoaded', updateLayoutVars);
window.addEventListener('resize', updateLayoutVars);

document.querySelectorAll('.navbar-collapse')
  .forEach(el => el.addEventListener('transitionend', updateLayoutVars));

document.addEventListener('DOMContentLoaded', () => {
  adjustMapHeight();
  window.addEventListener('resize', adjustMapHeight);
  document.querySelectorAll('.dropdown-toggle')
    .forEach(toggle => toggle.addEventListener('click', () => {
      setTimeout(adjustMapHeight, 300);
    }));
});
