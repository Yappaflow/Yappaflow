/**
 * Mock filepath-fenced bundles used when AI_MOCK_MODE=true (or when
 * ANTHROPIC_API_KEY is absent). Each bundle mirrors the *required directory
 * layout* section of its corresponding prompt and contains minimum-viable —
 * but structurally valid — files so the full deploy pipeline (parseArtifacts
 * → validator → ZIP) works end-to-end without paying Anthropic.
 *
 * When you swap in the real API key later, nothing changes; these blobs are
 * simply no longer reached.
 */

// ── Shopify: 18-file Liquid theme ──────────────────────────────────────────
//
// `validateShopifyBundle` parses every .liquid via @shopify/liquid-html-parser
// and every .json via JSON.parse. All stubs below are intentionally valid on
// both fronts so the build doesn't abort with a validator error.

export const MOCK_SHOPIFY_BUNDLE = `\`\`\`filepath:layout/theme.liquid
<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{{ page_title }} — {{ shop.name }}</title>
  <script>
    (function () {
      var t = localStorage.getItem('yappaflow_theme');
      if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = t;
    })();
  </script>
  {{ 'theme.css' | asset_url | stylesheet_tag }}
  {{ content_for_header }}
</head>
<body>
  {% section 'header' %}
  <main>{{ content_for_layout }}</main>
  {% section 'footer' %}
  {{ 'theme.js' | asset_url | script_tag }}
</body>
</html>
\`\`\`

\`\`\`filepath:templates/index.json
{
  "sections": {
    "hero":     { "type": "hero" },
    "featured": { "type": "featured-products" }
  },
  "order": ["hero", "featured"]
}
\`\`\`

\`\`\`filepath:templates/product.json
{
  "sections": { "main": { "type": "main-product" } },
  "order": ["main"]
}
\`\`\`

\`\`\`filepath:templates/page.about.liquid
<section class="page"><h1>{{ page.title }}</h1>{{ page.content }}</section>
\`\`\`

\`\`\`filepath:templates/page.contact.liquid
<section class="page"><h1>{{ page.title }}</h1>{{ page.content }}</section>
\`\`\`

\`\`\`filepath:templates/cart.liquid
<section class="cart">
  <h1>Cart</h1>
  <form action="/cart" method="post" id="cart-form">
    {% for item in cart.items %}
      <div class="line">{{ item.product.title }} × {{ item.quantity }} — {{ item.line_price | money }}</div>
    {% endfor %}
    <button type="submit" name="checkout">Checkout</button>
  </form>
</section>
\`\`\`

\`\`\`filepath:sections/header.liquid
<header class="site-header">
  <a href="{{ shop.url }}">{{ shop.name }}</a>
  {% render 'theme-toggle' %}
  <a href="/cart" class="cart-badge" data-cart-count>{{ cart.item_count }}</a>
</header>
{% schema %}{"name":"Header","settings":[]}{% endschema %}
\`\`\`

\`\`\`filepath:sections/footer.liquid
<footer class="site-footer">© {{ 'now' | date: '%Y' }} {{ shop.name }}</footer>
{% schema %}{"name":"Footer","settings":[]}{% endschema %}
\`\`\`

\`\`\`filepath:sections/hero.liquid
<section class="hero"><h1>{{ shop.name }}</h1><p>{{ section.settings.subtitle }}</p></section>
{% schema %}{"name":"Hero","settings":[{"id":"subtitle","type":"text","label":"Subtitle","default":"Welcome"}]}{% endschema %}
\`\`\`

\`\`\`filepath:sections/featured-products.liquid
<section class="featured">
  {% for product in collections.all.products limit: 8 %}
    {% render 'product-card', product: product %}
  {% else %}
    <p>Catalog coming soon.</p>
  {% endfor %}
</section>
{% schema %}{"name":"Featured","settings":[]}{% endschema %}
\`\`\`

\`\`\`filepath:sections/main-product.liquid
<section class="product">
  <h1>{{ product.title }}</h1>
  <img src="{{ product.featured_image | img_url: 'medium' }}" alt="{{ product.title }}">
  <p>{{ product.price | money }}</p>
  <form action="/cart/add" method="post" id="product-form">
    <input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}">
    <button type="submit">Add to cart</button>
  </form>
</section>
{% schema %}{"name":"Product","settings":[]}{% endschema %}
\`\`\`

\`\`\`filepath:snippets/product-card.liquid
<a class="card" href="{{ product.url }}">
  <img src="{{ product.featured_image | img_url: 'medium' }}" alt="{{ product.title }}">
  <span>{{ product.title }}</span>
  <span>{{ product.price | money }}</span>
</a>
\`\`\`

\`\`\`filepath:snippets/theme-toggle.liquid
<button type="button" class="theme-toggle" onclick="(function(){var d=document.documentElement;var n=d.dataset.theme==='dark'?'light':'dark';d.dataset.theme=n;localStorage.setItem('yappaflow_theme',n);})();">
  <span aria-hidden="true">◐</span>
  <span class="sr-only">Toggle theme</span>
</button>
\`\`\`

\`\`\`filepath:config/settings_schema.json
[
  { "name": "theme_info", "theme_name": "Yappaflow Mock", "theme_version": "0.1.0" }
]
\`\`\`

\`\`\`filepath:config/settings_data.json
{ "current": "default", "presets": { "default": {} } }
\`\`\`

\`\`\`filepath:assets/theme.css
:root { --bg:#fff; --fg:#111; --accent:#ff6b35; }
[data-theme="dark"] { --bg:#0a0a0a; --fg:#f4f4f4; }
body { margin:0; font-family:system-ui,sans-serif; background:var(--bg); color:var(--fg); }
.site-header,.site-footer { padding:1rem; display:flex; gap:1rem; align-items:center; }
.hero { padding:4rem 1rem; text-align:center; }
.featured { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1rem; padding:1rem; }
.card img { width:100%; aspect-ratio:1/1; object-fit:cover; }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); border:0; }
\`\`\`

\`\`\`filepath:assets/theme.js
(function(){
  function refresh(){fetch('/cart.js').then(function(r){return r.json();}).then(function(c){var b=document.querySelector('[data-cart-count]');if(b)b.textContent=c.item_count;});}
  document.addEventListener('submit',function(e){
    var f=e.target; if(!f.matches('#product-form'))return;
    e.preventDefault();
    fetch('/cart/add.js',{method:'POST',body:new FormData(f)}).then(refresh);
  });
})();
\`\`\`

\`\`\`filepath:locales/en.default.json
{ "general": { "cart": "Cart", "add_to_cart": "Add to cart" } }
\`\`\`
`;

// ── Webflow: 8-file export-style bundle ────────────────────────────────────

export const MOCK_WEBFLOW_BUNDLE = `\`\`\`filepath:site/index.html
<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Yappaflow Mock — Webflow</title>
  <link rel="stylesheet" href="assets/theme.css">
  <script src="assets/theme-toggle.js"></script>
</head>
<body>
  <header><h1>Yappaflow Mock</h1><button class="toggle" data-theme-toggle>◐</button></header>
  <main>
    <section class="hero"><h2>Curated goods, handpicked weekly</h2></section>
    <section class="products" data-products></section>
  </main>
  <script src="assets/theme.js"></script>
</body>
</html>
\`\`\`

\`\`\`filepath:site/assets/theme.css
:root { --bg:#fff; --fg:#111; --accent:#ff6b35; }
[data-theme="dark"] { --bg:#0a0a0a; --fg:#f4f4f4; }
body { margin:0; font-family:system-ui,sans-serif; background:var(--bg); color:var(--fg); }
.hero { padding:4rem 1rem; text-align:center; }
.products { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1rem; padding:1rem; }
\`\`\`

\`\`\`filepath:site/assets/theme.js
fetch('./products.json').then(function(r){return r.json();}).then(function(list){
  var el=document.querySelector('[data-products]'); if(!el)return;
  el.innerHTML=list.map(function(p){return '<a class="card" href="#"><strong>'+p.name+'</strong><span>'+p.price+'</span></a>';}).join('');
});
\`\`\`

\`\`\`filepath:site/assets/theme-toggle.js
(function(){
  var t=localStorage.getItem('yappaflow_theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  document.documentElement.dataset.theme=t;
  document.addEventListener('click',function(e){
    if(!e.target.matches('[data-theme-toggle]'))return;
    var d=document.documentElement, n=d.dataset.theme==='dark'?'light':'dark';
    d.dataset.theme=n; localStorage.setItem('yappaflow_theme',n);
  });
})();
\`\`\`

\`\`\`filepath:webflow/custom-code-head.html
<script>
  (function(){var t=localStorage.getItem('yappaflow_theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;})();
</script>
<style>
  :root{--bg:#fff;--fg:#111;--accent:#ff6b35;}
  [data-theme="dark"]{--bg:#0a0a0a;--fg:#f4f4f4;}
  body{background:var(--bg);color:var(--fg);}
</style>
\`\`\`

\`\`\`filepath:webflow/custom-code-body.html
<script>
  document.addEventListener('click',function(e){
    if(!e.target.matches('[data-theme-toggle]'))return;
    var d=document.documentElement,n=d.dataset.theme==='dark'?'light':'dark';
    d.dataset.theme=n;localStorage.setItem('yappaflow_theme',n);
  });
</script>
\`\`\`

\`\`\`filepath:webflow/collections.json
{
  "collections": [
    { "slug": "products", "fields": [
      { "name": "name",  "type": "PlainText", "required": true },
      { "name": "price", "type": "Number",    "required": true },
      { "name": "image", "type": "Image" }
    ]}
  ]
}
\`\`\`

\`\`\`filepath:README.md
# Yappaflow Webflow Bundle (mock)

Import \`webflow/custom-code-head.html\` into Project Settings → Custom Code →
Head Code, and \`webflow/custom-code-body.html\` into Footer Code. Create the
collections listed in \`collections.json\` under CMS, then paste the HTML from
\`site/index.html\` into a Page template. The generated \`products.json\`
ships alongside this bundle — upload it next to \`site/index.html\`.
\`\`\`
`;

// ── WordPress: 20-file classic PHP theme + HTML page bodies ────────────────

export const MOCK_WORDPRESS_BUNDLE = `\`\`\`filepath:style.css
/*
Theme Name: Yappaflow Mock
Theme URI: https://yappaflow.com
Author: Yappaflow
Description: Mock theme for development.
Version: 0.1.0
License: GPL-2.0-or-later
Text Domain: yappaflow-mock
*/
:root { --bg:#fff; --fg:#111; --accent:#ff6b35; }
[data-theme="dark"] { --bg:#0a0a0a; --fg:#f4f4f4; }
body { margin:0; font-family:system-ui,sans-serif; background:var(--bg); color:var(--fg); }
\`\`\`

\`\`\`filepath:functions.php
<?php
add_action('after_setup_theme', function () {
  add_theme_support('title-tag');
  add_theme_support('post-thumbnails');
  register_nav_menus(['primary' => __('Primary', 'yappaflow-mock')]);
});
require get_template_directory() . '/inc/enqueue.php';
require get_template_directory() . '/inc/customizer.php';
require get_template_directory() . '/inc/template-tags.php';
\`\`\`

\`\`\`filepath:index.php
<?php get_header(); ?>
<main><h1><?php bloginfo('name'); ?></h1></main>
<?php get_footer();
\`\`\`

\`\`\`filepath:header.php
<!doctype html>
<html <?php language_attributes(); ?> data-theme="light">
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <script>(function(){var t=localStorage.getItem('yappaflow_theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;})();</script>
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
  <header>
    <a href="<?php echo esc_url(home_url('/')); ?>"><?php bloginfo('name'); ?></a>
    <?php wp_nav_menu(['theme_location' => 'primary']); ?>
  </header>
\`\`\`

\`\`\`filepath:footer.php
<footer>© <?php echo date('Y'); ?> <?php bloginfo('name'); ?></footer>
<?php wp_footer(); ?>
</body>
</html>
\`\`\`

\`\`\`filepath:front-page.php
<?php get_header(); ?>
<section class="hero"><h1><?php bloginfo('name'); ?></h1></section>
<?php get_footer();
\`\`\`

\`\`\`filepath:page.php
<?php get_header(); the_post(); ?>
<article><h1><?php the_title(); ?></h1><?php the_content(); ?></article>
<?php get_footer();
\`\`\`

\`\`\`filepath:single.php
<?php get_header(); the_post(); ?>
<article><h1><?php the_title(); ?></h1><?php the_content(); ?></article>
<?php get_footer();
\`\`\`

\`\`\`filepath:sidebar.php
<aside><?php if (is_active_sidebar('primary')) dynamic_sidebar('primary'); ?></aside>
\`\`\`

\`\`\`filepath:404.php
<?php get_header(); ?>
<main><h1>Not found</h1></main>
<?php get_footer();
\`\`\`

\`\`\`filepath:searchform.php
<form role="search" method="get" action="<?php echo esc_url(home_url('/')); ?>">
  <input type="search" name="s" placeholder="<?php esc_attr_e('Search…', 'yappaflow-mock'); ?>">
  <button type="submit"><?php esc_html_e('Go', 'yappaflow-mock'); ?></button>
</form>
\`\`\`

\`\`\`filepath:comments.php
<?php if (post_password_required()) return; ?>
<section class="comments"><?php comments_template(); ?></section>
\`\`\`

\`\`\`filepath:inc/customizer.php
<?php
add_action('customize_register', function ($wp_customize) {
  $wp_customize->add_setting('accent_color', ['default' => '#ff6b35']);
});
\`\`\`

\`\`\`filepath:inc/template-tags.php
<?php
function yappaflow_posted_on() {
  printf('<time datetime="%1$s">%2$s</time>', esc_attr(get_the_date('c')), esc_html(get_the_date()));
}
\`\`\`

\`\`\`filepath:inc/enqueue.php
<?php
add_action('wp_enqueue_scripts', function () {
  wp_enqueue_style('yappaflow-mock', get_stylesheet_uri(), [], '0.1.0');
});
\`\`\`

\`\`\`filepath:templates/page-about.php
<?php /* Template Name: About */ get_header(); the_post(); ?>
<article><h1><?php the_title(); ?></h1><?php the_content(); ?></article>
<?php get_footer();
\`\`\`

\`\`\`filepath:templates/page-contact.php
<?php /* Template Name: Contact */ get_header(); the_post(); ?>
<article><h1><?php the_title(); ?></h1><?php the_content(); ?></article>
<?php get_footer();
\`\`\`

\`\`\`filepath:pages/index.html
<h1>Welcome</h1><p>This is the mock homepage body.</p>
\`\`\`

\`\`\`filepath:pages/about.html
<h1>About</h1><p>This is the mock about body.</p>
\`\`\`

\`\`\`filepath:pages/contact.html
<h1>Contact</h1><p>hello@example.com</p>
\`\`\`
`;

// ── iKAS: 17-file Handlebars-style theme ───────────────────────────────────

export const MOCK_IKAS_BUNDLE = `\`\`\`filepath:theme.json
{
  "name":    "Yappaflow Mock",
  "version": "0.1.0",
  "settings": [
    { "id": "accent", "type": "color", "label": "Accent", "default": "#ff6b35" }
  ]
}
\`\`\`

\`\`\`filepath:layout/theme.html
<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{{page.title}} — {{shop.name}}</title>
  <script>(function(){var t=localStorage.getItem('yappaflow_theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;})();</script>
  <link rel="stylesheet" href="/theme/assets/theme.css">
</head>
<body>
  {{> partials/header}}
  <main>{{{content}}}</main>
  {{> partials/footer}}
  <script src="/theme/assets/theme.js"></script>
</body>
</html>
\`\`\`

\`\`\`filepath:templates/home.html
{{> partials/hero}}
<section class="products">
  {{#each products}}{{> partials/product-card}}{{/each}}
</section>
\`\`\`

\`\`\`filepath:templates/product.html
<section class="product">
  <h1>{{product.name}}</h1>
  <img src="{{product.image}}" alt="{{product.name}}">
  <p>{{product.price}} {{product.currency}}</p>
  <form data-add-to-cart data-variant="{{product.defaultVariantId}}">
    <button type="submit">Add to cart</button>
  </form>
</section>
\`\`\`

\`\`\`filepath:templates/collection.html
<section class="collection">
  <h1>{{collection.name}}</h1>
  <div class="grid">{{#each collection.products}}{{> partials/product-card}}{{/each}}</div>
</section>
\`\`\`

\`\`\`filepath:templates/page.about.html
<section class="page"><h1>{{page.title}}</h1>{{{page.content}}}</section>
\`\`\`

\`\`\`filepath:templates/page.contact.html
<section class="page"><h1>{{page.title}}</h1>{{{page.content}}}</section>
\`\`\`

\`\`\`filepath:templates/cart.html
<section class="cart">
  <h1>{{t "cart.title"}}</h1>
  {{#each cart.items}}
    <div class="line">{{name}} × {{quantity}} — {{linePrice}}</div>
  {{/each}}
  <button data-checkout>{{t "cart.checkout"}}</button>
</section>
\`\`\`

\`\`\`filepath:partials/header.html
<header><a href="/">{{shop.name}}</a>{{> partials/theme-toggle}}<a href="/cart" data-cart-count>{{cart.itemCount}}</a></header>
\`\`\`

\`\`\`filepath:partials/footer.html
<footer>© {{year}} {{shop.name}}</footer>
\`\`\`

\`\`\`filepath:partials/hero.html
<section class="hero"><h1>{{shop.name}}</h1><p>{{shop.tagline}}</p></section>
\`\`\`

\`\`\`filepath:partials/product-card.html
<a class="card" href="/products/{{slug}}">
  <img src="{{image}}" alt="{{name}}">
  <strong>{{name}}</strong>
  <span>{{price}} {{currency}}</span>
</a>
\`\`\`

\`\`\`filepath:partials/theme-toggle.html
<button type="button" class="theme-toggle" data-theme-toggle>◐<span class="sr-only">Toggle theme</span></button>
\`\`\`

\`\`\`filepath:assets/theme.css
:root { --bg:#fff; --fg:#111; --accent:#ff6b35; }
[data-theme="dark"] { --bg:#0a0a0a; --fg:#f4f4f4; }
body { margin:0; font-family:system-ui,sans-serif; background:var(--bg); color:var(--fg); }
.hero { padding:4rem 1rem; text-align:center; }
.grid,.products { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1rem; padding:1rem; }
.sr-only { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); }
\`\`\`

\`\`\`filepath:assets/theme.js
document.addEventListener('click',function(e){
  if(e.target.matches('[data-theme-toggle]')){
    var d=document.documentElement,n=d.dataset.theme==='dark'?'light':'dark';
    d.dataset.theme=n; localStorage.setItem('yappaflow_theme',n);
  }
});
document.addEventListener('submit',function(e){
  var f=e.target; if(!f.matches('[data-add-to-cart]')) return;
  e.preventDefault();
  fetch('/api/cart/add',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({variantId:f.dataset.variant,quantity:1})});
});
\`\`\`

\`\`\`filepath:locales/en.json
{ "cart": { "title": "Cart", "checkout": "Checkout" } }
\`\`\`

\`\`\`filepath:locales/tr.json
{ "cart": { "title": "Sepet", "checkout": "Ödemeye geç" } }
\`\`\`
`;
