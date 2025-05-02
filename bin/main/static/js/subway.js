// ✅ 초기 설정
let subwayLayerVisible = false;
let subwayMarkers = [];
let stationMarkers = [];
let subwayRefreshInterval = null;
const stationCoordMap = {};
const stationLinesMap = {};

const subwayLines = [
  "1호선", "2호선", "3호선", "4호선", "5호선",
  "6호선", "7호선", "8호선", "9호선",
  "수인분당선", "신분당선", "경의중앙선", "경춘선", "공항철도",
  "서해선", "김포골드라인"
];

// ✅ 노선 그래프 자동 생성기
async function generateSubwayGraph() {
  const response = await fetch('/json/subway_station_master.json');
  const json = await response.json();
  const data = json.DATA;

  const lineMap = {};
  data.forEach(station => {
    const line = station.route.trim();
    const name = station.bldn_nm.trim();
    if (!lineMap[line]) lineMap[line] = [];
    lineMap[line].push({ name, order: parseInt(station.bldn_id) });
  });

  const graph = {};
  Object.entries(lineMap).forEach(([line, stations]) => {
    stations.sort((a, b) => a.order - b.order);
    for (let i = 0; i < stations.length; i++) {
      const curr = stations[i].name;
      const prev = stations[i - 1]?.name;
      const next = stations[i + 1]?.name;
      if (!graph[curr]) graph[curr] = new Set();
      if (prev) graph[curr].add(prev);
      if (next) graph[curr].add(next);
    }
  });

  const finalGraph = {};
  for (const [station, neighbors] of Object.entries(graph)) {
    finalGraph[station] = Array.from(neighbors);
  }
  console.log("✅ subwayGraph 생성 완료");
  return finalGraph;
}

// ✅ 역 좌표 및 노선 매핑
async function loadStationCoordMapFromJson() {
  return fetch('/json/subway_station_master.json')
    .then(res => res.json())
    .then(json => {
      json.DATA.forEach(station => {
        const name = station.bldn_nm.trim();
        const lat = parseFloat(station.lat);
        const lng = parseFloat(station.lot);
        stationCoordMap[name] = { lat, lng };

        const line = station.route.trim();
        if (!stationLinesMap[name]) stationLinesMap[name] = [];
        if (!stationLinesMap[name].includes(line)) {
          stationLinesMap[name].push(line);
        }
      });
      console.log('📍 역 좌표 및 노선 매핑 완료');
    })
    .catch(err => console.error("🚨 역 좌표 로드 실패:", err));
}

// ✅ 사이드바 버튼 클릭 시 동작
document.getElementById('sidebarSubwayBtn').addEventListener('click', () => {
  subwayLayerVisible = !subwayLayerVisible;
  if (subwayLayerVisible) {
    console.log("🚇 지하철 ON");
    document.getElementById('subwayFilterPanel')?.style.setProperty('display', 'flex');
    Promise.all([generateSubwayGraph(), loadStationCoordMapFromJson()])
      .then(([graph]) => {
        window.subwayGraph = graph;
        renderLineCheckboxes();
        loadSubwayStations();
      });
  } else {
    console.log("🚇 지하철 OFF");
    document.getElementById('subwayFilterPanel')?.style.setProperty('display', 'none');
    clearSubwayLayer();
    clearStationMarkers();
    clearInterval(subwayRefreshInterval);
    subwayRefreshInterval = null;
  }
});

function loadSubwayStations() {
  fetch('/json/subway_station_master.json')
    .then(response => response.json())
    .then(json => {
      json.DATA.forEach(station => {
        const lat = parseFloat(station.lat);
        const lng = parseFloat(station.lot);
        const name = station.bldn_nm;
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(lat, lng),
          map,
          icon: {
            content: `<div style="background:#34c759;padding:4px 8px;border-radius:8px;font-size:12px;color:white;">🚉 ${name}</div>`,
            anchor: new naver.maps.Point(15, 15)
          }
        });
        stationMarkers.push(marker);
      });
    })
    .catch(err => console.error('🚨 역 마커 로드 오류:', err));
}

function handleLineFilterChange() {
  clearSubwayLayer();
  const selectedLines = Array.from(document.querySelectorAll('#lineCheckboxContainer input:checked')).map(cb => cb.value);
  selectedLines.forEach(line => {
    const url = `http://swopenapi.seoul.go.kr/api/subway/616753694e776a64353258554c756b/xml/realtimePosition/0/1000/${line}`;
    fetch(url)
      .then(res => res.text())
      .then(str => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(str, "text/xml");
        const rows = xml.getElementsByTagName('row');
        for (let i = 0; i < rows.length; i++) {
          const statnNm = rows[i].getElementsByTagName('statnNm')[0]?.textContent?.trim();
          const trainNo = rows[i].getElementsByTagName('trainNo')[0]?.textContent;
          const coords = stationCoordMap[statnNm];
          if (!coords) continue;
          const marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(coords.lat, coords.lng),
            map,
            icon: {
              content: `<div style="background:#007AFF;padding:4px 8px;border-radius:6px;font-size:11px;color:white;">🚇 ${statnNm}<br>#${trainNo}<br>(${line})</div>`,
              anchor: new naver.maps.Point(15, 15)
            }
          });
          subwayMarkers.push(marker);
        }
      })
      .catch(err => console.warn(`⚠️ ${line} 위치 오류:`, err));
  });
}

async function findSubwayRoute() {
  const start = document.getElementById('startStationInput').value.trim();
  const end = document.getElementById('endStationInput').value.trim();
  const resultBox = document.getElementById('routeResultBox');
  resultBox.innerHTML = '';

  if (!start || !end) {
    alert("🚩 탑승역과 하차역을 모두 입력하세요.");
    return;
  }
  if (!(start in stationCoordMap) || !(end in stationCoordMap)) {
    resultBox.innerHTML = `<div class="alert alert-warning">⛔ 입력한 역이 존재하지 않거나 좌표 데이터가 없습니다.</div>`;
    return;
  }

  const path = findSubwayPathBFS(start, end);
  if (!path) {
    resultBox.innerHTML = `<div class="alert alert-danger">❌ 경로를 찾을 수 없습니다.</div>`;
    return;
  }

  const totalDistance = path.reduce((sum, curr, idx, arr) => {
    if (idx === 0) return 0;
    const prev = arr[idx - 1];
    return sum + haversineDistance(
      stationCoordMap[prev].lat, stationCoordMap[prev].lng,
      stationCoordMap[curr].lat, stationCoordMap[curr].lng
    );
  }, 0);

  const estimatedTime = Math.ceil((totalDistance / 0.5) * 2);
  const now = new Date();
  const arrivalTime = new Date(now.getTime() + estimatedTime * 60000);
  const arrivalStr = arrivalTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });

  const infoBox = document.createElement('div');
  infoBox.className = 'alert alert-info mb-2';
  infoBox.innerHTML = `
    <b>총 역 수:</b> ${path.length}개<br>
    <b>예상 소요 시간:</b> ⏱ 약 ${estimatedTime}분<br>
    <b>도착 예상 시각:</b> 🕒 ${arrivalStr}
  `;
  resultBox.appendChild(infoBox);

  const showAllButton = document.createElement('button');
  showAllButton.className = 'btn btn-outline-secondary btn-sm mb-2';
  showAllButton.textContent = '전체 역 마커 보기';
  showAllButton.onclick = () => {
    clearStationMarkers();
    loadSubwayStations();
  };
  resultBox.appendChild(showAllButton);

  resultBox.insertAdjacentHTML('beforeend', await renderRouteListHTML(path));
  showOnlyPathMarkers(path);
}

function findSubwayPathBFS(start, end) {
  const queue = [[start]];
  const visited = new Set();
  const graph = window.subwayGraph;
  while (queue.length > 0) {
    const path = queue.shift();
    const last = path[path.length - 1];
    if (last === end) return path;
    if (!visited.has(last) && graph[last]) {
      visited.add(last);
      graph[last].forEach(next => {
        if (!visited.has(next)) {
          queue.push([...path, next]);
        }
      });
    }
  }
  return null;
}

async function renderRouteListHTML(path) {
  let html = '';
  let currentLine = null;
  let sectionStations = [];

  const getCommonLine = (a, b) => {
    const linesA = stationLinesMap[a] || [];
    const linesB = stationLinesMap[b] || [];
    return linesA.find(line => linesB.includes(line));
  };

  const arrivalInfo = await fetch("http://swopenapi.seoul.go.kr/api/subway/616753694e776a64353258554c756b/xml/realtimeStationArrival/0/1000/")
    .then(res => res.text())
    .then(xmlStr => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlStr, "text/xml");
      const rows = xml.getElementsByTagName("row");
      const map = {};
      for (let i = 0; i < rows.length; i++) {
        const name = rows[i].getElementsByTagName("statnNm")[0]?.textContent?.trim();
        const msg = rows[i].getElementsByTagName("arvlMsg2")[0]?.textContent?.trim();
        if (!name || !msg) continue;
        if (!map[name]) map[name] = [];
        if (map[name].length < 2) map[name].push(msg);
      }
      return map;
    })
    .catch(err => {
      console.warn("❌ 실시간 도착정보 불러오기 실패", err);
      return {};
    });

  for (let i = 0; i < path.length; i++) {
    const curr = path[i];
    const prev = path[i - 1];
    const messages = arrivalInfo[curr] || [];
    const arrivalHTML = messages.length
      ? `<div style="font-size:12px;color:#555;">${messages.map(m => `🚈 ${m}`).join("<br>")}</div>`
      : '';

    if (i === 0) {
      sectionStations.push(`<div>${curr}${arrivalHTML}</div>`);
      continue;
    }

    const commonLine = getCommonLine(prev, curr);
    if (!currentLine) {
      currentLine = commonLine;
      sectionStations.push(`<div>${curr}${arrivalHTML}</div>`);
      continue;
    }

    if (commonLine === currentLine) {
      sectionStations.push(`<div>${curr}${arrivalHTML}</div>`);
    } else {
      html += renderLineSection(currentLine, sectionStations);
      html += renderTransferBadge(prev, currentLine, commonLine);
      currentLine = commonLine;
      sectionStations = [`<div>${prev}${arrivalHTML}</div>`, `<div>${curr}${arrivalHTML}</div>`];
    }
  }
  html += renderLineSection(currentLine, sectionStations);
  return html;
}

function renderLineSection(line, stations) {
  return `
    <div class="mb-2">
      <div class="fw-bold mb-1">🚇 ${line}</div>
      <ul class="list-group">
        ${stations.map(st => `<li class="list-group-item">${st}</li>`).join('')}
      </ul>
    </div>
  `;
}

function renderTransferBadge(station, fromLine, toLine) {
  return `
    <div class="text-center my-2">
      <span class="badge bg-warning text-dark">
        ⚡ ${station} 환승: ${fromLine} → ${toLine}
      </span>
    </div>
  `;
}

function showOnlyPathMarkers(path) {
  clearStationMarkers();
  path.forEach(name => {
    const coord = stationCoordMap[name];
    if (!coord) return;
    const marker = new naver.maps.Marker({
      position: new naver.maps.LatLng(coord.lat, coord.lng),
      map,
      icon: {
        content: `<div style="background:#34c759;padding:4px 8px;border-radius:8px;font-size:12px;color:white;">🚉 ${name}</div>`,
        anchor: new naver.maps.Point(15, 15)
      }
    });
    stationMarkers.push(marker);
  });
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(x) {
  return x * Math.PI / 180;
}

function renderLineCheckboxes() {
  const container = document.getElementById('lineCheckboxContainer');
  container.innerHTML = '';
  subwayLines.forEach(line => {
    const id = `line-${line}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.value = line;
    checkbox.checked = false;
    checkbox.classList.add('form-check-input');
    const label = document.createElement('label');
    label.setAttribute('for', id);
    label.classList.add('form-check-label', 'me-2');
    label.innerText = line;
    const wrapper = document.createElement('div');
    wrapper.classList.add('form-check', 'form-check-inline');
    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    container.appendChild(wrapper);
    checkbox.addEventListener('change', handleLineFilterChange);
  });
}

function clearSubwayLayer() {
  subwayMarkers.forEach(m => m.setMap(null));
  subwayMarkers = [];
}

function clearStationMarkers() {
  stationMarkers.forEach(m => m.setMap(null));
  stationMarkers = [];
}

// ✅ 다른 사이드 버튼 클릭 시 지하철 OFF 처리
document.querySelectorAll(".sidebar button").forEach(btn => {
  btn.addEventListener("click", (e) => {
    if (e.currentTarget.id === 'sidebarSubwayBtn') return;
    if (subwayLayerVisible) {
      subwayLayerVisible = false;
      document.getElementById('subwayFilterPanel')?.style.setProperty('display', 'none');
      clearSubwayLayer();
      clearStationMarkers();
      clearInterval(subwayRefreshInterval);
      subwayRefreshInterval = null;
      console.log("🚇 지하철 OFF (다른 기능 클릭)");
    }
  });
});


