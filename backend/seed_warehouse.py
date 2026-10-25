"""Omborxona sahifasi uchun demo ishlab chiqarish partiyalarini bazaga yozadi.

Web va mobil ilova "Mahsulot Ombori" yozuvlarini API dan (FinancialTransaction,
category = 'Mahsulot ishlab chiqarish') o'qiydi — shuning uchun demo partiyalar
ham shu jadvalga yoziladi va ikkala ilova bir xil ma'lumotni ko'radi.

Ishga tushirish:
    cd backend && venv/bin/python seed_warehouse.py
"""
import os
import sys
from datetime import datetime, timedelta, timezone as dt_timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

from erp.models import ErpProduct, FinancialTransaction  # noqa: E402

TASHKENT = dt_timezone(timedelta(hours=5))

CATEGORY = "Mahsulot ishlab chiqarish"

# (SKU, miqdor, sotuv narxi, kun farqi (None = o'tgan oy oxiri), soat, izoh)
RECORDS = [
    ("HRC-APRON-002", 40, 115000, 0, "11:30", "Ertalabki tikuv smenasi"),
    ("HRC-POLO-003", 80, 85000, 0, "09:15", "Kashtachilik sexi partiyasi"),
    ("HRC-WIPE-001", 3500, 750, 2, "16:45", "Avtomat qadoqlash liniyasi"),
    ("HRC-BAG-005", 1200, 3200, 3, "14:20", "Ipak bosma sexi"),
    ("HRC-BOX-004", 500, 2800, 4, "10:00", "Oktyabr oylik 1-partiya"),
    ("HRC-CAP-006", 25, 58000, None, "17:00", "Sentyabr oylik yakuniy partiya"),
]


def description(name: str, sku: str, qty: int, price: int, note: str) -> str:
    base = f"Tayyor mahsulot: {name} — {qty} dona × {price} so'm (SKU: {sku})"
    return f"{base} — {note}"


def main() -> None:
    today = datetime.now(TASHKENT).date()

    # Eski demo yozuvlarni tozalash (faqat shu kategoriyadagilar)
    old = FinancialTransaction.objects.filter(category=CATEGORY)
    count_old = old.count()
    old.delete()

    created = 0
    for sku, qty, price, days_ago, time_str, note in RECORDS:
        product = ErpProduct.objects.filter(sku=sku).first()
        if product is None:
            print(f"! Mahsulot topilmadi: {sku}")
            continue
        day = (
            today - timedelta(days=days_ago)
            if days_ago is not None
            else today.replace(day=1) - timedelta(days=1)
        )
        stamp = datetime.combine(day, datetime.strptime(time_str, "%H:%M").time(), TASHKENT)
        tx = FinancialTransaction.objects.create(
            type="chiqim",
            category=CATEGORY,
            amount=qty * price,
            payment_method="bank_transfer",
            date=day,
            description=description(product.name, sku, qty, price, note),
        )
        # created_at avtomatik qo'yiladi — demo vaqtini qo'lda o'rnatamiz
        FinancialTransaction.objects.filter(pk=tx.pk).update(created_at=stamp)
        created += 1
        print(
            f"+ {day} {time_str} | {product.name} | +{qty} dona × {price} so'm "
            f"= {qty * price:,} so'm"
        )

    print(f"\nYaratildi: {created} ta yozuv (eskisi: {count_old})")


if __name__ == "__main__":
    main()
