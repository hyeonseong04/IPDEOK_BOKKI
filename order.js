
/* ========================================
   입덕볶이 - 공통 장바구니 기능
======================================== */

(() => {

  'use strict';

  const root = new URL('.', document.currentScript.src);

  const url = path => new URL(path, root).href;


  // ========================================
  // 전체 메뉴 정보
  // ========================================

  const catalog = {

    signature: {
      name: '입덕 시그니처 떡볶이',
      price: 9900,
      image: 'SUB/detail/img/시그니쳐.png',
      description: '쫄깃한 밀떡과 매콤달콤한 특제 소스'
    },

    cheese: {
      name: '치즈폭탄 떡볶이',
      price: 11900,
      image: 'SUB/detail/img/치즈폭탄.png',
      description: '매콤한 떡볶이에 모짜렐라 치즈 듬뿍'
    },

    rose: {
      name: '로제 떡볶이',
      price: 11500,
      image: 'SUB/detail/img/로제.png',
      description: '부드럽고 꾸덕한 매콤 로제 떡볶이'
    },

    crispy: {
      name: '바삭토핑 떡볶이',
      price: 12500,
      image: 'SUB/detail/img/바삭토핑.png',
      description: '바삭한 튀김 토핑과 매콤한 떡볶이'
    },

    gimmari: {
      name: '바삭 김말이',
      price: 2500,
      image: 'SUB/list/img/05_바삭_김말이.png',
      description: '바삭한 튀김옷 속 쫄깃한 당면',
      side: true
    },

    dumpling: {
      name: '바삭 군만두',
      price: 3000,
      image: 'SUB/list/img/06_바삭_군만두.png',
      description: '노릇노릇 바삭하게 튀겨낸 군만두',
      side: true
    },

    shrimp: {
      name: '통새우 튀김',
      price: 3500,
      image: 'SUB/list/img/07_통새우_튀김.png',
      description: '바삭한 튀김옷과 탱글한 통새우',
      side: true
    },

    assorted: {
      name: '모둠 튀김',
      price: 5500,
      image: 'SUB/list/img/08_모둠_튀김.png',
      description: '다양한 튀김을 한 번에 즐기는 메뉴',
      side: true
    }

  };


  // ========================================
  // 추가 토핑 정보
  // ========================================

  const toppings = [

    {
      name: '모짜렐라 치즈 추가',
      price: 2000
    },

    {
      name: '계란 추가',
      price: 1000
    },

    {
      name: '소시지 추가',
      price: 1500
    },

    {
      name: '어묵 추가',
      price: 1000
    }

  ];


  // ========================================
  // 장바구니 및 결제 저장 이름
  // ========================================

  const KEY = 'ipdeokCartV1';

  const RECEIPT = 'ipdeokReceiptV1';


  // 가격 표시 형식

  const money = n =>
    n.toLocaleString('ko-KR') + '원';


  // ========================================
  // 주문 데이터 정리
  // ========================================

  function normalize(row) {

    if (!row || !Object.hasOwn(catalog, row.menu)) {

      return null;

    }

    const quantity = Number(row.quantity);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {

      return null;

    }

    const side = catalog[row.menu].side;

    const spicy = side
      ? ''
      : ['순한맛', '보통맛', '매운맛'].includes(row.spicy)
        ? row.spicy
        : '순한맛';

    const selected = side
      ? []
      : [...new Set(

          (Array.isArray(row.toppings)
            ? row.toppings
            : [])

            .map(Number)

            .filter(i =>
              Number.isInteger(i) &&
              i >= 0 &&
              i < toppings.length
            )

        )].sort((a, b) => a - b);

    return {

      menu: row.menu,
      spicy: spicy,
      toppings: selected,
      quantity: quantity

    };

  }


  // ========================================
  // 같은 메뉴 및 옵션 구분
  // ========================================

  const rowKey = row => [

    row.menu,
    row.spicy,
    row.toppings.join(',')

  ].join('|');


  // ========================================
  // 가격 계산
  // ========================================

  const unit = row => {

    return catalog[row.menu].price +

      row.toppings.reduce((sum, i) => {

        return sum + toppings[i].price;

      }, 0);

  };


  const total = rows => {

    return rows.reduce((sum, row) => {

      return sum + unit(row) * row.quantity;

    }, 0);

  };


  // ========================================
  // 선택 옵션 표시
  // ========================================

  const options = row => {

    return [

      row.spicy,

      ...row.toppings.map(i => toppings[i].name)

    ].filter(Boolean).join(' · ')

      || (catalog[row.menu].side
        ? '사이드 메뉴'
        : '기본 옵션');

  };


  // ========================================
  // 저장된 장바구니 불러오기
  // ========================================

  function read() {

    try {

      const rows = JSON.parse(

        localStorage.getItem(KEY) || '[]'

      );

      return Array.isArray(rows)

        ? rows.map(normalize).filter(Boolean)

        : [];

    } catch {

      return [];

    }

  }


  // ========================================
  // 장바구니 저장
  // ========================================

  function write(rows) {

    try {

      localStorage.setItem(

        KEY,

        JSON.stringify(

          rows.map(normalize).filter(Boolean)

        )

      );

      window.dispatchEvent(

        new Event('ipdeok-cart')

      );

      return true;

    } catch {

      alert(
        '장바구니 저장이 불가능합니다. ' +
        'Live Server에서 실행해 주세요.'
      );

      return false;

    }

  }


  // ========================================
  // 장바구니에 메뉴 추가
  // ========================================

  function add(row) {

    row = normalize(row);

    if (!row) return false;

    const rows = read();

    const old = rows.find(x =>

      rowKey(x) === rowKey(row)

    );


    // 같은 메뉴와 옵션이면 수량만 증가

    if (old) {

      if (old.quantity + row.quantity > 99) {

        alert(
          '같은 옵션의 메뉴는 최대 99개까지 담을 수 있어요.'
        );

        return false;

      }

      old.quantity += row.quantity;

    } else {

      // 다른 메뉴라면 새 항목으로 추가

      rows.push(row);

    }

    return write(rows);

  }


  // ========================================
  // 결제 완료 정보 저장
  // ========================================

  function checkout(rows, discount, method) {

    try {

      sessionStorage.setItem(

        RECEIPT,

        JSON.stringify({

          rows: rows,
          discount: discount,
          method: method,

          number:
            'RE-' + Date.now().toString().slice(-8),

          date:
            new Date().toISOString()

        })

      );


      // 결제 완료 후 장바구니 비우기

      if (!write([])) {

        sessionStorage.removeItem(RECEIPT);

        return false;

      }

      return true;

    } catch {

      alert('주문 내역을 저장하지 못했습니다.');

      return false;

    }

  }


  // ========================================
  // 결제완료 정보 불러오기
  // ========================================

  function receipt() {

    try {

      const r = JSON.parse(

        sessionStorage.getItem(RECEIPT) || 'null'

      );

      if (!r || !Array.isArray(r.rows)) {

        return null;

      }

      r.rows = r.rows

        .map(normalize)

        .filter(Boolean);

      if (!r.rows.length) {

        return null;

      }

      r.discount = Math.min(

        total(r.rows),

        Math.max(0, Number(r.discount) || 0)

      );

      return r;

    } catch {

      return null;

    }

  }


  // ========================================
  // HTML 요소 생성
  // ========================================

  function el(tag, cls, text) {

    const node = document.createElement(tag);

    if (cls) {

      node.className = cls;

    }

    if (text !== undefined) {

      node.textContent = text;

    }

    return node;

  }


  // Lucide 아이콘 실행

  function icons() {

    if (window.lucide) {

      window.lucide.createIcons();

    }

  }


  // ========================================
  // 장바구니 메뉴 화면 표시
  // ========================================

  function renderRows(target, rows, editable = false) {

    target.replaceChildren();

    rows.forEach((row) => {

      const card = el('article', 'cart-item');

      const top = el('div', 'cart-item-top');

      const img = el('img', 'cart-image');

      img.src = url(catalog[row.menu].image);

      img.alt = catalog[row.menu].name;

      img.addEventListener('error', () => {

        img.style.visibility = 'hidden';

      }, { once: true });


      // 메뉴 정보

      const info = el('div', 'cart-info');

      info.append(

        el('h3', '', catalog[row.menu].name),

        el('p', 'cart-options', options(row)),

        el('p', 'cart-unit', money(unit(row)) + ' / 개')

      );

      top.append(img, info);


      // ========================================
      // 메뉴 삭제
      // ========================================

      if (editable) {

        const del = el('button', 'cart-remove', '×');

        del.type = 'button';

        del.setAttribute(

          'aria-label',

          catalog[row.menu].name + ' 삭제'

        );

        del.onclick = () => {

          const next = read();

          const pos = next.findIndex(x =>

            rowKey(x) === rowKey(row)

          );

          if (pos >= 0) {

            next.splice(pos, 1);

            write(next);

          }

        };

        top.append(del);

      }


      // ========================================
      // 수량 변경
      // ========================================

      const bottom = el('div', 'cart-item-bottom');

      if (editable) {

        const step = el('div', 'cart-step');

        [-1, 0, 1].forEach(delta => {

          if (!delta) {

            step.append(

              el('span', '', String(row.quantity))

            );

            return;

          }

          const btn = el(

            'button',

            '',

            delta === -1 ? '−' : '+'

          );

          btn.type = 'button';

          btn.disabled = delta === -1

            ? row.quantity <= 1

            : row.quantity >= 99;

          btn.setAttribute(

            'aria-label',

            catalog[row.menu].name +

            (delta === -1
              ? ' 수량 감소'
              : ' 수량 증가')

          );

          btn.onclick = () => {

            const next = read();

            const item = next.find(x =>

              rowKey(x) === rowKey(row)

            );

            if (item) {

              item.quantity = Math.max(

                1,

                Math.min(99, item.quantity + delta)

              );

              write(next);

            }

          };

          step.append(btn);

        });

        bottom.append(step);

      } else {

        bottom.append(

          el(

            'span',

            'cart-options',

            '수량 ' + row.quantity + '개'

          )

        );

      }


      // 메뉴별 주문금액

      bottom.append(

        el(

          'strong',

          'cart-line-price',

          money(unit(row) * row.quantity)

        )

      );

      card.append(top, bottom);

      target.append(card);

    });

  }


  // ========================================
  // 헤더 장바구니 아이콘 추가
  // ========================================

  function mountCartLink() {

    const header = document.querySelector('.header');

    if (
      !header ||
      document.querySelector('.ip-cart-link')
    ) {

      return;

    }

    const a = el('a', 'ip-cart-link');

    a.href = url('SUB/cart/cart.html');

    a.setAttribute('aria-label', '장바구니');

    a.innerHTML = `

      <i data-lucide="shopping-cart"></i>

      <span class="ip-cart-count">0</span>

    `;

    header.append(a);


    // 장바구니에 담긴 수량 표시

    const refresh = () => {

      const n = read().reduce(

        (sum, row) => sum + row.quantity,

        0

      );

      a.querySelector('span').textContent = n;

      a.querySelector('span').hidden = n === 0;

      a.setAttribute(

        'aria-label',

        '장바구니 ' + n + '개'

      );

    };

    refresh();

    window.addEventListener('ipdeok-cart', refresh);

    window.addEventListener('pageshow', refresh);

    window.addEventListener('storage', refresh);

    icons();

  }


  // ========================================
  // 로그인 사용자 프로필
  // ========================================

  function mountProfile() {

    const nav = document.querySelector('.side-menu-nav');

    if (
      !nav ||
      nav.dataset.authReady === 'true' ||
      document.querySelector('.user-profile')
    ) {

      return;

    }

    const a = [...nav.querySelectorAll('a')]

      .find(x =>

        x.textContent.replace(/\s/g, '') ===

        '로그인/회원가입'

      );

    if (!a) return;

    nav.dataset.authReady = 'true';

    const old = a.getAttribute('href');

    const p = el('div', 'user-profile');

    p.innerHTML = `

      <div class="profile-icon">

        <i data-lucide="user-round"></i>

      </div>

      <div class="profile-info">

        <p class="profile-name"></p>

        <p class="profile-message">
          오늘도 환영해요!
        </p>

      </div>

    `;

    nav.before(p);


    // 로그인 상태 확인

    const logged = () => {

      try {

        return sessionStorage.getItem('demoLogin')
          === 'true';

      } catch {

        return false;

      }

    };


    // 사용자 프로필 업데이트

    const refresh = () => {

      const yes = logged();

      p.hidden = !yes;

      p.querySelector('.profile-name').textContent = yes

        ? (sessionStorage.getItem('demoUsername')
          || '입덕이') + '님'

        : '';

      a.textContent = yes

        ? '로그아웃'

        : '로그인 / 회원가입';

      a.href = yes ? '#' : old;

      a.classList.toggle('logout-link', yes);

      icons();

    };


    // 로그아웃

    a.addEventListener('click', e => {

      if (!logged()) return;

      e.preventDefault();

      e.stopImmediatePropagation();

      if (confirm('로그아웃 하시겠습니까?')) {

        sessionStorage.removeItem('demoLogin');

        sessionStorage.removeItem('demoUsername');

        refresh();

        alert('로그아웃 되었습니다.');

      }

    }, true);

    refresh();

    window.addEventListener('pageshow', refresh);

  }


  // ========================================
  // 신규 페이지 햄버거 메뉴
  // ========================================

  function mountNewMenu() {

    const layer =
      document.querySelector('.order-menu-layer');

    if (!layer) return;

    const btn = document.querySelector('#menuBtn');

    const close = layer.querySelector('.close-btn');

    const overlay = layer.querySelector('.menu-overlay');

    const page = document.querySelector('.order-shell');


    // 메뉴 열기 및 닫기

    const toggle = show => {

      layer.classList.toggle('active', show);

      layer.inert = !show;

      layer.setAttribute(

        'aria-hidden',

        String(!show)

      );

      btn.setAttribute(

        'aria-expanded',

        String(show)

      );

      document.body.classList.toggle(

        'order-menu-open',

        show

      );

      if (page) {

        page.inert = show;

      }

      (show ? close : btn).focus({

        preventScroll: true

      });

    };

    btn.onclick = () => toggle(true);

    close.onclick = () => toggle(false);

    overlay.onclick = () => toggle(false);


    // 키보드 처리

    document.addEventListener('keydown', e => {

      if (!layer.classList.contains('active')) return;

      if (e.key === 'Escape') {

        toggle(false);

      }

      if (e.key === 'Tab') {

        const links = layer.querySelectorAll('a');

        const last = links[links.length - 1];

        if (e.shiftKey && document.activeElement === close) {

          e.preventDefault();

          last.focus();

        } else if (

          !e.shiftKey &&

          document.activeElement === last

        ) {

          e.preventDefault();

          close.focus();

        }

      }

    });

    window.addEventListener('pageshow', () => {

      if (layer.classList.contains('active')) {

        toggle(false);

      }

    });

  }


  // ========================================
  // 페이지 초기 실행
  // ========================================

  function init() {

    mountCartLink();

    mountProfile();

    mountNewMenu();


    // 튀김 상세페이지 연결

    if (

      document.body.dataset.orderPage === 'list' ||

      location.pathname.endsWith('/list/list.html')

    ) {

      document.addEventListener('click', e => {

        const card = e.target.closest('.side-item');

        if (
          !card ||
          !catalog[card.dataset.menu]?.side
        ) {

          return;

        }

        e.preventDefault();

        e.stopImmediatePropagation();

        location.href = url(

          'SUB/detail/detail.html?menu=' +

          encodeURIComponent(card.dataset.menu)

        );

      }, true);

    }

  }


  // ========================================
  // 다른 페이지에서 사용할 공통 기능
  // ========================================

  window.IpOrder = {

    catalog,
    toppings,
    url,
    money,
    read,
    write,
    add,
    unit,
    total,
    options,
    renderRows,
    checkout,
    receipt,
    rowKey

  };


  // 페이지가 로딩되면 실행

  if (document.readyState === 'loading') {

    document.addEventListener(

      'DOMContentLoaded',

      init

    );

  } else {

    init();

  }

})();
