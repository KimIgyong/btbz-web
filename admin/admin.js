/* BTBZ Admin SPA — 정적 파일, /api 백엔드 호출 */
'use strict';

var API = '/api';

// ---------- 상태 ----------
function token() { return sessionStorage.getItem('btbz-admin-token'); }
function whoami() { return sessionStorage.getItem('btbz-admin-email') || ''; }

// ---------- 공통 fetch ----------
function api(path, opts) {
  opts = opts || {};
  opts.headers = Object.assign(
    { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
    opts.headers || {}
  );
  return fetch(API + path, opts).then(function (res) {
    if (res.status === 401) { logout(); throw new Error('unauthorized'); }
    if (res.status === 403) { showChangePw(); throw new Error('must-change-password'); }
    if (!res.ok) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        var msg = body && body.message;
        throw new Error(Array.isArray(msg) ? msg.join(', ') : msg || 'HTTP ' + res.status);
      });
    }
    if (res.status === 204) return null;
    var ct = res.headers.get('content-type') || '';
    return ct.indexOf('json') >= 0 ? res.json() : res.text();
  });
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function fmtDate(d) {
  if (!d) return '';
  var t = new Date(d);
  if (isNaN(t)) return esc(String(d));
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate()) +
    ' ' + p(t.getHours()) + ':' + p(t.getMinutes());
}

// ---------- 화면 전환 ----------
function show(id) {
  document.getElementById('view-login').style.display = id === 'login' ? '' : 'none';
  document.getElementById('view-changepw').style.display = id === 'changepw' ? '' : 'none';
  document.getElementById('view-main').classList.toggle('on', id === 'main');
}
function showChangePw() { show('changepw'); }
function logout() {
  sessionStorage.removeItem('btbz-admin-token');
  sessionStorage.removeItem('btbz-admin-email');
  show('login');
}

// ---------- 로그인 ----------
document.getElementById('login-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var msg = document.getElementById('lg-msg');
  msg.className = 'msg';
  msg.textContent = '';
  fetch(API + '/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: document.getElementById('lg-email').value.trim(),
      password: document.getElementById('lg-pw').value
    })
  }).then(function (res) {
    if (!res.ok) return res.json().catch(function () { return {}; }).then(function (b) {
      throw new Error(b.message || '로그인 실패 (' + res.status + ')');
    });
    return res.json();
  }).then(function (data) {
    sessionStorage.setItem('btbz-admin-token', data.token);
    sessionStorage.setItem('btbz-admin-email', data.email);
    document.getElementById('lg-pw').value = '';
    if (data.mustChangePassword) { show('changepw'); }
    else { enterMain(); }
  }).catch(function (err) {
    msg.className = 'msg err';
    msg.textContent = err.message;
  });
});

// ---------- 비밀번호 변경 ----------
document.getElementById('changepw-form').addEventListener('submit', function (e) {
  e.preventDefault();
  var msg = document.getElementById('cp-msg');
  msg.className = 'msg';
  api('/admin/change-password', {
    method: 'POST',
    body: JSON.stringify({
      currentPassword: document.getElementById('cp-cur').value,
      newPassword: document.getElementById('cp-new').value
    })
  }).then(function () {
    document.getElementById('cp-cur').value = '';
    document.getElementById('cp-new').value = '';
    enterMain();
  }).catch(function (err) {
    if (err.message === 'must-change-password') return;
    msg.className = 'msg err';
    msg.textContent = err.message;
  });
});

// ---------- 라우팅 ----------
var routes = { stats: renderStats, subscribers: renderSubscribers, inquiries: renderInquiries,
               reviews: renderReviews, users: renderUsers };

function currentRoute() {
  var h = (location.hash || '#stats').slice(1);
  return routes[h] ? h : 'stats';
}
function enterMain() {
  document.getElementById('who').textContent = whoami();
  show('main');
  navigate();
}
function navigate() {
  if (!token()) return;
  var route = currentRoute();
  var items = document.querySelectorAll('nav a.item');
  for (var i = 0; i < items.length; i++) {
    items[i].classList.toggle('active', items[i].getAttribute('href') === '#' + route);
  }
  var main = document.getElementById('main');
  main.innerHTML = '<div class="empty">불러오는 중…</div>';
  routes[route](main).catch(function (err) {
    if (err.message === 'unauthorized' || err.message === 'must-change-password') return;
    main.innerHTML = '<div class="empty">오류: ' + esc(err.message) + '</div>';
  });
}
window.addEventListener('hashchange', navigate);

// ---------- ① 다운로드 통계 ----------
function renderStats(main) {
  return Promise.all([
    api('/admin/stats/summary'),
    api('/admin/stats/events?page=1'),
    api('/admin/stats/views?page=1')
  ]).then(function (r) {
    var s = r[0], ev = r[1], pv = r[2];
    var html =
      '<h2>다운로드 통계</h2>' +
      '<div class="cards">' +
      stat(s.totals.today, '오늘') + stat(s.totals.last7d, '최근 7일') +
      stat(s.totals.last30d, '최근 30일') + stat(s.totals.all, '누적 다운로드') +
      stat(s.totals.pageViewsAll, '다운로드 페이지뷰') +
      '</div>' +
      '<h3 class="sec">플랫폼별 / 버전별</h3>' +
      '<div class="tbl-wrap"><table><tr><th>플랫폼</th><th>건수</th><th></th><th>버전</th><th>건수</th></tr>' +
      zipRows(s.byPlatform, s.byVersion) + '</table></div>' +
      '<h3 class="sec">일별 다운로드 (최근 30일, KST)</h3>' +
      '<div class="tbl-wrap"><table><tr><th>날짜</th><th>건수</th></tr>' +
      (s.daily.length ? s.daily.map(function (d) {
        return '<tr><td>' + esc(d.date) + '</td><td>' + d.count + '</td></tr>';
      }).join('') : '<tr><td colspan="2" class="empty">데이터 없음</td></tr>') +
      '</table></div>' +
      '<h3 class="sec">다운로드 원본 로그 <span class="badge">' + ev.total + '건</span></h3>' +
      pagedTable('ev', ev, ['시각', '파일', '플랫폼', '버전', 'IP', 'User-Agent'], function (e2) {
        return '<tr><td>' + fmtDate(e2.createdAt) + '</td><td>' + esc(e2.file) + '</td><td>' +
          esc(e2.platform) + '</td><td>' + esc(e2.version) + '</td><td>' + esc(e2.ip) +
          '</td><td class="wrap">' + esc(e2.userAgent) + '</td></tr>';
      }) +
      '<h3 class="sec">다운로드 페이지 접속 로그 <span class="badge">' + pv.total + '건</span></h3>' +
      pagedTable('pv', pv, ['시각', 'IP', 'User-Agent'], function (v) {
        return '<tr><td>' + fmtDate(v.createdAt) + '</td><td>' + esc(v.ip) +
          '</td><td class="wrap">' + esc(v.userAgent) + '</td></tr>';
      });
    main.innerHTML = html;
    bindPager('ev', '/admin/stats/events', ['시각', '파일', '플랫폼', '버전', 'IP', 'User-Agent']);
    bindPager('pv', '/admin/stats/views', ['시각', 'IP', 'User-Agent']);
  });

  function stat(n, label) {
    return '<div class="stat"><div class="n">' + n + '</div><div class="l">' + label + '</div></div>';
  }
  function zipRows(a, b) {
    var rows = '';
    var len = Math.max(a.length, b.length, 1);
    for (var i = 0; i < len; i++) {
      rows += '<tr><td>' + (a[i] ? esc(a[i].platform) : '') + '</td><td>' + (a[i] ? a[i].count : '') +
        '</td><td></td><td>' + (b[i] ? esc(b[i].version) : '') + '</td><td>' + (b[i] ? b[i].count : '') + '</td></tr>';
    }
    return rows;
  }
}

// 페이지네이션 테이블 (통계 로그용)
var pagerState = {};
function pagedTable(key, data, headers, rowFn) {
  pagerState[key] = { page: 1, rowFn: rowFn, pageSize: 50 };
  return '<div class="tbl-wrap"><table id="tbl-' + key + '"><tr><th>' + headers.join('</th><th>') +
    '</th></tr>' + tableRows(data.items, rowFn, headers.length) + '</table></div>' +
    '<div class="pager" id="pager-' + key + '">' +
    '<button class="small" data-dir="-1">← 이전</button><span id="pginfo-' + key + '"></span>' +
    '<button class="small" data-dir="1">다음 →</button></div>';
}
function tableRows(items, rowFn, cols) {
  return items.length ? items.map(rowFn).join('')
    : '<tr><td colspan="' + cols + '" class="empty">데이터 없음</td></tr>';
}
function bindPager(key, path, headers) {
  var st = pagerState[key];
  var pager = document.getElementById('pager-' + key);
  if (!pager) return;
  function update(total) {
    var pages = Math.max(1, Math.ceil(total / st.pageSize));
    document.getElementById('pginfo-' + key).textContent = st.page + ' / ' + pages;
    pager.querySelector('[data-dir="-1"]').disabled = st.page <= 1;
    pager.querySelector('[data-dir="1"]').disabled = st.page >= pages;
  }
  api(path + '?page=1').then(function (d) { update(d.total); });
  pager.addEventListener('click', function (e) {
    var dir = e.target.getAttribute && e.target.getAttribute('data-dir');
    if (!dir || e.target.disabled) return;
    st.page += Number(dir);
    api(path + '?page=' + st.page).then(function (d) {
      var tbl = document.getElementById('tbl-' + key);
      var head = tbl.rows[0].outerHTML;
      tbl.innerHTML = head + tableRows(d.items, st.rowFn, headers.length);
      update(d.total);
    });
  });
}

// ---------- ② 이메일 구독자 ----------
function renderSubscribers(main, page, search) {
  page = page || 1;
  var q = '/admin/subscribers?page=' + page + (search ? '&search=' + encodeURIComponent(search) : '');
  return api(q).then(function (d) {
    var pages = Math.max(1, Math.ceil(d.total / 50));
    main.innerHTML =
      '<h2>이메일 구독자 <span class="badge">' + d.total + '명</span></h2>' +
      '<div class="toolbar">' +
      '<input id="sub-search" placeholder="이메일 검색" value="' + esc(search || '') + '">' +
      '<button id="sub-search-btn">검색</button><div class="spacer"></div>' +
      '<button id="sub-csv">CSV 내보내기</button></div>' +
      '<div class="tbl-wrap"><table><tr><th>#</th><th>이메일</th><th>구독일</th><th>해지일</th><th></th></tr>' +
      tableRows(d.items, function (s) {
        return '<tr><td>' + s.id + '</td><td>' + esc(s.email) + '</td><td>' + fmtDate(s.createdAt) +
          '</td><td>' + (s.unsubscribedAt ? fmtDate(s.unsubscribedAt) : '-') +
          '</td><td><button class="small danger" data-del="' + s.id + '">삭제</button></td></tr>';
      }, 5) + '</table></div>' +
      '<div class="pager"><button class="small" id="sub-prev"' + (page <= 1 ? ' disabled' : '') +
      '>← 이전</button><span>' + page + ' / ' + pages + '</span><button class="small" id="sub-next"' +
      (page >= pages ? ' disabled' : '') + '>다음 →</button></div>';

    document.getElementById('sub-search-btn').onclick = function () {
      renderSubscribers(main, 1, document.getElementById('sub-search').value.trim());
    };
    document.getElementById('sub-search').onkeydown = function (e) {
      if (e.key === 'Enter') renderSubscribers(main, 1, this.value.trim());
    };
    document.getElementById('sub-prev').onclick = function () { renderSubscribers(main, page - 1, search); };
    document.getElementById('sub-next').onclick = function () { renderSubscribers(main, page + 1, search); };
    document.getElementById('sub-csv').onclick = function () {
      api('/admin/subscribers/export.csv').then(function (csv) {
        var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'subscribers.csv';
        a.click();
        URL.revokeObjectURL(a.href);
      });
    };
    main.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.onclick = function () {
        if (!confirm('구독자를 삭제할까요?')) return;
        api('/admin/subscribers/' + btn.getAttribute('data-del'), { method: 'DELETE' })
          .then(function () { renderSubscribers(main, page, search); });
      };
    });
  });
}

// ---------- ③ 문의사항 ----------
var INQ_STATUS = { new: '신규', read: '읽음', handled: '처리완료' };
function renderInquiries(main, page) {
  page = page || 1;
  return api('/admin/inquiries?page=' + page).then(function (d) {
    var pages = Math.max(1, Math.ceil(d.total / 20));
    main.innerHTML =
      '<h2>개발자 문의사항 <span class="badge">' + d.total + '건</span></h2>' +
      '<p class="subtitle">행을 클릭하면 내용이 펼쳐집니다. 메일 발송 실패 건은 ✉️✗로 표시됩니다.</p>' +
      '<div class="tbl-wrap"><table>' +
      '<tr><th>#</th><th>상태</th><th>제목</th><th>보낸사람</th><th>메일</th><th>접수일</th><th></th></tr>' +
      tableRows(d.items, function (i) {
        return '<tr class="inq-row" data-id="' + i.id + '" style="cursor:pointer">' +
          '<td>' + i.id + '</td>' +
          '<td><span class="badge ' + esc(i.status) + '">' + (INQ_STATUS[i.status] || esc(i.status)) + '</span></td>' +
          '<td class="wrap">' + esc(i.subject) + '</td>' +
          '<td>' + esc(i.senderEmail) + '</td>' +
          '<td>' + (i.mailSent ? '✉️✓' : '✉️✗') + '</td>' +
          '<td>' + fmtDate(i.createdAt) + '</td>' +
          '<td><div class="row-actions">' +
          '<button class="small" data-status="read" data-id="' + i.id + '">읽음</button>' +
          '<button class="small" data-status="handled" data-id="' + i.id + '">처리완료</button>' +
          '</div></td></tr>' +
          '<tr class="inq-body" data-for="' + i.id + '" style="display:none"><td></td>' +
          '<td colspan="6" class="wrap" style="white-space:pre-wrap">' + esc(i.body) + '</td></tr>';
      }, 7) + '</table></div>' +
      '<div class="pager"><button class="small" id="inq-prev"' + (page <= 1 ? ' disabled' : '') +
      '>← 이전</button><span>' + page + ' / ' + pages + '</span><button class="small" id="inq-next"' +
      (page >= pages ? ' disabled' : '') + '>다음 →</button></div>';

    document.getElementById('inq-prev').onclick = function () { renderInquiries(main, page - 1); };
    document.getElementById('inq-next').onclick = function () { renderInquiries(main, page + 1); };
    main.querySelectorAll('.inq-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.tagName === 'BUTTON') return;
        var body = main.querySelector('.inq-body[data-for="' + row.getAttribute('data-id') + '"]');
        body.style.display = body.style.display === 'none' ? '' : 'none';
      });
    });
    main.querySelectorAll('[data-status]').forEach(function (btn) {
      btn.onclick = function () {
        api('/admin/inquiries/' + btn.getAttribute('data-id'), {
          method: 'PATCH',
          body: JSON.stringify({ status: btn.getAttribute('data-status') })
        }).then(function () { renderInquiries(main, page); });
      };
    });
  });
}

// ---------- ④ 사용후기 ----------
var RV_STATUS = { pending: '승인대기', visible: '게시중', hidden: '숨김' };
function renderReviews(main, page, filter) {
  page = page || 1;
  return api('/admin/reviews?page=' + page + (filter ? '&status=' + filter : '')).then(function (d) {
    var pages = Math.max(1, Math.ceil(d.total / 20));
    main.innerHTML =
      '<h2>사용후기 게시판 <span class="badge">' + d.total + '건</span></h2>' +
      '<div class="toolbar"><select id="rv-filter">' +
      '<option value="">전체</option>' +
      '<option value="pending"' + (filter === 'pending' ? ' selected' : '') + '>승인대기</option>' +
      '<option value="visible"' + (filter === 'visible' ? ' selected' : '') + '>게시중</option>' +
      '<option value="hidden"' + (filter === 'hidden' ? ' selected' : '') + '>숨김</option>' +
      '</select></div>' +
      '<div class="tbl-wrap"><table>' +
      '<tr><th>#</th><th>상태</th><th>별점</th><th>닉네임</th><th>내용</th><th>IP</th><th>작성일</th><th></th></tr>' +
      tableRows(d.items, function (r) {
        return '<tr><td>' + r.id + '</td>' +
          '<td><span class="badge ' + esc(r.status) + '">' + (RV_STATUS[r.status] || esc(r.status)) + '</span></td>' +
          '<td>' + '★'.repeat(r.rating) + '</td>' +
          '<td>' + esc(r.nickname) + '</td>' +
          '<td class="wrap" style="white-space:pre-wrap">' + esc(r.content) + '</td>' +
          '<td>' + esc(r.ip) + '</td><td>' + fmtDate(r.createdAt) + '</td>' +
          '<td><div class="row-actions">' +
          (r.status !== 'visible' ? '<button class="small" data-st="visible" data-id="' + r.id + '">승인/게시</button>' : '') +
          (r.status !== 'hidden' ? '<button class="small" data-st="hidden" data-id="' + r.id + '">숨김</button>' : '') +
          '<button class="small danger" data-rm="' + r.id + '">삭제</button>' +
          '</div></td></tr>';
      }, 8) + '</table></div>' +
      '<div class="pager"><button class="small" id="rv-prev"' + (page <= 1 ? ' disabled' : '') +
      '>← 이전</button><span>' + page + ' / ' + pages + '</span><button class="small" id="rv-next"' +
      (page >= pages ? ' disabled' : '') + '>다음 →</button></div>';

    document.getElementById('rv-filter').onchange = function () {
      renderReviews(main, 1, this.value || undefined);
    };
    document.getElementById('rv-prev').onclick = function () { renderReviews(main, page - 1, filter); };
    document.getElementById('rv-next').onclick = function () { renderReviews(main, page + 1, filter); };
    main.querySelectorAll('[data-st]').forEach(function (btn) {
      btn.onclick = function () {
        api('/admin/reviews/' + btn.getAttribute('data-id'), {
          method: 'PATCH',
          body: JSON.stringify({ status: btn.getAttribute('data-st') })
        }).then(function () { renderReviews(main, page, filter); });
      };
    });
    main.querySelectorAll('[data-rm]').forEach(function (btn) {
      btn.onclick = function () {
        if (!confirm('후기를 완전히 삭제할까요?')) return;
        api('/admin/reviews/' + btn.getAttribute('data-rm'), { method: 'DELETE' })
          .then(function () { renderReviews(main, page, filter); });
      };
    });
  });
}

// ---------- ⑤ 관리자 관리 ----------
function renderUsers(main) {
  return api('/admin/users').then(function (users) {
    main.innerHTML =
      '<h2>관리자 관리 <span class="badge">' + users.length + '명</span></h2>' +
      '<div class="toolbar"><div class="spacer"></div>' +
      '<button class="primary" id="au-add">+ 관리자 추가</button></div>' +
      '<div class="tbl-wrap"><table>' +
      '<tr><th>#</th><th>이메일</th><th>비밀번호 상태</th><th>등록일</th><th></th></tr>' +
      tableRows(users, function (u) {
        var isSelf = u.email === whoami();
        return '<tr><td>' + u.id + '</td>' +
          '<td>' + esc(u.email) + (isSelf ? ' <span class="badge ok">본인</span>' : '') + '</td>' +
          '<td>' + (u.mustChangePassword ? '<span class="badge pending">변경 대기</span>'
                                          : '<span class="badge ok">설정 완료</span>') + '</td>' +
          '<td>' + fmtDate(u.createdAt) + '</td>' +
          '<td><div class="row-actions">' +
          '<button class="small" data-edit="' + u.id + '" data-email="' + esc(u.email) + '">이메일 수정</button>' +
          '<button class="small" data-temp="' + u.id + '">임시비번 부여</button>' +
          (isSelf ? '' : '<button class="small danger" data-del="' + u.id + '">삭제</button>') +
          '</div></td></tr>';
      }, 5) + '</table></div>' +
      '<dialog id="au-dialog"></dialog>';

    var dlg = document.getElementById('au-dialog');

    document.getElementById('au-add').onclick = function () {
      dlg.innerHTML = '<h3>관리자 추가</h3>' +
        '<label>이메일</label><input id="au-email" type="email">' +
        '<div class="msg err" id="au-msg"></div>' +
        '<div class="actions"><button onclick="document.getElementById(\'au-dialog\').close()">취소</button>' +
        '<button class="primary" id="au-save">추가</button></div>';
      dlg.showModal();
      document.getElementById('au-save').onclick = function () {
        api('/admin/users', {
          method: 'POST',
          body: JSON.stringify({ email: document.getElementById('au-email').value.trim() })
        }).then(function (r) { showTempPw(dlg, r, '관리자가 추가되었습니다.'); })
          .catch(function (err) { document.getElementById('au-msg').textContent = err.message; });
      };
    };

    main.querySelectorAll('[data-edit]').forEach(function (btn) {
      btn.onclick = function () {
        dlg.innerHTML = '<h3>이메일 수정</h3>' +
          '<label>이메일</label><input id="au-email" type="email" value="' + btn.getAttribute('data-email') + '">' +
          '<div class="msg err" id="au-msg"></div>' +
          '<div class="actions"><button onclick="document.getElementById(\'au-dialog\').close()">취소</button>' +
          '<button class="primary" id="au-save">저장</button></div>';
        dlg.showModal();
        document.getElementById('au-save').onclick = function () {
          api('/admin/users/' + btn.getAttribute('data-edit'), {
            method: 'PATCH',
            body: JSON.stringify({ email: document.getElementById('au-email').value.trim() })
          }).then(function () { dlg.close(); renderUsers(main); })
            .catch(function (err) { document.getElementById('au-msg').textContent = err.message; });
        };
      };
    });

    main.querySelectorAll('[data-temp]').forEach(function (btn) {
      btn.onclick = function () {
        if (!confirm('임시 비밀번호를 새로 발급할까요? 기존 비밀번호는 즉시 무효화됩니다.')) return;
        api('/admin/users/' + btn.getAttribute('data-temp') + '/temp-password', { method: 'POST' })
          .then(function (r) {
            dlg.innerHTML = '';
            dlg.showModal();
            showTempPw(dlg, r, '임시 비밀번호가 발급되었습니다.');
          });
      };
    });

    main.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.onclick = function () {
        if (!confirm('관리자 계정을 삭제할까요?')) return;
        api('/admin/users/' + btn.getAttribute('data-del'), { method: 'DELETE' })
          .then(function () { renderUsers(main); })
          .catch(function (err) { alert(err.message); });
      };
    });

    function showTempPw(dialog, r, title) {
      dialog.innerHTML = '<h3>' + title + '</h3>' +
        '<p style="font-size:.85rem;color:var(--muted)">' + esc(r.user.email) +
        ' 의 임시 비밀번호입니다. <strong>지금 한 번만 표시됩니다</strong> — 안전한 경로로 전달하세요.<br>' +
        '해당 계정은 첫 로그인 시 비밀번호 변경이 강제됩니다.</p>' +
        '<div class="temp-pw">' + esc(r.tempPassword) + '</div>' +
        '<div class="actions"><button class="primary" id="au-done">확인</button></div>';
      document.getElementById('au-done').onclick = function () { dialog.close(); renderUsers(main); };
    }
  });
}

// ---------- 부팅 ----------
if (token()) { enterMain(); } else { show('login'); }
