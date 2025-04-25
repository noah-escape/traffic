let eventMarkers = [];
let latestEventData = [];
let skipNextIdle = false;
let detailOverlay = null;

// ✅ 도로 이벤트 마커 초기화 (마커 및 상세정보 박스 제거)
window.clearEventMarkers = function () {
  eventMarkers.forEach(m => m.setMap(null));
  eventMarkers = [];

  if (detailOverlay) {
    detailOverlay.setMap(null);
    detailOverlay = null;
  }

  const box = document.getElementById('eventInfoBox');
  if (box) box.style.display = 'none';
};

// ✅ 도로 이벤트 마커 생성 및 클릭 시 상세정보 표시
window.loadEventMarkers = function (eventData) {
  if (!eventData?.body?.items) return;

  window.clearEventMarkers();
  const events = eventData.body.items;
  latestEventData = events;

  events.forEach((event, index) => {
    const lat = parseFloat(event.coordY);
    const lng = parseFloat(event.coordX);
    if (isNaN(lat) || isNaN(lng)) return;

    const marker = new naver.maps.Marker({
      position: new naver.maps.LatLng(lat, lng),
      map,
      icon: {
        url: getEventIcon(event.eventType, event.eventDetailType),
        size: new naver.maps.Size(44, 66),
        anchor: new naver.maps.Point(22, 66)
      }
    });

    // ✅ 마커 클릭 시 상세 박스 표시 및 단독 마커 유지
    naver.maps.Event.addListener(marker, 'click', () => {
      skipNextIdle = true;
      const position = marker.getPosition();
      map.panTo(position);

      window.clearEventMarkers(); // 기존 마커 제거
      marker.setMap(map);
      eventMarkers.push(marker);

      showCustomBox(event, position); // 상세 박스 표시
    });

    eventMarkers.push(marker);
  });
};

// ✅ 마커 아래에 상세 박스를 표시하는 함수
function showCustomBox(event, latLng) {
  if (detailOverlay) detailOverlay.setMap(null);

  const div = document.createElement('div');
  div.className = 'custom-event-box';
  div.innerHTML = `
    <strong>${event.roadName} (${event.roadNo})</strong><br/>
    🔸 ${event.eventType} ${event.eventDetailType || ''}<br/>
    🕓 ${formatDate(event.startDate)}<br/>
    💬 ${event.message || '정보 없음'}
  `;

  // ✅ Naver Custom Overlay로 직접 위치 계산
  detailOverlay = new naver.maps.OverlayView();
  detailOverlay.onAdd = function () {
    const layer = this.getPanes().overlayLayer;
    layer.appendChild(div);
  };
  detailOverlay.draw = function () {
    const projection = this.getProjection();
    const pixel = projection.fromCoordToOffset(latLng);
    div.style.position = 'absolute';
    div.style.left = (pixel.x - 100) + 'px';  // 마커 중심 기준
    div.style.top = (pixel.y + 10) + 'px';    // 마커 아래
  };
  detailOverlay.onRemove = function () {
    if (div.parentNode) div.parentNode.removeChild(div);
  };

  detailOverlay.setMap(map);
}

// ✅ 아이콘 URL 매핑
function getEventIcon(eventType, eventDetailType) {
  const iconMap = {
    detail: {
      '강풍': '/image/event/event-squall.png',
      '차량증가/정체': '/image/event/event-traffic_congestion.png',
      '지정체': '/image/event/event-traffic_congestion.png',
      '시설물보수작업': '/image/event/event-facility_maintenance.png',
      '이벤트/홍보': '/image/event/event-promotion.png',
      '고장' : '/image/event/event-vehicle_breakdown.png'
    },

    type: {
      '기상': '/image/event/event-weather.png',
      '재난': '/image/event/event-disaster.png',
      '공사': '/image/event/event-work.png',
      '교통사고': '/image/event/event-accident.png',
      '기타돌발': '/image/event/event-default.png',
    }
  };

  const detail = normalize(eventDetailType);
  const type = normalize(eventType);

  // ✅ detail 우선
  if (detail && iconMap.detail[detail]) {
    return iconMap.detail[detail];
  }

  // ✅ type fallback
  if (type && iconMap.type[type]) {
    return iconMap.type[type];
  }

  // ✅ default
  return '/image/event/event-default.png';
}

function normalize(str) {
  return str?.trim().replace(/["']/g, '');
}

// ✅ 날짜 포맷: YYYY-MM-DD HH:mm
function formatDate(str) {
  if (!str || str.length !== 14) return '-';
  return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)} ${str.slice(8, 10)}:${str.slice(10, 12)}`;
}

// ✅ 오른쪽 목록 패널 구성
window.renderEventListPanel = function (events) {
  const container = document.getElementById('eventListContent');
  if (!container) return;

  latestEventData = events;
  container.innerHTML = events.map((event, i) => `
    <div class="event-card p-2 border bg-white rounded shadow-sm"
        data-index="${i}"
        style="cursor: pointer;">
      <div class="fw-bold text-primary">${event.roadName} (${event.roadNo})</div>
      <div class="small text-muted">📌 ${event.eventType}${event.eventDetailType ? ` - ${event.eventDetailType}` : ''}</div>
      <div class="small text-muted">🕓 ${formatDate(event.startDate)}</div>
      <div class="small text-truncate mt-1">💬 ${event.message || '정보 없음'}</div>
    </div>
  `).join('');
};

// ✅ 목록 Hover → 마커 하나만 강조
document.getElementById('eventListContent')?.addEventListener('mouseover', e => {
  const card = e.target.closest('.event-card');
  if (!card) return;

  const index = parseInt(card.dataset.index);
  const event = latestEventData[index];
  if (!event) return;

  window.clearEventMarkers();

  const marker = new naver.maps.Marker({
    position: new naver.maps.LatLng(parseFloat(event.coordY), parseFloat(event.coordX)),
    map,
    icon: {
      url: getEventIcon(event.eventType, event.eventDetailType),    
      size: new naver.maps.Size(44, 66),
      anchor: new naver.maps.Point(22, 66)
    }
  });
  eventMarkers.push(marker);
});

// ✅ 목록 클릭 → 해당 마커 단독 표시 + 상세 정보 보여줌
document.getElementById('eventListContent')?.addEventListener('click', e => {
  const card = e.target.closest('.event-card');
  if (!card) return;

  const index = parseInt(card.dataset.index);
  const event = latestEventData[index];
  if (!event) return;

  skipNextIdle = true;

  const latLng = new naver.maps.LatLng(parseFloat(event.coordY), parseFloat(event.coordX));
  map.panTo(latLng);

  window.clearEventMarkers();

  const marker = new naver.maps.Marker({
    position: latLng,
    map,
    icon: {
      url: getEventIcon(event.eventType, event.eventDetailType),
      size: new naver.maps.Size(44, 66),
      anchor: new naver.maps.Point(22, 66)
    }
  });

  eventMarkers.push(marker);
  showCustomBox(event, latLng);
});

// ✅ 지도 중심 기준으로 도로 이벤트 데이터 불러오기
window.loadRoadEventsInView = function () {
  if (!panelStates.event) return;

  const bounds = map.getBounds();
  const sw = bounds.getSW();
  const ne = bounds.getNE();

  fetch(`/api/proxy/road-event?minX=${sw.lng()}&minY=${sw.lat()}&maxX=${ne.lng()}&maxY=${ne.lat()}`)
    .then(res => res.json())
    .then(data => {
      window.loadEventMarkers(data);
      window.renderEventListPanel(data.body.items);
    })
    .catch(err => console.error("❌ 도로 이벤트 로딩 실패", err));
};

// ✅ 지도 이동 후 → 마커 및 상세내용 초기화 + 이벤트 다시 로드
document.addEventListener('DOMContentLoaded', () => {
  const waitForMap = setInterval(() => {
    if (window.map) {
      clearInterval(waitForMap);
      naver.maps.Event.addListener(window.map, 'idle', () => {
        if (skipNextIdle) {
          skipNextIdle = false;
          return;
        }

        if (panelStates.event) {
          window.clearEventMarkers();
          window.loadRoadEventsInView();
        }
      });
    }
  }, 100);
});
