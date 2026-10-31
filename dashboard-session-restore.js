/* ── ETERNANT: Session Restore from URL Hash ──
   Wired in <head> of both:
   - publisher-dashboard.html
   - advertiser-dashboard.html

   Kaam: Jab confirm.html / select-role.html se redirect aata hai with
   #access_token=...&refresh_token=...&type=signup
   toh Supabase localStorage mein session set hota hai
   aur user automatically logged-in dikhta hai.

   PLUS: Agar ye Gmail ke in-app webview ke andar hua (Chrome force fail
   ho gaya ho), toh ek handoff overlay dikhata hai — usme token-wala
   link hota hai jo Chrome mein kholne par wahi dashboard wahi screen
   resume ho jaata hai. Gmail webview ka session Chrome mein transfer
   ho jaata hai — koi loss nahi.
*/
(function () {
  var SUPABASE_URL  = 'https://pcnbgyudptwliocjcdlm.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbmJneXVkcHR3bGlvY2pjZGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0ODE2NTQsImV4cCI6MjEwODA1NzY1NH0.DoxrQfbhsBdWCgotdNWPh1E_VLaA01L-_kwiQwRVbqA';

  var hash = window.location.hash;
  if (!hash || hash.indexOf('access_token=') === -1) return;

  // Parse hash params
  var params = {};
  hash.replace(/^#/, '').split('&').forEach(function (p) {
    var kv = p.split('=');
    params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
  });

  var accessToken  = params['access_token'];
  var refreshToken = params['refresh_token'] || '';
  var type         = params['type'] || '';

  if (!accessToken) return;

  // Clean URL — token hash remove karo
  history.replaceState(null, '', window.location.pathname);

  // Gmail in-app webview detect karo
  var ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua);
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var isIOSWebview = isIOS && !/Safari\/[\d]/.test(ua);
  var isAndroidWebview = isAndroid && (/;\s*wv\)/.test(ua) || /Gmail/.test(ua) || /WebView/i.test(ua));
  var inWebview = isIOSWebview || isAndroidWebview;

  // Handoff URL — same page + token hash. Chrome mein kholne par
  // ye script wahan bhi session save karke same dashboard resume karega.
  var handoffUrl = location.origin + location.pathname +
    '#access_token=' + encodeURIComponent(accessToken) +
    '&refresh_token=' + encodeURIComponent(refreshToken) +
    '&type=' + type;

  function chromeUrlFor(url) {
    if (isAndroid) {
      return 'intent://' + url.replace(/^https?:\/\//, '') +
        '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' +
        encodeURIComponent(url) + ';end';
    }
    return 'googlechrome://' + url.replace(/^https?:\/\//, '');
  }

  // Handoff overlay — Gmail webview mein session save hone ke baad
  function showHandoffOverlay() {
    if (document.getElementById('et-handoff')) return;
    var ov = document.createElement('div');
    ov.id = 'et-handoff';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(3,5,13,0.97);display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;padding:24px;';
    ov.innerHTML =
      '<div style="max-width:420px;width:100%;background:#070c1a;border:1px solid #1e3058;border-radius:20px;padding:36px 28px;text-align:center;">' +
      '<div style="font-size:34px;margin-bottom:14px;">✅</div>' +
      '<h2 style="margin:0 0 12px 0;font-size:20px;color:#fff;letter-spacing:1px;">ETERNANT</h2>' +
      '<p style="margin:0 0 22px 0;font-size:14px;color:#8aa4c8;line-height:1.7;">Your account is confirmed and you are logged in — but inside Gmail\'s browser. <b style="color:#6eb5ff;">Open this same dashboard in Chrome</b> so your login is saved there properly.</p>' +
      '<button id="et-open-chrome" style="display:block;width:100%;padding:14px 20px;margin-bottom:12px;border:0;border-radius:12px;background:linear-gradient(135deg,#6eb5ff,#a78bfa);color:#03050d;font-size:15px;font-weight:800;cursor:pointer;">Open in Chrome →</button>' +
      '<button id="et-copy-link" style="display:block;width:100%;padding:12px 20px;margin-bottom:16px;border:1px solid #1e3058;border-radius:12px;background:transparent;color:#8aa4c8;font-size:13px;cursor:pointer;">Copy dashboard link for Chrome</button>' +
      '<span id="et-copy-ok" style="display:none;color:#10b981;font-size:13px;margin-bottom:14px;">✓ Link copied — open it in Chrome</span>' +
      '<a id="et-continue" href="#" style="color:#4a6080;font-size:12px;text-decoration:underline;">Continue here anyway</a>' +
      '</div>';
    (document.body || document.documentElement).appendChild(ov);
    document.getElementById('et-open-chrome').onclick = function () {
      try { location.href = chromeUrlFor(handoffUrl); } catch (e) {}
    };
    document.getElementById('et-copy-link').onclick = function () {
      try {
        if (navigator.clipboard) { navigator.clipboard.writeText(handoffUrl); }
        else {
          var ta = document.createElement('textarea');
          ta.value = handoffUrl; document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); ta.remove();
        }
        document.getElementById('et-copy-ok').style.display = 'block';
      } catch (e) {}
    };
    document.getElementById('et-continue').onclick = function (e) {
      e.preventDefault(); ov.remove();
      window.location.reload();
    };
  }

  // Supabase ke session format mein save karo localStorage mein
  // (Supabase JS v1 format — index.html persistSupabaseSession jaisa)
  async function setSession() {
    try {
      var res = await fetch(SUPABASE_URL + '/auth/v1/user', {
        headers: {
          'apikey': SUPABASE_ANON,
          'Authorization': 'Bearer ' + accessToken
        }
      });
      var user = await res.json();

      var session = {
        currentSession: {
          access_token:  accessToken,
          refresh_token: refreshToken,
          token_type:    'bearer',
          expires_in:    3600,
          expires_at:    Math.floor(Date.now() / 1000) + 3600,
          user:          user
        },
        expiresAt: Math.floor(Date.now() / 1000) + 3600
      };

      // Find existing Supabase key or use default
      var storageKey = 'supabase.auth.token';
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('supabase.auth.token') !== -1) { storageKey = k; break; }
      }

      localStorage.setItem(storageKey, JSON.stringify(session));

      // Role bhi set karo
      var role = localStorage.getItem('eternant_user_role') || 'publisher';
      localStorage.setItem('eternant_user_role', role);

      if (inWebview) {
        // Gmail webview: pehle handoff overlay dikhao, reload baad mein
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', showHandoffOverlay);
        } else {
          showHandoffOverlay();
        }
      } else {
        // Normal Chrome browser — page reload karo taaki dashboard session pick kare
        window.location.reload();
      }

    } catch (e) {
      console.error('Session restore failed:', e);
    }
  }

  setSession();
})();
