(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const rooms = window.hotelRooms;
  const roomTypes = window.hotelRoomTypes;
  const dateIn = $('#check-in');
  const dateOut = $('#check-out');
  const guestCount = $('#guest-count');
  const dialog = $('#room-dialog');
  const storageKey = 'grand-saigon-html-v1';
  const sessionKey = 'starystal-tab-session';
  const formatMoney = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
  const dayLength = 86_400_000;
  const depositRate = 0.2;
  const roomLabels = { EMPTY: 'Trống', OCCUPIED: 'Đang có khách', NEEDS_CLEANING: 'Cần dọn', CLEANING: 'Đang dọn', MAINTENANCE: 'Bảo trì' };
  const cleaningOptions = { NEEDS_CLEANING: 'Cần dọn', CLEANING: 'Đang dọn', EMPTY: 'Đã dọn' };
  const bookingLabels = { PENDING: 'Chờ nhận phòng', CHECKED_IN: 'Đang lưu trú', CHECKED_OUT: 'Đã trả phòng', CANCELED: 'Đã hủy' };
  const sectionLabels = { overview: 'Tổng quan', rooms: 'Sơ đồ phòng', bookings: 'Đặt phòng', housekeeping: 'Buồng phòng', assignments: 'Phân công vệ sinh', reports: 'Báo cáo', staff: 'Nhân sự', settings: 'Cài đặt' };
  const housekeepers = { linh: 'Nguyễn Thảo Linh', hoa: 'Trần Ngọc Hoa' };
  const roles = {
    guest: { title: 'Guest', name: 'Khách lưu trú', description: 'Xem phòng, đặt phòng và tra cứu đơn của bạn.' },
    manager: { title: 'Manager', name: 'Quản lý', description: 'Phân công vệ sinh, theo dõi vận hành và xem báo cáo.', sections: ['overview', 'rooms', 'bookings', 'housekeeping', 'assignments', 'reports'] },
    receptionist: { title: 'Receptionist', name: 'Tiếp tân', description: 'Quản lý đặt phòng, nhận phòng và trả phòng cho khách.', sections: ['bookings', 'rooms'] },
    housekeeping: { title: 'Housekeeping', name: 'Nhân viên vệ sinh', description: 'Nhận thông báo và cập nhật những phòng được phân công.', sections: ['housekeeping', 'rooms'] },
    owner: { title: 'Owner / Admin', name: 'Chủ khách sạn', description: 'Quản lý vận hành, nhân sự và cấu hình.', sections: Object.keys(sectionLabels) },
  };

  function dateInput(offset = 0) {
    const vietnamOffset = 7 * 60 * 60 * 1000;
    return new Date(Date.now() + vietnamOffset + offset * dayLength).toISOString().slice(0, 10);
  }

  function displayDate(date) {
    return date.split('-').reverse().join('/');
  }

  function escape(value) {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, (character) => entities[character]);
  }

  const occupiedRoom = rooms.find((room) => room.roomNumber === '104');
  const pendingRoom = rooms.find((room) => room.roomNumber === '103');
  const defaults = {
    storageVersion: 4,
    signedIn: false,
    adminRole: null,
    housekeeperId: null,
    roomStatus: {},
    cleaningNotes: {},
    assignments: Object.fromEntries(rooms.map((room) => [room.id, room.floor <= 3 ? 'linh' : 'hoa'])),
    settings: { name: 'Starystal Hotel', checkIn: '14:00', checkOut: '12:00' },
    bookings: [
      { code: 'GS-OP102', roomId: occupiedRoom.id, checkIn: dateInput(-1), checkOut: dateInput(1), guests: 2, total: roomTypes[occupiedRoom.typeId].price * 2, status: 'CHECKED_IN', guestName: 'Trần Minh Anh' },
      { code: 'GS-OP108', roomId: pendingRoom.id, checkIn: dateInput(2), checkOut: dateInput(4), guests: 2, total: roomTypes[pendingRoom.typeId].price * 2, status: 'PENDING', guestName: 'Nguyễn Hoài Nam' },
    ],
  };

  function readStorage(storage, key) {
    try { return JSON.parse(window[storage].getItem(key)); } catch { return null; }
  }

  function restoreState(saved) {
    const restored = { ...structuredClone(defaults), ...saved, storageVersion: defaults.storageVersion };
    restored.settings = { ...defaults.settings, ...saved?.settings };
    if (restored.settings.name === 'Grand Saigon Hotel') restored.settings.name = defaults.settings.name;
    const previousVersion = saved?.storageVersion ?? 1;
    if (previousVersion < 4) {
      restored.roomStatus = Object.fromEntries(Object.entries(restored.roomStatus).map(([id, status]) => {
        if (status === 'AWAITING_CONFIRMATION') return [id, 'EMPTY'];
        if (previousVersion < 2 && status === 'CLEANING') return [id, 'NEEDS_CLEANING'];
        return [id, status];
      }));
      delete restored.cleaningReports;
    }
    if (restored.adminRole === 'employee') restored.adminRole = 'receptionist';
    return restored;
  }

  let state = restoreState(readStorage('localStorage', storageKey));
  Object.assign(state, readStorage('sessionStorage', sessionKey));

  let searched = false;
  let guestNotice = '';
  let operationsNotice = '';
  let selectedTypeId = null;
  let openAssignmentFloors = new Set([1]);

  function save() {
    const { signedIn: _signedIn, adminRole: _adminRole, housekeeperId: _housekeeperId, ...shared } = state;
    try { localStorage.setItem(storageKey, JSON.stringify(shared)); } catch { /* Keep this session usable. */ }
  }

  function saveSession() {
    const { signedIn, adminRole, housekeeperId } = state;
    try { sessionStorage.setItem(sessionKey, JSON.stringify({ signedIn, adminRole, housekeeperId })); } catch { /* Keep this tab usable. */ }
  }

  function refreshSharedState() {
    const shared = readStorage('localStorage', storageKey);
    if (!shared) return;
    const { signedIn, adminRole, housekeeperId } = state;
    state = { ...restoreState(shared), signedIn, adminRole, housekeeperId };
  }

  function roomStatus(room) {
    return state.roomStatus[room.id] || room.status;
  }

  function canAccess(section) {
    return roles[state.adminRole]?.sections?.includes(section) ?? false;
  }

  function hasCleaningTask(room) {
    const status = roomStatus(room);
    return status === 'NEEDS_CLEANING' || status === 'CLEANING';
  }

  function ownsCleaningTask(room) {
    return canAccess('assignments') || Boolean(state.housekeeperId && state.assignments[room.id] === state.housekeeperId);
  }

  function timeUntilCheckIn(date, now = Date.now()) {
    return Date.parse(`${date}T${state.settings.checkIn}+07:00`) - now;
  }

  function bookingDateLimits() {
    const now = Date.now();
    const tomorrow = dateInput(1);
    const lastDate = dateInput(31);
    dateIn.min = timeUntilCheckIn(tomorrow, now) >= dayLength ? tomorrow : dateInput(2);
    dateIn.max = timeUntilCheckIn(lastDate, now) <= 31 * dayLength ? lastDate : dateInput(30);
  }

  function selectedDates() {
    const checkIn = dateIn.value;
    const checkOut = dateOut.value;
    const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / dayLength;
    const leadTime = timeUntilCheckIn(checkIn);
    let error = '';
    if (!(nights >= 1 && nights <= 30)) {
      error = 'Chọn ngày trả phòng sau ngày nhận phòng. Kỳ lưu trú tối đa 30 đêm.';
    } else if (!(leadTime >= dayLength && leadTime <= 31 * dayLength)) {
      error = 'Chọn ngày nhận phòng cách hiện tại từ 24 giờ đến 31 ngày.';
    }
    return { checkIn, checkOut, nights, valid: !error, error, guests: Number(guestCount.value), requiresDeposit: leadTime >= 7 * dayLength };
  }

  function available(room, dates) {
    if (!dates.valid || roomTypes[room.typeId].capacity < dates.guests || roomStatus(room) === 'MAINTENANCE') return false;
    return !state.bookings.some((item) => item.roomId === room.id && ['PENDING', 'CHECKED_IN'].includes(item.status) && item.checkIn < dates.checkOut && item.checkOut > dates.checkIn);
  }

  function availableRooms(typeId, dates) {
    return rooms.filter((room) => room.typeId === typeId && available(room, dates));
  }

  function quoteStay(type, dates) {
    const total = type.price * dates.nights;
    const depositAmount = dates.requiresDeposit ? Math.round(total * depositRate) : 0;
    return { total, depositAmount, balance: total - depositAmount };
  }

  function renderRooms() {
    const dates = selectedDates();
    const results = Object.entries(roomTypes).map(([id, type]) => ({
      id, type,
      count: searched ? availableRooms(id, dates).length : rooms.filter((room) => room.typeId === id).length,
    })).filter(({ count }) => count > 0);
    const resultCount = results.reduce((sum, { count }) => sum + count, 0);
    const status = $('#search-status');
    status.hidden = !searched;
    $('#reset-search').hidden = !searched;
    status.textContent = dates.error || (resultCount ? `${resultCount} phòng trống thuộc ${results.length} loại phòng` : 'Không có phòng phù hợp trong khoảng ngày đã chọn.');
    $('#guest-rooms').innerHTML = results.map(({ id, type, count }) => `
      <article class="guest-room-card">
        <div class="guest-room-photo guest-room-photo--${id}"><img src="${type.image}" alt="" loading="lazy"></div>
        <div class="guest-room-body">
          <div class="room-card-heading"><h3>${escape(type.name)}</h3><span>${count} phòng${searched ? ' trống' : ''}</span></div>
          <div class="room-facts"><span>${type.bedLabel}</span><span>${type.capacity} khách</span></div>
          <div class="room-card-footer"><p><strong>${formatMoney.format(type.price)}</strong><small> / đêm</small></p><button class="text-button" type="button" data-room-type="${id}" aria-label="Xem sơ đồ ${escape(type.name.toLowerCase())}">Xem sơ đồ <span aria-hidden="true">→</span></button></div>
        </div>
      </article>`).join('');
  }

  function renderGuestAccount() {
    const reservations = state.bookings.filter((booking) => booking.isGuest);
    const notice = guestNotice ? `<p class="reservation-notice" role="status">${escape(guestNotice)}</p>` : '';
    $('#guest-account').innerHTML = !state.signedIn ? `<button class="primary-button" type="button" data-guest-action="login">Vào tài khoản Guest <span aria-hidden="true">→</span></button>` : `${notice}
      <div class="account-header"><strong>Khách trải nghiệm</strong><button class="text-button" type="button" data-guest-action="logout">Đăng xuất</button></div>
      ${reservations.length === 0 ? '<p class="guest-empty">Bạn chưa có đặt phòng nào.</p>' : reservations.map((item) => {
        const room = findRoom(item.roomId);
        const roomName = room ? roomTypes[room.typeId].name : 'Phòng lưu trú';
        return `<article class="reservation-item"><div><h3>${escape(roomName)}${room ? ` · ${room.roomNumber}` : ''}</h3><p>${escape(item.code)} · ${displayDate(item.checkIn)} – ${displayDate(item.checkOut)} · ${item.guests} khách</p><p>Tổng ${formatMoney.format(item.total)}</p><p>${paymentDetail(item)}</p></div>
        ${item.status === 'PENDING' ? `<button class="text-button" type="button" data-cancel="${escape(item.code)}">Hủy đặt phòng</button>` : `<span>${bookingLabels[item.status]}</span>`}</article>`;
      }).join('')}`;
  }

  function findRoom(id) {
    return rooms.find((room) => room.id === id);
  }

  function paymentDetail(booking) {
    if (booking.status === 'CANCELED') return '';
    if (booking.status !== 'PENDING') return 'Đã thanh toán mẫu';
    const deposit = booking.depositAmount || 0;
    const balance = formatMoney.format(booking.total - deposit);
    return deposit ? `Đã cọc mẫu ${formatMoney.format(deposit)} · Trả khi nhận phòng ${balance}` : `Trả khi nhận phòng ${balance}`;
  }

  function renderFloorPlan(typeId, type) {
    const bedName = typeId === 'single' ? 'Giường đơn' : 'Giường đôi';
    const beds = Array.from({ length: type.beds }, () => `
      <div class="plan-furniture"><div class="plan-bed" aria-hidden="true"></div><span>${bedName}</span></div>`).join('');
    const services = typeId === 'family' ? '<div class="plan-wet">Nhà vệ sinh</div><div class="plan-wet plan-shower">Phòng tắm</div>' : '<div class="plan-wet">Vệ sinh<br>và tắm</div>';
    return `<figure class="room-plan">
      <figcaption><strong>Sơ đồ bố trí</strong><span>Minh họa, không theo tỷ lệ</span></figcaption>
      <div class="plan-map plan-${typeId}">
        <div class="plan-bedroom"><p>Khu ngủ</p><div class="plan-beds">${beds}</div></div>
        <div class="plan-services">${services}</div>
        <div class="plan-entry">Cửa vào</div>
      </div>
    </figure>`;
  }

  function renderRoomDialog() {
    const type = roomTypes[selectedTypeId];
    if (!type) return;
    const dates = selectedDates();
    const roomCount = availableRooms(selectedTypeId, dates).length;
    const quote = quoteStay(type, dates);
    const bookingLabel = dates.requiresDeposit ? 'Xác nhận cọc mẫu 20%' : 'Xác nhận đặt phòng mẫu';
    const actions = roomCount ? `
      <dl class="stay-quote" aria-label="Chi phí đặt phòng">
        <div class="price-preview"><dt>${dates.nights} đêm · ${dates.guests} khách</dt><dd><strong>${formatMoney.format(quote.total)}</strong></dd></div>
        <div><dt>Đặt cọc trước</dt><dd>${quote.depositAmount ? `${formatMoney.format(quote.depositAmount)} (20%)` : 'Không cần cọc'}</dd></div>
        <div><dt>Thanh toán khi nhận phòng</dt><dd>${formatMoney.format(quote.balance)}</dd></div>
      </dl>
      <button class="primary-button" type="button" data-dialog-action="${state.signedIn ? 'book' : 'login'}">${state.signedIn ? bookingLabel : 'Vào tài khoản Guest để đặt phòng'} <span aria-hidden="true">→</span></button>` :
      `<p class="guest-empty">${dates.error || 'Loại phòng này chưa có phòng phù hợp cho số khách hoặc ngày đã chọn.'} <a href="#tim-phong" data-dialog-action="close">Đổi điều kiện tìm phòng</a></p>`;
    dialog.innerHTML = `<div class="room-dialog-body">
      <header class="room-dialog-header"><h2 id="room-dialog-title">${escape(type.name)}</h2><button type="button" class="room-dialog-close" aria-label="Đóng chi tiết phòng" data-dialog-action="close">✕</button></header>
      <p class="room-dialog-description">${escape(type.description)}</p><div class="room-facts"><span>${type.bedLabel}</span><span>${type.capacity} khách</span><span>Khoảng ${type.area} m²</span></div>
      ${renderFloorPlan(selectedTypeId, type)}${actions}</div>`;
    if (!dialog.open) dialog.showModal();
    else dialog.querySelector('[data-dialog-action="book"]')?.focus();
  }

  function chooseRole(role) {
    if (!Object.hasOwn(roles, role)) return;
    if (role === 'housekeeping') {
      location.hash = 'chon-nhan-vien';
      return;
    }
    state.housekeeperId = null;
    if (role === 'guest') {
      state.signedIn = true;
      state.adminRole = null;
      location.hash = 'tai-khoan';
    } else {
      state.adminRole = role;
      location.hash = `quan-tri/${roles[role].sections[0]}`;
    }
    saveSession();
  }

  function renderRoles(pickHousekeeper) {
    $('#roles-title').textContent = pickHousekeeper ? 'Chọn nhân viên vệ sinh' : 'Chọn vai trò';
    $('#roles-description').textContent = pickHousekeeper ? 'Chọn tài khoản để xem các phòng được phân công.' : 'Đăng nhập bằng tài khoản mẫu của Starystal Hotel.';
    $('#roles-back').href = pickHousekeeper ? '#vai-tro' : '#trang-chu';
    $('#roles-back-label').textContent = pickHousekeeper ? 'Về chọn vai trò' : 'Về trang khách sạn';
    $('#role-options').innerHTML = pickHousekeeper ? Object.entries(housekeepers).map(([id, name]) => `
      <button class="role-option" type="button" data-housekeeper="${id}"><span class="role-copy"><strong>${escape(name)}</strong><span class="role-name">Nhân viên vệ sinh</span></span><span class="role-arrow" aria-hidden="true">→</span></button>`).join('') : Object.entries(roles).map(([id, role]) => `
      <button class="role-option" type="button" data-role="${id}"><span class="role-copy"><strong>${role.title}</strong><span class="role-name">${role.name}</span><span class="role-description">${role.description}</span></span><span class="role-arrow" aria-hidden="true">→</span></button>`).join('');
  }

  const badge = (label, variant = '') => `<span class="status-badge ${variant}">${escape(label)}</span>`;
  const panel = (heading, body) => `<section class="operations-panel"><h2>${heading}</h2>${body}</section>`;

  function renderOverview(reports = false) {
    const finished = state.bookings.filter((item) => item.status === 'CHECKED_OUT');
    const occupancy = Math.round(rooms.filter((room) => roomStatus(room) === 'OCCUPIED').length / rooms.length * 100);
    const revenue = finished.reduce((sum, item) => sum + item.total, 0);
    return `<div class="metric-grid">
      <div><span>Tỷ lệ lấp đầy</span><strong>${occupancy}%</strong></div>
      <div><span>Đơn chờ nhận phòng</span><strong>${state.bookings.filter((item) => item.status === 'PENDING').length}</strong></div>
      <div><span>Doanh thu đơn đã trả phòng</span><strong>${formatMoney.format(revenue)}</strong></div>
    </div>${reports ? panel('Cơ cấu đơn đặt phòng', `<ul class="report-list">${Object.entries(bookingLabels).map(([status, label]) => `<li><span>${label}</span><strong>${state.bookings.filter((item) => item.status === status).length}</strong></li>`).join('')}</ul>`) : renderBookings(false)}`;
  }

  function renderInventory(visibleRooms) {
    if (!visibleRooms.length) return panel('Phòng được giao', '<p>Bạn chưa được phân công phòng nào.</p>');

    const floors = Array.from(new Set(visibleRooms.map((room) => room.floor)));
    const floorSections = floors.map((floor) => {
      const floorRooms = visibleRooms.filter((room) => room.floor === floor);
      const cards = floorRooms.map((room) => {
        const status = roomStatus(room);
        const type = roomTypes[room.typeId];
        return `<article class="inventory-card"><div class="inventory-card-heading"><strong>${room.roomNumber}</strong>${badge(roomLabels[status], status)}</div><h3>${escape(type.name)}</h3><p>${type.bedLabel} · ${type.capacity} khách</p></article>`;
      }).join('');
      return `<section class="inventory-floor"><h2>Tầng ${floor} <small>${floorRooms.length} phòng</small></h2><div class="inventory-grid">${cards}</div></section>`;
    }).join('');

    const statusTotals = Object.entries(roomLabels).map(([status, label]) => {
      const count = visibleRooms.filter((room) => roomStatus(room) === status).length;
      return `<li>${badge(label, status)} <strong>${count}</strong></li>`;
    }).join('');
    return `<ul class="inventory-summary" aria-label="Tổng hợp trạng thái phòng">${statusTotals}</ul>${floorSections}`;
  }

  function renderHousekeeping() {
    const tasks = rooms.filter((room) => hasCleaningTask(room) && ownsCleaningTask(room));
    if (!tasks.length) return panel('Tác vụ dọn phòng', '<p>Không có phòng cần dọn trong danh sách của bạn.</p>');

    return ['NEEDS_CLEANING', 'CLEANING'].map((status) => {
      const group = tasks.filter((room) => roomStatus(room) === status);
      if (!group.length) return '';

      const cards = group.map((room) => {
        const type = roomTypes[room.typeId];
        const assigned = housekeepers[state.assignments[room.id]] || 'Chưa phân công';
        const options = Object.entries(cleaningOptions).map(([value, label]) =>
          `<option value="${value}"${value === status ? ' selected' : ''}>${label}</option>`).join('');
        return `<article class="cleaning-card">
          <div class="cleaning-card-heading"><h3>Phòng ${room.roomNumber}</h3>${badge(roomLabels[status], status)}</div>
          <p>Tầng ${room.floor} · ${escape(type.name)}${canAccess('assignments') ? ` · ${escape(assigned)}` : ''}</p>
          <form class="cleaning-form" data-cleaning-room="${room.id}" aria-label="Cập nhật vệ sinh phòng ${room.roomNumber}">
            <label>Trạng thái dọn phòng<select name="status">${options}</select></label>
            <label>Ghi chú vệ sinh<textarea name="note" rows="2" maxlength="240">${escape(state.cleaningNotes[room.id] ?? '')}</textarea></label>
            <button class="primary-button" type="submit">Lưu cập nhật</button>
          </form>
        </article>`;
      }).join('');

      return `<section class="cleaning-group"><h2>${roomLabels[status]} <small>${group.length} phòng</small></h2><div class="cleaning-grid">${cards}</div></section>`;
    }).join('');
  }

  function renderAssignments() {
    const floors = Array.from(new Set(rooms.map((room) => room.floor)));
    const groups = floors.map((floor) => {
      const floorRooms = rooms.filter((room) => room.floor === floor);
      const rows = floorRooms.map((room) => {
        const assignee = state.assignments[room.id];
        const options = Object.entries(housekeepers).map(([id, name]) =>
          `<option value="${id}"${id === assignee ? ' selected' : ''}>${escape(name)}</option>`).join('');
        const status = roomStatus(room);
        return `<label class="assignment-room"><span><strong>Phòng ${room.roomNumber}</strong>${badge(roomLabels[status], status)}</span>
          <select name="${room.id}" aria-label="Nhân viên vệ sinh phòng ${room.roomNumber}"><option value=""${assignee ? '' : ' selected'}>Chưa phân công</option>${options}</select></label>`;
      }).join('');
      return `<details class="assignment-floor" data-floor="${floor}"${openAssignmentFloors.has(floor) ? ' open' : ''}>
        <summary><strong>Tầng ${floor}</strong><span>${floorRooms.length} phòng</span></summary><div class="assignment-rooms">${rows}</div></details>`;
    }).join('');
    return panel('Phân công theo phòng', `<form id="cleaning-assignments" class="assignment-form">
      <p>Thông báo sau khi khách trả phòng sẽ gửi cho nhân viên được giao phòng đó.</p>
      <div class="assignment-floors">${groups}</div>
      <div class="assignment-footer"><button class="primary-button" type="submit">Lưu phân công</button></div>
    </form>`);
  }

  function renderBookings(showActions = true) {
    const active = state.bookings.slice().reverse().map((booking) => {
      const action = booking.status === 'PENDING' ? 'Nhận phòng' : booking.status === 'CHECKED_IN' ? 'Trả phòng' : '';
      return `<tr role="row">
        <th scope="row" role="rowheader" class="booking-code">${escape(booking.code)}</th>
        <td role="cell" class="booking-guest"><span class="booking-label" aria-hidden="true">Khách</span>${escape(booking.guestName)}</td>
        <td role="cell" class="booking-room"><span class="booking-label" aria-hidden="true">Phòng</span>${escape(findRoom(booking.roomId)?.roomNumber || '—')}</td>
        <td role="cell" class="booking-dates"><span class="booking-label" aria-hidden="true">Ngày lưu trú</span>${displayDate(booking.checkIn)} – ${displayDate(booking.checkOut)}</td>
        <td role="cell" class="booking-status">${badge(bookingLabels[booking.status], booking.status)}</td>
        ${showActions ? `<td role="cell" class="booking-payment"><span class="booking-label" aria-hidden="true">Thanh toán mẫu</span><strong>${formatMoney.format(booking.total)}</strong><small>${paymentDetail(booking)}</small></td>
        <td role="cell" class="booking-action${action ? '' : ' booking-action-empty'}">${action ? `<button type="button" class="text-button table-action" data-process="${escape(booking.code)}">${action}</button>` : '—'}</td>` : ''}
      </tr>`;
    }).join('');
    return panel('Danh sách đặt phòng', `<div class="table-scroll" role="region" aria-label="Bảng đặt phòng" tabindex="0"><table class="booking-table" role="table"><thead role="rowgroup"><tr role="row"><th scope="col">Mã đơn</th><th scope="col">Khách</th><th scope="col">Phòng</th><th scope="col">Ngày lưu trú</th><th scope="col">Trạng thái</th>${showActions ? '<th scope="col">Thanh toán mẫu</th><th scope="col">Thao tác</th>' : ''}</tr></thead><tbody role="rowgroup">${active}</tbody></table></div>`);
  }

  const renderStaff = () => panel('Vai trò vận hành', `<ul class="report-list">${Object.values(roles).filter((role) => role.sections).map((role) => `<li><div><strong>${role.title}</strong><p>${role.name} · ${role.description}</p></div></li>`).join('')}</ul>`);

  const renderSettings = () => panel('Thông tin lưu trú', `<form id="operations-settings" class="operations-form">
    <label>Tên khách sạn<input name="name" required maxlength="80" value="${escape(state.settings.name)}"></label>
    <label>Giờ nhận phòng<input name="checkIn" type="time" required value="${escape(state.settings.checkIn)}"></label>
    <label>Giờ trả phòng<input name="checkOut" type="time" required value="${escape(state.settings.checkOut)}"></label>
    <button class="primary-button" type="submit">Lưu cấu hình mẫu</button></form>`);

  const sections = { overview: renderOverview, bookings: renderBookings, housekeeping: renderHousekeeping, assignments: renderAssignments, reports: () => renderOverview(true), staff: renderStaff, settings: renderSettings };

  function renderOperations(section) {
    const role = roles[state.adminRole];
    $('#admin-hotel-name').textContent = state.settings.name;
    $('#admin-identity').textContent = housekeepers[state.housekeeperId] || role.name;
    const cleaningCount = rooms.filter((room) => roomStatus(room) === 'NEEDS_CLEANING' && ownsCleaningTask(room)).length;
    $('#admin-nav').innerHTML = role.sections.map((item) => `<a href="#quan-tri/${item}"${item === section ? ' aria-current="page"' : ''}>${sectionLabels[item]}${item === 'housekeeping' && cleaningCount ? `<span class="nav-count" aria-hidden="true">${cleaningCount}</span>` : ''}</a>`).join('');
    const visibleRooms = section === 'rooms' ? (state.adminRole === 'housekeeping' ? rooms.filter(ownsCleaningTask) : rooms) : null;
    const inventoryInfo = visibleRooms?.length ? `<p>${visibleRooms.length} phòng trên ${new Set(visibleRooms.map((room) => room.floor)).size} tầng</p>` : '';
    const content = visibleRooms ? renderInventory(visibleRooms) : sections[section]();
    $('#admin-content').innerHTML = `<header class="operations-title"><h1>${sectionLabels[section]}</h1>${inventoryInfo}</header>${operationsNotice ? `<p id="operations-notice" class="reservation-notice" role="status" tabindex="-1">${escape(operationsNotice)}</p>` : ''}${content}`;
  }

  function route() {
    const hash = location.hash.slice(1);
    const adminRoute = hash.startsWith('quan-tri/');
    const role = Object.hasOwn(roles, state.adminRole) ? roles[state.adminRole] : null;
    if (adminRoute && !role?.sections) { location.replace('#vai-tro'); return; }
    if (adminRoute && state.adminRole === 'housekeeping' && !Object.hasOwn(housekeepers, state.housekeeperId)) {
      location.replace('#chon-nhan-vien');
      return;
    }
    const section = hash.split('/')[1];
    if (adminRoute && !role.sections.includes(section)) { location.replace(`#quan-tri/${role.sections[0]}`); return; }
    const showRoles = hash === 'vai-tro' || hash === 'chon-nhan-vien';
    $('#guest-view').hidden = adminRoute || showRoles;
    $('#roles-view').hidden = !showRoles;
    $('#admin-view').hidden = !adminRoute;
    if (adminRoute) renderOperations(section);
    else if (showRoles) renderRoles(hash === 'chon-nhan-vien');
    else {
      renderGuestAccount();
      renderRooms();
      if (hash) document.getElementById(hash)?.scrollIntoView();
    }
  }

  function processReservation(code) {
    if (!canAccess('bookings')) return;
    refreshSharedState();
    const booking = state.bookings.find((item) => item.code === code);
    if (!booking || !['PENDING', 'CHECKED_IN'].includes(booking.status)) return;
    const room = findRoom(booking.roomId);
    if (!room) return;
    if (booking.status === 'PENDING' && roomStatus(room) !== 'EMPTY') {
      operationsNotice = 'Phòng chưa sẵn sàng để nhận khách.';
      route();
      return;
    }
    const checkingIn = booking.status === 'PENDING';
    booking.status = checkingIn ? 'CHECKED_IN' : 'CHECKED_OUT';
    state.roomStatus[room.id] = checkingIn ? 'OCCUPIED' : 'NEEDS_CLEANING';
    if (!checkingIn) delete state.cleaningNotes[room.id];
    const balance = booking.total - (booking.depositAmount || 0);
    const assignee = housekeepers[state.assignments[room.id]];
    const handover = assignee ? `Đã báo ${assignee}.` : 'Quản lý có thể chọn người phụ trách trong mục Phân công vệ sinh.';
    operationsNotice = checkingIn
      ? `Đã nhận phòng và ghi nhận thanh toán mẫu ${formatMoney.format(balance)} cho đơn ${booking.code}.`
      : `Đã trả phòng ${room.roomNumber} và chuyển sang Cần dọn. ${handover}`;
    save();
    route();
  }

  function updateCleaning(form, roomId) {
    if (!canAccess('housekeeping')) return;
    refreshSharedState();
    const room = findRoom(roomId);
    if (!room || !hasCleaningTask(room) || !ownsCleaningTask(room)) return;
    const data = new FormData(form);
    const nextStatus = data.get('status');
    if (!Object.hasOwn(cleaningOptions, nextStatus)) return;

    state.roomStatus[room.id] = nextStatus;
    const note = String(data.get('note') ?? '').trim().slice(0, 240);
    if (note) state.cleaningNotes[room.id] = note;
    else delete state.cleaningNotes[room.id];
    operationsNotice = nextStatus === 'EMPTY'
      ? `Phòng ${room.roomNumber} đã dọn xong và sẵn sàng nhận khách.`
      : `Đã cập nhật phòng ${room.roomNumber}. ${roomLabels[nextStatus]}.`;
    save();
    $('#handover-announcement').hidden = true;
    route();
    $('#operations-notice')?.focus({ preventScroll: true });
  }

  function updateAssignments(form) {
    if (!canAccess('assignments')) return;
    refreshSharedState();
    openAssignmentFloors = new Set(Array.from(form.querySelectorAll('.assignment-floor[open]'), (floor) => Number(floor.dataset.floor)));
    for (const select of form.querySelectorAll('select')) {
      const option = select.selectedOptions[0];
      if (!option || option.defaultSelected) continue;
      if (findRoom(select.name) && (select.value === '' || Object.hasOwn(housekeepers, select.value))) {
        state.assignments[select.name] = select.value;
      }
    }
    operationsNotice = 'Đã lưu phân công vệ sinh.';
    save();
    route();
  }

  function updateCheckOutDate() {
    dateOut.min = dateIn.value ? new Date(Date.parse(dateIn.value) + dayLength).toISOString().slice(0, 10) : '';
    if (dateOut.value < dateOut.min) dateOut.value = dateOut.min;
  }

  bookingDateLimits();
  dateIn.value = dateIn.min;
  updateCheckOutDate();

  $('#room-search').addEventListener('submit', (event) => {
    event.preventDefault();
    searched = true;
    renderRooms();
    $('#phong').scrollIntoView();
  });
  dateIn.addEventListener('change', updateCheckOutDate);
  $('#reset-search').addEventListener('click', () => { searched = false; renderRooms(); });
  $('#guest-rooms').addEventListener('click', (event) => {
    const button = event.target.closest('[data-room-type]');
    if (button) { selectedTypeId = button.dataset.roomType; renderRoomDialog(); }
  });
  $('#guest-account').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button?.dataset.guestAction) {
      state.signedIn = button.dataset.guestAction === 'login';
      guestNotice = '';
      saveSession();
    } else if (button?.dataset.cancel) {
      refreshSharedState();
      const booking = state.bookings.find((item) => item.code === button.dataset.cancel && item.isGuest);
      if (booking?.status !== 'PENDING') return;
      booking.status = 'CANCELED';
      guestNotice = `Đã hủy đặt phòng mẫu ${booking.code}.`;
      save();
    } else return;
    renderGuestAccount();
    if (searched) renderRooms();
  });
  dialog.addEventListener('click', (event) => {
    const action = event.target.closest('[data-dialog-action]')?.dataset.dialogAction;
    if (action === 'close') dialog.close();
    if (action === 'login') { state.signedIn = true; saveSession(); renderGuestAccount(); renderRoomDialog(); }
    if (action !== 'book' || !state.signedIn) return;
    refreshSharedState();
    const dates = selectedDates();
    const room = availableRooms(selectedTypeId, dates)[0];
    if (!room) { renderRoomDialog(); return; }
    const { total, depositAmount } = quoteStay(roomTypes[room.typeId], dates);
    const code = `SH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    state.bookings.push({ code, roomId: room.id, checkIn: dates.checkIn, checkOut: dates.checkOut, guests: dates.guests, total, depositAmount, status: 'PENDING', isGuest: true, guestName: 'Khách trải nghiệm' });
    guestNotice = `Đã lưu đặt phòng mẫu ${code}.`;
    save();
    dialog.close();
    if (location.hash === '#tai-khoan') route();
    else location.hash = 'tai-khoan';
  });

  $('#role-options').addEventListener('click', (event) => {
    const housekeeper = event.target.closest('[data-housekeeper]')?.dataset.housekeeper;
    if (housekeeper && Object.hasOwn(housekeepers, housekeeper)) {
      state.adminRole = 'housekeeping';
      state.housekeeperId = housekeeper;
      saveSession();
      location.hash = 'quan-tri/housekeeping';
      return;
    }
    const role = event.target.closest('[data-role]')?.dataset.role;
    if (role) chooseRole(role);
  });
  $('#admin-content').addEventListener('click', (event) => {
    const process = event.target.closest('button')?.dataset.process;
    if (process) processReservation(process);
  });
  $('#admin-content').addEventListener('submit', (event) => {
    if (event.target.id === 'cleaning-assignments') {
      event.preventDefault();
      updateAssignments(event.target);
      return;
    }
    const cleaningRoom = event.target.dataset.cleaningRoom;
    if (cleaningRoom) {
      event.preventDefault();
      updateCleaning(event.target, cleaningRoom);
      return;
    }
    if (event.target.id !== 'operations-settings' || state.adminRole !== 'owner') return;
    event.preventDefault();
    refreshSharedState();
    const settings = Object.fromEntries(new FormData(event.target));
    if (!settings.name.trim()) return;
    state.settings = { ...settings, name: settings.name.trim() };
    bookingDateLimits();
    if (dateIn.value < dateIn.min || dateIn.value > dateIn.max) {
      dateIn.value = dateIn.min;
      updateCheckOutDate();
    }
    operationsNotice = 'Đã lưu cấu hình mẫu.';
    save();
    route();
  });
  window.addEventListener('hashchange', () => {
    operationsNotice = '';
    $('#handover-announcement').hidden = true;
    route();
    if (['#vai-tro', '#chon-nhan-vien'].includes(location.hash) || location.hash.startsWith('#quan-tri/')) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey || !event.newValue) return;
    const previous = state;
    refreshSharedState();
    const section = location.hash.split('/')[1];
    if (!canAccess(section)) return;

    const changed = rooms.filter((room) =>
      (previous.roomStatus[room.id] || room.status) !== roomStatus(room) ||
      previous.assignments[room.id] !== state.assignments[room.id]);
    const waiting = changed.filter((room) => roomStatus(room) === 'NEEDS_CLEANING' && ownsCleaningTask(room));
    if (['rooms', 'bookings', 'housekeeping'].includes(section) && !document.activeElement?.closest('form')) {
      renderOperations(section);
    }
    if (state.adminRole === 'housekeeping' && waiting.length) {
      const notice = $('#handover-announcement');
      notice.textContent = `Phòng cần dọn: ${waiting.map((room) => room.roomNumber).join(', ')}.`;
      notice.hidden = false;
    }
  });
  saveSession();
  route();
})();
