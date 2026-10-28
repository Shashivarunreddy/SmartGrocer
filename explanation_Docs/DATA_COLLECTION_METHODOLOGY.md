# Data Collection & Feature Extraction Methodology
**Project:** SmartGrocer – AI-Powered UK Grocery Management & Demand Forecasting System  
**Prepared for:** Academic Review & Project Assessment  
**Author:** SmartGrocer Engineering Team  

---

## 1. Executive Summary & Objective

**SmartGrocer** relies on a localized, structured product catalogue of fast-moving consumer goods (FMCG) sold across major supermarket retailers in the **United Kingdom**. 

To power the application's core capabilities—including automated shelf-life decay estimation, personalized consumption rate modeling, real-time bill calculation, and smart catalogue browsing—an automated data pipeline was developed to **collect, selectively filter, and extract only high-value attributes** from comprehensive global food datasets.

This report outlines the end-to-end data lifecycle: source selection, targeted query design, selective feature extraction, data normalization, and relational persistence.

```
┌─────────────────────────────────┐
│     Open Food Facts (ODbL)      │
│  (Global FMCG Barcode Database) │
└────────────────┬────────────────┘
                 │
                 ▼  Targeted API Querying & Stream Ingestion
┌────────────────────────────────────────────────────────┐
│             Targeted Extraction Layer                  │
│  • Geographical Filter: United Kingdom Only            │
│  • Field Projection: Selects 7 Core Operational Fields │
│  • Quality Gate: Requires Verified Barcode & Image     │
└────────────────┬───────────────────────────────────────┘
                 │
                 ▼  Data Normalization & Enrichment
┌────────────────────────────────────────────────────────┐
│             Feature Structuring Pipeline               │
│  • Hash-Set Deduplication: EAN-13 Barcode Identity     │
│  • Department Classification: 7 Standardized Aisles    │
│  • Quantity & Unit Standardization: Metric (g, ml)     │
│  • Localized Pricing Engine: Benchmark GBP (£) Values  │
└────────────────┬───────────────────────────────────────┘
                 │
                 ▼  Prisma ORM Upsert Batching
┌────────────────────────────────────────────────────────┐
│             PostgreSQL Relational Storage              │
│  • Indexed on code, category, and name                 │
│  • Powers Mobile App, AI Forecaster, & Pantry Tracker  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Data Source Selection

The primary data foundation was gathered from **Open Food Facts (OFF)** under the **Open Database License (ODbL)**. 

### Why Open Food Facts Was Selected:
* **Standardized Barcode Identifiers**: Contains genuine EAN-13, EAN-8, and UPC barcodes matching packaging in British supermarkets (Tesco, Sainsbury's, Marks & Spencer, ASDA, Waitrose).
* **Taxonomic Hierarchy**: Offers multi-level category metadata (e.g. `["en:plant-based-foods", "en:cereals-and-potatoes", "en:breads", "en:sourdough-breads"]`), enabling automated shelf-life categorization.
* **Packaging & Metric Weights**: Provides net weight and volumetric units necessary for daily consumption math.
* **Hosted Visual Assets**: Offers verified CDN links to front-of-pack product photography for mobile UI rendering.

---

## 3. Targeted Collection & Selective Extraction Strategy

Raw grocery entries often contain hundreds of extraneous or unverified attributes (such as manufacturing facility codes, carbon footprint estimates, packaging material recycling codes, and legacy timestamps). 

To ensure optimal performance, low latency, and high data density, SmartGrocer applies a **Selective Feature Extraction Strategy** that extracts strictly the **7 operational fields** required by the system.

### 3.1 The 7 Extracted Core Features

| # | Extracted Field | Raw Source Attribute | Purpose in SmartGrocer |
| :---: | :--- | :--- | :--- |
| **1** | **Universal Barcode** | `code` | Unique primary key identifier for barcode scanning and deduplication. |
| **2** | **Product Title** | `product_name` / `product_name_en` | Display name for search and catalogue listings. |
| **3** | **Brand Name** | `brands` | Identifies product manufacturer (e.g. Warburtons, Lurpak, Heinz). |
| **4** | **Taxonomy Tags** | `categories_tags_en` | Multi-level tags used to classify items into grocery departments. |
| **5** | **Packaging Image** | `image_url` / `image_front_url` | High-resolution photography rendered directly in the mobile app. |
| **6** | **Quantity & Units** | `quantity`, `product_quantity`, `product_quantity_unit` | Standardizes package size (e.g. 500g, 1L, 6 pack) for consumption rate modeling. |
| **7** | **Benchmark Price** | Derived via Pricing Engine | Localized British Pound (GBP / £) price for budget and bill estimation. |

---

### 3.2 Targeted Ingestion Implementations

Data collection is executed through two complementary mechanisms:

#### A. Targeted REST API v2 Ingestion
For active catalog synchronizations, the search endpoint is queried with strict field pruning:

```http
GET https://world.openfoodfacts.org/api/v2/search
  ?countries_tags_en=united-kingdom
  &page_size=100
  &page=1
  &fields=code,product_name,brands,image_url,categories_tags_en,quantity,product_quantity,product_quantity_unit
```

* **`countries_tags_en=united-kingdom`**: Restricts results exclusively to items commercialized in the UK market.
* **`fields=...` (Field Projection)**: Discards over 90% of non-essential JSON fields at the network boundary, maximizing download speed and reducing payload size.

#### B. Streaming Extraction Pipeline
For bulk data extraction from comprehensive offline exports:
* **Line-by-Line Generator Streaming**: Streams records sequentially through a buffered reader, maintaining a constant, low-memory footprint (< 50 MB RAM).
* **Geographical Filtering**: Inspects country localization tags in each row, extracting only verified UK entries.
* **Completeness Validation**: Only records with a valid barcode (`code`), an identifiable title (`product_name`), and high-quality packaging imagery are admitted into the catalogue.

---

## 4. Normalization, Classification & Enrichment

Once relevant attributes are extracted, the pipeline applies structured normalization:

### 4.1 $O(1)$ Hash Deduplication
To ensure every product is unique in the database:
* An in-memory hash set tracks every observed EAN-13 code during extraction.
* Repeated records are skipped, guaranteeing an accurate, non-redundant catalogue.

### 4.2 Department Taxonomy Classification
Open Food Facts categories are structured as deeply nested tag arrays. A categorization mapper aggregates these tags into **7 intuitive SmartGrocer departments**:

```
Raw Category Tags                                  SmartGrocer Department
["en:plant-based-foods", "en:sourdough-breads"] ──► Breads
["en:dairy-substitutes", "en:milks", "en:cheeses"]──► Dairies
["en:fruit-juices", "en:teas", "en:coffees"]     ──► Beverages
["en:biscuits", "en:crisps", "en:chocolates"]    ──► Snacks
["en:cereals", "en:oats", "en:porridges"]        ──► Breakfast
["en:jams", "en:butters", "en:peanut-butters"]   ──► Spreads
["en:canned-foods", "en:pastas", "en:condiments"]──► Groceries
```

### 4.3 UK Pricing Model (GBP / £)
To provide real-time budget forecasting:
* A pricing engine applies benchmark UK supermarket shelf prices based on category indicators (e.g. £1.55 for fresh milk, £2.20 for artisan sourdough, £2.80 for mature cheddar).
* Values are stored with two decimal places (`Decimal(10, 2)`).

---

## 5. Relational Database Modeling

The extracted and normalized features are persisted in **PostgreSQL** using **Prisma ORM**:

```prisma
model Product {
  id                String             @id @default(uuid()) @db.Uuid
  code              String             @unique // EAN-13 barcode
  name              String
  brands            String?
  category          String             // Normalized Department
  categoriesTags    String[]           @default([])
  imageUrl          String?
  unit              String             @default("piece") // g, ml, pack, piece
  productQuantity   Decimal?           @db.Decimal(10, 2)
  defaultUnitPrice  Decimal            @db.Decimal(10, 2)
  currency          String             @default("GBP")
  isFood            Boolean            @default(true)
  isActive          Boolean            @default(true)
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  shoppingListItems ShoppingListItem[]
  pantryItems       PantryItem[]
  shoppingTripItems ShoppingTripItem[]

  @@index([name])
  @@index([category])
  @@index([code])
}
```

### Key Schema Characteristics:
* **Unique Barcode Constraint**: Guarantees data integrity at the database level.
* **B-Tree Indices**: Placed on `name`, `category`, and `code` for rapid search and autocomplete in the mobile client.
* **Idempotent Upserting**: Seeding logic uses `prisma.product.upsert()`, allowing safe re-runs to update pricing or images without creating duplicate entries.

---

## 6. How Extracted Data Powers SmartGrocer Features

| System Feature | Role of Extracted Attributes |
| :--- | :--- |
| **Interactive Catalogue** | Uses `name`, `brands`, `imageUrl`, and `defaultUnitPrice` for search and instant basket additions. |
| **Automated Shelf-Life Tracking** | Uses `category` to assign standard shelf-life decay curves (e.g. Milk = 7 days, Bread = 5 days) automatically upon purchase. |
| **AI Demand Forecasting** | Feeds category baselines, packaging sizes, and user purchase frequency into the FastAPI microservice to predict replenishment needs. |
| **Smart Bill Estimator** | Uses `defaultUnitPrice` and `quantity` to track live shopping trip totals against the user's weekly target budget. |

---

## 7. Compliance & Academic Attribution

* **Source Attribution**: Product information and media are sourced from the **Open Food Facts** collaborative database.
* **Licensing**: Used in compliance with the **Open Database License (ODbL) v1.0** and Database Contents License (DbCL).
* **Ethical Standards**: Contains exclusively public food product specifications; no personal or private user data is involved.


