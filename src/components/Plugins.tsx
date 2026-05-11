/**
 * Plugins is a single mount point that loads optional third-party scripts
 * if their corresponding `NEXT_PUBLIC_*` env vars are set.
 *
 * Each plugin is opt-in: leave the env var unset and nothing renders.
 *
 * Supported plugins (set the env var listed beside each one):
 *   • Google Analytics 4   — NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
 *   • Google Tag Manager   — NEXT_PUBLIC_GTM_ID="GTM-XXXXXXX"
 *   • Crisp live chat      — NEXT_PUBLIC_CRISP_WEBSITE_ID="abcdef-1234-5678"
 *   • Tawk.to live chat    — NEXT_PUBLIC_TAWK_PROPERTY_ID + NEXT_PUBLIC_TAWK_WIDGET_ID
 *   • Hotjar heatmaps      — NEXT_PUBLIC_HOTJAR_ID="1234567"
 *   • Meta (Facebook) Pixel — NEXT_PUBLIC_META_PIXEL_ID="1234567890"
 *
 * Notes:
 *   - We use `next/script` so scripts are deferred to after hydration.
 *   - Crisp/Tawk widgets are anchored to the bottom-right of the page; the
 *     mobile bottom navigation already adds 64px of safe-area padding so
 *     the chat bubble doesn't get covered.
 *   - All scripts are added to the CSP allowlist in `src/proxy.ts` if
 *     enabled — see AGENTS.md.
 */

import Script from 'next/script';

export default function Plugins() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const crispId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
  const tawkProperty = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
  const tawkWidget = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID;
  const hotjarId = process.env.NEXT_PUBLIC_HOTJAR_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <>
      {/* Google Analytics 4 */}
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

      {/* Google Tag Manager */}
      {gtmId && (
        <Script id="gtm-init" strategy="afterInteractive">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
          var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');
        `}</Script>
      )}

      {/* Crisp live chat */}
      {crispId && (
        <Script id="crisp-init" strategy="afterInteractive">{`
          window.$crisp=[];window.CRISP_WEBSITE_ID="${crispId}";
          (function(){var d=document;var s=d.createElement("script");
          s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();
        `}</Script>
      )}

      {/* Tawk.to live chat */}
      {tawkProperty && tawkWidget && (
        <Script id="tawk-init" strategy="afterInteractive">{`
          var Tawk_API=Tawk_API||{},Tawk_LoadStart=new Date();
          (function(){var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
          s1.async=true;s1.src='https://embed.tawk.to/${tawkProperty}/${tawkWidget}';
          s1.charset='UTF-8';s1.setAttribute('crossorigin','*');
          s0.parentNode.insertBefore(s1,s0);})();
        `}</Script>
      )}

      {/* Hotjar */}
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

      {/* Meta (Facebook) Pixel */}
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
    </>
  );
}
