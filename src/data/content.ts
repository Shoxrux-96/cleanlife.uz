import { ServiceItem, ProductItem, PortfolioProject, FAQItem } from '../types';

export const CORE_POSITIONING = {
  headline: "Oddiy mahsulotni brendingizga aylantiramiz.",
  supportingText: "Tayyor kiyimlar, nam salfetkalar, tish kovlagich qutilari va boshqa mahsulotlarga logotipingizni professional joylashtiramiz. Restoran va xizmat ko‘rsatish biznesingiz uchun yagona brend ko‘rinishini yaratamiz.",
  notAFactoryBadge: "Biz kiyim tikmaymiz — tayyor mahsulotlarga brendingizni joylashtiramiz",
  slogan: "Oddiy mahsulotni brend mahsulotiga aylantiramiz.",
  tagline: "Restoraningiz brendi — salfetkadan xodim formasigacha.",
  subTagline: "Logotipingizni mijoz ko‘radigan har bir detalga joylashtiramiz.",
  processFormula: "LOGO → MAHSULOT → BREND",
  finalMessage: "Brending — mijoz ko‘radigan har bir detalda.",
};

export const SERVICES_DATA: ServiceItem[] = [
  {
    id: 'wet-wipes',
    number: '01',
    title: 'Nam salfetkalar',
    shortDesc: 'Nam salfetka qadoqlariga restoraningiz logotipi va brend dizaynini joylashtiramiz.',
    fullDesc: 'Mijoz stolga o‘tirgan ilk daqiqalardanoq brendingiz bilan to‘qnashadi. Bir martalik nam salfetkalarning tashqi qadog‘iga logotip, QR-menyu, ijtimoiy tarmoqlar va premium dizaynni yuqori sifatli fleksografiya yoki raqamli bosma orqali tushiramiz.',
    tag: 'Stol usti brendingi',
    features: ['Mat yoki yaltiroq qoplama', 'Issiq/sovuq xushbo‘y impregnatsiya', 'QR-menyu va kontaktlar joylashtirish'],
    materials: ['Uch qavatli metalllashtirilgan plyonka', 'Eko-kraft qopqoqli paketlar'],
    techniques: ['Fleksografik bosma', 'HD Raqamli bosma'],
    mockupType: 'wetwipe',
    realPhotoUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'toothpick-boxes',
    number: '02',
    title: 'Tish kovlagich qutilari',
    shortDesc: 'Restoran stolida turadigan tish kovlagich qutilarini ham brendingizning bir qismiga aylantiramiz.',
    fullDesc: 'Kichik, ammo har bir mijoz e’tibor qaratadigan eng faol aloqa nuqtasi. Stol ustidagi tish kovlagich qutilariga restoraningiz timsoli, milliy ornament yoki lakonik logotipini estetik va toza joylashtiramiz.',
    tag: 'Detal brendingi',
    features: ['Stol estetikasini oshiradi', 'Individual o‘ramdagi tish kovlagichlar', 'Kompakt va chiroyli dizayn'],
    materials: ['Melovanniy zich karton', 'Eko Kraft karton', 'Mat laminatsiya'],
    techniques: ['Ofset bosma + UV-lak', 'Folga tushirish (Gold/Silver)'],
    mockupType: 'toothpick',
    realPhotoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'staff-clothing',
    number: '03',
    title: 'Tayyor xodim kiyimlari',
    shortDesc: 'Tayyor kiyimlarga logotipingizni professional tarzda joylashtiramiz.',
    fullDesc: 'MUHIM: Biz kiyim tikmaymiz! Siz xarid qilgan yoki bizning tavsiya etilgan tayyor tekis kiyimlarga (T-shirt, Polo, ko‘ylak, jilet, kepka, do‘ppi) chidamli kashta yoki yuqori bosimli termotransfer usulida logotipingizni mukammal tushirib beramiz.',
    tag: 'Xodimlar ko‘rinishi',
    features: ['Yuvilishga va quyoshga chidamli', 'Ko‘krak, yeng va orqa qismga joylashtirish', 'Kichik va yirik partiyalar'],
    materials: ['Tayyor 100% paxta polo', 'Premium aralash matolar', 'Piqué to‘qima'],
    techniques: ['Zich kompyuter kashtasi', 'DTF va Termotransfert', 'Ipakli shelkografiya'],
    mockupType: 'staff',
    realPhotoUrl: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'chef-uniforms',
    number: '04',
    title: 'Oshpaz kiyimlari',
    shortDesc: 'Tayyor oshpaz kiyimlariga restoran logotipi va korporativ identifikatsiyasini joylashtiramiz.',
    fullDesc: 'Oshpaz va pitssamakerlarning tayyor kiyimlari (kurtka, fartuk, maxsus kepkalar) oshxonaning yuqori harorati va tez-tez yuvilishiga duch keladi. Shuning uchun biz issiqlikka va oqartiruvchi vositalarga bardoshli professional ipli kashta va polimer bosma qo‘llaymiz.',
    tag: 'Oshxona nufuzi',
    features: ['Yuqori haroratga bardoshli ip', 'Bosh oshpaz ism-sharifini kashta qilish', 'Premium charm yoki metall detallarga uyg‘unlik'],
    materials: ['Tayyor twill va kanvas fartuklar', 'Oshpaz kiyimlari'],
    techniques: ['Metalllashgan ipli kashta', 'Yuqori chidamlilikdagi DTF'],
    mockupType: 'chef',
    realPhotoUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'waiter-uniforms',
    number: '05',
    title: 'Ofitsiant va xodim kiyimlari',
    shortDesc: 'Ofitsiant, kassir, administrator va boshqa xodimlarning tayyor kiyimlarini brendingizga moslashtiramiz.',
    fullDesc: 'Restoran xizmatining yuzi bo‘lgan ofitsiantlar va baristalarning tayyor polo, ko‘ylak va fartuklarini bir xil rang va standartda brendlaymiz. Mijoz ko‘zidagi xizmat sifatini darhol yuqori pog‘onaga olib chiqadi.',
    tag: 'Yagona jamoa uslubi',
    features: ['Bir xil rang va kontrast uyg‘unligi', 'Kassir, barista va ofitsiantlar uchun ierarxiya', 'Nafis va qat’iy korporativ ko‘rinish'],
    materials: ['Klassik tayyor ko‘ylaklar', 'Qora va bej rangli matolar'],
    techniques: ['Nafis monoxrom kashta', 'Relyefli bosma'],
    mockupType: 'waiter',
    realPhotoUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'packaging-products',
    number: '06',
    title: 'Qadoqlash va boshqa mahsulotlar',
    shortDesc: 'Biznesingizda mijoz ko‘radigan boshqa mahsulotlarga ham logotip va brend elementlarini joylashtiramiz.',
    fullDesc: 'Buyurtmani olib ketish (takeaway) va yetkazib berish jarayonida brendingiz uzluksiz davom etsin: qog‘oz kraft paketlar, burger va lavash qutilari, bir martalik stakan g‘iloflari, kassa cheki papkalari va firmenniy stikerlar.',
    tag: 'Takeaway va yetkazib berish',
    features: ['Eko-do‘stona mahsulotlar', 'Yetkazib berishda brendni eslatib turish', 'Stiker va plomba tasmalari'],
    materials: ['Kraft qog‘oz', 'Gofrokarton', 'Bambuk va eko-tolalar'],
    techniques: ['Flekso bosma', 'Shelkotrafaret', 'Raqamli shtamp'],
    mockupType: 'packaging',
    realPhotoUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80'
  }
];

export const PRODUCTS_CATALOG: ProductItem[] = [
  // Kiyimlar
  {
    id: 'p-polo',
    name: 'Tayyor Polo futbolkalar',
    category: 'kiyimlar',
    description: 'Ofitsiant, administrator va kuryerlar uchun piqué to‘qimali tayyor polo futbolkalarga ko‘krak va yeng qismiga kashta yoki bosma.',
    suitableFor: 'Restoranlar, Kafelar, Barista jamoasi',
    printMethods: ['Zich kashta (Embroidery)', 'DTF Termobosma'],
    minOrder: '10 dona',
    leadTime: '2-4 ish kuni',
    popular: true,
    imageUrl: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=700&q=80',
    realPhotoCaption: '100% paxta piqué to‘qimali qora poloda zich oltin ipli nafis kashta'
  },
  {
    id: 'p-tshirt',
    name: 'Tayyor Paxta T-shirtlar',
    category: 'kiyimlar',
    description: 'Fast-food, yetkazib berish va oshxona yordamchilari uchun qulay, nafas oluvchi 100% paxta tayyor futbolkalarga yorqin logotip.',
    suitableFor: 'Fast Food, Pitseriya, Yetkazib berish xizmati',
    printMethods: ['Ipakli shelkografiya', 'DTF bosma'],
    minOrder: '20 dona',
    leadTime: '2-3 ish kuni',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=700&q=80',
    realPhotoCaption: 'Oshxona va yetkazib berish xodimlari uchun premium paxta T-shirt + DTF bosma'
  },
  {
    id: 'p-apron',
    name: 'Tayyor Barista va Oshpaz Fartuklari',
    category: 'kiyimlar',
    description: 'Qalin kanvas va denim matodan tayyorlangan fartuklarga yuqori haroratga chidamli kashta va metall elementlar bilan logo joylashtirish.',
    suitableFor: 'Coffee Shop, Restoran, Steakhouse',
    printMethods: ['Kashta', 'Charm/patch ustiga bosma'],
    minOrder: '5 dona',
    leadTime: '3-5 ish kuni',
    popular: true,
    imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=700&q=80',
    realPhotoCaption: 'Qalin kanvas fartuk, tabiiy charm tasmalar, jez fitinglar va kashta emblemasi'
  },
  {
    id: 'p-chefjacket',
    name: 'Tayyor Oshpaz Kurtkalari',
    category: 'kiyimlar',
    description: 'Klassik oq, qora va kulrang oshpaz kurtkalariga restoran gerbi, nomi va bosh oshpaz ism-sharifini kashta qilish.',
    suitableFor: 'Bosh oshpazlar, Sous-chef, Shifokor-oshpazlar',
    printMethods: ['Oltin/kumush ipli kashta', 'Standart kashta'],
    minOrder: '3 dona',
    leadTime: '2-4 ish kuni',
    imageUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=700&q=80',
    realPhotoCaption: 'Bosh oshpaz kurtkasi ko‘kragiga restoran gerbi va shaxsiy monogramma kashtasi'
  },
  {
    id: 'p-headwear',
    name: 'Tayyor Kepka va Milliy Do‘ppilar',
    category: 'kiyimlar',
    description: 'Zamonaviy beysbolka kepkalar hamda milliy choyxona va milliy taomlar maskanlari uchun maxsus brendlangan do‘ppilar.',
    suitableFor: 'Choyxonalar, Milliy oshxonalar, Burgerxona',
    printMethods: ['3D Relyefli kashta', 'Termotransfer'],
    minOrder: '15 dona',
    leadTime: '3-5 ish kuni',
    popular: true,
    imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=700&q=80',
    realPhotoCaption: '3D bo‘rtma relyefli kashtali kepka va naqshli milliy brendlangan do‘ppilar'
  },

  // Stol usti mahsulotlari
  {
    id: 'p-wetwipe',
    name: 'Brendlangan Nam Salfetkalar (Individual)',
    category: 'stol',
    description: 'Bir dona qadoqlangan, xushbo‘y nam salfetka paketiga 1 dan 4 ranggacha to‘liq logotip, QR-menyu va kontaktlar joylashtirish.',
    suitableFor: 'Barcha HoReCa turlari, To‘yxona, Mehmonxona',
    printMethods: ['Fleksografiya', 'Metalllashtirilgan bosma'],
    minOrder: '1,000 dona',
    leadTime: '5-7 ish kuni',
    popular: true,
    imageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=700&q=80',
    realPhotoCaption: 'Matte qora folga sachet, oltin muhrli logotip va QR-menyu bosmasi'
  },
  {
    id: 'p-toothpick',
    name: 'Brendlangan Tish Kovlagich Qutilari',
    category: 'stol',
    description: 'Stol usti uchun mo‘ljallangan zich karton qutichalarga to‘liq rangli bosma va himoya laminatsiyasi. Har bir tish kovlagich gigiyenik o‘ralgan.',
    suitableFor: 'Restoranlar, Kafelar, Choyxonalar',
    printMethods: ['Ofset bosma', 'Mat laminatsiya + UV lak'],
    minOrder: '500 dona',
    leadTime: '4-6 ish kuni',
    popular: true,
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=80',
    realPhotoCaption: 'Zich qora kartondan tayyorlangan stol usti tish kovlagich qutisi + UV-lak'
  },
  {
    id: 'p-napkin',
    name: 'Brendlangan Quruq Qog‘oz Salfetkalar',
    category: 'stol',
    description: '1 va 2 qavatli yumshoq selluloza salfetkalarga oziq-ovqat xavfsiz bo‘yoqlari bilan logotip bosish.',
    suitableFor: 'Fast Food, Kafe, Qahvaxonalar',
    printMethods: ['Eko-suvli fleksografiya'],
    minOrder: '2,000 dona',
    leadTime: '4-6 ish kuni',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=700&q=80',
    realPhotoCaption: '2 qavatli selluloza restoran salfetkalariga oziq-ovqat xavfsiz bo‘yoqli bosma'
  },
  {
    id: 'p-billholder',
    name: 'Hisob-Kitob Papkalari va Menyu Qopqoqlari',
    category: 'stol',
    description: 'Ofitsiant chek olib keladigan charm yoki kraft papkalarga issiq shtamp (blint) yoki oltin folga orqali logotip tushirish.',
    suitableFor: 'Premium restoranlar, Lounge bar',
    printMethods: ['Issiq folga tushirish (Hot stamping)', 'Gravirovka'],
    minOrder: '10 dona',
    leadTime: '3-5 ish kuni',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=700&q=80',
    realPhotoCaption: 'Tabiiy charm va kraft hisob papkalariga issiq oltin folga shtampi (Hot stamping)'
  },

  // Qadoqlash
  {
    id: 'p-kraftbag',
    name: 'Brendlangan Kraft Qog‘oz Paketlar',
    category: 'qadoq',
    description: 'Olib ketish va yetkazib berish uchun tutqichli yoki tekis tubli kraft paketlarga katta o‘lchamli aniq logotip va brend shiori.',
    suitableFor: 'Nonvoyxonalar, Kafe, Fast Food, Sushixona',
    printMethods: ['Shelkografiya', 'Flekso bosma'],
    minOrder: '300 dona',
    leadTime: '3-6 ish kuni',
    popular: true,
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=700&q=80',
    realPhotoCaption: 'Eko kraft qog‘oz xaltalariga to‘liq formatli shelkografik logotip va shior'
  },
  {
    id: 'p-box',
    name: 'Burger, Pitsa va Taom Qutilari',
    category: 'qadoq',
    description: 'Tayyor oziq-ovqat karton qutilariga tashqi brend bosmasi va haroratni saqlovchi firmenniy dizayn.',
    suitableFor: 'Pitseriya, Burger tarmog‘i, Catering',
    printMethods: ['Ofset bosma', 'Yorliqli muhr'],
    minOrder: '500 dona',
    leadTime: '5-8 ish kuni',
    imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=700&q=80',
    realPhotoCaption: 'Burger, lavash va pitsa karton qutilariga haroratni saqlovchi firmenniy bosma'
  },
  {
    id: 'p-cupsleeve',
    name: 'Qahva Stakan G‘iloflari (Sleeve)',
    category: 'qadoq',
    description: 'Qo‘lni issiqdan saqlovchi gofrokarton kofe stakan g‘iloflariga restoran va qahvaxona logotipi.',
    suitableFor: 'Coffee Shop, Nonvoyxona, Kafe',
    printMethods: ['Flekso bosma'],
    minOrder: '1,000 dona',
    leadTime: '3-5 ish kuni',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=700&q=80',
    realPhotoCaption: 'Gofrokarton kofe stakan g‘iloflariga qahvaxona shtamp bosmasi'
  },

  // Promo mahsulotlar
  {
    id: 'p-badges',
    name: 'Magnitli Xodim Beyjiklari',
    category: 'promo',
    description: 'Kiyimni teshmaydigan kuchli neodim magnitli metall va akril beyjiklarga restoran logotipi va ofitsiant ismi.',
    suitableFor: 'Barcha restoran va mehmonxona xodimlari',
    printMethods: ['UV-bosma', 'Lazer gravirovka'],
    minOrder: '5 dona',
    leadTime: '1-2 ish kuni',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=700&q=80',
    realPhotoCaption: 'Kiyimni saqlovchi kuchli magnitli jez/alyuminiy metall beyjiklar'
  },
  {
    id: 'p-pens',
    name: 'Brendlangan Metall va Eko Ruchkalar',
    category: 'promo',
    description: 'Hisob cheki bilan birga taqdim etiladigan yoki mehmonlarga esdalik qoladigan nafis korporativ ruchkalar.',
    suitableFor: 'Restoranlar, Mehmonxonalar, Tadbirlar',
    printMethods: ['Tamponli bosma', 'Lazer gravirovka'],
    minOrder: '50 dona',
    leadTime: '2-4 ish kuni',
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=700&q=80',
    realPhotoCaption: 'Lazerda gravirovka qilingan monoxrom mot metall ruchkalar'
  }
];

export const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: 'sulton-saroy',
    clientName: 'Sulton Saroy',
    businessType: 'Restoran',
    location: 'Toshkent sh., Yunusobod',
    tagline: 'Sharqona hashamat va an’anaviy taomlar maskani',
    story: 'Mijoz 140 o‘rinli yangi milliy restoranni ochish arafasida edi. Ular alohida kiyim tiktirish o‘rniga, bizning tavsiyamiz bilan tayyor premium qora polo va fartuklarni tanlashdi. Barcha stol usti vositalari, nam salfetkalar va tish kovlagichlar oltin metall tusli uslubda brendlandi.',
    realPhotoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    realPhotoCaption: 'Premium qora mat sachet, tish kovlagich qutisi va oltin monogrammali stol muhiti',
    logoTheme: {
      name: 'SULTON SAROY',
      subtext: 'RESTAURANT & LOUNGE',
      primaryColor: '#1A1817',
      accentColor: '#D4AF37',
      textColor: '#FFFFFF',
      symbol: '♛'
    },
    brandedItems: [
      { title: 'Nam salfetka', itemType: 'wetwipe', detail: 'Mat qora o‘ram + Oltin folga tushirilgan sharqona naqsh', technique: 'Fleksografiya + Folga' },
      { title: 'Tish kovlagich', itemType: 'toothpick', detail: 'Zich qora karton quti, tillarang gerb', technique: 'UV-lak va shtamp' },
      { title: 'Ofitsiant fartugi', itemType: 'apron', detail: 'Espresso rangli kanvas fartuk, oltin ipli gerb', technique: 'Zich kompyuter kashtasi' },
      { title: 'Administrator polosi', itemType: 'polo', detail: 'Qora piqué paxta polo, ko‘krak qismida nafis gerb', technique: 'Kashta' },
      { title: 'Milliy do‘ppi', itemType: 'cap', detail: 'Qora baxmal do‘ppi hoshiyasida yashirin brending', technique: 'Kashta' }
    ]
  },
  {
    id: 'aroma-bistro',
    clientName: 'Aroma Bistro & Bakery',
    businessType: 'Kafe',
    location: 'Toshkent sh., Mirobod',
    tagline: 'Fransuz qandolatchiligi va yangi qovurilgan qahva',
    story: 'Yevropacha shinam atmosferaga ega shahar kafesi. Qahva stakan g‘iloflari, shokoladli nam salfetkalar va xodimlarining qum rangli bej fartuklariga bir xil minimalistik zamonaviy shriftli logotip tushirildi.',
    realPhotoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
    realPhotoCaption: 'Eko-kraft paketlar, qum rangli kanvas fartuklar va zamonaviy qahva stakanlari',
    logoTheme: {
      name: 'AROMA BISTRO',
      subtext: 'ARTISAN BAKERY • 2024',
      primaryColor: '#2D241E',
      accentColor: '#C49A6C',
      textColor: '#FFFFFF',
      symbol: '☕'
    },
    brandedItems: [
      { title: 'Nam salfetka', itemType: 'wetwipe', detail: 'Eko-bej mat qadoq, qahva donasi silueti', technique: 'Raqamli flekso' },
      { title: 'Tish kovlagich qutisi', itemType: 'toothpick', detail: 'Kraft quticha, minimalist qora bosma', technique: 'Ofset bosma' },
      { title: 'Barista fartugi', itemType: 'apron', detail: 'Xaki rangli kanvas, charm tasmali, kashta logo', technique: 'Zich kashta' },
      { title: 'Kraft paket', itemType: 'packaging', detail: 'Kruassan va bagetlar uchun qayta ishlangan eko-paket', technique: 'Shelkografiya' }
    ]
  },
  {
    id: 'chorsu-choyxona',
    clientName: 'Chorsu Choyxona',
    businessType: 'Choyxona',
    location: 'Samarqand sh.',
    tagline: 'O‘zbekona mehmondo‘stlik va tandir taomlari',
    story: 'An’anaviy choyxona uchun 60 nafar xodimga tayyor to‘q ko‘k pololar va do‘ppilar brendlandi. Dasturxondagi har bir element choyxona logotipi bilan ta’minlandi, natijada mehmonlar o‘zlarini haqiqiy madaniy maskanda his qilishadi.',
    realPhotoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    realPhotoCaption: 'An’anaviy choyxona dasturxoni, to‘q ko‘k pololar va milliy naqshli do‘ppilar',
    logoTheme: {
      name: 'CHORSU',
      subtext: 'CHOYXONA & OSH MARKAZI',
      primaryColor: '#122538',
      accentColor: '#00A896',
      textColor: '#FFFFFF',
      symbol: '🫖'
    },
    brandedItems: [
      { title: 'Nam salfetka', itemType: 'wetwipe', detail: 'Ko‘k o‘ram, choynak timsoli va milliy islimiy naqsh', technique: 'Flekso bosma' },
      { title: 'Choyxona xodimi polosi', itemType: 'polo', detail: 'Ko‘k polo, orqa qismida katta logotip', technique: 'Termotransfer' },
      { title: 'Milliy do‘ppi', itemType: 'cap', detail: 'Ipak ipli an’anaviy kashta bilan uyg‘unlashtirilgan logo', technique: 'Qo‘lda va mashinada kashta' },
      { title: 'Takeaway osh qadoqlari', itemType: 'packaging', detail: 'Maxsus termal jilvali palov idishi kartonlari', technique: 'Ofset bosma' }
    ]
  },
  {
    id: 'burger-craft',
    clientName: 'Burger Craft Lab',
    businessType: 'Fast Food',
    location: 'Toshkent sh., Chilonzor',
    tagline: 'Smash burgerlar va yoshlar sevimli maskani',
    story: 'Tezkor xizmat va kuchli vizual qiyofa. Oshxona xodimlari uchun qora futbolkalar va kepkalar, yetkazib berish uchun esa qalin qora burger qutilari va yog‘ o‘tkazmaydigan nam salfetkalar brendlandi.',
    realPhotoUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
    realPhotoCaption: 'Kraft burger qutilari, zich qora salfetkalar va relyef kashtali beysbolkalar',
    logoTheme: {
      name: 'BURGER CRAFT',
      subtext: 'STREET FOOD LAB',
      primaryColor: '#111111',
      accentColor: '#FF6B35',
      textColor: '#FFFFFF',
      symbol: '🍔'
    },
    brandedItems: [
      { title: 'Yirik nam salfetka', itemType: 'wetwipe', detail: 'Qora qadoq, qalin to‘qima (burgerdan keyin qulay tozalash)', technique: '2 rangli flekso' },
      { title: 'Xodim kepkasi', itemType: 'cap', detail: 'Qora beysbolka, 3D relyefli apelsin rang kashta', technique: 'Relyef kashta' },
      { title: 'Kassir futbolkasi', itemType: 'polo', detail: 'Qora 100% paxta T-shirt, ko‘krak va yelkada bosma', technique: 'DTF bosma' },
      { title: 'Kraft burger xaltasi', itemType: 'packaging', detail: 'Logotipli xavfsizlik tasmali eko-paket', technique: 'Shelkografiya' }
    ]
  },
  {
    id: 'black-bean',
    clientName: 'Black Bean Roastery',
    businessType: 'Coffee Shop',
    location: 'Toshkent sh., Markaz-1',
    tagline: 'Speciality qahva madaniyati va sokin muhit',
    story: 'Qahvaxonada eng muhim detal baristaning tashqi qiyofasi va stakanlar. Qora denim fartuklar va oltin shtampli hisob papkalari bilan qahvaxona brendi to‘liq yaxlitlik kasb etdi.',
    realPhotoUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
    realPhotoCaption: 'Qora denim barista fartugi, shtamp bosmali stakanlar va charm hisob papkasi',
    logoTheme: {
      name: 'BLACK BEAN',
      subtext: 'SPECIALITY ROASTERS',
      primaryColor: '#1C1917',
      accentColor: '#E6C774',
      textColor: '#FFFFFF',
      symbol: '☕'
    },
    brandedItems: [
      { title: 'Barista fartugi', itemType: 'apron', detail: 'Juda qalin to‘q kulrang kanvas, sariq jez tugmalar', technique: 'Metall detallar + Kashta' },
      { title: 'Nam salfetka', itemType: 'wetwipe', detail: 'Matte espresso qadoq, xushbo‘y vanil hidi bilan', technique: 'Premium flekso' },
      { title: 'Stakan g‘ilofi', itemType: 'packaging', detail: 'Gofrokarton sleeve, qora shtamp bosma', technique: 'Ofset' }
    ]
  },
  {
    id: 'royal-catering',
    clientName: 'Royal Banquet & Catering',
    businessType: 'Catering',
    location: 'Toshkent va viloyatlar',
    tagline: 'Sayyor banketlar va yuqori martabali qabullar',
    story: 'Turli joylarda xizmat ko‘rsatadigan sayyor jamoa uchun kiyimlarning estetikasi va bir xilligi hal qiluvchi ahamiyatga ega. Oq klassik ko‘ylaklar, yashil fartuklar va salfetkalar to‘liq monogramma bilan bezatildi.',
    realPhotoUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
    realPhotoCaption: 'Yuqori martabali banket stoli, zumrad fartuklar va oltin gerbli xushbo‘y salfetkalar',
    logoTheme: {
      name: 'ROYAL CATERING',
      subtext: 'EXCLUSIVE EVENT SERVICE',
      primaryColor: '#0E2A1E',
      accentColor: '#D4AF37',
      textColor: '#FFFFFF',
      symbol: '✦'
    },
    brandedItems: [
      { title: 'Ofitsiant fartugi', itemType: 'apron', detail: 'To‘q zumrad rangli premium fartuk, oltin monogramma', technique: 'Luks kashta' },
      { title: 'Klassik ko‘ylak', itemType: 'polo', detail: 'Oq paxta ko‘ylak yoqasiga nozik monogramma', technique: 'Kashta' },
      { title: 'Mehmon nam salfetkasi', itemType: 'wetwipe', detail: 'Katta formatli qalin salfetka, oltin gerb', technique: 'Folga bosma' }
    ]
  }
];

export const WHY_CHOOSE_US = [
  {
    id: '01',
    title: 'Professional logo placement',
    desc: 'Biz logotipni shunchaki bosib qo‘ymaymiz. Har bir mato va qog‘oz turining o‘ziga xosligini inobatga olgan holda, choklari qing‘ir bo‘lmagan, yuvilganda ko‘chmaydigan estetik va uzoq umr ko‘radigan texnologiyani qo‘llaymiz.'
  },
  {
    id: '02',
    title: 'Individual yondashuv',
    desc: 'Har bir restoran, kafe yoki choyxonaning o‘z ruhiyati bor. Biz shablon yechim bermaymiz — ranglar uyg‘unligi, logotip o‘lchami va joylashuvini aynan sizning interyeringiz va konseptingizga moslashtiramiz.'
  },
  {
    id: '03',
    title: 'HoReCa sohasiga tor ixtisoslashuv',
    desc: 'Biz umumiy reklama agentligi emasmiz. Restorandagi issiq oshxona sharoiti, tez-tez kir yuvish, stol usti gigiyenasi va mijoz psixologiyasini chuqur tushunamiz. Mahsulotlarimiz aynan shu talablarga bardosh beradi.'
  },
  {
    id: '04',
    title: 'Bitta yagona brending hamkori',
    desc: 'Kiyim uchun bitta sex, salfetka uchun boshqa korxona, paket uchun uchinchi poligrafiya axtarib vaqt yo‘qotmaysiz. Barcha mahsulotlarni bir joyda, bir xil rang va standartda qabul qilib olasiz.'
  },
  {
    id: '05',
    title: 'Yagona vizual brend identifikatsiyasi',
    desc: 'Mijoz sizning logotipingizni restoranga kirishidan boshlab, ofitsiant kiyimida, stol ustidagi salfetkada va ovqatni olib ketish paketida bir xil mukammal ko‘rinishda ko‘radi. Bu brend nufuzini bir necha barobar oshiradi.'
  }
];

export const TARGET_BUSINESSES = [
  { name: 'Restoranlar', icon: '🍽️', desc: 'Premium zal, stol estetikasi va ofitsiantlar formasi' },
  { name: 'Kafelar', icon: '☕', desc: 'Shinam muhit, barista fartuklari va firmenniy salfetkalar' },
  { name: 'Choyxonalar', icon: '🫖', desc: 'Milliy do‘ppilar, dasturxon madaniyati va xizmat liboslari' },
  { name: 'Fast Food', icon: '🍔', desc: 'Tezkor brendlangan qadoqlar, kepkalar va futbolkalar' },
  { name: 'Coffee Shops', icon: '☕', desc: 'Stakan sleeve, paxta fartuklar va zamonaviy beysbolkalar' },
  { name: 'Nonvoyxonalar', icon: '🥐', desc: 'Kraft qog‘oz xaltalar va oshpaz gigiyenik kiyimlari' },
  { name: 'Mehmonxonalar', icon: '🏨', desc: 'Xona aksessuarlari, resepshn va xizmatchilar formasi' },
  { name: 'Catering', icon: '🍱', desc: 'Sayyor tadbirlar uchun ko‘chma brendlangan to‘plamlar' }
];

export const BRANDING_JOURNEY = [
  { step: '01', title: 'Logo tayyorlash', desc: 'Logotipingiz tekshiriladi, vektor formatga keltiriladi va bosma talablariga moslanadi.' },
  { step: '02', title: 'Brend ranglari va uslubi', desc: 'Matolar, qadoqlar va iplar uchun yagona rang palitrasi (Pantone / CMYK) belgilanadi.' },
  { step: '03', title: 'Xodimlar formasi', desc: 'Tayyor polo, ko‘ylak va fartuklarga kashta yoki termobosma usulida logo tushiriladi.' },
  { step: '04', title: 'Nam salfetkalar', desc: 'Restoran mehmonga uzatadigan xushbo‘y salfetka dizayni va qadog‘i chop etiladi.' },
  { step: '05', title: 'Tish kovlagich qutilari', desc: 'Stol usti uchun ixcham, toza va estetik qutichalar brendlanadi.' },
  { step: '06', title: 'Qadoqlash vositalari', desc: 'Olib ketish va yetkazib berish kraft paketlari, stiker va qutilar tayyorlanadi.' },
  { step: '07', title: 'To‘liq brendlangan mijoz tajribasi', desc: 'Mijoz eshikdan kirgan paytdan boshlab brendingizni his qilsin.' }
];

export const FAQ_DATA: FAQItem[] = [
  {
    question: '1. Siz kiyim tikasizmi?',
    answer: 'Yo‘q. Biz kiyim tikmaymiz va tikuvchilik fabrikasi emasmiz. Biz tayyor kiyimlarga (polo, futbolka, ko‘ylak, oshpaz kurtkasi, fartuk, kepka, do‘ppi) mijozning logotipi va brend elementlarini eng ilg‘or texnologiyalar (kashta, DTF, shelkografiya) yordamida professional tarzda joylashtiramiz.',
    category: 'Xizmat turi'
  },
  {
    question: '2. O‘zimiz kiyim olib kelsak, logo joylashtirib berasizmi?',
    answer: 'Albatta! Siz o‘zingiz xarid qilgan yoki mavjud tayyor kiyimlarni olib kelishingiz mumkin. Mutaxassislarimiz mato turini (paxta, sintetik, kanvas, denim) ko‘rib chiqib, unga eng mos va chidamli usulni (kompyuter kashtasi yoki bosma) tavsiya qiladilar va logotipingizni joylashtirib beradilar.',
    category: 'Kiyimlar'
  },
  {
    question: '3. Nam salfetkalarga restoran logotipini joylashtirasizmi?',
    answer: 'Ha, bu bizning asosiy va eng talabgir yo‘nalishlarimizdan biridir. Nam salfetka qadoqlariga 1 rangdan to‘liq rangli (Full color) fotobosmagacha logotip, shior, QR-menyu va kontaktlaringizni yuqori aniqlikda joylashtiramiz.',
    category: 'Stol usti'
  },
  {
    question: '4. Tish kovlagich qutilarini ham brendlash mumkinmi?',
    answer: 'Ha. Stol ustida doimiy turadigan tish kovlagich qutilari mijoz diqqatini tortadigan muhim elementdir. Biz qutilarning barcha taraflariga sizning korporativ ranglaringiz, logotipingiz va milliy yoki zamonaviy naqshlarni bosib beramiz.',
    category: 'Stol usti'
  },
  {
    question: '5. Minimal buyurtma miqdori qancha?',
    answer: 'Mahsulot turiga qarab farq qiladi: Tayyor kiyimlar va fartuklar uchun minimal miqdor atigi 5-10 donadan boshlanadi. Stol usti tish kovlagich qutilari uchun 500 donadan, individual qadoqlangan nam salfetkalar uchun esa 1,000 donadan buyurtma qabul qilinadi.',
    category: 'Buyurtma shartlari'
  },
  {
    question: '6. Logotipimiz bo‘lmasa nima qilamiz?',
    answer: 'Hech qisi yo‘q! Bizning dizaynerlarimiz HoReCa sohasiga ixtisoslashgan bo‘lib, restoraningiz nomi va uslubiga mos keladigan zamonaviy logotip, ranglar uyg‘unligi va mahsulotlarga joylashtirish bo‘yicha to‘liq vizual konsepsiyani yaratishda yordam berishadi.',
    category: 'Dizayn'
  },
  {
    question: '7. Yangi restoran uchun to‘liq brending xizmatini taklif qilasizmi?',
    answer: 'Ha! Yangi ochilayotgan restoran va kafelar uchun to‘liq yagona brending yechimini taqdim etamiz. Ofitsiant va oshpaz kiyimlaridan tortib, nam salfetkalar, tish kovlagich qutilari, hisob papkalari va takeaway paketlarigacha barcha elementlar bitta uslubda, har bir buyurtma miqdori va mato talabiga ko‘ra individual hisoblab tayyorlab beriladi.',
    category: 'Brending'
  },
  {
    question: '8. Qaysi turdagi kiyimlarga logo joylashtirish mumkin?',
    answer: 'Polo futbolkalar, oddiy paxta T-shirtlar, klassik ko‘ylaklar, jiletlar, kanvas va charm fartuklar, oshpaz kurtkalari va shimlari, beysbolka kepkalar, visirlar hamda milliy do‘ppilarga bemalol logo joylashtiramiz.',
    category: 'Kiyimlar'
  },
  {
    question: '9. Buyurtma tayyor bo‘lishi qancha vaqt oladi?',
    answer: 'Buyurtma hajmi va tanlangan mahsulotlarga bog‘liq: Tayyor kiyimlarga kashta va bosma tushirish odatda 2-4 ish kuni, nam salfetka va qadoqlash vositalari 4-7 ish kuni davomida to‘liq tayyorlanib, sifat nazoratidan o‘tkaziladi.',
    category: 'Muddatlar'
  },
  {
    question: '10. Yetkazib berish xizmati mavjudmi?',
    answer: 'Ha, Toshkent shahri bo‘ylab yetkazib berish xizmatimiz bor. Shuningdek, O‘zbekistonning barcha viloyatlaridagi (Samarqand, Buxoro, Andijon, Farg‘ona, Namangan, Xorazm va h.k.) mijozlarimizga ishonchli kuryerlik yoki pochta xizmatlari orqali buyurtmalarni xavfsiz yetkazib beramiz.',
    category: 'Yetkazib berish'
  }
];
