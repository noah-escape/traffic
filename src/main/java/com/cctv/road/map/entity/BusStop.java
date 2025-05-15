package com.cctv.road.map.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

@Entity
@Data
public class BusStop {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "route_id")
  private String routeId;

  @Column(name = "route_number")
  private String routeNumber;

  @Column(name = "station_id")
  private String stationId;

  @Column(name = "station_name")
  private String stationName;

  @Column(name = "station_order")
  private Integer stationOrder;

  private Double longitude;
  private Double latitude;
}
