package com.cctv.road.weather.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.w3c.dom.*;

import javax.xml.parsers.DocumentBuilderFactory;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@Service
public class WeatherAlertService {

    @Value("${kma.alerts.api.key}")
    private String alertApiKey;

    public List<AlertDto> getAlertsByRegion(String regionName) {
        List<AlertDto> allAlerts = new ArrayList<>();
        List<AlertDto> filteredAlerts = new ArrayList<>();

        try {
            String encodedKey = URLEncoder.encode(alertApiKey, StandardCharsets.UTF_8);

            URI uri = UriComponentsBuilder
                    .fromHttpUrl("https://apis.data.go.kr/1360000/WthrWrnInfoService/getWthrWrnList")
                    .queryParam("serviceKey", encodedKey)
                    .queryParam("pageNo", 1)
                    .queryParam("numOfRows", 100)
                    .queryParam("dataType", "XML")
                    .build(true)
                    .toUri();

            log.info("📡 특보 요청 지역: {}", regionName);

            Document doc = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(uri.toString());
            NodeList items = doc.getElementsByTagName("item");

            for (int i = 0; i < items.getLength(); i++) {
                Element item = (Element) items.item(i);
                String areaNm = getTagValue(item, "areaNm");

                String type = getTagValue(item, "warnVar");
                String level = getTagValue(item, "warnStress");
                String start = getTagValue(item, "t6");
                String end = getTagValue(item, "t7");

                AlertDto alert = new AlertDto(areaNm, type, level, start, end);
                allAlerts.add(alert);

                if (areaNm != null && areaNm.contains(regionName)) {
                    filteredAlerts.add(alert);
                }
            }

            log.info("🔔 전체 특보 수: {}", allAlerts.size());
            log.info("✅ {} 지역 필터링 특보 수: {}", regionName, filteredAlerts.size());

        } catch (Exception e) {
            log.error("❌ 기상청 특보 API 실패", e);
        }

        return filteredAlerts;
    }

    private String getTagValue(Element item, String tagName) {
        NodeList nodes = item.getElementsByTagName(tagName);
        return nodes.getLength() > 0 ? nodes.item(0).getTextContent() : "--";
    }

    public record AlertDto(String areaNm, String type, String level, String startTime, String endTime) {}
}
