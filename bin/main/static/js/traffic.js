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
  subway: false,
  parking: false,
  vsl: false
};

function clearAllMapMarkers() {
  window.clearBusMarkers?.();
  window.stopBusTracking?.();
  window.clearStopMarkers?.();
  window.clearRouteMarkers?.();
  window.clearRoute?.();
  window.clearRouteDisplay?.();
  window.removeRouteEvents?.();
  window.clearEventMarkers?.();
  window.closeAllCctvOverlays?.();
  window.clearCctvMarkers?.();
  window.hideVideo?.();
  window.clearParkingMarkers?.();
  window.hideParkingLegend?.();
  window.clearBikeStations?.();
  window.clearSubwayLayer?.();
  window.clearStationMarkers?.();
  window.clearVslPanel?.();
  window.hideVslMarkers()

  if (window.userPositionMarker) {
    window.userPositionMarker.setMap(null);
    window.userPositionMarker = null;
  }

  if (window.customMarkers && Array.isArray(window.customMarkers)) {
    window.customMarkers.forEach(marker => marker.setMap(null));
    window.customMarkers = [];
  }

  // console.log('🧹 모든 마커 제거 완료');
}

function resetPanelsAndCloseVideo() {
  // 🔄 모든 패널 상태 비활성화 및 UI 숨김
  for (const k in panelStates) {
    panelStates[k] = false;
    document.getElementById(`${k}FilterPanel`)?.style.setProperty('display', 'none');
  }

  document.getElementById('eventListPanel')?.style.setProperty('display', 'none');
  hideVideoContainer();

  // ✅ 길찾기 리소스 및 상태 초기화
  window.routeActive = false;
  window.popupLocked = false;

  if (window.mapClickListener) {
    naver.maps.Event.removeListener(window.mapClickListener);
    window.mapClickListener = null;
  }

  window.directionPolyline?.setMap(null);
  window.directionInfoWindow?.setMap(null);
  window.routeClickMarker?.setMap(null);
  window.routeClickInfoWindow?.setMap(null);
  window.startMarker?.setMap(null);
  window.goalMarker?.setMap(null);
  window.myLocationMarker?.setMap(null);
  window.userPositionMarker?.setMap(null);

  window.directionPolyline = null;
  window.directionInfoWindow = null;
  window.routeClickMarker = null;
  window.routeClickInfoWindow = null;
  window.startMarker = null;
  window.goalMarker = null;
  window.myLocationMarker = null;

  window.routeStart = { lat: null, lng: null, label: "내 위치" };
  window.routeGoal = { lat: null, lng: null, label: "" };

  // ✅ 마커 및 레이어 초기화
  clearAllMapMarkers();

  adjustLegendPositions();

  // 🗺️ 지도 중심 및 줌 초기화
  resetMapView();

  // 🚇 지하철 갱신 타이머 제거
  if (window.subwayRefreshInterval) {
    clearInterval(window.subwayRefreshInterval);
    window.subwayRefreshInterval = null;
  }

  // 🧾 노선 상세 팝업 숨김
  const popup = document.getElementById('routeDetailPopup');
  if (popup) popup.classList.add('d-none');

  // 🚌 버스 노선 상세 오프캔버스 닫기
  const routePanel = document.getElementById("busRoutePanel");
  if (routePanel && bootstrap?.Offcanvas?.getInstance(routePanel)) {
    bootstrap.Offcanvas.getInstance(routePanel).hide();
  }

  // ✅ 장소 리스트 초기화 (optional)
  const placeList = document.getElementById('nearbyPlaceList');
  if (placeList) placeList.innerHTML = '<div class="text-muted">장소를 검색하세요.</div>';
}

function resetMapView() {
  if (!window.map) return;

  setTimeout(() => {
    const seoul = new naver.maps.LatLng(37.5665, 126.9780);
    map.panTo(seoul); // 부드러운 이동
    map.setZoom(11);
  }, 300);
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

  // ✅ 최초 줌 상태 저장
  window.INITIAL_ZOOM = map.getZoom();

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
  document.getElementById('sidebarCctvBtn').addEventListener('click', () => {
    const panel = document.getElementById('cctvFilterPanel');
    if (!panel) return;

    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
    if (panel.style.display === 'flex') {
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
        resetPanelsAndCloseVideo();
        panelStates.bus = true;
        document.getElementById('busFilterPanel')?.style.setProperty('display', 'flex');
        window.resetBusPanel?.();
      },
      onDeactivate: () => {
        panelStates.bus = false;
        window.resetBusPanel?.();
      }
    },
    {
      id: 'sidebarBikeBtn',
      key: 'bike',
      onActivate: () => {
        resetPanelsAndCloseVideo();
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
        resetPanelsAndCloseVideo();
        panelStates.route = true;

        const panel = document.getElementById('routeFilterPanel');
        if (panel) {
          panel.style.display = 'flex';
          requestAnimationFrame(() => panel.classList.add('active'));
          panel.classList.remove('hidden');
        }

        window.setStartToCurrentLocation?.();
        window.initRouteEvents?.();

        const range = document.getElementById('radiusRange');
        if (range) updateRadiusLabel(range.value);

        const list = document.getElementById('nearbyPlaceList');
        if (list) list.innerHTML = '<div class="text-muted">카테고리를 선택하거나 원하는 장소를 검색하세요.</div>';
      },
      onDeactivate: () => {
        panelStates.route = false;

        const panel = document.getElementById('routeFilterPanel');
        if (panel) {
          panel.classList.add('hidden');
          setTimeout(() => {
            panel.classList.remove('active');
            panel.style.display = 'none';
          }, 300);
        }

        window.clearRoute?.();
        window.clearRouteMarkers?.();
        window.removeRouteEvents?.();
      }
    },
    {
      id: 'sidebarTrafficBtn',
      key: 'traffic',
      onActivate: () => {
        resetPanelsAndCloseVideo();
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
        resetPanelsAndCloseVideo();
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
        resetPanelsAndCloseVideo();
        panelStates.cctv = true;
        document.getElementById('cctvFilterPanel')?.style.setProperty('display', 'flex');
        window.loadRoadList?.();
      },
      onDeactivate: () => {
        panelStates.cctv = false;
        window.resetCctvPanel?.();
      }
    },
    {
      id: 'sidebarSubwayBtn',
      key: 'subway',
      panelId: 'subwayFilterPanel',
      onActivate: () => {
        resetPanelsAndCloseVideo();
        panelStates.subway = true;
        document.getElementById('subwayFilterPanel')?.style.setProperty('display', 'flex');
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
        panelStates.subway = false;
        window.subwayLayerVisible = false;
        window.clearSubwayLayer?.();
        window.clearStationMarkers?.();
        clearInterval(window.subwayRefreshInterval);
        window.subwayRefreshInterval = null;
      }
    },
    {
      id: 'sidebarParkingBtn',
      key: 'parking',
      panelId: 'parkingFilterPanel',
      onActivate: () => {
        resetPanelsAndCloseVideo();
        panelStates.parking = true;

        // 주차 패널 표시
        document.getElementById('parkingFilterPanel')?.style.setProperty('display', 'flex');

        // 주차 데이터 로드 및 위치 표시
        const promise = window.loadSeoulCityParking?.();
        window.showCurrentLocationOnMap?.();

        // 지도 리사이즈
        adjustMapSizeToSidebar();
        setTimeout(() => {
          naver.maps.Event.trigger(map, 'resize');
        }, 300);

        // ✅ 주차 범례 보이기
        document.getElementById('parkingLegendBox').style.display = 'block';

        // ✅ 위치 자동 조정
        adjustLegendPositions();

        return promise;
      },
      onDeactivate: () => {
        panelStates.parking = false;
        window.clearParkingMarkers?.();

        // ✅ 주차 범례 숨기기
        const parkingLegend = document.getElementById('parkingLegendBox');
        parkingLegend.style.display = 'none';

        // ✅ 위치 재조정: 교통 범례가 켜져 있으면 오른쪽으로 복귀
        setTimeout(() => {
          adjustLegendPositions();  // 💥 꼭 timeout 안에서 실행
        }, 10);
      }
    },
    {
      id: 'sidebarVslBtn',
      key: 'vsl',
      panelId: 'vslFilterPanel',
      onActivate: () => {
        document.getElementById("vslFilterPanel").style.display = "block";
        window.loadVslListPanel && window.loadVslListPanel();
      },
      onDeactivate: () => {
        document.getElementById("vslFilterPanel").style.display = "none";
        window.hideVslPanel && window.hideVslPanel();
      }
    }
  ];

  // ✅ 버튼 클릭 등록
  buttonConfigs.forEach(({ id, key, panelId, onActivate }) => {
    const button = document.getElementById(id);
    if (!button) return;

    button.addEventListener('click', () => {
      const isAlreadyActive = panelStates[key];

      // 패널 상태 및 UI 초기화
      resetPanelsAndCloseVideo();

      // 모든 버튼에서 .active 제거 (reset에서 하지 말고 여기서만!)
      document.querySelectorAll('.sidebar-button').forEach(btn => {
        btn.classList.remove('active');
      });

      if (!isAlreadyActive) {
        panelStates[key] = true;
        button.classList.add('active');
        onActivate?.();
      } else {
        panelStates[key] = false;
        onDeactivate?.();
      }
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

window.resetBusPanel = function () {
  // ⛔ 상태 초기화
  window.stopBusTracking?.();
  window.clearBusMarkers?.();
  window.clearStopMarkers?.();
  window.clearRouteDisplay?.();

  // 🔄 셀렉터 & 입력창 초기화
  const selector = document.getElementById('regionSelector');
  if (selector) selector.selectedIndex = 0;

  const input = document.getElementById('routeInput');
  if (input) input.value = '';

  // 📋 도착 패널 초기화
  const arrivalPanel = document.getElementById("arrivalPanelBody");
  if (arrivalPanel) {
    arrivalPanel.innerHTML = `<div class="text-muted small py-3 px-2 text-center">
      ※ 시/도를 선택하거나 버스 번호로 검색하세요.
    </div>`;
  }

  // 🧾 상세 팝업 닫기
  const popup = document.getElementById('routeDetailPopup');
  if (popup) popup.classList.add('d-none');

  // 🧭 오프캔버스 닫기
  const routePanel = document.getElementById("busRoutePanel");
  if (routePanel && bootstrap?.Offcanvas?.getInstance(routePanel)) {
    bootstrap.Offcanvas.getInstance(routePanel).hide();
  }

  // 🗺️ 지도 중심 초기화
  const center = window.cityCenters?.["서울특별시"] || [37.5665, 126.9780];
  if (window.map) {
    map.setCenter(new naver.maps.LatLng(center[0], center[1]));
    map.setZoom(13);
  }
};

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

document.addEventListener('DOMContentLoaded', () => {
  const trafficBtn = document.getElementById('toggleTrafficLayer');
  let trafficVisible = false;

  trafficBtn.addEventListener('click', () => {
    trafficVisible = !trafficVisible;

    const legendBox = document.getElementById('trafficLegendBox'); // ✅ 매번 새로 가져오기

    if (trafficVisible) {
      if (!window.trafficLayer) {
        window.trafficLayer = new naver.maps.TrafficLayer({ interval: 300000 });
      }
      window.trafficLayer.setMap(window.map);
      legendBox.style.display = 'block';
      adjustLegendPositions(); // ✅ 위치 동기화
      trafficBtn.classList.add('active');
    } else {
      window.trafficLayer?.setMap(null);
      legendBox.style.display = 'none';
      adjustLegendPositions(); // ✅ 위치 복귀
      trafficBtn.classList.remove('active');
    }
  });
});