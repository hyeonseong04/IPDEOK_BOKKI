
/* ========================================
   입덕볶이 - 공통 회원 관리 기능
======================================== */

(() => {

  'use strict';


  // ========================================
  // 회원 정보 및 로그인 상태 저장 이름
  // ========================================

  const USERS_KEY = 'ipdeokDemoUsersV1';

  const LOGIN_KEY = 'ipdeokDemoLoginV1';


  // ========================================
  // 저장된 데이터 불러오기
  // ========================================

  function readData(key, fallback) {

    try {

      const data = localStorage.getItem(key);

      return data ? JSON.parse(data) : fallback;

    } catch {

      return fallback;

    }

  }


  // ========================================
  // 데이터 저장
  // ========================================

  function saveData(key, data) {

    localStorage.setItem(

      key,

      JSON.stringify(data)

    );

  }


  // ========================================
  // 전체 회원 정보 불러오기
  // ========================================

  function getUsers() {

    const users = readData(USERS_KEY, []);

    return Array.isArray(users) ? users : [];

  }


  // ========================================
  // 아이디 정리
  // ========================================

  function normalizeId(id) {

    return String(id || '')

      .trim()

      .toLowerCase();

  }


  // ========================================
  // 테스트용 비밀번호 해시 생성
  // ========================================

  async function hashPassword(password, salt) {

    if (!window.crypto?.subtle) {

      throw new Error(

        'Live Server 또는 HTTPS 환경에서 실행해 주세요.'

      );

    }

    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(

      'raw',

      encoder.encode(password),

      'PBKDF2',

      false,

      ['deriveBits']

    );

    const result = await crypto.subtle.deriveBits(

      {

        name: 'PBKDF2',

        salt: encoder.encode(salt),

        iterations: 100000,

        hash: 'SHA-256'

      },

      key,

      256

    );

    return Array.from(new Uint8Array(result))

      .map(value =>

        value.toString(16).padStart(2, '0')

      )

      .join('');

  }


  // ========================================
  // 임의의 사용자 구분값 생성
  // ========================================

  function createSalt() {

    const values = crypto.getRandomValues(

      new Uint8Array(16)

    );

    return Array.from(values)

      .map(value =>

        value.toString(16).padStart(2, '0')

      )

      .join('');

  }


  // ========================================
  // 회원가입
  // ========================================

  async function register(id, password, nickname) {

    id = normalizeId(id);

    password = String(password || '');

    nickname = String(nickname || '').trim();


    // 필수 정보 확인

    if (!id) {

      throw new Error('아이디를 입력해 주세요.');

    }

    if (!password) {

      throw new Error('비밀번호를 입력해 주세요.');

    }

    if (!nickname) {

      throw new Error('닉네임을 입력해 주세요.');

    }


    // 중복 아이디 확인

    if (getUsers().some(user => user.id === id)) {

      throw new Error('이미 가입된 아이디입니다.');

    }


    // 비밀번호 해시 생성

    const salt = createSalt();

    const passwordHash = await hashPassword(

      password,

      salt

    );


    // 새로운 회원 정보

    const newUser = {

      id: id,

      nickname: nickname.slice(0, 20),

      salt: salt,

      passwordHash: passwordHash,

      createdAt: new Date().toISOString()

    };


    // 회원 목록에 추가

    const users = getUsers();

    if (users.some(user => user.id === id)) {

      throw new Error('이미 가입된 아이디입니다.');

    }

    users.push(newUser);


    // 회원 정보 저장

    saveData(USERS_KEY, users);


    return {

      id: newUser.id,

      nickname: newUser.nickname

    };

  }


  // ========================================
  // 현재 로그인한 사용자 가져오기
  // ========================================

  function current() {

    const user = readData(LOGIN_KEY, null);

    if (

      !user ||

      typeof user.id !== 'string' ||

      typeof user.nickname !== 'string'

    ) {

      return null;

    }

    return user;

  }


  // ========================================
  // 로그인 여부 확인
  // ========================================

  function isLoggedIn() {

    return current() !== null;

  }


  // ========================================
  // 기존 로그인 기능과 호환
  // ========================================

  function syncLegacyLogin() {

    const user = current();

    try {

      if (user) {

        sessionStorage.setItem(

          'demoLogin',

          'true'

        );

        sessionStorage.setItem(

          'demoUsername',

          user.nickname

        );

      } else {

        sessionStorage.removeItem('demoLogin');

        sessionStorage.removeItem('demoUsername');

      }

    } catch {

      console.warn('기존 로그인 정보 연결 실패');

    }

  }


  // ========================================
  // 로그인 상태 변경 알림
  // ========================================

  function notify() {

    syncLegacyLogin();

    window.dispatchEvent(

      new Event('ipdeok-auth')

    );

  }


  // ========================================
  // 로그인 사용자 정보 저장
  // ========================================

  function saveLogin(user) {

    const loginUser = {

      id: user.id,

      nickname: user.nickname,

      provider: user.provider || '일반 로그인'

    };

    saveData(LOGIN_KEY, loginUser);

    notify();

    return loginUser;

  }


  // ========================================
  // 일반 로그인
  // ========================================

  async function login(id, password) {

    id = normalizeId(id);

    password = String(password || '');


    if (!id || !password) {

      throw new Error(

        '아이디와 비밀번호를 입력해 주세요.'

      );

    }


    // 회원 정보 확인

    const user = getUsers().find(

      item => item.id === id

    );

    if (!user) {

      throw new Error(

        '가입되지 않은 아이디입니다.'

      );

    }


    // 비밀번호 확인

    const passwordHash = await hashPassword(

      password,

      user.salt

    );

    if (user.passwordHash !== passwordHash) {

      throw new Error(

        '비밀번호가 일치하지 않습니다.'

      );

    }


    // 로그인 정보 저장

    return saveLogin({

      id: user.id,

      nickname: user.nickname,

      provider: '일반 로그인'

    });

  }


  // ========================================
  // 테스트용 간편 로그인
  // ========================================

  function socialLogin(provider) {

    const providers = [

      '카카오',

      '구글',

      '애플'

    ];

    if (!providers.includes(provider)) {

      throw new Error(

        '지원하지 않는 로그인 방식입니다.'

      );

    }

    return saveLogin({

      id: 'social:' + provider,

      nickname: provider + ' 회원',

      provider: provider

    });

  }


  // ========================================
  // 로그아웃
  // ========================================

  function logout() {

    localStorage.removeItem(LOGIN_KEY);

    notify();

  }


  // ========================================
  // 페이지 이동 및 새로고침 시 로그인 유지
  // ========================================

  syncLegacyLogin();


  window.addEventListener(

    'pageshow',

    notify

  );


  window.addEventListener('storage', event => {

    if (

      event.key === LOGIN_KEY ||

      event.key === null

    ) {

      notify();

    }

  });


  // ========================================
  // 다른 HTML에서 사용할 회원 관리 기능
  // ========================================

  window.IpAuth = {

    register,

    login,

    socialLogin,

    logout,

    current,

    isLoggedIn

  };

})();




/* ========================================
   공통 로그인 및 로그아웃 상태 통일
======================================== */

(() => {

  'use strict';

  const auth = window.IpAuth;

  if (!auth) return;


  // ========================================
  // 프로젝트 경로
  // ========================================

  const root = new URL(

    '.',

    document.currentScript.src

  );

  const loginUrl = new URL(

    'SUB/login/login.html',

    root

  ).href;


  // ========================================
  // 로그인 / 로그아웃 메뉴 찾기
  // ========================================

  function getAuthLinks() {

    return Array.from(

      document.querySelectorAll('.side-menu-nav a')

    ).filter(link => {

      const text = link.textContent.replace(/\s/g, '');

      return (

        text === '로그인/회원가입' ||

        text === '로그아웃' ||

        link.dataset.ipAuthLink === 'true' ||

        link.classList.contains('logout-link')

      );

    });

  }


  // ========================================
  // 로그인 상태에 따른 메뉴 변경
  // ========================================

  function refreshAuthUI() {

    const user = auth.current();


    getAuthLinks().forEach(link => {

      link.dataset.ipAuthLink = 'true';

      link.textContent = user

        ? '로그아웃'

        : '로그인 / 회원가입';

      link.href = user ? '#' : loginUrl;

      link.classList.toggle(

        'logout-link',

        !!user

      );

      if (user) {

        link.removeAttribute('aria-current');

      }

    });


    // 기존 사이드메뉴 프로필 갱신

    document.querySelectorAll('.user-profile')

      .forEach(profile => {

        profile.hidden = !user;

        const name = profile.querySelector(

          '.profile-name'

        );

        if (name) {

          name.textContent = user

            ? user.nickname + '님'

            : '';

        }

      });

  }


  // ========================================
  // 모든 페이지의 로그아웃 기능 통일
  // ========================================

  document.addEventListener('click', event => {

    const link = event.target.closest(

      '.side-menu-nav a'

    );

    if (!link) return;

    if (!getAuthLinks().includes(link)) return;

    if (!auth.isLoggedIn()) return;


    // 기존 로그아웃 코드 실행 방지

    event.preventDefault();

    event.stopImmediatePropagation();


    // 로그아웃 확인

    if (!confirm('로그아웃 하시겠습니까?')) return;


    try {

      auth.logout();

      sessionStorage.removeItem('demoLogin');

      sessionStorage.removeItem('demoUsername');

      refreshAuthUI();

      alert('로그아웃 되었습니다.');

    } catch (error) {

      alert('로그아웃에 실패했습니다.');

    }

  }, true);


  // ========================================
  // 페이지 최초 실행
  // ========================================

  if (document.readyState === 'loading') {

    document.addEventListener(

      'DOMContentLoaded',

      refreshAuthUI

    );

  } else {

    refreshAuthUI();

  }


  // 로그인 상태 변경 시 화면 갱신

  window.addEventListener(

    'ipdeok-auth',

    refreshAuthUI

  );


  // 다른 페이지에서 돌아왔을 때 갱신

  window.addEventListener(

    'pageshow',

    refreshAuthUI

  );

})();




/* ========================================
   입덕볶이 - 헤더 사용자 프로필
======================================== */

(() => {

  'use strict';

  const auth = window.IpAuth;

  if (!auth) return;


  // ========================================
  // 프로젝트 최상위 경로
  // ========================================

  const root = new URL(

    '.',

    document.currentScript.src

  );


  // 로그인 페이지 경로

  const loginUrl = new URL(

    'SUB/login/login.html',

    root

  ).href;


  // ========================================
  // 공통 회원 CSS 자동 연결
  // ========================================

  const cssUrl = new URL(

    'CSS/auth.css',

    root

  ).href;


  const hasAuthCSS = Array.from(

    document.querySelectorAll(

      'link[rel="stylesheet"]'

    )

  ).some(link => link.href === cssUrl);


  if (!hasAuthCSS) {

    const stylesheet =

      document.createElement('link');

    stylesheet.rel = 'stylesheet';

    stylesheet.href = cssUrl;

    document.head.appendChild(stylesheet);

  }


  // ========================================
  // 사용자 아이콘 및 로그아웃 팝업 디자인
  // ========================================

  const style = document.createElement('style');

  style.textContent = `

    /* 사용자 프로필 버튼 */

    .ip-profile-trigger {

      display: flex;

      flex-direction: column;

      align-items: center;

      justify-content: center;

      gap: 3px;

      width: 100%;

      height: 100%;

      padding: 0;

      background: transparent;

      border: none;

      font-family: inherit;

      color: #000000;

      cursor: pointer;

    }


    /* 팝업이 열려 있을 때 */

    .header .ip-header-profile.popup-open {

      z-index: 100;

    }


    /* ====================================
       로그아웃 팝업

       사용자 아이콘 정중앙 아래 배치
    ==================================== */

    .ip-profile-popup {

      position: absolute;

      top: calc(100% + 4px);

      left: 50%;

      right: auto;

      transform: translateX(-50%);

      min-width: 112px;

      padding: 6px;

      background-color: #FFFFFF;

      border: 1px solid #E5D8C8;

      border-radius: 10px;

      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);

      box-sizing: border-box;

      z-index: 100;

    }


    /* ====================================
       팝업 상단 작은 화살표
    ==================================== */

    .ip-profile-popup::before {

      content: "";

      position: absolute;

      top: -5px;

      left: 50%;

      width: 8px;

      height: 8px;

      background-color: #FFFFFF;

      border-top: 1px solid #E5D8C8;

      border-left: 1px solid #E5D8C8;

      transform: translateX(-50%) rotate(45deg);

      pointer-events: none;

    }


    /* 팝업 숨기기 */

    .ip-profile-popup[hidden] {

      display: none !important;

    }


    /* 로그아웃 버튼 */

    .ip-profile-logout {

      display: flex;

      align-items: center;

      justify-content: center;

      gap: 8px;

      width: 100%;

      padding: 10px 8px;

      background-color: transparent;

      border: none;

      border-radius: 6px;

      font-family: inherit;

      font-size: 13px;

      font-weight: 600;

      color: #E84129;

      white-space: nowrap;

      cursor: pointer;

    }


    /* 로그아웃 버튼 마우스 효과 */

    .ip-profile-logout:hover {

      background-color: #FDF1E1;

    }


    /* 로그아웃 아이콘 */

    .ip-profile-logout svg {

      width: 17px;

      height: 17px;

      stroke-width: 1.8;

    }

  `;


  document.head.appendChild(style);


  // ========================================
  // 로그아웃 팝업 닫기
  // ========================================

  function closeProfilePopup() {

    const profile = document.querySelector(

      '.ip-header-profile'

    );

    if (!profile) return;


    const popup = profile.querySelector(

      '.ip-profile-popup'

    );

    const trigger = profile.querySelector(

      '.ip-profile-trigger'

    );

    if (!popup || !trigger) return;


    popup.hidden = true;

    profile.classList.remove('popup-open');

    trigger.setAttribute(

      'aria-expanded',

      'false'

    );

  }


  // ========================================
  // 헤더 사용자 프로필 생성
  // ========================================

  function mountHeaderProfile() {

    const header =

      document.querySelector('.header');

    if (!header) return;


    // 헤더 위치 기준 설정

    if (getComputedStyle(header).position === 'static') {

      header.classList.add('ip-auth-position');

    }


    // 기존 사이드메뉴 사용자 프로필 숨기기

    document.body.classList.add('ip-auth-ui');


    // 기존 사용자 프로필 확인

    let profile = header.querySelector(

      '.ip-header-profile'

    );


    // 프로필이 없으면 생성

    if (!profile) {

      profile = document.createElement('div');

      profile.className = 'ip-header-profile';


      // 사용자 아이콘 및 로그아웃 팝업

      profile.innerHTML = `

        <button type="button"
                class="ip-profile-trigger"
                aria-label="로그인"
                aria-expanded="false"
                aria-controls="ipProfilePopup">

          <span class="ip-header-profile-icon">

            <i data-lucide="user-round"></i>

          </span>

          <span class="ip-header-profile-name"></span>

        </button>


        <div class="ip-profile-popup"
             id="ipProfilePopup"
             hidden>

          <button type="button"
                  class="ip-profile-logout">

            <i data-lucide="log-out"></i>

            <span>로그아웃</span>

          </button>

        </div>

      `;


      header.appendChild(profile);


      // ========================================
      // 사용자 아이콘 클릭 기능
      // ========================================

      const trigger = profile.querySelector(

        '.ip-profile-trigger'

      );

      const popup = profile.querySelector(

        '.ip-profile-popup'

      );

      const logoutBtn = profile.querySelector(

        '.ip-profile-logout'

      );


      trigger.addEventListener('click', () => {


        // 비로그인 상태
        // 로그인페이지 이동

        if (!auth.isLoggedIn()) {

          window.location.href = loginUrl;

          return;

        }


        // 로그인 상태
        // 로그아웃 팝업 열기 및 닫기

        const isOpen = popup.hidden;

        popup.hidden = !isOpen;

        profile.classList.toggle(

          'popup-open',

          isOpen

        );

        trigger.setAttribute(

          'aria-expanded',

          String(isOpen)

        );

      });


      // ========================================
      // 로그아웃 버튼 클릭
      // ========================================

      logoutBtn.addEventListener('click', () => {

        const result = confirm(

          '로그아웃 하시겠습니까?'

        );

        if (!result) return;


        try {


          // 공통 로그아웃 실행

          auth.logout();


          // 기존 임시 로그인 정보 삭제

          sessionStorage.removeItem('demoLogin');

          sessionStorage.removeItem('demoUsername');


          // 팝업 닫기

          closeProfilePopup();


          // 헤더 사용자 정보 갱신

          mountHeaderProfile();


          // 로그아웃 안내

          alert('로그아웃 되었습니다.');

        } catch (error) {

          alert('로그아웃에 실패했습니다.');

        }

      });

    }


    // ========================================
    // 현재 로그인 상태 확인
    // ========================================

    const user = auth.current();


    const name = profile.querySelector(

      '.ip-header-profile-name'

    );


    const trigger = profile.querySelector(

      '.ip-profile-trigger'

    );


    // 로그인 여부와 관계없이 아이콘 표시

    profile.hidden = false;


    // ========================================
    // 로그인 상태
    // ========================================

    if (user) {

      name.textContent = user.nickname + '님';

      trigger.title = user.nickname + '님';

      trigger.setAttribute(

        'aria-label',

        user.nickname + '님, 사용자 메뉴 열기'

      );

      header.classList.add(

        'ip-auth-logged-in'

      );

    } else {


      // ========================================
      // 비로그인 상태
      // ========================================

      name.textContent = '로그인';

      trigger.title = '로그인 / 회원가입';

      trigger.setAttribute(

        'aria-label',

        '로그인 / 회원가입 페이지 이동'

      );

      header.classList.remove(

        'ip-auth-logged-in'

      );

      closeProfilePopup();

    }


    // Lucide 아이콘 적용

    if (window.lucide) {

      lucide.createIcons();

    }

  }


  // ========================================
  // 팝업 외부 클릭 시 닫기
  // ========================================

  document.addEventListener('click', event => {

    if (!event.target.closest('.ip-header-profile')) {

      closeProfilePopup();

    }

  });


  // ========================================
  // ESC 키 입력 시 닫기
  // ========================================

  document.addEventListener('keydown', event => {

    if (event.key === 'Escape') {

      const profile = document.querySelector(

        '.ip-header-profile.popup-open'

      );

      if (!profile) return;


      closeProfilePopup();


      profile.querySelector(

        '.ip-profile-trigger'

      ).focus();

    }

  });


  // ========================================
  // 페이지 최초 실행
  // ========================================

  if (document.readyState === 'loading') {

    document.addEventListener(

      'DOMContentLoaded',

      mountHeaderProfile

    );

  } else {

    mountHeaderProfile();

  }


  // ========================================
  // 로그인 및 로그아웃 상태 반영
  // ========================================

  window.addEventListener('ipdeok-auth', () => {

    closeProfilePopup();

    mountHeaderProfile();

  });


  // ========================================
  // 페이지 이동 및 뒤로가기 상태 반영
  // ========================================

  window.addEventListener('pageshow', () => {

    closeProfilePopup();

    mountHeaderProfile();

  });


  // ========================================
  // 다른 브라우저 탭 로그인 상태 반영
  // ========================================

  window.addEventListener(

    'storage',

    mountHeaderProfile

  );

})();
