/* Site chrome (Han, 2026-10-20): every page of han.espil.online carries the
   front page's animated UseDesign-logo cursor. Fine pointers only; without
   this script the static url() cursors in site-chrome.css still apply. */
(function(){
  if(!window.matchMedia || !matchMedia('(pointer:fine)').matches) return;
  if(document.getElementById('espil-cursor')) return;
  fetch('/chrome/cursor.svg.txt').then(function(r){ return r.text(); }).then(function(SVG){
    var el = document.createElement('div');
    el.id = 'espil-cursor'; el.setAttribute('aria-hidden','true'); el.innerHTML = SVG;
    document.body.appendChild(el);
    var x = innerWidth/2, y = innerHeight/2, raf = null, shown = false;
    function draw(){ el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; raf = null; }
    function queue(){ if(!raf) raf = requestAnimationFrame(draw); }
    document.addEventListener('mousemove', function(e){
      x = e.clientX; y = e.clientY; queue();
      if(!shown){ shown = true; document.documentElement.classList.add('uc-on'); el.classList.add('on'); draw(); }
    }, {passive:true});
    document.addEventListener('mouseleave', function(){ el.classList.remove('on'); });
    document.addEventListener('mouseenter', function(){ if(shown) el.classList.add('on'); });
    var SEL = 'a, button, input, select, textarea, label, [role="button"], .chip';
    document.addEventListener('mouseover', function(e){ if(e.target.closest && e.target.closest(SEL)) el.classList.add('is-hover'); }, {passive:true});
    document.addEventListener('mouseout', function(e){ if(e.target.closest && e.target.closest(SEL)) el.classList.remove('is-hover'); }, {passive:true});
    document.addEventListener('mousedown', function(){ el.classList.add('is-active'); }, {passive:true});
    document.addEventListener('mouseup', function(){ el.classList.remove('is-active'); }, {passive:true});
  }).catch(function(){});
})();
