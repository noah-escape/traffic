package com.cctv.road.map.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BusRouteStopDto {
  private String stationId;
  private String stationName;
  private double lat;
  private double lng;
  private int stationOrder;
  private String routeId;
  private String routeNumber;
}
