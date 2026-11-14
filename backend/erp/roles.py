"""Lavozimdan rolni aniqlash — bitta joyda saqlanadigan qoida.

Rollar:
- admin   — korxona bosh admini (CompanyInfo.admin_login orqali).
- manager — barcha boshqaruv modullariga kirish (HR faqat ko'rish).
- driver  — haydovchi: alohida interfeys.
- basic   — oddiy ishchi: faqat o'z profiliga xizmat (Face ID, davomat, maosh).
"""

# Faqat o'z-o'ziga xizmat ko'rsatish (basic) toifasiga tushadigan lavozim kalit so'zlari.
BASIC_POSITIONS = ('elektrik', 'oshpaz', 'qarovul')
DRIVER_POSITIONS = ('haydovchi', 'driver', 'voditel')


def role_for_position(position: str | None) -> str:
    p = (position or '').lower()
    if any(k in p for k in DRIVER_POSITIONS):
        return 'driver'
    if any(k in p for k in BASIC_POSITIONS):
        return 'basic'
    return 'manager'
