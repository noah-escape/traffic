let eventMarkers = [];
let latestEventData = [];
let skipNextIdle = false;
let detailOverlay = null;

// ✅ 초기화 함수
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

// ✅ 마커 생성
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
        url: getEventIcon(event.eventType),
        size: new naver.maps.Size(44, 66),
        anchor: new naver.maps.Point(22, 66)
      }
    });

    naver.maps.Event.addListener(marker, 'click', () => {
      skipNextIdle = true;
      const position = marker.getPosition();
      map.panTo(position);
      window.clearEventMarkers();
      marker.setMap(map);
      eventMarkers.push(marker);
      showCustomBox(event, position);
    });

    eventMarkers.push(marker);
  });
};

// ✅ 마커 아래에 상세 박스 표시
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

  detailOverlay = new naver.maps.OverlayView();
  detailOverlay.onAdd = function () {
    const layer = this.getPanes().overlayLayer;
    layer.appendChild(div);
  };

  detailOverlay.draw = function () {
    const projection = this.getProjection();
    const pixelPosition = projection.fromCoordToOffset(latLng);

    div.style.position = 'absolute';
    div.style.left = pixelPosition.x - 100 + 'px';
    div.style.top = pixelPosition.y + 10 + 'px'; // 마커 밑
  };

  detailOverlay.onRemove = function () {
    if (div.parentNode) div.parentNode.removeChild(div);
  };

  detailOverlay.setMap(map);
}

// ✅ 아이콘 매핑
function getEventIcon(type) {
  const map = {
    '기상': '/image/event/event-weather.png',
    '재난': '/image/event/event-disaster.png',
    '공사': '/image/event/event-work.png',
    '사고': '/image/event/event-accident.png'
  };
  return map[type?.trim()] || '/image/event/event-default.png';
}

// ✅ 날짜 포맷
function formatDate(str) {
  if (!str || str.length !== 14) return '-';
  return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)} ${str.slice(8, 10)}:${str.slice(10, 12)}`;
}

// ✅ 리스트 렌더링
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

// ✅ 리스트 호버 → 마커 강조
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
      url: getEventIcon(event.eventType),
      size: new naver.maps.Size(44, 66),
      anchor: new naver.maps.Point(22, 66)
    }
  });
  eventMarkers.push(marker);
});

// ✅ 리스트 클릭 → 상세 보기
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
      url: getEventIcon(event.eventType),
      size: new naver.maps.Size(44, 66),
      anchor: new naver.maps.Point(22, 66)
    }
  });

  eventMarkers.push(marker);
  showCustomBox(event, latLng);
});

// ✅ 지도 기준 도로 이벤트 요청
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

// ✅ 지도 이동 시 마커/박스 초기화 + 새로고침
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
