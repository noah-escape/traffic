const ITS_API_KEY = window.ITS_API_KEY;
let hls = null;
let cctvMarkers = [];
let currentVideoUrl = '';
window.currentVideoUrl = currentVideoUrl;

function extractRoadName(name) {
  if (!name) return '';
  const match = name.match(/\[(.*?)\]/);
  return match ? match[1].trim() : '';
}

// ✅ 도로 이름 필터링
function applyCctvFilter() {
  const keyword = document.getElementById('roadSearchInput').value.trim();
  if (!keyword) loadRoadList();
}

// ✅ CCTV 레이어 필터
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
        size: new naver.maps.Size(44, 44),
        anchor: new naver.maps.Point(22, 38) // 📌 중심에 anchor 설정 → 줌 아웃 시에도 위치 유지
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
          window.currentVideoUrl = video; // 새창에서도 사용 가능
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

// ✅ 마커 제거
function clearCctvMarkers() {
  cctvMarkers.forEach(marker => marker.setMap(null));
  cctvMarkers = [];
}

// ✅ 도로 리스트 불러오기
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

// ✅ 영상 재생
// ✅ 영상 재생 + 팝업 위치 보정
function playVideo(url, name, position) {
  const videoContainer = document.getElementById('videoContainer');
  const cctvVideo = document.getElementById('cctvVideo');
  const videoTitle = document.getElementById('videoTitle');

  videoTitle.textContent = name || '영상 없음';

  // ✅ 기존 HLS 종료
  if (hls) hls.destroy();

  // ✅ 새로 재생
  hls = new Hls();
  hls.loadSource(url);
  hls.attachMedia(cctvVideo);
  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    cctvVideo.play().catch(console.warn);
  });

  // ✅ 팝업 표시
  videoContainer.style.display = 'block';
  cctvVideo.style.display = 'block';

  // ✅ 지도 좌표 → 화면 좌표
  const point = map.getProjection().fromCoordToOffset(position);

  const containerWidth = videoContainer.offsetWidth || 480;
  const containerHeight = videoContainer.offsetHeight || 300;

  // ✅ 좌표 계산 (화면 밖 벗어나지 않게 조정)
  let left = point.x + 10;
  let top = point.y + 10;

  if (left + containerWidth > window.innerWidth) {
    left = window.innerWidth - containerWidth - 10;
  }
  if (top + containerHeight > window.innerHeight) {
    top = window.innerHeight - containerHeight - 10;
  }

  // ✅ 음수 방지
  left = Math.max(0, left);
  top = Math.max(0, top);

  videoContainer.style.left = `${left}px`;
  videoContainer.style.top = `${top}px`;

  makeVideoContainerDraggable(); // ✅ 드래그 유지
}

// ✅ 영상 숨기기
function hideVideo() {
  if (hls) hls.destroy();
  hls = null;
  const cctvVideo = document.getElementById('cctvVideo');
  cctvVideo.pause();
  cctvVideo.src = '';
  document.getElementById('videoContainer').style.display = 'none';
}

// ✅ 영상창 드래그 가능하게
function makeVideoContainerDraggable() {
  const container = document.getElementById('videoContainer');
  let offsetX = 0, offsetY = 0, isDragging = false;

  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - container.getBoundingClientRect().left;
    offsetY = e.clientY - container.getBoundingClientRect().top;
    container.style.cursor = 'move';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    container.style.left = Math.max(0, Math.min(e.clientX - offsetX, window.innerWidth - container.offsetWidth)) + 'px';
    container.style.top = Math.max(0, Math.min(e.clientY - offsetY, window.innerHeight - container.offsetHeight)) + 'px';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    container.style.cursor = 'default';
  });
}

// ✅ 로딩 스피너
function showSpinner() {
  document.getElementById('loadingSpinner').style.display = 'block';
}
function hideSpinner() {
  document.getElementById('loadingSpinner').style.display = 'none';
}

// ✅ 전역 등록
window.playVideo = playVideo;
window.hideVideo = hideVideo;
window.applyCctvFilter = applyCctvFilter;
window.filterCctvLayer = filterCctvLayer;
window.clearCctvMarkers = clearCctvMarkers;
window.loadRoadList = loadRoadList;
