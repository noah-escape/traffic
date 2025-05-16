package com.cctv.road.map.repository;

import com.cctv.road.map.entity.BusStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BusStopRepository extends JpaRepository<BusStop, Integer> {

    List<BusStop> findByRouteNameOrderByStationOrderAsc(String routeName);

    // 📌 ✅ 여기에 이 메서드 추가
    @Query("SELECT DISTINCT b.routeId FROM BusStop b WHERE b.routeName = :routeNumber")
    String findRouteIdByRouteNumber(@Param("routeNumber") String routeNumber);

    // 📌 정류소별 노선 조회
    @Query("SELECT DISTINCT b.routeId, b.routeName FROM BusStop b WHERE b.nodeId = :nodeId")
    List<Object[]> findRoutesByNodeId(@Param("nodeId") String nodeId);
}
