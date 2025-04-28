package com.cctv.road;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import io.github.cdimascio.dotenv.Dotenv;

@SpringBootApplication
public class RoadApplication {

	public static void main(String[] args) {
		// .env 파일 읽어오기
		Dotenv dotenv = Dotenv.configure().load();
		System.setProperty("MAIL_USERNAME", dotenv.get("MAIL_USERNAME"));
		System.setProperty("MAIL_PASSWORD", dotenv.get("MAIL_PASSWORD"));

		// 스프링부트 시작
		SpringApplication.run(RoadApplication.class, args);
	}
}