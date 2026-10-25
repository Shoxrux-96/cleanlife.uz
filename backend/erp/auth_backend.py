"""Oddiy token autentifikatsiyasi: Authorization: Token <key>.

Bu Django User'ga bog'liq emas — login natijasida chiqarilgan `AuthToken` yozuvini topadi va
`request.user`'ga token egasini qo'yadi (DRF `IsAuthenticated` ishlasin uchun).
"""
from __future__ import annotations

from datetime import timedelta
from typing import Optional, Tuple

from django.utils import timezone
from rest_framework import authentication, exceptions

from .models import AuthToken

TOKEN_TTL_DAYS = 30


class _TokenUser:
    """DRF `IsAuthenticated` uchun minimal foydalanuvchi obyekti.

    Haqiqiy Django User'ni almashtiradi: `is_authenticated=True` yetarli.
    """

    __slots__ = ('token', 'id', 'role', 'name', 'employee_id')

    def __init__(self, token: AuthToken):
        self.token = token
        self.id = token.id
        self.role = token.role
        self.name = token.name
        self.employee_id = token.employee_id

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False

    @property
    def is_staff(self) -> bool:
        return self.role == 'admin'

    @property
    def is_superuser(self) -> bool:
        return self.role == 'admin'

    def __str__(self):
        return f'{self.role}:{self.name or self.employee_id or self.id}'


class TokenAuthentication(authentication.BaseAuthentication):
    """`Authorization: Token <key>` orqali kiradi."""

    keyword = 'Token'

    def authenticate(self, request) -> Optional[Tuple[_TokenUser, AuthToken]]:
        auth = authentication.get_authorization_header(request).split()
        if not auth or auth[0].lower() != self.keyword.lower().encode():
            return None
        if len(auth) == 1:
            raise exceptions.AuthenticationFailed('Token noto‘g‘ri yuborilgan.')
        if len(auth) > 2:
            raise exceptions.AuthenticationFailed('Token qiymatida bo‘sh joy bo‘lmasligi kerak.')
        try:
            key = auth[1].decode()
        except UnicodeError:
            raise exceptions.AuthenticationFailed('Token UTF-8 bo‘lishi kerak.')

        try:
            tok = AuthToken.objects.get(key=key)
        except AuthToken.DoesNotExist:
            raise exceptions.AuthenticationFailed('Token yaroqsiz yoki muddati o‘tgan.')

        # TTL tekshiruvi
        if tok.created_at < timezone.now() - timedelta(days=TOKEN_TTL_DAYS):
            tok.delete()
            raise exceptions.AuthenticationFailed('Token muddati o‘tgan. Qayta kiring.')

        # last_used_at ni soat sayin yangilaymiz (bir vaqtda ko'p write qilmaslik uchun)
        now = timezone.now()
        if not tok.last_used_at or (now - tok.last_used_at) > timedelta(hours=1):
            AuthToken.objects.filter(pk=tok.pk).update(last_used_at=now)

        return (_TokenUser(tok), tok)

    def authenticate_header(self, request) -> str:
        return self.keyword
