from datetime import date, datetime, time, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from erp.models import (
    AttendanceRecord,
    AttendanceSettings,
    BonusRecord,
    BomItem,
    CompanyInfo,
    DeliveryTrip,
    Employee,
    ErpClient,
    ErpOrder,
    ErpProduct,
    FinancialTransaction,
    PayrollRecord,
    RawMaterial,
    WaybillItem,
    WaybillTTN,
)


def d(s):
    return datetime.strptime(s, '%Y-%m-%d').date() if s else None


def dt(s):
    if not s:
        return None
    return timezone.make_aware(datetime.strptime(s, '%Y-%m-%d %H:%M'))


class Command(BaseCommand):
    help = "Barcha jadvallarni boshlang'ich (demo) ma'lumotlar bilan to'ldiradi"

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true',
                            help="Jadvallarni tozalab, qayta toldiradi")

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Jadvallar tozalanmoqda...')
            WaybillItem.objects.all().delete()
            WaybillTTN.objects.all().delete()
            DeliveryTrip.objects.all().delete()
            BonusRecord.objects.all().delete()
            PayrollRecord.objects.all().delete()
            AttendanceRecord.objects.all().delete()
            AttendanceSettings.objects.all().delete()
            Employee.objects.all().delete()
            FinancialTransaction.objects.all().delete()
            ErpOrder.objects.all().delete()
            ErpClient.objects.all().delete()
            BomItem.objects.all().delete()
            ErpProduct.objects.all().delete()
            RawMaterial.objects.all().delete()
            CompanyInfo.objects.all().delete()

        if ErpOrder.objects.exists():
            self.stdout.write(self.style.WARNING(
                'DB da malumotlar mavjud. Tayyorlash uchun --clear ishlating.'))
            return

        orders = self.seed_orders()
        self.seed_company()
        self.seed_transactions()
        materials = self.seed_materials()
        self.seed_products(materials)
        self.seed_clients()
        employees = self.seed_employees()
        self.seed_payroll(employees)
        self.seed_bonuses(employees)
        self.seed_attendance(employees)
        waybills = self.seed_waybills(orders)
        self.seed_trips(waybills)

        from erp.site_seed import seed_site_cms
        created = seed_site_cms()
        self.stdout.write(f'  + sayt CMS ({created} yangi yozuv)')

        self.stdout.write(self.style.SUCCESS('Seed malumotlari qoshildi.'))

    def seed_transactions(self):
        rows = [
            ('kirim', "Mijoz to'lovi", 14500000, 'bank_transfer', '2026-09-28',
             'Sulton Saroy restorani: 200 dona premium polo va 100 fartuk uchun 100% to\'liq to\'lov',
             'Sulton Saroy Restorani'),
            ('kirim', "Mijoz to'lovi", 6800000, 'payme_click', '2026-09-27',
             "Aroma Bistro kofexona: 5,000 dona xushbo'y sachet nam salfetka uchun 50% avans",
             'Aroma Bistro & Lounge'),
            ('chiqim', 'Material xaridi', 5200000, 'bank_transfer', '2026-09-26',
             'Bek Baraka to\'qimachilik bazasidan 300 dona zich paxta polo blankalari xaridi',
             'Bek Baraka Textile'),
            ('kirim', "Mijoz to'lovi", 8900000, 'naqd', '2026-09-25',
             "Rayhon Milliy Taomlar: 2,000 dona oltin gerbli tish kovlagich va chek papkalar to'lovi",
             'Rayhon Milliy Taomlar MCHJ'),
            ('chiqim', "Xomashyo & Bo'yoq", 2400000, 'bank_transfer', '2026-09-24',
             "Germaniya Madeira kashta iplari (12 bobina) va Sericol UV matbaa bo'yoqlari",
             'PrintSupplies UZ'),
            ('chiqim', 'Xodimlar maoshi', 9500000, 'bank_transfer', '2026-09-20',
             'Bosh bosmachi usta va 2 nafar kashtachi operatorlariga oylik ish haqi', None),
            ('chiqim', 'Ijara & kommunal', 4000000, 'bank_transfer', '2026-09-15',
             'Chilonzor sanoat hududidagi ishlab chiqarish tsexining oylik ijarasi', None),
            ('kirim', "Mijoz to'lovi", 11200000, 'bank_transfer', '2026-09-14',
             'Paul Bakery qandolatchilik: 3,000 dona krafft qadoqlash paketi va xodimlar kepkalari',
             'Paul Bakery Qandolatchilik'),
            ('chiqim', 'Logistika & transport', 650000, 'naqd', '2026-09-12',
             "Toshkent bo'ylab restoranlarga tayyor mahsulotlarni yetkazib berish (Labo kuryer)", None),
            ('kirim', "Mijoz to'lovi", 4300000, 'payme_click', '2026-09-10',
             "Navvat Choyxonasi: 150 dona Baxmal do'ppi logotip bilan", 'Navvat Milliy Choyxona'),
        ]
        order_map = ['ORD-1082', 'ORD-1083', None, 'ORD-1081', None,
                     None, None, 'ORD-1079', None, 'ORD-1078']
        orders = {o.order_number: o for o in ErpOrder.objects.all()}
        created = 0
        for row, onum in zip(rows, order_map):
            FinancialTransaction.objects.create(
                type=row[0], category=row[1], amount=row[2],
                payment_method=row[3], date=d(row[4]), description=row[5],
                related_client=row[6],
                related_order=orders.get(onum) if onum else None,
            )
            created += 1
        self.stdout.write(f'  + {created} tranzaksiya')

    def seed_materials(self):
        rows = [
            ('Salfetka uchun uch qavatli kompozit folga', 'FLG-2026-081', 'Qadoq & Karton', 'm',
             4800, 2000, 150, "O'zbekiston Polimer Qadoq MCHJ", "O'zbekiston Polimer Qadoq MCHJ",
             'Bank hisob raqami (Perechisleniye)', '2026-09-22 09:30', 'A-Bino, 2-Qator, 3-Polka', 'yetarli'),
            ("Spunlace no-to'qima paxta matosi", 'SPN-2026-104', 'Mato & Blanklar', 'dona',
             12500, 5000, 90, 'Turkiya Tekstil Import MCHJ', 'Turkiya Tekstil Import MCHJ',
             'Bank hisob raqami (Perechisleniye)', '2026-09-25 11:15', 'A-Bino, 1-Qator, 1-Polka', 'yetarli'),
            ("Xushbo'y antibakterial aromatizator essensiyasi", 'ESS-2026-042', "Bo'yoq & Kimyo", 'litr',
             18.5, 10, 40000, 'Fransiya Fragrance Tashkent', 'Fransiya Fragrance Tashkent',
             'Korporativ karta (Uzcard/Humo)', '2026-09-18 14:20', 'B-Bino, Kimyoviy Xona, Shkaf-4', 'yetarli'),
            ('Qalin paxta matosi (Sarja kanvas 280g)', 'SRJ-2026-093', 'Mato & Blanklar', 'm',
             120, 250, 38000, 'Bek Baraka Textile', 'Bek Baraka Textile MCHJ',
             'Naqd pul', '2026-09-14 16:45', 'A-Bino, Rulonlar Sektsiyasi', 'kritik'),
            ('Tabiiy charm lenta va bronza aksessuarlar', 'CHRM-2026-018', 'Aksessuarlar', 'dona',
             65, 100, 14000, 'Charm Attorlik Tashkent', 'Charm Attorlik Tashkent XK',
             'Naqd pul', '2026-09-10 10:00', 'B-Bino, Qutilar 12-Polka', 'ogohlantirish'),
            ('Madeira Oltin metalllashtirilgan kashta ipi', 'MDR-2026-208', 'Ip & Furnitura', 'blok',
             8, 20, 65000, 'Germaniya Madeira Distribyutor', 'Germaniya Madeira Distribyutor',
             'Bank hisob raqami (Perechisleniye)', '2026-09-08 08:30', 'C-Bino, Kashta Tsex Javoni', 'kritik'),
            ('Tayyor polo blankalari', 'BLK-2026-550', 'Mato & Blanklar', 'dona',
             450, 200, 38000, 'Buxoro EuroTex Fabrikasi', 'Buxoro EuroTex Fabrikasi MCHJ',
             'Bank hisob raqami (Perechisleniye)', '2026-09-26 15:10', 'A-Bino, 3-Qator, 2-Polka', 'yetarli'),
            ("Silikon transfer bo'yog'i (Sericol)", 'SRL-2026-077', "Bo'yoq & Kimyo", 'kg',
             6.2, 12, 95000, 'PrintSupplies UZ', None, None,
             '2026-09-12 13:40', "B-Bino, Bo'yoqxona 2-Shkaf", 'ogohlantirish'),
            ('Zich mat qora dizaynerlik kartoni 300g', 'KRT-2026-112', 'Qadoq & Karton', 'm',
             680, 300, 12000, "Toshkent Qog'oz Fabrikasi", None, None,
             '2026-09-24 17:05', "A-Bino, Qog'oz Ombori", 'yetarli'),
            ('Tabiiy bambuk/qayin tish kovlagichlar', 'BMK-2026-880', 'Aksessuarlar', 'pachka',
             140, 50, 18000, 'EcoWood Agro Imports', None, None,
             '2026-09-21 12:00', 'B-Bino, 4-Qator, 2-Polka', 'yetarli'),
            ('Premium oltin folga lenta (Hot stamping)', 'FLG-2026-319', 'Qadoq & Karton', 'blok',
             24, 15, 85000, 'Master Foil Asia MCHJ', None, None,
             '2026-09-27 10:25', 'A-Bino, Bosmaxona shkafi', 'yetarli'),
            ("Titan oq pigment bo'yoq konsentrati", 'PGM-2026-015', "Bo'yoq & Kimyo", 'gr',
             850, 500, 180, 'Turon Kimyo Tex', None, None,
             '2026-09-28 16:30', 'B-Bino, Laboratoriya', 'yetarli'),
        ]
        objs = []
        for i, r in enumerate(rows, start=1):
            objs.append(RawMaterial.objects.create(
                name=r[0], batch_number=r[1], category=r[2], unit=r[3],
                quantity=r[4], min_threshold=r[5], unit_cost=r[6],
                supplier=r[7], counterparty=r[8], payment_method=r[9],
                last_restocked=dt(r[10]), storage_location=r[11], status=r[12],
            ))
        self.stdout.write(f'  + {len(objs)} xomashyo')
        return {f'mat-{i}': m for i, m in enumerate(objs, start=1)}

    def seed_products(self, materials):
        rows = [
            ("Xushbo'y Nam Salfetka (Sachet)", 'HRC-WIPE-001',
             'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
             'stol', 280, 140, 40, 60, 750, 1000, 18500, 142000,
             "To'liq rangli fleksografiya / Oltin folga",
             "60x80mm sachet, 100% viskoza paxta, alkogolsiz xushbo'y losyon",
             '2026-09-28', 'BATCH-2026-09A',
             [('mat-1', 1, 'metr', 150, 150), ('mat-2', 1, 'dona', 90, 90),
              ('mat-3', 0.002, 'litr', 40000, 80)]),
            ('Restoran Kanvas Oshpaz Fartugi', 'HRC-APRON-002',
             'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&auto=format&fit=crop&q=80',
             'kiyimlar', 42000, 18000, 3000, 12000, 115000, 10, 140, 1850,
             'Zich kompyuter kashtasi + Charm tasmalar',
             "Qalin 280g/m² sarja paxta, tabiiy jigar charm tasmalar, bronza mixlar",
             '2026-09-29', 'BATCH-2026-09B',
             [('mat-4', 0.85, 'metr', 38000, 32300), ('mat-5', 1, 'dona', 14000, 14000),
              ('mat-6', 0.05, 'bobina', 65000, 3250)]),
            ('Korporativ Piqué Polo Futbolka', 'HRC-POLO-003',
             'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&auto=format&fit=crop&q=80',
             'kiyimlar', 38000, 14000, 2000, 8000, 85000, 15, 320, 4200,
             "Ko'krakda nafis kashta + Yengda relyef bosma",
             "100% taralgan paxta piqué to'qima 220g/m², marvarid tugmalar",
             '2026-09-27', 'BATCH-2026-09C',
             [('mat-7', 1, 'dona', 38000, 38000), ('mat-6', 0.08, 'bobina', 65000, 5200),
              ('mat-8', 0.01, 'litr', 95000, 950)]),
            ('Premium Tish Kovlagich Qutisi (Stol usti)', 'HRC-BOX-004', None,
             'stol', 950, 450, 100, 250, 2800, 500, 3400, 36000,
             'Matte laminatsiya + UV-selektiv lak + Oltin bo\'rtma',
             "300g/m² qora dizaynerlik kartoni, 60 dona qayin tish kovlagich",
             '2026-09-30', 'BATCH-2026-09D',
             [('mat-9', 0.05, 'metr', 12000, 600), ('mat-10', 60, 'dona', 8, 480),
              ('mat-11', 1, 'dona', 280, 280)]),
            ('Eko Kraft Qadoqlash Paketi', 'HRC-BAG-005', None,
             'qadoq', 1200, 600, 100, 300, 3200, 300, 6200, 58000,
             'Ekologik suvli ipak bosma (Silk screen)',
             "120g/m² tabiiy jigarrang kraft, o'ralgan mustahkam qog'oz dastak",
             '2026-09-25', 'BATCH-2026-09E',
             [('mat-12', 1, 'dona', 1200, 1200), ('mat-8', 0.005, 'litr', 95000, 475)]),
            ("Milliy Baxmal Do'ppi (Choyxona & Restoran)", 'HRC-CAP-006', None,
             'aksessuar', 22000, 11000, 1500, 7500, 58000, 20, 85, 940,
             "Chuqur relyefli kumush/oltin zar ip kashtasi",
             "To'q qora baxmal, paxta astarlik, an'aviy Chust yoki Shahrisabz bichimi",
             '2026-09-26', 'BATCH-2026-09F',
             [('mat-13', 0.35, 'metr', 45000, 15750), ('mat-6', 0.12, 'bobina', 65000, 7800)]),
        ]
        created = 0
        for r in rows:
            p = ErpProduct.objects.create(
                name=r[0], sku=r[1], image_url=r[2], category=r[3],
                base_cost=r[4], branding_cost=r[5], packaging_cost=r[6],
                labor_cost=r[7], selling_price=r[8], min_order=r[9],
                stock_count=r[10], sold_count=r[11], technique=r[12],
                specification=r[13], ready_date=d(r[14]), batch_number=r[15],
            )
            for mid, qty, unit, ucost, tcost in r[16]:
                mat = materials.get(mid)
                BomItem.objects.create(
                    product=p, material=mat,
                    material_name=mat.name if mat else mid,
                    quantity_needed=qty, unit=unit,
                    unit_cost=ucost, total_cost=tcost,
                )
            created += 1
        self.stdout.write(f'  + {created} mahsulot (BOM bilan)')

    def seed_orders(self):
        rows = [
            ('ORD-1082', 'Sulton Saroy Restorani', 'Javohir Usmonov', '+998 90 911-22-33',
             'Premium Restoran & Lounge', 'Korporativ Piqué Polo & Oshpaz Fartugi',
             300, 14500000, 14500000, 8200000, 300, 'yetkazildi', '2026-09-24', '2026-09-30',
             'Oltin monogrammali kashta', 'TTN-2026-0924',
             "Barcha pololar S, M, L, XL o'lchamlarda alohida qadoqlansin"),
            ('ORD-1083', 'Aroma Bistro & Lounge', 'Malika Karimova', '+998 97 733-44-55',
             'Kofexona va Nonvoyxona', "Xushbo'y Nam Salfetka (Sachet)",
             5000, 6800000, 3400000, 3100000, 2500, 'jarayonda', '2026-09-26', '2026-10-02',
             'Matte qora folga + UV logotip', 'TTN-2026-0926',
             'Qadoq orqasida QR menyu kodi kiritilgan'),
            ('ORD-1081', 'Rayhon Milliy Taomlar MCHJ', 'Dilshod Rahmatov', '+998 71 200-11-22',
             "Milliy Restoranlar Tarmog'i", 'Premium Tish Kovlagich Qutisi (Stol usti)',
             2000, 8900000, 8900000, 4200000, 2000, 'yetkazildi', '2026-09-22', '2026-09-27',
             'Selektiv lak va oltin relyef', 'TTN-2026-0922',
             "Shahar bo'ylab 4 ta filialga bo'lib yetkazildi"),
            ('ORD-1084', 'Paul Bakery Qandolatchilik', 'Sherzod Aliyev', '+998 99 888-00-11',
             'Fransuz Qandolatchiligi', 'Eko Kraft Qadoqlash Paketi',
             3000, 9600000, 5000000, 4800000, 1000, 'jonatildi', '2026-09-28', '2026-10-04',
             'Bir rangli shokolad tusli ipak bosma', '',
             "Dastaklari 8 kg yuk ko'tarishga sinovdan o'tkazilsin"),
            ('ORD-1085', 'Caravan Group Choyxonalari', 'Bekzod Fayzullayev', '+998 90 123-45-67',
             'Milliy Choyxona', "Milliy Baxmal Do'ppi",
             120, 6960000, 2000000, 3500000, 0, 'jarayonda', '2026-09-29', '2026-10-06',
             'Kumush simli naqsh kashta', '', 'Choyxona ofitsiantlari uchun maxsus o\'lchamlar'),
        ]
        objs = []
        for r in rows:
            objs.append(ErpOrder.objects.create(
                order_number=r[0], company=r[1], client_name=r[2], phone=r[3],
                business_type=r[4], product_name=r[5], quantity=r[6],
                total_amount=r[7], paid_amount=r[8], estimated_cost=r[9],
                delivered_quantity=r[10], status=r[11], order_date=d(r[12]),
                delivery_date=d(r[13]), technique=r[14], ttn_number=r[15],
                notes=r[16],
            ))
        self.stdout.write(f'  + {len(objs)} buyurtma')
        return {f'ord-{i}': o for i, o in enumerate(objs, start=1)}

    def seed_clients(self):
        rows = [
            ('Javohir Usmonov', 'Sulton Saroy Restorani', 'B2B', '+998 90 911-22-33',
             'info@sultonsaroy.uz', 'Tavsiya (Hamkorlar)', 'Toshkent shahri',
             "Mirzo Ulug'bek tumani", "Mustaqillik shoh ko'chasi, 45-uy",
             'https://maps.google.com/?q=41.3255,69.2988', 8, 64500000, '2026-09-24', 'faol'),
            ('Madina Karimova', 'Aroma Bistro & Lounge', 'B2B', '+998 97 733-44-55',
             'contact@aromabistro.uz', 'Instagram', 'Toshkent shahri',
             'Yakkasaroy tumani', "Shota Rustaveli ko'chasi, 12-uy",
             'https://maps.google.com/?q=41.2942,69.2561', 5, 28400000, '2026-09-26', 'faol'),
            ('Farrux Zokirov', 'Rayhon Milliy Taomlar MCHJ', 'B2B', '+998 71 200-11-22',
             'orders@rayhon.uz', 'Sayt orqali', 'Toshkent shahri',
             'Chilonzor tumani', "Bunyodkor shoh ko'chasi, 7-A",
             'https://maps.google.com/?q=41.2789,69.2154', 14, 92000000, '2026-09-22', 'faol'),
            ('Nodira Aliyeva', 'Paul Bakery Qandolatchilik', 'B2B', '+998 99 888-00-11',
             'paulbakery.uz@gmail.com', 'Telegram', 'Toshkent shahri',
             'Mirobod tumani', "Taras Shevchenko ko'chasi, 21",
             'https://maps.google.com/?q=41.2995,69.2778', 6, 41000000, '2026-09-28', 'faol'),
            ('Botir Qodirov', 'Caravan Group Choyxonalari', 'B2B', '+998 90 123-45-67',
             'caravan@group.uz', 'Tashqi reklama', 'Toshkent shahri',
             'Shayxontohur tumani', "Navoiy ko'chasi, 18",
             'https://maps.google.com/?q=41.3211,69.2435', 9, 53200000, '2026-09-29', 'faol'),
            ('Sardor Rahimqulov', 'Navvat Milliy Choyxona', 'B2B', '+998 93 505-12-34',
             'navvat.tea@mail.uz', "Sovuq qo'ng'iroq", 'Toshkent shahri',
             'Yunusobod tumani', "Amir Temur shoh ko'chasi, 107",
             'https://maps.google.com/?q=41.3412,69.2845', 4, 21500000, '2026-09-10', 'faol'),
        ]
        for r in rows:
            ErpClient.objects.create(
                name=r[0], company=r[1], type=r[2], phone=r[3], email=r[4],
                source=r[5], region=r[6], district=r[7], address=r[8],
                location=r[9], total_orders=r[10], total_spent=r[11],
                last_order_date=d(r[12]), status=r[13],
            )
        self.stdout.write(f'  + {len(rows)} mijoz')

    def seed_company(self):
        from django.contrib.auth.hashers import make_password
        CompanyInfo.objects.create(
            name='Clean Life',
            slogan='Professional HoReCa Brending va Logo Joylashtirish',
            logo='B',
            location='Toshkent sh., Chilonzor sanoat hududi',
            address='Toshkent sh., Chilonzor tumani, 12-mavze, 45-uy',
            owner='',
            manager='',
            phone='+998 71 200 44 88',
            phone2='',
            email='',
            admin_name='Bosh Admin',
            admin_login='admin',
            admin_password=make_password('brendor2026'),
            admin_title='Bosh Admin (Super Administrator)',
            admin_position='Boshqaruvchi direktor',
            admin_role='To‘liq boshqaruv (Admin)',
        )
        self.stdout.write('  + 1 korxona')

    def seed_employees(self):
        rows = [
            ('Qodirxon Ahmedov', 'Boshqaruvchi',
             '+998 90 112-33-44', 'active', 12000000, '2023-04-15', 'from-amber-600 to-yellow-500'),
            ('Dilshod Rahmatov', 'Ishchi',
             '+998 93 223-44-55', 'active', 7500000, '2024-02-10', 'from-blue-600 to-cyan-500'),
            ('Gulnora Saidova', 'Ishchi',
             '+998 97 334-55-66', 'active', 6800000, '2023-08-01', 'from-emerald-600 to-teal-500'),
            ('Anvar Mirzayev', 'Boshqaruvchi',
             '+998 99 445-66-77', 'active', 8000000, '2024-06-15', 'from-purple-600 to-indigo-500'),
            ('Shuxrat Karimov', 'Ishchi',
             '+998 91 556-77-88', 'active', 7200000, '2023-11-20', 'from-orange-600 to-amber-500'),
            ('Rustam Boltayev', 'Haydovchi',
             '+998 94 667-88-99', 'active', 5800000, '2024-03-01', 'from-rose-600 to-red-500'),
            ('Sarvar Toirov', 'Elektrik',
             '+998 98 778-99-00', 'on_leave', 9500000, '2022-09-01', 'from-slate-600 to-zinc-500'),
        ]
        objs = []
        for r in rows:
            objs.append(Employee.objects.create(
                full_name=r[0], position=r[1], phone=r[2],
                status=r[3], salary=r[4], join_date=d(r[5]),
                avatar_color=r[6],
            ))
        self.stdout.write(f'  + {len(objs)} xodim')
        return {f'emp-{i}': e for i, e in enumerate(objs, start=1)}

    def seed_attendance(self, employees):
        # Demo: oxirgi 5 ish kuni uchun davomat (bugundan oldingi kunlar)
        from datetime import time as dtime
        count = 0
        day = date.today() - timedelta(days=1)
        made = 0
        while made < 5 and (date.today() - day).days < 14:
            if day.weekday() < 6:  # Du-Sh (yakshanba dam olish)
                for key in ('emp-1', 'emp-2', 'emp-3', 'emp-4', 'emp-5', 'emp-6'):
                    emp = employees.get(key)
                    if not emp:
                        continue
                    minute = 5 + (made * 2 + len(key)) % 8
                    AttendanceRecord.objects.get_or_create(
                        employee=emp, date=day,
                        defaults={
                            'employee_name': emp.full_name,
                            'check_in': dtime(8, minute),
                            'lat': 41.3350, 'lng': 69.2450, 'distance_m': 8.5,
                            'method': 'face_id', 'face_photo': '',
                            'status': 'kelgan',
                        },
                    )
                    count += 1
                made += 1
            day -= timedelta(days=1)
        self.stdout.write(f'  + {count} davomat qaydi')

    def seed_payroll(self, employees):
        rows = [
            ('emp-1', 'Qodirxon Ahmedov', 'Bosh Texnolog', 'Ishlab chiqarish', 'Sentabr 2026',
             12000000, 1500000, 1620000, 11880000, 'to_langan', '2026-09-25'),
            ('emp-2', 'Dilshod Rahmatov', 'Katta Kashtachi Operator', 'Ishlab chiqarish', 'Sentabr 2026',
             7500000, 900000, 1008000, 7392000, 'to_langan', '2026-09-25'),
            ('emp-3', 'Gulnora Saidova', 'Tikuv Tsex Ustasi', 'Ishlab chiqarish', 'Sentabr 2026',
             6800000, 850000, 918000, 6732000, 'to_langan', '2026-09-25'),
            ('emp-4', 'Anvar Mirzayev', 'Sifat Nazorati (OTK)', 'Sifat nazorati', 'Sentabr 2026',
             8000000, 1000000, 1080000, 7920000, 'jarayonda', '2026-10-01'),
            ('emp-5', 'Shuxrat Karimov', 'Omborxona Mudiri', "Omborxona va Ta'minot", 'Sentabr 2026',
             7200000, 600000, 936000, 6864000, 'kutilmoqda', None),
            ('emp-6', 'Rustam Boltayev', 'Kuryer Haydovchi', 'Logistika', 'Sentabr 2026',
             5800000, 750000, 786000, 5764000, 'kutilmoqda', None),
        ]
        for r in rows:
            PayrollRecord.objects.create(
                employee=employees[r[0]], employee_name=r[1], position=r[2],
                department=r[3], month=r[4], base_salary=r[5], bonus_amount=r[6],
                deductions=r[7], net_salary=r[8], status=r[9],
                payment_date=d(r[10]),
            )
        self.stdout.write(f'  + {len(rows)} oylik yozuvi')

    def seed_bonuses(self, employees):
        rows = [
            ('emp-1', 'Qodirxon Ahmedov', 'Rejani ortigʻi bilan bajarish', 1500000,
             '2026-09-24', 'tasdiqlangan',
             'Sulton Saroy va Rayhon buyurtmalarini muddatidan 2 kun oldin 100% sifat bilan topshirdi'),
            ('emp-4', 'Anvar Mirzayev', 'Brak foizini kamaytirish', 1000000,
             '2026-09-23', 'tasdiqlangan',
             'Sentabr oyida ishlab chiqarishdagi umumiy brak foizini 0.4% dan past darajada saqladi'),
            ('emp-2', 'Dilshod Rahmatov', 'Mehnat intizomi va tashabbus', 900000,
             '2026-09-20', 'tasdiqlangan',
             'Tajima 12-boshli kashta stanogining sozlanish vaqtini 30% ga tezlashtiruvchi shablon yaratdi'),
            ('emp-6', 'Rustam Boltayev', 'Tezkor sifatli yetkazish', 750000,
             '2026-09-28', 'kutilmoqda',
             "Toshkent shahar markazi tirbandliklarida barcha yuk xatlarini 1 soat oldin xatosiz topshirdi"),
        ]
        for r in rows:
            BonusRecord.objects.create(
                employee=employees[r[0]], employee_name=r[1], kpi_type=r[2],
                amount=r[3], date=d(r[4]), status=r[5], notes=r[6],
            )
        self.stdout.write(f'  + {len(rows)} bonus')

    def seed_waybills(self, orders):
        rows = [
            dict(order='ord-2', order_number='ORD-1083', custom_order_id='ORD-1083',
                 ttn='TTN-2026-0924', category='sotuv',
                 sender_company='Shovot Carton', sender_phone='+998 99 505 40 04',
                 sender_address='Xorazm vil., Shovot tumani, Sanoat hududi',
                 receiver_company='Yevro teks mchj', receiver_phone='+998 99 964 96 95',
                 receiver_address='Toshkent sh., Chilonzor tumani, Qatortol 24',
                 driver_name='Rustam Boltayev', driver_license='AF 382910',
                 vehicle_plate='01 774 AAB', vehicle_model='Labo Max',
                 items=[('Godra', '132.5×65', 'dona', 7700, 3523.30, 27129410)],
                 total=27129410, issue='2026-10-02', time='09:30',
                 status='yetkazildi', shipper='Ombor mudiri'),
            dict(order='ord-1', order_number='ORD-2026-0924', custom_order_id=None,
                 ttn='TTN-2026-0925', category='sotuv',
                 sender_company='"CLEAN LIFE" MCHJ', sender_phone=None,
                 sender_address='Toshkent sh., Chilonzor tumani, 2-Sanoat hududi, 14-bino',
                 receiver_company='"SULTON SAROY RESTAURANT & LOUNGE" MCHJ',
                 receiver_phone='+998 90 911-22-33',
                 receiver_address="Toshkent sh., Mirzo Ulug'bek tumani, Mustaqillik shoh ko'chasi, 45-uy",
                 driver_name='Rustam Boltayev', driver_license='AF 382910',
                 vehicle_plate='01 774 AAB', vehicle_model='Chevrolet Labo Max',
                 items=[
                     ('Korporativ Piqué Polo Futbolka (Qora, Oltin kashta)', '', 'dona', 200, 85000, 17000000),
                     ('Restoran Kanvas Oshpaz Fartugi (Charm tasmali)', '', 'dona', 100, 115000, 11500000),
                 ],
                 total=28500000, issue='2026-09-30', time='11:15',
                 status='yo_lda', shipper='Shuxrat Karimov (Ombor mudiri)',
                 route_from='Brendor Asosiy Tsex Ombori',
                 route_to='Sulton Saroy Restorani Ombori', seal='SEAL-UZ-89104'),
            dict(order='ord-3', order_number='ORD-1081', custom_order_id=None,
                 ttn='TTN-2026-0926', category='sotuv',
                 sender_company='"CLEAN LIFE" MCHJ', sender_phone=None,
                 sender_address='Toshkent sh., Chilonzor tumani, 2-Sanoat hududi, 14-bino',
                 receiver_company='"RAYHON MILLIY TAOMLAR" MCHJ',
                 receiver_phone='+998 71 200-11-22',
                 receiver_address="Toshkent sh., Chilonzor tumani, Bunyodkor shoh ko'chasi, 7-A",
                 driver_name='Rustam Boltayev', driver_license='AF 382910',
                 vehicle_plate='01 552 ZZA', vehicle_model='Isuzu NPR 4.5T',
                 items=[
                     ('Premium Tish Kovlagich Qutisi (Oltin gerbli UV lak)', '', 'dona', 2000, 2800, 5600000),
                     ('Restoran Chek va Taqdimot Papkalari', '', 'dona', 100, 33000, 3300000),
                 ],
                 total=8900000, issue='2026-09-27', time='14:45',
                 status='yetkazildi', shipper='Shuxrat Karimov (Ombor mudiri)',
                 route_from='Brendor Asosiy Tsex Ombori',
                 route_to='Rayhon Markaziy Ombori', seal='SEAL-UZ-89091'),
            dict(order='ord-2', order_number='ORD-1083', custom_order_id=None,
                 ttn='TTN-2026-0927', category='sotuv',
                 sender_company='Shovot Carton', sender_phone='+998 99 505 40 04',
                 sender_address='Xorazm viloyati, Shovot tumani, Sanoat hududi',
                 receiver_company='"Afsona Lounge & Restaurant" MCHJ',
                 receiver_phone='+998 90 911 22 33',
                 receiver_address="Toshkent sh., Mirobod tumani, Nukus ko'chasi, 45-uy",
                 driver_name='Jasur Bekmurodov', driver_license='BE 901244',
                 vehicle_plate='01 321 CCB', vehicle_model='Chevrolet Damas Van',
                 items=[
                     ('Gofrokarton Quti (Standart)', '40x30x25 sm', 'dona', 1500, 4200, 6300000),
                     ('Chop etilgan Brendli Salfetka Qutilari', 'Standart', 'dona', 800, 2500, 2000000),
                 ],
                 total=8300000, issue='2026-10-04', time='16:20',
                 status='yetkazildi', shipper='Davron Ergashev',
                 route_from='Shovot Carton Ombori',
                 route_to='Afsona Markaziy Ombori', seal='SEAL-UZ-89115'),
        ]
        objs = {}
        for r in rows:
            wb = WaybillTTN.objects.create(
                order=orders.get(r['order']), order_number=r['order_number'],
                custom_order_id=r['custom_order_id'], ttn_number=r['ttn'],
                category=r['category'], sender_company=r['sender_company'],
                sender_phone=r['sender_phone'], sender_address=r['sender_address'],
                receiver_company=r['receiver_company'], receiver_phone=r['receiver_phone'],
                receiver_address=r['receiver_address'], driver_name=r['driver_name'],
                driver_license=r['driver_license'], vehicle_plate=r['vehicle_plate'],
                vehicle_model=r['vehicle_model'], total_sum=r['total'],
                issue_date=d(r['issue']), issue_time=time.fromisoformat(r['time']),
                status=r['status'], route_from=r.get('route_from'),
                route_to=r.get('route_to'), responsible_shipper=r['shipper'],
                seal_number=r.get('seal'),
            )
            for it in r['items']:
                WaybillItem.objects.create(
                    waybill=wb, name=it[0], format=it[1], unit=it[2],
                    quantity=it[3], unit_price=it[4], total_price=it[5],
                )
            objs[r['ttn']] = wb
        self.stdout.write(f'  + {len(objs)} yuk xati')
        return objs

    def seed_trips(self, waybills):
        rows = [
            dict(code='LOG-TRIP-084', driver='Rustam Boltayev', phone='+998 94 667-88-99',
                 model='Chevrolet Labo Max', plate='01 774 AAB',
                 dest="Mustaqillik shoh ko'chasi, 45-uy (Sulton Saroy)",
                 client='Sulton Saroy Restorani', order='ORD-1082',
                 cargo='200 dona polo, 100 fartuk (jami 6 ta zich quti)',
                 status='yolda', dep='10:30, 2026-09-30', eta='11:45, 2026-09-30',
                 done=None, lat=41.3195, lng=69.2825, ttn='TTN-2026-0925', fee=850000),
            dict(code='LOG-TRIP-083', driver='Rustam Boltayev', phone='+998 94 667-88-99',
                 model='Isuzu NPR 4.5T', plate='01 552 ZZA',
                 dest="Bunyodkor shoh ko'chasi, 7-A (Rayhon bosh filiali)",
                 client='Rayhon Milliy Taomlar MCHJ', order='ORD-1081',
                 cargo='2,000 dona tish kovlagich qutisi va menyu papkalar',
                 status='yetkazildi', dep='08:00, 2026-09-27', eta=None,
                 done='09:20, 2026-09-27', lat=41.2845, lng=69.2155,
                 ttn='TTN-2026-0926', fee=650000),
            dict(code='LOG-TRIP-085', driver='Jasur Bekmurodov', phone='+998 90 998-11-22',
                 model='Chevrolet Damas Van', plate='01 321 CCB',
                 dest="Shota Rustaveli ko'chasi, 12-uy (Aroma Bistro)",
                 client='Aroma Bistro & Lounge', order='ORD-1083',
                 cargo='5,000 dona nam salfetka (5 quti sachet)',
                 status='kutilmoqda', dep='14:00, 2026-10-02',
                 eta='15:15, 2026-10-02', done=None, lat=41.2985, lng=69.2612,
                 ttn='TTN-2026-0927', fee=450000),
        ]
        for r in rows:
            wb = waybills.get(r['ttn'])
            DeliveryTrip.objects.create(
                trip_code=r['code'], driver_name=r['driver'], driver_phone=r['phone'],
                vehicle_model=r['model'], vehicle_plate=r['plate'],
                destination_address=r['dest'], client_name=r['client'],
                order_number=r['order'], cargo_summary=r['cargo'],
                status=r['status'], departure_time=r['dep'],
                estimated_arrival=r['eta'], completed_time=r['done'],
                lat=r['lat'], lng=r['lng'], waybill=wb,
                waybill_ttn_number=r['ttn'], delivery_fee=r['fee'],
            )
        self.stdout.write(f'  + {len(rows)} reys')
