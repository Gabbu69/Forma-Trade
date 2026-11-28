<section class="hero"><div class="hero-content"><span class="hero-eyebrow">B2B wholesale marketplace</span><h1>Workspace<br>essentials.</h1><p>Wholesale desk accessories, peripherals, and lighting from independent suppliers.</p><div class="hero-actions"><a class="hero-button" href="#catalog">Browse products <i data-lucide="chevrons-down" aria-hidden="true"></i></a><span class="hero-meta"><i data-lucide="package-check" aria-hidden="true"></i>Pack pricing · Live supplier stock</span></div></div></section>
<section id="catalog"><div class="section-top"><div><h2>Product catalog</h2><p id="resultCount" aria-live="polite">Loading products…</p></div>
<div class="toolbar"><label class="search"><i data-lucide="search" aria-hidden="true"></i><input id="search" type="search" maxlength="100" placeholder="Search products or suppliers" aria-label="Search products or suppliers"></label>
<div class="dropdown catalog-sort">
  <button type="button" class="sort" id="sort" data-bs-toggle="dropdown" aria-expanded="false" aria-controls="sortOptions" aria-labelledby="sortTitle sortValue">
    <span id="sortTitle" class="visually-hidden">Sort products</span>
    <i data-lucide="arrow-up-down" aria-hidden="true"></i>
    <span id="sortValue">Featured</span>
    <i class="sort-chevron" data-lucide="chevron-down" aria-hidden="true"></i>
  </button>
  <ul class="dropdown-menu dropdown-menu-end sort-menu" id="sortOptions" aria-labelledby="sortTitle">
    <?php foreach ([''=>'Featured','price'=>'Price: low to high','high'=>'Price: high to low','name'=>'Name: A to Z'] as $value=>$label): ?>
      <li><button type="button" class="dropdown-item" data-sort-value="<?=h($value)?>" aria-pressed="<?=$value===''?'true':'false'?>">
        <span><?=h($label)?></span><i data-lucide="check" aria-hidden="true"></i>
      </button></li>
    <?php endforeach; ?>
  </ul>
</div>
<button type="button" class="secondary mobile-filter" data-bs-toggle="offcanvas" data-bs-target="#filters"><i data-lucide="sliders-horizontal" aria-hidden="true"></i><span>Filters</span><span id="activeFilterCount" class="filter-count-pill" hidden aria-hidden="true"></span></button></div></div>
<div class="row g-0 align-items-start"><aside id="filters" class="col-lg-3 col-xl-2 pe-lg-3 offcanvas-lg offcanvas-start" tabindex="-1" aria-labelledby="filtersTitle"><div class="filter-inner">
<div class="filters-title"><h3 id="filtersTitle"><i data-lucide="sliders-horizontal" aria-hidden="true"></i> Filters</h3><button type="button" id="reset" class="text-action">Reset</button><button type="button" class="btn-close d-lg-none" data-bs-dismiss="offcanvas" data-bs-target="#filters" aria-label="Close filters"></button></div>
<form id="filterForm"><fieldset><legend>Category</legend>
<?php foreach(array_merge([['id'=>'','name'=>'All products']],$categories) as $c):?><label class="category"><input type="radio" name="category" value="<?=h($c['id'])?>" <?=$c['id']===''?'checked':''?>><i data-lucide="<?=h([''=>'layout-grid',1=>'layers',2=>'keyboard',3=>'lamp-desk'][$c['id']]??'box')?>" aria-hidden="true"></i><span><?=h($c['name'])?></span></label><?php endforeach;?></fieldset>
<fieldset class="field-group"><legend>Pack price <small>(₱)</small></legend><div class="range"><input class="form-control" name="min" type="number" min="0" step=".01" placeholder="Min" aria-label="Minimum pack price"><span>–</span><input class="form-control" name="max" type="number" min="0" step=".01" placeholder="Max" aria-label="Maximum pack price"></div><div id="priceRangeError" class="invalid-feedback"></div></fieldset>
<fieldset><legend>Supplier</legend><select class="form-select" name="vendor" aria-label="Supplier"><option value="">All suppliers</option><?php foreach($vendors as $v):?><option value="<?=h($v['id'])?>"><?=h($v['name'])?></option><?php endforeach;?></select></fieldset>
<fieldset><legend>Rating</legend><select class="form-select" name="rating" aria-label="Minimum rating"><option value="">Any rating</option><option value="4">4 stars and up</option><option value="4.5">4.5 stars and up</option><option value="5">5 stars</option></select></fieldset>
<label class="stock-filter"><input class="form-check-input" name="stock" type="checkbox" value="1"> In stock only</label></form>
<button type="button" class="primary d-lg-none w-100 mt-3" data-bs-dismiss="offcanvas" data-bs-target="#filters">Show products</button></div></aside>
<div class="col-12 col-lg-9 col-xl-10 catalog-results">
  <div id="activeFilters" class="active-filters" hidden aria-label="Active filters"></div>
  <div id="products" class="product-grid" aria-label="Products">
    <?php for ($i = 0; $i < 6; $i++): ?>
      <article class="product-card product-skeleton" aria-hidden="true">
        <div class="skeleton-block skeleton-photo"></div>
        <div class="product-info">
          <div class="skeleton-block skeleton-line w-50"></div>
          <div class="skeleton-block skeleton-line w-75 mt-2"></div>
          <div class="skeleton-block skeleton-line w-40 mt-2"></div>
          <div class="skeleton-block skeleton-line w-100 mt-3"></div>
        </div>
      </article>
    <?php endfor; ?>
  </div>
</div></div></section>
<div class="modal fade" id="packPreview" tabindex="-1" aria-labelledby="previewName">
  <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"><div class="modal-content">
    <div class="modal-header"><span class="supplier">Pack details</span><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close pack preview"></button></div>
    <div class="modal-body preview-layout">
      <div class="preview-gallery">
        <div class="preview-image">
          <img id="previewPhoto" alt="">
          <span class="preview-photo-counter" id="previewPhotoCounter" hidden aria-hidden="true"></span>
          <button class="gallery-arrow gallery-prev" id="previewPrevPhoto" type="button" aria-label="Previous photo" hidden><i data-lucide="chevron-left" aria-hidden="true"></i></button>
          <button class="gallery-arrow gallery-next" id="previewNextPhoto" type="button" aria-label="Next photo" hidden><i data-lucide="chevron-right" aria-hidden="true"></i></button>
        </div>
        <div id="previewThumbs" role="group" aria-label="Product photos"></div>
        <span id="previewPhotoStatus" class="visually-hidden" aria-live="polite"></span>
      </div>
      <div class="preview-info">
        <div class="preview-meta-row">
          <p class="supplier mb-0" id="previewSupplier"></p>
          <span class="badge-pill" id="previewCategory"></span>
          <span class="stars" id="previewRating"></span>
        </div>
        <h2 id="previewName"></h2>
        <p class="preview-cart-note" id="previewCartNote" hidden></p>
        <dl class="pack-facts"><div><dt>Pack price</dt><dd id="previewPrice"></dd></div><div><dt>Units per pack</dt><dd id="previewSize"></dd></div><div><dt id="unitCostLabel">Unit cost</dt><dd id="previewUnit"></dd></div><div><dt>Available stock</dt><dd id="previewStock"></dd></div></dl>
        <form id="previewForm"><div class="preview-qty-row"><label for="previewQty">Packs to add</label><div class="quantity pack-step"><button type="button" id="previewLess" aria-label="One fewer pack">−</button><input id="previewQty" type="number" min="1" step="1" required><button type="button" id="previewMore" aria-label="One more pack">+</button></div></div>
        <div id="previewQuickQty" class="quick-pack-presets" aria-label="Quick pack quantities"></div>
        <div class="pack-totals" aria-live="polite"><span id="previewUnits"></span><strong id="previewTotal"></strong></div>
        <p class="form-error" role="alert"></p><button id="previewAdd" class="primary w-100" type="submit">Add to cart</button></form>
      </div>
    </div>
  </div></div>
</div>
