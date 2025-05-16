package com.cctv.road.map.controller;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

import com.cctv.road.map.dto.BusRouteStopDto;
import com.cctv.road.map.repository.BusStopRepository;

import io.github.cdimascio.dotenv.Dotenv;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/proxy")
public class ApiProxyController {

  private final BusStopRepository busStopRepository;

  private final WebClient naverClient;
  private final WebClient seoulBusClient;
  private final WebClient kakaoClient;
  private final WebClient seoulOpenApiClient;
  private final WebClient itsClient;
  private final WebClient defaultClient;

  private final Dotenv dotenv = Dotenv.configure().directory("./").load();

  @Autowired
  public ApiProxyController(WebClient.Builder builder, BusStopRepository busStopRepository) {
    this.busStopRepository = busStopRepository;

    // System.out.println("🔑 .env 로드 완료, SEOUL_BUS_API_KEY: " +
    // (dotenv.get("SEOUL_BUS_API_KEY") != null ? "설정됨" : "없음"));

    this.naverClient = builder
        .baseUrl("https://naveropenapi.apigw.ntruss.com")
        .defaultHeader("X-NCP-APIGW-API-KEY-ID", dotenv.get("NAVER_MAP_CLIENT_ID"))
        .defaultHeader("X-NCP-APIGW-API-KEY", dotenv.get("NAVER_MAP_CLIENT_SECRET"))
        .build();

    this.seoulBusClient = builder.baseUrl("http://ws.bus.go.kr").build();

    this.kakaoClient = builder
        .baseUrl("https://dapi.kakao.com")
        .defaultHeader("Authorization", "KakaoAK " + dotenv.get("KAKAO_REST_API_KEY"))
        .build();

    this.seoulOpenApiClient = builder
        .baseUrl("http://openapi.seoul.go.kr:8088")
        .build();

    this.itsClient = builder
        .baseUrl("https://openapi.its.go.kr:9443")
        .exchangeStrategies(ExchangeStrategies.builder()
            .codecs(config -> config.defaultCodecs().maxInMemorySize(3 * 1024 * 1024))
            .build())
        .build();

    this.defaultClient = builder.build();
  }

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
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .bodyToMono(String.class)
        .onErrorMap(e -> new RuntimeException("네이버 경로 탐색 API 호출 실패", e));
  }

  @GetMapping("/naver-geocode")
  public Mono<String> geocode(@RequestParam String query) {
    return naverClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/map-geocode/v2/geocode")
            .queryParam("query", query)
            .build())
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .bodyToMono(String.class)
        .onErrorMap(e -> new RuntimeException("네이버 지오코딩 API 호출 실패", e));
  }

  @GetMapping("/naver-place")
  public Mono<String> searchPlace(@RequestParam String query) {
    return naverClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/map-place/v1/search")
            .queryParam("query", query)
            .queryParam("coordinate", "127.1054328,37.3595953")
            .build())
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .bodyToMono(String.class)
        .onErrorMap(e -> new RuntimeException("네이버 장소 검색 API 호출 실패", e));
  }

  @GetMapping("/kakao-place")
  public Mono<String> searchKakaoPlace(@RequestParam String query) {
    return kakaoClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/v2/local/search/keyword.json")
            .queryParam("query", query)
            .build())
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .bodyToMono(String.class)
        .onErrorMap(e -> new RuntimeException("카카오 장소 검색 API 호출 실패", e));
  }

  @GetMapping("/busPosByNumber")
  public String getBusPositionsByNumber(@RequestParam String routeNumber) {
    // 1) DB에서 routeId 꺼내기
    String routeId = busStopRepository.findRouteIdByRouteNumber(routeNumber);
    if (routeId == null) {
      throw new ResponseStatusException(
          HttpStatus.NOT_FOUND, "해당 버스 번호(routeNumber)로 저장된 routeId가 없습니다: " + routeNumber);
    }
    // 2) 기존 로직 재사용
    return fetchBusPositionsFromSeoulApi(routeId);
  }

  @GetMapping("/busPos")
  public String getBusPositions(@RequestParam String routeId) {
    return fetchBusPositionsFromSeoulApi(routeId);
  }

  private String fetchBusPositionsFromSeoulApi(String routeId) {
    String key = dotenv.get("SEOUL_BUS_API_KEY");
    if (key == null || key.trim().isEmpty()) {
      throw new RuntimeException("API 키 누락");
    }
    key = key.trim();

    String url = "http://ws.bus.go.kr/api/rest/buspos/getBusPosByRtid"
        + "?serviceKey=" + key
        + "&busRouteId=" + routeId
        + "&resultType=json";

    try {
      HttpResponse<String> resp = HttpClient.newHttpClient()
          .send(
              HttpRequest.newBuilder()
                  .uri(URI.create(url))
                  .header("Accept", "application/json")
                  .header("User-Agent", "Java-HttpClient")
                  .GET()
                  .build(),
              HttpResponse.BodyHandlers.ofString());
      if (resp.statusCode() != 200) {
        throw new RuntimeException("서울시 API 오류: " + resp.statusCode());
      }
      return resp.body();
    } catch (Exception e) {
      throw new RuntimeException("버스 위치 API 호출 실패: " + e.getMessage(), e);
    }
  }


  @GetMapping("/bus/routes")
  public ResponseEntity<List<BusRouteStopDto>> getStopsByRouteNumber(@RequestParam String routeNumber) {
    List<BusRouteStopDto> stops = busStopRepository.findByRouteNumberOrderByStationOrderAsc(routeNumber)
        .stream()
        .map(stop -> new BusRouteStopDto(
            stop.getStationId(),
            stop.getStationName(),
            stop.getLatitude(),
            stop.getLongitude(),
            stop.getStationOrder(),
            stop.getRouteId(),
            stop.getRouteNumber()))
        .collect(Collectors.toList());

    return ResponseEntity.ok(stops);
  }

  @GetMapping("/road-event-all")
  public Mono<String> getAllRoadEvents() {
    return itsClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/eventInfo")
            .queryParam("apiKey", dotenv.get("ITS_API_KEY"))
            .queryParam("type", "all")
            .queryParam("eventType", "all")
            .queryParam("getType", "json")
            .build())
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .bodyToMono(String.class)
        .onErrorMap(e -> new RuntimeException("전체 도로 이벤트 API 호출 실패", e));
  }

  @GetMapping("/road-event")
  public Mono<String> getRoadEventInBounds(
      @RequestParam double minX,
      @RequestParam double minY,
      @RequestParam double maxX,
      @RequestParam double maxY) {
    return itsClient.get()
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
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .bodyToMono(String.class)
        .onErrorMap(e -> new RuntimeException("도로 이벤트 API 호출 실패", e));
  }

  @GetMapping("/subway/arrival")
  public Mono<String> getSubwayArrival() {
    return defaultClient.get()
        .uri("http://swopenapi.seoul.go.kr/api/subway/{key}/xml/realtimeStationArrival/0/1000/",
            dotenv.get("SEOUL_SUBWAY_API_KEY"))
        .retrieve()
        .onStatus(status -> !status.is2xxSuccessful(),
            response -> response.bodyToMono(String.class).flatMap(body -> {
              System.err.println("❌ [지하철] 오류 상태코드: " + response.statusCode());
              System.err.println("❌ [지하철] 오류 응답:\n" + body);
              return Mono.error(new RuntimeException(
                  "지하철 도착 정보 API 실패: " + body));
            }))
        .bodyToMono(String.class)
        .onErrorMap(e -> new RuntimeException("지하철 도착 정보 API 호출 실패", e));
  }

  @GetMapping("/bike-list")
  public Mono<String> getBikeList() {
    return seoulOpenApiClient.get()
        .uri(uriBuilder -> uriBuilder
            .path("/{apiKey}/json/bikeList/1/1000/")
            .build(dotenv.get("SEOUL_BIKE_API_KEY")))
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .bodyToMono(String.class)
        .onErrorMap(e -> new RuntimeException("서울 따릉이 정보 API 호출 실패", e));
  }

  @GetMapping("/parking/seoul-city")
  public Mono<String> getSeoulCityParkingData() {
    return seoulOpenApiClient.get()
        .uri("/{apiKey}/json/GetParkingInfo/1/1000/",
            dotenv.get("SEOUL_CITY_PARKING_API_KEY"))
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .onStatus(status -> !status.is2xxSuccessful(),
            response -> response.bodyToMono(String.class).flatMap(body -> {
              System.err.println("❌ [주차장] 오류 상태코드: " + response.statusCode());
              System.err.println("❌ [주차장] 오류 응답:\n" + body);
              return Mono.error(
                  new RuntimeException("주차장 정보 API 실패: " + body));
            }))
        .bodyToMono(String.class)
        .onErrorMap(e -> new RuntimeException("서울 주차장 정보 API 호출 실패", e));
  }
}