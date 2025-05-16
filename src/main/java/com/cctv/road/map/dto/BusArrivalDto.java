package com.cctv.road.map.dto;

import lombok.Data;

@Data
public class BusArrivalDto {
  private String routeNumber;
  private String arrivalTime;
  private String congestion;
  private String stopId; // 추가
  private String arsId; // 추가

  // 전체 필드 생성자
  public BusArrivalDto(String routeNumber, String arrivalTime, String congestion, String stopId, String arsId) {
    this.routeNumber = routeNumber;
    this.arrivalTime = arrivalTime;
    this.congestion = congestion;
    this.stopId = stopId;
    this.arsId = arsId;
  }

  // 기존 오류 응답용 생성자
  public BusArrivalDto(String routeNumber, String arrivalTime, String congestion) {
    this(routeNumber, arrivalTime, congestion, null, null);
  }
}
