package com.cctv.road.map.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VslDto {
    private String vslId;
    private String roadName;
    private String roadNo;
    private Integer defLmtSpeed;
    private String direction;
    private Integer vslOrder;
    private Double lng;
    private Double lat;
    private String sectionDesc;
    private String enforcement;
    private String roadType;
    private Integer currLmtSpeed;
    private String fullList;
}
