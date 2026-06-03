/**
 * 73 منتج سعودي شائع - Saudi Catalog Seed Data
 * قابل للاستيراد بضغطة واحدة لأي متجر
 */

export interface SeedCategory {
  key: string;
  name: string;
  nameAr: string;
  sortOrder: number;
}

export interface SeedProduct {
  name: string;
  nameAr: string;
  price: number;
  categoryKey: string;
}

export const saudiCategories: SeedCategory[] = [
  { key: 'water', name: 'Water', nameAr: 'مياه', sortOrder: 1 },
  { key: 'softdrinks', name: 'Soft Drinks', nameAr: 'غازيات', sortOrder: 2 },
  { key: 'juices', name: 'Juices', nameAr: 'عصائر', sortOrder: 3 },
  { key: 'dairy', name: 'Dairy', nameAr: 'ألبان', sortOrder: 4 },
  { key: 'bread', name: 'Bread & Pastry', nameAr: 'خبز ومعجنات', sortOrder: 5 },
  { key: 'snacks', name: 'Snacks & Chocolate', nameAr: 'سناكات وشوكولاتة', sortOrder: 6 },
  { key: 'energy', name: 'Energy Drinks', nameAr: 'مشروبات طاقة', sortOrder: 7 },
  { key: 'grocery', name: 'Grocery', nameAr: 'بقالة', sortOrder: 8 },
];

export const saudiProducts: SeedProduct[] = [
  // ── مياه (10) ──
  { name: 'Nova Water 330ml', nameAr: 'ماء نوفا صغير', price: 1.00, categoryKey: 'water' },
  { name: 'Nova Water 600ml', nameAr: 'ماء نوفا وسط', price: 1.50, categoryKey: 'water' },
  { name: 'Nova Water 1.5L', nameAr: 'ماء نوفا كبير', price: 2.00, categoryKey: 'water' },
  { name: 'Sehha Water 330ml', nameAr: 'ماء صحة صغير', price: 0.75, categoryKey: 'water' },
  { name: 'Sehha Water 600ml', nameAr: 'ماء صحة وسط', price: 1.00, categoryKey: 'water' },
  { name: 'Sehha Water 1.5L', nameAr: 'ماء صحة كبير', price: 1.50, categoryKey: 'water' },
  { name: 'Al Wadi Water 600ml', nameAr: 'ماء الوادي', price: 1.00, categoryKey: 'water' },
  { name: 'Berain Water 600ml', nameAr: 'ماء بيرين', price: 1.00, categoryKey: 'water' },
  { name: 'Hana Water 600ml', nameAr: 'ماء هنا', price: 1.00, categoryKey: 'water' },
  { name: 'Aquafina 600ml', nameAr: 'أكوافينا', price: 1.50, categoryKey: 'water' },

  // ── غازيات (10) ──
  { name: 'Pepsi Can', nameAr: 'بيبسي علبة', price: 2.50, categoryKey: 'softdrinks' },
  { name: 'Pepsi 1L', nameAr: 'بيبسي لتر', price: 4.00, categoryKey: 'softdrinks' },
  { name: 'Coca-Cola Can', nameAr: 'كوكا كولا علبة', price: 2.50, categoryKey: 'softdrinks' },
  { name: 'Coca-Cola 1L', nameAr: 'كوكا كولا لتر', price: 4.00, categoryKey: 'softdrinks' },
  { name: '7UP Can', nameAr: 'سفن أب', price: 2.50, categoryKey: 'softdrinks' },
  { name: 'Mirinda Orange', nameAr: 'ميراندا برتقال', price: 2.50, categoryKey: 'softdrinks' },
  { name: 'Mountain Dew', nameAr: 'ماونتن ديو', price: 2.50, categoryKey: 'softdrinks' },
  { name: 'Shani', nameAr: 'شاني', price: 2.50, categoryKey: 'softdrinks' },
  { name: 'Sprite Can', nameAr: 'سبرايت', price: 2.50, categoryKey: 'softdrinks' },
  { name: 'Fanta Orange', nameAr: 'فانتا برتقال', price: 2.50, categoryKey: 'softdrinks' },

  // ── عصائر (10) ──
  { name: 'Almarai Orange 1L', nameAr: 'عصير المراعي برتقال', price: 7.00, categoryKey: 'juices' },
  { name: 'Almarai Apple 1L', nameAr: 'عصير المراعي تفاح', price: 7.00, categoryKey: 'juices' },
  { name: 'Almarai Mango 1L', nameAr: 'عصير المراعي مانجو', price: 7.00, categoryKey: 'juices' },
  { name: 'Almarai Mixed Berry 1L', nameAr: 'عصير المراعي توت مشكل', price: 7.00, categoryKey: 'juices' },
  { name: 'Nadec Orange 1L', nameAr: 'عصير نادك برتقال', price: 6.50, categoryKey: 'juices' },
  { name: 'Nadec Apple 1L', nameAr: 'عصير نادك تفاح', price: 6.50, categoryKey: 'juices' },
  { name: 'Rani Orange 240ml', nameAr: 'راني برتقال', price: 2.00, categoryKey: 'juices' },
  { name: 'Rani Mango 240ml', nameAr: 'راني مانجو', price: 2.00, categoryKey: 'juices' },
  { name: 'Tang Orange 375ml', nameAr: 'تانج برتقال', price: 3.00, categoryKey: 'juices' },
  { name: 'Sun Top Orange 125ml', nameAr: 'صن توب برتقال', price: 1.00, categoryKey: 'juices' },

  // ── ألبان (8) ──
  { name: 'Almarai Full Fat Milk 1L', nameAr: 'حليب المراعي كامل الدسم', price: 6.50, categoryKey: 'dairy' },
  { name: 'Almarai Low Fat Milk 1L', nameAr: 'حليب المراعي قليل الدسم', price: 6.50, categoryKey: 'dairy' },
  { name: 'Almarai Laban 1L', nameAr: 'لبن المراعي', price: 5.00, categoryKey: 'dairy' },
  { name: 'Nadec Laban 1L', nameAr: 'لبن نادك', price: 4.50, categoryKey: 'dairy' },
  { name: 'Almarai Yogurt', nameAr: 'زبادي المراعي', price: 2.00, categoryKey: 'dairy' },
  { name: 'Almarai Cheese Slices', nameAr: 'جبن المراعي شرائح', price: 8.00, categoryKey: 'dairy' },
  { name: 'Puck Cream Cheese', nameAr: 'جبن بوك كريمي', price: 6.00, categoryKey: 'dairy' },
  { name: 'Al Safi Yogurt 170g', nameAr: 'زبادي السافي', price: 1.50, categoryKey: 'dairy' },

  // ── خبز (7) ──
  { name: 'Lusine White Toast', nameAr: 'توست لوزين أبيض', price: 5.00, categoryKey: 'bread' },
  { name: 'Lusine Brown Toast', nameAr: 'توست لوزين بر', price: 5.50, categoryKey: 'bread' },
  { name: 'Lusine Croissant', nameAr: 'كرواسون لوزين', price: 2.00, categoryKey: 'bread' },
  { name: 'Lusine Cake Roll Chocolate', nameAr: 'كيك رول لوزين شوكولاتة', price: 2.50, categoryKey: 'bread' },
  { name: 'Samoli Bread', nameAr: 'خبز صامولي', price: 3.00, categoryKey: 'bread' },
  { name: 'Arabic Bread Pack', nameAr: 'خبز عربي', price: 1.50, categoryKey: 'bread' },
  { name: 'Tannour Bread', nameAr: 'خبز تنور', price: 2.00, categoryKey: 'bread' },

  // ── سناكات (13) ──
  { name: 'Lays Classic', nameAr: 'ليز كلاسيك', price: 3.00, categoryKey: 'snacks' },
  { name: 'Lays Salt & Vinegar', nameAr: 'ليز ملح وخل', price: 3.00, categoryKey: 'snacks' },
  { name: 'Lays Chili', nameAr: 'ليز حار', price: 3.00, categoryKey: 'snacks' },
  { name: 'Doritos Nacho Cheese', nameAr: 'دوريتوس ناتشو تشيز', price: 3.50, categoryKey: 'snacks' },
  { name: 'Cheetos Crunchy', nameAr: 'شيتوس كرنشي', price: 3.00, categoryKey: 'snacks' },
  { name: 'Pringles Original', nameAr: 'برنجلز أوريجنال', price: 8.00, categoryKey: 'snacks' },
  { name: 'Indomie Noodles', nameAr: 'إندومي', price: 1.50, categoryKey: 'snacks' },
  { name: 'Oman Chips', nameAr: 'شيبس عمان', price: 1.00, categoryKey: 'snacks' },
  { name: 'Galaxy Chocolate', nameAr: 'شوكولاتة جالكسي', price: 4.00, categoryKey: 'snacks' },
  { name: 'KitKat', nameAr: 'كت كات', price: 3.00, categoryKey: 'snacks' },
  { name: 'Snickers', nameAr: 'سنكرز', price: 3.50, categoryKey: 'snacks' },
  { name: 'Twix', nameAr: 'تويكس', price: 3.50, categoryKey: 'snacks' },
  { name: 'Oreo Cookies', nameAr: 'أوريو', price: 4.00, categoryKey: 'snacks' },

  // ── مشروبات طاقة (5) ──
  { name: 'Red Bull 250ml', nameAr: 'ريد بول', price: 8.00, categoryKey: 'energy' },
  { name: 'Power Horse 250ml', nameAr: 'باور هورس', price: 5.00, categoryKey: 'energy' },
  { name: 'Bison Energy 250ml', nameAr: 'بايسون', price: 4.00, categoryKey: 'energy' },
  { name: 'Code Red 250ml', nameAr: 'كود ريد', price: 4.00, categoryKey: 'energy' },
  { name: 'Monster Energy 500ml', nameAr: 'مونستر', price: 9.00, categoryKey: 'energy' },

  // ── بقالة (10) ──
  { name: 'Goody Ketchup 340g', nameAr: 'كاتشب قودي', price: 5.00, categoryKey: 'grocery' },
  { name: 'Goody Mayonnaise 473ml', nameAr: 'مايونيز قودي', price: 7.00, categoryKey: 'grocery' },
  { name: 'Abu Kass Rice 5kg', nameAr: 'أرز أبو كاس بسمتي', price: 35.00, categoryKey: 'grocery' },
  { name: 'Saudia Eggs 30pcs', nameAr: 'بيض سعودية 30 حبة', price: 18.00, categoryKey: 'grocery' },
  { name: 'Al Alali Tuna 170g', nameAr: 'تونة العلالي', price: 6.00, categoryKey: 'grocery' },
  { name: 'Nido Milk Powder 900g', nameAr: 'حليب نيدو بودرة', price: 28.00, categoryKey: 'grocery' },
  { name: 'Lipton Tea 100 Bags', nameAr: 'شاي ليبتون 100 كيس', price: 12.00, categoryKey: 'grocery' },
  { name: 'Nescafe Classic 200g', nameAr: 'نسكافيه كلاسيك', price: 22.00, categoryKey: 'grocery' },
  { name: 'Fairy Dish Soap 750ml', nameAr: 'صابون فيري للأطباق', price: 8.00, categoryKey: 'grocery' },
  { name: 'Dettol Hand Wash 200ml', nameAr: 'صابون ديتول لليدين', price: 10.00, categoryKey: 'grocery' },
];
