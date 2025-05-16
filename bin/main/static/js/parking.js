// ✅ 서울시 구별 중심 좌표 정의
const guCenterMap = {
  "강남구": { lat: 37.5172, lng: 127.0473 },
  "강동구": { lat: 37.5301, lng: 127.1238 },
  "강북구": { lat: 37.6396, lng: 127.0256 },
  "강서구": { lat: 37.5509, lng: 126.8495 },
  "관악구": { lat: 37.4784, lng: 126.9516 },
  "광진구": { lat: 37.5384, lng: 127.0823 },
  "구로구": { lat: 37.4954, lng: 126.8874 },
  "금천구": { lat: 37.4603, lng: 126.9009 },
  "노원구": { lat: 37.6542, lng: 127.0568 },
  "도봉구": { lat: 37.6688, lng: 127.0472 },
  "동대문구": { lat: 37.5744, lng: 127.0396 },
  "동작구": { lat: 37.5124, lng: 126.9393 },
  "마포구": { lat: 37.5663, lng: 126.9014 },
  "서대문구": { lat: 37.5791, lng: 126.9368 },
  "서초구": { lat: 37.4836, lng: 127.0326 },
  "성동구": { lat: 37.5633, lng: 127.0360 },
  "성북구": { lat: 37.5894, lng: 127.0167 },
  "송파구": { lat: 37.5145, lng: 127.1056 },
  "양천구": { lat: 37.5170, lng: 126.8666 },
  "영등포구": { lat: 37.5263, lng: 126.8962 },
  "용산구": { lat: 37.5324, lng: 126.9907 },
  "은평구": { lat: 37.6027, lng: 126.9291 },
  "종로구": { lat: 37.5729, lng: 126.9794 },
  "중구": { lat: 37.5636, lng: 126.9976 },
  "중랑구": { lat: 37.6063, lng: 127.0928 }
};

let parkingMarkers = [];

window.clearParkingMarkers = function () {
  parkingMarkers.forEach(m => {
    if (m._infoWindow) {
      m._infoWindow.close();
      m._infoWindow = null;
    }
    m.setMap(null);
  });
  parkingMarkers = [];
};

window.loadSeoulCityParking = function () {
  fetch('/api/parking')
    .then(res => res.json())
    .then(list => {
      // console.log("📍 주차장 목록:", list);
      window.clearParkingMarkers();
      window.parkingListData = list;
      window.initRegionSelectors();
      window.renderParkingList(list);

      list.forEach(p => {
        const lat = parseFloat(p.lat);
        const lng = parseFloat(p.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const marker = new naver.maps.Marker({
          map,
          position: new naver.maps.LatLng(lat, lng),
          title: p.name,
          icon: {
            url: '/image/parking-icon.png',
            size: new naver.maps.Size(28, 40),
            anchor: new naver.maps.Point(14, 40)
          }
        });

        const info = new naver.maps.InfoWindow({
          content: `
            <div style="padding:6px 12px;">
              🅿️ <strong>${p.name}</strong><br/>
              📍 ${p.address}<br/>
              🚗 ${p.currentCount} / ${p.capacity} 대
            </div>`
        });

        naver.maps.Event.addListener(marker, 'click', () => {
          info.open(map, marker);
        });

        marker._infoWindow = info;
        parkingMarkers.push(marker);
      });
    })
    .catch(err => {
      console.error("❌ 주차장 불러오기 실패", err);
      alert("주차장 정보를 불러올 수 없습니다.");
    });
};

window.renderParkingList = function (list) {
  const box = document.getElementById("parkingListBox");
  const countText = document.getElementById("parkingCount");
  box.innerHTML = "";

  if (!list.length) {
    box.innerHTML = '<div class="text-muted">표시할 주차장이 없습니다.</div>';
    if (countText) countText.textContent = 0;
    return;
  }

  list.forEach(p => {
    const available = p.capacity - p.currentCount;

    const div = document.createElement("div");
    div.className = "list-group-item list-group-item-action";
    div.innerHTML = `
      <div class="fw-bold text-primary">${p.name}</div>
      <div class="small text-muted">📍 ${p.address}</div>
      <div class="small">
        전체주차면: <strong>${p.capacity}</strong> |
        <span class="${available === 0 ? 'text-danger' : 'text-success'}">주차가능: ${available}면</span>
      </div>
    `;

    div.onclick = () => {
      const marker = parkingMarkers.find(m => m.getTitle() === p.name);
      if (marker) {
        map.panTo(marker.getPosition());
        naver.maps.Event.trigger(marker, 'click');
      }
    };

    box.appendChild(div);
  });

  if (countText) countText.textContent = list.length;
};

function extractGuDongFromList(list) {
  const guSet = new Set();
  const dongMap = {};

  list.forEach(p => {
    const parts = p.address.trim().split(" ");
    const gu = parts.find(word => word.endsWith("구"));
    const dong = parts.find(word => /(동|로|가)$/.test(word));
    if (!gu || !dong) return;

    guSet.add(gu);
    if (!dongMap[gu]) dongMap[gu] = new Set();
    dongMap[gu].add(dong);
  });

  return {
    guList: Array.from(guSet).sort(),
    dongMap: Object.fromEntries(Object.entries(dongMap).map(([k, v]) => [k, Array.from(v).sort()]))
  };
}

window.initRegionSelectors = function () {
  const { guList, dongMap } = extractGuDongFromList(window.parkingListData || []);
  const guSelect = document.getElementById('parkingGuSelect');
  const dongSelect = document.getElementById('parkingDongSelect');

  guSelect.innerHTML = '<option value="">전체 구</option>';
  dongSelect.innerHTML = '<option value="">전체 동</option>';

  guList.forEach(gu => {
    guSelect.innerHTML += `<option value="${gu}">${gu}</option>`;
  });

  // ✅ 함수 분리해서 onchange, onclick 모두 연결
  function handleGuChange() {
    const selectedGu = guSelect.value;

    dongSelect.innerHTML = '<option value="">전체 동</option>';
    if (dongMap[selectedGu]) {
      dongMap[selectedGu].forEach(dong => {
        dongSelect.innerHTML += `<option value="${dong}">${dong}</option>`;
      });
    }

    if (guCenterMap[selectedGu]) {
      const center = guCenterMap[selectedGu];
      const latLng = new naver.maps.LatLng(center.lat, center.lng);

      if (window.INITIAL_ZOOM !== null) {
        map.setZoom(window.INITIAL_ZOOM);
      }

      map.panTo(latLng);
    }

    filterParkingByRegion();
  }

  guSelect.onchange = handleGuChange;
  guSelect.onclick = handleGuChange; // ✅ 같은 구 다시 눌러도 작동

  dongSelect.onchange = filterParkingByRegion;
};

window.filterParkingByRegion = function () {
  const gu = document.getElementById('parkingGuSelect').value;
  const dong = document.getElementById('parkingDongSelect').value;
  const keyword = document.getElementById('parkingSearchInput').value.trim().toLowerCase();

  let filtered = window.parkingListData || [];

  if (gu) filtered = filtered.filter(p => p.address.includes(gu));
  if (dong) filtered = filtered.filter(p => p.address.includes(dong));
  if (keyword) filtered = filtered.filter(p => p.name.toLowerCase().includes(keyword));

  renderParkingList(filtered);
};

window.searchParking = function () {
  filterParkingByRegion();
};

window.resetParkingPanel = function () {
  document.getElementById('parkingSearchInput').value = '';
  document.getElementById('parkingGuSelect').value = '';
  document.getElementById('parkingDongSelect').value = '';
  filterParkingByRegion();
};
