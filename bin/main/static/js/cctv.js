window.ITS_API_KEY;

let allCctvDataITS = [];
let allCctvDataEX = [];
let hls = null;
let cctvMarkers = [];
let currentVideoUrl = '';
let currentCctvType = 'ex';
let sortAscending = true;
let isDataLoaded = false;
let exList = [];
let itsList = [];

function cleanCctvName(raw) {
  return raw.replace(/\[[^\]]*\]/g, '').trim();
}

function extractRoadFromCctv(cctvname) {
  const match = cctvname.match(/\[(.*?)\]/);
  if (!match) return null;
  let name = match[1].replace(/\s/g, '');
  const suffixExceptions = ['창선', '환선', '지선', '산선', '성선', '양선', '포선'];
  if (name.endsWith('선') && !suffixExceptions.some(sfx => name.endsWith(sfx))) {
    name = name.replace(/선$/, '고속도로');
  }
  return name;
}

function findCctvMatch(name, roadName) {
  const allData = [...allCctvDataITS, ...allCctvDataEX];
  const cleaned = cleanCctvName(name);
  const candidates = allData.filter(d => cleanCctvName(d.cctvname) === cleaned);
  if (!candidates.length) return null;
  const normalizedRoadName = roadName.replace(/\s/g, '');
  const extractedMatch = candidates.find(d => {
    const extracted = extractRoadFromCctv(d.cctvname);
    return extracted && normalizedRoadName.includes(extracted);
  });
  if (extractedMatch) return extractedMatch;
  const looseMatch = candidates.find(d => d.cctvname.replace(/\s/g, '').includes(normalizedRoadName));
  if (looseMatch) return looseMatch;
  return candidates[0];
}

function loadCctvJsonList() {
  return Promise.all([
    fetch('/json/ex_list.json').then(r => r.json()),
    fetch('/json/its_list.json').then(r => r.json())
  ]).then(([ex, its]) => {
    exList = ex;
    itsList = its;
  });
}

function fetchWithRetry(url, retries = 3) {
  return fetch(url, { credentials: 'omit' }).catch(err => {
    if (retries > 0) return fetchWithRetry(url, retries - 1);
    throw err;
  });
}

function preloadAllCctvs() {
  document.getElementById('loadingSpinner').style.display = 'block';
  const base = 'https://openapi.its.go.kr:9443/cctvInfo';
  const params = type => `?apiKey=${window.ITS_API_KEY}&type=${type}&cctvType=1&minX=124.6&maxX=132.0&minY=33.0&maxY=39.0&getType=json`;

  Promise.all([
    fetchWithRetry(base + params('its')).then(r => r.json()),
    fetchWithRetry(base + params('ex')).then(r => r.json()),
    loadCctvJsonList()
  ]).then(async ([itsRes, exRes]) => {
    allCctvDataITS = itsRes.response?.data || [];
    allCctvDataEX = exRes.response?.data || [];
    isDataLoaded = true;
    await loadRoadList();
    document.getElementById('loadingSpinner').style.display = 'none';
  }).catch(err => {
    console.error('CCTV 로드 실패', err);
    document.getElementById('loadingSpinner').style.display = 'none';
    alert('CCTV 데이터를 불러오지 못했습니다.');
  });
}

function generateRoadIconBase64(type, number) {
  const canvas = document.createElement('canvas');
  canvas.width = type === 'ex' ? 60 : 100;
  canvas.height = 60;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (type === 'its') {
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, canvas.height / 2, 50, 20, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2166d1';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'white';
    ctx.stroke();
  }

  return new Promise(resolve => {
    if (type === 'ex') {
      const img = new Image();
      img.src = '/image/cctv_signs/cctv_ex_signs.png';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawText(ctx, number, canvas);
        resolve(canvas.toDataURL());
      };
    } else {
      drawText(ctx, number, canvas);
      resolve(canvas.toDataURL());
    }
  });
}

function drawText(ctx, number, canvas) {
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(number, canvas.width / 2, canvas.height / 2);
}

async function loadRoadList() {
  const list = document.getElementById('roadList');
  if (!list) return;
  list.innerHTML = '';

  const roads = currentCctvType === 'ex' ? exList : itsList;
  const sortedRoads = [...roads].sort((a, b) => {
    const numA = parseInt(String(a.road_number).replace(/\D/g, ''));
    const numB = parseInt(String(b.road_number).replace(/\D/g, ''));
    return numA - numB;
  });

  const roadElements = await Promise.all(sortedRoads.map(async road => {
    const iconUrl = await generateRoadIconBase64(currentCctvType, road.road_number);
    const li = document.createElement('li');
    li.className = 'list-group-item list-group-item-action';

    li.innerHTML = `
      <div style="display: flex; flex-direction: column;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="${iconUrl}" style="width: 36px; height: 36px; flex-shrink: 0;" />
            <strong>${road.road_name}</strong>
          </div>
          <button class="btn btn-sm btn-outline-secondary sort-btn" style="display: none;" title="정렬 순서 변경">↕</button>
        </div>
        <div class="road-section-summary" style="font-size: 0.9em; color: #666; margin-left: 44px;"></div>
      </div>
    `;

    li.addEventListener('click', () => toggleSection(li, road));
    return li;
  }));

  roadElements.forEach(li => list.appendChild(li));
}

function toggleSection(li, road) {
  const sectionEl = li.nextElementSibling;
  const summary = li.querySelector('.road-section-summary');

  if (sectionEl?.classList.contains('road-section')) {
    clearCctvMarkers();
    sectionEl.remove();
    summary.textContent = '';
    li.querySelector('.sort-btn').style.display = 'none';
    return;
  }

  loadRoadCctvMarkers(road);
  summary.innerHTML = `<strong>${road.route_section}</strong> <span style="font-size:0.85em;"></span>`;

  const ul = document.createElement('ul');
  ul.className = 'road-section';

  const cctvs = sortAscending ? road.cctvs : road.cctvs.slice().reverse();
  cctvs.forEach(name => {
    const data = findCctvMatch(name, road.road_name);
    if (!data) return;
    const sub = document.createElement('li');
    sub.className = 'list-group-item';
    sub.textContent = name;
    sub.addEventListener('click', e => {
      e.stopPropagation();
      const latlng = new naver.maps.LatLng(+data.coordy, +data.coordx);
      playVideo(data.cctvurl, data.cctvname, latlng);
    });
    ul.appendChild(sub);
  });

  li.insertAdjacentElement('afterend', ul);

  const sortBtn = li.querySelector('.sort-btn');
  sortBtn.style.display = 'inline-block';
  sortBtn.onclick = e => {
    e.stopPropagation();
    sortAscending = !sortAscending;
    ul.remove();
    summary.textContent = '';
    toggleSection(li, road);
  };
}

function loadRoadCctvMarkers(road) {
  clearCctvMarkers();
  const bounds = new naver.maps.LatLngBounds();
  (road.cctvs || []).forEach(name => {
    const data = findCctvMatch(name, road.road_name);
    if (!data) return;
    const lat = +data.coordy, lng = +data.coordx;
    if (isNaN(lat) || isNaN(lng)) return;
    const marker = new naver.maps.Marker({
      map,
      position: new naver.maps.LatLng(lat, lng),
      title: name,
      icon: {
        url: '/image/cctv-icon.png', // ✅ 여기에 원하는 이미지 경로
        size: new naver.maps.Size(44, 66),
        scaledSize: new naver.maps.Size(32, 32),
        origin: new naver.maps.Point(0, 0),
        anchor: new naver.maps.Point(22, 22)
      }
    });
    naver.maps.Event.addListener(marker, 'click', () => playVideo(data.cctvurl, data.cctvname, marker.getPosition()));
    cctvMarkers.push(marker);
    bounds.extend(marker.getPosition());
  });
  if (cctvMarkers.length) map.fitBounds(bounds);
}

function playVideo(url, name, position) {
  const c = document.getElementById('videoContainer');
  const v = document.getElementById('cctvVideo');
  const t = document.getElementById('videoTitle');
  t.textContent = name;
  currentVideoUrl = url;
  if (hls) hls.destroy();
  hls = new Hls();
  hls.loadSource(url);
  hls.attachMedia(v);
  hls.on(Hls.Events.MANIFEST_PARSED, () => v.play().catch(console.warn));
  c.style.display = 'block';
  v.style.display = 'block';
  map.panTo(position);
  const rect = document.getElementById('map').getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  c.style.left = `${cx - c.offsetWidth / 2}px`;
  c.style.top = `${cy - c.offsetHeight / 2 + 130}px`;
  document.getElementById('closeVideoBtn').onclick = hideVideo;
  document.getElementById('fullscreenBtn').onclick = () => v.requestFullscreen?.();
  document.getElementById('openNewTabBtn').onclick = () => openInNewTab(currentVideoUrl, name);
  makeVideoContainerDraggable();
}

function openInNewTab(url, title) {
  const win = window.open('', '_blank', 'width=800,height=600');
  win.document.write(`
    <html><head><title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>body{margin:0;background:#000;}video{width:100%;height:100vh;object-fit:contain;}</style>
    </head><body>
    <video id="video" controls autoplay muted></video>
    <script>
      const video = document.getElementById('video');
      if (Hls.isSupported()) {
        const hls2 = new Hls();
        hls2.loadSource('${url}');
        hls2.attachMedia(video);
        hls2.on(Hls.Events.MANIFEST_PARSED, ()=>video.play());
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src='${url}'; video.play();
      }
    </script></body></html>`);
}

function hideVideo() {
  if (hls) hls.destroy();
  hls = null;
  document.getElementById('videoContainer').style.display = 'none';
}

function clearCctvMarkers() {
  cctvMarkers.forEach(m => m.setMap(null));
  cctvMarkers = [];
}

function makeVideoContainerDraggable() {
  const container = document.getElementById('videoContainer');
  const header = container.querySelector('.video-header');

  container.style.position = 'absolute';

  let dragging = false, offsetX = 0, offsetY = 0;

  header.style.cursor = 'grab';

  header.addEventListener('mousedown', (e) => {
    const rect = header.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;

    // ✅ 상단 절반만 드래그 가능
    if (relativeY > rect.height / 2) return;

    dragging = true;

    // ✅ 마우스 위치와 컨테이너 왼쪽 위 사이 거리 계산
    const containerRect = container.getBoundingClientRect();
    offsetX = e.clientX - containerRect.left;
    offsetY = e.clientY - containerRect.top;

    header.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;

    // ✅ 마우스 위치 기준으로 정확히 따라감
    const nx = Math.min(Math.max(0, e.clientX - offsetX), window.innerWidth - container.offsetWidth);
    const ny = Math.min(Math.max(0, e.clientY - offsetY), window.innerHeight - container.offsetHeight);

    window.requestAnimationFrame(() => {
      container.style.left = `${nx}px`;
      container.style.top = `${ny}px`;
    });
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
    header.style.cursor = 'grab';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(37.5665, 126.9780),
    zoom: 7
  });
  document.querySelectorAll('.map-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      map.setMapTypeId(naver.maps.MapTypeId[type]);
    });
  });
  document.getElementById('highway')?.addEventListener('click', () => {
    currentCctvType = 'ex';
    loadRoadList();
  });
  document.getElementById('normalroad')?.addEventListener('click', () => {
    currentCctvType = 'its';
    loadRoadList();
  });
  preloadAllCctvs();
});

document.getElementById('tabHighway')?.addEventListener('click', () => {
  currentCctvType = 'ex';
  document.getElementById('roadList').style.display = 'block';
  clearCctvMarkers();
  loadRoadList();
});

document.getElementById('tabNormalroad')?.addEventListener('click', () => {
  currentCctvType = 'its';
  document.getElementById('roadList').style.display = 'block';
  clearCctvMarkers();
  loadRoadList();
});

// ✅ 전역 등록
window.preloadAllCctvs = preloadAllCctvs;
window.loadRoadList = loadRoadList;
window.clearCctvMarkers = clearCctvMarkers;
window.hideVideo = hideVideo;