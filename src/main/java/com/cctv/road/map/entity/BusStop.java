package com.cctv.road.map.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "bus_station")
@Getter
@Setter
@NoArgsConstructor
public class BusStop {
  @Id
  @Column(name = "station_id")
  private String id;

  @Column(name = "station_name")
  private String name;

  @Column(name = "latitude")
  private double lat;

  @Column(name = "longitude")
  private double lng;

  @Column(name = "city_name")
  private String city;

  // ✅ 누락된 컬럼 추가
  @Column(name = "short_number")
  private String shortNumber;

  @Column(name = "collect_date")
  private LocalDate collectDate;

  @Column(name = "city_code")
  private String cityCode;
}
