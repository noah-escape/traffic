package com.cctv.road.map.service;

import com.cctv.road.map.dto.VslDto;
import com.cctv.road.map.entity.Vsl;
import com.cctv.road.map.repository.VslRepository;
<<<<<<< HEAD
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
=======
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.FileWriter;
import java.io.IOException;
>>>>>>> develop
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VslService {
    private final VslRepository vslRepository;

    @Value("${its.api.key}")
    private String itsApiKey;

<<<<<<< HEAD
    private static final long CACHE_EXPIRE_MS = 5 * 60 * 1000L; // 5분
    private List<VslDto> lastVslData = null;
    private long lastFetchTime = 0L;

    // 실시간 VSL API + DB 매칭 (5분 캐싱)
=======
    private static final long CACHE_EXPIRE_MS = 5 * 60 * 1000L; // 5분 캐싱
    private List<VslDto> lastVslData = null;
    private long lastFetchTime = 0L;

>>>>>>> develop
    public synchronized List<VslDto> getVslRealtimeList() {
        long now = System.currentTimeMillis();
        if (lastVslData == null || now - lastFetchTime > CACHE_EXPIRE_MS) {
            lastVslData = fetchAndMergeVslRealtime();
            lastFetchTime = now;
        }
        return lastVslData;
    }

<<<<<<< HEAD
    // roadNo "숫자 오름차순" 정렬 (전체 데이터)
=======
>>>>>>> develop
    private List<VslDto> fetchAndMergeVslRealtime() {
        List<Vsl> vslList = vslRepository.findAll();
        vslList.sort(Comparator.comparingInt(v -> {
            try {
                return Integer.parseInt(
<<<<<<< HEAD
                        Optional.ofNullable(v.getRoadNo()).orElse("99999").replaceAll("[^0-9]", "")
                );
=======
                        Optional.ofNullable(v.getRoadNo()).orElse("99999").replaceAll("[^0-9]", ""));
>>>>>>> develop
            } catch (Exception e) {
                return Integer.MAX_VALUE;
            }
        }));
        Map<String, Integer> vslIdToCurrSpeed = getRealtimeVslSpeedByVslId();
        List<VslDto> result = new ArrayList<>();
        for (Vsl v : vslList) {
            Integer currSpeed = vslIdToCurrSpeed.get(v.getVslId());

<<<<<<< HEAD
            // roadName/roadNo 가공 (ex만 선→고속도로)
=======
            if (currSpeed == null || currSpeed == 0) {
                continue;
            }

>>>>>>> develop
            String roadName = v.getRoadName();
            if ("EX".equalsIgnoreCase(v.getRoadType().name())
                    && roadName.endsWith("선") && !roadName.endsWith("지선")) {
                roadName = roadName.substring(0, roadName.length() - 1) + "고속도로";
            }
            String roadNo = v.getRoadNo();
            String fullList = (roadNo != null ? roadNo : "") + " " + (roadName != null ? roadName : "");

            result.add(VslDto.builder()
                    .vslId(v.getVslId())
                    .roadName(roadName)
                    .roadNo(roadNo)
                    .defLmtSpeed(v.getDefLmtSpeed())
                    .direction(v.getDirection())
                    .vslOrder(v.getVslOrder())
                    .lng(v.getLng())
                    .lat(v.getLat())
                    .sectionDesc(v.getSectionDesc())
                    .enforcement(v.getEnforcement())
                    .roadType(v.getRoadType().name())
                    .currLmtSpeed(currSpeed)
<<<<<<< HEAD
                    .fullList(fullList.trim()) // 👈 fullList
=======
                    .fullList(fullList.trim())
>>>>>>> develop
                    .build());
        }
        return result;
    }

<<<<<<< HEAD
    // 실시간 제한속도 맵
    private Map<String, Integer> getRealtimeVslSpeedByVslId() {
        Map<String, Integer> result = new ConcurrentHashMap<>();
        try {
            WebClient webClient = WebClient.create();
            String url = "https://openapi.its.go.kr:9443/vslInfo?apiKey=" + itsApiKey + "&getType=json";
            Map<?, ?> apiRes = webClient.get().uri(url).retrieve().bodyToMono(Map.class).block();
            Map<?, ?> response = (Map<?, ?>) apiRes.get("response");
            Map<?, ?> body = (Map<?, ?>) response.get("body");
            Map<?, ?> items = (Map<?, ?>) body.get("items");
            Object itemObj = items.get("item");
            List<Map<String, Object>> itemList;
            if (itemObj instanceof List) {
                itemList = (List<Map<String, Object>>) itemObj;
            } else {
                itemList = new ArrayList<>();
                itemList.add((Map<String, Object>) itemObj);
            }
=======
    private Map<String, Integer> getRealtimeVslSpeedByVslId() {
        Map<String, Integer> result = new ConcurrentHashMap<>();
        try {
            WebClient webClient = WebClient.builder()
                    .exchangeStrategies(ExchangeStrategies.builder()
                            .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                            .build())
                    .build();

            String url = "https://openapi.its.go.kr:9443/vslInfo?apiKey=" + itsApiKey + "&getType=json";

            String rawResponse = webClient.get()
                    .uri(url)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            ObjectMapper mapper = new ObjectMapper();
            Map<?, ?> apiRes = mapper.readValue(rawResponse, Map.class);

            Map<?, ?> body = (Map<?, ?>) apiRes.get("body");
            if (body == null) {
                return result;
            }

            Object itemsObj = body.get("items");
            if (itemsObj == null) {
                return result;
            }

            List<Map<String, Object>> itemList;
            if (itemsObj instanceof List) {
                itemList = (List<Map<String, Object>>) itemsObj;
            } else {
                itemList = new ArrayList<>();
                itemList.add((Map<String, Object>) itemsObj);
            }

>>>>>>> develop
            for (Map<String, Object> v : itemList) {
                String vslId = (String) v.get("vslId");
                String limitSpeed = String.valueOf(v.get("limitSpeed"));
                try {
                    result.put(vslId, Integer.parseInt(limitSpeed));
                } catch (Exception ignore) {
                }
            }
        } catch (Exception e) {
        }
        return result;
    }

<<<<<<< HEAD
    // 중복제거(fullList) + roadNo 숫자 오름차순으로 정렬된 도로리스트
    public List<Map<String, Object>> getVslRoadInfos(String roadType) {
        // 1. 중복제거 (fullList 기준)
        Map<String, Map<String, Object>> uniqueMap = getVslRealtimeList().stream()
            .filter(dto -> dto.getRoadName() != null)
            .filter(dto -> roadType == null || dto.getRoadType().equalsIgnoreCase(roadType))
            .map(dto -> {
                String roadName = dto.getRoadName();
                if ("ex".equalsIgnoreCase(dto.getRoadType())
                        && roadName.endsWith("선") && !roadName.endsWith("지선")) {
                    roadName = roadName.substring(0, roadName.length() - 1) + "고속도로";
                }
                String roadNo = dto.getRoadNo();
                if ("ex".equalsIgnoreCase(dto.getRoadType()) && roadNo != null && roadNo.endsWith("0") && roadNo.length() > 1) {
                    roadNo = roadNo.substring(0, roadNo.length() - 1);
                }
                Map<String, Object> map = new HashMap<>();
                map.put("roadNo", roadNo);
                map.put("roadName", roadName);
                map.put("roadType", dto.getRoadType());
                map.put("fullList", (roadNo != null ? roadNo : "") + " " + (roadName != null ? roadName : ""));
                return map;
            })
            .collect(Collectors.toMap(
                m -> (String) m.get("fullList"), // key
                m -> m,
                (a, b) -> a // 중복일 때 첫 번째 값 유지
            ));

        // 2. 중복 제거된 values 리스트로 변환
        List<Map<String, Object>> result = new ArrayList<>(uniqueMap.values());

        // 3. roadNo "숫자 오름차순" 정렬
        result.sort(Comparator.comparingInt(m -> {
            try {
                return Integer.parseInt(
                    Optional.ofNullable((String) m.get("roadNo")).orElse("99999").replaceAll("[^0-9]", "")
                );
=======
    public List<Map<String, Object>> getVslRoadInfos(String roadType) {
        Map<String, Map<String, Object>> uniqueMap = getVslRealtimeList().stream()
                .filter(dto -> dto.getRoadName() != null)
                .filter(dto -> roadType == null || dto.getRoadType().equalsIgnoreCase(roadType))
                .map(dto -> {
                    String roadName = dto.getRoadName();
                    if ("ex".equalsIgnoreCase(dto.getRoadType())
                            && roadName.endsWith("선") && !roadName.endsWith("지선")) {
                        roadName = roadName.substring(0, roadName.length() - 1) + "고속도로";
                    }
                    String roadNo = dto.getRoadNo();
                    if ("ex".equalsIgnoreCase(dto.getRoadType()) && roadNo != null && roadNo.endsWith("0")
                            && roadNo.length() > 1) {
                        roadNo = roadNo.substring(0, roadNo.length() - 1);
                    }
                    Map<String, Object> map = new HashMap<>();
                    map.put("roadNo", roadNo);
                    map.put("roadName", roadName);
                    map.put("roadType", dto.getRoadType());
                    map.put("fullList", (roadNo != null ? roadNo : "") + " " + (roadName != null ? roadName : ""));
                    return map;
                })
                .collect(Collectors.toMap(
                        m -> (String) m.get("fullList"),
                        m -> m,
                        (a, b) -> a));

        List<Map<String, Object>> result = new ArrayList<>(uniqueMap.values());

        result.sort(Comparator.comparingInt(m -> {
            try {
                return Integer.parseInt(
                        Optional.ofNullable((String) m.get("roadNo")).orElse("99999").replaceAll("[^0-9]", ""));
>>>>>>> develop
            } catch (Exception e) {
                return Integer.MAX_VALUE;
            }
        }));

        return result;
    }
}
