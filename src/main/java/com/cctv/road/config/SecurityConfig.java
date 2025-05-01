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
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

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
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf
            .ignoringRequestMatchers(
                new AntPathRequestMatcher("/api/proxy/road-event"),
                new AntPathRequestMatcher("/api/proxy/road-event-all"))
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
        .authenticationProvider(authenticationProvider())
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(
                "/", "/home", "/login", "/register/**",
                "/css/**", "/js/**", "/image/**", "/favicon.ico",
                "/json/**", "/pages/**",
                "/api/**", "/api/proxy/**",
                "/member/find/**", "/find-id", "/find-password"
            ).permitAll()
            .requestMatchers("/register/delete").authenticated()
            .requestMatchers("/member/mypage", "/member/update", "/member/update/**", "/member/check-password")
            .authenticated()
            .requestMatchers("/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated())
        .formLogin(form -> form
            .loginPage("/login")
            .defaultSuccessUrl("/", true)
            .failureUrl("/login?error=true")
            .permitAll())
        .oauth2Login(oauth2 -> oauth2
            .loginPage("/login")
            .userInfoEndpoint(endpoint -> endpoint.userService(customOAuth2UserService))
            .successHandler(oAuthSuccessHandler)
            .failureHandler(oAuthFailureHandler))
        .logout(logout -> logout
            .logoutRequestMatcher(new AntPathRequestMatcher("/logout"))
            .logoutSuccessUrl("/")
            .invalidateHttpSession(true)
            .deleteCookies("JSESSIONID"));

    return http.build();
  }
}
