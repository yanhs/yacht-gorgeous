#!/usr/bin/env python3
"""Yacht Gorgeous — Booking API (no dependencies, stdlib only)."""
import json, os, threading, time
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.parse import quote, urlparse, parse_qs

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bookings.json')
ADMIN_KEY = 'gorgeous2026'
TG_BOT_TOKEN = '8619850206:AAEQB4wTqH3uLja92fhhq4jb3CHqzdJ9h8w'
TG_CAPTAIN_CHAT_ID = '130357933'
lock = threading.Lock()


def load_bookings():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return []


def save_bookings(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def parse_time_to_hours(t):
    """Convert '2:00 PM' -> 14.0, '11:00 AM' -> 11.0, etc."""
    t = t.strip()
    parts = t.replace(':', ' ').replace('  ', ' ').split()
    if len(parts) < 3:
        return None
    h = int(parts[0])
    m = int(parts[1])
    ampm = parts[2].upper()
    if ampm == 'PM' and h != 12:
        h += 12
    if ampm == 'AM' and h == 12:
        h = 0
    return h + m / 60.0


def parse_duration_hours(dur):
    """Extract hours from '3 hours', '2 hours', etc."""
    try:
        return int(str(dur).split()[0])
    except Exception:
        return 2


def check_overlap(bookings, date, time_str, duration_str):
    """Check if a new booking overlaps with existing ones on the same date.
    Returns (has_conflict: bool, conflict_desc: str)."""
    new_start = parse_time_to_hours(time_str)
    if new_start is None:
        return False, ''
    new_dur = parse_duration_hours(duration_str)
    new_end = new_start + new_dur

    for b in bookings:
        if b.get('date') != date:
            continue
        ex_start = parse_time_to_hours(b.get('time', ''))
        if ex_start is None:
            continue
        ex_dur = parse_duration_hours(b.get('duration', '2 hours'))
        ex_end = ex_start + ex_dur

        # Overlap: two intervals [s1,e1) and [s2,e2) overlap if s1 < e2 and s2 < e1
        if new_start < ex_end and ex_start < new_end:
            return True, f"{b.get('time')} ({b.get('duration')})"

    return False, ''


def get_booked_slots(bookings, date):
    """Return list of {time, duration, end} for a given date."""
    result = []
    for b in bookings:
        if b.get('date') != date:
            continue
        start = parse_time_to_hours(b.get('time', ''))
        if start is None:
            continue
        dur = parse_duration_hours(b.get('duration', '2 hours'))
        result.append({
            'time': b.get('time'),
            'duration': b.get('duration'),
            'startH': start,
            'endH': start + dur
        })
    return result


def send_telegram(booking):
    """Send booking notification to Captain Ian via Telegram."""
    try:
        b = booking
        price = f"${int(float(b.get('price', 0))):,}" if b.get('price') else 'N/A'
        msg = (
            f"🛥️ *NEW BOOKING REQUEST*\n"
            f"━━━━━━━━━━━━━━━━\n\n"
            f"👤 *{b.get('name', 'N/A')}*\n"
            f"📧 {b.get('email', '—')}\n"
            f"📱 {b.get('phone', '—')}\n\n"
            f"🎯 *{b.get('cruise', 'N/A')}*\n"
            f"📅 {b.get('date', 'N/A')} · {b.get('time', '')}\n"
            f"⏱ {b.get('duration', 'N/A')}\n"
            f"👥 {b.get('guests', '?')} guests\n"
            f"💰 {price}\n\n"
            f"📋 [Open Admin Panel](https://yanhs.stream/yacht/admin.html)"
        )
        url = (
            f"https://api.telegram.org/bot{TG_BOT_TOKEN}/sendMessage"
            f"?chat_id={TG_CAPTAIN_CHAT_ID}"
            f"&text={quote(msg)}"
            f"&parse_mode=Markdown"
            f"&disable_web_page_preview=true"
        )
        req = Request(url, method='GET')
        urlopen(req, timeout=5)
    except Exception as e:
        print(f"Telegram notification failed: {e}")


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key')

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_PUT(self):
        """Update booking status (admin only)."""
        parsed = urlparse(self.path)
        if not parsed.path.startswith('/booking/'):
            return self._json(404, {'error': 'not found'})
        key = self.headers.get('X-Admin-Key', '')
        if key != ADMIN_KEY:
            return self._json(403, {'error': 'unauthorized'})
        try:
            booking_id = int(parsed.path.split('/')[2])
        except (IndexError, ValueError):
            return self._json(400, {'error': 'invalid booking id'})
        length = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw)
        except Exception:
            return self._json(400, {'error': 'invalid json'})
        new_status = data.get('status', '')
        if new_status not in ('confirmed', 'cancelled', 'new'):
            return self._json(400, {'error': 'invalid status'})
        with lock:
            bookings = load_bookings()
            found = False
            for b in bookings:
                if b.get('id') == booking_id:
                    b['status'] = new_status
                    found = True
                    break
            if not found:
                return self._json(404, {'error': 'booking not found'})
            save_bookings(bookings)
        self._json(200, {'success': True, 'id': booking_id, 'status': new_status})

    def do_POST(self):
        """Accept a new booking."""
        if self.path != '/book':
            return self._json(404, {'error': 'not found'})
        length = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw)
        except Exception:
            return self._json(400, {'error': 'invalid json'})

        booking = {
            'id': int(time.time() * 1000),
            'timestamp': datetime.now().isoformat(),
            'name': data.get('name', ''),
            'email': data.get('email', ''),
            'phone': data.get('phone', ''),
            'date': data.get('date', ''),
            'cruise': data.get('cruise', ''),
            'cruiseType': data.get('cruiseType', ''),
            'time': data.get('time', ''),
            'duration': data.get('duration', ''),
            'guests': data.get('guests', ''),
            'price': data.get('price', ''),
            'paymentMethod': data.get('paymentMethod', ''),
            'status': 'new',
            'notes': ''
        }

        with lock:
            bookings = load_bookings()

            # Check for time overlap — only one yacht!
            has_conflict, conflict_with = check_overlap(
                bookings, booking['date'], booking['time'], booking['duration']
            )
            if has_conflict:
                return self._json(409, {
                    'error': 'time_conflict',
                    'message': f'This time overlaps with an existing booking at {conflict_with}. Please choose a different time.'
                })

            bookings.append(booking)
            save_bookings(bookings)

        # Send Telegram notification in background
        threading.Thread(target=send_telegram, args=(booking,), daemon=True).start()

        self._json(201, {'success': True, 'id': booking['id']})

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        # Public: get booked slots for a date
        if path == '/slots':
            date = qs.get('date', [''])[0]
            if not date:
                return self._json(400, {'error': 'date parameter required'})
            with lock:
                bookings = load_bookings()
            slots = get_booked_slots(bookings, date)
            return self._json(200, slots)

        # Public: get all dates with bookings for a given month
        if path == '/booked-dates':
            year = qs.get('year', [''])[0]
            month = qs.get('month', [''])[0]
            if not year or not month:
                return self._json(400, {'error': 'year and month parameters required'})
            prefix = f"{year}-{month.zfill(2)}-"
            with lock:
                bookings = load_bookings()
            dates = sorted(set(b['date'] for b in bookings if b.get('date', '').startswith(prefix)))
            return self._json(200, dates)

        # Public: get bookings for a specific email
        if path == '/my-bookings':
            email = qs.get('email', [''])[0].strip().lower()
            if not email:
                return self._json(400, {'error': 'email parameter required'})
            with lock:
                bookings = load_bookings()
            mine = [
                {
                    'id': b['id'],
                    'date': b.get('date', ''),
                    'time': b.get('time', ''),
                    'cruise': b.get('cruise', ''),
                    'duration': b.get('duration', ''),
                    'guests': b.get('guests', ''),
                    'price': b.get('price', ''),
                    'status': b.get('status', 'new'),
                    'name': b.get('name', ''),
                }
                for b in bookings
                if b.get('email', '').strip().lower() == email
            ]
            mine.sort(key=lambda x: x.get('date', ''), reverse=True)
            return self._json(200, mine)

        # Admin: all bookings
        if path.startswith('/bookings'):
            key = self.headers.get('X-Admin-Key', '')
            if key != ADMIN_KEY:
                return self._json(403, {'error': 'unauthorized'})
            with lock:
                bookings = load_bookings()
            return self._json(200, bookings)

        if path == '/health':
            return self._json(200, {'status': 'ok'})

        self._json(404, {'error': 'not found'})

    def log_message(self, fmt, *args):
        pass  # silent


if __name__ == '__main__':
    port = 8901
    server = HTTPServer(('127.0.0.1', port), Handler)
    print(f'Yacht API running on :{port}')
    server.serve_forever()
