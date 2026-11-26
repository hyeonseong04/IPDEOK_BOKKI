
/* ========================================
   입덕볶이 - 공통 회원 관리 기능

   수업용 프로토타입
   localStorage 기반 가상 회원 시스템
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
  //
  // 비밀번호 원문은 저장하지 않음
  // 실제 서비스의 보안 인증 방식은 아님
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


    // 필수 입력 확인

    if (!id) {

      throw new Error('아이디를 입력해 주세요.');

    }

    if (!password) {

      throw new Error('비밀번호를 입력해 주세요.');

    }

    if (!nickname) {

      throw new Error('닉네임을 입력해 주세요.');

    }


    // 기존 회원 확인

    if (getUsers().some(user => user.id === id)) {

      throw new Error('이미 가입된 아이디입니다.');

    }


    // 비밀번호 원문 대신 해시 생성

    const salt = createSalt();

    const passwordHash = await hashPassword(

      password,

      salt

    );


    // 회원 정보 생성

    const newUser = {

      id: id,

      nickname: nickname.slice(0, 20),

      salt: salt,

      passwordHash: passwordHash,

      createdAt: new Date().toISOString()

    };


    // 저장할 회원 목록

    const users = getUsers();

    if (users.some(user => user.id === id)) {

      throw new Error('이미 가입된 아이디입니다.');

    }

    users.push(newUser);


    // localStorage에 회원 정보 저장

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
  // 로그인 상태 확인
  // ========================================

  function isLoggedIn() {

    return current() !== null;

  }


  // ========================================
  // 기존 페이지의 로그인 기능과 호환
  //
  // 기존 order.js 및 햄버거 메뉴에서
  // 사용하던 로그인 정보와 연결
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
  // 로그인한 사용자 정보 저장
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


    // 입력 확인

    if (!id || !password) {

      throw new Error(

        '아이디와 비밀번호를 입력해 주세요.'

      );

    }


    // 가입된 회원 확인

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


    // 로그인 상태 저장

    return saveLogin({

      id: user.id,

      nickname: user.nickname,

      provider: '일반 로그인'

    });

  }


  // ========================================
  // 카카오 / 구글 / 애플 테스트 로그인
  //
  // 실제 외부 서비스와 연결하지 않음
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


  // 브라우저 뒤로가기 시 로그인 상태 확인

  window.addEventListener(

    'pageshow',

    notify

  );


  // 다른 브라우저 탭에서 로그인하거나
  // 로그아웃했을 경우 상태 반영

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

  const auth = window.IpAuth;

  if (!auth) return;

  const root = new URL('.', document.currentScript.src);

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


    // 기존 사용자 프로필 갱신

    document.querySelectorAll('.user-profile')
      .forEach(profile => {

        profile.hidden = !user;

        const name = profile.querySelector('.profile-name');

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

    const link = event.target.closest('.side-menu-nav a');

    if (!link) return;

    if (!getAuthLinks().includes(link)) return;

    if (!auth.isLoggedIn()) return;


    // 기존 로그아웃 코드 실행 방지

    event.preventDefault();

    event.stopImmediatePropagation();


    // 로그아웃 확인

    if (!confirm('로그아웃 하시겠습니까?')) return;


    try {

      // 새로운 로그인 정보 삭제

      auth.logout();


      // 기존 임시 로그인 정보도 삭제

      sessionStorage.removeItem('demoLogin');

      sessionStorage.removeItem('demoUsername');


      // 화면 업데이트

      refreshAuthUI();

      alert('로그아웃 되었습니다.');

    } catch (error) {

      alert('로그아웃에 실패했습니다.');

    }

  }, true);


  // ========================================
  // 페이지 실행 시 로그인 상태 확인
  // ========================================

  if (document.readyState === 'loading') {

    document.addEventListener(
      'DOMContentLoaded',
      refreshAuthUI
    );

  } else {

    refreshAuthUI();

  }


  // 로그인 상태가 변경되면 화면 갱신

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
