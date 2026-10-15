"""Login xavfsizligi: brute-force lockout, parol tekshirish, kirish validatsiyasi.

SQL injection: loyihada xom SQL yo'q — barcha so'rovlar Django ORM orqali
 avtomatik parametrlanadi. Bu modul qo'shimcha himoya qatlamlarini beradi:
 - login/parol formati va uzunligi validatsiyasi (g'ayritabiiy yukni erta rad etish),
 - IP+login bo'yicha muvaffaqiyatsiz urinishlar lockouti (brute-force/DoS),
 - eski ochiq-matn parollarni xavfsiz xeshga ko'tarish (transparent upgrade).
"""
import re

from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache

# Login/parol uchun ruxsat etilgan belgilar (harf, raqam va asosiy belgilar).
# SQL kalit so'zlar, quote va comment belgilari bloklanadi.
LOGIN_RE = re.compile(r'^[\w.@+\-]{1,150}$')
PASSWORD_RE = re.compile(r'^[^\s\x00-\x1f]{1,150}$')

MAX_FAILS = 5  # bloklashdan oldingi muvaffaqiyatsiz urinishlar
LOCKOUT_SECONDS = 15 * 60  # 15 daqiqa blok


def validate_login_input(login: str, password: str) -> str | None:
    """Noto'g'ri format bo'lsa xato matni, aks holda None qaytaradi."""
    if not isinstance(login, str) or not isinstance(password, str):
        return 'Login va parol matn bo‘lishi shart.'
    login = login.strip()
    if not login or not password:
        return 'Login va parolni kiriting.'
    if len(login) > 150 or len(password) > 150:
        return 'Login yoki parol juda uzun (maks. 150 belgi).'
    if not LOGIN_RE.match(login):
        return 'Loginda ruxsat etilmagan belgilar bor.'
    if not PASSWORD_RE.match(password):
        return 'Parolda ruxsat etilmagan belgilar bor.'
    return None


def _fail_key(ip: str, login: str) -> str:
    return f'login_fail:{ip}:{login.lower()}'


def _lock_key(ip: str, login: str) -> str:
    return f'login_lock:{ip}:{login.lower()}'


def is_locked_out(ip: str, login: str) -> bool:
    return bool(cache.get(_lock_key(ip, login)))


def record_login_fail(ip: str, login: str) -> int:
    """Muvaffaqiyatsiz urinishni yozadi. Qolgan urinishlar sonini qaytaradi (0 = blok)."""
    key = _fail_key(ip, login)
    try:
        fails = (cache.get(key) or 0) + 1
    except Exception:
        fails = 1
    cache.set(key, fails, LOCKOUT_SECONDS)
    if fails >= MAX_FAILS:
        cache.set(_lock_key(ip, login), True, LOCKOUT_SECONDS)
        return 0
    return MAX_FAILS - fails


def clear_login_fails(ip: str, login: str) -> None:
    cache.delete(_fail_key(ip, login))
    cache.delete(_lock_key(ip, login))


def is_password_hashed(value: str) -> bool:
    return bool(value) and ('$' in value) and value.split('$', 1)[0] in (
        'pbkdf2_sha256', 'argon2', 'bcrypt', 'sha1', 'md5', 'crypt',
    )


def hash_password(raw: str) -> str:
    return make_password(raw)


def verify_password(stored: str, raw: str) -> tuple[bool, bool]:
    """(mos_keldimi, yangilash_kerakmi). Eski ochiq-matn ham qabul qilinadi (upgrade uchun)."""
    if not stored or not raw:
        return False, False
    if is_password_hashed(stored):
        try:
            return check_password(raw, stored), False
        except Exception:
            return False, False
    # Legacy: ochiq matn (doimiy taqqoslash emas, lekin qiymat qisqa va tez)
    import hmac
    ok = hmac.compare_digest(str(stored), str(raw))
    return ok, ok


def get_client_ip(request) -> str:
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')
