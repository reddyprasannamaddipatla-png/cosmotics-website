/**
 * AURELIA LUXURY COSMETICS - FRONTEND ARCHITECTURE & INTERACTION SCRIPT
 */

document.addEventListener('DOMContentLoaded', () => {
  // Render Backend API Base URL
  const API_BASE = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.hostname.includes('onrender.com'))
    ? ''
    : 'https://cosmotics-website.onrender.com';

  // Global State
  const state = {
    products: [],
    categories: [],
    featuredProducts: [],
    activeCategory: 'all',
    searchQuery: '',
    maxPrice: 100,
    currentProduct: null,
    cartCount: 0,
    wishlistCount: 0
  };

  // -------------------------------------------------------------
  // INITIALIZATION & EVENT LISTENERS
  // -------------------------------------------------------------
  function init() {
    setupNavigation();
    setupScrollEffects();
    setupEventListeners();
    fetchCategories();
    fetchFeaturedProducts();
    fetchProducts();
    handleInitialRoute();
  }

  // -------------------------------------------------------------
  // NAVIGATION & ROUTING
  // -------------------------------------------------------------
  function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileToggle = document.getElementById('mobileNavToggle');
    const navLinksContainer = document.getElementById('navLinks');

    if (mobileToggle && navLinksContainer) {
      mobileToggle.addEventListener('click', () => {
        navLinksContainer.classList.toggle('active');
        const icon = mobileToggle.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-bars');
          icon.classList.toggle('fa-xmark');
        }
      });
    }

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const view = link.getAttribute('data-view');
        if (view) {
          e.preventDefault();
          navigateTo(view);
          if (navLinksContainer) navLinksContainer.classList.remove('active');
        }
      });
    });

    window.addEventListener('popstate', () => {
      handleInitialRoute();
    });
  }

  function handleInitialRoute() {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    
    if (path.includes('/about')) {
      showView('about');
    } else if (path.includes('/products')) {
      showView('products');
    } else if (path.includes('/contact')) {
      showView('contact');
    } else if (path.includes('/product/')) {
      const prodId = path.split('/product/')[1];
      showView('product-detail');
      if (prodId) loadProductDetail(prodId);
    } else {
      showView('home');
    }
  }

  function navigateTo(viewName, param = null) {
    let url = '/';
    if (viewName === 'about') url = '/about';
    else if (viewName === 'products') url = '/products';
    else if (viewName === 'contact') url = '/contact';
    else if (viewName === 'product-detail' && param) url = `/product/${param}`;

    history.pushState(null, '', url);
    showView(viewName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showView(viewName) {
    const views = document.querySelectorAll('.page-view');
    views.forEach(v => v.style.display = 'none');

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.style.display = 'block';
    }

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      if (link.getAttribute('data-view') === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    if (viewName === 'products') {
      renderProductsGrid();
    }
  }

  // -------------------------------------------------------------
  // API DATA FETCHING
  // -------------------------------------------------------------
  async function fetchProducts() {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      const data = await res.json();
      if (data.status === 'success') {
        state.products = data.products;
        renderProductsGrid();
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  }

  async function fetchFeaturedProducts() {
    try {
      const res = await fetch(`${API_BASE}/api/featured-products`);
      const data = await res.json();
      if (data.status === 'success') {
        state.featuredProducts = data.products;
        renderFeaturedProductsGrid();
      }
    } catch (err) {
      console.error("Error fetching featured products:", err);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch(`${API_BASE}/api/categories`);
      const data = await res.json();
      if (data.status === 'success') {
        state.categories = data.categories;
        renderCategoryFilters();
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }

  // -------------------------------------------------------------
  // RENDERING ENGINE
  // -------------------------------------------------------------
  function renderFeaturedProductsGrid() {
    const container = document.getElementById('featuredProductsGrid');
    if (!container) return;

    if (!state.featuredProducts || state.featuredProducts.length === 0) {
      container.innerHTML = getSkeletonCardsHtml(4);
      return;
    }

    container.innerHTML = state.featuredProducts.map(product => getProductCardHtml(product)).join('');
    bindCardEvents(container);
  }

  function renderProductsGrid() {
    const container = document.getElementById('catalogProductsGrid');
    if (!container) return;

    let filtered = state.products.filter(p => {
      const catMatch = state.activeCategory === 'all' || p.category.toLowerCase() === state.activeCategory.toLowerCase();
      const searchMatch = !state.searchQuery || 
        p.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
        p.description.toLowerCase().includes(state.searchQuery.toLowerCase());
      const priceMatch = parseFloat(p.price) <= state.maxPrice;
      return catMatch && searchMatch && priceMatch;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-sparkles empty-icon"></i>
          <h3 class="empty-title">No Cosmetics Found</h3>
          <p class="empty-desc">We couldn't find any products matching your search filters. Try clearing your search or adjusting the price range.</p>
          <button class="btn btn-secondary" id="resetFiltersBtn">Reset Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById('resetFiltersBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          state.activeCategory = 'all';
          state.searchQuery = '';
          state.maxPrice = 100;
          document.getElementById('searchInput').value = '';
          document.getElementById('priceRangeSlider').value = 100;
          document.getElementById('priceDisplay').textContent = '$100';
          updateActiveFilterPills();
          renderProductsGrid();
        });
      }
      return;
    }

    container.innerHTML = filtered.map(product => getProductCardHtml(product)).join('');
    bindCardEvents(container);
  }

  function renderCategoryFilters() {
    const container = document.getElementById('categoryFilterPills');
    if (!container) return;

    let html = `<button class="filter-pill active" data-cat="all">All Products</button>`;
    state.categories.forEach(cat => {
      html += `<button class="filter-pill" data-cat="${cat}">${cat}</button>`;
    });

    container.innerHTML = html;

    container.querySelectorAll('.filter-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        const cat = pill.getAttribute('data-cat');
        state.activeCategory = cat;
        updateActiveFilterPills();
        renderProductsGrid();
      });
    });
  }

  function updateActiveFilterPills() {
    const pills = document.querySelectorAll('.filter-pill');
    pills.forEach(p => {
      if (p.getAttribute('data-cat').toLowerCase() === state.activeCategory.toLowerCase()) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  function getProductCardHtml(product) {
    const stars = generateStarRating(product.rating || 5);
    const origPrice = product.original_price ? `<span class="original-price">$${product.original_price.toFixed(2)}</span>` : '';

    return `
      <div class="product-card" data-id="${product.id}">
        <div class="product-image-box">
          <img src="${product.image}" alt="${product.name}" loading="lazy">
          <span class="product-tag">${product.category}</span>
          <div class="quick-actions">
            <button class="btn btn-secondary quick-view-btn" data-id="${product.id}" title="Quick View">
              <i class="fa-regular fa-eye"></i> Quick View
            </button>
            <button class="btn btn-whatsapp whatsapp-order-btn" data-id="${product.id}" title="Order on WhatsApp">
              <i class="fa-brands fa-whatsapp"></i>
            </button>
          </div>
        </div>
        <div class="product-info">
          <div class="product-category">${product.category}</div>
          <h3 class="product-title">${product.name}</h3>
          <div class="product-rating">
            ${stars}
            <span class="rating-count">(${product.review_count || 45})</span>
          </div>
          <div class="product-price-row">
            <div>
              <span class="product-price">$${parseFloat(product.price).toFixed(2)}</span>
              ${origPrice}
            </div>
            <button class="btn-icon add-wishlist-btn" title="Add to Wishlist">
              <i class="fa-regular fa-heart"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function getSkeletonCardsHtml(count = 4) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `<div class="skeleton-card"></div>`;
    }
    return html;
  }

  function generateStarRating(rating) {
    let html = '';
    const full = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;

    for (let i = 0; i < full; i++) {
      html += `<i class="fa-solid fa-star"></i>`;
    }
    if (hasHalf) {
      html += `<i class="fa-solid fa-star-half-stroke"></i>`;
    }
    const empty = 5 - Math.ceil(rating);
    for (let i = 0; i < empty; i++) {
      html += `<i class="fa-regular fa-star"></i>`;
    }
    return html;
  }

  function bindCardEvents(container) {
    container.querySelectorAll('.quick-view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openQuickViewModal(id);
      });
    });

    container.querySelectorAll('.whatsapp-order-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        triggerWhatsAppOrder(id);
      });
    });

    container.querySelectorAll('.add-wishlist-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.wishlistCount++;
        document.getElementById('wishlistCount').textContent = state.wishlistCount;
        showToast('Added to your Wishlist!');
      });
    });

    container.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        navigateTo('product-detail', id);
        loadProductDetail(id);
      });
    });
  }

  // -------------------------------------------------------------
  // PRODUCT DETAIL VIEW & QUICK VIEW MODAL
  // -------------------------------------------------------------
  async function loadProductDetail(productId) {
    try {
      const res = await fetch(`${API_BASE}/api/product/${productId}`);
      const data = await res.json();

      if (data.status === 'success') {
        state.currentProduct = data.product;
        renderProductDetailPage(data.product);
      }
    } catch (err) {
      console.error("Error loading product details:", err);
    }
  }

  function renderProductDetailPage(product) {
    const detailContainer = document.getElementById('productDetailContent');
    if (!detailContainer) return;

    const stars = generateStarRating(product.rating || 5);
    const origPrice = product.original_price ? `<span class="original-price" style="font-size: 1.2rem; text-decoration: line-through; color: #999;">$${product.original_price.toFixed(2)}</span>` : '';
    
    const benefitsList = Array.isArray(product.benefits) 
      ? product.benefits.map(b => `<li><i class="fa-solid fa-circle-check"></i> ${b}</li>`).join('')
      : `<li><i class="fa-solid fa-circle-check"></i> 100% Organic & Dermatologically Tested</li>`;

    detailContainer.innerHTML = `
      <div class="product-detail-grid">
        <div class="gallery-container">
          <img src="${product.image}" alt="${product.name}" class="main-gallery-img" id="mainDetailImg">
          <div class="thumbnail-list">
            <img src="${product.image}" class="thumb-img active" onclick="document.getElementById('mainDetailImg').src = this.src">
            <img src="/static/images/hero.png" class="thumb-img" onclick="document.getElementById('mainDetailImg').src = this.src">
            <img src="/static/images/cat_skincare.png" class="thumb-img" onclick="document.getElementById('mainDetailImg').src = this.src">
          </div>
        </div>
        <div class="detail-info">
          <span class="section-subtitle">${product.category}</span>
          <h1 style="font-size: 2.2rem;">${product.name}</h1>
          <div class="product-rating" style="font-size: 1rem;">
            ${stars}
            <span class="rating-count">(${product.review_count || 120} Customer Reviews)</span>
          </div>
          <div class="detail-price-box">
            <span class="detail-price">$${parseFloat(product.price).toFixed(2)}</span>
            ${origPrice}
          </div>
          <p style="color: var(--text-muted); font-size: 1.05rem;">${product.description}</p>
          
          <div class="quantity-row">
            <span style="font-weight: 600;">Quantity:</span>
            <div class="quantity-control">
              <button class="qty-btn" id="qtyMinus">-</button>
              <input type="number" id="detailQtyInput" value="1" min="1" class="qty-input" readonly>
              <button class="qty-btn" id="qtyPlus">+</button>
            </div>
          </div>

          <div style="display: flex; gap: 16px; margin-top: 10px;">
            <button class="btn btn-whatsapp" id="detailWhatsAppBtn" style="flex: 1; padding: 16px;">
              <i class="fa-brands fa-whatsapp" style="font-size: 1.3rem;"></i> Direct WhatsApp Order
            </button>
            <button class="btn btn-secondary" id="detailAddCartBtn">
              <i class="fa-solid fa-bag-shopping"></i> Add to Bag
            </button>
          </div>

          <div class="detail-tabs">
            <div class="tab-headers">
              <button class="tab-btn active" data-tab="benefits">Key Benefits</button>
              <button class="tab-btn" data-tab="ingredients">Ingredients</button>
              <button class="tab-btn" data-tab="howtouse">How To Use</button>
            </div>
            <div class="tab-content active" id="tab-benefits">
              <ul class="benefits-list">${benefitsList}</ul>
            </div>
            <div class="tab-content" id="tab-ingredients">
              <p>${product.ingredients || "Pure botanical extracts, essential oils, and dermatologically tested active compounds."}</p>
            </div>
            <div class="tab-content" id="tab-howtouse">
              <p>${product.how_to_use || "Apply evenly onto clean skin daily for optimal radiant beauty."}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Quantity controls
    const qtyInput = document.getElementById('detailQtyInput');
    document.getElementById('qtyMinus').addEventListener('click', () => {
      let val = parseInt(qtyInput.value) || 1;
      if (val > 1) qtyInput.value = val - 1;
    });
    document.getElementById('qtyPlus').addEventListener('click', () => {
      let val = parseInt(qtyInput.value) || 1;
      qtyInput.value = val + 1;
    });

    // WhatsApp CTA
    document.getElementById('detailWhatsAppBtn').addEventListener('click', () => {
      const qty = parseInt(qtyInput.value) || 1;
      triggerWhatsAppOrder(product.id, qty);
    });

    // Cart CTA
    document.getElementById('detailAddCartBtn').addEventListener('click', () => {
      state.cartCount += parseInt(qtyInput.value) || 1;
      document.getElementById('cartCount').textContent = state.cartCount;
      showToast('Added to your Shopping Bag!');
    });

    // Tab switching
    const tabBtns = detailContainer.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        detailContainer.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(`tab-${tabId}`).classList.add('active');
      });
    });
  }

  function openQuickViewModal(productId) {
    const product = state.products.find(p => p.id === productId) || state.featuredProducts.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('quickViewModal');
    const modalContent = document.getElementById('modalProductContent');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="product-detail-grid">
        <div>
          <img src="${product.image}" alt="${product.name}" style="width: 100%; height: 360px; object-fit: cover; border-radius: var(--radius-card);">
        </div>
        <div class="detail-info">
          <span class="product-category">${product.category}</span>
          <h2 style="font-size: 1.8rem; font-family: var(--font-heading);">${product.name}</h2>
          <div class="detail-price" style="font-size: 1.6rem; color: var(--accent); font-weight: 800;">$${parseFloat(product.price).toFixed(2)}</div>
          <p style="color: var(--text-muted); font-size: 0.95rem;">${product.description}</p>
          <div style="display: flex; gap: 12px; margin-top: 15px;">
            <button class="btn btn-whatsapp modal-wa-btn" style="flex: 1;">
              <i class="fa-brands fa-whatsapp"></i> Order on WhatsApp
            </button>
            <button class="btn btn-secondary modal-detail-btn">
              Full Details
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');

    modalContent.querySelector('.modal-wa-btn').addEventListener('click', () => {
      triggerWhatsAppOrder(product.id);
      modal.classList.remove('active');
    });

    modalContent.querySelector('.modal-detail-btn').addEventListener('click', () => {
      modal.classList.remove('active');
      navigateTo('product-detail', product.id);
      loadProductDetail(product.id);
    });
  }

  function triggerWhatsAppOrder(productId, quantity = 1) {
    const product = state.products.find(p => p.id === productId) || state.featuredProducts.find(p => p.id === productId) || state.currentProduct;
    const phoneNumber = "1234567890"; // Customizable WhatsApp Business Number
    
    let text = `Hello Aurelia Luxury Cosmetics! I would like to inquire about/order:\n\n`;
    if (product) {
      const total = (parseFloat(product.price) * quantity).toFixed(2);
      text += `*Product:* ${product.name}\n*ID:* ${product.id}\n*Category:* ${product.category}\n*Quantity:* ${quantity}\n*Price:* $${total}\n\nPlease confirm availability and payment details. Thank you!`;
    } else {
      text += `I have a general order inquiry regarding your premium cosmetics collection.`;
    }

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${phoneNumber}?text=${encoded}`, '_blank');
  }

  // -------------------------------------------------------------
  // EVENT LISTENERS & FORMS
  // -------------------------------------------------------------
  function setupEventListeners() {
    // Category Cards click on Home Page
    const catCards = document.querySelectorAll('.category-card');
    catCards.forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.getAttribute('data-category');
        state.activeCategory = cat || 'all';
        navigateTo('products');
        updateActiveFilterPills();
        renderProductsGrid();
      });
    });

    // Search Input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        renderProductsGrid();
      });
    }

    // Price Range Slider
    const priceSlider = document.getElementById('priceRangeSlider');
    const priceDisplay = document.getElementById('priceDisplay');
    if (priceSlider && priceDisplay) {
      priceSlider.addEventListener('input', (e) => {
        state.maxPrice = parseFloat(e.target.value);
        priceDisplay.textContent = `$${state.maxPrice}`;
        renderProductsGrid();
      });
    }

    // Quick View Modal Close
    const modal = document.getElementById('quickViewModal');
    const modalClose = document.getElementById('modalClose');
    if (modal && modalClose) {
      modalClose.addEventListener('click', () => modal.classList.remove('active'));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }

    // Contact Form AJAX Submit
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending...`;
        submitBtn.disabled = true;

        const formData = {
          name: document.getElementById('contactName').value.trim(),
          email: document.getElementById('contactEmail').value.trim(),
          phone: document.getElementById('contactPhone').value.trim(),
          message: document.getElementById('contactMessage').value.trim()
        };

        try {
          const res = await fetch(`${API_BASE}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          const data = await res.json();

          if (data.status === 'success') {
            showToast("Message sent successfully! Our team will contact you shortly.");
            contactForm.reset();
          } else {
            showToast(data.message || "Failed to send message.", true);
          }
        } catch (err) {
          showToast("Network error. Please try again.", true);
        } finally {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
        }
      });
    }

    // Newsletter Form AJAX Submit
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('newsletterEmail');
        const email = emailInput.value.trim();
        
        if (!email) return;

        try {
          const res = await fetch(`${API_BASE}/api/newsletter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await res.json();
          if (data.status === 'success') {
            showToast("Subscribed! Check your inbox for 15% off.");
            newsletterForm.reset();
          } else {
            showToast(data.message, true);
          }
        } catch (err) {
          showToast("Failed to subscribe.", true);
        }
      });
    }
  }

  // -------------------------------------------------------------
  // SCROLL EFFECTS & TOASTS
  // -------------------------------------------------------------
  function setupScrollEffects() {
    const scrollBar = document.getElementById('scrollProgress');
    const header = document.getElementById('header');
    const backToTop = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;

      if (scrollBar) scrollBar.style.width = scrolled + "%";

      if (header) {
        if (winScroll > 40) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
      }

      if (backToTop) {
        if (winScroll > 300) backToTop.classList.add('active');
        else backToTop.classList.remove('active');
      }
    });

    if (backToTop) {
      backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  function showToast(message, isError = false) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (isError) toast.style.borderLeftColor = '#E91E63';
    else toast.style.borderLeftColor = '#4CAF50';

    toast.innerHTML = `
      <i class="${isError ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check'}" style="color: ${isError ? '#E91E63' : '#4CAF50'}; font-size: 1.2rem;"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Initialize Application
  init();
});
