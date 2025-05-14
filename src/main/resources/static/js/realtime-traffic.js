(() => {
  let trafficLayer;

  document.addEventListener("DOMContentLoaded", () => {
    const trafficBtn = document.getElementById("sidebarTrafficBtn");

    if (!trafficBtn) return;

    trafficLayer = new naver.maps.TrafficLayer({
      interval: 300000 // 5분마다 자동 갱신
    });

    trafficBtn.addEventListener("click", () => {
      const isOn = trafficLayer.getMap() !== null;

      if (isOn) {
        trafficLayer.setMap(null);
        trafficBtn.classList.remove("active");
        document.getElementById("trafficLegendBox").style.display = "none";
      } else {
        trafficLayer.setMap(map);
        trafficBtn.classList.add("active");
        document.getElementById("trafficLegendBox").style.display = "block";
      }
    });
  });
})();
