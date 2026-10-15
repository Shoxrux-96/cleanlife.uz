"""Sayt CMS boshlang'ich ma'lumotlari (portfolio 6 loyiha x 2 til + slayder)."""
from .models import SiteBeforeAfter, SiteContactInfo, SitePortfolioProject

U = 'https://images.unsplash.com/'

PROJECTS = [
    # (external_id, business_type, location_uz, location_ru, tagline_uz, tagline_ru,
    #  story_uz, story_ru, photo, caption_uz, caption_ru, logo(name,subtext,primary,accent,text,symbol), items_uz, items_ru)
    ('sulton-saroy', 'Restoran',
     'Toshkent sh., Yunusobod', 'г. Ташкент, Юнусабад',
     'Sharqona hashamat va an’anaviy taomlar maskani', 'Восточная роскошь и традиционная кухня',
     'Mijoz 140 o‘rinli yangi milliy restoranni ochish arafasida edi. Ular alohida kiyim tiktirish o‘rniga, bizning tavsiyamiz bilan tayyor premium qora polo va fartuklarni tanlashdi. Barcha stol usti vositalari, nam salfetkalar va tish kovlagichlar oltin metall tusli uslubda brendlandi.',
     'Клиент открывал новый национальный ресторан на 140 мест. По нашей рекомендации вместо пошива одежды они выбрали готовые премиальные чёрные поло и фартуки. Все настольные принадлежности, влажные салфетки и зубочистки забрендированы в золотистом металлическом стиле.',
     U + 'photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
     'Premium qora mat sachet, tish kovlagich qutisi va oltin monogrammali stol muhiti',
     'Премиальный чёрный матовый саше, коробочка для зубочисток и стол с золотой монограммой',
     ('SULTON SAROY', 'RESTAURANT & LOUNGE', '#1A1817', '#D4AF37', '#FFFFFF', '♛'),
     [('Nam salfetka', 'wetwipe', 'Mat qora o‘ram + Oltin folga tushirilgan sharqona naqsh', 'Fleksografiya + Folga'),
      ('Tish kovlagich', 'toothpick', 'Zich qora karton quti, tillarang gerb', 'UV-lak va shtamp'),
      ('Ofitsiant fartugi', 'apron', 'Espresso rangli kanvas fartuk, oltin ipli gerb', 'Zich kompyuter kashtasi'),
      ('Administrator polosi', 'polo', 'Qora piqué paxta polo, ko‘krak qismida nafis gerb', 'Kashta'),
      ('Milliy do‘ppi', 'cap', 'Qora baxmal do‘ppi hoshiyasida yashirin brending', 'Kashta')],
     [('Влажная салфетка', 'wetwipe', 'Матовая чёрная упаковка + восточный узор золотой фольгой', 'Флексография + фольга'),
      ('Зубочистка', 'toothpick', 'Плотная чёрная картонная коробка, золотой герб', 'УФ-лак и штамп'),
      ('Фартук официанта', 'apron', 'Канвасовый фартук цвета эспрессо, герб золотой нитью', 'Плотная компьютерная вышивка'),
      ('Поло администратора', 'polo', 'Чёрное хлопковое поло пике, изящный герб на груди', 'Вышивка'),
      ('Национальная тюбетейка', 'cap', 'Скрытый брендинг на чёрной бархатной тюбетейке', 'Вышивка')]),
    ('aroma-bistro', 'Kafe',
     'Toshkent sh., Mirobod', 'г. Ташкент, Мирабад',
     'Fransuz qandolatchiligi va yangi qovurilgan qahva', 'Французская кондитерская и свежеобжаренный кофе',
     'Yevropacha shinam atmosferaga ega shahar kafesi. Qahva stakan g‘iloflari, shokoladli nam salfetkalar va xodimlarining qum rangli bej fartuklariga bir xil minimalistik zamonaviy shriftli logotip tushirildi.',
     'Городское кафе с уютной европейской атмосферой. На кофейные стаканчики, шоколадные влажные салфетки и песочные бежевые фартуки персонала нанесён единый минималистичный логотип современным шрифтом.',
     U + 'photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
     'Eko-kraft paketlar, qum rangli kanvas fartuklar va zamonaviy qahva stakanlari',
     'Эко-крафт пакеты, песочные канвасовые фартуки и современные кофейные стаканы',
     ('AROMA BISTRO', 'ARTISAN BAKERY • 2024', '#2D241E', '#C49A6C', '#FFFFFF', '☕'),
     [('Nam salfetka', 'wetwipe', 'Eko-bej mat qadoq, qahva donasi silueti', 'Raqamli flekso'),
      ('Tish kovlagich qutisi', 'toothpick', 'Kraft quticha, minimalist qora bosma', 'Ofset bosma'),
      ('Barista fartugi', 'apron', 'Xaki rangli kanvas, charm tasmali, kashta logo', 'Zich kashta'),
      ('Kraft paket', 'packaging', 'Kruassan va bagetlar uchun qayta ishlangan eko-paket', 'Shelkografiya')],
     [('Влажная салфетка', 'wetwipe', 'Эко-бежевая матовая упаковка, силуэт кофейного зерна', 'Цифровое флексо'),
      ('Коробочка для зубочисток', 'toothpick', 'Крафт-коробочка, минималистичная чёрная печать', 'Офсетная печать'),
      ('Фартук бариста', 'apron', 'Канвас цвета хаки, кожаные лямки, вышитый логотип', 'Плотная вышивка'),
      ('Крафт-пакет', 'packaging', 'Переработанный эко-пакет для круассанов и багетов', 'Шелкография')]),
    ('chorsu-choyxona', 'Choyxona',
     'Samarqand sh.', 'г. Самарканд',
     'O‘zbekona mehmondo‘stlik va tandir taomlari', 'Узбекское гостеприимство и блюда из тандыра',
     'An’anaviy choyxona uchun 60 nafar xodimga tayyor to‘q ko‘k pololar va do‘ppilar brendlandi. Dasturxondagi har bir element choyxona logotipi bilan ta’minlandi, natijada mehmonlar o‘zlarini haqiqiy madaniy maskanda his qilishadi.',
     'Для традиционной чайханы забрендированы готовые тёмно-синие поло и тюбетейки для 60 сотрудников. Каждый элемент дастархана обеспечен логотипом чайханы — гости чувствуют себя в настоящем культурном месте.',
     U + 'photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
     'An’anaviy choyxona dasturxoni, to‘q ko‘k pololar va milliy naqshli do‘ppilar',
     'Традиционный дастархан, тёмно-синие поло и тюбетейки с национальным узором',
     ('CHORSU', 'CHOYXONA & OSH MARKAZI', '#122538', '#00A896', '#FFFFFF', '🫖'),
     [('Nam salfetka', 'wetwipe', 'Ko‘k o‘ram, choynak timsoli va milliy islimiy naqsh', 'Flekso bosma'),
      ('Choyxona xodimi polosi', 'polo', 'Ko‘k polo, orqa qismida katta logotip', 'Termotransfer'),
      ('Milliy do‘ppi', 'cap', 'Ipak ipli an’anaviy kashta bilan uyg‘unlashtirilgan logo', 'Qo‘lda va mashinada kashta'),
      ('Takeaway osh qadoqlari', 'packaging', 'Maxsus termal jilvali palov idishi kartonlari', 'Ofset bosma')],
     [('Влажная салфетка', 'wetwipe', 'Синяя упаковка, символ чайника и национальный узор', 'Флексопечать'),
      ('Поло персонала', 'polo', 'Синее поло, крупный логотип на спине', 'Термотрансфер'),
      ('Национальная тюбетейка', 'cap', 'Логотип в гармонии с традиционной шёлковой вышивкой', 'Ручная и машинная вышивка'),
      ('Упаковка плова takeaway', 'packaging', 'Картонные термобоксы для плова', 'Офсетная печать')]),
    ('burger-craft', 'Fast Food',
     'Toshkent sh., Chilonzor', 'г. Ташкент, Чиланзар',
     'Smash burgerlar va yoshlar sevimli maskani', 'Смеш-бургеры и любимое место молодёжи',
     'Tezkor xizmat va kuchli vizual qiyofa. Oshxona xodimlari uchun qora futbolkalar va kepkalar, yetkazib berish uchun esa qalin qora burger qutilari va yog‘ o‘tkazmaydigan nam salfetkalar brendlandi.',
     'Быстрый сервис и сильный визуальный образ. Для кухонного персонала забрендированы чёрные футболки и кепки, для доставки — плотные чёрные бургер-боксы и жиронепроницаемые влажные салфетки.',
     U + 'photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
     'Kraft burger qutilari, zich qora salfetkalar va relyef kashtali beysbolkalar',
     'Крафт бургер-боксы, плотные чёрные салфетки и бейсболки с рельефной вышивкой',
     ('BURGER CRAFT', 'STREET FOOD LAB', '#111111', '#FF6B35', '#FFFFFF', '🍔'),
     [('Yirik nam salfetka', 'wetwipe', 'Qora qadoq, qalin to‘qima (burgerdan keyin qulay tozalash)', '2 rangli flekso'),
      ('Xodim kepkasi', 'cap', 'Qora beysbolka, 3D relyefli apelsin rang kashta', 'Relyef kashta'),
      ('Kassir futbolkasi', 'polo', 'Qora 100% paxta T-shirt, ko‘krak va yelkada bosma', 'DTF bosma'),
      ('Kraft burger xaltasi', 'packaging', 'Logotipli xavfsizlik tasmali eko-paket', 'Shelkografiya')],
     [('Большая влажная салфетка', 'wetwipe', 'Чёрная упаковка, плотное полотно (удобно после бургера)', 'Флексо в 2 цвета'),
      ('Кепка персонала', 'cap', 'Чёрная бейсболка, оранжевая 3D-рельефная вышивка', 'Рельефная вышивка'),
      ('Футболка кассира', 'polo', 'Чёрная 100% хлопковая футболка, печать на груди и плече', 'DTF-печать'),
      ('Крафт-пакет для бургера', 'packaging', 'Эко-пакет с защитной лентой и логотипом', 'Шелкография')]),
    ('black-bean', 'Coffee Shop',
     'Toshkent sh., Markaz-1', 'г. Ташкент, Центр-1',
     'Speciality qahva madaniyati va sokin muhit', 'Культура specialty-кофе и тихая атмосфера',
     'Qahvaxonada eng muhim detal baristaning tashqi qiyofasi va stakanlar. Qora denim fartuklar va oltin shtampli hisob papkalari bilan qahvaxona brendi to‘liq yaxlitlik kasb etdi.',
     'В кофейне самая важная деталь — внешний вид бариста и стаканы. Чёрные джинсовые фартуки и счёт-папки с золотым штампом придали бренду кофейни полную целостность.',
     U + 'photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
     'Qora denim barista fartugi, shtamp bosmali stakanlar va charm hisob papkasi',
     'Чёрный джинсовый фартук бариста, стаканы со штампом и кожаная счёт-папка',
     ('BLACK BEAN', 'SPECIALITY ROASTERS', '#1C1917', '#E6C774', '#FFFFFF', '☕'),
     [('Barista fartugi', 'apron', 'Juda qalin to‘q kulrang kanvas, sariq jez tugmalar', 'Metall detallar + Kashta'),
      ('Nam salfetka', 'wetwipe', 'Matte espresso qadoq, xushbo‘y vanil hidi bilan', 'Premium flekso'),
      ('Stakan g‘ilofi', 'packaging', 'Gofrokarton sleeve, qora shtamp bosma', 'Ofset')],
     [('Фартук бариста', 'apron', 'Очень плотный тёмно-серый канвас, латунные пуговицы', 'Металлодетали + вышивка'),
      ('Влажная салфетка', 'wetwipe', 'Матовая эспрессо-упаковка с ароматом ванили', 'Премиум флексо'),
      ('Слив для стакана', 'packaging', 'Гофрокартонный слив, чёрный штамп', 'Офсет')]),
    ('royal-catering', 'Catering',
     'Toshkent va viloyatlar', 'Ташкент и регионы',
     'Sayyor banketlar va yuqori martabali qabullar', 'Выездные банкеты и приёмы высокого уровня',
     'Turli joylarda xizmat ko‘rsatadigan sayyor jamoa uchun kiyimlarning estetikasi va bir xilligi hal qiluvchi ahamiyatga ega. Oq klassik ko‘ylaklar, yashil fartuklar va salfetkalar to‘liq monogramma bilan bezatildi.',
     'Для выездной команды, обслуживающей разные локации, эстетика и единообразие формы имеют решающее значение. Белые классические рубашки, зелёные фартуки и салфетки полностью украшены монограммой.',
     U + 'photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
     'Yuqori martabali banket stoli, zumrad fartuklar va oltin gerbli xushbo‘y salfetkalar',
     'Банкетный стол высокого уровня, изумрудные фартуки и салфетки с золотым гербом',
     ('ROYAL CATERING', 'EXCLUSIVE EVENT SERVICE', '#0E2A1E', '#D4AF37', '#FFFFFF', '✦'),
     [('Ofitsiant fartugi', 'apron', 'To‘q zumrad rangli premium fartuk, oltin monogramma', 'Luks kashta'),
      ('Klassik ko‘ylak', 'polo', 'Oq paxta ko‘ylak yoqasiga nozik monogramma', 'Kashta'),
      ('Mehmon nam salfetkasi', 'wetwipe', 'Katta formatli qalin salfetka, oltin gerb', 'Folga bosma')],
     [('Фартук официанта', 'apron', 'Премиальный фартук тёмно-изумрудного цвета, золотая монограмма', 'Люкс-вышивка'),
      ('Классическая рубашка', 'polo', 'Нежная монограмма на воротнике белой хлопковой рубашки', 'Вышивка'),
      ('Гостевая влажная салфетка', 'wetwipe', 'Плотная салфетка большого формата, золотой герб', 'Фольгированная печать')]),
]

W = 'https://images.unsplash.com/'

SLIDERS = {
    'uz': {
        'badge': 'Taqqoslash slayderi — Real natija',
        'title': 'Oddiy mahsulot → Brend mahsuloti',
        'description': 'Slayderni chapga-o‘ngga surib, oddiy buyum qanday qilib restoran nufuzini ko‘rsatuvchi real brend elementiga aylanishini bevosita taqqoslang.',
        'bottomNote': 'Barcha mahsulotlar real restoran muhitida sinovdan o‘tgan va yuqori sifatli texnologiyada brendlangan.',
        'pairs': {
            'wetwipe': {'label': 'Nam salfetka', 'before': W + 'photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=900&q=80', 'after': W + 'photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=900&q=80', 'beforeCaption': 'Oddiy oq sachet (Brendsiz, standart)', 'afterCaption': 'Matte qora sachet + Oltin folgali restoran logotipi'},
            'apron': {'label': 'Oshpaz fartugi', 'before': W + 'photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=80', 'after': W + 'photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80', 'beforeCaption': 'Oddiy tekis fartuk (Korporativ belgisiz)', 'afterCaption': 'Qalin kanvas fartuk + Charm tasmalar + Oltin kashta'},
            'toothpick': {'label': 'Tish kovlagich', 'before': W + 'photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=900&q=80', 'after': W + 'photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80', 'beforeCaption': 'Stol ustidagi brendsiz oddiy quti', 'afterCaption': 'Zich qora karton quti + UV-lak + Restoran monogrammasi'},
            'polo': {'label': 'Xodim polosi', 'before': W + 'photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80', 'after': W + 'photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&q=80', 'beforeCaption': 'Oddiy kiyim (Xodim va mijoz farqlanmaydi)', 'afterCaption': '100% paxta piqué polo + Chap ko‘krakda nafis kashta'},
        },
    },
    'ru': {
        'badge': 'Слайдер сравнения — реальный результат',
        'title': 'Обычный продукт → Брендированный продукт',
        'description': 'Двигайте слайдер влево-вправо и напрямую сравнивайте, как обычный предмет превращается в реальный бренд-элемент, отражающий статус ресторана.',
        'bottomNote': 'Вся продукция протестирована в реальной ресторанной среде и забрендирована по высококачественной технологии.',
        'pairs': {
            'wetwipe': {'label': 'Влажная салфетка', 'before': W + 'photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=900&q=80', 'after': W + 'photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=900&q=80', 'beforeCaption': 'Обычное белое саше (без бренда, стандарт)', 'afterCaption': 'Матовое чёрное саше + логотип ресторана золотой фольгой'},
            'apron': {'label': 'Фартук повара', 'before': W + 'photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=80', 'after': W + 'photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80', 'beforeCaption': 'Обычный ровный фартук (без корпоративного знака)', 'afterCaption': 'Плотный канвасовый фартук + кожаные лямки + золотая вышивка'},
            'toothpick': {'label': 'Зубочистка', 'before': W + 'photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=900&q=80', 'after': W + 'photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80', 'beforeCaption': 'Обычная коробочка без бренда на столе', 'afterCaption': 'Плотная чёрная картонная коробка + УФ-лак + монограмма ресторана'},
            'polo': {'label': 'Поло персонала', 'before': W + 'photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80', 'after': W + 'photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&q=80', 'beforeCaption': 'Обычная одежда (персонал и гость не различаются)', 'afterCaption': '100% хлопковое поло пике + изящная вышивка на левой груди'},
        },
    },
}


def _project_data(pid, btype, loc, tagline, story, photo, caption, logo, items):
    name, subtext, primary, accent, text, symbol = logo
    return {
        'id': pid, 'clientName': '', 'businessType': btype, 'location': loc,
        'tagline': tagline, 'story': story,
        'realPhotoUrl': photo, 'realPhotoCaption': caption,
        'logoTheme': {'name': name, 'subtext': subtext, 'primaryColor': primary,
                      'accentColor': accent, 'textColor': text, 'symbol': symbol},
        'brandedItems': [
            {'title': t, 'itemType': it, 'detail': d, 'technique': te}
            for (t, it, d, te) in items
        ],
    }


def seed_site_cms():
    """Idempotent: faqat bo'sh bo'lsa to'ldiradi. (created_count, skipped) qaytaradi."""
    SiteContactInfo.get_solo()
    created = 0
    for (pid, btype, loc_uz, loc_ru, tag_uz, tag_ru, story_uz, story_ru,
         photo, cap_uz, cap_ru, logo, items_uz, items_ru) in PROJECTS:
        for lang, loc, tag, story, cap, items in (
            ('uz', loc_uz, tag_uz, story_uz, cap_uz, items_uz),
            ('ru', loc_ru, tag_ru, story_ru, cap_ru, items_ru),
        ):
            data = _project_data(pid, btype, loc, tag, story, photo, cap, logo, items)
            data['clientName'] = dict(
                [('sulton-saroy', 'Sulton Saroy'), ('aroma-bistro', 'Aroma Bistro & Bakery'),
                 ('chorsu-choyxona', 'Chorsu Choyxona'), ('burger-craft', 'Burger Craft Lab'),
                 ('black-bean', 'Black Bean Roastery'), ('royal-catering', 'Royal Banquet & Catering')]
            )[pid]
            _, was_created = SitePortfolioProject.objects.get_or_create(
                external_id=pid, lang=lang,
                defaults={'business_type': btype, 'is_published': True,
                          'published_at': '2024-01-15', 'data': data},
            )
            created += 1 if was_created else 0
    for lang, payload in SLIDERS.items():
        _, was_created = SiteBeforeAfter.objects.get_or_create(
            lang=lang, defaults={'data': payload})
        created += 1 if was_created else 0
    return created
