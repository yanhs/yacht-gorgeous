fetch('https://api.sunrisesunset.io/json?lat=34.0522&lng=-118.2437&timezone=America/Los_Angeles&date=today')
    .then(r => r.json())
    .then(data => {
      if (data.status === 'OK') {
        const r = data.results;
        // Format "7:02:04 AM" → "7:02 AM"
        const fmt = t => t.replace(/:\d{2}\s/, ' ');

        document.getElementById('sunriseTime').textContent = fmt(r.sunrise);
        document.getElementById('solarNoonTime').textContent = fmt(r.solar_noon);
        document.getElementById('goldenHourTime').textContent = fmt(r.golden_hour);
        document.getElementById('sunsetTime').textContent = fmt(r.sunset);
        document.getElementById('twilightEndTime').textContent = fmt(r.dusk);

        // Day length "12:01:08" → "12h 1min"
        const parts = r.day_length.split(':');
        document.getElementById('dayLength').textContent = parseInt(parts[0]) + 'h ' + parseInt(parts[1]) + 'min';
      }
    }).catch(err => console.error('Sunset API error:', err));

  // ===== NAVBAR: show on scroll, tab switching =====
  const navbar = document.getElementById('navbar');
  const allTabs = document.querySelectorAll('.tab-content-wrapper');
  const allNavLinks = document.querySelectorAll('.nav-links li a');
  let activeTab = null;

  // Tab switching
  function showTab(tabName) {
    // Hide all tabs
    allTabs.forEach(t => t.classList.remove('active'));

    // Show selected tab
    const target = document.querySelector(`.tab-content-wrapper[data-tab="${tabName}"]`);
    if (target) {
      target.classList.add('active');
      activeTab = tabName;
      document.getElementById('siteFooter').style.display = '';

      // Scroll to the section smoothly
      setTimeout(() => {
        const section = target.querySelector('section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }

    // Update active link
    allNavLinks.forEach(link => {
      link.classList.remove('active');
      const href = (link.getAttribute('href') || '').replace('#', '');
      if (href === tabName) {
        link.classList.add('active');
      }
    });
  }

  // Intercept nav clicks
  allNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      e.preventDefault();
      const tabName = href.replace('#', '');

      // Direct scroll targets (not tabs)
      const directIds = ['cruises', 'booking'];
      if (directIds.includes(tabName)) {
        const el = document.getElementById(tabName);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else {
        showTab(tabName);
      }

      // Close mobile menu
      document.getElementById('navToggle').classList.remove('open');
      document.getElementById('navLinks').classList.remove('open');
    });
  });

  // Logo click — go to hero, close all tabs
  document.querySelector('.nav-logo').addEventListener('click', (e) => {
    e.preventDefault();
    allTabs.forEach(t => t.classList.remove('active'));
    allNavLinks.forEach(l => l.classList.remove('active'));
    activeTab = null;
    document.getElementById('siteFooter').style.display = 'none';
    document.getElementById('pageContent').scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Hamburger toggle
  function toggleNav() {
    document.getElementById('navToggle').classList.toggle('open');
    document.getElementById('navLinks').classList.toggle('open');
  }

  // Handle internal #booking links (from "Book Your Cruise" buttons)
  document.querySelectorAll('a[href="#availability"]').forEach(btn => {
    if (!btn.closest('.nav-links')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('cruises').scrollIntoView({ behavior: 'smooth' });
      });
    }
  });

  // ===== CRUISE CALCULATOR =====
  const cruisePricing = {
    sunset:      { base: 750,  hourly: 200 },
    dolphin:     { base: 900,  hourly: 220 },
    celebration: { base: 1200, hourly: 280 },
    romantic:    { base: 850,  hourly: 200 },
    corporate:   { base: 1500, hourly: 320 }
  };

  function updateCalcPrice() {
    const type = document.getElementById('calcType').value;
    const duration = parseInt(document.getElementById('calcDuration').value);
    const guests = parseInt(document.getElementById('calcGuests').value);

    const p = cruisePricing[type];
    // Base price for 2h, extra hours cost hourly rate
    let price = p.base;
    if (duration > 2) {
      price += (duration - 2) * p.hourly;
    }
    // Guest surcharge: +$50 per guest above 6
    if (guests > 6) {
      price += (guests - 6) * 50;
    }

    // Animate price
    const el = document.getElementById('calcPrice');
    el.style.transform = 'scale(1.08)';
    el.textContent = '$' + price.toLocaleString();
    setTimeout(() => { el.style.transform = 'scale(1)'; }, 200);
  }

  // ===== VISUAL CALENDAR & AVAILABILITY =====

  let calYear, calMonth, calSelectedDate = null;

  (function initCalendar() {
    const today = new Date();
    calYear = today.getFullYear();
    calMonth = today.getMonth();
    renderCalendar();
  })();

  function renderCalendar() {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    document.getElementById('calTitle').textContent = months[calMonth] + ' ' + calYear;

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date();
    today.setHours(0,0,0,0);

    // Build calendar grid immediately (all future dates as free), then update with booked data
    function buildGrid(bookedDates) {
      let html = '';
      for (let i = 0; i < firstDay; i++) {
        html += '<div class="cal-day cal-empty"></div>';
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        const dateObj = new Date(calYear, calMonth, d);
        const isPast = dateObj < today;
        const isToday = dateObj.getTime() === today.getTime();
        const isSelected = calSelectedDate === dateStr;
        const isBooked = bookedDates.includes(dateStr);

        let cls = 'cal-day';
        if (isPast && !isBooked) cls += ' cal-past';
        if (isToday) cls += ' cal-today';
        if (isSelected) cls += ' cal-selected';
        if (isBooked) cls += ' cal-booked';
        else if (!isPast) cls += ' cal-free';

        const clickable = !isPast;
        html += `<div class="${cls}" ${clickable ? `onclick="selectCalDay('${dateStr}')"` : ''}>${d}</div>`;
      }
      document.getElementById('calDays').innerHTML = html;
    }

    // Render immediately with no booked info, then fetch and re-render
    buildGrid([]);
    fetch('/yacht/api/booked-dates?year=' + calYear + '&month=' + (calMonth + 1) + '&_t=' + Date.now())
      .then(r => r.json())
      .then(dates => buildGrid(dates))
      .catch(() => {}); // keep free view on error
  }

  function calNav(dir) {
    calMonth += dir;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  }

  function selectCalDay(dateStr) {
    calSelectedDate = dateStr;
    document.getElementById('availDate').value = dateStr;
    renderCalendar();
    checkAvailability();
  }

  function updateLivePrice() {
    const cruiseType = document.getElementById('availCruise').value;
    const duration = parseInt(document.getElementById('availDuration').value);
    const guests = parseInt(document.getElementById('availGuests').value);
    const cp = cruisePricing[cruiseType];
    let price = cp.base;
    if (duration > 2) price += (duration - 2) * cp.hourly;
    if (guests > 6) price += (guests - 6) * 50;

    const icons = {sunset:'🌅',dolphin:'🐬',celebration:'🎉',romantic:'💍',corporate:'🏢'};
    const names = {sunset:'Sunset Cruise',dolphin:'Dolphin Watching',celebration:'Celebration Cruise',romantic:'Romantic Cruise',corporate:'Corporate Event'};

    const el = document.getElementById('livePriceAmount');
    const detail = document.getElementById('livePriceDetail');
    el.textContent = '$' + price.toLocaleString();
    const time = document.getElementById('availTime').value;
    detail.textContent = icons[cruiseType] + ' ' + names[cruiseType] + ' · ' + time + ' · ' + duration + 'h · ' + guests + ' guests';

    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 250);
  }

  // Convert '2:00 PM' -> 14, '11:00 AM' -> 11, etc.
  function parseTimeH(t) {
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!m) return 0;
    let h = parseInt(m[1]), min = parseInt(m[2]);
    if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return h + min / 60;
  }

  function checkAvailability() {
    const dateVal = document.getElementById('availDate').value;
    if (!dateVal) {
      const result = document.getElementById('availResult');
      const status = document.getElementById('availStatus');
      const note = document.getElementById('availNote');
      document.getElementById('availSlots').innerHTML = '';
      document.getElementById('availBook').style.display = 'none';
      result.classList.remove('available');
      result.classList.add('unavailable', 'show');
      status.textContent = '📅 Select a Date';
      note.textContent = 'Please tap a date on the calendar above';
      return;
    }

    const result = document.getElementById('availResult');
    const status = document.getElementById('availStatus');
    const slots = document.getElementById('availSlots');
    const note = document.getElementById('availNote');
    const bookBtn = document.getElementById('availBook');
    const guests = parseInt(document.getElementById('availGuests').value);
    const cruiseType = document.getElementById('availCruise').value;
    const duration = parseInt(document.getElementById('availDuration').value);

    const date = new Date(dateVal + 'T12:00:00');
    const day = date.getDay();
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = Math.floor((date - today) / (1000*60*60*24));

    result.classList.remove('available', 'unavailable', 'show');

    if (diff < 1) {
      setTimeout(() => {
        result.classList.add('unavailable', 'show');
        status.textContent = '✗ Not Available';
        note.textContent = 'Please select a future date';
        slots.innerHTML = '';
        bookBtn.style.display = 'none';
      }, 200);
      return;
    }

    // Fetch booked slots from server, then filter
    fetch('/yacht/api/slots?date=' + dateVal)
      .then(r => r.json())
      .then(bookedSlots => {
        // Generate candidate time slots based on day
        let timeSlots = [];
        if (diff <= 3 && (day === 0 || day === 6)) {
          timeSlots = ['4:00 PM'];
          if (guests > 8) timeSlots = [];
        } else if (day === 0 || day === 6) {
          timeSlots = ['10:00 AM', '2:00 PM', '5:00 PM'];
          if (guests > 10) timeSlots = ['10:00 AM', '2:00 PM'];
        } else {
          timeSlots = ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM', '6:00 PM'];
        }

        // Filter out slots that would overlap with existing bookings
        timeSlots = timeSlots.filter(t => {
          const newStart = parseTimeH(t);
          const newEnd = newStart + duration;
          for (const bs of bookedSlots) {
            // Overlap: newStart < existingEnd && existingStart < newEnd
            if (newStart < bs.endH && bs.startH < newEnd) return false;
          }
          return true;
        });

        if (timeSlots.length > 0) {
          const cp = cruisePricing[cruiseType];
          let price = cp.base;
          if (duration > 2) price += (duration - 2) * cp.hourly;
          if (guests > 6) price += (guests - 6) * 50;

          const selectedTime = document.getElementById('availTime').value;
          const timeOk = timeSlots.includes(selectedTime);
          const activeSlot = timeOk ? selectedTime : timeSlots[0];

          result.classList.add('available', 'show');
          status.textContent = timeOk ? '✓ Available at ' + selectedTime + '!' : '✓ Available! We set ' + activeSlot + ' for you — tap to change';
          note.textContent = 'Estimated price: $' + price.toLocaleString();
          slots.innerHTML = timeSlots.map(t =>
            `<span class="avail-slot${t === activeSlot ? ' selected' : ''}" onclick="selectSlot(this);document.getElementById('availTime').value=this.textContent.trim();">${t}</span>`
          ).join('');
          bookBtn.style.display = 'block';
        } else {
          result.classList.add('unavailable', 'show');
          status.textContent = '⚓ Fully Booked';
          note.textContent = bookedSlots.length > 0
            ? 'All time slots taken for this date — try another date or shorter duration'
            : 'This date is fully booked — try another date or fewer guests';
          slots.innerHTML = '';
          bookBtn.style.display = 'none';
        }
      })
      .catch(err => {
        console.error('Availability API error:', err);
        // Fallback if API unreachable
        result.classList.add('unavailable', 'show');
        status.textContent = '⚠️ Could not check';
        note.textContent = 'Please try again';
        slots.innerHTML = '';
        bookBtn.style.display = 'none';
      });
  }

  function selectSlot(el) {
    document.querySelectorAll('.avail-slot').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
  }

  // ===== PAYMENT SYSTEM =====
  let bookingData = {};

  function submitBooking() {
    const name = document.getElementById('availName').value.trim();
    const email = document.getElementById('availEmail').value.trim();
    const phone = document.getElementById('availPhone').value.trim();
    if (!name || !email) {
      alert('Please enter your name and email to book.');
      return;
    }
    if (!phone) {
      alert('Please enter your phone number.');
      return;
    }
    const slot = document.querySelector('.avail-slot.selected');
    if (!slot) {
      alert('Please select a time slot.');
      return;
    }
    const dateVal = document.getElementById('availDate').value;
    const cruiseType = document.getElementById('availCruise').value;
    const cruise = document.getElementById('availCruise').selectedOptions[0].text;
    const duration = parseInt(document.getElementById('availDuration').value);
    const durationText = document.getElementById('availDuration').selectedOptions[0].text;
    const guests = parseInt(document.getElementById('availGuests').value);
    const time = slot.textContent.trim();

    const cp = cruisePricing[cruiseType];
    let price = cp.base;
    if (duration > 2) price += (duration - 2) * cp.hourly;
    if (guests > 6) price += (guests - 6) * 50;

    bookingData = { name, email, phone, dateVal, cruise, cruiseType, durationText, guests, time, price };

    // Update payment modal with correct amounts
    document.getElementById('payAmount').textContent = '$' + price.toLocaleString();
    const cruiseName = cruise.split('—')[0].split('from')[0].trim();
    document.getElementById('paySummary').textContent = cruiseName + ' · ' + dateVal + ' at ' + time + ' · ' + guests + ' guests';
    document.getElementById('payBtn').textContent = 'Pay $' + price.toLocaleString();
    document.getElementById('cashAmount').textContent = '$' + price.toLocaleString();
    document.getElementById('cashDeposit').textContent = '$' + Math.round(price * 0.1).toLocaleString();

    // Update crypto display
    if (typeof updateCryptoDisplay === 'function') updateCryptoDisplay();

    // Reset to card tab
    switchPayMethod('card');

    // Open payment modal
    document.getElementById('payOverlay').classList.add('active');
  }

  function closePayment() {
    document.getElementById('payOverlay').classList.remove('active');
  }

  // Card number formatting
  function formatCardNum(input) {
    let v = input.value.replace(/\D/g, '').substring(0, 16);
    let formatted = v.replace(/(.{4})/g, '$1 ').trim();
    input.value = formatted;
    detectCardType(v);
  }

  function detectCardType(num) {
    const icons = document.querySelectorAll('.pay-card-icon span');
    icons.forEach(i => i.classList.remove('active'));
    if (num.startsWith('4')) icons[0].classList.add('active'); // Visa
    else if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) icons[1].classList.add('active'); // MC
    else if (num.startsWith('3')) icons[2].classList.add('active'); // Amex
  }

  function formatExpiry(input) {
    let v = input.value.replace(/\D/g, '').substring(0, 4);
    if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2);
    input.value = v;
  }

  function processPayment() {
    const cardNum = document.getElementById('payCardNum').value.replace(/\s/g, '');
    const expiry = document.getElementById('payExpiry').value;
    const cvc = document.getElementById('payCVC').value;
    const cardName = document.getElementById('payCardName').value.trim();

    if (cardNum.length < 16) { alert('Please enter a valid card number.'); return; }
    if (expiry.length < 5) { alert('Please enter expiry date (MM/YY).'); return; }
    if (cvc.length < 3) { alert('Please enter CVC code.'); return; }
    if (!cardName) { alert('Please enter cardholder name.'); return; }

    // Simulate payment processing
    const btn = document.getElementById('payBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="pay-spinner"></span> Processing...';

    setTimeout(() => {
      completeBooking('card');
    }, 2200);
  }

  // ===== SEND BOOKING TO API =====
  function sendBookingToAPI(payMethod) {
    const d = bookingData;
    return fetch('/yacht/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: d.name,
        email: d.email,
        phone: d.phone || '',
        date: d.dateVal,
        cruise: d.cruise,
        cruiseType: d.cruiseType || '',
        time: d.time,
        duration: d.durationText,
        guests: d.guests,
        price: d.price,
        paymentMethod: payMethod
      })
    }).then(r => {
      if (r.status === 409) {
        return r.json().then(data => { throw new Error(data.message || 'Time slot conflict'); });
      }
      if (!r.ok) throw new Error('Booking failed');
      return r.json();
    });
  }

  function completeBooking(payMethod) {
    sendBookingToAPI(payMethod).then(() => {
      // Close modal
      closePayment();

      // Reset availability result and form fields
      document.getElementById('availResult').classList.remove('available', 'unavailable', 'show');
      document.getElementById('availName').value = '';
      document.getElementById('availEmail').value = '';
      document.getElementById('availPhone').value = '';
      const bookBtn = document.querySelector('#availBook .btn');
      if (bookBtn) { bookBtn.disabled = false; bookBtn.textContent = '🟡 Request Booking'; }

      // Show success
      const d = bookingData;
      alert(`✅ Booking confirmed!\n\nThank you, ${d.name}!\n\n${d.cruise.split('—')[0].trim()}\n📅 ${d.dateVal} at ${d.time}\n⏱ ${d.durationText} · ${d.guests} guests\n💰 $${d.price.toLocaleString()} via ${payMethod}\n\nConfirmation sent to ${d.email}\n\n⚓ See you at the marina!`);
    }).catch(err => {
      closePayment();
      alert('⚠️ ' + err.message + '\n\nPlease choose a different time slot.');
      // Re-check availability to refresh slots
      checkAvailability();
    });
  }

  // ===== CRYPTO PAYMENT =====
  const cryptoData = {
    btc:  { symbol: 'BTC',  rate: 96200,  addr: 'bc1qyacht0gorgeous0pay0btc000000000000' },
    eth:  { symbol: 'ETH',  rate: 3450,   addr: '0xYacht0Gorgeous0Pay0ETH0000000000000000' },
    usdt: { symbol: 'USDT', rate: 1,      addr: 'TYacht0Gorgeous0Pay0USDT00000000000' },
    sol:  { symbol: 'SOL',  rate: 148,    addr: 'YachtGorgeous0Pay0SOL000000000000000000000' }
  };
  let selectedCrypto = 'btc';

  function switchPayMethod(method) {
    document.querySelectorAll('.pay-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.pay-method').forEach(m => m.classList.remove('active'));
    const tabs = document.querySelectorAll('.pay-tab');
    if (method === 'card') {
      tabs[0].classList.add('active');
      document.getElementById('payMethodCard').classList.add('active');
    } else if (method === 'crypto') {
      tabs[1].classList.add('active');
      document.getElementById('payMethodCrypto').classList.add('active');
      updateCryptoDisplay();
    } else {
      tabs[2].classList.add('active');
      document.getElementById('payMethodCash').classList.add('active');
      const price = bookingData.price || 750;
      document.getElementById('cashAmount').textContent = '$' + price.toLocaleString();
      document.getElementById('cashDeposit').textContent = Math.round(price * 0.1).toLocaleString();
    }
  }

  function selectCrypto(coin, e) {
    selectedCrypto = coin;
    document.querySelectorAll('.crypto-coin').forEach(c => c.classList.remove('selected'));
    (e || event).currentTarget.classList.add('selected');
    updateCryptoDisplay();
  }

  function updateCryptoDisplay() {
    const c = cryptoData[selectedCrypto];
    const price = bookingData.price || 750;
    const amount = (price / c.rate).toFixed(selectedCrypto === 'usdt' ? 2 : 6);
    document.getElementById('cryptoAmt').textContent = amount + ' ' + c.symbol;
    document.getElementById('cryptoUsd').textContent = '≈ $' + price.toLocaleString();
    document.getElementById('cryptoAddr').textContent = c.addr;
  }

  function copyCryptoAddr(e) {
    const addr = document.getElementById('cryptoAddr').textContent;
    navigator.clipboard.writeText(addr).then(() => {
      const btn = (e || event).currentTarget;
      btn.textContent = '✅ Copied!';
      setTimeout(() => { btn.textContent = '📋 Copy Address'; }, 1500);
    });
  }

  function processCryptoPayment() {
    const txId = document.getElementById('cryptoTxId').value.trim();
    if (!txId) { alert('Please enter your wallet address or transaction ID.'); return; }

    const btn = document.getElementById('payBtnCrypto');
    btn.disabled = true;
    btn.innerHTML = '<span class="pay-spinner"></span> Verifying...';

    setTimeout(() => {
      completeBooking('crypto');
      btn.disabled = false;
      btn.innerHTML = '₿ Confirm Payment';
    }, 2500);
  }

  // ===== CASH PAYMENT =====
  function processCashPayment() {
    const phone = document.getElementById('cashPhone').value.trim();
    if (!phone) { alert('Please enter your phone number for confirmation.'); return; }

    const btn = document.getElementById('payBtnCash');
    btn.disabled = true;
    btn.innerHTML = '<span class="pay-spinner"></span> Reserving...';

    setTimeout(() => {
      // Save phone from cash form to bookingData
      bookingData.phone = bookingData.phone || phone;
      completeBooking('cash');
      btn.disabled = false;
      btn.innerHTML = '💵 Reserve — Pay at Marina';
    }, 1800);
  }

  /* ── Cruise card ↔ select sync ── */
  (function(){
    const rows = document.querySelectorAll('.avail-price-row[data-cruise]');
    const sel = document.getElementById('availCruise');
    function syncHighlight(val) {
      rows.forEach(r => r.classList.toggle('apr-selected', r.dataset.cruise === val));
    }
    rows.forEach(r => r.addEventListener('click', () => {
      sel.value = r.dataset.cruise;
      syncHighlight(r.dataset.cruise);
      updateLivePrice(); checkAvailability();
    }));
    sel.addEventListener('change', () => syncHighlight(sel.value));
    syncHighlight(sel.value);
  })();
