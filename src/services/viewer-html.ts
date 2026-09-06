/**
 * Génère le HTML rendu dans une WebView pour lire PDF / Word / Excel.
 *
 * Choix d'archi : les libs (pdf.js, mammoth, SheetJS) tournent DANS la WebView
 * (environnement navigateur où elles sont fiables) plutôt que dans Hermes.
 * Elles sont chargées depuis cdnjs ; le document, lui, ne quitte jamais
 * l'appareil : ses octets sont injectés en base64 dans la page.
 *
 * Compromis : la première ouverture d'un type donné nécessite le réseau pour
 * récupérer la lib (~1 Mo), ensuite le cache HTTP de la WebView suffit.
 */
import type { ThemeColor } from '@/constants/theme';

type Palette = Record<ThemeColor, string>;

export type WebDocKind = 'pdf' | 'docx' | 'xlsx';

const CDN = {
  pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  mammoth: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
};

const shell = (theme: Palette, body: string, script: string) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
<style>
  :root { color-scheme: light dark; }
  html, body { margin: 0; padding: 0; background: ${theme.background}; color: ${theme.text}; }
  body { font: 15px/1.55 -apple-system, Roboto, "Segoe UI", sans-serif; padding: 16px; -webkit-text-size-adjust: 100%; }
  #err { color: ${theme.danger}; padding: 16px; white-space: pre-wrap; }
  a { color: ${theme.accent}; }
  /* PDF */
  .page { width: 100%; margin: 0 auto 12px; display: block; box-shadow: 0 0 0 1px ${theme.border}; }
  /* Word */
  .docx img { max-width: 100%; height: auto; }
  .docx table { border-collapse: collapse; }
  .docx td, .docx th { border: 1px solid ${theme.border}; padding: 4px 8px; }
  /* Excel */
  #tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
  #tabs button { border: 1px solid ${theme.border}; background: ${theme.backgroundElement}; color: ${theme.text};
    border-radius: 999px; padding: 4px 12px; font-size: 13px; }
  #tabs button.active { background: ${theme.accent}; color: ${theme.background}; border-color: ${theme.accent}; }
  .sheet { overflow-x: auto; }
  .sheet table { border-collapse: collapse; font-size: 13px; }
  .sheet td, .sheet th { border: 1px solid ${theme.border}; padding: 3px 8px; white-space: nowrap; }
</style>
</head>
<body>
<div id="content">${body}</div>
<div id="err" hidden></div>
<script>
  var RN = window.ReactNativeWebView;
  function fail(e){ var m = (e && e.message) ? e.message : String(e);
    var el = document.getElementById('err'); el.hidden = false; el.textContent = m;
    if (RN) RN.postMessage('error:' + m); }
  window.onerror = function(msg){ fail(msg); return true; };
  function b64ToBytes(b64){ var bin = atob(b64); var u8 = new Uint8Array(bin.length);
    for (var i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i); return u8; }
  function load(src){ return new Promise(function(res, rej){
    var s = document.createElement('script'); s.src = src; s.onload = res;
    s.onerror = function(){ rej(new Error('Chargement impossible : ' + src)); };
    document.head.appendChild(s); }); }
  function ready(){ if (RN) RN.postMessage('ready'); }
  ${script}
</script>
</body>
</html>`;

export function buildWebDocHtml(
  kind: WebDocKind,
  base64: string,
  theme: Palette,
): string {
  const data = `var DATA = ${JSON.stringify(base64)};`;

  if (kind === 'pdf') {
    return shell(
      theme,
      '<div id="pages"></div>',
      `${data}
      load(${JSON.stringify(CDN.pdf)}).then(function(){
        pdfjsLib.GlobalWorkerOptions.workerSrc = ${JSON.stringify(CDN.pdfWorker)};
        return pdfjsLib.getDocument({ data: b64ToBytes(DATA) }).promise;
      }).then(function(pdf){
        var scale = Math.min(2, (window.devicePixelRatio || 1) * 1.5);
        var seq = Promise.resolve();
        for (var n = 1; n <= pdf.numPages; n++) (function(n){
          seq = seq.then(function(){ return pdf.getPage(n); }).then(function(page){
            var vp = page.getViewport({ scale: scale });
            var canvas = document.createElement('canvas');
            canvas.className = 'page';
            canvas.width = vp.width; canvas.height = vp.height;
            canvas.style.height = 'auto';
            document.getElementById('pages').appendChild(canvas);
            return page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
          });
        })(n);
        return seq;
      }).then(ready).catch(fail);`,
    );
  }

  if (kind === 'docx') {
    return shell(
      theme,
      '<div id="out" class="docx"></div>',
      `${data}
      load(${JSON.stringify(CDN.mammoth)}).then(function(){
        return mammoth.convertToHtml({ arrayBuffer: b64ToBytes(DATA).buffer });
      }).then(function(r){
        document.getElementById('out').innerHTML = r.value || '<p><em>Document vide.</em></p>';
        ready();
      }).catch(fail);`,
    );
  }

  // xlsx
  return shell(
    theme,
    '<div id="tabs"></div><div id="sheet" class="sheet"></div>',
    `${data}
    load(${JSON.stringify(CDN.xlsx)}).then(function(){
      var wb = XLSX.read(b64ToBytes(DATA), { type: 'array' });
      var tabs = document.getElementById('tabs');
      var sheet = document.getElementById('sheet');
      function show(name, btn){
        sheet.innerHTML = XLSX.utils.sheet_to_html(wb.Sheets[name], { editable: false });
        Array.prototype.forEach.call(tabs.children, function(c){ c.className = ''; });
        btn.className = 'active';
      }
      wb.SheetNames.forEach(function(name, i){
        var b = document.createElement('button');
        b.textContent = name;
        b.onclick = function(){ show(name, b); };
        tabs.appendChild(b);
        if (i === 0) show(name, b);
      });
      ready();
    }).catch(fail);`,
  );
}
