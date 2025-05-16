package com.cctv.road.map.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.cctv.road.map.entity.BusStop;

public interface BusStopRepository extends JpaRepository<BusStop, Long> {

  List<BusStop> findByRouteNumberOrderByStationOrderAsc(String routeNumber);

  @Query(value = "SELECT DISTINCT route_id FROM bus_stop WHERE route_number = :routeNumber LIMIT 1", nativeQuery = true)
  String findRouteIdByRouteNumber(@Param("routeNumber") String routeNumber);
}
