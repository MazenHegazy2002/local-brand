'use client';
import { useLanguage } from '@/providers/LanguageContext';

import Navbar from '@/components/Navbar';

const sections = [
  {
    title: 'Terms of Service',
    id: 'terms',
    contentAr: `مرحبًا بك في براندي مصر. باستخدامك منصتنا، فإنك توافق على الالتزام بشروط الخدمة هذه وجميع القوانين واللوائح المصرية المعمول بها.

**1. قبول الشروط**
بإنشاء حساب أو الشراء على براندي، فإنك توافق على هذه الشروط وسياسة الخصوصية.

**2. حسابات المستخدمين**
أنت مسؤول عن الحفاظ على أمان حسابك. لا يجوز لك مشاركة بيانات الدخول أو تسجيل حسابات متعددة.

**3. الأنشطة المحظورة**
لا يجوز للمستخدمين عرض منتجات مقلدة أو التلاعب بالأسعار أو تقديم أوصاف مضللة للمنتجات.

**4. تسوية النزاعات**
تتولى براندي الوساطة في جميع النزاعات بين المشترين والبائعين، ويكون قرارها نهائيًا وملزمًا وفق القانون التجاري المصري.

**5. القانون الحاكم**
تخضع هذه الشروط لقوانين جمهورية مصر العربية.`,
    content: `Welcome to Brandy Egypt. By accessing or using our marketplace, you agree to be bound by these Terms of Service and all applicable Egyptian laws and regulations.

**1. Acceptance of Terms**
By creating an account or making a purchase on Brandy, you agree to these terms and our Privacy Policy.

**2. User Accounts**
You are responsible for maintaining the security of your account. You may not share your credentials or register multiple accounts.

**3. Prohibited Activities**
Users may not list counterfeit goods, engage in price manipulation, or misrepresent product descriptions.

**4. Dispute Resolution**
All disputes between buyers and sellers shall be mediated by Brandy. Our decision is final and binding per Egyptian Commercial Law.

**5. Governing Law**
These terms are governed by the laws of the Arab Republic of Egypt.`,
  },
  {
    title: 'Privacy Policy',
    id: 'privacy',
    contentAr: `تلتزم براندي مصر بحماية بياناتك الشخصية وفقًا لقانون حماية البيانات الشخصية المصري (القانون رقم 151 لسنة 2020).

**البيانات التي نجمعها**
- معلومات الحساب (الاسم والبريد الإلكتروني والهاتف)
- سجل الطلبات والمعاملات
- عناوين التوصيل
- سلوك التصفح على منصتنا

**كيف نستخدم بياناتك**
- لمعالجة الطلبات والمدفوعات
- لإبلاغك بتحديثات الطلبات
- لتخصيص تجربة التسوق

**حقوقك**
يحق لك الوصول إلى بياناتك الشخصية وتصحيحها وحذفها. استخدم ميزة تصدير البيانات في إعدادات الحساب.

**الاحتفاظ بالبيانات**
يُحتفظ ببيانات الطلبات لمدة 7 سنوات وفق قانون الضرائب المصري، وتصبح البيانات الشخصية مجهولة الهوية عند حذف الحساب.`,
    content: `Brandy Egypt is committed to protecting your personal data in compliance with Egypt's Personal Data Protection Law (Law No. 151 of 2020).

**Data We Collect**
- Account information (name, email, phone)
- Order and transaction history
- Delivery addresses
- Browsing behavior on our platform

**How We Use Your Data**
- To process orders and payments
- To communicate order updates
- To personalize your shopping experience

**Your Rights**
You have the right to access, correct, and delete your personal data. Use our Data Export feature in Account Settings.

**Data Retention**
Order data is retained for 7 years per Egyptian tax law. Personal data is anonymized upon account deletion.`,
  },
  {
    title: 'Return Policy',
    id: 'returns',
    contentAr: `**مهلة الإرجاع 14 يومًا**
يمكن إرجاع جميع المنتجات خلال 14 يومًا من التوصيل لاسترداد كامل المبلغ، بشرط أن تكون بحالتها الأصلية وبكل بطاقاتها.

**منتجات لا يمكن إرجاعها**
المنتجات المخصصة أو الشخصية أو الحساسة من ناحية النظافة غير مؤهلة للإرجاع.

**خطوات الإرجاع**
1. اذهب إلى سجل طلباتك
2. اختر المنتج واضغط "طلب إرجاع"
3. ارفع صور المنتج
4. اشحن المنتج عبر أي شركة شحن
5. يُرد المبلغ خلال 5-7 أيام عمل من تأكيد البائع

**طريقة رد المبلغ**
يُرد المبلغ إلى وسيلة الدفع الأصلية أو يُضاف إلى محفظة براندي.`,
    content: `**14-Day Return Window**
All items may be returned within 14 days of delivery for a full refund, provided they are in original condition with all tags attached.

**Non-Returnable Items**
Customized, personalized, or hygiene-sensitive products are not eligible for returns.

**Return Process**
1. Go to your Order History
2. Select the item and click "Request Return"
3. Upload photos of the item
4. Ship the item via any courier
5. Refund processed within 5-7 business days of seller confirmation

**Refund Method**
Refunds are returned to the original payment method or credited to your Brandy wallet.`,
  },
  {
    title: 'Seller Agreement',
    id: 'seller-agreement',
    contentAr: `**التزامات البائع**
بأن تصبح بائعًا على براندي، فإنك توافق على:
- عرض منتجات أصلية وموصوفة بدقة فقط
- تنفيذ الطلبات خلال يومي عمل من التأكيد
- قبول المرتجعات وفق سياسة براندي
- الحفاظ على تقييم بائع أعلى من 3.5 نجوم

**هيكل العمولة**
تحصل براندي على عمولة 15% عن كل عملية بيع ناجحة. تُعالج السحوبات بعد 7-14 يومًا من التوصيل.

**الإعلانات المحظورة**
يُحظر تمامًا عرض المنتجات المقلدة والمواد الخطرة والسلع الممنوعة بموجب القانون المصري.

**تعليق الحساب**
تحتفظ براندي بحق تعليق حسابات البائعين عند مخالفة السياسات أو ضعف الأداء أو الاحتيال.

**الالتزامات الضريبية**
يتحمل البائعون مسؤولية الإقرار بدخلهم وسداد الضرائب المستحقة وفق قانون الضرائب المصري.`,
    content: `**Seller Obligations**
By becoming a Brandy seller, you agree to:
- List only authentic, accurately described products
- Fulfill orders within 2 business days of confirmation
- Accept returns per Brandy's return policy
- Maintain a seller rating above 3.5 stars

**Commission Structure**
Brandy charges a 15% commission on every successful sale. Payouts are processed 7-14 days post-delivery.

**Prohibited Listings**
Counterfeit goods, hazardous materials, and items banned under Egyptian law are strictly prohibited.

**Account Suspension**
Brandy reserves the right to suspend seller accounts for policy violations, poor performance metrics, or fraudulent activity.

**Tax Obligations**
Sellers are responsible for declaring income and paying applicable taxes under Egyptian tax law.`,
  },
];

export default function LegalPage() {
  const { tr, isRTL } = useLanguage();
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-black text-gray-900 mb-2">{tr('Legal')}</h1>
        <p className="text-gray-500 mb-10">
          {tr('Brandy Egypt — Legal documents governing our marketplace.')}
        </p>

        {/* Quick Nav */}
        <div className="flex flex-wrap gap-3 mb-12">
          {sections.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="px-4 py-2 rounded-xl bg-white border border-[#e8dfd1] text-sm font-semibold text-gray-700 hover:border-[hsl(var(--accent))] hover:text-[hsl(var(--accent))] transition-colors"
            >
              {tr(s.title)}
            </a>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map(section => (
            <div
              key={section.id}
              id={section.id}
              className="bg-white rounded-2xl p-8 border border-[#e8dfd1] shadow-sm"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100">
                {tr(section.title)}
              </h2>
              <div className="prose prose-gray max-w-none">
                {(isRTL ? section.contentAr : section.content).split('\n\n').map((para, i) => (
                  <p key={i} className="text-gray-600 mb-4 leading-relaxed whitespace-pre-line">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-gray-400">
          {tr('Last updated: April 2026 — Questions? Contact')}{' '}
          <a href="mailto:legal@brandy.eg" className="text-[hsl(var(--accent))] hover:underline">
            legal@brandy.eg
          </a>
        </div>
      </div>
    </div>
  );
}
