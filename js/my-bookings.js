function openMyBookings() {
  document.getElementById('mbLookup').style.display = 'block';
  document.getElementById('mbLoading').style.display = 'none';
  document.getElementById('mbResults').style.display = 'none';
  document.getElementById('mbEmpty').style.display = 'none';
  // Pre-fill email from booking form if available
  var formEmail = document.getElementById('availEmail');
  if (formEmail && formEmail.value) {
    document.getElementById('mbEmail').value = formEmail.value;
  }
  document.getElementById('myBookingsOverlay').classList.add('active');
}

function closeMyBookings() {
  document.getElementById('myBookingsOverlay').classList.remove('active');
}

function lookupBookings() {
  var email = document.getElementById('mbEmail').value.trim();
  if (!email) { document.getElementById('mbEmail').focus(); return; }

  document.getElementById('mbLookup').style.display = 'none';
  document.getElementById('mbLoading').style.display = 'block';
  document.getElementById('mbResults').style.display = 'none';
  document.getElementById('mbEmpty').style.display = 'none';

  fetch('/yacht/api/my-bookings?email=' + encodeURIComponent(email))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      document.getElementById('mbLoading').style.display = 'none';
      if (!data.length) {
        document.getElementById('mbEmpty').style.display = 'block';
        return;
      }
      document.getElementById('mbCount').textContent = data.length + ' booking' + (data.length > 1 ? 's' : '') + ' found';
      document.getElementById('mbList').innerHTML = data.map(function(b) {
        var badgeClass = b.status === 'confirmed' ? 'mb-badge-confirmed'
          : b.status === 'cancelled' ? 'mb-badge-cancelled'
          : 'mb-badge-new';
        var statusLabel = b.status === 'confirmed' ? 'Confirmed' : b.status === 'cancelled' ? 'Cancelled' : 'Pending';
        var price = b.price ? '$' + parseInt(b.price).toLocaleString() : '';
        return '<div class="mb-card">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
            '<div class="mb-card-date">' + b.date + ' &middot; ' + b.time + '</div>' +
            '<span class="mb-badge ' + badgeClass + '">' + statusLabel + '</span>' +
          '</div>' +
          '<div class="mb-card-cruise">' + b.cruise + '</div>' +
          '<div class="mb-card-details">' +
            '&#x23F1; ' + b.duration + ' &middot; &#x1F465; ' + b.guests + ' guests' +
            (price ? ' &middot; &#x1F4B0; ' + price : '') +
          '</div>' +
        '</div>';
      }).join('');
      document.getElementById('mbResults').style.display = 'block';
    })
    .catch(function() {
      document.getElementById('mbLoading').style.display = 'none';
      document.getElementById('mbEmpty').style.display = 'block';
    });
}
