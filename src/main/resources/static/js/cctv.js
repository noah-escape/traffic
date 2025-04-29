window.ITS_API_KEY;
let allCctvDataITS = [];
let allCctvDataEX = [];
let hls = null;
let cctvMarkers = [];
let currentVideoUrl = '';
window.currentVideoUrl = currentVideoUrl;
let currentCctvType = 'ex'; // 기본값을 고속도로로 설정
let sortAscending = true; // 구간 정렬 순서 제어
let isDataLoaded = false; // 데이터 로드 상태 추적

// 도로명 캐시
const roadCache = { its: new Map(), ex: new Map() };

// ✅ [도로명]구간명 파싱 + 국도명 정규화
function parseRoadAndSection(name) {
  if (!name) return { road: '', section: '' };

  let roadMatch = name.match(/\[(.*?)\]/) || name.match(/(경부선|국도\s*\d+호선|위임국도\s*\d+호선)/);
  let sectionMatch = name.match(/\](.*)/) || [null, name];

  let rawRoadName = roadMatch ? roadMatch[1].trim() : '';
  const sectionName = sectionMatch ? sectionMatch[1].trim() : name;

  if (rawRoadName) {
    const normalized = rawRoadName.match(/국도\s*0*(\d+)|위임국도\s*0*(\d+)|국도0*(\d+)/);
    if (normalized) {
      const num = parseInt(normalized[1] || normalized[2] || normalized[3], 10);
      rawRoadName = `국도${num}호선`;
    } else if (rawRoadName === '경부선') {
      rawRoadName = '경부선';
    }
  }

  return { road: rawRoadName || '알 수 없는 도로', section: sectionName };
}

// API 호출 재시도 로직
function fetchWithRetry(url, retries = 3) {
  return fetch(url, { credentials: 'omit' }).catch(err => {
    if (retries > 0) return fetchWithRetry(url, retries - 1);
    throw err;
  });
}

// 캐싱 함수 (구간 정렬 포함)
function cacheRoads(source, type) {
  source.forEach(item => {
    const { road, section } = parseRoadAndSection(item.cctvname);
    if (!roadCache[type].has(road)) roadCache[type].set(road, []);
    roadCache[type].get(road).push({ ...item, section });
  });
  roadCache[type].forEach((items, road) => {
    roadCache[type].set(
      road,
      items.sort((a, b) => sortAscending ? parseFloat(a.coordy) - parseFloat(b.coordy) : parseFloat(b.coordy) - parseFloat(a.coordy))
    );
  });
}

// ✅ 전국 CCTV preload
function preloadAllCctvs() {
  const urlITS = `https://openapi.its.go.kr:9443/cctvInfo?apiKey=${window.ITS_API_KEY}&type=its&cctvType=1&minX=124.6&maxX=132.0&minY=33.0&maxY=39.0&getType=json`;
  const urlEX = `https://openapi.its.go.kr:9443/cctvInfo?apiKey=${window.ITS_API_KEY}&type=ex&cctvType=1&minX=124.6&maxX=132.0&minY=33.0&maxY=39.0&getType=json`;

  console.log('preloadAllCctvs started');
  document.getElementById('loadingSpinner').style.display = 'block';

  Promise.all([
    fetchWithRetry(urlITS).then(res => res.json()),
    fetchWithRetry(urlEX).then(res => res.json())
  ])
    .then(([itsData, exData]) => {
      allCctvDataITS = itsData.response?.data || [];
      allCctvDataEX = exData.response?.data || [];
      console.log('Loaded:', { ITS: allCctvDataITS.length, EX: allCctvDataEX.length });
      cacheRoads(allCctvDataITS, 'its');
      cacheRoads(allCctvDataEX, 'ex');
      isDataLoaded = true;
      loadRoadList();
      document.getElementById('loadingSpinner').style.display = 'none';
    })
    .catch(err => {
      console.error('CCTV 데이터 로드 실패:', err);
      document.getElementById('loadingSpinner').style.display = 'none';
      alert('CCTV 데이터를 로드하지 못했습니다. 다시 시도해주세요.');
      isDataLoaded = false;
    });
}

// ✅ 도로 리스트 생성
function loadRoadList() {
  console.log('loadRoadList called', { currentCctvType, isDataLoaded, exCacheSize: roadCache.ex.size });
  if (!isDataLoaded) {
    preloadAllCctvs();
    return;
  }

  const selectedType = currentCctvType;
  const roads = Array.from(roadCache[selectedType].keys()).sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
    const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
    return numA - numB;
  });

  const roadList = document.getElementById('roadList');
  roadList.innerHTML = '';

  if (roads.length === 0) {
    console.log('No roads found for type:', selectedType);
    roadList.innerHTML = '<li class="list-group-item text-muted">데이터가 없습니다.</li>';
    return;
  }

  const fragment = document.createDocumentFragment();
  roads.forEach(roadName => {
    const li = document.createElement('li');
    li.className = 'list-group-item list-group-item-action';
    const roadLabel = getRoadStartEndLabel(roadCache[selectedType].get(roadName));
    li.innerHTML = `${roadName} <small class='text-muted'>(${roadLabel})</small> <span style="float:right;">▼</span>`;
    li.addEventListener('click', () => toggleSection(li, roadName, selectedType));
    fragment.appendChild(li);
  });
  roadList.appendChild(fragment);
}

// 도로 시작-끝 라벨 생성
function getRoadStartEndLabel(cctvs) {
  if (!cctvs || cctvs.length < 2) return '';
  const sorted = [...cctvs].sort((a, b) => parseFloat(a.coordy) - parseFloat(b.coordy));
  const start = sorted[0].section.split(/[ →↔>-]/)[0].trim();
  const end = sorted[sorted.length - 1].section.split(/[ →↔>-]/)[0].trim();
  return `${start} ↔ ${end}`;
}

// ✅ 도로 클릭 시 하위 리스트 + 마커 생성
function toggleSection(li, roadName, roadType) {
  const isOpen = li.nextElementSibling?.classList.contains('road-section');
  if (isOpen) {
    clearCctvMarkers();
    li.nextElementSibling.remove();
    li.querySelector('span').textContent = '▼';
    return;
  }

  loadRoadCctvMarkers(roadName, roadType);

  const ul = document.createElement('ul');
  ul.className = 'road-section';
  const source = roadCache[roadType].get(roadName) || [];

  if (source.length === 0) {
    const subLi = document.createElement('li');
    subLi.className = 'list-group-item text-muted';
    subLi.textContent = 'CCTV 데이터가 없습니다.';
    ul.appendChild(subLi);
  } else {
    source.forEach(item => {
      const subLi = document.createElement('li');
      subLi.className = 'list-group-item list-group-item-action';
      subLi.textContent = item.section || item.cctvname;
      subLi.addEventListener('click', (e) => {
        e.stopPropagation();
        const pos = new naver.maps.LatLng(parseFloat(item.coordy), parseFloat(item.coordx));
        map.setCenter(pos);
        playVideo(item.cctvurl, item.cctvname, pos);
      });
      ul.appendChild(subLi);
    });
  }

  li.insertAdjacentElement('afterend', ul);
  li.querySelector('span').textContent = '▲';
}

// ✅ 도로별 마커 생성
function loadRoadCctvMarkers(roadName, roadType) {
  clearCctvMarkers();
  const bounds = new naver.maps.LatLngBounds();
  const markerImage = {
    url: '/image/cctv-icon.png',
    size: new naver.maps.Size(44, 66),
    anchor: new naver.maps.Point(22, 38)
  };

  const source = roadCache[roadType].get(roadName) || [];

  source.forEach(item => {
    const lat = parseFloat(item.coordy);
    const lng = parseFloat(item.coordx);
    if (isNaN(lat) || isNaN(lng)) {
      console.warn('유효하지 않은 좌표:', item.cctvname, { lat, lng });
      return;
    }

    const marker = new naver.maps.Marker({
      map,
      position: new naver.maps.LatLng(lat, lng),
      icon: markerImage,
      title: item.cctvname // FIX: 'unrivaled' 오타 수정
    });

    naver.maps.Event.addListener(marker, 'click', () => {
      playVideo(item.cctvurl, item.cctvname, marker.getPosition());
    });

    cctvMarkers.push(marker);
    bounds.extend(marker.getPosition());
  });

  if (cctvMarkers.length > 0) {
    map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
  } else {
    console.warn('마커가 없어 지도를 이동할 수 없습니다.');
  }
}

// ✅ 영상 재생
function playVideo(url, name, position) {
  const container = document.getElementById('videoContainer');
  const cctvVideo = document.getElementById('cctvVideo');
  const videoTitle = document.getElementById('videoTitle');

  videoTitle.textContent = name || '영상 없음';
  currentVideoUrl = url;

  if (hls) hls.destroy();
  hls = new Hls();
  hls.loadSource(url);
  hls.attachMedia(cctvVideo);
  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    cctvVideo.play().catch(console.warn);
  });

  container.style.display = 'block';
  cctvVideo.style.display = 'block';

  map.panTo(position);

  makeVideoContainerDraggable();
}

// ✅ 영상 숨기기
function hideVideo() {
  console.log('hideVideo called'); // 디버깅 로그
  if (hls) hls.destroy();
  hls = null;
  const video = document.getElementById('cctvVideo');
  video.pause();
  video.src = '';
  document.getElementById('videoContainer').style.display = 'none';
}

// ✅ 마커 제거
function clearCctvMarkers() {
  cctvMarkers.forEach(marker => marker.setMap(null));
  cctvMarkers = [];
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

// 추가 버튼 및 이벤트 처리
document.addEventListener('DOMContentLoaded', () => {
  // 지도 초기화
  map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(37.5665, 126.9780),
    zoom: 7
  });

  // 초기 데이터 로드
  preloadAllCctvs();

  // 사이드바 CCTV 버튼 이벤트
  let cctvOn = false;
  document.getElementById('sidebarCctvBtn')?.addEventListener('click', () => {
    console.log('sidebarCctvBtn clicked', { cctvOn }); // 디버깅 로그
    cctvOn = !cctvOn;
    const panel = document.getElementById('cctvFilterPanel');
    panel.style.display = cctvOn ? 'flex' : 'none';
    if (cctvOn) {
      currentCctvType = 'ex';
      document.getElementById('highway').checked = true;
      loadRoadList();
    } else {
      clearCctvMarkers();
      hideVideo();
    }
  });

  // 라디오 버튼 이벤트
  const highwayRadio = document.getElementById('highway');
  const normalroadRadio = document.getElementById('normalroad');

  if (highwayRadio && normalroadRadio) {
    highwayRadio.checked = true;
    highwayRadio.addEventListener('click', () => {
      currentCctvType = 'ex';
      loadRoadList();
    });
    normalroadRadio.addEventListener('click', () => {
      currentCctvType = 'its';
      loadRoadList();
    });
  } else {
    console.warn('라디오 버튼이 존재하지 않습니다.');
  }

  // 닫기 버튼 이벤트
  document.getElementById('closeVideoBtn')?.addEventListener('click', hideVideo);

  // 전체화면 버튼
  document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
    document.getElementById('cctvVideo')?.requestFullscreen?.();
  });

  // 새 탭 열기 버튼
  document.getElementById('openNewTabBtn')?.addEventListener('click', () => {
    if (!currentVideoUrl) return;
    const title = document.getElementById('videoTitle')?.textContent || 'CCTV';
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
          hls.loadSource('${currentVideoUrl}');
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = '${currentVideoUrl}';
          video.play();
        }
      </script>
      </body></html>
    `);
  });

  // 정렬 순서 변경 버튼
  document.getElementById('reverseOrderBtn')?.addEventListener('click', () => {
    sortAscending = !sortAscending;
    cacheRoads(allCctvDataITS, 'its');
    cacheRoads(allCctvDataEX, 'ex');
    loadRoadList();
  });
});

// ✅ 전역 등록
window.preloadAllCctvs = preloadAllCctvs;
window.loadRoadList = loadRoadList;
window.clearCctvMarkers = clearCctvMarkers;
window.hideVideo = hideVideo;