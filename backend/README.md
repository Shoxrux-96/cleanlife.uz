# BRENDOR ERP — Backend API (Django + Django REST Framework)

Loyiha: BRENDOR — HoReCa Brending va Logo Joylashtirish ERP tizimi.
Backend: Django 4.2 + Django REST Framework 3.15.

## Ishga tushirish

```bash
cd backend
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py seed_data --clear   # boshlang'ich (demo) ma'lumotlar
python manage.py runserver 0.0.0.0:8000
```

## Bazа (PostgreSQL)

DB Docker konteynerida: `brendor-postgres` (postgres:16-alpine), port **5435**.

| Parametr | Qiymat (default) | Env o'zgaruvchi |
|----------|------------------|-----------------|
| NAME | `brendor_erp` | `POSTGRES_DB` |
| USER | `brendor` | `POSTGRES_USER` |
| PASSWORD | `brendor123` | `POSTGRES_PASSWORD` |
| HOST | `127.0.0.1` | `POSTGRES_HOST` |
| PORT | `5435` | `POSTGRES_PORT` |

Konteynerni qayta ishga tushirish:
```bash
docker start brendor-postgres   # to'xtagan bo'lsa
```

Seed qayta ishga tushirish (jadvallarni tozalab, demo ma'lumotlar bilan qayta toldiradi):
```bash
python manage.py seed_data --clear
```

API bazaviy URL: `http://localhost:8000/api/`

Barcha list endpointlari paginatsiyali: `?page=2&page_size=100` (page_size 1000 gacha).
Qidiruv: `?search=...` (search_fields bo'yicha), Tartiblash: `?ordering=-created_at`.

---

## API ENDPOINTLAR

### 1. Moliyaviy Tranzaksiyalar — `/api/transactions/`

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/api/transactions/` | Tranzaksiyalar ro'yxati (paginatsiya, search, ordering) |
| POST | `/api/transactions/` | Yangi tranzaksiya yaratish |
| GET | `/api/transactions/{id}/` | Bitta tranzaksiya |
| PUT/PATCH | `/api/transactions/{id}/` | Tranzaksiyani yangilash |
| DELETE | `/api/transitions/{id}/` | Tranzaksiyani o'chirish |

**POST body:**
```json
{
  "type": "kirim",
  "category": "Mijoz to‘lovi",
  "amount": 14500000,
  "payment_method": "bank_transfer",
  "date": "2026-09-28",
  "description": "Sulton Saroy: 100% to‘liq to‘lov",
  "related_client": "Sulton Saroy Restorani",
  "related_order_id": 1
}
```
`type`: `kirim` | `chiqim` · `payment_method`: `naqd` | `bank_transfer` | `payme_click`

---

### 2. Xom-ashyo (Kirim materiallari) — `/api/materials/`

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/api/materials/` | Materiallar ro'yxati |
| POST | `/api/materials/` | Yangi material yaratish |
| GET/PUT/PATCH/DELETE | `/api/materials/{id}/` | Ko'rish / yangilash / o'chirish |

**POST body:**
```json
{
  "name": "Salfetka uchun kompozit folga",
  "batch_number": "FLG-2026-081",
  "category": "Qadoq & Karton",
  "unit": "m",
  "quantity": 4800,
  "min_threshold": 2000,
  "unit_cost": 150,
  "supplier": "O‘zbekiston Polimer Qadoq MCHJ",
  "storage_location": "A-Bino, 2-Qator, 3-Polka",
  "status": "yetarli"
}
```
`status`: `yetarli` | `ogohlantirish` | `kritik` · `unit`: `dona|kg|gr|litr|m|pachka|blok|metr|bobina|rulon`

---

### 3. Tayyor Mahsulotlar — `/api/products/`

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/api/products/` | Mahsulotlar ro'yxati (BOM bilan) |
| POST | `/api/products/` | Yangi mahsulot yaratish |
| GET/PUT/PATCH/DELETE | `/api/products/{id}/` | Ko'rish / yangilash / o'chirish |

**POST body:**
```json
{
  "name": "Korporativ Piqué Polo Futbolka",
  "sku": "HRC-POLO-003",
  "category": "kiyimlar",
  "base_cost": 38000,
  "branding_cost": 14000,
  "packaging_cost": 2000,
  "labor_cost": 8000,
  "selling_price": 85000,
  "min_order": 15,
  "stock_count": 320,
  "sold_count": 4200,
  "technique": "Ko‘krakda nafis kashta",
  "specification": "100% taralgan paxta piqué 220g/m²",
  "bom": [
    {"material_id": 7, "material_name": "Tayyor polo blankalari", "quantity_needed": 1, "unit": "dona", "unit_cost": 38000, "total_cost": 38000}
  ]
}
```
`category`: `kiyimlar|stol|qadoq|aksessuar|toqimachilik`

---

### 4. Buyurtmalar — `/api/orders/`

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/api/orders/` | Buyurtmalar ro'yxati (items bilan) |
| POST | `/api/orders/` | Yangi buyurtma yaratish |
| GET/PUT/PATCH/DELETE | `/api/orders/{id}/` | Ko'rish / yangilash / o'chirish |
| POST | `/api/orders/{id}/status/` | **Status o'zgartirish (qoidalar bilan)** |

**POST body:**
```json
{
  "order_number": "ORD-1086",
  "client_name": "Javohir Usmonov",
  "phone": "+998 90 911-22-33",
  "businessType": "Premium Restoran",
  "productName": "Korporativ Piqué Polo",
  "items": [{"product_id": 3, "product_name": "Polo", "quantity": 300, "unit_price": 85000, "total_price": 25500000}],
  "quantity": 300,
  "total_amount": 25500000,
  "paid_amount": 25500000,
  "estimated_cost": 15000000,
  "status": "jarayonda",
  "order_date": "2026-10-01",
  "delivery_date": "2026-10-10",
  "technique": "Oltin monogrammali kashta"
}
```
`status`: `jarayonda|tayyorlandi|jonatildi|yetkazildi`

**Status o'zgartirish qoidalari:**
- `yetkazildi` ga o'tkazish uchun `delivered_quantity >= quantity` bo'lishi shart (aks holda 400 xato)
- To'liq yetkazilgan buyurtma holati **qotirilgan** — o'zgartirib bo'lmaydi (400 xato)

**POST /api/orders/{id}/status/ body:** `{"status": "jonatildi"}`

---

### 5. Mijozlar (CRM) — `/api/clients/`

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/api/clients/` | Mijozlar ro'yxati |
| POST | `/api/clients/` | Yangi mijoz yaratish |
| GET/PUT/PATCH/DELETE | `/api/clients/{id}/` | Ko'rish / yangilash / o'chirish |

**POST body:**
```json
{
  "name": "Javohir Usmonov",
  "company": "Sulton Saroy Restorani",
  "type": "B2B",
  "phone": "+998 90 911-22-33",
  "email": "info@sultonsaroy.uz",
  "source": "Tavsiya (Hamkorlar)",
  "region": "Toshkent shahri",
  "district": "Mirzo Ulug‘bek tumani",
  "address": "Mustaqillik shoh ko‘chasi, 45-uy",
  "status": "faol"
}
```
`type`: `B2B|B2C` · `status`: `faol|nofaol`

---

### 6. Xodimlar (HR) — `/api/employees/`

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/api/employees/` | Xodimlar ro'yxati |
| POST | `/api/employees/` | Yangi xodim yaratish |
| GET/PUT/PATCH/DELETE | `/api/employees/{id}/` | Ko'rish / yangilash / o'chirish |

**POST body:**
```json
{
  "full_name": "Rustam Boltayev",
  "position": "Yetkazib berish haydovchisi (Isuzu / Labo)",
  "department": "Logistika",
  "phone": "+998 94 667-88-99",
  "status": "active",
  "salary": 5800000,
  "join_date": "2024-03-01",
  "kpi_score": 95
}
```
`department`: `Ishlab chiqarish|Sifat nazorati|Omborxona va Taʼminot|Logistika|Muhandislik va Texnika|Maʼmuriyat`
`status`: `active|on_leave|probation`

---

### 7. Ish Haqi (Oylik) — `/api/payroll/`

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/api/payroll/` | Oylik ro'yxati |
| POST | `/api/payroll/` | Yangi oylik yozuvi |
| GET/PUT/PATCH/DELETE | `/api/payroll/{id}/` | Ko'rish / yangilash / o'chirish |
| POST | `/api/payroll/{id}/status/` | To'lov holatini o'zgartirish |

**POST body:**
```json
{
  "employee_id": 6,
  "employee_name": "Rustam Boltayev",
  "position": "Kuryer Haydovchi",
  "department": "Logistika",
  "month": "Oktabr 2026",
  "base_salary": 5800000,
  "bonus_amount": 750000,
  "deductions": 786000,
  "net_salary": 5764000,
  "status": "kutilmoqda"
}
```
`status`: `to_langan|jarayonda|kutilmoqda` — `to_langan` qilinsa `payment_date` avtomatik yoziladi.

---

### 8. Bonuslar (KPI) — `/api/bonuses/`

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/api/bonuses/` | Bonuslar ro'yxati |
| POST | `/api/bonuses/` | Yangi bonus yaratish |
| GET/PUT/PATCH/DELETE | `/api/bonuses/{id}/` | Ko'rish / yangilash / o'chirish |

**POST body:**
```json
{
  "employee_id": 6,
  "employee_name": "Rustam Boltayev",
  "kpi_type": "Tezkor sifatli yetkazish",
  "amount": 750000,
  "date": "2026-09-28",
  "status": "kutilmoqda",
  "notes": "Barcha yuk xatlarini 1 soat oldin topshirdi"
}
```
`kpi_type`: `Rejani ortigʻi bilan bajarish|Brak foizini kamaytirish|Tezkor sifatli yetkazish|Mehnat intizomi va tashabbus`
`status`: `tasdiqlangan|kutilmoqda`

---

### 9. Yuk Xatlari (TTN) — `/api/waybills/`

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/api/waybills/` | Yuk xatlari ro'yxati (items bilan) |
| POST | `/api/waybills/` | **Yangi yuk xati yaratish (avtomatik biznes-amallar bilan)** |
| GET/PUT/PATCH/DELETE | `/api/waybills/{id}/` | Ko'rish / yangilash / o'chirish |
| POST | `/api/waybills/{id}/status/` | Yuk xati holatini o'zgartirish (reyslarni sinxronlaydi) |

**POST body:**
```json
{
  "order_id": 1,
  "order_number": "ORD-1082",
  "ttn_number": "TTN-2026-1002",
  "category": "sotuv",
  "sender_company": "“BRENDOR INDUSTRIAL MANUFACTURE” MCHJ",
  "sender_address": "Toshkent sh., Chilonzor tumani, 2-Sanoat hududi, 14-bino",
  "receiver_company": "“SULTON SAROY RESTAURANT & LOUNGE” MCHJ",
  "receiver_phone": "+998 90 911-22-33",
  "receiver_address": "Toshkent sh., Mirzo Ulug‘bek tumani, Mustaqillik shoh ko‘chasi, 45-uy",
  "driver_name": "Rustam Boltayev",
  "driver_license": "AF 382910",
  "vehicle_plate": "01 774 AAB",
  "vehicle_model": "Chevrolet Labo Max",
  "items": [
    {"name": "Korporativ Piqué Polo Futbolka", "unit": "dona", "quantity": 200, "unit_price": 85000, "total_price": 17000000},
    {"name": "Restoran Kanvas Oshpaz Fartugi", "unit": "dona", "quantity": 100, "unit_price": 115000, "total_price": 11500000}
  ],
  "total_sum": 28500000,
  "issue_date": "2026-09-30",
  "issue_time": "11:15",
  "status": "kutilmoqda",
  "route_from": "Brendor Asosiy Tsex Ombori",
  "route_to": "Sulton Saroy Restorani Ombori",
  "responsible_shipper": "Shuxrat Karimov (Ombor mudiri)",
  "seal_number": "SEAL-UZ-89104"
}
```
`category`: `sotuv|xarid` · `status`: `kutilmoqda|yo_lda|yetkazildi`

**Yuk xati yaratilganda avtomatik:**
1. Moliya tranzaksiyasi yaratiladi (sotuv → `kirim`, xarid → `chiqim`)
2. Bog'langan buyurtmaning `delivered_quantity` yangilanadi; to'liq yetkazilsa `status=yetkazildi`, aks holda `jonatildi`
3. **Har yuk xati alohida yetkazib berish reysi** yaratiladi (`/api/deliveries/` da)
4. Tayyor mahsulotlar omboridan (stock) miqdori ayiriladi

---

### 10. Yetkazib Berish Reyslari — `/api/deliveries/`

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/api/deliveries/` | Reyslar ro'yxati (yuk xati bilan bog'langan) |
| POST | `/api/deliveries/` | Qo'lda yangi reys yaratish |
| GET/PUT/PATCH/DELETE | `/api/deliveries/{id}/` | Ko'rish / yangilash / o'chirish |
| POST | `/api/deliveries/{id}/status/` | **Holat o'zgartirish (qotish qoidasi bilan)** |
| GET | `/api/deliveries/stats/` | **Kunlik/Oylik/Yillik statistika** |

**POST body (qo'lda reys):**
```json
{
  "trip_code": "REYS-100",
  "driver_name": "Rustam Boltayev",
  "driver_phone": "+998 94 667-88-99",
  "vehicle_model": "Chevrolet Labo Max",
  "vehicle_plate": "01 774 AAB",
  "destination_address": "Toshkent sh., Mustaqillik shohi, 45-uy",
  "client_name": "Sulton Saroy Restorani",
  "order_number": "ORD-1082",
  "cargoSummary": "200 dona polo, 100 fartuk",
  "status": "kutilmoqda",
  "delivery_fee": 500000
}
```
`status`: `kutilmoqda|yolda|yetkazildi`

**QOTISH QOIDASI:** `yetkazildi` holatiga o'tgan reysni hech kim o'zgartira olmaydi (400 xato qaytariladi). `yetkazildi` ga o'tkazilganda `completed_time` avtomatik yoziladi.

**POST /api/deliveries/{id}/status/ body:** `{"status": "yolda", "updated_by": "Admin"}`

**GET /api/deliveries/stats/** — javob:
```json
{
  "day":   {"trip_count": 3, "total_delivery_fee": 1500000},
  "month": {"trip_count": 45, "total_delivery_fee": 12500000},
  "year":  {"trip_count": 320, "total_delivery_fee": 98000000}
}
```
`?period=day|month|year` — bitta davrni qaytaradi.

---

### 11. Dashboard Umumiy Statistikasi — `/api/stats/overview/`

| Metod | Endpoint | Tavsif |
|-------|----------|--------|
| GET | `/api/stats/overview/` | Barcha ko'rsatkichlar bir so'rovda |

**Javob:**
```json
{
  "trips": {
    "day": {"trip_count": 3, "total_delivery_fee": 1500000},
    "month": {"trip_count": 45, "total_delivery_fee": 12500000},
    "year": {"trip_count": 320, "total_delivery_fee": 98000000},
    "active_now": 2,
    "completed_total": 318
  },
  "orders": {"total": 5, "delivered": 2, "in_progress": 3},
  "waybills": {"total": 4, "delivered": 3},
  "clients": {"total": 6},
  "employees": {"total": 7},
  "products": {"total": 6},
  "materials": {"total": 12},
  "payroll": {"total": 6, "paid": 3},
  "bonuses": {"total": 4, "approved": 3}
}
```

---

## Mobil ilova uchun (React Native) tavsiyalar

- Barcha so'rovlar `http://<host>:8000/api/...` ga JSON POST/GET
- List endpointlarda paginatsiya: `?page=1&page_size=20`
- Qidiruv: `?search=so'z`
- Tartiblash: `?ordering=-created_at` (minus — kamayish tartibi)
- Status o'zgartirish uchun alohida endpointlar: `POST /{id}/status/`
- Xatolik javoblari: `{"detail": "xato matni"}` (400/404/500)
