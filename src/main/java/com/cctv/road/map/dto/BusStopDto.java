package com.cctv.road.map.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class BusStopDto {
  private String id;
  private String name;
  private double lat;
  private double lng;
}