package com.cctv.road.map.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.cctv.road.map.entity.BusStop;

public interface BusStopRepository extends JpaRepository<BusStop, String> {
  List<BusStop> findByCity(String city); // city = city_name 컬럼에 매핑됨

  @Query("SELECT DISTINCT b.city FROM BusStop b")
List<String> findDistinctCityBy();


  @Query("SELECT b FROM BusStop b WHERE b.lat BETWEEN :minY AND :maxY AND b.lng BETWEEN :minX AND :maxX")
List<BusStop> findByLatLngBounds(double minY, double maxY, double minX, double maxX);
}
