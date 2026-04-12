/**
 * Preview Renderer
 *
 * Generates a complete e-commerce website HTML from the AI-extracted
 * design system and requirements. Used by the debug preview endpoint.
 */

export function buildFullDemoWebsite(ds: any, req: any): string {
  const cp = ds?.colorPalette || { primary: "#0e0e0e", secondary: "#f5f2eb", accent: "#b87a4b", background: "#0e0e0e", text: "#f5f2eb" };
  const tp = ds?.typography || { displayFont: "Instrument Serif", bodyFont: "DM Sans", heroScale: "clamp(3.5rem, 2rem + 7vw, 10rem)", bodyScale: "1.125rem", tracking: "-0.02em" };
  const sp = ds?.spacing || { sectionPadding: "clamp(4rem, 10vh, 8rem)", gridGutter: "clamp(1rem, 2vw, 2rem)", gridMargin: "clamp(1rem, 5vw, 6rem)" };
  const industry = req?.businessContext?.industry || "leather accessories";
  const projectType = req?.projectType || "e-commerce";
  const platform = req?.platformPreference || "custom";
  const brandEssence = req?.brandEssence || "refined";
  const mood = ds?.mood || "warm";
  const animStyle = ds?.animationStyle || "locomotive";
  const features = req?.contentRequirements?.features || ["product gallery", "cart", "newsletter"];
  const brandName = req?.businessContext?.industry === "fashion" ? "KAIRA" : "KAIRA";

  const products = [
    { name: "Milano Tote", cat: "Bags", price: "4,200", hex: "#8B6914" },
    { name: "Artisan Wallet", cat: "Wallets", price: "1,450", hex: "#6B4226" },
    { name: "Heritage Belt", cat: "Belts", price: "980", hex: "#4A3728" },
    { name: "Roma Crossbody", cat: "Bags", price: "3,800", hex: "#9B7653" },
    { name: "Slim Cardholder", cat: "Wallets", price: "850", hex: "#7A5C3E" },
    { name: "Classic Buckle", cat: "Belts", price: "1,100", hex: "#5C3D2E" },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandName} &mdash; Premium Leather Goods</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(tp.displayFont)}:ital,wght@0,400;0,500;0,600;0,700;1,400&family=${encodeURIComponent(tp.bodyFont)}:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
:root{
  --c-bg:${cp.primary};--c-fg:${cp.secondary};--c-accent:${cp.accent};
  --c-surface:#141414;--c-text:${cp.text};
  --c-text2:rgba(245,242,235,.55);--c-text3:rgba(245,242,235,.35);
  --c-border:rgba(245,242,235,.08);--c-border2:rgba(245,242,235,.15);
  --f-display:'${tp.displayFont}',Georgia,serif;
  --f-body:'${tp.bodyFont}','Helvetica Neue',sans-serif;
  --gm:${sp.gridMargin};--sp:${sp.sectionPadding};--gg:${sp.gridGutter};
  --ease:cubic-bezier(.16,1,.3,1);--ease2:cubic-bezier(.25,1,.5,1);
  --ease-io:cubic-bezier(.87,0,.13,1);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;scroll-behavior:smooth}
body{font-family:var(--f-body);font-size:1rem;line-height:1.6;color:var(--c-text);background:var(--c-bg);overflow-x:hidden}
::selection{background:var(--c-accent);color:var(--c-fg)}
:focus-visible{outline:2px solid var(--c-accent);outline-offset:3px}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
/* ── Nav ── */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:1.5rem var(--gm);display:flex;justify-content:space-between;align-items:center;mix-blend-mode:difference}
.nav__logo{font-family:var(--f-display);font-size:1.5rem;font-weight:400;letter-spacing:.15em;color:#fff}
.nav__links{display:flex;gap:2.5rem;list-style:none}
.nav__links a{font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.6);transition:color .3s var(--ease);position:relative}
.nav__links a::after{content:'';position:absolute;bottom:-3px;left:0;width:100%;height:1px;background:#fff;transform:scaleX(0);transform-origin:right;transition:transform .4s var(--ease)}
.nav__links a:hover{color:#fff}
.nav__links a:hover::after{transform:scaleX(1);transform-origin:left}
.nav__cart{position:relative;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.6);cursor:pointer}
.nav__cart-count{position:absolute;top:-8px;right:-12px;width:16px;height:16px;border-radius:50%;background:var(--c-accent);color:#fff;font-size:.6rem;display:flex;align-items:center;justify-content:center}
/* anim */
.nav__logo,.nav__links li,.nav__cart{opacity:0;transform:translateY(-15px);animation:navIn .6s var(--ease) forwards}
.nav__links li:nth-child(1){animation-delay:.7s}
.nav__links li:nth-child(2){animation-delay:.75s}
.nav__links li:nth-child(3){animation-delay:.8s}
.nav__links li:nth-child(4){animation-delay:.85s}
.nav__logo{animation-delay:.6s}
.nav__cart{animation-delay:.9s}
@keyframes navIn{to{opacity:1;transform:translateY(0)}}

/* ── Hero ── */
.hero{min-height:100vh;display:flex;flex-direction:column;justify-content:flex-end;padding:var(--gm);padding-bottom:12vh;position:relative;overflow:hidden}
.hero__bg{position:absolute;inset:0;background:linear-gradient(135deg,${cp.primary} 0%,#1a1510 50%,${cp.primary} 100%);z-index:-1}
.hero__bg::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 70% 60%,rgba(184,122,75,.08) 0%,transparent 60%)}
.hero__label{font-size:.7rem;letter-spacing:.15em;text-transform:uppercase;color:var(--c-accent);margin-bottom:2rem;opacity:0;animation:fadeUp .8s var(--ease) .2s forwards}
.hero__title{font-family:var(--f-display);font-size:${tp.heroScale};font-weight:400;font-style:italic;line-height:.95;letter-spacing:${tp.tracking};color:var(--c-fg)}
.hero__title .word{display:inline-block;overflow:hidden;vertical-align:bottom}
.hero__title .word-inner{display:inline-block;transform:translateY(110%)}
.hero__sub{font-size:1.05rem;line-height:1.7;color:var(--c-text2);max-width:38ch;margin-top:2rem;opacity:0;animation:fadeUp .8s var(--ease) .9s forwards}
.hero__actions{display:flex;gap:1rem;margin-top:2.5rem;opacity:0;animation:fadeUp .6s var(--ease) 1.1s forwards}
.hero__scroll{position:absolute;bottom:2rem;right:var(--gm);font-size:.65rem;letter-spacing:.2em;text-transform:uppercase;color:var(--c-text3);writing-mode:vertical-rl;opacity:0;animation:fadeIn 1s var(--ease) 1.5s forwards}
.hero__scroll::after{content:'';display:block;width:1px;height:50px;background:var(--c-border2);margin-top:.75rem;margin-inline:auto;animation:pulse 2s var(--ease-io) infinite}
@keyframes pulse{0%,100%{opacity:.3;transform:scaleY(.5)}50%{opacity:1;transform:scaleY(1)}}

/* ── Buttons ── */
.btn{display:inline-block;padding:.9rem 2.2rem;font-family:var(--f-body);font-size:.78rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;position:relative;overflow:hidden;transition:transform .15s var(--ease)}
.btn--fill{background:var(--c-accent);color:var(--c-fg);border:none}
.btn--fill:hover{transform:scale(1.03)}
.btn--outline{background:transparent;color:var(--c-text2);border:1px solid var(--c-border2)}
.btn--outline::before{content:'';position:absolute;inset:0;background:var(--c-accent);transform:scaleX(0);transform-origin:right;transition:transform .5s var(--ease)}
.btn--outline:hover{color:var(--c-fg)}
.btn--outline:hover::before{transform:scaleX(1);transform-origin:left}
.btn--outline span{position:relative;z-index:1}

/* ── Marquee ── */
.marquee{padding:2rem 0;border-top:1px solid var(--c-border);border-bottom:1px solid var(--c-border);overflow:hidden;white-space:nowrap}
.marquee__track{display:inline-flex;gap:3rem;animation:scroll 25s linear infinite}
.marquee__item{font-family:var(--f-display);font-size:1rem;font-weight:400;color:var(--c-text3);letter-spacing:.05em}
.marquee__dot{color:var(--c-accent)}
@keyframes scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

/* ── Products ── */
.products{padding:var(--sp) var(--gm)}
.section-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:3rem;flex-wrap:wrap;gap:1rem}
.section-label{font-size:.7rem;font-weight:500;letter-spacing:.15em;text-transform:uppercase;color:var(--c-accent)}
.section-title{font-family:var(--f-display);font-size:clamp(2rem,1rem+4vw,4rem);font-weight:400;letter-spacing:-.01em;line-height:1.05;margin-top:.75rem}
.section-link{font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--c-text2);border-bottom:1px solid var(--c-border2);padding-bottom:2px;transition:color .3s,border-color .3s}
.section-link:hover{color:var(--c-accent);border-color:var(--c-accent)}
.products__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--gg)}
@media(max-width:768px){.products__grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.products__grid{grid-template-columns:1fr}}
.product-card{opacity:0;transform:translateY(50px);transition:opacity .8s var(--ease),transform .8s var(--ease);cursor:pointer}
.product-card.is-visible{opacity:1;transform:translateY(0)}
.product-card__img{aspect-ratio:3/4;border-radius:2px;overflow:hidden;position:relative;background:var(--c-surface);border:1px solid var(--c-border)}
.product-card__img-inner{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:var(--f-display);font-size:4rem;font-weight:400;font-style:italic;color:var(--c-text3);transition:transform .8s var(--ease),filter .5s;letter-spacing:-.02em}
.product-card:hover .product-card__img-inner{transform:scale(1.06);filter:brightness(1.1)}
.product-card__quick{position:absolute;bottom:0;left:0;right:0;padding:.75rem;text-align:center;background:var(--c-accent);color:var(--c-fg);font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;transform:translateY(100%);transition:transform .4s var(--ease);font-weight:500}
.product-card:hover .product-card__quick{transform:translateY(0)}
.product-card__info{padding-top:1rem}
.product-card__cat{font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--c-text3)}
.product-card__name{font-family:var(--f-display);font-size:1.1rem;margin-top:.25rem;font-weight:400}
.product-card__price{font-size:.9rem;color:var(--c-accent);margin-top:.25rem;font-weight:500}

/* ── About ── */
.about{display:grid;grid-template-columns:1fr 1fr;min-height:80vh}
@media(max-width:768px){.about{grid-template-columns:1fr}}
.about__visual{background:var(--c-surface);display:flex;align-items:center;justify-content:center;padding:4rem;position:relative;overflow:hidden}
.about__pattern{font-family:var(--f-display);font-size:clamp(8rem,10vw,15rem);font-weight:400;font-style:italic;color:rgba(245,242,235,.03);position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);white-space:nowrap;pointer-events:none}
.about__icon{width:120px;height:120px;border:1px solid var(--c-border2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--f-display);font-size:2.5rem;font-style:italic;color:var(--c-accent);position:relative;z-index:1}
.about__content{display:flex;flex-direction:column;justify-content:center;padding:4rem var(--gm)}
.about__content p{color:var(--c-text2);margin-bottom:1.5rem;max-width:45ch;line-height:1.8}

/* ── Features ── */
.features{padding:var(--sp) var(--gm);border-top:1px solid var(--c-border)}
.features__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--c-border);margin-top:3rem}
@media(max-width:768px){.features__grid{grid-template-columns:1fr}}
.feature{background:var(--c-bg);padding:3rem;opacity:0;transform:translateY(30px);transition:opacity .6s var(--ease),transform .6s var(--ease)}
.feature.is-visible{opacity:1;transform:translateY(0)}
.feature__num{font-family:var(--f-display);font-size:2.5rem;font-style:italic;color:var(--c-accent);opacity:.3;margin-bottom:1.5rem}
.feature__title{font-family:var(--f-display);font-size:1.2rem;font-weight:400;margin-bottom:.75rem}
.feature__desc{font-size:.9rem;color:var(--c-text2);line-height:1.7}

/* ── Newsletter ── */
.newsletter{padding:var(--sp) var(--gm);text-align:center;border-top:1px solid var(--c-border)}
.newsletter__title{font-family:var(--f-display);font-size:clamp(2rem,1.5rem+3vw,3.5rem);font-weight:400;font-style:italic;margin-bottom:1rem}
.newsletter__desc{color:var(--c-text2);margin-bottom:2.5rem;max-width:45ch;margin-inline:auto}
.newsletter__form{display:flex;gap:0;max-width:500px;margin:0 auto}
.newsletter__input{flex:1;padding:.9rem 1.25rem;background:transparent;border:1px solid var(--c-border2);border-right:none;color:var(--c-text);font-family:var(--f-body);font-size:.85rem;outline:none;transition:border-color .3s}
.newsletter__input::placeholder{color:var(--c-text3)}
.newsletter__input:focus{border-color:var(--c-accent)}
.newsletter__btn{padding:.9rem 2rem;background:var(--c-accent);color:var(--c-fg);border:1px solid var(--c-accent);font-family:var(--f-body);font-size:.75rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:background .3s}
.newsletter__btn:hover{background:transparent;color:var(--c-accent)}

/* ── CTA ── */
.cta{padding:calc(var(--sp)*1.5) var(--gm);text-align:center;position:relative}
.cta__title{font-family:var(--f-display);font-size:clamp(2.5rem,1.5rem+5vw,6rem);font-weight:400;font-style:italic;letter-spacing:-.02em;line-height:.95;margin-bottom:2rem}
.cta__accent{color:var(--c-accent)}
.cta__sub{font-size:1rem;color:var(--c-text2);max-width:45ch;margin:0 auto 2.5rem}

/* ── Footer ── */
.footer{padding:3rem var(--gm);border-top:1px solid var(--c-border);display:grid;grid-template-columns:1fr 1fr 1fr;gap:2rem;align-items:center}
@media(max-width:768px){.footer{grid-template-columns:1fr;text-align:center}}
.footer__brand{font-family:var(--f-display);font-size:1.2rem;letter-spacing:.15em}
.footer__links{display:flex;gap:2rem;justify-content:center;list-style:none}
.footer__links a{font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;color:var(--c-text3);transition:color .3s}
.footer__links a:hover{color:var(--c-accent)}
.footer__meta{text-align:right;font-size:.7rem;color:var(--c-text3)}
.footer__meta a{color:var(--c-accent)}

/* ── Utils ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(25px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.01ms!important}.hero__title .word-inner{transform:none}.product-card,.feature{opacity:1;transform:none}}
  </style>
</head>
<body>

<!-- Nav -->
<nav class="nav">
  <a href="#" class="nav__logo">${brandName}</a>
  <ul class="nav__links">
    <li><a href="#products">Collection</a></li>
    <li><a href="#about">About</a></li>
    <li><a href="#features">Craft</a></li>
    <li><a href="#newsletter">Contact</a></li>
  </ul>
  <div class="nav__cart">Bag <span class="nav__cart-count">0</span></div>
</nav>

<!-- Hero -->
<section class="hero" id="hero">
  <div class="hero__bg"></div>
  <div class="hero__label">Handcrafted Leather Goods &mdash; Est. 2024</div>
  <h1 class="hero__title" data-reveal="words">Crafted for Those Who Notice</h1>
  <p class="hero__sub">Premium leather accessories, handmade by artisans who believe every stitch tells a story. Designed in Istanbul, crafted for the world.</p>
  <div class="hero__actions">
    <button class="btn btn--fill magnetic-btn">Shop Collection</button>
    <button class="btn btn--outline magnetic-btn"><span>Our Story</span></button>
  </div>
  <div class="hero__scroll">Scroll</div>
</section>

<!-- Marquee -->
<div class="marquee">
  <div class="marquee__track">
    ${[...Array(2)].map(() => features.map((f: string) => `<span class="marquee__item">${f}</span><span class="marquee__dot"> &bull; </span>`).join("")).join("")}
  </div>
</div>

<!-- Products -->
<section class="products" id="products">
  <div class="section-head">
    <div>
      <div class="section-label" data-reveal>The Collection</div>
      <h2 class="section-title" data-reveal>Signature Pieces</h2>
    </div>
    <a href="#" class="section-link" data-reveal>View All Products &rarr;</a>
  </div>
  <div class="products__grid">
    ${products.map((p, i) => `
    <div class="product-card" data-reveal style="transition-delay:${i * 100}ms">
      <div class="product-card__img">
        <div class="product-card__img-inner" style="background:linear-gradient(145deg,${p.hex}22,${p.hex}11)">${p.name[0]}</div>
        <div class="product-card__quick">Quick View</div>
      </div>
      <div class="product-card__info">
        <div class="product-card__cat">${p.cat}</div>
        <div class="product-card__name">${p.name}</div>
        <div class="product-card__price">&pound;${p.price}</div>
      </div>
    </div>`).join("")}
  </div>
</section>

<!-- About -->
<section class="about" id="about">
  <div class="about__visual">
    <div class="about__pattern">${brandName}</div>
    <div class="about__icon" data-reveal>K</div>
  </div>
  <div class="about__content">
    <div class="section-label" data-reveal>Our Story</div>
    <h2 class="section-title" data-reveal style="margin-bottom:2rem">Born from<br>a Single Stitch</h2>
    <p data-reveal>What started in a small Istanbul atelier has grown into a brand that stands for uncompromising quality. Every ${brandName} piece is cut, stitched, and finished by hand &mdash; because machines can replicate, but they cannot create.</p>
    <p data-reveal>We source our leather from family-owned tanneries in Tuscany, selecting only hides that meet our exacting standards. The result is a product that ages beautifully, developing a patina that becomes uniquely yours.</p>
    <div data-reveal style="margin-top:1rem">
      <button class="btn btn--outline magnetic-btn"><span>Read More</span></button>
    </div>
  </div>
</section>

<!-- Features -->
<section class="features" id="features">
  <div class="section-label" data-reveal>The ${brandName} Difference</div>
  <h2 class="section-title" data-reveal>Craftsmanship<br>in Every Detail</h2>
  <div class="features__grid">
    <div class="feature" data-reveal style="transition-delay:.1s">
      <div class="feature__num">01</div>
      <h3 class="feature__title">Full-Grain Leather</h3>
      <p class="feature__desc">Only the finest Tuscan full-grain leather. Each hide is hand-selected for its texture, strength, and ability to develop a rich patina over years of use.</p>
    </div>
    <div class="feature" data-reveal style="transition-delay:.2s">
      <div class="feature__num">02</div>
      <h3 class="feature__title">Hand-Stitched</h3>
      <p class="feature__desc">Saddle-stitched by artisans with decades of experience. Unlike machine stitching, our thread locks in place &mdash; if one stitch breaks, the rest hold firm.</p>
    </div>
    <div class="feature" data-reveal style="transition-delay:.3s">
      <div class="feature__num">03</div>
      <h3 class="feature__title">Lifetime Guarantee</h3>
      <p class="feature__desc">We stand behind every piece we create. If it ever fails due to craftsmanship, we will repair or replace it. No questions, no time limit.</p>
    </div>
  </div>
</section>

<!-- Newsletter -->
<section class="newsletter" id="newsletter">
  <div class="section-label" data-reveal>Stay in Touch</div>
  <h2 class="newsletter__title" data-reveal>Join the Inner Circle</h2>
  <p class="newsletter__desc" data-reveal>Early access to new collections, behind-the-scenes from the atelier, and exclusive member pricing.</p>
  <form class="newsletter__form" data-reveal onsubmit="event.preventDefault();this.querySelector('button').textContent='Subscribed!'">
    <input class="newsletter__input" type="email" placeholder="Your email address" required>
    <button class="newsletter__btn" type="submit">Subscribe</button>
  </form>
</section>

<!-- CTA -->
<section class="cta">
  <h2 class="cta__title" data-reveal="words">Made to Last.<br><span class="cta__accent">Made for You.</span></h2>
  <p class="cta__sub" data-reveal>Every ${brandName} piece begins with a conversation and ends with a lifetime of use. This is leather goods, done right.</p>
  <button class="btn btn--fill magnetic-btn" data-reveal>Shop the Collection</button>
</section>

<!-- Footer -->
<footer class="footer">
  <div class="footer__brand">${brandName}</div>
  <ul class="footer__links">
    <li><a href="#">Collection</a></li>
    <li><a href="#">About</a></li>
    <li><a href="#">Shipping</a></li>
    <li><a href="#">Contact</a></li>
  </ul>
  <div class="footer__meta">
    Generated by <a href="#">Yappaflow AI</a><br>
    Design: ${animStyle} &middot; ${mood} &middot; ${platform}
  </div>
</footer>

<script>
(function(){
  // ── Word split animation ──
  document.querySelectorAll('[data-reveal="words"]').forEach(function(el){
    var words=el.innerHTML.replace(/<br\\s*\\/?>/gi,'BRTOKEN').split(/\\s+/).filter(Boolean);
    el.innerHTML=words.map(function(w,i){
      if(w==='BRTOKEN') return '<br>';
      var clean=w.replace('BRTOKEN','');
      return '<span class="word"><span class="word-inner" style="animation:wordIn 1.2s var(--ease) '+(0.3+i*0.08)+'s forwards">'+clean+'</span></span>';
    }).join(' ');
  });
  var s=document.createElement('style');
  s.textContent='@keyframes wordIn{from{transform:translateY(110%)}to{transform:translateY(0)}}';
  document.head.appendChild(s);

  // ── Scroll reveals ──
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){e.target.classList.add('is-visible');obs.unobserve(e.target)}
    });
  },{rootMargin:'0px 0px -60px 0px',threshold:0.1});
  document.querySelectorAll('[data-reveal]').forEach(function(el){
    if(el.dataset.reveal!=='words') obs.observe(el);
  });

  // ── Magnetic buttons ──
  document.querySelectorAll('.magnetic-btn').forEach(function(btn){
    btn.addEventListener('mousemove',function(e){
      var r=btn.getBoundingClientRect();
      var x=e.clientX-r.left-r.width/2;
      var y=e.clientY-r.top-r.height/2;
      btn.style.transform='translate('+(x*.12)+'px,'+(y*.12)+'px) scale(1.02)';
      btn.style.transition='transform .15s cubic-bezier(.16,1,.3,1)';
    });
    btn.addEventListener('mouseleave',function(){
      btn.style.transform='translate(0,0) scale(1)';
      btn.style.transition='transform .5s cubic-bezier(.16,1,.3,1)';
    });
  });

  // ── Cart counter ──
  var count=0;
  document.querySelectorAll('.product-card__quick').forEach(function(q){
    q.addEventListener('click',function(e){
      e.stopPropagation();
      count++;
      document.querySelector('.nav__cart-count').textContent=count;
      q.textContent='Added!';
      setTimeout(function(){q.textContent='Quick View'},1500);
    });
  });

  // ── Smooth scroll for nav links ──
  document.querySelectorAll('.nav__links a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var target=document.querySelector(a.getAttribute('href'));
      if(target) target.scrollIntoView({behavior:'smooth'});
    });
  });
})();
</script>
</body>
</html>`;
}
