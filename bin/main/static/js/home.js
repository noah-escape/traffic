document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('toggle-mode');
  const body = document.body;

  // 쿠키에서 다크모드 설정 불러오기
  const darkMode = getCookie('darkMode');

  if (darkMode === 'true') {
    body.classList.add('dark-mode');
    body.classList.remove('light-mode');
  } else {
    body.classList.add('light-mode');
    body.classList.remove('dark-mode');
  }

  button.addEventListener('click', () => {
    const isDark = body.classList.contains('dark-mode');
    if (isDark) {
      body.classList.remove('dark-mode');
      body.classList.add('light-mode');
      setCookie('darkMode', 'false', 7); // 7일간 유지
    } else {
      body.classList.remove('light-mode');
      body.classList.add('dark-mode');
      setCookie('darkMode', 'true', 7);
    }
  });

  // 쿠키 설정 함수
  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
  }

  // 쿠키 가져오는 함수
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }
});

document.addEventListener('DOMContentLoaded', function () {
  // 모바일 메뉴 토글 아이콘 회전
  const toggleBtn = document.getElementById("mobileBoardDropdown");
  const collapseTarget = document.getElementById("boardDropdownMenu");
  const icon = toggleBtn.querySelector(".arrow-icon");

  collapseTarget.addEventListener("show.bs.collapse", function () {
    icon.classList.add("rotate");
  });

  collapseTarget.addEventListener("hide.bs.collapse", function () {
    icon.classList.remove("rotate");
  });

  // ✅ 스크롤 최상단 이동 버튼 클릭 이벤트
  const scrollBtn = document.getElementById('scrollToTopBtn');
  scrollBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});