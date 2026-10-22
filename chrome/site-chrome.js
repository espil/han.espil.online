/* Site chrome cursor - built from scratch (Han's order, 2026-10-21).
   One rule, and only one: the hat takes the opposite tone of the
   background directly under the pointer. Light background -> the black
   hat. Dark background -> the white hat. The page theme, the system
   colour scheme, and every other mode are never read. */
(function(){
  if(!window.matchMedia || !matchMedia('(pointer:fine)').matches) return;
  if(document.getElementById('espil-cursor')) return;
  Promise.all([
    fetch('/chrome/cursor-dark.svg?v=6').then(function(r){ return r.text(); }),
    fetch('/chrome/cursor-light.svg?v=6').then(function(r){ return r.text(); })
  ]).then(function(pair){
    var DARK = pair[0], LIGHT = pair[1];
    var el = document.createElement('div');
    el.id = 'espil-cursor'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = DARK;
    document.body.appendChild(el);
    var x = innerWidth / 2, y = innerHeight / 2, raf = null, shown = false, dark = true;
    function backgroundIsLight(px, py){
      var node = document.elementFromPoint(px, py);
      while(node && node !== document.documentElement){
        var m = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
        if(m && (m.length < 4 || parseFloat(m[3]) > 0)){
          return (0.2126 * +m[0] + 0.7152 * +m[1] + 0.0722 * +m[2]) > 153;
        }
        node = node.parentElement;
      }
      return true;
    }
    function adapt(){
      var wantDark = backgroundIsLight(x, y);
      if(wantDark !== dark){ dark = wantDark; el.innerHTML = dark ? DARK : LIGHT; }
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
    var SEL = 'a, button, input, select, textarea, label, [role="button"], .chip';
    document.addEventListener('mouseover', function(e){ if(e.target.closest && e.target.closest(SEL)) el.classList.add('is-hover'); }, {passive:true});
    document.addEventListener('mouseout', function(e){ if(e.target.closest && e.target.closest(SEL)) el.classList.remove('is-hover'); }, {passive:true});
    document.addEventListener('mousedown', function(){ el.classList.add('is-active'); }, {passive:true});
    document.addEventListener('mouseup', function(){ el.classList.remove('is-active'); }, {passive:true});
  }).catch(function(){});
})();
