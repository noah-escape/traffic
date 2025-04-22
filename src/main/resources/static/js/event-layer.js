let eventMarkers = [];

window.clearEventMarkers = function () {
  eventMarkers.forEach(m => m.setMap(null));
  eventMarkers = [];
};

window.loadEventMarkers = function (eventData) {
  if (!eventData?.body?.items) return;

  window.clearEventMarkers();

  eventData.body.items.forEach(event => {
    const lat = parseFloat(event.coordY);
    const lng = parseFloat(event.coordX);
    if (isNaN(lat) || isNaN(lng)) return;

    // ✅ 정확한 아이콘 매핑을 위해 type + detailType 넘김
    const iconUrl = getEventIcon(event.eventType);

    const marker = new naver.maps.Marker({
      position: new naver.maps.LatLng(lat, lng),
      map,
      icon: {
        url: iconUrl,
        size: new naver.maps.Size(44, 66),
        origin: new naver.maps.Point(0, 0),
        anchor: new naver.maps.Point(22, 66)
      },
      title: event.roadName
    });    

    // ✅ 마커 클릭 시 하단 정보 박스 표시
    naver.maps.Event.addListener(marker, 'click', () => {
      const content = `
        <div style="font-size: 14px;">
          📍 <strong>${event.roadName} (${event.roadNo})</strong><br/>
          🔸 유형: ${event.eventType} ${event.eventDetailType ? `- ${event.eventDetailType}` : ''}<br/>
          🕓 발생: ${formatDate(event.startDate)}<br/>
          💬 메시지: ${event.message || '정보 없음'}
        </div>
      `;
      document.getElementById('eventInfoContent').innerHTML = content;
      document.getElementById('eventInfoBox').style.display = 'block';
    });

    eventMarkers.push(marker);
  });
};

// ✅ 아이콘 매핑 함수 (조합 → 타입 fallback → 기본)
function getEventIcon(eventType) {
  const type = (eventType || '').trim();

  const iconMap = {
    '기상': '/image/event/event-weather.png',
    '재난': '/image/event/event-disaster.png',
    '공사': '/image/event/event-work.png',
    '사고': '/image/event/event-accident.png'
  };

  if (iconMap[type]) {
    return iconMap[type];
  }

  console.warn(`❗ 정의되지 않은 유형: "${type}" → 기본 아이콘 사용`);
  return '/image/event/event-default.png';
}

function formatDate(yyyymmddhhmmss) {
  if (!yyyymmddhhmmss || yyyymmddhhmmss.length !== 14) return '-';
  const y = yyyymmddhhmmss.slice(0, 4);
  const m = yyyymmddhhmmss.slice(4, 6);
  const d = yyyymmddhhmmss.slice(6, 8);
  const h = yyyymmddhhmmss.slice(8, 10);
  const min = yyyymmddhhmmss.slice(10, 12);
  return `${y}-${m}-${d} ${h}:${min}`;
}

window.loadRoadEventsInView = function () {
  console.log("🚀 loadRoadEventsInView() 실행됨");

  const bounds = map.getBounds();
  const sw = bounds.getSW();
  const ne = bounds.getNE();
  const url = `/api/proxy/road-event?minX=${sw.lng()}&minY=${sw.lat()}&maxX=${ne.lng()}&maxY=${ne.lat()}`;

  console.log("📡 URL 호출:", url);

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`API 오류: ${res.status}`);
      return res.json();
    })
    .then(data => {
      console.log("✅ 응답 도착:", data);
      window.loadEventMarkers(data);
    })
    .catch(err => {
      console.error("❌ 도로 이벤트 로딩 실패", err);
      alert("도로 이벤트를 불러오는 중 오류가 발생했습니다.");
    });
};

// ✅ 지도 이동 시 자동 새로고침
naver.maps.Event.addListener(map, 'idle', () => {
  if (panelStates.event) {
    console.log("📍 지도 이동 → 도로 이벤트 새로고침");
    window.loadRoadEventsInView?.();
  }
});