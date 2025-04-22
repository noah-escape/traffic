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

function applyCctvFilter() {
  const keyword = document.getElementById('roadSearchInput').value.trim();
  if (!keyword) loadRoadList();
}

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
        size: new naver.maps.Size(44, 70),
        anchor: new naver.maps.Point(22, 70)
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

function clearCctvMarkers() {
  cctvMarkers.forEach(marker => marker.setMap(null));
  cctvMarkers = [];
}

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

function playVideo(url, name, position) {
  const videoContainer = document.getElementById('videoContainer');
  const cctvVideo = document.getElementById('cctvVideo');
  const videoTitle = document.getElementById('videoTitle');

  videoTitle.textContent = name || '영상 없음';

  if (hls) hls.destroy();
  hls = new Hls();
  hls.loadSource(url);
  hls.attachMedia(cctvVideo);
  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    cctvVideo.play().catch(console.warn);
  });

  videoContainer.style.display = 'block';
  cctvVideo.style.display = 'block';

  const point = map.getProjection().fromCoordToOffset(position);
  videoContainer.style.left = `${point.x + 10}px`;
  videoContainer.style.top = `${point.y + 10}px`;

  makeVideoContainerDraggable();
}

function hideVideo() {
  if (hls) hls.destroy();
  hls = null;
  const cctvVideo = document.getElementById('cctvVideo');
  cctvVideo.pause();
  cctvVideo.src = '';
  document.getElementById('videoContainer').style.display = 'none';
}

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

function showSpinner() {
  document.getElementById('loadingSpinner').style.display = 'block';
}

function hideSpinner() {
  document.getElementById('loadingSpinner').style.display = 'none';
}

// ✅ 전역 노출
window.playVideo = playVideo;
window.hideVideo = hideVideo;
window.applyCctvFilter = applyCctvFilter;
window.filterCctvLayer = filterCctvLayer;
window.clearCctvMarkers = clearCctvMarkers;
window.loadRoadList = loadRoadList;