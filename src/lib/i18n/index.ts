export const translations = {
  en: {
    home: 'Home',
    shop: 'Shop',
    brands: 'Brands',
    categories: 'Categories',
    about: 'About',
    contact: 'Contact',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',

    addToCart: 'Add to Cart',
    removeFromCart: 'Remove',
    checkout: 'Checkout',
    cart: 'Cart',
    emptyCart: 'Your cart is empty',

    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    rating: 'Rating',
    reviews: 'Reviews',
    description: 'Description',
    specifications: 'Specifications',

    orders: 'Orders',
    orderStatus: 'Order Status',
    trackOrder: 'Track Order',
    cancelOrder: 'Cancel Order',

    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    loading: 'Loading...',
    error: 'Something went wrong',
    retry: 'Try Again',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    viewAll: 'View All',
    seeMore: 'See More',
    back: 'Back',

    aboutUs: 'About Us',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    shippingPolicy: 'Shipping Policy',
    returnsPolicy: 'Returns & Refunds',
    helpCenter: 'Help Center',
    faq: 'FAQ',

    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    rememberMe: 'Remember Me',
    dontHaveAccount: "Don't have an account?",
    alreadyHaveAccount: 'Already have an account?',
    signUp: 'Sign Up',

    dashboard: 'Dashboard',
    myOrders: 'My Orders',
    wishlist: 'Wishlist',
    addresses: 'Addresses',
    settings: 'Settings',
    notifications: 'Notifications',

    sellerHub: 'Seller Hub',
    myProducts: 'My Products',
    addProduct: 'Add Product',
    earnings: 'Earnings',
    payouts: 'Payouts',

    addedToWishlist: 'Added to wishlist',
    removedFromWishlist: 'Removed from wishlist',
    addedToCart: 'Added to cart',
    orderPlaced: 'Order placed successfully!',
    errorOccurred: 'An error occurred. Please try again.',
  },
  ar: {
    home: 'الرئيسية',
    shop: 'المتجر',
    brands: 'الماركات',
    categories: 'الفئات',
    about: 'عن الشركة',
    contact: 'اتصل بنا',
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب',
    logout: 'تسجيل الخروج',

    addToCart: 'أضف للسلة',
    removeFromCart: 'إزالة',
    checkout: 'إتمام الشراء',
    cart: 'السلة',
    emptyCart: 'سلتك فارغة',

    inStock: 'متوفر',
    outOfStock: 'غير متوفر',
    rating: 'التقييم',
    reviews: 'المراجعات',
    description: 'الوصف',
    specifications: 'المواصفات',

    orders: 'الطلبات',
    orderStatus: 'حالة الطلب',
    trackOrder: 'تتبع الطلب',
    cancelOrder: 'إلغاء الطلب',

    search: 'بحث',
    filter: 'تصفية',
    sort: 'ترتيب',
    loading: 'جاري التحميل...',
    error: 'حدث خطأ ما',
    retry: 'حاول مرة أخرى',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    viewAll: 'عرض الكل',
    seeMore: 'المزيد',
    back: 'رجوع',

    aboutUs: 'عن الشركة',
    privacyPolicy: 'سياسة الخصوصية',
    termsOfService: 'شروط الخدمة',
    shippingPolicy: 'سياسة الشحن',
    returnsPolicy: 'الإرجاع والاسترداد',
    helpCenter: 'مركز المساعدة',
    faq: 'الأسئلة الشائعة',

    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    forgotPassword: 'نسيت كلمة المرور؟',
    rememberMe: 'تذكرني',
    dontHaveAccount: 'ليس لديك حساب؟',
    alreadyHaveAccount: 'لديك حساب بالفعل؟',
    signUp: 'إنشاء حساب',

    dashboard: 'لوحة التحكم',
    myOrders: 'طلباتي',
    wishlist: 'قائمة الأمنيات',
    addresses: 'العناوين',
    settings: 'الإعدادات',
    notifications: 'الإشعارات',

    sellerHub: 'مركز البائعين',
    myProducts: 'منتجاتي',
    addProduct: 'إضافة منتج',
    earnings: 'الأرباح',
    payouts: 'المدفوعات',

    addedToWishlist: 'تمت الإضافة للقائمة',
    removedFromWishlist: 'تمت الإزالة من القائمة',
    addedToCart: 'تمت الإضافة للسلة',
    orderPlaced: 'تم تأكيد طلبك بنجاح!',
    errorOccurred: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
  },
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, lang: Language = 'en'): string {
  return translations[lang][key] || key;
}

export function formatCurrency(
  amount: number,
  lang: Language = 'en',
  currency: string = 'EGP'
): string {
  const locale = lang === 'ar' ? 'ar-EG' : 'en-EG';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string, lang: Language = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatRelativeTime(date: Date | string, lang: Language = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar' : 'en', { numeric: 'auto' });

  if (minutes < 60) return rtf.format(-minutes, 'minute');
  if (hours < 24) return rtf.format(-hours, 'hour');
  if (days < 7) return rtf.format(-days, 'day');
  return formatDate(d, lang);
}
