const ITS_API_KEY = window.ITS_API_KEY;
let hls = null;
let cctvMarkers = [];
let currentVideoUrl = '';
window.currentVideoUrl = currentVideoUrl;

// ✅ 도로명 추출 (ex: [경부고속도로] → 경부고속도로)
function extractRoadName(name) {
  if (!name) return '';
  const match = name.match(/\[(.*?)\]/);
  return match ? match[1].trim() : '';
}

// ✅ CCTV 조회 트리거
function applyCctvFilter() {
  const keyword = document.getElementById('roadSearchInput').value.trim();
  if (!keyword) {
    loadRoadList();
  }
}

// ✅ CCTV 목록 필터링 후 마커 표시
function filterCctvLayer(roadName, roadType, onComplete) {
  clearCctvMarkers();
  const bounds = map.getBounds();
  const sw = bounds._sw;
  const ne = bounds._ne;

  const url = `https://openapi.its.go.kr:9443/cctvInfo?apiKey=${ITS_API_KEY}&type=${roadType}&cctvType=1&minX=${sw.lng()}&maxX=${ne.lng()}&minY=${sw.lat()}&maxY=${ne.lat()}&getType=json`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const cctvs = Array.isArray(data.response?.data) ? data.response.data : [data.response?.data].filter(Boolean);
      const markerImage = {
        url: '/image/cctv-icon.png',
        size: new naver.maps.Size(44, 66),
        anchor: new naver.maps.Point(22, 38)
      };

      cctvs.forEach(item => {
        const lat = parseFloat(item.coordy);
        const lng = parseFloat(item.coordx);
        const name = item.cctvname;
        const video = item.cctvurl;
        const road = extractRoadName(name);

        if (!lat || !lng || !video) return;
        if (roadName && (!road || !road.includes(roadName))) return;

        const marker = new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(lat, lng),
          title: name,
          icon: markerImage
        });

        naver.maps.Event.addListener(marker, 'click', () => {
          currentVideoUrl = video;
          window.currentVideoUrl = video;
          playVideo(video, name, marker.getPosition());
        });

        cctvMarkers.push(marker);
      });

      if (cctvMarkers.length === 0) {
        alert('조건에 맞는 CCTV가 없습니다.');
      }
    })
    .catch(console.error)
    .finally(() => typeof onComplete === 'function' && onComplete());
}

// ✅ 마커 전체 제거
function clearCctvMarkers() {
  cctvMarkers.forEach(marker => marker.setMap(null));
  cctvMarkers = [];
}

// ✅ 도로 리스트 로딩
function loadRoadList() {
  const keyword = document.getElementById('roadSearchInput').value.trim();
  const selectedType = document.getElementById('highway').checked ? 'ex' : 'its';

  const bounds = map.getBounds();
  const sw = bounds._sw;
  const ne = bounds._ne;

  const url = `https://openapi.its.go.kr:9443/cctvInfo?apiKey=${ITS_API_KEY}&type=${selectedType}&cctvType=1&minX=${sw.lng()}&maxX=${ne.lng()}&minY=${sw.lat()}&maxY=${ne.lat()}&getType=json`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const roadSet = new Set();
      const cctvs = Array.isArray(data.response?.data) ? data.response.data : [data.response?.data].filter(Boolean);

      cctvs.forEach(item => {
        const road = extractRoadName(item.cctvname);
        if (road && (!keyword || road.includes(keyword))) {
          roadSet.add(road);
        }
      });

      const roadList = document.getElementById('roadList');
      roadList.innerHTML = '';

      if (roadSet.size === 0) {
        roadList.innerHTML = '<li class="list-group-item text-muted">검색 결과가 없습니다.</li>';
        return;
      }

      Array.from(roadSet).sort().forEach(name => {
        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action';
        li.textContent = name;
        li.addEventListener('click', () => {
          showSpinner();
          filterCctvLayer(name, selectedType, hideSpinner);
        });
        roadList.appendChild(li);
      });
    })
    .catch(console.error);
}

// ✅ 영상 팝업 재생
function playVideo(url, name, position) {
  const container = document.getElementById('videoContainer');
  const cctvVideo = document.getElementById('cctvVideo');
  const videoTitle = document.getElementById('videoTitle');

  videoTitle.textContent = name || '영상 없음';

  // ✅ HLS 초기화
  if (hls) hls.destroy();
  hls = new Hls();
  hls.loadSource(url);
  hls.attachMedia(cctvVideo);
  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    cctvVideo.play().catch(console.warn);
  });

  // ✅ 영상창 보이기
  container.style.display = 'block';
  cctvVideo.style.display = 'block';

  // ✅ 지도 중심으로 이동
  map.panTo(position);

  // ⏳ 이동이 완료된 후 위치 보정
  setTimeout(() => {
    const projection = map.getProjection();
    const mapEl = document.getElementById('map');
    const mapRect = mapEl.getBoundingClientRect();
    const point = projection.fromCoordToOffset(position);

    const containerWidth = container.offsetWidth || 480;
    const containerHeight = container.offsetHeight || 300;

    // 📌 마커 아래쪽에 영상 위치
    let left = point.x - containerWidth / 2;
    let top = point.y + 20;

    // 📏 지도 내부 제한
    left = Math.max(10, Math.min(left, mapRect.width - containerWidth - 10));
    top = Math.max(10, Math.min(top, mapRect.height - containerHeight - 10));

    // 🔧 offset 기준은 #map 기준이므로 map 위치 보정
    container.style.left = `${mapRect.left + left}px`;
    container.style.top = `${mapRect.top + top}px`;
  }, 300); // 지도 이동 후 위치 보정

  makeVideoContainerDraggable();
}

// ✅ 영상 숨기기
function hideVideo() {
  if (hls) hls.destroy();
  hls = null;
  const video = document.getElementById('cctvVideo');
  video.pause();
  video.src = '';
  document.getElementById('videoContainer').style.display = 'none';
}

// ✅ 영상창 드래그 가능하게
function makeVideoContainerDraggable() {
  const container = document.getElementById('videoContainer');
  let offsetX = 0, offsetY = 0, isDragging = false;

  container.onmousedown = (e) => {
    isDragging = true;
    offsetX = e.clientX - container.getBoundingClientRect().left;
    offsetY = e.clientY - container.getBoundingClientRect().top;
    container.style.cursor = 'move';
  };

  document.onmousemove = (e) => {
    if (!isDragging) return;
    container.style.left = Math.max(0, Math.min(e.clientX - offsetX, window.innerWidth - container.offsetWidth)) + 'px';
    container.style.top = Math.max(0, Math.min(e.clientY - offsetY, window.innerHeight - container.offsetHeight)) + 'px';
  };

  document.onmouseup = () => {
    isDragging = false;
    container.style.cursor = 'default';
  };
}

// ✅ 로딩 스피너 표시/숨김
function showSpinner() {
  document.getElementById('loadingSpinner').style.display = 'block';
}
function hideSpinner() {
  document.getElementById('loadingSpinner').style.display = 'none';
}

// ✅ 영상 닫기 버튼 연결
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
    const video = document.getElementById('cctvVideo');
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
      video.msRequestFullscreen();
    }
  });
  
  document.getElementById('openNewTabBtn')?.addEventListener('click', () => {
    const videoUrl = window.currentVideoUrl;
    const title = document.getElementById('videoTitle')?.textContent || 'CCTV';
    if (!videoUrl) return;
  
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) {
      alert("팝업이 차단되었습니다! 브라우저 설정을 확인해주세요.");
      return;
    }
  
    win.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
        <style>
          body { margin: 0; background: #000; }
          video { width: 100%; height: 100vh; object-fit: contain; }
        </style>
      </head>
      <body>
        <video id="video" controls autoplay muted></video>
        <script>
          const video = document.getElementById('video');
          const url = "${videoUrl}";
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            video.play();
          }
        </script>
      </body>
      </html>
    `);
  });
  
  document.getElementById('closeVideoBtn')?.addEventListener('click', hideVideo);
});

// ✅ 전역 연결
window.playVideo = playVideo;
window.hideVideo = hideVideo;
window.applyCctvFilter = applyCctvFilter;
window.filterCctvLayer = filterCctvLayer;
window.clearCctvMarkers = clearCctvMarkers;
window.loadRoadList = loadRoadList;
