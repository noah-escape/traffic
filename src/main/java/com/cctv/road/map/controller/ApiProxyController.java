package com.cctv.road.map.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

import io.github.cdimascio.dotenv.Dotenv;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/proxy")
public class ApiProxyController {

    private final WebClient naverClient;
    private final WebClient seoulBusClient;
    private final WebClient kakaoClient;
    private final WebClient defaultClient;
    private final WebClient webClient;

    private final Dotenv dotenv = Dotenv.load(); // ✅ .env 로드

    @Autowired
    public ApiProxyController(WebClient.Builder builder) {
        this.naverClient = builder.baseUrl("https://naveropenapi.apigw.ntruss.com").build();
        this.seoulBusClient = builder.baseUrl("http://ws.bus.go.kr").build();
        this.kakaoClient = builder.baseUrl("https://dapi.kakao.com").build();
        this.webClient = builder.baseUrl("http://openapi.seoul.go.kr:8088").build();
        this.defaultClient = builder.build();
    }

    // 🔹 네이버 길찾기
    @GetMapping("/naver-direction")
    public Mono<String> getNaverDirectionRoute(
            @RequestParam double startLat,
            @RequestParam double startLng,
            @RequestParam double goalLat,
            @RequestParam double goalLng) {

        return naverClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/map-direction/v1/driving")
                        .queryParam("start", startLng + "," + startLat)
                        .queryParam("goal", goalLng + "," + goalLat)
                        .queryParam("option", "trafast")
                        .build())
                .header("X-NCP-APIGW-API-KEY-ID", dotenv.get("NAVER_MAP_CLIENT_ID"))
                .header("X-NCP-APIGW-API-KEY", dotenv.get("NAVER_MAP_CLIENT_SECRET"))
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(String.class);
    }

    // 🔹 네이버 지오코딩
    @GetMapping("/naver-geocode")
    public Mono<String> geocode(@RequestParam String query) {
        return naverClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/map-geocode/v2/geocode")
                        .queryParam("query", query)
                        .build())
                .header("X-NCP-APIGW-API-KEY-ID", dotenv.get("NAVER_MAP_CLIENT_ID"))
                .header("X-NCP-APIGW-API-KEY", dotenv.get("NAVER_MAP_CLIENT_SECRET"))
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(String.class);
    }

    // 🔹 네이버 장소 검색
    @GetMapping("/naver-place")
    public Mono<String> searchPlace(@RequestParam String query) {
        return naverClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/map-place/v1/search")
                        .queryParam("query", query)
                        .queryParam("coordinate", "127.1054328,37.3595953")
                        .build())
                .header("X-NCP-APIGW-API-KEY-ID", dotenv.get("NAVER_MAP_CLIENT_ID"))
                .header("X-NCP-APIGW-API-KEY", dotenv.get("NAVER_MAP_CLIENT_SECRET"))
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(String.class);
    }

    // 🔹 카카오 장소 검색
    @GetMapping("/kakao-place")
    public Mono<String> searchKakaoPlace(@RequestParam String query) {
        return kakaoClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v2/local/search/keyword.json")
                        .queryParam("query", query)
                        .build())
                .header("Authorization", "KakaoAK " + dotenv.get("KAKAO_REST_API_KEY"))
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(String.class);
    }

    // 🔹 서울시 버스 정류장 검색
    @GetMapping("/busStationList")
    public Mono<String> getBusStationsByName(@RequestParam String keyword) {
        return seoulBusClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/rest/stationinfo/getStationByName")
                        .queryParam("serviceKey", dotenv.get("SEOUL_BUS_API_KEY"))
                        .queryParam("stSrch", keyword)
                        .queryParam("resultType", "json")
                        .build())
                .retrieve()
                .bodyToMono(String.class);
    }

    // 🔹 버스 실시간 위치
    @GetMapping("/busPos")
    public Mono<String> getBusPositions(@RequestParam String routeId) {
        return seoulBusClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/rest/buspos/getBusPosByRtid")
                        .queryParam("serviceKey", dotenv.get("SEOUL_BUS_API_KEY"))
                        .queryParam("busRouteId", routeId)
                        .queryParam("resultType", "json")
                        .build())
                .retrieve()
                .bodyToMono(String.class);
    }

    // 🔹 ITS 도로 이벤트 전체
    @GetMapping("/road-event-all")
    public Mono<String> getAllRoadEvents() {
        return defaultClient.get()
                .uri("https://openapi.its.go.kr:9443/eventInfo?apiKey={apiKey}&type=all&eventType=all&getType=json",
                        dotenv.get("ITS_API_KEY"))
                .retrieve()
                .bodyToMono(String.class);
    }

    // 🔹 ITS 도로 이벤트 (영역)
    @GetMapping("/road-event")
    public Mono<String> getRoadEventInBounds(
            @RequestParam double minX,
            @RequestParam double minY,
            @RequestParam double maxX,
            @RequestParam double maxY) {

        WebClient eventClient = WebClient.builder()
                .baseUrl("https://openapi.its.go.kr:9443")
                .exchangeStrategies(ExchangeStrategies.builder()
                        .codecs(config -> config.defaultCodecs().maxInMemorySize(3 * 1024 * 1024))
                        .build())
                .build();

        return eventClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/eventInfo")
                        .queryParam("apiKey", dotenv.get("ITS_API_KEY"))
                        .queryParam("type", "all")
                        .queryParam("eventType", "all")
                        .queryParam("getType", "json")
                        .queryParam("minX", minX)
                        .queryParam("maxX", maxX)
                        .queryParam("minY", minY)
                        .queryParam("maxY", maxY)
                        .build())
                .retrieve()
                .bodyToMono(String.class);
    }

    // 🔹 지하철 실시간 위치
    @GetMapping("/subway/arrival")
    public Mono<String> getSubwayArrival() {
        String key = dotenv.get("SEOUL_SUBWAY_API_KEY");
        String url = String.format(
                "http://swopenapi.seoul.go.kr/api/subway/%s/xml/realtimeStationArrival/0/1000/",
                key);

        System.out.println("📡 지하철 도착정보 요청: " + url);

        return defaultClient.get()
                .uri(url)
                .retrieve()
                .onStatus(status -> !status.is2xxSuccessful(),
                        response -> response.bodyToMono(String.class).flatMap(body -> {
                            System.err.println("❌ API 오류 상태코드: " + response.statusCode());
                            System.err.println("❌ API 오류 응답 본문:\n" + body);
                            return Mono.error(new RuntimeException("지하철 도착 정보 API 실패: " + body));
                        }))
                .bodyToMono(String.class);
    }

    // 🔹 서울시 따릉이
    @GetMapping("/bike-list")
    public Mono<String> getBikeList() {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/{apiKey}/json/bikeList/1/1000/")
                        .build(dotenv.get("SEOUL_BIKE_API_KEY")))
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(String.class);
    }

    // ✅ 🅿️ 서울시 시영주차장 실시간 주차대수 정보
    @GetMapping("/parking/seoul-city")
public Mono<String> getSeoulCityParkingData() {
    String url = String.format(
            "http://openapi.seoul.go.kr:8088/%s/json/GetParkingInfo/1/1000/",
            dotenv.get("SEOUL_CITY_PARKING_API_KEY")
    );

    return WebClient.create()
            .get()
            .uri(url)
            .retrieve()
            .bodyToMono(String.class);
}
}
