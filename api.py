#!/usr/bin/env python3
"""Yacht Gorgeous — Booking API (no dependencies, stdlib only)."""
import json, os, threading, time
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.parse import quote

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
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
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
            bookings.append(booking)
            save_bookings(bookings)

        # Send Telegram notification in background
        threading.Thread(target=send_telegram, args=(booking,), daemon=True).start()

        self._json(201, {'success': True, 'id': booking['id']})

    def do_GET(self):
        """Return bookings (requires admin key)."""
        if self.path.startswith('/bookings'):
            key = self.headers.get('X-Admin-Key', '')
            if key != ADMIN_KEY:
                return self._json(403, {'error': 'unauthorized'})
            with lock:
                bookings = load_bookings()
            return self._json(200, bookings)

        if self.path == '/health':
            return self._json(200, {'status': 'ok'})

        self._json(404, {'error': 'not found'})

    def log_message(self, fmt, *args):
        pass  # silent


if __name__ == '__main__':
    port = 8901
    server = HTTPServer(('127.0.0.1', port), Handler)
    print(f'Yacht API running on :{port}')
    server.serve_forever()
