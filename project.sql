-- users 테이블
CREATE TABLE users (
    user_id varchar(255) NOT NULL COMMENT '아이디 중복불가 PK',
    nick_name varchar(100) NOT NULL COMMENT '닉네임 중복불가',
    password varchar(255) NOT NULL COMMENT '비밀번호',
    name varchar(100) NOT NULL COMMENT '사용자 실명',
    birth_date date DEFAULT NULL COMMENT '생년월일',
    phone_number varchar(20) DEFAULT NULL COMMENT '전화번호',
    address varchar(255) DEFAULT NULL COMMENT '주소',
    provider varchar(50) DEFAULT NULL COMMENT '로그인 제공자(네이버, 카카오, 구글 등)',
    create_at datetime DEFAULT CURRENT_TIMESTAMP COMMENT '회원가입 시간',
    update_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '정보 수정 시간',
    role varchar(10) NOT NULL DEFAULT 'USER' COMMENT '계정 권한 (USER or ADMIN)',
    email varchar(255) DEFAULT NULL,
    oauth_id varchar(255) DEFAULT NULL,
    PRIMARY KEY (user_id),
    UNIQUE KEY nick_name (nick_name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '회원가입 데이터 베이스'

-- roads 테이블
CREATE TABLE roads (
    road_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '도로 고유 ID',
    road_name VARCHAR(255) COMMENT '도로명, 도로의 이름',
    road_type VARCHAR(50) DEFAULT '기타' COMMENT '도로 유형, \'고속도로\', \'국도\' 등',
    start_point VARCHAR(255) DEFAULT '알 수 없음' COMMENT '도로 시작 지점',
    end_point VARCHAR(255) DEFAULT '알 수 없음' COMMENT '도로 끝 지점',
    length DOUBLE DEFAULT 0 COMMENT '도로 길이(km)',
    speed_limit INT DEFAULT 60 COMMENT '제한 속도',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '데이터 추가일',
    update_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '데이터 수정일'
) COMMENT '기본 도로 정보 테이블';

-- board_category 테이블
CREATE TABLE board_category (
    category_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '게시판 종류의 고유 ID',
    name VARCHAR(255) COMMENT '게시판 이름(공지글, 자유게시판, 민원게시판 등)'
) COMMENT '게시판 종류 테이블';

-- bike_stations 테이블
CREATE TABLE bike_stations (
    station_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '대여소 ID (PK)',
    station_name VARCHAR(100) NOT NULL COMMENT '대여소 이름',
    latitude DOUBLE COMMENT '대여소 위도',
    longitude DOUBLE COMMENT '대여소 경도',
    total_bikes INT NOT NULL COMMENT '대여소에 총 자전거 수',
    available_bikes INT NOT NULL COMMENT '대여소에서 대여 가능한 자전거 수',
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '마지막 정보 업데이트 시간'
) COMMENT '대여소 정보 테이블';

-- bike_status 테이블
CREATE TABLE bike_status (
    bike_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '자전거 ID (PK)',
    bike_condition VARCHAR(255) NOT NULL COMMENT '자전거 상태(예: 정상, 고장 등)',
    last_service_date DATETIME COMMENT '마지막 수리 날짜',
    last_location VARCHAR(100) COMMENT '자전거 마지막 위치(대여소 이름 등)',
    is_available CHAR(1) DEFAULT 'Y' COMMENT '자전거 대여 가능 여부 (Y: 가능, N: 불가)'
) COMMENT '자전거 상태 정보 테이블';

-- bike_users 테이블
CREATE TABLE bike_users (
    user_id VARCHAR(255) PRIMARY KEY COMMENT '회원 고유 식별자 (users 테이블 참조)',
    name VARCHAR(100) NOT NULL COMMENT '사용자 이름',
    phone_number VARCHAR(20) COMMENT '전화번호',
    email VARCHAR(100) UNIQUE COMMENT '이메일',
    registration_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '회원가입 일시',
    FOREIGN KEY (user_id) REFERENCES users (user_id)
) COMMENT '사용자 정보 테이블';

-- board 테이블
CREATE TABLE board (
    board_num int NOT NULL AUTO_INCREMENT COMMENT '게시글 고유 ID',
    board_seq int NOT NULL COMMENT '해당 카테고리 내에서의 글 번호',
    user_id varchar(255) DEFAULT NULL COMMENT '회원 고유 식별자',
    category_id int DEFAULT NULL COMMENT '게시판 종류의 고유 ID',
    subject varchar(100) NOT NULL COMMENT '게시판 제목',
    content text NOT NULL COMMENT '게시글 내용',
    hit int DEFAULT '0' COMMENT '조회수',
    writedate datetime DEFAULT CURRENT_TIMESTAMP COMMENT '작성시간',

    notice bit(1) NOT NULL DEFAULT b'0' COMMENT '공지 여부 (1: 공지글)',

    nick_name varchar(255) DEFAULT NULL,

    PRIMARY KEY (board_num),
    UNIQUE KEY idx_category_seq (category_id, board_seq),
    KEY user_id (user_id),
    CONSTRAINT board_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (user_id),
    CONSTRAINT board_ibfk_2 FOREIGN KEY (category_id) REFERENCES board_category (category_id)
) ENGINE = InnoDB AUTO_INCREMENT = 17 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '게시글 테이블';

-- board_image 테이블
CREATE TABLE board_image (
    image_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '이미지 고유 ID',
    board_num INT NOT NULL COMMENT '게시글 고유 ID',
    image_path VARCHAR(255) DEFAULT NULL COMMENT '이미지 파일 경로',
    image_title VARCHAR(100) DEFAULT NULL COMMENT '이미지 제목 또는 설명',
    FOREIGN KEY (board_num) REFERENCES board (board_num) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '게시글 이미지 테이블';

-- cctv_footage 테이블
CREATE TABLE cctv_footage (
    cctv_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'CCTV 고유 ID',
    road_id INT COMMENT '도로 고유 ID',
    cctv_location VARCHAR(255) DEFAULT '알 수 없음' NOT NULL COMMENT 'CCTV 위치',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '영상 기록 시간',
    video_url VARCHAR(255) DEFAULT '없음' NOT NULL COMMENT 'CCTV 영상 URL',
    status VARCHAR(50) DEFAULT '정상' NOT NULL COMMENT 'CCTV 상태 (정상, 고장 등)',
    FOREIGN KEY (road_id) REFERENCES roads (road_id)
) COMMENT 'CCTV 화상 자료 테이블';

-- disasterdata 테이블
CREATE TABLE disasterdata (
    disaster_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '재해 고유 ID',
    disaster_type VARCHAR(50) COMMENT '재해 유형',
    location VARCHAR(100) COMMENT '재해 발생 위치',
    start_date DATE NOT NULL COMMENT '재해 발생 시작일',
    end_date DATE COMMENT '재해 발생 종료일 (예정)',
    description VARCHAR(500) COMMENT '재해 설명',
    impact VARCHAR(100) COMMENT '재해의 영향(예: 인명 피해, 재산 피해)',
    severity VARCHAR(50) COMMENT '재해의 심각도 (예: 경미, 중간, 심각)',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '데이터 수집 시간'
) COMMENT '자연재해 정보 테이블';

-- emergency_events 테이블
CREATE TABLE emergency_events (
    event_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '돌발 상황 공유 ID',
    road_id INT COMMENT '도로 고유 ID',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '이벤트 발생 시간',
    event_type VARCHAR(100) DEFAULT '알 수 없음' NOT NULL COMMENT '이벤트 유형(사고, 공사, 재난 등)',
    severity VARCHAR(50) DEFAULT '경미' NOT NULL COMMENT '심각도 (경미, 심각 등)',
    latitude DOUBLE NOT NULL COMMENT '이벤트 발생 위치 위도',
    longitude DOUBLE NOT NULL COMMENT '이벤트 발생 위치 경도',
    event_description TEXT COMMENT '사건 또는 상황 설명',
    FOREIGN KEY (road_id) REFERENCES roads (road_id)
) COMMENT '돌발상황 정보 테이블';

-- rental_records 테이블
CREATE TABLE rental_records (
    rental_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '대여 기록 ID(PK)',
    user_id VARCHAR(255) COMMENT '회원 고유 식별자',
    station_id INT COMMENT '대여소 ID (BIKE_STATIONS(station_id))',
    bike_id INT COMMENT '자전거 ID (BIKE_STATUS(bike_id))',
    rental_time DATETIME NOT NULL COMMENT '대여 시간',
    return_time DATETIME COMMENT '반납 시간(반납하지 않으면 null)',
    rental_status VARCHAR(20) NOT NULL COMMENT '대여 상태 (예: 대여, 반납)',
    FOREIGN KEY (user_id) REFERENCES users (user_id),
    FOREIGN KEY (station_id) REFERENCES bike_stations (station_id),
    FOREIGN KEY (bike_id) REFERENCES bike_status (bike_id)
) COMMENT '대여/반납 기록 테이블';

-- reply 테이블
CREATE TABLE reply (
    num INT NOT NULL AUTO_INCREMENT COMMENT '댓글 ID',
    board_num INT NOT NULL COMMENT '게시글 PK',
    user_id VARCHAR(255) DEFAULT NULL COMMENT '회원 ID',
    content VARCHAR(400) NOT NULL COMMENT '댓글 내용',
    writedate DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '작성 시간',
    ipaddr VARCHAR(20),
    gup INT NOT NULL,
    lev INT DEFAULT 0,
    seq INT DEFAULT 0,
    PRIMARY KEY (num),
    KEY (board_num),
    KEY (user_id),
    CONSTRAINT fk_reply_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_reply_board FOREIGN KEY (board_num) REFERENCES board(board_num)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '댓글 테이블';

-- speed_limit_change 테이블
CREATE TABLE speed_limit_change (
    vsl_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'VSL 고유 ID',
    road_id INT COMMENT '도로 고유 ID',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '속도 제한 변경 시간',
    old_speed INT DEFAULT 0 COMMENT '이전 속도 제한',
    new_speed INT DEFAULT 0 COMMENT '새로운 속도 제한',
    FOREIGN KEY (road_id) REFERENCES roads (road_id)
) COMMENT '가변형 속도 제한 표시 정보 테이블';

-- traffic_communications 테이블
CREATE TABLE traffic_communications (
    comm_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '교통 소통 고유 ID',
    road_id INT COMMENT '도로 고유 ID',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '정보 측정 시간',
    traffic_flow INT NOT NULL COMMENT '교통 흐름(차량 수)',
    congestion_level VARCHAR(50) DEFAULT '보통' NOT NULL COMMENT '혼잡도 수준(낮은, 보통, 높음 등)',
    average_speed INT NOT NULL COMMENT '평균 속고(km/h)',
    incident_type VARCHAR(100) COMMENT '사고 또는 돌발 상황 유형',
    event_description TEXT COMMENT '사고 또는 상황 설명',
    FOREIGN KEY (road_id) REFERENCES roads (road_id)
) COMMENT '교통 소통 정보 테이블';

-- traffic_predictions 테이블
CREATE TABLE traffic_predictions (
    prediction_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '예측 고유 ID',
    road_id INT COMMENT '도로 고유 ID',
    prediction_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '예측 시간',
    predicted_flow INT DEFAULT 0 NOT NULL COMMENT '예상 교통 흐름(차량 수)',
    predicted_speed INT DEFAULT 0 NOT NULL COMMENT '예상 평균 속도',
    FOREIGN KEY (road_id) REFERENCES roads (road_id)
) COMMENT '교통 예측 정보 테이블';

-- vehicle_detection 테이블
CREATE TABLE vehicle_detection (
    detection_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '차량 검지 고유 ID',
    road_id INT COMMENT '도로 고유 ID',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '정보 측정 시간',
    vehicle_count INT DEFAULT 0 NOT NULL COMMENT '차량 수',
    occupancy_rate DOUBLE DEFAULT 0 NOT NULL COMMENT '점유율',
    speed DOUBLE DEFAULT 0 NOT NULL COMMENT '지점 속도',
    FOREIGN KEY (road_id) REFERENCES roads (road_id)
) COMMENT '차량 검지 정보 테이블';

-- vms_information 테이블
CREATE TABLE vms_information (
    vms_id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'VMS 고유 ID',
    road_id INT COMMENT '도로 고유 ID',
    message VARCHAR(255) DEFAULT '속도 제한 60km/h' NOT NULL COMMENT '출력 메시지 (예: 속도 제한)',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '정보 측정 시간',
    latitude DOUBLE DEFAULT 0 NOT NULL COMMENT 'VMS 위치 위도',
    longitude DOUBLE DEFAULT 0 NOT NULL COMMENT 'VMS 위치 경도',
    FOREIGN KEY (road_id) REFERENCES roads (road_id)
) COMMENT '도로 전광표지 정보 테이블';

-- vulnerable_sections 테이블
CREATE TABLE vulnerable_sections (
    section_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '취약 구간 고유 ID',
    road_id INT COMMENT '도로 고유 ID',
    vulnerbility VARCHAR(100) COMMENT '취약 구간 유형',
    description TEXT COMMENT '취약 구간 설명',
    latitude DOUBLE DEFAULT 0 COMMENT '구간 위치의 위도',
    longitude DOUBLE DEFAULT 0 COMMENT '구간 위치의 경도',
    FOREIGN KEY (road_id) REFERENCES roads (road_id)
) COMMENT '취약구간 정보 테이블';

-- weatherdata 테이블
CREATE TABLE weatherdata (
    weather_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '기상정보의 고유 ID',
    date DATE NOT NULL COMMENT '기상 정보 기록 날짜',
    time VARCHAR(5) COMMENT '기상 정보 기록 시간',
    temperature DOUBLE COMMENT '기온',
    humidity DOUBLE COMMENT '습도',
    precipitation DOUBLE COMMENT '강수량',
    wind_speed DOUBLE COMMENT '바람 속도',
    wind_direction VARCHAR(10) COMMENT '바람 방향',
    pressure DOUBLE COMMENT '기압',
    conditions VARCHAR(100) COMMENT '날씨 상태',
    location VARCHAR(100) COMMENT '기상 관측 위치',
    visibility DOUBLE COMMENT '가시거리',
    cloud_cover DOUBLE COMMENT '구름 덮개 비율',
    uv_index DOUBLE COMMENT '자외선 지수',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '데이터 수집 시간'
) COMMENT '기상 정보 테이블';

-- weatherhistory 테이블
CREATE TABLE weatherhistory (
    history_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '기상 이력의 고유 ID',
    weather_id INT COMMENT '기상정보의 고유 ID',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '이력 기록된 시간',
    temperature DOUBLE COMMENT '기온',
    humidity DOUBLE COMMENT '습도',
    precipitation DOUBLE COMMENT '강수량',
    wind_speed DOUBLE COMMENT '바람 속도',
    conditions VARCHAR(100) COMMENT '날씨 상태 (예: 맑음,흐림, 비 등)',
    FOREIGN KEY (weather_id) REFERENCES weatherdata (weather_id)
) COMMENT '기상 이력 테이블';