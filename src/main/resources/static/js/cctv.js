window.cctvMarkers = [];
window.currentCctvType = "ex";
window.currentSelectedRoadName = null;
window.currentSelectedRoad = null;
window.cctvOverlays = [];
let roadLineVisible = false;
const roadSignThumbCache = {};
window.roadPolylinesByUfid = new Map();

window.resetCctvPanel = function() {
  window.currentSelectedRoad = null;
  window.currentSelectedRoadName = null;
  roadLineVisible = false;
  window.clearCctvMarkers?.();
  clearRoadLines();
  window.closeAllCctvOverlays?.();
  const roadListElem = document.getElementById("roadList");
  if (roadListElem) roadListElem.innerHTML = "";
  resetRoadLineBtn?.();
};

window.closeCctvPanel = function() {
  resetCctvPanel();
  document.getElementById('cctvFilterPanel').style.display = 'none';
};

window.openCctvPanel = function() {
  resetCctvPanel();
  document.getElementById('cctvFilterPanel').style.display = 'flex';
  loadRoadList();
};

function waitForMapAndBindIdle() {
  if (!window.map || typeof window.map.getBounds !== 'function') {
    setTimeout(waitForMapAndBindIdle, 200);
    return;
  }
  naver.maps.Event.addListener(window.map, 'idle', () => {
    if (window.currentSelectedRoad && roadLineVisible) {
      if (window.currentSelectedRoad.roadType === "its") {
        renderGukdoCenterlineInView(window.currentSelectedRoad.roadNumber);
      } else {
        renderRoadLinesInView(window.currentSelectedRoad);
      }
    }
    if (window.currentSelectedRoad) {
      renderInViewCctvOnly(window.currentSelectedRoad.roadName);
    }
  });
}
waitForMapAndBindIdle();

function createRoadSignThumb(roadType, roadNo) {
  let width = 56, height = 31;
  if (roadType === "ex") { width = 46; height = 46; }
  const cacheKey = roadType + "_" + roadNo;
  if (roadSignThumbCache[cacheKey]) {
    const imgElem = document.createElement("img");
    imgElem.src = roadSignThumbCache[cacheKey];
    imgElem.className = roadType === "ex" ? "road-thumb-ex" : "road-thumb-its";
    imgElem.width = width;
    imgElem.height = height;
    return imgElem;
  }
  const imgSrc = roadType === "ex"
    ? "/image/cctv_signs/cctv_ex_signs.png"
    : "/image/cctv_signs/cctv_its_signs.png";
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  const img = new window.Image(); img.src = imgSrc;
  const imgElem = document.createElement("img");
  imgElem.className = roadType === "ex" ? "road-thumb-ex" : "road-thumb-its";
  imgElem.width = width; imgElem.height = height;
  img.onload = function () {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    ctx.font = "bold 19px Pretendard, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 3;
    ctx.strokeText(String(roadNo), width / 2, height / 2 + 2);
    ctx.fillText(String(roadNo), width / 2, height / 2 + 2);
    const dataUrl = canvas.toDataURL();
    roadSignThumbCache[cacheKey] = dataUrl;
    imgElem.src = dataUrl;
  };
  return imgElem;
}

document.addEventListener('DOMContentLoaded', () => {
  ['highway', 'tabHighway'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', () => setRoadType('ex')));
  ['normalroad', 'tabNormalroad'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', () => setRoadType('its')));
  loadRoadList();

  document.getElementById('toggleRoadLineBtn')?.addEventListener('click', async function () {
    if (!window.currentSelectedRoad) {
      alert('먼저 도로를 선택하세요!');
      return;
    }
    roadLineVisible = !roadLineVisible;
    if (roadLineVisible) {
      this.textContent = "🛣️ 도로중심선 숨기기";
      if (window.currentSelectedRoad.roadType === "its") {
        await renderGukdoCenterlineInView(window.currentSelectedRoad.roadNumber);
      } else {
        await renderRoadLinesInView(window.currentSelectedRoad);
      }
    } else {
      this.textContent = "🛣️ 도로중심선 보기";
      clearRoadLines();
    }
  });
});

function setRoadType(type) {
  if (window.currentCctvType === type) return;
  window.currentCctvType = type;
  window.currentSelectedRoadName = null;
  window.currentSelectedRoad = null;
  roadLineVisible = false;
  clearAllMapObjects();
  loadRoadList();
  resetRoadLineBtn();
}

window.loadRoadList = async function (type = window.currentCctvType) {
  const listElem = document.getElementById("roadList");
  listElem.innerHTML = "<li>로딩 중...</li>";
  try {
    const url = `/api/cctvs/roads?roadType=${type}`;
    const response = await fetch(url);
    if (!response.ok) {
      listElem.innerHTML = `<li>로드 실패 (${response.status})</li>`;
      return;
    }
    const roads = await response.json();
    listElem.innerHTML = "";
    for (const road of roads) {
      const li = document.createElement("li");
      li.className = "list-group-item list-group-item-action road-list-item";
      const rowDiv = document.createElement("div");
      rowDiv.style.display = "flex";
      rowDiv.style.alignItems = "center";
      rowDiv.style.gap = "8px";
      rowDiv.style.width = "100%";
      rowDiv.appendChild(createRoadSignThumb(road.roadType || window.currentCctvType, road.roadNumber));
      const nameElem = document.createElement("strong");
      nameElem.textContent = road.roadName;
      rowDiv.appendChild(nameElem);

      const reverseBtn = document.createElement("button");
      reverseBtn.className = "reverse-order-btn";
      reverseBtn.innerHTML = "🔄";
      reverseBtn.title = "정렬 순서 반전";
      reverseBtn.style.marginLeft = "auto";
      reverseBtn.style.border = "none";
      reverseBtn.style.background = "none";
      reverseBtn.style.cursor = "pointer";
      reverseBtn.style.fontSize = "27px";
      reverseBtn.style.opacity = "0.96";
      reverseBtn.style.color = "#1d5cff";
      reverseBtn.style.display = "none";

      rowDiv.appendChild(reverseBtn);
      li.appendChild(rowDiv);

      li.onclick = (e) => {
        e.stopPropagation();
        toggleRoadSection(li, road);
        document.querySelectorAll(".reverse-order-btn").forEach(b => b.style.display = "none");
        reverseBtn.style.display = "inline-block";
      };

      reverseBtn.onclick = (e) => {
        e.stopPropagation();
        const next = li.nextElementSibling;
        if (next && next.classList.contains('road-section-wrap')) {
          const ul = next.querySelector('ul.road-section');
          if (!ul) return;
          const items = Array.from(ul.children);
          ul.innerHTML = '';
          items.reverse().forEach(child => ul.appendChild(child));
        }
      };

      listElem.appendChild(li);
    }
  } catch (e) {
    listElem.innerHTML = "<li>로드 실패(예외)</li>";
  }
};

async function toggleRoadSection(li, road) {
  const next = li.nextElementSibling;
  if (next && next.classList.contains('road-section-wrap')) {
    next.remove();
    clearCctvMarkers();
    clearRoadLines();
    window.currentSelectedRoadName = null;
    window.currentSelectedRoad = null;
    resetRoadLineBtn();
    renderInViewCctvOnly();
    return;
  }
  document.querySelectorAll('.road-section-wrap').forEach(el => el.remove());
  clearCctvMarkers();
  clearRoadLines();

  window.currentSelectedRoad = road;
  window.currentSelectedRoadName = road.roadName;

  const url = `/api/cctvs/by-road-name?roadName=${encodeURIComponent(road.roadName)}`;
  const response = await fetch(url);
  let cctvs = await response.json();

  const wrapDiv = document.createElement("div");
  wrapDiv.className = "road-section-wrap";
  wrapDiv.style.position = "relative";
  wrapDiv.style.background = "#f8f9fa";
  wrapDiv.style.paddingTop = "8px";

  function renderCctvList(list) {
    const oldUl = wrapDiv.querySelector("ul.road-section");
    if (oldUl) oldUl.remove();

    const ul = document.createElement('ul');
    ul.className = "road-section";
    ul.style.background = "#f8f9fa";
    ul.style.padding = "5px 20px 5px 48px";
    ul.style.margin = "0";
    ul.style.borderBottom = "1px solid #eee";

    if (list.length === 0) {
      const noneLi = document.createElement("li");
      noneLi.className = "list-group-item text-danger";
      noneLi.textContent = "[CCTV 없음]";
      ul.appendChild(noneLi);
    } else {
      for (const cctv of list) {
        const cctvLi = document.createElement("li");
        cctvLi.className = "list-group-item";
        cctvLi.style.cursor = "pointer";
        cctvLi.textContent = cctv.cctvSpot || cctv.name;
        cctvLi.onclick = (e) => {
          e.stopPropagation();
          if (window.map && cctv.lat && cctv.lng) {
            window.map.setCenter(new naver.maps.LatLng(Number(cctv.lat), Number(cctv.lng)));
          }
          showCctvOverlay(cctv);
        };
        ul.appendChild(cctvLi);
      }
    }
    wrapDiv.appendChild(ul);
  }

  renderCctvList(cctvs);

  li.insertAdjacentElement('afterend', wrapDiv);

  if (cctvs.length > 0 && window.map && cctvs[0].lat && cctvs[0].lng) {
    window.map.setCenter(new naver.maps.LatLng(Number(cctvs[0].lat), Number(cctvs[0].lng)));
    window.map.setZoom(14);
  }
  renderInViewCctvOnly(road.roadName);

  if (roadLineVisible) {
    if (road.roadType === "its") {
      await renderGukdoCenterlineInView(road.roadNumber);
    } else {
      await renderRoadLinesInView(road);
    }
  }
}

function resetRoadLineBtn() {
  const btn = document.getElementById('toggleRoadLineBtn');
  if (btn) btn.textContent = "🛣️ 도로중심선 보기";
}

async function renderInViewCctvOnly(roadName = null) {
  const bounds = window.map.getBounds();
  const sw = bounds.getSW(), ne = bounds.getNE();
  let cctvUrl = `/api/cctvs/in-bounds?swLat=${sw.y}&swLng=${sw.x}&neLat=${ne.y}&neLng=${ne.x}`;
  if (roadName) cctvUrl += `&roadName=${encodeURIComponent(roadName)}`;
  if (window.currentCctvType) cctvUrl += `&roadType=${window.currentCctvType}`;
  const cctvRes = await fetch(cctvUrl);
  const cctvs = await cctvRes.json();
  drawCctvMarkers(cctvs);
}

function renderRoadUfidPolylines(coords) {
  const group = {};
  coords.forEach(c => {
    if (!group[c.roadUfid]) group[c.roadUfid] = [];
    group[c.roadUfid].push(new naver.maps.LatLng(c.lat, c.lng));
  });

  const visibleUfids = new Set(Object.keys(group));
  const prevUfids = new Set(window.roadPolylinesByUfid.keys());

  for (const ufid of prevUfids) {
    if (!visibleUfids.has(ufid)) {
      const poly = window.roadPolylinesByUfid.get(ufid);
      poly.setMap(null);
      window.roadPolylinesByUfid.delete(ufid);
    }
  }
  for (const ufid of visibleUfids) {
    const path = group[ufid];
    if (!window.roadPolylinesByUfid.has(ufid)) {
      const poly = new naver.maps.Polyline({
        map: window.map,
        path,
        strokeColor: "#007bff",
        strokeOpacity: 0.85,
        strokeWeight: 6
      });
      window.roadPolylinesByUfid.set(ufid, poly);
    } else {
      const poly = window.roadPolylinesByUfid.get(ufid);
      poly.setPath(path);
      if (!poly.getMap()) poly.setMap(window.map);
    }
  }
}

async function renderRoadLinesInView(road) {
  if (!road) return;
  const bounds = window.map.getBounds();
  const sw = bounds.getSW(), ne = bounds.getNE();
  let coordsUrl = `/api/road-coordinates/in-bounds?swLat=${sw.y}&swLng=${sw.x}&neLat=${ne.y}&neLng=${ne.x}`;
  if (road.roadType === "its") {
    coordsUrl += `&roadType=its`;
    coordsUrl += `&roadNumber=${encodeURIComponent(road.roadNumber)}`;
    coordsUrl += `&level=99`;  // 확장성 고려해서 레벨 지정
  } else {
    coordsUrl += `&roadType=ex`;
    coordsUrl += `&roadName=${encodeURIComponent(road.roadName)}`;
    coordsUrl += `&level=99`;
  }
  const coordsRes = await fetch(coordsUrl);
  const coords = await coordsRes.json();
  renderRoadUfidPolylines(coords);
}

async function renderGukdoCenterlineInView(roadNumber) {
  if (!roadNumber) return;

  const bounds = window.map.getBounds();
  const sw = bounds.getSW(), ne = bounds.getNE();

  const url =
    `/api/road-coordinates/nationalroad-centerline-in-bounds`
    + `?swLat=${sw.y}&swLng=${sw.x}`
    + `&neLat=${ne.y}&neLng=${ne.x}`
    + `&roadNumber=${encodeURIComponent(roadNumber)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      clearRoadLines();
      return;
    }
    const coords = await response.json();
    if (!coords.length) {
      alert("국도 " + roadNumber + "호선 중심선 데이터 없음");
      clearRoadLines();
      return;
    }
    renderRoadUfidPolylines(coords);
  } catch (err) {
    clearRoadLines();
  }
}

function clearRoadLines() {
  for (const poly of window.roadPolylinesByUfid.values()) {
    poly.setMap(null);
  }
  window.roadPolylinesByUfid.clear();
}

window.clearCctvMarkers = function () {
  window.cctvMarkers?.forEach(marker => marker.setMap(null));
  window.cctvMarkers = [];
  clearRoadLines();
};

function clearAllMapObjects() {
  clearCctvMarkers();
  clearRoadLines();
}

function drawCctvMarkers(cctvs) {
  clearCctvMarkers();
  if (!cctvs.length) return;
  cctvs.forEach((cctv) => {
    try {
      const lat = Number(cctv.lat), lng = Number(cctv.lng);
      if (isNaN(lat) || isNaN(lng)) return;
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(lat, lng),
        map: window.map,
        title: cctv.name,
        icon: {
          url: "/image/cctv-icon.png",
          size: new naver.maps.Size(36, 36),
          origin: new naver.maps.Point(0, 0),
          anchor: new naver.maps.Point(18, 18)
        }
      });
      marker.addListener("click", () => {
        showCctvOverlay(cctv, marker);
      });
      window.cctvMarkers.push(marker);
    } catch (e) {}
  });
}

function showCctvOverlay(cctv, marker) {
  window.closeAllCctvOverlays?.();
  const videoHtml = `
    <div class="video-container">
      <div class="video-header">
        <span class="video-title">${cctv.cctvSpot || cctv.name || ""}</span>
        <button class="cctvOverlayCloseBtn video-close-btn">&times;</button>
      </div>
      <video class="cctvVideoPlayer cctv-video" controls autoplay>
        <source src="${cctv.videoUrl}" type="application/x-mpegURL">
        영상 지원 안됨
      </video>
      <div class="video-footer">
        <button class="fullscreenBtn video-bottom-btn">전체화면</button>
        <button class="cctvOverlayPopBtn video-bottom-btn">새창</button>
      </div>
    </div>
  `;
  const overlay = new naver.maps.InfoWindow({
    content: videoHtml,
    borderWidth: 0,
    disableAnchor: true,
    backgroundColor: "transparent",
    pixelOffset: new naver.maps.Point(0, 390)
  });

  const lat = Number(cctv.lat), lng = Number(cctv.lng);
  const pos = marker
    ? marker.getPosition()
    : (lat && lng ? new naver.maps.LatLng(lat, lng) : null);
  if (!pos) return;

  overlay.open(window.map, pos);

  window.cctvOverlays = [overlay];

  setTimeout(() => {
    const root = overlay.getElement ? overlay.getElement() : document;
    const video = root.querySelector(".cctvVideoPlayer");
    if (video && window.Hls && Hls.isSupported()) {
      overlay._hls = new Hls();
      overlay._hls.loadSource(cctv.videoUrl);
      overlay._hls.attachMedia(video);
    }
    root.querySelector(".fullscreenBtn")?.addEventListener("click", () => {
      video.requestFullscreen();
    });
    root.querySelector(".cctvOverlayCloseBtn")?.addEventListener("click", () => {
      overlay.close();
      if (overlay._hls) { overlay._hls.destroy(); overlay._hls = null; }
      window.cctvOverlays = [];
    });
    root.querySelector(".cctvOverlayPopBtn")?.addEventListener("click", () => {
      if (!window.cctvNewTab || window.cctvNewTab.closed) {
        window.cctvNewTab = window.open('', "_blank");
      }
      const url = cctv.videoUrl;
      const videoPage = `
        <html>
        <head>
          <title>CCTV 영상 새창 재생</title>
          <style>
            body { margin:0; background: #111; display:flex; justify-content:center; align-items:center; height:100vh;}
            video { width:90vw; height:90vh; background:#000; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js"></script>
        </head>
        <body>
          <video id="cctvVideo" controls autoplay muted></video>
          <script>
            var video = document.getElementById('cctvVideo');
            var src = ${JSON.stringify(url)};
            if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = src;
            } else if (window.Hls) {
              var hls = new Hls();
              hls.loadSource(src);
              hls.attachMedia(video);
            } else {
              video.outerHTML = '<div style="color:#fff;font-size:20px;">HLS.js 미지원 브라우저입니다.</div>';
            }
          <\/script>
        </body>
        </html>
      `;
      window.cctvNewTab.document.write(videoPage);
      window.cctvNewTab.document.close();
    });
  }, 180);

  window.closeAllCctvOverlays = function () {
    if (window.cctvOverlays && Array.isArray(window.cctvOverlays)) {
      window.cctvOverlays.forEach(overlay => {
        overlay.close();
        if (overlay._hls) { overlay._hls.destroy(); overlay._hls = null; }
      });
      window.cctvOverlays = [];
    }
  };
}