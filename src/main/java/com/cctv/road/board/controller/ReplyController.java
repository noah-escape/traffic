package com.cctv.road.board.controller;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

import com.cctv.road.board.dto.ReplyDTO;
import com.cctv.road.board.service.ReplyService;
import com.cctv.road.member.entity.Member;
import com.cctv.road.member.security.CustomUserDetails;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class ReplyController {

  private final ReplyService replyService;

  @PostMapping("/reply/write")
  public String writeReply(@ModelAttribute ReplyDTO replyDTO,
      @AuthenticationPrincipal CustomUserDetails userDetails, // ✅ 여기!
      HttpServletRequest request) {

    Member member = userDetails.getMember(); // ✅ 로그인한 사용자 정보
    String userId = member.getUserId();
    String ip = request.getRemoteAddr();

    replyService.writeReply(replyDTO, userId, ip);

    return "redirect:/board/view/" + replyDTO.getBoardNum();
  }
}
