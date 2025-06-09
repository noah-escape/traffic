(() => {
  let vslMarkers = [];
  let vslOverlay = null;
  let vslAllData = [];
  let lastSelectedRoad = null;
  const roadSignThumbCache = {};

  // 썸네일 그리기 (base64 img로 중복 OK)
  function createRoadSignThumb(roadType, roadNo) {
    let width = 56, height = 31;
    if (roadType === "ex") {
      width = 46;
      height = 46;
    }
    const cacheKey = roadType + "_" + roadNo;

    // base64 데이터가 이미 있으면 바로 img 반환
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
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const img = new window.Image();
    img.src = imgSrc;

    // img.onload 안에서 base64 변환 후 캐싱 & img 반환
    const imgElem = document.createElement("img");
    imgElem.className = roadType === "ex" ? "road-thumb-ex" : "road-thumb-its";
    imgElem.width = width;
    imgElem.height = height;

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
    // 처음엔 빈 img, onload 후 src 세팅됨
    return imgElem;
  }

  function moveMapTo(lat, lng, zoom = 13) {
    if (window.map) {
      window.map.setCenter(new naver.maps.LatLng(lat, lng));
      window.map.setZoom(zoom);
    }
  }
  function toKorDirection(code) {
    if (!code) return "";
    if (code === "E") return "상행";
    if (code === "S") return "하행";
    return "";
  }
  function cleanDesc(text) {
    if (!text) return "";
    return text.replace(/\(결빙[^)]*\)/g, "").trim();
  }

  // 🚦 아코디언형 노선/세부리스트 패널 뿌리기
  async function loadVslListPanel(roadType = "ex") {
    const listElem = document.getElementById("vslListPanel");
    if (!listElem) return;
    listElem.innerHTML = `
      <li style="padding:16px 0;text-align:center;">
        <span class="vsl-loading-spinner"></span><br>
        <span style="font-size:15px;color:#1b71e5;">VSL 노선 로딩 중...</span>
      </li>
`; try {
      const data = await (await fetch("/api/vsl/realtime")).json();
      vslAllData = data;
      const roadList = await (await fetch(`/api/vsl/roads?roadType=${roadType}`)).json();
      listElem.innerHTML = "";

      roadList.forEach(road => {
        const li = document.createElement("li");
        li.className = "vsl-road-list-item";
        // 썸네일 + 도로명
        const thumb = createRoadSignThumb(road.roadType, road.roadNo);
        li.appendChild(thumb);

        // 도로명만 텍스트 (번호 X)
        const labelSpan = document.createElement("span");
        labelSpan.className = "vsl-road-label";
        labelSpan.textContent = road.roadName;
        li.appendChild(labelSpan);

        li.onclick = () => {
          const prevDetail = li.nextSibling;
          if (prevDetail && prevDetail.className === "vsl-detail-list list-group") {
            prevDetail.remove();
            hideVslMarkers();
            return;
          }
          document.querySelectorAll(".vsl-detail-list").forEach(el => el.remove());

          const details = vslAllData.filter(v => {
            let roadName = v.roadName;
            let roadNo = v.roadNo;
            if (road.roadType === "ex" && roadName.endsWith("선") && !roadName.endsWith("지선")) {
              roadName = roadName.substring(0, roadName.length - 1) + "고속도로";
            }
            if (road.roadType === "ex" && roadNo && roadNo.endsWith("0") && roadNo.length > 1) {
              roadNo = roadNo.substring(0, roadNo.length - 1);
            }
            return `${roadNo} ${roadName}` === road.fullList;
          });

          if (details.length > 0) {
            const { lat, lng } = details[0];
            if (window.map && lat && lng) {
              window.map.setCenter(new naver.maps.LatLng(lat, lng));
              window.map.setZoom(15);
            }
          }
          showVslMarkers(details);

          // 세부리스트
          let detailUl = document.createElement("ul");
          detailUl.className = "vsl-detail-list list-group";
          let detailCount = 0;

          details.forEach(v => {
            const korDir = toKorDirection(v.direction);
            if (!korDir) return;
            detailCount++;
            const dli = document.createElement("li");
            dli.className = "vsl-detail-item";
            if (v.enforcement && v.enforcement.toUpperCase() === "Y") {
              dli.classList.add("enforcement");
              dli.innerHTML = `
                <div class="detail-main">
                  <span class="detail-title">${cleanDesc(v.sectionDesc) || v.vslId}</span>
                  <span class="detail-enforcement">단속구간</span>
                </div>
                <div class="detail-sub">
                  <span class="detail-dir">${korDir}</span>
                  <span class="detail-speed">${v.currLmtSpeed || v.defLmtSpeed}km/h</span>
                </div>
              `;
            } else {
              dli.innerHTML = `
                <div class="detail-main"><b>${cleanDesc(v.sectionDesc) || v.vslId}</b></div>
                <div class="detail-sub">
                  <span class="detail-dir">${korDir}</span>
                  <span class="detail-speed">${v.currLmtSpeed || v.defLmtSpeed}km/h</span>
                </div>
              `;
            }
            dli.onclick = (e) => {
              e.stopPropagation();
              moveMapTo(v.lat, v.lng, 15);
              showVslOverlay(v);
            };
            detailUl.appendChild(dli);
          });

          if (detailCount === 0) {
            const noLi = document.createElement("li");
            noLi.textContent = "표지 없음";
            noLi.className = "vsl-detail-item";
            detailUl.appendChild(noLi);
          }
          li.parentNode.insertBefore(detailUl, li.nextSibling);
        };
        listElem.appendChild(li);
      });

      lastSelectedRoad = null;
      hideVslMarkers();
    } catch (e) {
      listElem.innerHTML = "<li>로드 실패</li>";
      console.error("[VSL] 리스트 로드 오류", e);
    }
  }

  function showVslMarkers(vslList) {
    if (!Array.isArray(vslList)) return;

    vslMarkers.forEach(m => m.setMap(null));
    vslMarkers = [];

    vslList.forEach(v => {
      if (isNaN(v.lat) || isNaN(v.lng)) return;
      let markerBorder = (v.enforcement && v.enforcement.toUpperCase() === "Y")
        ? "3px solid #d32"
        : "2px solid #d32";
      let markerShadow = (v.enforcement && v.enforcement.toUpperCase() === "Y")
        ? "0 0 9px #d32a"
        : "0 1px 6px #0003";
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(v.lat, v.lng),
        map: window.map,
        icon: {
          content: `
            <div style="
              background:#fff; color:#d32; border:${markerBorder};
              border-radius:50%; font-weight:bold; width:38px; height:38px;
              display:flex; align-items:center; justify-content:center;
              font-size:15px; box-shadow:${markerShadow};">
              ${v.currLmtSpeed || v.defLmtSpeed}
            </div>`,
          size: new naver.maps.Size(38, 38),
          anchor: new naver.maps.Point(19, 19)
        },
        zIndex: 120
      });
      naver.maps.Event.addListener(marker, "mouseover", () => showVslOverlay(v, marker));
      naver.maps.Event.addListener(marker, "mouseout", () => hideVslOverlay());
      naver.maps.Event.addListener(marker, "click", () => showVslOverlay(v, marker));
      vslMarkers.push(marker);
    });
  }

  function showVslOverlay(v, marker) {
    hideVslOverlay();
    if (!v.lat || !v.lng) return;

    let rightHtml = "";
    if (v.enforcement && v.enforcement.toUpperCase() === "Y") {
      rightHtml = `
      <span style="display:inline-flex;align-items:center;gap:5px;">
        <img src="/image/camera_icon.png"
          style="width:20px;height:20px;vertical-align:middle;"
          alt="단속 카메라"/>
        <span style="color:#d32;font-weight:bold;">단속구간</span>
      </span>
    `;
    }
    let borderStyle = (v.enforcement && v.enforcement.toUpperCase() === "Y")
      ? "border:2.5px solid #d32;"
      : "";

    const overlayContent = `
    <div style="position:relative;${borderStyle}padding:8px 13px 8px 13px;border-radius:10px;background:#fff;box-shadow:0 2px 10px #0002;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-weight:bold; color:#1976d2; font-size:15px;">
          ${v.roadName || ""}
        </span>
        ${rightHtml}
      </div>
      <div style="color:#333;font-size:13px;margin-bottom:4px;">
        ${cleanDesc(v.sectionDesc) || v.vslId}
      </div>
      <div style="color:#444;font-size:12px;">
        <b>방향</b>: ${toKorDirection(v.direction) || "-"}
        <b style="margin-left:10px;">기본속도</b>: ${v.defLmtSpeed} km/h
        <b style="margin-left:10px;color:#d32;">현재속도</b>: ${v.currLmtSpeed ?? v.defLmtSpeed} km/h
      </div>
    </div>
  `;
    vslOverlay = new naver.maps.InfoWindow({
      content: overlayContent,
      borderWidth: 0,
      disableAnchor: true,
      backgroundColor: "transparent",
      pixelOffset: new naver.maps.Point(0, -26)
    });
    const pos = marker ? marker.getPosition() : new naver.maps.LatLng(v.lat, v.lng);
    vslOverlay.open(window.map, pos);
  }

  function hideVslOverlay() {
    if (vslOverlay) vslOverlay.close();
    vslOverlay = null;
  }

  function hideVslMarkers() {
    vslMarkers.forEach(m => m.setMap(null));
    vslMarkers = [];
    hideVslOverlay();
  }

  window.showVslPanel = function () {
    document.getElementById("vslFilterPanel").style.display = "block";
    loadVslListPanel();
  };
  window.hideVslPanel = function () {
    document.getElementById("vslFilterPanel").style.display = "none";
    hideVslMarkers();
    document.getElementById("vslListPanel").innerHTML = "";
    lastSelectedRoad = null;
  };

  document.getElementById('vslTabHighway')?.addEventListener('click', () => {
    loadVslListPanel("ex");
  });
  document.getElementById('vslTabNormalroad')?.addEventListener('click', () => {
    loadVslListPanel("its");
  });

  window.loadVslListPanel = loadVslListPanel;
  window.showVslMarkers = showVslMarkers;
  window.hideVslMarkers = hideVslMarkers;
})();
