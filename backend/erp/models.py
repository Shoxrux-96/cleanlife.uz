from datetime import time

from django.db import models


class FinancialTransaction(models.Model):
    TRANSACTION_TYPES = [('kirim', 'Kirim'), ('chiqim', 'Chiqim')]
    PAYMENT_METHODS = [
        ('naqd', 'Naqd'),
        ('bank_transfer', "Bank o'tkazmasi"),
        ('payme_click', 'Payme/Click'),
    ]

    type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    category = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='naqd')
    date = models.DateField()
    description = models.TextField(blank=True, default='')
    related_client = models.CharField(max_length=255, blank=True, null=True)
    related_order = models.ForeignKey('ErpOrder', on_delete=models.SET_NULL, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f"{self.type} — {self.category} — {self.amount}"


class RawMaterial(models.Model):
    UNITS = [
        ('dona', 'dona'), ('kg', 'kg'), ('gr', 'gr'), ('litr', 'litr'),
        ('m', 'm'), ('pachka', 'pachka'), ('blok', 'blok'),
        ('metr', 'metr'), ('bobina', 'bobina'), ('rulon', 'rulon'),
    ]
    STATUSES = [('yetarli', 'Yetarli'), ('ogohlantirish', 'Ogohlantirish'), ('kritik', 'Kritik')]

    name = models.CharField(max_length=255)
    batch_number = models.CharField(max_length=100, blank=True, default='')
    category = models.CharField(max_length=100, blank=True, default='')
    unit = models.CharField(max_length=20, choices=UNITS, default='dona')
    quantity = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    min_threshold = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    supplier = models.CharField(max_length=255, blank=True, default='')
    counterparty = models.CharField(max_length=255, blank=True, null=True)
    payment_method = models.CharField(max_length=100, blank=True, null=True)
    last_restocked = models.DateTimeField(blank=True, null=True)
    storage_location = models.CharField(max_length=255, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUSES, default='yetarli')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return self.name


class ErpProduct(models.Model):
    CATEGORIES = [
        ('kiyimlar', 'Kiyimlar'), ('stol', 'Stol'), ('qadoq', 'Qadoq'),
        ('aksessuar', 'Aksessuar'), ('toqimachilik', 'Toqimachilik'),
    ]

    name = models.CharField(max_length=255)
    image_url = models.TextField(blank=True, null=True)  # URL yoki base64 DataURL (fayl yuklash)
    category = models.CharField(max_length=50, choices=CATEGORIES, default='qadoq')
    sku = models.CharField(max_length=100, blank=True, default='')
    base_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    branding_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    packaging_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    labor_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    min_order = models.PositiveIntegerField(default=1)
    stock_count = models.PositiveIntegerField(default=0)
    sold_count = models.PositiveIntegerField(default=0)
    technique = models.CharField(max_length=255, blank=True, default='')
    specification = models.TextField(blank=True, default='')
    ready_date = models.DateField(blank=True, null=True)
    batch_number = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return self.name


class BomItem(models.Model):
    product = models.ForeignKey(ErpProduct, on_delete=models.CASCADE, related_name='bom')
    material = models.ForeignKey(RawMaterial, on_delete=models.SET_NULL, blank=True, null=True)
    material_name = models.CharField(max_length=255, blank=True, default='')
    quantity_needed = models.DecimalField(max_digits=14, decimal_places=3, default=0)
    unit = models.CharField(max_length=20, default='dona')
    unit_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.material_name} — {self.quantity_needed} {self.unit}"


class ErpOrderItem(models.Model):
    order = models.ForeignKey('ErpOrder', on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(ErpProduct, on_delete=models.SET_NULL, blank=True, null=True)
    product_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"


class ErpOrder(models.Model):
    STATUSES = [
        ('jarayonda', 'Jarayonda'),
        ('tayyorlandi', 'Tayyorlandi'),
        ('jonatildi', 'Jo‘natildi'),
        ('yetkazildi', 'Yetkazildi'),
    ]

    order_number = models.CharField(max_length=50, unique=True)
    company = models.CharField(max_length=255, blank=True, null=True)
    client_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, blank=True, default='')
    business_type = models.CharField(max_length=255, blank=True, default='')
    product_name = models.CharField(max_length=255, blank=True, default='')
    quantity = models.PositiveIntegerField(default=0)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    estimated_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUSES, default='jarayonda')
    order_date = models.DateField()
    delivery_date = models.DateField(blank=True, null=True)
    technique = models.CharField(max_length=255, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    ttn_number = models.CharField(max_length=255, blank=True, default='')
    delivered_quantity = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-order_date', '-id']

    def __str__(self):
        return self.order_number


class ErpClient(models.Model):
    TYPES = [('B2B', 'B2B'), ('B2C', 'B2C')]
    STATUSES = [('faol', 'Faol'), ('nofaol', 'Nofaol')]

    name = models.CharField(max_length=255)
    company = models.CharField(max_length=255, blank=True, default='')
    type = models.CharField(max_length=10, choices=TYPES, default='B2B')
    phone = models.CharField(max_length=50, blank=True, default='')
    email = models.EmailField(blank=True, null=True)
    source = models.CharField(max_length=100, blank=True, null=True)
    employee_name = models.CharField(max_length=255, blank=True, null=True)
    region = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, default='')
    location = models.URLField(blank=True, null=True)
    total_orders = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    last_order_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUSES, default='faol')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return self.name


class Employee(models.Model):
    STATUSES = [('active', 'Active'), ('on_leave', 'Ta’tilda'), ('probation', 'Sinov davri'), ('nofaol', 'Nofaol')]

    full_name = models.CharField(max_length=255)
    position = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUSES, default='active')
    salary = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    join_date = models.DateField()
    avatar_color = models.CharField(max_length=100, blank=True, null=True)
    avatar = models.TextField(blank=True, null=True)  # 3x4 rasm (base64 DataURL)
    username = models.CharField(max_length=150, blank=True, default='')  # Tizimga kirish logini
    password = models.CharField(max_length=255, blank=True, default='')  # Tizimga kirish paroli
    webauthn_credential = models.TextField(blank=True, null=True)  # Face ID (WebAuthn) kredentsiali (JSON)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return self.full_name


class PayrollRecord(models.Model):
    STATUSES = [('to_langan', 'To‘langan'), ('jarayonda', 'Jarayonda'), ('kutilmoqda', 'Kutilmoqda')]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payroll_records')
    employee_name = models.CharField(max_length=255, blank=True, default='')
    position = models.CharField(max_length=255, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='')
    month = models.CharField(max_length=50)
    base_salary = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    bonus_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUSES, default='kutilmoqda')
    payment_date = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return f"{self.employee_name} — {self.month}"


class SalaryPayment(models.Model):
    """Oylik maosh to'lovi (davomat asosida hisoblangan summa)."""
    STATUSES = [('jarayonda', 'Jarayonda'), ('tayyorlandi', 'Tayyorlandi'), ('tolandi', "To'landi")]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='salary_payments')
    employee_name = models.CharField(max_length=255, blank=True, default='')
    month = models.CharField(max_length=7)  # YYYY-MM
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUSES, default='jarayonda')
    transaction = models.ForeignKey(
        FinancialTransaction, on_delete=models.SET_NULL, blank=True, null=True,
        related_name='salary_payments',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-month', '-id']
        constraints = [
            models.UniqueConstraint(fields=['employee', 'month'], name='uniq_salary_payment_employee_month')
        ]

    def __str__(self):
        return f"{self.employee_name} — {self.month} ({self.status})"


class BonusRecord(models.Model):
    KPI_TYPES = [
        ('Rejani ortigʻi bilan bajarish', 'Rejani ortigʻi bilan bajarish'),
        ('Brak foizini kamaytirish', 'Brak foizini kamaytirish'),
        ('Tezkor sifatli yetkazish', 'Tezkor sifatli yetkazish'),
        ('Mehnat intizomi va tashabbus', 'Mehnat intizomi va tashabbus'),
        ('Mijoz topgani uchun', 'Mijoz topgani uchun'),
    ]
    STATUSES = [('tasdiqlangan', 'Tasdiqlangan'), ('kutilmoqda', 'Kutilmoqda')]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='bonuses')
    employee_name = models.CharField(max_length=255, blank=True, default='')
    kpi_type = models.CharField(max_length=100, choices=KPI_TYPES)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUSES, default='kutilmoqda')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f"{self.employee_name} — {self.kpi_type}"


class WaybillItem(models.Model):
    waybill = models.ForeignKey('WaybillTTN', on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=255)
    format = models.CharField(max_length=100, blank=True, default='')
    unit = models.CharField(max_length=20, default='dona')
    quantity = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    unit_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.name} x{self.quantity}"


class WaybillTTN(models.Model):
    CATEGORIES = [('sotuv', 'Sotuv'), ('xarid', 'Xarid')]
    STATUSES = [('kutilmoqda', 'Kutilmoqda'), ('yo_lda', 'Yo‘lda'), ('yetkazildi', 'Yetkazildi')]

    order = models.ForeignKey(ErpOrder, on_delete=models.SET_NULL, blank=True, null=True, related_name='waybills')
    order_number = models.CharField(max_length=50, blank=True, default='')
    custom_order_id = models.CharField(max_length=100, blank=True, null=True)
    ttn_number = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=10, choices=CATEGORIES, default='sotuv')
    sender_company = models.CharField(max_length=255, blank=True, default='')
    sender_phone = models.CharField(max_length=50, blank=True, null=True)
    sender_address = models.CharField(max_length=255, blank=True, default='')
    receiver_company = models.CharField(max_length=255, blank=True, default='')
    receiver_phone = models.CharField(max_length=50, blank=True, null=True)
    receiver_address = models.CharField(max_length=255, blank=True, default='')
    driver_name = models.CharField(max_length=255, blank=True, null=True)
    driver_license = models.CharField(max_length=100, blank=True, null=True)
    vehicle_plate = models.CharField(max_length=50, blank=True, null=True)
    vehicle_model = models.CharField(max_length=100, blank=True, null=True)
    total_sum = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    issue_date = models.DateField()
    issue_time = models.TimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUSES, default='kutilmoqda')
    route_from = models.CharField(max_length=255, blank=True, null=True)
    route_to = models.CharField(max_length=255, blank=True, null=True)
    responsible_shipper = models.CharField(max_length=255, blank=True, null=True)
    seal_number = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-issue_date', '-id']

    def __str__(self):
        return self.ttn_number


class DeliveryTrip(models.Model):
    STATUSES = [('kutilmoqda', 'Kutilmoqda'), ('yolda', 'Yo‘lda'), ('yetkazildi', 'Yetkazildi')]

    trip_code = models.CharField(max_length=50)
    driver_name = models.CharField(max_length=255, blank=True, default='')
    driver_phone = models.CharField(max_length=50, blank=True, null=True)
    vehicle_model = models.CharField(max_length=100, blank=True, default='')
    vehicle_plate = models.CharField(max_length=50, blank=True, default='')
    destination_address = models.CharField(max_length=255, blank=True, default='')
    client_name = models.CharField(max_length=255, blank=True, default='')
    order_number = models.CharField(max_length=50, blank=True, default='')
    cargo_summary = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUSES, default='kutilmoqda')
    departure_time = models.CharField(max_length=100, blank=True, null=True)
    estimated_arrival = models.CharField(max_length=100, blank=True, null=True)
    completed_time = models.CharField(max_length=100, blank=True, null=True)
    lat = models.FloatField(blank=True, null=True)
    lng = models.FloatField(blank=True, null=True)
    waybill = models.ForeignKey(WaybillTTN, on_delete=models.SET_NULL, blank=True, null=True, related_name='trips')
    waybill_ttn_number = models.CharField(max_length=100, blank=True, default='')
    delivery_fee = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    # Reys tarixi — haydovchi bosib o'tgan masofa (metrda) va vaqt (sekundda)
    traveled_distance_m = models.FloatField(blank=True, null=True)
    traveled_duration_s = models.IntegerField(blank=True, null=True)
    started_at = models.DateTimeField(blank=True, null=True)
    finished_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return self.trip_code


class CompanyInfo(models.Model):
    name = models.CharField(max_length=255, default='BRENDOR')
    slogan = models.TextField(blank=True, default='Professional HoReCa Brending va Logo Joylashtirish')
    logo = models.TextField(blank=True, default='B')
    location = models.CharField(max_length=255, blank=True, default='Toshkent sh., Chilonzor sanoat hududi')
    address = models.TextField(blank=True, default='Toshkent sh., Chilonzor tumani, 12-mavze, 45-uy')
    owner = models.CharField(max_length=255, blank=True, default='')  # Korxona egasi F.I.SH
    manager = models.CharField(max_length=255, blank=True, default='')  # Boshqaruv hodimi F.I.SH
    phone = models.CharField(max_length=50, blank=True, default='')  # Asosiy telefon raqam
    phone2 = models.CharField(max_length=50, blank=True, default='')  # Qo'shimcha telefon raqam
    email = models.EmailField(blank=True, default='')  # Elektron pochta
    admin_name = models.CharField(max_length=255, blank=True, default='')  # Tizim boshqaruvchi admin F.I.SH
    admin_login = models.CharField(max_length=150, blank=True, default='')  # Admin logini
    admin_password = models.CharField(max_length=255, blank=True, default='')  # Admin paroli
    admin_title = models.CharField(max_length=255, blank=True, default='Bosh Admin (Super Administrator)')  # Admin unvoni
    admin_position = models.CharField(max_length=255, blank=True, default='Boshqaruvchi direktor')  # Admin lavozimi
    admin_role = models.CharField(max_length=255, blank=True, default='To‘liq boshqaruv (Admin)')  # Admin roli
    admin_phone = models.CharField(max_length=50, blank=True, default='')  # Admin telefoni
    lat = models.FloatField(blank=True, null=True)  # Xaritada belgilangan kenglik
    lng = models.FloatField(blank=True, null=True)  # Xaritada belgilangan uzunlik
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.name


class AttendanceSettings(models.Model):
    """Davomat tizimi sozlamalari (yagona yozuv, qo'lda tahrirlanadi)."""
    work_start_time = models.TimeField(default=time(8, 0))  # Ish boshlanish vaqti (08:00)
    work_end_time = models.TimeField(default=time(18, 0))  # Ish tugash vaqti (18:00)
    grace_minutes = models.PositiveSmallIntegerField(default=15)  # Kechikish chegarasi (daqiqa)
    radius_m = models.PositiveSmallIntegerField(default=25)  # Geofence radiusi (metr)
    work_days = models.CharField(max_length=20, default='1,2,3,4,5,6')  # Ish kunlari (1=Du ... 7=Ya; 7-yakshanba dam olish)
    holidays = models.JSONField(default=list)  # [{'date': 'YYYY-MM-DD', 'name': '...'}]
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get_solo(cls) -> 'AttendanceSettings':
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def work_days_list(self) -> list:
        try:
            return [int(x) for x in str(self.work_days).split(',') if str(x).strip().isdigit()]
        except Exception:
            return [1, 2, 3, 4, 5]

    def holiday_dates(self) -> set:
        try:
            return {h.get('date') for h in (self.holidays or []) if isinstance(h, dict) and h.get('date')}
        except Exception:
            return set()

    def __str__(self):
        return f"Davomat sozlamalari ({self.work_start_time}, {self.radius_m}m)"


class AttendanceRecord(models.Model):
    STATUSES = [('kelgan', 'Kelgan'), ('kechikkan', 'Kechikkan')]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_records')
    employee_name = models.CharField(max_length=255, blank=True, default='')
    date = models.DateField()
    check_in = models.TimeField()
    lat = models.FloatField(blank=True, null=True)
    lng = models.FloatField(blank=True, null=True)
    distance_m = models.FloatField(blank=True, null=True)
    method = models.CharField(max_length=20, default='face_id')
    face_photo = models.TextField(blank=True, null=True)  # Dalil fotosurat (base64)
    status = models.CharField(max_length=20, choices=STATUSES, default='kelgan')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']
        constraints = [
            models.UniqueConstraint(fields=['employee', 'date'], name='uniq_attendance_employee_date')
        ]

    def __str__(self):
        return f"{self.employee_name} — {self.date} ({self.status})"


class ContactMessage(models.Model):
    """Saytdagi 'Biz bilan bog'laning' formasidan kelgan murojaatlar (DB da saqlanadi)."""
    STATUSES = [('yangi', 'Yangi'), ('oqildi', "O'qildi"), ('javob_berildi', 'Javob berildi')]

    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True, default='')
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUSES, default='yangi')
    external_id = models.CharField(max_length=64, blank=True, null=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} — {self.phone} ({self.status})"


class SiteContactInfo(models.Model):
    """Saytning 'Biz bilan bog'laning' rekvizitlari (yagona yozuv, hamma platformada sinxron)."""
    phone1 = models.CharField(max_length=50, default='+998 (71) 200-00-99')
    phone2 = models.CharField(max_length=50, blank=True, default='+998 (90) 800-00-99')
    phone3 = models.CharField(max_length=50, blank=True, default='')
    email = models.EmailField(blank=True, default='info@cleanlife.uz')
    telegram = models.CharField(max_length=100, blank=True, default='@brendor_horeca')
    instagram = models.CharField(max_length=100, blank=True, default='@cleanlife.uz')
    address = models.TextField(blank=True, default='Toshkent sh., Yakkasaroy t., Bobur ko‘chasi, 44-uy')
    address_ru = models.TextField(blank=True, default='г. Ташкент, Яккасарайский р-н, ул. Бобура, 44')
    working_hours = models.CharField(max_length=255, blank=True, default='Dushanba — Shanba: 09:00 - 19:00')
    working_hours_ru = models.CharField(max_length=255, blank=True, default='Понедельник — Суббота: 09:00 - 19:00')
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def get_solo(cls) -> 'SiteContactInfo':
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"Sayt aloqasi ({self.phone1})"


class SitePortfolioProject(models.Model):
    """Portfolio loyihasi (har bir til uchun alohida yozuv, to'liq JSON bilan)."""
    LANGS = [('uz', 'O‘zbek'), ('ru', 'Rus')]

    external_id = models.CharField(max_length=64)
    lang = models.CharField(max_length=5, choices=LANGS, default='uz')
    business_type = models.CharField(max_length=50, default='Restoran')
    is_published = models.BooleanField(default=True)
    published_at = models.CharField(max_length=20, blank=True, default='')
    data = models.JSONField(default=dict)  # to'liq loyiha (clientName, story, logoTheme, brandedItems, rasmlar)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-id']
        constraints = [
            models.UniqueConstraint(fields=['external_id', 'lang'], name='uniq_portfolio_ext_lang')
        ]

    def __str__(self):
        name = (self.data or {}).get('clientName', self.external_id)
        return f"{name} [{self.lang}]"


class SiteBeforeAfter(models.Model):
    """Before/After slayder kontenti (har bir til uchun bitta yozuv)."""
    LANGS = [('uz', 'O‘zbek'), ('ru', 'Rus')]

    lang = models.CharField(max_length=5, choices=LANGS, unique=True)
    data = models.JSONField(default=dict)  # badge, title, description, bottomNote, pairs
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Slayder [{self.lang}]"
