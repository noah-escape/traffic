package com.cctv.road.board.entity;

import lombok.Data;

@Data
public class PageList {
  private int pageSize = 10; // 한 페이지당 게시글 수
  private int totalCount = 10; // 전체 게시글 수
  private int currentPage = 1; // 현재 페이지
  private int totalPage = 1; // 전체 페이지 수

  private int startNo = 0; // 현재 페이지에서 보여줄 게시글 시작 번호
  private int endNo = 0; // 현재 페이지에서 보여줄 게시글 끝 번호

  private int startPage = 0; // 페이지네이션 시작 페이지 번호
  private int endPage = 0; // 페이지네이션 끝 페이지 번호

  public PageList() {
  }

  public PageList(int totalCount, int currentPage, int pageSize) {
    this.totalCount = totalCount;
    this.currentPage = currentPage;
    this.pageSize = pageSize;
    this.calculator();
  }

  public void calculator() {
    this.totalPage = (int) Math.ceil((double) totalCount / pageSize);
    // 게시글이 없을 경우에도 페이지는 1페이지로 처리
    if (totalPage == 0)
      totalPage = 1;

    // 현재 페이지가 1보다 작아지는 것 방지
    if (currentPage < 1)
      currentPage = 1;
    if (currentPage > totalPage)
      currentPage = totalPage;

    this.startNo = (currentPage - 1) * pageSize + 1;
    this.endNo = Math.min(currentPage * pageSize, totalCount);

    int pageBlock = 10; // 페이징 블록 크기
    this.startPage = ((currentPage - 1) / pageBlock) * pageBlock + 1;
    this.endPage = Math.min(startPage + pageBlock - 1, totalPage);
  }
}
