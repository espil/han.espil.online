/* Site chrome (Han, 2026-10-20): every page of han.espil.online carries the
   front page's animated UseDesign-logo cursor. Fine pointers only; without
   this script the static url() cursors in site-chrome.css still apply.
   The cursor reads the background under the pointer and swaps between a
   dark and a light solid hat, so it stays readable on every background
   (Han's contrast rule, 2026-10-14). No blend modes. */
(function(){
  if(!window.matchMedia || !matchMedia('(pointer:fine)').matches) return;
  if(document.getElementById('espil-cursor')) return;
  Promise.all([
      fetch('/chrome/cursor.svg.txt').then(function(r){ return r.text(); }),
      fetch('/chrome/cursor-light.svg.txt').then(function(r){ return r.text(); })
    ]).then(function(pair){
    var SVG_DARK = ""+pair[0]+"", SVG_LIGHT = ""+pair[1]+"";
    var el = document.createElement('div');
    el.id = 'espil-cursor'; el.setAttribute('aria-hidden','true'); el.innerHTML = SVG_DARK;
    document.body.appendChild(el);
    var x = innerWidth/2, y = innerHeight/2, raf = null, shown = false, curDark = true;
    function bgLight(px, py){
      var node = document.elementFromPoint(px, py), m = null, bg;
      while(node && node !== document.documentElement){
        bg = getComputedStyle(node).backgroundColor;
        m = bg && bg.match(/[\d.]+/g);
        if(m && (m.length < 4 || parseFloat(m[3]) > 0)) break;
        m = null; node = node.parentElement;
      }
      if(!m){
        var t = document.documentElement.getAttribute('data-theme');
        if(t) return t !== 'dark';
        return !(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
      }
      return (0.2126 * +m[0] + 0.7152 * +m[1] + 0.0722 * +m[2]) / 255 > 0.6;
    }
    function adapt(){
      var want = bgLight(x, y);
      if(want !== curDark){ curDark = want; el.innerHTML = want ? SVG_DARK : SVG_LIGHT; }
    }
    function draw(){ el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; adapt(); raf = null; }
    function queue(){ if(!raf) raf = requestAnimationFrame(draw); }
    document.addEventListener('mousemove', function(e){
      x = e.clientX; y = e.clientY; queue();
      if(!shown){ shown = true; document.documentElement.classList.add('uc-on'); el.classList.add('on'); draw(); }
    }, {passive:true});
    document.addEventListener('mouseleave', function(){ el.classList.remove('on'); });
    document.addEventListener('mouseenter', function(){ if(shown) el.classList.add('on'); });
    document.addEventListener('scroll', function(){ if(shown) adapt(); }, {passive:true});
  }).catch(function(){});
})();
