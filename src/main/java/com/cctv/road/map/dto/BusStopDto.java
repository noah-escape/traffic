package com.cctv.road.map.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BusStopDto {
  private String id; // nodeId
  private String name; // stationName
  private double lat; // y
  private double lng; // x
}
