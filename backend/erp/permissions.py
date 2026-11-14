"""Rolga asoslangan ruxsat sinflari."""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class AdminWritesOnly(BasePermission):
    """Ko'rish — autentifikatsiyadan o'tgan har qanday foydalanuvchi uchun;
    yaratish/tahrirlash/o'chirish — faqat `admin` roli uchun.
    """

    message = 'Bu amal faqat admin uchun ruxsat etilgan.'

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not (user and getattr(user, 'is_authenticated', False)):
            return False
        if request.method in SAFE_METHODS:
            return True
        return getattr(user, 'role', None) == 'admin'
