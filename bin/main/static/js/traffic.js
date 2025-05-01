let map;
let busInterval = null;
let bikeRefreshTimeout = null;
let lastBikeRefreshTime = 0;

// 현재 사이드 패널 상태
let panelStates = {
  bus: false,
  bike: false,
  route: false,
  traffic: false,
  event: false,
  cctv: false
};

// 패널 및 영상창 초기화
function resetPanelsAndCloseVideo() {
  for (const k in panelStates) {
    panelStates[k] = false;
    document.getElementById(`sidebar${capitalize(k)}Btn`)?.classList.remove('active');
    document.getElementById(`${k}FilterPanel`)?.style.setProperty('display', 'none');
  }
  document.getElementById('eventListPanel')?.style.setProperty('display', 'none');
  hideVideoContainer();
}

// 영상창 닫기
function hideVideoContainer() {
  const container = document.getElementById('videoContainer');
  if (container) container.style.display = 'none';
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOMContentLoaded');

  updatePanelVars();
  adjustMapSizeToSidebar(); // 🔥 초기 사이즈 조정

  map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(37.5665, 126.9780),
    zoom: 14
  });
  window.map = map;

  // ✅ 지도 로딩 시 전국 CCTV 데이터 preload
  if (window.preloadAllCctvs) {
    console.log('✅ 전국 CCTV 데이터 preload 시작');
    window.preloadAllCctvs();
  } else {
    console.warn('⚠️ preloadAllCctvs가 아직 준비되지 않았습니다.');
  }

  // 사이드바 버튼 핸들링
  const sidebarCctvBtn = document.getElementById('sidebarCctvBtn');
  sidebarCctvBtn.addEventListener('click', () => {
    const panel = document.getElementById('cctvFilterPanel');
    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
    if (panel.style.display === 'flex') {
      window.loadRoadList();
    } else {
      window.clearCctvMarkers();
      window.hideVideo();
    }
  });

  // 버튼별 기능 정의
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
        window.loadRealTimeTraffic?.();
        document.getElementById('trafficLegendBox')?.style.setProperty('display', 'block');
      },
      onDeactivate: () => {
        window.clearRealTimeTraffic?.();
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
    }
  ];

  // 버튼 핸들링 및 사이즈 조절
  buttonConfigs.forEach(({ id, key, panelId, onActivate, onDeactivate }) => {
    const button = document.getElementById(id);
    if (!button) return;

    button.addEventListener('click', () => {
      const isActivating = !panelStates[key];

      resetPanelsAndCloseVideo();
      buttonConfigs.forEach(conf => conf.onDeactivate?.());

      // ✅ 팝업 확실히 제거
      if (window.routeClickInfoWindow) {
        window.routeClickInfoWindow.setMap(null);
        window.routeClickInfoWindow = null;
      }

      if (isActivating) {
        panelStates[key] = true;
        button.classList.add('active');
        const panel = document.getElementById(panelId);
        if (panel) {
          panel.style.display = 'flex';
        }
        onActivate?.();
      }

      adjustMapSizeToSidebar(); // 🔥 패널 상태에 따라 지도 크기 재조정

      setTimeout(() => {
        naver.maps.Event.trigger(map, 'resize');
      }, 300);
    });
  });

  // 지도 이동 시 따릉이 자동 갱신
  naver.maps.Event.addListener(map, 'idle', () => {
    if (!panelStates.bike) return;
    const now = Date.now();
    const elapsed = now - lastBikeRefreshTime;
    if (elapsed < 5000) return;

    clearTimeout(bikeRefreshTimeout);
    bikeRefreshTimeout = setTimeout(() => {
      window.loadBikeStations?.();
      lastBikeRefreshTime = Date.now();
    }, 500);
  });

  // 모바일 메뉴 열림 감지 시 지도 사이즈 재조정
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenu) {
    new MutationObserver(() => {
      adjustMapSizeToSidebar();
      setTimeout(() => {
        naver.maps.Event.trigger(map, 'resize');
      }, 300);
    }).observe(mobileMenu, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }
});

// 문자열 첫 글자 대문자
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// 네브바 높이 갱신
function updatePanelVars() {
  const navbar = document.querySelector('nav.navbar');
  if (!navbar) return;
  const navHeight = navbar.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--navbar-height', `${navHeight}px`);
}

// 사이드바 + 네브바 크기에 맞춰 지도 크기 조절
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

// 초기 세팅
window.addEventListener('load', () => {
  updatePanelVars();
  adjustMapSizeToSidebar();
});
window.addEventListener('resize', () => {
  updatePanelVars();
  adjustMapSizeToSidebar();
});

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

  // 지도 리사이즈 적용
  setTimeout(() => {
    naver.maps.Event.trigger(map, 'resize');
  }, 100);
}

window.addEventListener('DOMContentLoaded', updateLayoutVars);
window.addEventListener('resize', updateLayoutVars);

// 게시판 드롭다운 등 메뉴 펼쳐짐 감지
document.querySelectorAll('.navbar-collapse')
  .forEach(el => el.addEventListener('transitionend', updateLayoutVars));

function adjustMapHeight() {
  const navbar = document.querySelector('.navbar');
  const map = document.getElementById('map');
  const navbarHeight = navbar.offsetHeight;
  map.style.height = `calc(100vh - ${navbarHeight}px)`;
}

document.addEventListener('DOMContentLoaded', () => {
  adjustMapHeight();
  window.addEventListener('resize', adjustMapHeight);
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
  dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      setTimeout(adjustMapHeight, 300);
    });
  });
});
