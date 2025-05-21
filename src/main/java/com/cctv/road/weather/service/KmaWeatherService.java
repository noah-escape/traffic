package com.cctv.road.weather.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.cctv.road.weather.util.GeoUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class KmaWeatherService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${kma.api.key}")
    private String kmaApiKey;

    public String getUltraSrtNcst(double lat, double lon) {
        return callApi("getUltraSrtNcst", lat, lon);
    }

    public String getUltraSrtFcst(double lat, double lon) {
        return callApi("getUltraSrtFcst", lat, lon);
    }

    public String getVilageFcst(double lat, double lon) {
        return callApi("getVilageFcst", lat, lon);
    }

    public Map<String, Object> getUltraSrtNcstAsJson(double lat, double lon) {
        return parseJson(getUltraSrtNcst(lat, lon));
    }

    public Map<String, Object> getUltraSrtFcstAsJson(double lat, double lon) {
        return parseJson(getUltraSrtFcst(lat, lon));
    }

    public Map<String, Object> getVilageFcstAsJson(double lat, double lon) {
        return parseJson(getVilageFcst(lat, lon));
    }

    private Map<String, Object> parseJson(String json) {
        try {
            // 실제 응답 로그 찍기
            log.info("✅ 받은 JSON: {}", json);
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (Exception e) {
            log.error("❌ JSON 파싱 실패! 원본 응답:\n{}", json); // 여기에 응답 전체 출력됨
            throw new RuntimeException("기상청 JSON 파싱 실패", e);
        }
    }

    private String callApi(String type, double lat, double lon) {
        try {
            GeoUtil.GridXY grid = GeoUtil.convertGRID(lat, lon);

            // 날짜/시간 처리
            LocalDate baseDate = LocalDate.now();
            LocalTime now = LocalTime.now();

            if (now.getMinute() < 40) {
                now = now.minusHours(1);
                if (now.getHour() == 23 && LocalTime.now().getHour() == 0) {
                    baseDate = baseDate.minusDays(1);
                }
            }

            String baseDateStr = baseDate.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            String baseTimeStr = now.truncatedTo(ChronoUnit.HOURS).format(DateTimeFormatter.ofPattern("HHmm"));

            String url = UriComponentsBuilder
                    .fromHttpUrl("https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/" + type)
                    .queryParam("serviceKey", kmaApiKey)
                    .queryParam("numOfRows", 100)
                    .queryParam("pageNo", 1)
                    .queryParam("dataType", "JSON")
                    .queryParam("base_date", baseDateStr)
                    .queryParam("base_time", baseTimeStr)
                    .queryParam("nx", grid.nx)
                    .queryParam("ny", grid.ny)
                    .build()
                    .toUriString();

            log.info("📌 현재 사용 중인 기상청 키: {}", kmaApiKey);
            log.info("🌐 기상청 호출 URL: {}", url);

            ResponseEntity<String> response = new RestTemplate().getForEntity(url, String.class);
            return response.getBody();

        } catch (Exception e) {
            log.error("기상청 API 호출 실패", e);
            return "{}";
        }
    }

}
