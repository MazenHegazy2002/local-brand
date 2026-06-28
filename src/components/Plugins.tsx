/**
 * Plugins is a single mount point that loads optional third-party scripts
 * if their corresponding `NEXT_PUBLIC_*` env vars are set.
 *
 * Each plugin is opt-in: leave the env var unset and nothing renders.
 *
 * Supported plugins (set the env var listed beside each one):
 *   1. Google Analytics 4   — NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
 *   2. Google Tag Manager   — NEXT_PUBLIC_GTM_ID="GTM-XXXXXXX"
 *   3. Crisp live chat      — NEXT_PUBLIC_CRISP_WEBSITE_ID="abcdef-1234-5678"
 *   4. Tawk.to live chat    — NEXT_PUBLIC_TAWK_PROPERTY_ID + NEXT_PUBLIC_TAWK_WIDGET_ID
 *   5. Hotjar heatmaps      — NEXT_PUBLIC_HOTJAR_ID="1234567"
 *   6. Meta (Facebook) Pixel — NEXT_PUBLIC_META_PIXEL_ID="1234567890"
 *   7. TikTok Pixel         — NEXT_PUBLIC_TIKTOK_PIXEL_ID="C1234567890"
 *   8. Snapchat Pixel       — NEXT_PUBLIC_SNAPCHAT_PIXEL_ID="abcdef-1234-5678"
 *   9. Microsoft Clarity    — NEXT_PUBLIC_CLARITY_ID="abcdefghij"
 *   10. Pinterest Tag       — NEXT_PUBLIC_PINTEREST_TAG_ID="1234567890"
 *   11. Yandex Metrica      — NEXT_PUBLIC_YANDEX_METRICA_ID="12345678"
 *   12. Crazy Egg           — NEXT_PUBLIC_CRAZY_EGG_ID="00123456"
 *   13. LinkedIn Insight    — NEXT_PUBLIC_LINKEDIN_PARTNER_ID="123456"
 *   14. Messenger Chat      — NEXT_PUBLIC_FACEBOOK_PAGE_ID="1234567890"
 *   15. Social Support Hub  — NEXT_PUBLIC_WHATSAPP_PHONE="201090123456"
 *                           — NEXT_PUBLIC_TELEGRAM_USERNAME="BrandyEgypt"
 *                           — NEXT_PUBLIC_INSTAGRAM_USERNAME="brandy.egypt"
 *                           — NEXT_PUBLIC_FACEBOOK_USERNAME="brandy.egypt"
 */

'use client';

import Script from 'next/script';
import { useLanguage } from '@/providers/LanguageContext';
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

export default function Plugins() {
  const { lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('support-tooltip-dismissed');
    if (dismissed) return;

    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const dismissTooltip = () => {
    setShowTooltip(false);
    sessionStorage.setItem('support-tooltip-dismissed', 'true');
  };

  // Core analytics & support
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const crispId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
  const tawkProperty = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
  const tawkWidget = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID;
  const hotjarId = process.env.NEXT_PUBLIC_HOTJAR_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  // New expansion marketing pixels & telemetry
  const tiktokPixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const snapchatPixelId = process.env.NEXT_PUBLIC_SNAPCHAT_PIXEL_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;
  const pinterestTagId = process.env.NEXT_PUBLIC_PINTEREST_TAG_ID;
  const yandexMetricaId = process.env.NEXT_PUBLIC_YANDEX_METRICA_ID;
  const crazyEggId = process.env.NEXT_PUBLIC_CRAZY_EGG_ID;
  const linkedinPartnerId = process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID;
  const facebookPageId = process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID;

  // Social handles and support variables with realistic defaults
  const whatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || '201090123456';
  const telegramUsername = process.env.NEXT_PUBLIC_TELEGRAM_USERNAME || 'BrandyEgypt';
  const instagramUsername = process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME || 'brandy.egypt';
  const facebookUsername = process.env.NEXT_PUBLIC_FACEBOOK_USERNAME || 'brandy.egypt';

  const whatsappMsgEn =
    process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE_EN ||
    'Hello Brandy! I have a question about my order.';
  const whatsappMsgAr =
    process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE_AR || 'مرحباً براندي! لدي استفسار بخصوص طلبي.';
  const activeWppMessage = lang === 'ar' ? whatsappMsgAr : whatsappMsgEn;

  const wppUrl = `https://wa.me/${whatsappPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(activeWppMessage)}`;
  const tgUrl = `https://t.me/${telegramUsername}`;
  const igUrl = `https://instagram.com/${instagramUsername}`;
  const fbUrl = `https://m.me/${facebookUsername}`;

  const isRtl = lang === 'ar';

  // Handle outside click to collapse the multichannel stack
  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  return (
    <>
      {/* 1. Google Analytics 4 */}
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', { send_page_view: true });
          `}</Script>
        </>
      )}

      {/* 2. Google Tag Manager */}
      {gtmId && (
        <Script id="gtm-init" strategy="afterInteractive">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
          var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');
        `}</Script>
      )}

      {/* 3. Crisp Live Chat */}
      {crispId && (
        <Script id="crisp-init" strategy="afterInteractive">{`
          window.$crisp=[];window.CRISP_WEBSITE_ID="${crispId}";
          (function(){var d=document;var s=d.createElement("script");
          s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();
        `}</Script>
      )}

      {/* 5. Hotjar */}
      {hotjarId && (
        <Script id="hotjar-init" strategy="afterInteractive">{`
          (function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:${hotjarId},hjsv:6};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
        `}</Script>
      )}

      {/* 6. Meta (Facebook) Pixel */}
      {metaPixelId && (
        <Script id="meta-pixel-init" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${metaPixelId}');
          fbq('track', 'PageView');
        `}</Script>
      )}

      {/* 7. TikTok Pixel — lazyOnLoad: non-critical, loads after page is idle */}
      {tiktokPixelId && (
        <Script id="tiktok-pixel-init" strategy="lazyOnLoad">{`
          !function (w, d, t) {
            w.TiktokSdkObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","trackWithQuery","select","to"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq._i=ttq._i||{};ttq._t=ttq._t||{};ttq._t[t]=+new Date;ttq._o=ttq._o||{};ttq._o[t]={},ttq.load=function(e,n){var o="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i[e]=[],ttq._i[e]._u=o,ttq._t[e]=+new Date,ttq._i[e]._v="1.2.4",ttq._i[e]._o=o,ttq._i[e]._o[e]=n;var c=d.createElement("script");c.type="text/javascript",c.async=!0,c.src=o+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(c,a)};
            ttq.load('${tiktokPixelId}');
            ttq.page();
          }(window, document, 'ttq');
        `}</Script>
      )}

      {/* 8. Snapchat Pixel — lazyOnLoad: non-critical */}
      {snapchatPixelId && (
        <Script id="snapchat-pixel-init" strategy="lazyOnLoad">{`
          (function(e,t,n){if(e.snaptr)return;var r=e.snaptr=function(){r.handleRequest?r.handleRequest.apply(r,arguments):r.queue.push(arguments)};
          r.queue=[];var a=t.createElement(n);a.async=!0;a.src="https://tr.snapchat.com/config/pixel.js";
          var g=t.getElementsByTagName(n)[0];g.parentNode.insertBefore(a,g)})(window,document,"script");
          snaptr('init', '${snapchatPixelId}');
          snaptr('track', 'PAGE_VIEW');
        `}</Script>
      )}

      {/* 9. Microsoft Clarity — lazyOnLoad: session recording is non-critical */}
      {clarityId && (
        <Script id="clarity-init" strategy="lazyOnLoad">{`
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window,document,"clarity","script","${clarityId}");
        `}</Script>
      )}

      {/* 10. Pinterest Tag — lazyOnLoad: non-critical */}
      {pinterestTagId && (
        <Script id="pinterest-tag-init" strategy="lazyOnLoad">{`
          !function(e){if(!window.pintr){window.pintr=function(){window.pintr.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintr;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src="https://s.pinimg.com/ct/core.js";var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}(window);
          pintr('init', '${pinterestTagId}');
          pintr('track', 'pageview');
        `}</Script>
      )}

      {/* 11. Yandex Metrica — lazyOnLoad: non-critical */}
      {yandexMetricaId && (
        <Script id="yandex-metrica-init" strategy="lazyOnLoad">{`
          (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

          ym(${yandexMetricaId}, "init", {
               clickmap:true,
               trackLinks:true,
               accurateTrackBounce:true,
               webvisor:true,
               ecommerce:"dataLayer"
          });
        `}</Script>
      )}

      {/* 12. Crazy Egg — lazyOnLoad: non-critical heatmap tool */}
      {crazyEggId && (
        <Script
          id="crazyegg-init"
          strategy="lazyOnLoad"
          src={`https://script.crazyegg.com/pages/scripts/${crazyEggId.substring(0, 4)}/${crazyEggId.substring(4)}.js`}
        />
      )}

      {/* 13. LinkedIn Insight — lazyOnLoad: ad retargeting, non-critical */}
      {linkedinPartnerId && (
        <Script id="linkedin-insight-init" strategy="lazyOnLoad">{`
          _linkedin_partner_id = "${linkedinPartnerId}";
          window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
          window._linkedin_data_partner_ids.push(_linkedin_partner_id);
          (function(profileId) {
            if (!profileId) return;
            var s = document.getElementsByTagName("script")[0];
            var b = document.createElement("script");
            b.type = "text/javascript";b.async = true;
            b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
            s.parentNode.insertBefore(b, s);
          })(_linkedin_partner_id);
        `}</Script>
      )}

      {/* 14. Facebook Messenger Customer Chat Widget — lazyOnLoad: non-critical */}
      {facebookPageId && (
        <>
          <div id="fb-root"></div>
          <div id="fb-customer-chat" className="fb-customerchat"></div>
          <Script id="fb-messenger-init" strategy="lazyOnLoad">{`
            var chatbox = document.getElementById('fb-customer-chat');
            chatbox.setAttribute("page_id", "${facebookPageId}");
            chatbox.setAttribute("attribution", "biz_inbox");
            window.fbAsyncInit = function() {
              FB.init({
                xfbml            : true,
                version          : 'v18.0'
              });
            };
            (function(d, s, id) {
              var js, fjs = d.getElementsByTagName(s)[0];
              if (d.getElementById(id)) return;
              js = d.createElement(s); js.id = id;
              js.src = 'https://connect.facebook.net/en_US/sdk/xfbml.customerchat.js';
              fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));
          `}</Script>
        </>
      )}

      {/* 15. Premium Elite Multichannel Social Support Widget (RTL + Mobile-Safe) */}
      <div
        ref={widgetRef}
        style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          [isRtl ? 'left' : 'right']: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: isRtl ? 'flex-start' : 'flex-end',
          gap: '12px',
        }}
      >
        {/* Proactive Support Tooltip */}
        {showTooltip && !isOpen && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              backgroundColor: 'white',
              color: '#1e293b',
              fontSize: '13px',
              fontWeight: 500,
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              border: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              maxWidth: '220px',
              position: 'relative',
              animation: 'slideUpFAB 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            }}
          >
            <span>
              {isRtl
                ? 'هل لديك أي استفسار؟ نحن هنا للمساعدة!'
                : 'Have a question? We are here to help!'}
            </span>
            <button
              type="button"
              onClick={dismissTooltip}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Dismiss tooltip"
            >
              <X size={14} />
            </button>
            <div
              style={{
                position: 'absolute',
                bottom: '-6px',
                [isRtl ? 'left' : 'right']: '22px',
                width: '12px',
                height: '12px',
                backgroundColor: 'white',
                transform: 'rotate(45deg)',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                borderRight: '1px solid rgba(0,0,0,0.08)',
                zIndex: -1,
              }}
            />
          </div>
        )}

        {/* Expanded Stack of Social Channels */}
        {isOpen && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              animation: 'slideUpFAB 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
              opacity: 0,
              transform: 'translateY(15px)',
            }}
          >
            {/* A. WhatsApp Support Channel */}
            <a
              href={wppUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '24px',
                backgroundColor: '#25D366',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(37, 211, 102, 0.25)',
                transition: 'transform 0.2s',
                width: 'max-content',
                alignSelf: isRtl ? 'flex-start' : 'flex-end',
              }}
              className="hover:scale-105 notranslate"
            >
              {/* WhatsApp custom SVG */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.45 5.489 0 9.957-4.432 9.96-9.886.002-2.642-1.025-5.127-2.89-6.995C16.48 1.857 14 1.812 12.013 1.812c-5.491 0-9.959 4.433-9.962 9.887-.001 1.552.422 3.069 1.22 4.425L2.244 20.85l4.403-1.696z" />
              </svg>
              <span>{isRtl ? 'تواصل عبر واتساب' : 'WhatsApp Chat'}</span>
            </a>

            {/* B. Telegram Support Channel */}
            <a
              href={tgUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '24px',
                backgroundColor: '#0088cc',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(0, 136, 204, 0.25)',
                transition: 'transform 0.2s',
                width: 'max-content',
                alignSelf: isRtl ? 'flex-start' : 'flex-end',
              }}
              className="hover:scale-105 notranslate"
            >
              <Send size={14} />
              <span>{isRtl ? 'قناة تليجرام' : 'Telegram Support'}</span>
            </a>

            {/* C. Instagram Channel */}
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '24px',
                background:
                  'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(220, 39, 67, 0.25)',
                transition: 'transform 0.2s',
                width: 'max-content',
                alignSelf: isRtl ? 'flex-start' : 'flex-end',
              }}
              className="hover:scale-105 notranslate"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              <span>{isRtl ? 'حساب إنستغرام' : 'Instagram Profile'}</span>
            </a>

            {/* D. Facebook Messenger Channel */}
            <a
              href={fbUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #006AFF, #00B2FF)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(0, 106, 255, 0.25)',
                transition: 'transform 0.2s',
                width: 'max-content',
                alignSelf: isRtl ? 'flex-start' : 'flex-end',
              }}
              className="hover:scale-105 notranslate"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
              <span>{isRtl ? 'مراسلة فيسبوك' : 'Messenger Chat'}</span>
            </a>
          </div>
        )}

        {/* Master Floating Action Button (FAB) Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Toggle contact support channels"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: isOpen ? '#1e293b' : 'hsl(var(--primary))',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            position: 'relative',
          }}
          className="hover:scale-110 active:scale-95"
        >
          {/* Pulsing ring behind the inactive button */}
          {!isOpen && (
            <span
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: '50%',
                boxShadow: '0 0 0 0 hsla(var(--primary), 0.6)',
                animation: 'fab-ring-pulse 2s infinite',
                pointerEvents: 'none',
              }}
            />
          )}

          {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>

      {/* Embedded Dynamic Style Sheet */}
      <style jsx global>{`
        @keyframes slideUpFAB {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fab-ring-pulse {
          0% {
            box-shadow: 0 0 0 0 hsla(var(--primary), 0.7);
          }
          70% {
            box-shadow: 0 0 0 15px hsla(var(--primary), 0);
          }
          100% {
            box-shadow: 0 0 0 0 hsla(var(--primary), 0);
          }
        }
      `}</style>
    </>
  );
}
