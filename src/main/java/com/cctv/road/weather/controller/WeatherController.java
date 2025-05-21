package com.cctv.road.weather.controller;

import com.cctv.road.weather.service.KmaWeatherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final KmaWeatherService kmaWeatherService;

    @GetMapping("/current") // 현재 실시간 날씨
    public ResponseEntity<?> getCurrentWeather(@RequestParam double lat, @RequestParam double lon) {
        Map<String, Object> json = kmaWeatherService.getUltraSrtNcstAsJson(lat, lon);
        return ResponseEntity.ok(json);
    }

    @GetMapping("/forecast") // 1~6시간 예보
    public ResponseEntity<?> getHourlyForecast(@RequestParam double lat, @RequestParam double lon) {
        Map<String, Object> json = kmaWeatherService.getUltraSrtFcstAsJson(lat, lon);
        return ResponseEntity.ok(json);
    }

    @GetMapping("/daily") // 오늘~모레 예보
    public ResponseEntity<?> getDailyForecast(@RequestParam double lat, @RequestParam double lon) {
        Map<String, Object> json = kmaWeatherService.getVilageFcstAsJson(lat, lon);
        return ResponseEntity.ok(json);
    }

    @GetMapping("/full") // 전체 통합 JSON (current, forecast, daily)
    public ResponseEntity<?> getFullWeather(@RequestParam double lat, @RequestParam double lon) {
        try {
            Map<String, Object> current = kmaWeatherService.getUltraSrtNcstAsJson(lat, lon);
            Map<String, Object> forecast = kmaWeatherService.getUltraSrtFcstAsJson(lat, lon);
            Map<String, Object> daily = kmaWeatherService.getVilageFcstAsJson(lat, lon);

            return ResponseEntity.ok(new WeatherBundle(current, forecast, daily));
        } catch (Exception e) {
            return ResponseEntity
                    .status(500)
                    .body(Map.of(
                            "error", "기상청 API 호출 또는 파싱 실패",
                            "message", e.getMessage()));
        }
    }

    public static class WeatherBundle {
        public Map<String, Object> current;
        public Map<String, Object> forecast;
        public Map<String, Object> daily;

        public WeatherBundle(Map<String, Object> current, Map<String, Object> forecast, Map<String, Object> daily) {
            this.current = current;
            this.forecast = forecast;
            this.daily = daily;
        }
    }
}
