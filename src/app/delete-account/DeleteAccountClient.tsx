'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useLanguage } from '@/providers/LanguageContext';
import { useConfirm } from '@/providers/ConfirmProvider';
import { SUPPORT_EMAIL } from '@/lib/constants';

type Copy = {
  title: string;
  intro: string;
  howTitle: string;
  appTitle: string;
  appSteps: string[];
  webTitle: string;
  webSteps: string[];
  deletedTitle: string;
  deleted: string[];
  keptTitle: string;
  kept: string[];
  timingTitle: string;
  timing: string;
  actionTitle: string;
  signedInAs: string;
  button: string;
  deleting: string;
  confirmTitle: string;
  confirmMessage: string;
  failed: string;
  done: string;
  signInPrompt: string;
  signIn: string;
  contactTitle: string;
  contact: string;
  contactSubject: string;
};

const COPY: Record<'en' | 'ar' | 'fk', Copy> = {
  en: {
    title: 'Delete your Brandyy account',
    intro:
      'You can delete your Brandyy account (app and brandyy.shop) and its personal data at any time. This applies to buyer, seller and affiliate accounts.',
    howTitle: 'How to delete your account',
    appTitle: 'In the Brandyy app',
    appSteps: [
      'Sign in and open the Account tab (sellers and admins: the More tab; affiliates: the bottom of the home screen).',
      'Tap "Delete account".',
      'Confirm. You are signed out and the account is deleted immediately.',
    ],
    webTitle: 'On the website',
    webSteps: [
      'Sign in at brandyy.shop.',
      'Come back to this page (brandyy.shop/delete-account).',
      'Press "Delete my account" below and confirm.',
    ],
    deletedTitle: 'What is deleted',
    deleted: [
      'Your name, email address, phone number, profile photo and password.',
      'Saved addresses, cart, wishlist, notifications, loyalty points and support chats.',
      'Push-notification tokens and all signed-in sessions in the app.',
      'Sellers: pickup address, contact name and phone, map location, bank account / IBAN, tax number and social links. Your store is closed and your products are removed from sale.',
      'Affiliates: payout method and wallet / bank details. Your promo code stops working.',
      'On your past orders: delivery street and recipient name, payment sender number, uploaded payment receipts and order notes.',
    ],
    keptTitle: 'What is kept, and for how long',
    kept: [
      'Order records (items, amounts, dates, city and governorate) are kept for up to 7 years because Egyptian tax and accounting law requires it. They are no longer linked to your name or contact details.',
      'Orders that are still being delivered keep their delivery address until they are delivered, so the courier can reach you.',
      'Reviews and product questions you posted stay visible, shown as "Deleted User".',
      'Records of disputes, refunds, commissions and payouts are kept for the same legal period, without bank or wallet details.',
    ],
    timingTitle: 'How long it takes',
    timing:
      'Deletion is immediate when you use the app or this page. Requests by email are handled within 30 days. Copies in database backups are removed within 30 days as old backups expire.',
    actionTitle: 'Delete your account now',
    signedInAs: 'Signed in as',
    button: 'Delete my account',
    deleting: 'Deleting…',
    confirmTitle: 'Delete account',
    confirmMessage:
      'This permanently deletes your account and personal data. This cannot be undone.',
    failed: 'Could not delete your account. Please try again.',
    done: 'Your account has been deleted. Signing you out…',
    signInPrompt: 'Sign in to delete your account from this page.',
    signIn: 'Sign in',
    contactTitle: "Can't sign in?",
    contact:
      'Email us from the address on your account with the subject "Delete my account" and we will delete it within 30 days:',
    contactSubject: 'Delete my account',
  },
  ar: {
    title: 'حذف حسابك على Brandyy',
    intro:
      'يمكنك حذف حسابك على Brandyy (التطبيق وموقع brandyy.shop) وبياناته الشخصية في أي وقت. ينطبق ذلك على حسابات المشترين والبائعين والمسوّقين.',
    howTitle: 'طريقة حذف الحساب',
    appTitle: 'من تطبيق Brandyy',
    appSteps: [
      'سجّل الدخول وافتح تبويب "الحساب" (البائعون والمشرفون: تبويب "المزيد"؛ المسوّقون: أسفل الشاشة الرئيسية).',
      'اضغط "حذف الحساب".',
      'أكّد الحذف. سيتم تسجيل خروجك وحذف الحساب فورًا.',
    ],
    webTitle: 'من الموقع',
    webSteps: [
      'سجّل الدخول على brandyy.shop.',
      'ارجع إلى هذه الصفحة (brandyy.shop/delete-account).',
      'اضغط "احذف حسابي" بالأسفل وأكّد.',
    ],
    deletedTitle: 'ما الذي يتم حذفه',
    deleted: [
      'اسمك وبريدك الإلكتروني ورقم هاتفك وصورتك الشخصية وكلمة المرور.',
      'العناوين المحفوظة وسلة التسوق وقائمة الأمنيات والإشعارات ونقاط الولاء ومحادثات الدعم.',
      'رموز الإشعارات وجميع جلسات تسجيل الدخول في التطبيق.',
      'البائعون: عنوان الاستلام واسم ورقم جهة الاتصال والموقع على الخريطة والحساب البنكي / IBAN والرقم الضريبي وروابط التواصل الاجتماعي. يتم إغلاق متجرك وإيقاف بيع منتجاتك.',
      'المسوّقون: طريقة الصرف وبيانات المحفظة أو الحساب البنكي، ويتوقف كود الخصم الخاص بك.',
      'في طلباتك السابقة: عنوان الشارع واسم المستلم ورقم المحوِّل وإيصالات الدفع المرفوعة وملاحظات الطلب.',
    ],
    keptTitle: 'ما الذي نحتفظ به ولأي مدة',
    kept: [
      'سجلات الطلبات (المنتجات والمبالغ والتواريخ والمدينة والمحافظة) تُحفظ حتى 7 سنوات وفقًا لقوانين الضرائب والمحاسبة المصرية، ولا تكون مرتبطة باسمك أو بيانات تواصلك.',
      'الطلبات التي لا تزال قيد التوصيل تحتفظ بعنوان التوصيل حتى تسليمها ليتمكن المندوب من الوصول إليك.',
      'التقييمات وأسئلة المنتجات التي نشرتها تبقى ظاهرة باسم "مستخدم محذوف".',
      'سجلات النزاعات والمرتجعات والعمولات والمدفوعات تُحفظ لنفس المدة القانونية دون بيانات بنكية أو بيانات محفظة.',
    ],
    timingTitle: 'مدة التنفيذ',
    timing:
      'يتم الحذف فورًا عند استخدام التطبيق أو هذه الصفحة. الطلبات عبر البريد الإلكتروني تُنفَّذ خلال 30 يومًا، والنسخ الموجودة في النسخ الاحتياطية لقاعدة البيانات تُحذف خلال 30 يومًا مع انتهاء صلاحيتها.',
    actionTitle: 'احذف حسابك الآن',
    signedInAs: 'مسجّل الدخول باسم',
    button: 'احذف حسابي',
    deleting: 'جارٍ الحذف…',
    confirmTitle: 'حذف الحساب',
    confirmMessage: 'سيتم حذف حسابك وبياناتك الشخصية نهائيًا. لا يمكن التراجع عن ذلك.',
    failed: 'تعذّر حذف حسابك. حاول مرة أخرى.',
    done: 'تم حذف حسابك. جارٍ تسجيل الخروج…',
    signInPrompt: 'سجّل الدخول لحذف حسابك من هذه الصفحة.',
    signIn: 'تسجيل الدخول',
    contactTitle: 'لا تستطيع تسجيل الدخول؟',
    contact:
      'راسلنا من البريد الإلكتروني المسجّل في حسابك بعنوان "Delete my account" وسنحذفه خلال 30 يومًا:',
    contactSubject: 'Delete my account',
  },
  fk: {
    title: 'Ems7 el account bta3ak 3la Brandyy',
    intro:
      'Te2dar tems7 el account bta3ak 3la Brandyy (el app w brandyy.shop) w el data el shakhseya bta3to f ay wa2t. Da lel buyers wel sellers wel affiliates.',
    howTitle: 'Ezay tems7 el account',
    appTitle: 'Mn el app',
    appSteps: [
      'E3mel sign in w efta7 tab "Account" (el sellers wel admins: tab "More"; el affiliates: ta7t el home screen).',
      'Dous "Delete account".',
      'Akked. Hat3mel sign out w el account yetmese7 3la tool.',
    ],
    webTitle: 'Mn el website',
    webSteps: [
      'E3mel sign in 3la brandyy.shop.',
      'Erga3 lel safha di (brandyy.shop/delete-account).',
      'Dous "Ems7 el account bta3y" ta7t w akked.',
    ],
    deletedTitle: 'Eh elly byetmese7',
    deleted: [
      'Esmak, el email, rakam el telefon, el soora wel password.',
      'El 3anaween el mt5zna, el cart, el wishlist, el notifications, el loyalty points w mo7adsat el support.',
      'Push tokens w kol el sessions f el app.',
      'El sellers: 3enwan el pickup, esm w rakam el contact, el location, el bank account / IBAN, el rakam el dareeby wel social links. El store byet2efel wel products btetsheel mn el bee3.',
      'El affiliates: tare2et el sarf w data el wallet aw el bank. El promo code bta3ak by2af.',
      'F el orders el adeema: 3enwan el share3 w esm el mostalem, rakam el mo7awel, eesalat el daf3 w notes el order.',
    ],
    keptTitle: 'Eh elly bnes7tefez beeh w l emta',
    kept: [
      'Segelat el orders (el products, el mabaleg, el tawareekh, el madina wel mo7afza) bnes7tefez beeha l7ad 7 snin 3ashan 2awaneen el dara2eb wel mo7asba f Masr, w mesh marboota b esmak aw data el tawasol.',
      'El orders elly lessa betetwasal bt7tefez b 3enwan el tawseel l7ad ma tetsalem 3ashan el mandoob yewsalak.',
      'El reviews w as2elet el products elly katabtaha bteb2a zahra b esm "Deleted User".',
      'Segelat el disputes wel refunds wel commissions wel payouts bnes7tefez beeha nafs el modda men gher data bank aw wallet.',
    ],
    timingTitle: 'Bya5od ad eh',
    timing:
      'El mas7 by7sal 3la tool mn el app aw el safha di. Talabat el email btet3emel f 30 yom, w el nosa5 f backups el database btetmese7 f 30 yom ma3 entha2 el backups el adeema.',
    actionTitle: 'Ems7 el account delwa2ty',
    signedInAs: 'Da5el b',
    button: 'Ems7 el account bta3y',
    deleting: 'Bnems7…',
    confirmTitle: 'Delete el account',
    confirmMessage:
      'Da hayems7 el account wel data el shakhseya bta3ak nehaey. Mesh hate2dar terga3.',
    failed: 'Ma3rafnash nems7 el account. Gareb tany.',
    done: 'El account etmasa7. Bne3mellak sign out…',
    signInPrompt: 'E3mel sign in 3ashan tems7 el account mn el safha di.',
    signIn: 'Sign in',
    contactTitle: 'Mesh 3aref te3mel sign in?',
    contact:
      'Ab3atlna email mn el email elly 3la el account b 3enwan "Delete my account" w hanems7o f 30 yom:',
    contactSubject: 'Delete my account',
  },
};

export default function DeleteAccountClient() {
  const { lang } = useLanguage();
  const c = COPY[lang] ?? COPY.en;
  const { data: session, status } = useSession();
  const { confirm } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleDelete = async () => {
    const ok = await confirm({ title: c.confirmTitle, message: c.confirmMessage, type: 'danger' });
    if (!ok) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        // 400 carries a specific reason (e.g. last remaining admin).
        setMessage({ ok: false, text: res.status === 400 && d.message ? d.message : c.failed });
        setBusy(false);
        return;
      }
      setMessage({ ok: true, text: c.done });
      setTimeout(() => signOut({ callbackUrl: '/' }), 1500);
    } catch {
      setMessage({ ok: false, text: c.failed });
      setBusy(false);
    }
  };

  const card = 'bg-white rounded-2xl p-6 md:p-8 border border-[#e8dfd1] shadow-sm mb-6';
  const h2 = 'text-xl md:text-2xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100';
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(c.contactSubject)}`;

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">{c.title}</h1>
        <p className="text-gray-600 leading-relaxed">{c.intro}</p>
      </div>

      <section className={card}>
        <h2 className={h2}>{c.actionTitle}</h2>
        {status === 'loading' ? (
          <div className="h-11 rounded-xl bg-gray-100 animate-pulse" />
        ) : session?.user ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {c.signedInAs} <strong className="text-gray-900">{session.user.email}</strong>
            </p>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {busy ? c.deleting : c.button}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="text-sm text-gray-600 flex-1">{c.signInPrompt}</p>
            <Link
              href="/login?callbackUrl=/delete-account"
              className="inline-flex justify-center px-6 py-3 rounded-xl bg-[#1e3b8a] text-white font-bold text-sm hover:bg-[#0d1f52] transition-colors"
            >
              {c.signIn}
            </Link>
          </div>
        )}
        {message && (
          <p
            role="status"
            className={`mt-4 text-sm font-semibold ${message.ok ? 'text-green-700' : 'text-red-600'}`}
          >
            {message.text}
          </p>
        )}
      </section>

      <section className={card}>
        <h2 className={h2}>{c.howTitle}</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {[
            { title: c.appTitle, steps: c.appSteps },
            { title: c.webTitle, steps: c.webSteps },
          ].map(block => (
            <div key={block.title}>
              <h3 className="font-bold text-gray-900 mb-2">{block.title}</h3>
              <ol className="list-decimal ps-5 space-y-1.5 text-sm text-gray-600 leading-relaxed">
                {block.steps.map(s => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className={h2}>{c.deletedTitle}</h2>
        <ul className="list-disc ps-5 space-y-2 text-sm text-gray-600 leading-relaxed">
          {c.deleted.map(s => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <h2 className={h2}>{c.keptTitle}</h2>
        <ul className="list-disc ps-5 space-y-2 text-sm text-gray-600 leading-relaxed">
          {c.kept.map(s => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <h3 className="font-bold text-gray-900 mt-6 mb-2">{c.timingTitle}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{c.timing}</p>
      </section>

      <section className={card}>
        <h2 className={h2}>{c.contactTitle}</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          {c.contact}{' '}
          <a href={mailto} className="font-semibold text-[#1e3b8a] underline" dir="ltr">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </section>
    </div>
  );
}
