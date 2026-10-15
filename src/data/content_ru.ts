import { PortfolioProject } from '../types';

// Rus tilidagi portfolio seed ma'lumotlari (PORTFOLIO_PROJECTS bilan bir xil id/rasmlar)
export const PORTFOLIO_PROJECTS_RU: PortfolioProject[] = [
  {
    id: 'sulton-saroy',
    clientName: 'Sulton Saroy',
    businessType: 'Restoran',
    location: 'г. Ташкент, Юнусабад',
    tagline: 'Восточная роскошь и традиционная кухня',
    story: 'Клиент открывал новый национальный ресторан на 140 мест. По нашей рекомендации вместо пошива одежды они выбрали готовые премиальные чёрные поло и фартуки. Все настольные принадлежности, влажные салфетки и зубочистки забрендированы в золотистом металлическом стиле.',
    realPhotoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    realPhotoCaption: 'Премиальный чёрный матовый саше, коробочка для зубочисток и стол с золотой монограммой',
    logoTheme: {
      name: 'SULTON SAROY',
      subtext: 'RESTAURANT & LOUNGE',
      primaryColor: '#1A1817',
      accentColor: '#D4AF37',
      textColor: '#FFFFFF',
      symbol: '♛'
    },
    brandedItems: [
      { title: 'Влажная салфетка', itemType: 'wetwipe', detail: 'Матовая чёрная упаковка + восточный узор золотой фольгой', technique: 'Флексография + фольга' },
      { title: 'Зубочистка', itemType: 'toothpick', detail: 'Плотная чёрная картонная коробка, золотой герб', technique: 'УФ-лак и штамп' },
      { title: 'Фартук официанта', itemType: 'apron', detail: 'Канвасовый фартук цвета эспрессо, герб золотой нитью', technique: 'Плотная компьютерная вышивка' },
      { title: 'Поло администратора', itemType: 'polo', detail: 'Чёрное хлопковое поло пике, изящный герб на груди', technique: 'Вышивка' },
      { title: 'Национальная тюбетейка', itemType: 'cap', detail: 'Скрытый брендинг на чёрной бархатной тюбетейке', technique: 'Вышивка' }
    ]
  },
  {
    id: 'aroma-bistro',
    clientName: 'Aroma Bistro & Bakery',
    businessType: 'Kafe',
    location: 'г. Ташкент, Мирабад',
    tagline: 'Французская кондитерская и свежеобжаренный кофе',
    story: 'Городское кафе с уютной европейской атмосферой. На кофейные стаканчики, шоколадные влажные салфетки и песочные бежевые фартуки персонала нанесён единый минималистичный логотип современным шрифтом.',
    realPhotoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
    realPhotoCaption: 'Эко-крафт пакеты, песочные канвасовые фартуки и современные кофейные стаканы',
    logoTheme: {
      name: 'AROMA BISTRO',
      subtext: 'ARTISAN BAKERY • 2024',
      primaryColor: '#2D241E',
      accentColor: '#C49A6C',
      textColor: '#FFFFFF',
      symbol: '☕'
    },
    brandedItems: [
      { title: 'Влажная салфетка', itemType: 'wetwipe', detail: 'Эко-бежевая матовая упаковка, силуэт кофейного зерна', technique: 'Цифровое флексо' },
      { title: 'Коробочка для зубочисток', itemType: 'toothpick', detail: 'Крафт-коробочка, минималистичная чёрная печать', technique: 'Офсетная печать' },
      { title: 'Фартук бариста', itemType: 'apron', detail: 'Канвас цвета хаки, кожаные лямки, вышитый логотип', technique: 'Плотная вышивка' },
      { title: 'Крафт-пакет', itemType: 'packaging', detail: 'Переработанный эко-пакет для круассанов и багетов', technique: 'Шелкография' }
    ]
  },
  {
    id: 'chorsu-choyxona',
    clientName: 'Chorsu Choyxona',
    businessType: 'Choyxona',
    location: 'г. Самарканд',
    tagline: 'Узбекское гостеприимство и блюда из тандыра',
    story: 'Для традиционной чайханы забрендированы готовые тёмно-синие поло и тюбетейки для 60 сотрудников. Каждый элемент дастархана обеспечен логотипом чайханы — гости чувствуют себя в настоящем культурном месте.',
    realPhotoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    realPhotoCaption: 'Традиционный дастархан, тёмно-синие поло и тюбетейки с национальным узором',
    logoTheme: {
      name: 'CHORSU',
      subtext: 'CHOYXONA & OSH MARKAZI',
      primaryColor: '#122538',
      accentColor: '#00A896',
      textColor: '#FFFFFF',
      symbol: '🫖'
    },
    brandedItems: [
      { title: 'Влажная салфетка', itemType: 'wetwipe', detail: 'Синяя упаковка, символ чайника и национальный узор', technique: 'Флексопечать' },
      { title: 'Поло персонала', itemType: 'polo', detail: 'Синее поло, крупный логотип на спине', technique: 'Термотрансфер' },
      { title: 'Национальная тюбетейка', itemType: 'cap', detail: 'Логотип в гармонии с традиционной шёлковой вышивкой', technique: 'Ручная и машинная вышивка' },
      { title: 'Упаковка плова takeaway', itemType: 'packaging', detail: 'Картонные термобоксы для плова', technique: 'Офсетная печать' }
    ]
  },
  {
    id: 'burger-craft',
    clientName: 'Burger Craft Lab',
    businessType: 'Fast Food',
    location: 'г. Ташкент, Чиланзар',
    tagline: 'Смеш-бургеры и любимое место молодёжи',
    story: 'Быстрый сервис и сильный визуальный образ. Для кухонного персонала забрендированы чёрные футболки и кепки, для доставки — плотные чёрные бургер-боксы и жиронепроницаемые влажные салфетки.',
    realPhotoUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
    realPhotoCaption: 'Крафт бургер-боксы, плотные чёрные салфетки и бейсболки с рельефной вышивкой',
    logoTheme: {
      name: 'BURGER CRAFT',
      subtext: 'STREET FOOD LAB',
      primaryColor: '#111111',
      accentColor: '#FF6B35',
      textColor: '#FFFFFF',
      symbol: '🍔'
    },
    brandedItems: [
      { title: 'Большая влажная салфетка', itemType: 'wetwipe', detail: 'Чёрная упаковка, плотное полотно (удобно после бургера)', technique: 'Флексо в 2 цвета' },
      { title: 'Кепка персонала', itemType: 'cap', detail: 'Чёрная бейсболка, оранжевая 3D-рельефная вышивка', technique: 'Рельефная вышивка' },
      { title: 'Футболка кассира', itemType: 'polo', detail: 'Чёрная 100% хлопковая футболка, печать на груди и плече', technique: 'DTF-печать' },
      { title: 'Крафт-пакет для бургера', itemType: 'packaging', detail: 'Эко-пакет с защитной лентой и логотипом', technique: 'Шелкография' }
    ]
  },
  {
    id: 'black-bean',
    clientName: 'Black Bean Roastery',
    businessType: 'Coffee Shop',
    location: 'г. Ташкент, Центр-1',
    tagline: 'Культура specialty-кофе и тихая атмосфера',
    story: 'В кофейне самая важная деталь — внешний вид бариста и стаканы. Чёрные джинсовые фартуки и счёт-папки с золотым штампом придали бренду кофейни полную целостность.',
    realPhotoUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    realPhotoCaption: 'Чёрный джинсовый фартук бариста, стаканы со штампом и кожаная счёт-папка',
    logoTheme: {
      name: 'BLACK BEAN',
      subtext: 'SPECIALITY ROASTERS',
      primaryColor: '#1C1917',
      accentColor: '#E6C774',
      textColor: '#FFFFFF',
      symbol: '☕'
    },
    brandedItems: [
      { title: 'Фартук бариста', itemType: 'apron', detail: 'Очень плотный тёмно-серый канвас, латунные пуговицы', technique: 'Металлодетали + вышивка' },
      { title: 'Влажная салфетка', itemType: 'wetwipe', detail: 'Матовая эспрессо-упаковка с ароматом ванили', technique: 'Премиум флексо' },
      { title: 'Слив для стакана', itemType: 'packaging', detail: 'Гофрокартонный слив, чёрный штамп', technique: 'Офсет' }
    ]
  },
  {
    id: 'royal-catering',
    clientName: 'Royal Banquet & Catering',
    businessType: 'Catering',
    location: 'Ташкент и регионы',
    tagline: 'Выездные банкеты и приёмы высокого уровня',
    story: 'Для выездной команды, обслуживающей разные локации, эстетика и единообразие формы имеют решающее значение. Белые классические рубашки, зелёные фартуки и салфетки полностью украшены монограммой.',
    realPhotoUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
    realPhotoCaption: 'Банкетный стол высокого уровня, изумрудные фартуки и салфетки с золотым гербом',
    logoTheme: {
      name: 'ROYAL CATERING',
      subtext: 'EXCLUSIVE EVENT SERVICE',
      primaryColor: '#0E2A1E',
      accentColor: '#D4AF37',
      textColor: '#FFFFFF',
      symbol: '✦'
    },
    brandedItems: [
      { title: 'Фартук официанта', itemType: 'apron', detail: 'Премиальный фартук тёмно-изумрудного цвета, золотая монограмма', technique: 'Люкс-вышивка' },
      { title: 'Классическая рубашка', itemType: 'polo', detail: 'Нежная монограмма на воротнике белой хлопковой рубашки', technique: 'Вышивка' },
      { title: 'Гостевая влажная салфетка', itemType: 'wetwipe', detail: 'Плотная салфетка большого формата, золотой герб', technique: 'Фольгированная печать' }
    ]
  }
];
