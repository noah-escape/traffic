package com.cctv.road.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import com.cctv.road.member.security.OAuthFailureHandler;
import com.cctv.road.member.security.OAuthSuccessHandler;
import com.cctv.road.member.service.CustomOAuth2UserService;
import com.cctv.road.member.service.CustomUserDetailsService;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  private final @Lazy CustomOAuth2UserService customOAuth2UserService;
  private final CustomUserDetailsService customUserDetailsService;
  private final OAuthSuccessHandler oAuthSuccessHandler;
  private final OAuthFailureHandler oAuthFailureHandler;

  public SecurityConfig(
      @Lazy CustomOAuth2UserService customOAuth2UserService,
      CustomUserDetailsService customUserDetailsService,
      OAuthSuccessHandler oAuthSuccessHandler,
      OAuthFailureHandler oAuthFailureHandler) {
    this.customOAuth2UserService = customOAuth2UserService;
    this.customUserDetailsService = customUserDetailsService;
    this.oAuthSuccessHandler = oAuthSuccessHandler;
    this.oAuthFailureHandler = oAuthFailureHandler;
  }

  @Bean
  public BCryptPasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public DaoAuthenticationProvider authenticationProvider() {
    DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
    authProvider.setUserDetailsService(customUserDetailsService);
    authProvider.setPasswordEncoder(passwordEncoder());
    return authProvider;
  }

  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
    return authConfig.getAuthenticationManager();
  }

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf
            .ignoringRequestMatchers("/api/proxy/**")) // CSRF 완전 제외
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/proxy/**").permitAll()
            .requestMatchers(
                "/", "/login", "/register/**",
                "/css/**", "/js/**", "/image/**", "/favicon.ico",
                "/json/**", "/pages/**", "/api/**",
                "/member/find/**", "/find-id", "/find-password",
                "/board/list/**", "/board/view/**")
            .permitAll()
            .anyRequest().authenticated())
        .formLogin(form -> form
            .loginPage("/login")
            .defaultSuccessUrl("/", true)
            .permitAll())
        .oauth2Login(oauth2 -> oauth2
            .loginPage("/login")
            .userInfoEndpoint(endpoint -> endpoint.userService(customOAuth2UserService))
            .successHandler(oAuthSuccessHandler)
            .failureHandler(oAuthFailureHandler))
        .logout(logout -> logout
            .logoutSuccessUrl("/")
            .invalidateHttpSession(true)
            .deleteCookies("JSESSIONID"))
        .sessionManagement(session -> session
            .maximumSessions(1)
            .expiredUrl("/login?expired"));

    return http.build();
  }
}