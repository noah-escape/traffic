package com.cctv.road.weather.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
public class WeatherAlertService {

    private final RestTemplate restTemplate;

    @Value("${kma.api.key}")
    private String kmaApiKey;

    public List<Map<String, String>> getNationwideAlerts() {
        URI url = UriComponentsBuilder
                .fromHttpUrl("https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnList")
                .queryParam("serviceKey", URLEncoder.encode(kmaApiKey, StandardCharsets.UTF_8))
                .queryParam("pageNo", "1")
                .queryParam("numOfRows", "100")
                .queryParam("dataType", "JSON")
                .build(true)
                .toUri();

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> root = response.getBody();
            System.out.println("🧾 Raw response body: " + root);

            Map<String, Object> responseMap = (Map<String, Object>) root.get("response");
            Map<String, Object> header = (Map<String, Object>) responseMap.get("header");

            String resultCode = (String) header.get("resultCode");
            if (!"00".equals(resultCode)) {
                System.out.println("⚠️ 기상청 응답 상태: " + header.get("resultMsg"));
                return List.of(); // 특보 없음 또는 오류
            }

            Map<String, Object> body = (Map<String, Object>) responseMap.get("body");
            Map<String, Object> itemsWrapper = (Map<String, Object>) body.get("items");

            if (itemsWrapper == null || itemsWrapper.get("item") == null) return List.of();

            List<Map<String, Object>> items = (List<Map<String, Object>>) itemsWrapper.get("item");

            return items.stream().map(item -> {
                Map<String, String> result = new HashMap<>();
                result.put("regionName", (String) item.get("areaNm"));
                result.put("alertTitle", (String) item.get("warnVar")); // 특보 종류
                return result;
            }).toList();

        } catch (Exception e) {
            e.printStackTrace();
            return List.of();
        }
    }
}
