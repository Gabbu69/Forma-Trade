<section class="hero"><div class="hero-content"><h1>Workspace<br>essentials.</h1><p>Wholesale desk accessories, peripherals, and lighting from independent suppliers.</p><a class="hero-button" href="#catalog">Browse products <i data-lucide="chevrons-down"></i></a></div></section>
<section id="catalog"><div class="section-top"><div><h2>Product catalog</h2><p id="resultCount" aria-live="polite">Loading products…</p></div>
<div class="toolbar"><label class="search"><i data-lucide="search"></i><input id="search" type="search" maxlength="100" placeholder="Search products or suppliers" aria-label="Search products or suppliers"></label>
<label class="sort"><i data-lucide="arrow-up-down"></i><select id="sort" aria-label="Sort products"><option value="">Featured</option><option value="price">Price: low to high</option><option value="high">Price: high to low</option><option value="name">Name: A to Z</option></select></label>
<button class="secondary mobile-filter" data-bs-toggle="offcanvas" data-bs-target="#filters"><i data-lucide="sliders-horizontal"></i> Filters</button></div></div>
<div class="catalog-layout"><aside id="filters" class="offcanvas-lg offcanvas-start" tabindex="-1" aria-labelledby="filtersTitle"><div class="filter-inner">
<div class="filters-title"><h3 id="filtersTitle"><i data-lucide="sliders-horizontal"></i> Filters</h3><button id="reset" class="text-action">Reset</button><button class="btn-close d-lg-none" data-bs-dismiss="offcanvas" data-bs-target="#filters" aria-label="Close filters"></button></div>
<form id="filterForm"><fieldset><legend>Category</legend>
<?php foreach(array_merge([['id'=>'','name'=>'All products']],$categories) as $c):?><label class="category"><input type="radio" name="category" value="<?=h($c['id'])?>" <?=$c['id']===''?'checked':''?>><i data-lucide="<?=h([''=>'layout-grid',1=>'layers',2=>'keyboard',3=>'lamp-desk'][$c['id']]??'box')?>"></i><span><?=h($c['name'])?></span></label><?php endforeach;?></fieldset>
<fieldset><legend>Pack price <small>(₱)</small></legend><div class="range"><input name="min" type="number" min="0" step=".01" placeholder="Min" aria-label="Minimum pack price"><span>–</span><input name="max" type="number" min="0" step=".01" placeholder="Max" aria-label="Maximum pack price"></div></fieldset>
<fieldset><legend>Supplier</legend><select name="vendor" aria-label="Supplier"><option value="">All suppliers</option><?php foreach($vendors as $v):?><option value="<?=h($v['id'])?>"><?=h($v['name'])?></option><?php endforeach;?></select></fieldset>
<fieldset><legend>Rating</legend><select name="rating" aria-label="Minimum rating"><option value="">Any rating</option><option value="4">4 stars and up</option><option value="4.5">4.5 stars and up</option><option value="5">5 stars</option></select></fieldset>
<label class="stock-filter"><input name="stock" type="checkbox" value="1"> In stock only</label></form>
<button class="primary d-lg-none w-100 mt-3" data-bs-dismiss="offcanvas" data-bs-target="#filters">Show products</button></div></aside>
<div id="products" class="product-grid" aria-label="Products"></div></div></section>
<div class="modal fade" id="packPreview" tabindex="-1" aria-labelledby="previewName">
  <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"><div class="modal-content">
    <div class="modal-header"><span class="supplier">Pack details</span><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close pack preview"></button></div>
    <div class="modal-body preview-layout">
      <img id="previewPhoto" alt="">
      <div class="preview-info">
        <p class="supplier" id="previewSupplier"></p><h2 id="previewName"></h2>
        <dl class="pack-facts"><div><dt>Pack price</dt><dd id="previewPrice"></dd></div><div><dt>Units per pack</dt><dd id="previewSize"></dd></div><div><dt id="unitCostLabel">Unit cost</dt><dd id="previewUnit"></dd></div><div><dt>Available stock</dt><dd id="previewStock"></dd></div></dl>
        <form id="previewForm"><label for="previewQty">Packs to add</label><div class="quantity pack-step"><button type="button" id="previewLess" aria-label="One fewer pack">−</button><input id="previewQty" type="number" min="1" step="1" required><button type="button" id="previewMore" aria-label="One more pack">+</button></div>
        <div class="pack-totals" aria-live="polite"><span id="previewUnits"></span><strong id="previewTotal"></strong></div>
        <p class="form-error" role="alert"></p><button id="previewAdd" class="primary w-100" type="submit">Add to cart</button></form>
      </div>
    </div>
  </div></div>
</div>
