package com.cctv.road.member.controller;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.cctv.road.member.dto.MemberDTO;
import com.cctv.road.member.security.CustomOAuth2User;
import com.cctv.road.member.security.CustomUserDetails;
import com.cctv.road.member.service.MemberService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
@RequestMapping("/register")
public class MemberController {

  private final MemberService memberService;

  // 🔹 소셜 회원가입 화면
  @GetMapping("/oauth2")
  public String showOAuth2RegisterForm(HttpSession session, Model model, HttpServletRequest request) {
    MemberDTO socialUser = (MemberDTO) session.getAttribute("socialUser");

    if (socialUser == null) {
      return "redirect:/login?social_info";
    }

    if (socialUser.getBirthDate() == null &&
        socialUser.getNaverBirthYear() != null &&
        socialUser.getNaverBirthDay() != null) {
      try {
        String birth = socialUser.getNaverBirthYear() + "-" + socialUser.getNaverBirthDay();
        socialUser.setBirthDate(LocalDate.parse(birth, DateTimeFormatter.ofPattern("yyyy-MM-dd")));
      } catch (Exception e) {
        // 무시
      }
    }

    model.addAttribute("memberDTO", socialUser);

    // ✅ CSRF 토큰 수동 주입
    CsrfToken csrfToken = (CsrfToken) request.getAttribute("_csrf");
    model.addAttribute("_csrf", csrfToken);

    return "register/oauth2";
  }

  // 🔹 소셜 회원가입 제출
  @PostMapping("/oauth2/submit")
  public String submitOAuth2RegisterForm(@Valid @ModelAttribute("memberDTO") MemberDTO memberDTO,
      BindingResult bindingResult,
      HttpSession session) {

    validatePassword(memberDTO, bindingResult);

    if (memberService.isUserIdDuplicate(memberDTO.getUserId())) {
      bindingResult.rejectValue("userId", "duplicate", "이미 사용 중인 아이디입니다.");
    }

    if (memberService.isNickNameDuplicate(memberDTO.getNickName())) {
      bindingResult.rejectValue("nickName", "duplicate", "이미 사용 중인 닉네임입니다.");
    }

    if (bindingResult.hasErrors()) {
      return "register/oauth2";
    }

    memberDTO.combineAddress();

    if (memberDTO.getBirthDate() == null &&
        memberDTO.getNaverBirthYear() != null &&
        memberDTO.getNaverBirthDay() != null) {
      try {
        String birth = memberDTO.getNaverBirthYear() + "-" + memberDTO.getNaverBirthDay();
        memberDTO.setBirthDate(LocalDate.parse(birth, DateTimeFormatter.ofPattern("yyyy-MM-dd")));
      } catch (Exception e) {
        bindingResult.rejectValue("birthDate", "invalid", "생년월일 형식이 잘못되었습니다.");
        return "register/oauth2";
      }
    }

    memberService.registerOAuth2Member(memberDTO);
    session.removeAttribute("socialUser");
    return "redirect:/login?registered";
  }

  // 🔹 아이디 중복 확인
  @GetMapping("/checkIdDuplicate")
  @ResponseBody
  public boolean checkIdDuplicate(@RequestParam String userId) {
    return memberService.isUserIdDuplicate(userId);
  }

  // 🔹 닉네임 중복 확인
  @GetMapping("/checkNickNameDuplicate")
  @ResponseBody
  public boolean checkNickNameDuplicate(@RequestParam String nickName) {
    return memberService.isNickNameDuplicate(nickName);
  }

  // ✅ 회원 정보 수정 화면
  @GetMapping("/update")
  public String showUpdateForm(@AuthenticationPrincipal CustomUserDetails user, Model model) {
    if (user == null || user.getUsername() == null) {
      return "redirect:/login?expired";
    }

    MemberDTO memberDTO = memberService.getMemberInfo(user.getUsername());
    model.addAttribute("memberDTO", memberDTO);
    return "member/update";
  }

  // ✅ 회원 정보 수정 처리
  @PostMapping("/update")
  public String processUpdateForm(@ModelAttribute("memberDTO") MemberDTO dto,
      @AuthenticationPrincipal CustomUserDetails user,
      Model model) {

    if (user == null || user.getUsername() == null) {
      return "redirect:/login?expired";
    }

    dto.setUserId(user.getUsername());
    dto.combineAddress();

    MemberDTO currentInfo = memberService.getMemberInfo(user.getUsername());
    if (!dto.getNickName().equals(currentInfo.getNickName()) &&
        memberService.isNickNameDuplicate(dto.getNickName())) {
      model.addAttribute("memberDTO", dto);
      model.addAttribute("nickNameError", "이미 사용 중인 닉네임입니다.");
      return "member/update";
    }

    memberService.updateMemberInfo(dto);
    return "redirect:/member/mypage";
  }

  // ✅ 회원 탈퇴 처리
  @PostMapping("/delete")
  public String deleteMember(@AuthenticationPrincipal CustomOAuth2User user, HttpSession session) {
    if (user == null || user.getUsername() == null) {
      return "redirect:/login?expired";
    }

    memberService.deleteMemberByUserId(user.getUsername());
    session.invalidate();
    return "redirect:/login?deleted";
  }

  // ✅ 비밀번호 유효성 검사
  private void validatePassword(MemberDTO memberDTO, BindingResult bindingResult) {
    String password = memberDTO.getPassword();
    String confirmPassword = memberDTO.getConfirmPassword();

    if (password != null && !password.equals(confirmPassword)) {
      bindingResult.rejectValue("confirmPassword", "mismatch", "비밀번호와 비밀번호 확인이 일치하지 않습니다.");
    }

    if (password != null &&
        (!password.matches("^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\",.<>/?]).*$")
            || password.length() < 8 || password.length() > 12)) {
      bindingResult.rejectValue("password", "invalid", "비밀번호는 8 ~ 12자 사이의 영문, 숫자, 특수문자를 포함해야 합니다.");
    }
  }
}
