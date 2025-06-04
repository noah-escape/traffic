package com.cctv.road.weather.service;

import com.cctv.road.weather.util.GeoUtil;
import com.cctv.road.weather.util.GeoUtil.RegionCodes;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static java.util.Map.entry;

@Slf4j
@Service
@RequiredArgsConstructor
public class WeatherAlertService {

  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;

  @Value("${kma.api.key}")
  private String kmaApiKey;

  // ✅ stnId → 대표 지역명 (GeoUtil의 지역명과 맞춰야 함)
  private static final Map<String, String> STN_REGION_MAP = Map.ofEntries(
      entry("108", "서울"), entry("159", "부산"), entry("133", "대전"),
      entry("156", "광주"), entry("143", "전주"), entry("184", "속초"),
      entry("112", "인천"), entry("152", "대구"), entry("168", "제주"),
      entry("127", "춘천"), entry("140", "강릉"), entry("130", "청주"),
      entry("146", "목포"), entry("165", "울산"), entry("131", "홍성"),
      entry("137", "안동"), entry("105", "수원"), entry("115", "의정부"),
      entry("119", "강화"), entry("129", "서산"), entry("136", "포항"),
      entry("151", "진주"), entry("170", "서귀포"), entry("185", "대관령"));

  public List<Map<String, String>> getAlertsByLocation(double lat, double lon) {
    List<Map<String, String>> result = new ArrayList<>();

    try {
      RegionCodes region = GeoUtil.getRegionCodes(lat, lon);
      log.info("🧭 좌표 기반 지역명: {}", region.name);
      String regionName = region.name;

      String encodedKey = URLEncoder.encode(kmaApiKey, StandardCharsets.UTF_8);
      String baseUrl = "https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnList?serviceKey="
          + encodedKey;

      URI uri = UriComponentsBuilder
          .fromHttpUrl(baseUrl)
          .queryParam("dataType", "JSON")
          .queryParam("numOfRows", 300)
          .queryParam("pageNo", 1)
          .build(true)
          .toUri();

      log.info("📡 특보 요청 URI: {}", uri);

      ResponseEntity<String> response = restTemplate.getForEntity(uri, String.class);
      String json = response.getBody();
      log.info("📨 특보 응답 원본: {}", json);

      JsonNode items = objectMapper.readTree(json)
          .path("response").path("body").path("items").path("item");

      log.info("🧾 수신된 item 노드: {}", items);

      if (items.isArray()) {
        for (JsonNode item : items) {
          filterByRegion(item, regionName, result);
        }
      } else if (items.isObject()) {
        filterByRegion(items, regionName, result);
      }

    } catch (Exception e) {
      log.error("❌ 특보 조회 실패", e);
    }

    return result;
  }

  private void filterByRegion(JsonNode item, String userRegionName, List<Map<String, String>> result) {
    String stnId = item.path("stnId").asText();
    String matchedRegion = STN_REGION_MAP.getOrDefault(stnId, "");
    String tmFc = item.path("tmFc").asText();
    String tmSeq = item.path("tmSeq").asText();
    String detailMsg = fetchAlertDetail(tmFc, tmSeq);
    List<String> affectedRegions = extractRegionsFromMsg(detailMsg);
    log.info("🔍 사용자 지역: {}", userRegionName);
    log.info("📄 상세 메시지: {}", detailMsg);
    log.info("📍 파싱된 지역들: {}", affectedRegions);
    // ✅ 사용자 지역 이름이 상세 지역명과 일치하는지 확인
    boolean match = affectedRegions.stream()
        .anyMatch(r -> userRegionName.contains(r) || r.contains(userRegionName));
    log.info("✅ 매칭 결과: {}", match);

    if (match || userRegionName.contains(matchedRegion) || matchedRegion.contains(userRegionName)) {
      result.add(Map.of(
          "region", matchedRegion,
          "warnVar", item.path("title").asText(),
          "warnGrade", "",
          "announceTime", tmFc,
          "detail", detailMsg));
    }
  }

  private String fetchAlertDetail(String tmFc, String tmSeq) {
    try {
      String encodedKey = URLEncoder.encode(kmaApiKey, StandardCharsets.UTF_8);
      URI uri = UriComponentsBuilder
          .fromHttpUrl("https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnMsg")
          .queryParam("serviceKey", encodedKey)
          .queryParam("dataType", "JSON")
          .queryParam("tmFc", tmFc)
          .queryParam("tmSeq", tmSeq)
          .build(true)
          .toUri();

      ResponseEntity<String> response = restTemplate.getForEntity(uri, String.class);
      String json = response.getBody();

      JsonNode root = objectMapper.readTree(json);
      JsonNode msgNode = root.path("response").path("body").path("items").path("item").get(0);
      if (msgNode != null) {
        return msgNode.path("msg").asText();
      }
    } catch (Exception e) {
      log.error("❌ 특보 상세 조회 실패", e);
    }
    return "";
  }

  private List<String> extractRegionsFromMsg(String msg) {
    List<String> regions = new ArrayList<>();
    Pattern pattern = Pattern.compile("([가-힣]+(?:도|특별시|광역시))\\(([^\\)]+)\\)");
    Matcher matcher = pattern.matcher(msg);
    while (matcher.find()) {
      String province = matcher.group(1);
      String[] subRegions = matcher.group(2).split(",");
      for (String region : subRegions) {
        regions.add(province + " " + region.trim());
      }
    }
    return regions;
  }

  @PostConstruct
public void logNationalAlertsOnce() {
  try {
    String encodedKey = URLEncoder.encode(kmaApiKey, StandardCharsets.UTF_8);
    URI uri = UriComponentsBuilder
        .fromHttpUrl("https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnList")
        .queryParam("serviceKey", encodedKey)
        .queryParam("dataType", "JSON")
        .queryParam("numOfRows", 300)
        .queryParam("pageNo", 1)
        .build(true)
        .toUri();

    ResponseEntity<String> response = restTemplate.getForEntity(uri, String.class);
    String json = response.getBody();
    log.info("🔴 API 전체 응답: {}", json); // ← 전체 응답 강제 출력

  } catch (Exception e) {
    log.error("❌ 전국 특보 로그 출력 실패", e);
  }
}


}
