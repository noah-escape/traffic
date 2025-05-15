package com.cctv.road.map.controller;

import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

import com.cctv.road.map.dto.BusStopDto;
import com.cctv.road.map.entity.BusStop;
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

    // System.out.println("🔑 .env 로드 완료, SEOUL_BUS_API_KEY: " + (dotenv.get("SEOUL_BUS_API_KEY") != null ? "설정됨" : "없음"));

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


  @GetMapping("/busPos")
  public String getBusPositions(@RequestParam String routeId) {
    String key = dotenv.get("SEOUL_BUS_API_KEY");
    if (key == null || key.trim().isEmpty()) {
      // System.err.println("❌ SEOUL_BUS_API_KEY가 .env에 없거나 비어 있습니다!");
      throw new RuntimeException("API 키 누락");
    }
    key = key.trim(); // 인코딩된 키 (%2B, %3D)
    // System.out.println("🔑 사용된 API 키: " + key.substring(0, Math.min(10, key.length())) + "...");

    String url = "http://ws.bus.go.kr/api/rest/buspos/getBusPosByRtid?serviceKey=" + key + "&busRouteId=" + routeId
        + "&resultType=json";
    // System.out.println("🛠️ 최종 호출 URL: " + url);

    HttpClient client = HttpClient.newBuilder().build();
    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(url))
        .header("Accept", "application/json")
        .header("User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36")
        .GET()
        .build();

    try {
      HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
      List<String> cookies = response.headers().allValues("Set-Cookie");
      if (!cookies.isEmpty()) {
        // System.out.println("🍪 수신된 쿠키: " + cookies);
      }
      // System.out.println("✅ 응답 상태: " + response.statusCode());
      // System.out.println("✅ 응답 본문: " + response.body());
      if (response.statusCode() != 200) {
        throw new RuntimeException("서울시 API 응답 오류: " + response.statusCode() + ", 본문: " + response.body());
      }
      return response.body();
    } catch (Exception e) {
      // System.err.println("❌ 오류 상세: " + e.getClass().getName() + ": " + e.getMessage());
      e.printStackTrace();
      throw new RuntimeException("버스 위치 API 호출 실패: " + e.getMessage(), e);
    }
  }

  // ✅ 지역별 정류소 조회
  @GetMapping("/bus/stops")
  public List<BusStopDto> getBusStopsByRegion(@RequestParam String region) {
    return busStopRepository.findByCity(region).stream()
        .map(stop -> new BusStopDto(stop.getId(), stop.getName(), stop.getLat(), stop.getLng()))
        .toList();
  }

  // ✅ 시/도 목록 조회
  @GetMapping("/bus/regions")
  public List<String> getDistinctRegions() {
    return busStopRepository.findAll().stream()
        .map(BusStop::getCity)
        .distinct()
        .toList();
  }

  @GetMapping("/bus/routes")
  public List<BusRouteDto> getRoutesByStop(@RequestParam String stopId) {
    return busService.findRoutesByStopId(stopId);
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
              System.err.println("❌ [지하철] 오류 응답: " + body);
              return Mono.error(new RuntimeException("지하철 도착 정보 API 실패"));
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
              System.err.println("❌ [주차장] 오류 응답: " + body);
              return Mono.error(new RuntimeException("주차장 정보 API 실패"));
            }))
        .bodyToMono(String.class)
        .onErrorMap(e -> new RuntimeException("서울 주차장 정보 API 호출 실패", e));
  }
}