import { Router, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { adminAuth } from "../middlewares/adminAuth";

const adminRouter = Router();

// Protect all /admin endpoints with Basic Authentication
adminRouter.use(adminAuth);

/**
 * GET /admin/api/stats
 * Overview counts and database health metrics
 */
adminRouter.get("/api/stats", async (_req: Request, res: Response) => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - start;

    const [
      totalProducts,
      totalUsers,
      totalShoppingLists,
      totalPantryItems,
      totalShoppingTrips,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.userProfile.count(),
      prisma.shoppingList.count(),
      prisma.pantryItem.count(),
      prisma.shoppingTrip.count(),
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        totalUsers,
        totalShoppingLists,
        totalPantryItems,
        totalShoppingTrips,
        dbStatus: "Healthy",
        dbLatencyMs,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /admin/api/products
 * Searchable, paginated products list
 */
adminRouter.get("/api/products", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || "20"), 10)));
    const search = String(req.query.search || "").trim();

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brands: { contains: search, mode: "insensitive" } },
        { code: { contains: search } },
        { category: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
    ]);

    res.json({
      success: true,
      data: products,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /admin/api/users
 * Paginated user profiles
 */
adminRouter.get("/api/users", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || "20"), 10)));

    const [total, users] = await Promise.all([
      prisma.userProfile.count(),
      prisma.userProfile.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              shoppingLists: true,
              pantryItems: true,
              shoppingTrips: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: users,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /admin/api/lists
 * Paginated shopping lists
 */
adminRouter.get("/api/lists", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || "20"), 10)));

    const [total, lists] = await Promise.all([
      prisma.shoppingList.count(),
      prisma.shoppingList.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
        include: {
          user: {
            select: { displayName: true, clerkUserId: true },
          },
          _count: {
            select: { items: true },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: lists,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /admin/api/pantry
 * Paginated pantry items
 */
adminRouter.get("/api/pantry", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || "20"), 10)));

    const [total, items] = await Promise.all([
      prisma.pantryItem.count(),
      prisma.pantryItem.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            select: { name: true, brands: true, imageUrl: true, unit: true },
          },
          user: {
            select: { displayName: true, clerkUserId: true },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /admin
 * Serves the modern, interactive Admin Web Dashboard
 */
adminRouter.get("/", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartGrocer — Production Database Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0B0F19;
      --card-bg: #111827;
      --card-border: #1F2937;
      --card-hover: #162032;
      --primary: #10B981;
      --primary-dark: #059669;
      --primary-light: #D1FAE5;
      --text-main: #F9FAFB;
      --text-muted: #9CA3AF;
      --danger: #EF4444;
      --warning: #F59E0B;
      --info: #3B82F6;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Top Navigation */
    header {
      background: rgba(17, 24, 39, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--card-border);
      position: sticky;
      top: 0;
      z-index: 50;
      padding: 0.9rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: white;
    }
    .brand-icon {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, var(--primary), #047857);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }
    .brand h1 { font-size: 1.15rem; font-weight: 800; letter-spacing: -0.02em; }
    .badge-prod {
      background: rgba(16, 185, 129, 0.12);
      color: var(--primary);
      border: 1px solid rgba(16, 185, 129, 0.3);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .badge-pulse {
      width: 6px;
      height: 6px;
      background: var(--primary);
      border-radius: 50%;
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(1.3); }
    }

    .header-actions { display: flex; align-items: center; gap: 12px; }
    .btn-refresh {
      background: #1F2937;
      color: #E5E7EB;
      border: 1px solid #374151;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn-refresh:hover { background: #374151; color: white; border-color: #4B5563; }

    /* Main Container */
    main {
      flex: 1;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.8rem;
    }

    /* Metric Cards Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, border-color 0.2s;
    }
    .metric-card:hover { transform: translateY(-2px); border-color: rgba(16, 185, 129, 0.4); }
    .metric-title {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .metric-value {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }
    .metric-sub {
      font-size: 0.75rem;
      color: var(--primary);
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
    }

    /* Tabs Bar */
    .tabs-bar {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 0.5rem;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s;
    }
    .tab-btn:hover { color: white; background: rgba(255, 255, 255, 0.04); }
    .tab-btn.active {
      color: var(--primary);
      background: rgba(16, 185, 129, 0.1);
      font-weight: 700;
    }

    /* Table Container */
    .table-container {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 480px;
    }
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .search-box {
      background: #0B0F19;
      border: 1px solid #1F2937;
      border-radius: 8px;
      padding: 8px 14px;
      color: white;
      font-family: inherit;
      font-size: 0.875rem;
      min-width: 280px;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-box:focus { border-color: var(--primary); }

    /* Data Table */
    .data-table-wrapper {
      overflow-x: auto;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }
    thead th {
      background: #0D131F;
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 12px 16px;
      border-bottom: 1px solid var(--card-border);
      white-space: nowrap;
    }
    tbody tr {
      border-bottom: 1px solid rgba(31, 41, 55, 0.6);
      transition: background 0.15s;
    }
    tbody tr:hover { background: rgba(255, 255, 255, 0.02); }
    tbody td {
      padding: 12px 16px;
      color: #E5E7EB;
      vertical-align: middle;
    }

    /* Product Specific UI */
    .prod-thumb {
      width: 44px;
      height: 44px;
      object-fit: cover;
      border-radius: 8px;
      background: #1F2937;
      border: 1px solid #374151;
    }
    .barcode-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      background: rgba(255, 255, 255, 0.06);
      padding: 3px 6px;
      border-radius: 4px;
      color: #93C5FD;
    }
    .price-pill {
      font-weight: 700;
      color: #34D399;
      font-size: 0.95rem;
    }
    .tag-pill {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      color: #D1D5DB;
    }
    .badge-status {
      display: inline-block;
      font-size: 0.725rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 20px;
      text-transform: uppercase;
    }
    .badge-active { background: rgba(16, 185, 129, 0.15); color: #34D399; }
    .badge-completed { background: rgba(59, 130, 246, 0.15); color: #60A5FA; }
    .badge-draft { background: rgba(156, 163, 175, 0.15); color: #9CA3AF; }

    /* Pagination */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.5rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .pag-btn-group { display: flex; gap: 6px; }
    .pag-btn {
      background: #1F2937;
      color: #D1D5DB;
      border: 1px solid #374151;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .pag-btn:hover:not(:disabled) { background: var(--primary); color: white; border-color: var(--primary); }
    .pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Footer */
    footer {
      border-top: 1px solid var(--card-border);
      padding: 1.25rem 2rem;
      text-align: center;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: auto;
    }
  </style>
</head>
<body>

  <!-- Top Header -->
  <header>
    <a href="/admin" class="brand">
      <div class="brand-icon">🛒</div>
      <div>
        <h1>SmartGrocer</h1>
        <div style="font-size: 0.7rem; color: #9CA3AF;">Database & Admin Console</div>
      </div>
    </a>
    <div class="header-actions">
      <div class="badge-prod">
        <span class="badge-pulse"></span>
        <span>Live Production DB</span>
      </div>
      <button class="btn-refresh" onclick="loadAllData()">
        <span>↻</span>
        <span>Refresh</span>
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <main>

    <!-- Metrics Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-title">
          <span>Products</span>
          <span>📦</span>
        </div>
        <div class="metric-value" id="stat-products">...</div>
        <div class="metric-sub">Verified UK Catalogue</div>
      </div>

      <div class="metric-card">
        <div class="metric-title">
          <span>Users</span>
          <span>👤</span>
        </div>
        <div class="metric-value" id="stat-users">...</div>
        <div class="metric-sub">Registered Clerk Profiles</div>
      </div>

      <div class="metric-card">
        <div class="metric-title">
          <span>Shopping Lists</span>
          <span>📋</span>
        </div>
        <div class="metric-value" id="stat-lists">...</div>
        <div class="metric-sub">Active & Completed</div>
      </div>

      <div class="metric-card">
        <div class="metric-title">
          <span>Pantry Items</span>
          <span>🥫</span>
        </div>
        <div class="metric-value" id="stat-pantry">...</div>
        <div class="metric-sub">Tracked Inventory</div>
      </div>

      <div class="metric-card">
        <div class="metric-title">
          <span>PostgreSQL 16</span>
          <span>⚡</span>
        </div>
        <div class="metric-value" id="stat-latency" style="font-size: 1.4rem; color: #34D399;">...</div>
        <div class="metric-sub" id="stat-status">Status: Healthy</div>
      </div>
    </div>

    <!-- Table Explorer -->
    <div class="table-container">
      <div class="table-header">
        <div class="tabs-bar">
          <button class="tab-btn active" id="tab-products-btn" onclick="switchTab('products')">
            <span>📦</span>
            <span>Products</span>
          </button>
          <button class="tab-btn" id="tab-users-btn" onclick="switchTab('users')">
            <span>👤</span>
            <span>Users</span>
          </button>
          <button class="tab-btn" id="tab-lists-btn" onclick="switchTab('lists')">
            <span>📋</span>
            <span>Shopping Lists</span>
          </button>
          <button class="tab-btn" id="tab-pantry-btn" onclick="switchTab('pantry')">
            <span>🥫</span>
            <span>Pantry Items</span>
          </button>
        </div>

        <div id="search-container">
          <input type="text" id="product-search-input" class="search-box" placeholder="🔍 Search by name, brand, barcode..." oninput="handleSearch(this.value)">
        </div>
      </div>

      <!-- Dynamic Content Table -->
      <div class="data-table-wrapper">
        <table id="main-table">
          <thead id="table-head"></thead>
          <tbody id="table-body">
            <tr><td colspan="7" style="text-align: center; padding: 3rem; color: #9CA3AF;">Loading database records...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination-bar">
        <div id="pag-info">Showing records...</div>
        <div class="pag-btn-group">
          <button class="pag-btn" id="btn-prev" onclick="changePage(-1)">← Prev</button>
          <button class="pag-btn" id="btn-next" onclick="changePage(1)">Next →</button>
        </div>
      </div>
    </div>

  </main>

  <footer>
    SmartGrocer Admin Console &copy; 2026 &bull; United Kingdom FMCG System &bull; PostgreSQL 16 Alpine
  </footer>

  <script>
    let currentTab = 'products';
    let currentPage = 1;
    let totalPages = 1;
    let searchQuery = '';
    let searchTimeout = null;

    // Switch Tabs
    function switchTab(tab) {
      currentTab = tab;
      currentPage = 1;
      searchQuery = '';
      const searchBox = document.getElementById('product-search-input');
      if (searchBox) searchBox.value = '';

      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById('tab-' + tab + '-btn');
      if (activeBtn) activeBtn.classList.add('active');

      const searchContainer = document.getElementById('search-container');
      searchContainer.style.display = tab === 'products' ? 'block' : 'none';

      loadTableData();
    }

    // Debounced Search
    function handleSearch(val) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = val;
        currentPage = 1;
        loadTableData();
      }, 300);
    }

    // Change Page
    function changePage(delta) {
      const newPage = currentPage + delta;
      if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        loadTableData();
      }
    }

    // Load Overall Metrics
    async function loadStats() {
      try {
        const res = await fetch('/admin/api/stats');
        const json = await res.json();
        if (json.success) {
          const d = json.data;
          document.getElementById('stat-products').innerText = d.totalProducts.toLocaleString();
          document.getElementById('stat-users').innerText = d.totalUsers.toLocaleString();
          document.getElementById('stat-lists').innerText = d.totalShoppingLists.toLocaleString();
          document.getElementById('stat-pantry').innerText = d.totalPantryItems.toLocaleString();
          document.getElementById('stat-latency').innerText = d.dbLatencyMs + ' ms';
          document.getElementById('stat-status').innerText = 'Uptime: ' + Math.floor(d.uptimeSeconds / 60) + ' mins';
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    }

    // Load Tab Table Data
    async function loadTableData() {
      const thead = document.getElementById('table-head');
      const tbody = document.getElementById('table-body');
      const pagInfo = document.getElementById('pag-info');

      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 3rem; color: #9CA3AF;">Loading...</td></tr>';

      try {
        let url = '';
        if (currentTab === 'products') {
          url = '/admin/api/products?page=' + currentPage + '&pageSize=20&search=' + encodeURIComponent(searchQuery);
        } else if (currentTab === 'users') {
          url = '/admin/api/users?page=' + currentPage + '&pageSize=20';
        } else if (currentTab === 'lists') {
          url = '/admin/api/lists?page=' + currentPage + '&pageSize=20';
        } else if (currentTab === 'pantry') {
          url = '/admin/api/pantry?page=' + currentPage + '&pageSize=20';
        }

        const res = await fetch(url);
        const json = await res.json();

        if (!json.success) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #EF4444; padding: 2rem;">Error: ' + json.error + '</td></tr>';
          return;
        }

        const items = json.data || [];
        totalPages = json.meta?.totalPages || 1;
        const total = json.meta?.total || items.length;

        // Render Table Headers & Rows
        if (currentTab === 'products') {
          thead.innerHTML = \`
            <tr>
              <th>Image</th>
              <th>Barcode</th>
              <th>Product Name</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Size</th>
              <th>Price</th>
            </tr>
          \`;

          if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 3rem; color: #9CA3AF;">No products found matching query.</td></tr>';
          } else {
            tbody.innerHTML = items.map(p => \`
              <tr>
                <td>
                  <img src="\${p.imageUrl || 'https://placehold.co/44x44/1f2937/9ca3af?text=No+Img'}" class="prod-thumb" alt="\${p.name}" onerror="this.src='https://placehold.co/44x44/1f2937/9ca3af?text=Img';">
                </td>
                <td><span class="barcode-pill">\${p.code}</span></td>
                <td style="font-weight: 600; max-width: 320px;">\${p.name}</td>
                <td><span class="tag-pill">\${p.brands || 'UK Groceries'}</span></td>
                <td><span class="tag-pill" style="color: #93C5FD;">\${p.category}</span></td>
                <td style="color: #9CA3AF;">\${p.productQuantity ? p.productQuantity + ' ' + (p.unit || '') : p.unit || '-'}</td>
                <td class="price-pill">£\${Number(p.defaultUnitPrice).toFixed(2)}</td>
              </tr>
            \`).join('');
          }
        } else if (currentTab === 'users') {
          thead.innerHTML = \`
            <tr>
              <th>User ID</th>
              <th>Name / Clerk ID</th>
              <th>Household Size</th>
              <th>Budget</th>
              <th>Currency</th>
              <th>Shopping Lists</th>
              <th>Registered</th>
            </tr>
          \`;

          if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 3rem; color: #9CA3AF;">No registered users yet.</td></tr>';
          } else {
            tbody.innerHTML = items.map(u => \`
              <tr>
                <td><span class="barcode-pill">\${u.id.slice(0, 8)}...</span></td>
                <td style="font-weight: 600;">\${u.displayName || u.clerkUserId}</td>
                <td>\${u.householdSize} member(s)</td>
                <td>\${u.defaultBudget ? '£' + Number(u.defaultBudget).toFixed(2) : 'Not Set'}</td>
                <td><span class="tag-pill">\${u.currency || 'GBP'}</span></td>
                <td>\${u._count?.shoppingLists || 0} lists</td>
                <td style="color: #9CA3AF;">\${new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
              </tr>
            \`).join('');
          }
        } else if (currentTab === 'lists') {
          thead.innerHTML = \`
            <tr>
              <th>List Name</th>
              <th>User</th>
              <th>Status</th>
              <th>Items Count</th>
              <th>Last Updated</th>
            </tr>
          \`;

          if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 3rem; color: #9CA3AF;">No shopping lists found.</td></tr>';
          } else {
            tbody.innerHTML = items.map(l => \`
              <tr>
                <td style="font-weight: 600;">\${l.title || 'Shopping List'}</td>
                <td>\${l.user?.displayName || l.user?.clerkUserId || 'User'}</td>
                <td><span class="badge-status badge-\${(l.status || 'draft').toLowerCase()}">\${l.status}</span></td>
                <td>\${l._count?.items || 0} items</td>
                <td style="color: #9CA3AF;">\${new Date(l.updatedAt).toLocaleDateString('en-GB')}</td>
              </tr>
            \`).join('');
          }
        } else if (currentTab === 'pantry') {
          thead.innerHTML = \`
            <tr>
              <th>Product</th>
              <th>Brand</th>
              <th>Quantity</th>
              <th>Expiry Date</th>
              <th>Source</th>
              <th>Owner</th>
            </tr>
          \`;

          if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 3rem; color: #9CA3AF;">No pantry items recorded.</td></tr>';
          } else {
            tbody.innerHTML = items.map(item => \`
              <tr>
                <td style="font-weight: 600;">\${item.product?.name || 'Item'}</td>
                <td><span class="tag-pill">\${item.product?.brands || 'Generic'}</span></td>
                <td>\${item.quantity} \${item.unit}</td>
                <td>\${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-GB') : 'No Expiry'}</td>
                <td><span class="tag-pill">\${item.source || 'MANUAL'}</span></td>
                <td>\${item.user?.displayName || 'User'}</td>
              </tr>
            \`).join('');
          }
        }

        // Pagination buttons
        pagInfo.innerText = 'Page ' + currentPage + ' of ' + totalPages + ' (' + total.toLocaleString() + ' total records)';
        document.getElementById('btn-prev').disabled = currentPage <= 1;
        document.getElementById('btn-next').disabled = currentPage >= totalPages;

      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #EF4444; padding: 2rem;">Failed to fetch table data: ' + err.message + '</td></tr>';
      }
    }

    function loadAllData() {
      loadStats();
      loadTableData();
    }

    // Initial Load
    document.addEventListener('DOMContentLoaded', () => {
      loadAllData();
    });
  </script>
</body>
</html>`);
});

export default adminRouter;
