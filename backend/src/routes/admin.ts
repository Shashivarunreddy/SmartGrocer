import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { adminAuth } from "../middlewares/adminAuth";
import fs from "fs";
import path from "path";

const adminRouter = Router();

// Rate limit admin access to mitigate brute-force credential attacks (SEC-07)
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many admin requests from this IP. Please try again after 15 minutes.",
  },
});

// Protect all /admin endpoints with Rate Limiting and Basic Authentication
adminRouter.use(adminRateLimiter);
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
        dbStatus: "ONLINE",
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
 * POST /admin/api/products
 * Insert or update a product directly in PostgreSQL and products.json
 */
adminRouter.post("/api/products", async (req: Request, res: Response) => {
  try {
    const {
      code,
      product_name,
      brands,
      categories_tags_en,
      image_url,
      product_quantity,
      product_quantity_unit,
      quantity,
      price,
      currency,
    } = req.body;

    if (!code || !String(code).trim()) {
      return res.status(400).json({ success: false, error: "Product barcode 'code' is required." });
    }
    if (!product_name || !String(product_name).trim()) {
      return res.status(400).json({ success: false, error: "Field 'product_name' is required." });
    }

    let tags: string[] = [];
    if (Array.isArray(categories_tags_en)) {
      tags = categories_tags_en.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof categories_tags_en === "string") {
      tags = categories_tags_en.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const cleanCode = String(code).trim();
    const cleanName = String(product_name).trim();
    const cleanBrand = brands ? String(brands).trim() : null;
    const cleanImg = image_url ? String(image_url).trim() : null;
    const cleanUnit = product_quantity_unit ? String(product_quantity_unit).trim() : "g";
    const cleanPrice = price !== undefined && price !== "" && !isNaN(Number(price)) ? Number(price) : 0.0;
    const cleanCurrency = currency ? String(currency).trim().toUpperCase() : "GBP";
    const cleanNumericQty =
      product_quantity !== undefined && product_quantity !== "" && !isNaN(Number(product_quantity))
        ? Number(product_quantity)
        : null;
    const cleanQtyStr = quantity ? String(quantity).trim() : cleanNumericQty ? `${cleanNumericQty} ${cleanUnit}` : cleanUnit;
    const mainCategory = tags.length > 0 ? tags[tags.length - 1] : "Groceries";

    // Upsert directly into PostgreSQL
    const saved = await prisma.product.upsert({
      where: { code: cleanCode },
      update: {
        name: cleanName,
        brands: cleanBrand,
        category: mainCategory,
        categoriesTags: tags,
        imageUrl: cleanImg,
        unit: cleanUnit,
        productQuantity: cleanNumericQty !== null ? new Prisma.Decimal(cleanNumericQty) : null,
        defaultUnitPrice: new Prisma.Decimal(cleanPrice),
        currency: cleanCurrency,
        isActive: true,
        isFood: true,
      },
      create: {
        code: cleanCode,
        name: cleanName,
        brands: cleanBrand,
        category: mainCategory,
        categoriesTags: tags,
        imageUrl: cleanImg,
        unit: cleanUnit,
        productQuantity: cleanNumericQty !== null ? new Prisma.Decimal(cleanNumericQty) : null,
        defaultUnitPrice: new Prisma.Decimal(cleanPrice),
        currency: cleanCurrency,
        isActive: true,
        isFood: true,
      },
    });

    // Also synchronize with products.json on disk if present
    try {
      const possiblePaths = [
        path.resolve(__dirname, "../../products.json"),
        path.resolve(__dirname, "../../../products.json"),
        "/products.json",
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          const fileData = JSON.parse(fs.readFileSync(p, "utf-8"));
          const productsList = fileData.products || [];
          const idx = productsList.findIndex((item: any) => String(item.code) === cleanCode);
          const newEntry = {
            brands: cleanBrand || "",
            categories_tags_en: tags,
            code: cleanCode,
            image_url: cleanImg || "",
            product_name: cleanName,
            product_quantity: cleanNumericQty,
            product_quantity_unit: cleanUnit,
            quantity: cleanQtyStr,
            price: cleanPrice,
            currency: cleanCurrency,
          };
          if (idx >= 0) {
            productsList[idx] = newEntry;
          } else {
            productsList.push(newEntry);
            fileData.count = productsList.length;
            fileData.page_size = productsList.length;
          }
          fs.writeFileSync(p, JSON.stringify(fileData, null, 2), "utf-8");
          break;
        }
      }
    } catch (fsErr) {
      console.warn("Could not synchronize products.json file:", fsErr);
    }

    res.status(201).json({
      success: true,
      message: `Product '${cleanName}' [${cleanCode}] successfully saved in database!`,
      data: saved,
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
 * Serves the Pure Black & White (Monochrome) Admin Console with Dashboard and Enter Product form.
 * Pre-fetches initial database stats and first 20 products server-side so the UI renders INSTANTLY.
 */
adminRouter.get("/", async (_req: Request, res: Response) => {
  let initialStats = {
    totalProducts: 0,
    totalUsers: 0,
    totalShoppingLists: 0,
    totalPantryItems: 0,
    dbLatencyMs: 0,
    uptimeSeconds: Math.floor(process.uptime()),
  };
  let initialProducts: any[] = [];
  let initialMeta = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - start;

    const [totalProducts, totalUsers, totalShoppingLists, totalPantryItems] = await Promise.all([
      prisma.product.count(),
      prisma.userProfile.count(),
      prisma.shoppingList.count(),
      prisma.pantryItem.count(),
    ]);

    initialProducts = await prisma.product.findMany({
      take: 20,
      orderBy: { name: "asc" },
    });

    initialStats = {
      totalProducts,
      totalUsers,
      totalShoppingLists,
      totalPantryItems,
      dbLatencyMs,
      uptimeSeconds: Math.floor(process.uptime()),
    };

    initialMeta = {
      page: 1,
      pageSize: 20,
      total: totalProducts,
      totalPages: Math.max(1, Math.ceil(totalProducts / 20)),
    };
  } catch (preErr) {
    console.error("Error pre-fetching admin data:", preErr);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartGrocer Admin &bull; Monochrome Console</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    /* PURE BLACK AND WHITE SYSTEM (NO GRADIENTS, NO COLOR ACCENTS) */
    :root {
      --bg: #000000;
      --card-bg: #0A0A0A;
      --card-border: #222222;
      --text-white: #FFFFFF;
      --text-gray: #A3A3A3;
      --text-dark-gray: #555555;
      --input-bg: #050505;
      --input-border: #2A2A2A;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text-white);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
    }

    /* Header */
    header {
      background: #000000;
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
      color: #FFFFFF;
    }
    .brand-box {
      width: 32px;
      height: 32px;
      background: #FFFFFF;
      color: #000000;
      font-weight: 900;
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 0.9rem;
    }
    .brand-title {
      font-size: 1rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      text-transform: uppercase;
    }
    .brand-subtitle {
      font-size: 0.7rem;
      color: var(--text-gray);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Top Page Switcher */
    .nav-tabs {
      display: flex;
      gap: 6px;
      background: #080808;
      padding: 4px;
      border: 1px solid var(--card-border);
      border-radius: 8px;
    }
    .nav-btn {
      background: transparent;
      border: none;
      color: var(--text-gray);
      font-family: inherit;
      font-size: 0.825rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 6px 16px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .nav-btn:hover { color: #FFFFFF; }
    .nav-btn.active {
      background: #FFFFFF;
      color: #000000;
    }

    .header-actions { display: flex; align-items: center; gap: 12px; }
    .status-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 4px 10px;
      border: 1px solid #333333;
      border-radius: 4px;
      color: #FFFFFF;
      background: #0A0A0A;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dot { width: 6px; height: 6px; background: #FFFFFF; border-radius: 50%; }

    .btn-action {
      background: #0A0A0A;
      color: #FFFFFF;
      border: 1px solid var(--card-border);
      font-family: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-action:hover { background: #FFFFFF; color: #000000; border-color: #FFFFFF; }

    /* Main Container */
    main {
      flex: 1;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* Page View Containers */
    .page-view { display: none; flex-direction: column; gap: 1.5rem; }
    .page-view.active { display: flex; }

    /* Metric Cards Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 1rem;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .metric-title {
      font-size: 0.725rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-gray);
      font-family: 'JetBrains Mono', monospace;
    }
    .metric-value {
      font-size: 2rem;
      font-weight: 800;
      color: #FFFFFF;
      letter-spacing: -0.02em;
    }
    .metric-sub {
      font-size: 0.75rem;
      color: var(--text-gray);
      font-family: 'JetBrains Mono', monospace;
    }

    /* Sub Tabs (Dashboard Explorer) */
    .sub-tabs {
      display: flex;
      gap: 6px;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 0.5rem;
    }
    .sub-tab-btn {
      background: transparent;
      border: none;
      color: var(--text-gray);
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .sub-tab-btn:hover { color: #FFFFFF; }
    .sub-tab-btn.active {
      color: #000000;
      background: #FFFFFF;
    }

    /* Panel */
    .panel {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .panel-title {
      font-size: 0.95rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .search-box {
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 6px;
      padding: 8px 14px;
      color: #FFFFFF;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      min-width: 320px;
      outline: none;
    }
    .search-box:focus { border-color: #FFFFFF; }

    /* Table */
    .table-wrapper {
      overflow-x: auto;
      border: 1px solid var(--card-border);
      border-radius: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.825rem;
    }
    thead th {
      background: #080808;
      color: var(--text-gray);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-family: 'JetBrains Mono', monospace;
      padding: 10px 14px;
      border-bottom: 1px solid var(--card-border);
      white-space: nowrap;
    }
    tbody tr {
      border-bottom: 1px solid #161616;
    }
    tbody tr:hover { background: #121212; }
    tbody td {
      padding: 10px 14px;
      color: #E5E5E5;
      vertical-align: middle;
    }

    .prod-thumb {
      width: 36px;
      height: 36px;
      object-fit: cover;
      border-radius: 4px;
      background: #111111;
      border: 1px solid #333333;
    }
    .code-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.725rem;
      background: #161616;
      border: 1px solid #2A2A2A;
      padding: 2px 6px;
      border-radius: 4px;
      color: #FFFFFF;
    }
    .price-cell {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: #FFFFFF;
      font-size: 0.9rem;
    }
    .tag {
      display: inline-block;
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 4px;
      background: #1A1A1A;
      color: #E5E5E5;
      border: 1px solid #2E2E2E;
    }
    .tag-invert {
      background: #FFFFFF;
      color: #000000;
      font-weight: 700;
      border: none;
    }

    /* Pagination */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.5rem;
      font-size: 0.8rem;
      color: var(--text-gray);
      font-family: 'JetBrains Mono', monospace;
    }
    .pag-btn {
      background: #0A0A0A;
      color: #FFFFFF;
      border: 1px solid var(--card-border);
      padding: 5px 12px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .pag-btn:hover:not(:disabled) { background: #FFFFFF; color: #000000; }
    .pag-btn:disabled { opacity: 0.3; cursor: not-allowed; }

    /* ENTER PRODUCT FORM STYLES */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }
    @media (max-width: 800px) {
      .form-grid { grid-template-columns: 1fr; }
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group.full-width { grid-column: 1 / -1; }
    label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-gray);
      font-family: 'JetBrains Mono', monospace;
    }
    .form-input {
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 6px;
      padding: 10px 14px;
      color: #FFFFFF;
      font-family: inherit;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
    }
    .form-input:focus { border-color: #FFFFFF; }
    .form-help {
      font-size: 0.7rem;
      color: var(--text-dark-gray);
      font-family: 'JetBrains Mono', monospace;
    }

    .json-paste-box {
      background: #050505;
      border: 1px dashed #333333;
      border-radius: 6px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    textarea.json-input {
      width: 100%;
      height: 140px;
      background: #000000;
      border: 1px solid #222222;
      border-radius: 4px;
      color: #E5E5E5;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.775rem;
      padding: 10px;
      outline: none;
      resize: vertical;
    }
    textarea.json-input:focus { border-color: #FFFFFF; }

    .form-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-top: 1rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--card-border);
    }
    .btn-submit {
      background: #FFFFFF;
      color: #000000;
      border: none;
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-submit:hover { background: #E5E5E5; }
    .btn-secondary {
      background: transparent;
      color: #FFFFFF;
      border: 1px solid var(--card-border);
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 10px 18px;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-secondary:hover { background: #161616; border-color: #FFFFFF; }

    .img-preview-box {
      width: 90px;
      height: 90px;
      border: 1px solid var(--card-border);
      background: #050505;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .img-preview-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .alert-banner {
      display: none;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
    }
    .alert-success {
      display: block;
      background: #111111;
      border: 1px solid #FFFFFF;
      color: #FFFFFF;
    }
    .alert-error {
      display: block;
      background: #111111;
      border: 1px dashed #FFFFFF;
      color: #FFFFFF;
    }

    footer {
      border-top: 1px solid var(--card-border);
      padding: 1.25rem 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-dark-gray);
      font-family: 'JetBrains Mono', monospace;
      margin-top: auto;
    }
  </style>
</head>
<body>

  <!-- Top Navigation Header -->
  <header>
    <a href="/admin" class="brand">
      <div class="brand-box">SG</div>
      <div>
        <div class="brand-title">SmartGrocer Admin</div>
        <div class="brand-subtitle">Production Database Console</div>
      </div>
    </a>

    <!-- Main Page Switcher -->
    <div class="nav-tabs">
      <button class="nav-btn active" id="nav-btn-dashboard" onclick="showPage('dashboard')">Dashboard</button>
      <button class="nav-btn" id="nav-btn-enter" onclick="showPage('enter')">+ Enter Product</button>
    </div>

    <div class="header-actions">
      <div class="status-pill">
        <span class="dot"></span>
        <span id="header-status">PROD DB ONLINE</span>
      </div>
      <button class="btn-action" onclick="refreshActivePage()">Refresh</button>
    </div>
  </header>

  <!-- Main Container -->
  <main>

    <!-- PAGE 1: DASHBOARD OVERVIEW & TABLE EXPLORER -->
    <div id="page-dashboard" class="page-view active">

      <!-- Metrics Row -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-title">Products</div>
          <div class="metric-value" id="stat-products">...</div>
          <div class="metric-sub">Verified UK Items</div>
        </div>

        <div class="metric-card">
          <div class="metric-title">Users</div>
          <div class="metric-value" id="stat-users">...</div>
          <div class="metric-sub">Clerk Profiles</div>
        </div>

        <div class="metric-card">
          <div class="metric-title">Shopping Lists</div>
          <div class="metric-value" id="stat-lists">...</div>
          <div class="metric-sub">Active & Completed</div>
        </div>

        <div class="metric-card">
          <div class="metric-title">Pantry Items</div>
          <div class="metric-value" id="stat-pantry">...</div>
          <div class="metric-sub">Tracked Inventory</div>
        </div>

        <div class="metric-card">
          <div class="metric-title">DB Latency</div>
          <div class="metric-value" id="stat-latency" style="font-size: 1.5rem;">...</div>
          <div class="metric-sub" id="stat-uptime">PostgreSQL 16</div>
        </div>
      </div>

      <!-- Explorer Panel -->
      <div class="panel">
        <div class="panel-header">
          <div class="sub-tabs">
            <button class="sub-tab-btn active" id="subtab-products-btn" onclick="switchSubTab('products')">Products</button>
            <button class="sub-tab-btn" id="subtab-users-btn" onclick="switchSubTab('users')">Users</button>
            <button class="sub-tab-btn" id="subtab-lists-btn" onclick="switchSubTab('lists')">Lists</button>
            <button class="sub-tab-btn" id="subtab-pantry-btn" onclick="switchSubTab('pantry')">Pantry</button>
          </div>

          <div id="search-bar-wrap">
            <input type="text" id="table-search" class="search-box" placeholder="Search by name, brand, barcode..." oninput="handleSearch(this.value)">
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead id="table-head"></thead>
            <tbody id="table-body">
              <tr><td colspan="7" style="text-align: center; padding: 3rem; color: #666;">Loading records...</td></tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-bar">
          <div id="pag-info">Showing records...</div>
          <div style="display: flex; gap: 6px;">
            <button class="pag-btn" id="btn-prev" onclick="changePage(-1)">&larr; Prev</button>
            <button class="pag-btn" id="btn-next" onclick="changePage(1)">Next &rarr;</button>
          </div>
        </div>
      </div>

    </div>

    <!-- PAGE 2: ENTER PRODUCT PAGE (DIRECT PROD ENTRY) -->
    <div id="page-enter" class="page-view">

      <div class="panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">Enter New Product</div>
            <div style="font-size: 0.75rem; color: var(--text-gray); font-family: 'JetBrains Mono', monospace; margin-top: 2px;">
              Direct insertion into live PostgreSQL catalogue &bull; Matches SmartGrocer schema
            </div>
          </div>
          <button class="btn-action" onclick="fillSampleProduct()">Fill Sample (Jasons)</button>
        </div>

        <!-- Feedback Alert Banner -->
        <div id="form-alert" class="alert-banner"></div>

        <!-- Quick JSON Paste Box -->
        <div class="json-paste-box">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="color: #FFFFFF;">&bull; Option A: Quick Paste Raw JSON</label>
            <button type="button" class="btn-action" style="padding: 3px 10px; font-size: 0.75rem;" onclick="parseJsonBox()">Apply JSON to Form &darr;</button>
          </div>
          <textarea id="raw-json-box" class="json-input" placeholder='Paste JSON here, e.g.:
{
  "brands": "Jasons",
  "categories_tags_en": ["Plant-based foods", "Breads"],
  "code": "5025125000037",
  "image_url": "https://...",
  "product_name": "Sourdough grain and seeds",
  "product_quantity": 45,
  "product_quantity_unit": "g",
  "quantity": "45 g",
  "price": 2.2,
  "currency": "GBP"
}'></textarea>
        </div>

        <div style="text-align: center; color: var(--text-dark-gray); font-size: 0.75rem; font-family: 'JetBrains Mono', monospace; margin: 0.5rem 0;">
          &mdash; OR ENTER FIELDS MANUALLY &mdash;
        </div>

        <!-- Structured Form -->
        <form id="enter-product-form" onsubmit="handleProductSubmit(event)">
          <div class="form-grid">

            <!-- 1. Product Name -->
            <div class="form-group full-width">
              <label for="f_name">Product Name *</label>
              <input type="text" id="f_name" class="form-input" placeholder="e.g. Sourdough grain and seeds" required>
              <div class="form-help">Field: product_name</div>
            </div>

            <!-- 2. Barcode Code -->
            <div class="form-group">
              <label for="f_code">Universal Barcode (Code) *</label>
              <input type="text" id="f_code" class="form-input" placeholder="e.g. 5025125000037" required>
              <div class="form-help">Field: code (Unique EAN-13 identifier)</div>
            </div>

            <!-- 3. Brands -->
            <div class="form-group">
              <label for="f_brand">Brand Name</label>
              <input type="text" id="f_brand" class="form-input" placeholder="e.g. Jasons, Sainsbury's, Tesco">
              <div class="form-help">Field: brands</div>
            </div>

            <!-- 4. Price -->
            <div class="form-group">
              <label for="f_price">Price (&pound; GBP) *</label>
              <input type="number" id="f_price" class="form-input" step="0.01" min="0" placeholder="e.g. 2.20" required>
              <div class="form-help">Field: price (stored in defaultUnitPrice)</div>
            </div>

            <!-- 5. Currency -->
            <div class="form-group">
              <label for="f_currency">Currency</label>
              <input type="text" id="f_currency" class="form-input" value="GBP" readonly>
              <div class="form-help">Field: currency (Standardized British Pounds)</div>
            </div>

            <!-- 6. Numeric Quantity -->
            <div class="form-group">
              <label for="f_pqty">Product Quantity (Numeric)</label>
              <input type="number" id="f_pqty" class="form-input" step="any" min="0" placeholder="e.g. 45 or 500">
              <div class="form-help">Field: product_quantity</div>
            </div>

            <!-- 7. Quantity Unit -->
            <div class="form-group">
              <label for="f_punit">Quantity Unit</label>
              <select id="f_punit" class="form-input">
                <option value="g">g (Grams)</option>
                <option value="kg">kg (Kilograms)</option>
                <option value="ml">ml (Millilitres)</option>
                <option value="l">l (Litres)</option>
                <option value="piece">piece (Units)</option>
                <option value="pack">pack</option>
              </select>
              <div class="form-help">Field: product_quantity_unit</div>
            </div>

            <!-- 8. Display Quantity String -->
            <div class="form-group">
              <label for="f_qty">Display Quantity String</label>
              <input type="text" id="f_qty" class="form-input" placeholder="e.g. 45 g or 500g (Auto-generated if blank)">
              <div class="form-help">Field: quantity</div>
            </div>

            <!-- 9. Categories Tags -->
            <div class="form-group">
              <label for="f_tags">Categories Tags (Comma-separated)</label>
              <input type="text" id="f_tags" class="form-input" placeholder="e.g. Plant-based foods, Cereals, Breads">
              <div class="form-help">Field: categories_tags_en</div>
            </div>

            <!-- 10. Image URL + Preview -->
            <div class="form-group full-width">
              <label for="f_img">Product Image URL</label>
              <div style="display: flex; gap: 12px; align-items: flex-start;">
                <div style="flex: 1;">
                  <input type="url" id="f_img" class="form-input" placeholder="https://images.openfoodfacts.org/..." oninput="updateImagePreview(this.value)">
                  <div class="form-help">Field: image_url (Front-of-pack photography)</div>
                </div>
                <div class="img-preview-box" id="img-preview-container">
                  <span style="font-size: 0.65rem; color: #555; text-align: center;">No Image</span>
                </div>
              </div>
            </div>

          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button type="submit" class="btn-submit" id="btn-save-prod">Save Product To Database</button>
            <button type="button" class="btn-secondary" onclick="resetForm()">Reset Form</button>
          </div>
        </form>

      </div>

    </div>

  </main>

  <footer>
    SmartGrocer Production Console &bull; Monochrome Edition &bull; PostgreSQL 16
  </footer>

  <script>
    // Embedded Initial Data (Server-Rendered for Instant Zero-Latency Load)
    window.__INITIAL_DATA__ = {
      stats: ${JSON.stringify(initialStats)},
      products: ${JSON.stringify(initialProducts)},
      meta: ${JSON.stringify(initialMeta)}
    };

    let activePage = 'dashboard';
    let currentSubTab = 'products';
    let currentPage = 1;
    let totalPages = window.__INITIAL_DATA__.meta?.totalPages || 1;
    let searchQuery = '';
    let searchTimeout = null;

    // Helper wrapper for fetch ensuring Basic Auth credentials are kept across same-origin calls
    function authFetch(url, options = {}) {
      return fetch(url, {
        ...options,
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          ...(options.headers || {})
        }
      });
    }

    // Page Switching (Dashboard vs Enter Product)
    function showPage(pageName) {
      activePage = pageName;
      document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
      document.getElementById('page-' + pageName).classList.add('active');

      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
      document.getElementById('nav-btn-' + pageName).classList.add('active');

      if (pageName === 'dashboard') {
        loadStats();
        loadTableData();
      }
    }

    function refreshActivePage() {
      if (activePage === 'dashboard') {
        loadStats();
        loadTableData();
      } else {
        resetForm();
      }
    }

    // Sub Tabs in Dashboard
    function switchSubTab(tab) {
      currentSubTab = tab;
      currentPage = 1;
      searchQuery = '';
      const sb = document.getElementById('table-search');
      if (sb) sb.value = '';

      document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('subtab-' + tab + '-btn').classList.add('active');

      const wrap = document.getElementById('search-bar-wrap');
      wrap.style.display = tab === 'products' ? 'block' : 'none';

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

    function changePage(delta) {
      const next = currentPage + delta;
      if (next >= 1 && next <= totalPages) {
        currentPage = next;
        loadTableData();
      }
    }

    // Render Stats to UI
    function renderStats(d) {
      if (!d) return;
      document.getElementById('stat-products').innerText = Number(d.totalProducts || 0).toLocaleString();
      document.getElementById('stat-users').innerText = Number(d.totalUsers || 0).toLocaleString();
      document.getElementById('stat-lists').innerText = Number(d.totalShoppingLists || 0).toLocaleString();
      document.getElementById('stat-pantry').innerText = Number(d.totalPantryItems || 0).toLocaleString();
      document.getElementById('stat-latency').innerText = (d.dbLatencyMs || 0) + ' ms';
      document.getElementById('stat-uptime').innerText = 'Uptime: ' + Math.floor((d.uptimeSeconds || 0) / 60) + 'm';
    }

    // Render Products Table
    function renderProductsTable(items, meta) {
      const thead = document.getElementById('table-head');
      const tbody = document.getElementById('table-body');
      const pagInfo = document.getElementById('pag-info');

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

      if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 3rem; color: #666;">No products found.</td></tr>';
      } else {
        tbody.innerHTML = items.map(p => \`
          <tr>
            <td>
              <img src="\${p.imageUrl || 'https://placehold.co/36x36/111111/444444?text=-'}" class="prod-thumb" alt="\${p.name || ''}" onerror="this.src='https://placehold.co/36x36/111111/444444?text=-';">
            </td>
            <td><span class="code-pill">\${p.code || ''}</span></td>
            <td style="font-weight: 600; max-width: 320px;">\${p.name || ''}</td>
            <td><span class="tag">\${p.brands || 'UK Groceries'}</span></td>
            <td><span class="tag">\${p.category || 'General'}</span></td>
            <td style="color: #999; font-family: 'JetBrains Mono', monospace;">\${p.productQuantity ? p.productQuantity + ' ' + (p.unit || '') : p.unit || '-'}</td>
            <td class="price-cell">&pound;\${Number(p.defaultUnitPrice || 0).toFixed(2)}</td>
          </tr>
        \`).join('');
      }

      if (meta) {
        totalPages = meta.totalPages || 1;
        pagInfo.innerText = 'Page ' + (meta.page || 1) + ' of ' + totalPages + ' (' + (meta.total || items.length).toLocaleString() + ' records)';
        document.getElementById('btn-prev').disabled = (meta.page || 1) <= 1;
        document.getElementById('btn-next').disabled = (meta.page || 1) >= totalPages;
      }
    }

    // Load Overall Metrics via API
    async function loadStats() {
      try {
        const res = await authFetch('/admin/api/stats');
        const json = await res.json();
        if (json.success) {
          renderStats(json.data);
        }
      } catch (err) {
        console.error('Stats error:', err);
      }
    }

    // Load Table Data via API
    async function loadTableData() {
      const thead = document.getElementById('table-head');
      const tbody = document.getElementById('table-body');
      const pagInfo = document.getElementById('pag-info');

      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 3rem; color: #666;">Loading records...</td></tr>';

      try {
        let url = '';
        if (currentSubTab === 'products') {
          url = '/admin/api/products?page=' + currentPage + '&pageSize=20&search=' + encodeURIComponent(searchQuery);
        } else if (currentSubTab === 'users') {
          url = '/admin/api/users?page=' + currentPage + '&pageSize=20';
        } else if (currentSubTab === 'lists') {
          url = '/admin/api/lists?page=' + currentPage + '&pageSize=20';
        } else if (currentSubTab === 'pantry') {
          url = '/admin/api/pantry?page=' + currentPage + '&pageSize=20';
        }

        const res = await authFetch(url);
        const json = await res.json();

        if (!json.success) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #FFF; padding: 2rem;">Error: ' + json.error + '</td></tr>';
          return;
        }

        const items = json.data || [];
        totalPages = json.meta?.totalPages || 1;
        const total = json.meta?.total || items.length;

        if (currentSubTab === 'products') {
          renderProductsTable(items, json.meta);
        } else if (currentSubTab === 'users') {
          thead.innerHTML = \`
            <tr>
              <th>User ID</th>
              <th>Name / Clerk ID</th>
              <th>Household</th>
              <th>Budget</th>
              <th>Lists</th>
              <th>Registered</th>
            </tr>
          \`;

          if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 3rem; color: #666;">No registered users yet.</td></tr>';
          } else {
            tbody.innerHTML = items.map(u => \`
              <tr>
                <td><span class="code-pill">\${(u.id || '').slice(0, 8)}...</span></td>
                <td style="font-weight: 600;">\${u.displayName || u.clerkUserId}</td>
                <td>\${u.householdSize || 1} member(s)</td>
                <td class="price-cell">\${u.defaultBudget ? '&pound;' + Number(u.defaultBudget).toFixed(2) : 'Not Set'}</td>
                <td><span class="tag">\${u._count?.shoppingLists || 0} lists</span></td>
                <td style="color: #888; font-family: 'JetBrains Mono', monospace;">\${new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
              </tr>
            \`).join('');
          }
        } else if (currentSubTab === 'lists') {
          thead.innerHTML = \`
            <tr>
              <th>List Title</th>
              <th>User</th>
              <th>Status</th>
              <th>Items</th>
              <th>Updated</th>
            </tr>
          \`;

          if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 3rem; color: #666;">No shopping lists found.</td></tr>';
          } else {
            tbody.innerHTML = items.map(l => \`
              <tr>
                <td style="font-weight: 600;">\${l.title || 'Shopping List'}</td>
                <td>\${l.user?.displayName || l.user?.clerkUserId || 'User'}</td>
                <td><span class="tag tag-invert">\${l.status}</span></td>
                <td>\${l._count?.items || 0} item(s)</td>
                <td style="color: #888; font-family: 'JetBrains Mono', monospace;">\${new Date(l.updatedAt).toLocaleDateString('en-GB')}</td>
              </tr>
            \`).join('');
          }
        } else if (currentSubTab === 'pantry') {
          thead.innerHTML = \`
            <tr>
              <th>Product</th>
              <th>Brand</th>
              <th>Quantity</th>
              <th>Expiry Date</th>
              <th>Source</th>
              <th>User</th>
            </tr>
          \`;

          if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 3rem; color: #666;">No pantry items recorded.</td></tr>';
          } else {
            tbody.innerHTML = items.map(item => \`
              <tr>
                <td style="font-weight: 600;">\${item.product?.name || 'Item'}</td>
                <td><span class="tag">\${item.product?.brands || 'Generic'}</span></td>
                <td style="font-family: 'JetBrains Mono', monospace;">\${item.quantity} \${item.unit}</td>
                <td style="font-family: 'JetBrains Mono', monospace;">\${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-GB') : '-'}</td>
                <td><span class="tag tag-invert">\${item.source || 'MANUAL'}</span></td>
                <td>\${item.user?.displayName || 'User'}</td>
              </tr>
            \`).join('');
          }
        }

        pagInfo.innerText = 'Page ' + currentPage + ' of ' + totalPages + ' (' + total.toLocaleString() + ' records)';
        document.getElementById('btn-prev').disabled = currentPage <= 1;
        document.getElementById('btn-next').disabled = currentPage >= totalPages;

      } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #FFF; padding: 2rem;">Error: ' + err.message + '</td></tr>';
      }
    }

    // ENTER PRODUCT FORM LOGIC
    function updateImagePreview(url) {
      const container = document.getElementById('img-preview-container');
      if (url && url.startsWith('http')) {
        const img = document.createElement('img');
        img.src = url;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.onerror = function() {
          container.innerHTML = '<span style="font-size: 0.65rem; color: #777;">Invalid URL</span>';
        };
        container.innerHTML = '';
        container.appendChild(img);
      } else {
        container.innerHTML = '<span style="font-size: 0.65rem; color: #555;">No Image</span>';
      }
    }

    function parseJsonBox() {
      const alertBox = document.getElementById('form-alert');
      alertBox.className = 'alert-banner';
      alertBox.style.display = 'none';

      const raw = document.getElementById('raw-json-box').value.trim();
      if (!raw) {
        alert('Please paste a JSON object into the box first.');
        return;
      }

      try {
        const obj = JSON.parse(raw);
        if (obj.product_name) document.getElementById('f_name').value = obj.product_name;
        if (obj.code) document.getElementById('f_code').value = obj.code;
        if (obj.brands) document.getElementById('f_brand').value = obj.brands;
        if (obj.price !== undefined) document.getElementById('f_price').value = obj.price;
        if (obj.product_quantity !== undefined) document.getElementById('f_pqty').value = obj.product_quantity;
        if (obj.product_quantity_unit) document.getElementById('f_punit').value = obj.product_quantity_unit;
        if (obj.quantity) document.getElementById('f_qty').value = obj.quantity;
        if (obj.image_url) {
          document.getElementById('f_img').value = obj.image_url;
          updateImagePreview(obj.image_url);
        }
        if (obj.categories_tags_en) {
          const tagsStr = Array.isArray(obj.categories_tags_en) ? obj.categories_tags_en.join(', ') : obj.categories_tags_en;
          document.getElementById('f_tags').value = tagsStr;
        }

        alertBox.className = 'alert-banner alert-success';
        alertBox.innerText = '✓ JSON fields successfully loaded into form! Review and click Save.';
      } catch (e) {
        alertBox.className = 'alert-banner alert-error';
        alertBox.innerText = '✕ JSON Parse Error: ' + e.message;
      }
    }

    function fillSampleProduct() {
      const sample = {
        "brands": "Jasons",
        "categories_tags_en": [
          "Plant-based foods and beverages",
          "Plant-based foods",
          "Cereals and potatoes",
          "Cereals and their products",
          "Breads",
          "Breads with malted grains"
        ],
        "code": "5025125000037",
        "image_url": "https://images.openfoodfacts.org/images/products/502/512/500/0037/front_en.108.400.jpg",
        "product_name": "Sourdough grain and seeds",
        "product_quantity": 45,
        "product_quantity_unit": "g",
        "quantity": "45 g",
        "price": 2.2,
        "currency": "GBP"
      };

      document.getElementById('raw-json-box').value = JSON.stringify(sample, null, 2);
      parseJsonBox();
    }

    function resetForm() {
      document.getElementById('enter-product-form').reset();
      document.getElementById('raw-json-box').value = '';
      updateImagePreview('');
      const alertBox = document.getElementById('form-alert');
      alertBox.className = 'alert-banner';
      alertBox.style.display = 'none';
    }

    async function handleProductSubmit(e) {
      e.preventDefault();
      const alertBox = document.getElementById('form-alert');
      const submitBtn = document.getElementById('btn-save-prod');

      alertBox.className = 'alert-banner';
      alertBox.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.innerText = 'SAVING TO DATABASE...';

      const payload = {
        product_name: document.getElementById('f_name').value.trim(),
        code: document.getElementById('f_code').value.trim(),
        brands: document.getElementById('f_brand').value.trim(),
        price: parseFloat(document.getElementById('f_price').value),
        currency: 'GBP',
        product_quantity: document.getElementById('f_pqty').value ? parseFloat(document.getElementById('f_pqty').value) : null,
        product_quantity_unit: document.getElementById('f_punit').value,
        quantity: document.getElementById('f_qty').value.trim(),
        image_url: document.getElementById('f_img').value.trim(),
        categories_tags_en: document.getElementById('f_tags').value.split(',').map(s => s.trim()).filter(Boolean),
      };

      try {
        const res = await authFetch('/admin/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();

        if (json.success) {
          alertBox.className = 'alert-banner alert-success';
          alertBox.innerText = '✓ ' + json.message;
          submitBtn.innerText = 'SAVED ✓';
          setTimeout(() => {
            submitBtn.innerText = 'SAVE PRODUCT TO DATABASE';
            submitBtn.disabled = false;
          }, 2000);
        } else {
          alertBox.className = 'alert-banner alert-error';
          alertBox.innerText = '✕ Error: ' + json.error;
          submitBtn.disabled = false;
          submitBtn.innerText = 'SAVE PRODUCT TO DATABASE';
        }
      } catch (err) {
        alertBox.className = 'alert-banner alert-error';
        alertBox.innerText = '✕ Network Failure: ' + err.message;
        submitBtn.disabled = false;
        submitBtn.innerText = 'SAVE PRODUCT TO DATABASE';
      }
    }

    // App Initialization: Runs immediately using pre-fetched server data, or hooks DOMContentLoaded
    function initApp() {
      if (window.__INITIAL_DATA__) {
        renderStats(window.__INITIAL_DATA__.stats);
        renderProductsTable(window.__INITIAL_DATA__.products, window.__INITIAL_DATA__.meta);
      } else {
        loadStats();
        loadTableData();
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
    } else {
      initApp();
    }
  </script>
</body>
</html>`);
});

export default adminRouter;
