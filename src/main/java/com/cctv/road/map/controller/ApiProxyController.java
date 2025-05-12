package com.cctv.road.map.controller;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/proxy")
public class ApiProxyController {

  private final WebClient naverClient;
  private final WebClient seoulBusClient;
  private final WebClient kakaoClient;
  private final WebClient defaultClient;

  @Value("${naver.map.client-id}")
  private String naverClientId;

  @Value("${naver.map.client-secret}")
  private String naverClientSecret;

  @Value("${kakao.rest-api-key}")
  private String kakaoRestApiKey;

  @Value("${its.api.key}")
  private String itsApiKey;

  @Value("${SEOUL_SUBWAY_API_KEY}")
  private String seoulSubwayApiKey;

  @Value("${seoul.bike.api-key}")
  private String seoulBikeApiKey;

  @Value("${seoul.bus.api-key}")
  private String seoulBusApiKey;

  private final WebClient webClient;

  public ApiProxyController(WebClient.Builder builder) {
    this.naverClient = builder.baseUrl("https://naveropenapi.apigw.ntruss.com").build();
    this.seoulBusClient = builder.baseUrl("http://ws.bus.go.kr").build();
    this.kakaoClient = builder.baseUrl("https://dapi.kakao.com").build();
    this.webClient = builder.baseUrl("http://openapi.seoul.go.kr:8088").build();
    this.defaultClient = builder.build(); // 기타 API 호출용
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
        .header("X-NCP-APIGW-API-KEY-ID", naverClientId)
        .header("X-NCP-APIGW-API-KEY", naverClientSecret)
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
        .header("X-NCP-APIGW-API-KEY-ID", naverClientId)
        .header("X-NCP-APIGW-API-KEY", naverClientSecret)
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
        .header("X-NCP-APIGW-API-KEY-ID", naverClientId)
        .header("X-NCP-APIGW-API-KEY", naverClientSecret)
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
        .header("Authorization", "KakaoAK " + kakaoRestApiKey)
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
            .queryParam("serviceKey", seoulBusApiKey)
            .queryParam("stSrch", keyword)
            .queryParam("resultType", "json")
            .build())
        .retrieve()
        .bodyToMono(String.class);
  }

  // 🔹 서울시 버스 실시간 위치 조회
  @GetMapping("/busPos")
  public Mono<String> getBusPositions(@RequestParam String routeId) {
    return seoulBusClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/api/rest/buspos/getBusPosByRtid")
            .queryParam("serviceKey", seoulBusApiKey)
            .queryParam("busRouteId", routeId)
            .queryParam("resultType", "json")
            .build())
        .retrieve()
        .bodyToMono(String.class);
  }

  // 🔹 서울시 버스 정류소 검색
  @GetMapping("/busStopList")
  public Mono<String> getBusStops(@RequestParam String keyword) {
    return seoulBusClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/api/rest/stationinfo/getStationByName")
            .queryParam("serviceKey", seoulBusApiKey)
            .queryParam("stSrch", keyword)
            .queryParam("resultType", "json")
            .build())
        .retrieve()
        .bodyToMono(String.class);
  }

  // 🔹 ITS 교통 속도 정보
  @GetMapping("/traffic-data")
  public Mono<String> getTrafficData(@RequestParam String bbox) {
    String timestamp = LocalDateTime.now().minusMinutes(5)
        .format(DateTimeFormatter.ofPattern("yyyyMMddHHmm"));

    WebClient trafficClient = WebClient.builder()
        .baseUrl("https://openapi.its.go.kr:9443")
        .exchangeStrategies(ExchangeStrategies.builder()
            .codecs(config -> config.defaultCodecs().maxInMemorySize(5 * 1024 * 1024))
            .build())
        .build();

    return trafficClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/trafficInfo")
            .queryParam("apiKey", itsApiKey)
            .queryParam("getType", "json")
            .queryParam("type", "all")
            .queryParam("req_yyyymmddhhmi", timestamp)
            .queryParam("bbox", bbox)
            .build())
        .retrieve()
        .bodyToMono(String.class);
  }

  // 🔹 ITS 도로 이벤트 (영역 내)
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
            .queryParam("apiKey", itsApiKey)
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

  // 🔹 ITS 전체 도로 이벤트
  @GetMapping("/road-event-all")
  public Mono<String> getAllRoadEvents() {
    return defaultClient.get()
        .uri("https://openapi.its.go.kr:9443/eventInfo?apiKey={apiKey}&type=all&eventType=all&getType=json", itsApiKey)
        .retrieve()
        .bodyToMono(String.class);
  }

  // 🔹 자바스크립트용: SUBWAY API 키 전달
  @GetMapping("/subway-key")
  public Mono<String> getSubwayApiKey() {
    return Mono.just(seoulSubwayApiKey);
  }

  // 🔹 따릉이 API
  @GetMapping("/bike-list")
  public Mono<String> getBikeList() {
    return webClient.get() // ❌ webClient는 필드에 선언되지 않음
        .uri(uriBuilder -> uriBuilder
            .path("/{apiKey}/json/bikeList/1/1000/")
            .build(seoulBikeApiKey))
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .bodyToMono(String.class);
  }
}
