SELECT * FROM users;

delete from users;

ALTER TABLE users AUTO_INCREMENT = 1;

-- 외래키 있을 경우
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- 🔐 암호화된 비밀번호: qwer1234!@#$

-- Naver 유저
INSERT INTO users (user_id, nick_name, password, name, birth_date, phone_number, address, provider, role, oauth_id, email)
VALUES 
('naver_user1', 'naverNick1', "$2a$10$WhWaOhHlX4FsO3/HLsUieutxZ7sXM4rozIQAX6nz1.7ovzm9MDrXC", '홍길동', '1990-01-01', '010-1111-2222', '서울 강남구 테헤란로 1', 'naver', 'ROLE_USER', 'naver_id_1001', 'hong1@naver.com'),
('naver_user2', 'naverNick2', "$2a$10$WhWaOhHlX4FsO3/HLsUieutxZ7sXM4rozIQAX6nz1.7ovzm9MDrXC", '김철수', '1992-02-02', '010-2222-3333', '서울 서초구 반포대로 2', 'naver', 'ROLE_ADMIN', 'naver_id_1002', 'kim2@naver.com'),
('naver_user3', 'naverNick3', "$2a$10$WhWaOhHlX4FsO3/HLsUieutxZ7sXM4rozIQAX6nz1.7ovzm9MDrXC", '이영희', '1993-03-03', '010-3333-4444', '서울 송파구 잠실로 3', 'naver', 'ROLE_USER', 'naver_id_1003', 'lee3@naver.com');

-- Kakao 유저
INSERT INTO users (user_id, nick_name, password, name, birth_date, phone_number, address, provider, oauth_id, email)
VALUES 
('kakao_user1', 'kakaoNick1', "$2a$10$WhWaOhHlX4FsO3/HLsUieutxZ7sXM4rozIQAX6nz1.7ovzm9MDrXC", '박민수', '1988-04-04', '010-4444-5555', '서울 마포구 마포대로 4', 'kakao', 'kakao_id_2001', 'park1@kakao.com'),
('kakao_user2', 'kakaoNick2', "$2a$10$WhWaOhHlX4FsO3/HLsUieutxZ7sXM4rozIQAX6nz1.7ovzm9MDrXC", '최수진', '1989-05-05', '010-5555-6666', '서울 강서구 공항대로 5', 'kakao', 'kakao_id_2002', 'choi2@kakao.com'),
('kakao_user3', 'kakaoNick3', "$2a$10$WhWaOhHlX4FsO3/HLsUieutxZ7sXM4rozIQAX6nz1.7ovzm9MDrXC", '장서우', '1991-06-06', '010-6666-7777', '서울 성동구 왕십리로 6', 'kakao', 'kakao_id_2003', 'jang3@kakao.com');

-- Google 유저
INSERT INTO users (user_id, nick_name, password, name, birth_date, phone_number, address, provider, oauth_id, email)
VALUES 
('google_user1', 'googleNick1', "$2a$10$WhWaOhHlX4FsO3/HLsUieutxZ7sXM4rozIQAX6nz1.7ovzm9MDrXC", 'James Kim', '1985-07-07', '010-7777-8888', '서울 종로구 종로1길 7', 'google', 'google_id_3001', 'james1@gmail.com'),
('google_user2', 'googleNick2', "$2a$10$WhWaOhHlX4FsO3/HLsUieutxZ7sXM4rozIQAX6nz1.7ovzm9MDrXC", 'Alice Park', '1987-08-08', '010-8888-9999', '서울 중구 을지로 8', 'google', 'google_id_3002', 'alice2@gmail.com'),
('google_user3', 'googleNick3', "$2a$10$WhWaOhHlX4FsO3/HLsUieutxZ7sXM4rozIQAX6nz1.7ovzm9MDrXC", 'John Lee', '1994-09-09', '010-9999-0000', '서울 노원구 노해로 9', 'google', 'google_id_3003', 'john3@gmail.com'),
('google_user4', 'googleNick4', "$2a$10$WhWaOhHlX4FsO3/HLsUieutxZ7sXM4rozIQAX6nz1.7ovzm9MDrXC", 'Grace Choi', '1995-10-10', '010-0000-1111', '서울 양천구 목동로 10', 'google', 'google_id_3004', 'grace4@gmail.com');


INSERT INTO bike_users (user_id, name, phone_number, email, registration_date)
VALUES 
(1, '홍길동', '01012345678', 'dummy1@example.com', NOW()),
(2, '김철수', '01023456789', 'dummy2@example.com', NOW()),
(3, '이영희', '01034567890', 'dummy3@example.com', NOW()),
(4, '박지성', '01045678901', 'dummy4@example.com', NOW()),
(5, '최수연', '01056789012', 'dummy5@example.com', NOW()),
(6, '조세호', '01067890123', 'dummy6@example.com', NOW()),
(7, '한지민', '01078901234', 'dummy7@example.com', NOW()),
(8, '정해인', '01089012345', 'dummy8@example.com', NOW()),
(9, '김유정', '01090123456', 'dummy9@example.com', NOW()),
(10, '박보검', '01001234567', 'dummy10@example.com', NOW());

SELECT * FROM board_category;

INSERT INTO board_category (category_id, name) VALUES (1, '공지사항'), (2, '자유게시판'), (3, '민원게시판');

SELECT user_id, role FROM users;

SELECT * from board;

ALTER TABLE board
  DROP COLUMN `is_notice`,
  DROP COLUMN `ais_notice`,
  MODIFY `notice` bit(1) NOT NULL DEFAULT b'0' COMMENT '공지 여부 (1: 공지글)';