/* ── ETERNANT: Gmail in-app browser guard ──
   Email links (confirm signup / reset password) Gmail ke andar
   wale webview browser mein khul jaate hain, jisme localStorage
   Chrome se share nahi hota — login session lost ho jaata hai.
   Ye script Gmail/in-app webview detect karke user ko Chrome
   mein kholne par force karti hai.
*/
(function () {
  var ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  // iOS in-app webviews (Gmail app) UA mein "Safari" nahi hota
  var isIOSWebview = isIOS && !/Safari\/[\d]/.test(ua);
  // Android: real Chrome Custom Tabs theek hai; sirf standalone
  // webviews (wv / Gmail WebView) ko pakdo
  var isAndroidWebview = isAndroid && (/;\s*wv\)/.test(ua) || /Gmail/.test(ua) || /WebView/i.test(ua));
  if (!isIOSWebview && !isAndroidWebview) return; // Normal browser — kuch mat karo

  var fullUrl = location.origin + location.pathname + location.search + location.hash;
  var chromeUrl;
  if (isAndroid) {
    chromeUrl = 'intent://' + fullUrl.replace(/^https?:\/\//, '') +
      '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' +
      encodeURIComponent(fullUrl) + ';end';
  } else {
    chromeUrl = 'googlechrome://' + fullUrl.replace(/^https?:\/\//, '');
  }

  // Chrome mein kholne ki pehla attempt
  try { location.href = chromeUrl; } catch (e) {}

  // Fallback overlay — agar deep-link fail ho jaye
  function showOverlay() {
    if (document.getElementById('et-webview-guard')) return;
    var ov = document.createElement('div');
    ov.id = 'et-webview-guard';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(3,5,13,0.97);display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;padding:24px;';
    ov.innerHTML =
      '<div style="max-width:420px;width:100%;background:#070c1a;border:1px solid #1e3058;border-radius:20px;padding:36px 28px;text-align:center;">' +
      '<div style="font-size:34px;margin-bottom:14px;">🌐</div>' +
      '<h2 style="margin:0 0 12px 0;font-size:20px;color:#fff;letter-spacing:1px;">ETERNANT</h2>' +
      '<p style="margin:0 0 22px 0;font-size:14px;color:#8aa4c8;line-height:1.7;">You are viewing this in Gmail\'s in-app browser, where login sessions don\'t persist. Please open this link in <b style="color:#6eb5ff;">Chrome</b> to continue.</p>' +
      '<button id="et-open-chrome" style="display:block;width:100%;padding:14px 20px;margin-bottom:12px;border:0;border-radius:12px;background:linear-gradient(135deg,#6eb5ff,#a78bfa);color:#03050d;font-size:15px;font-weight:800;cursor:pointer;">Open in Chrome →</button>' +
      '<button id="et-copy-link" style="display:block;width:100%;padding:12px 20px;margin-bottom:16px;border:1px solid #1e3058;border-radius:12px;background:transparent;color:#8aa4c8;font-size:13px;cursor:pointer;">Copy link manually</button>' +
      '<span id="et-copy-ok" style="display:none;color:#10b981;font-size:13px;margin-bottom:14px;">✓ Link copied — paste it in Chrome</span>' +
      '<a id="et-continue" href="#" style="color:#4a6080;font-size:12px;text-decoration:underline;">Continue here anyway</a>' +
      '</div>';
    document.body ? document.body.appendChild(ov) : document.documentElement.appendChild(ov);
    document.getElementById('et-open-chrome').onclick = function () {
      try { location.href = chromeUrl; } catch (e) {}
    };
    document.getElementById('et-copy-link').onclick = function () {
      try {
        if (navigator.clipboard) { navigator.clipboard.writeText(fullUrl); }
        else {
          var ta = document.createElement('textarea');
          ta.value = fullUrl; document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); ta.remove();
        }
        document.getElementById('et-copy-ok').style.display = 'block';
      } catch (e) {}
    };
    document.getElementById('et-continue').onclick = function (e) {
      e.preventDefault(); ov.remove();
    };
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showOverlay);
  } else {
    showOverlay();
  }
})();
