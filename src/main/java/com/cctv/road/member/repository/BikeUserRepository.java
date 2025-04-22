package com.cctv.road.member.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cctv.road.member.entity.BikeUser;

public interface BikeUserRepository extends JpaRepository<BikeUser, String> {
  boolean existsByEmail(String email);
}