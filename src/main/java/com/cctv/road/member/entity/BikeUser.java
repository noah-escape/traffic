package com.cctv.road.member.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "bike_users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BikeUser {

  @Id
  @Column(name = "user_id")
  private String userId; // users 테이블의 PK (직접 설정 시 @MapsId 필요)

  @OneToOne(fetch = FetchType.LAZY)
  @MapsId // ✅ userId를 Member의 PK로 매핑
  @JoinColumn(name = "user_id") // FK 설정
  private Member member;

  @Column(name = "name", nullable = false)
  private String name;

  @Column(name = "phone_number")
  private String phoneNumber;

  @Column(name = "email", unique = true)
  private String email;

  @Column(name = "registration_date", nullable = false)
  private LocalDateTime registrationDate;
}
