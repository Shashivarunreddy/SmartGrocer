import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { cacheGet, cacheSet } from "../config/redis";

// Redis Cache 1-Hour TTL (3600 seconds) for Catalogue products
const CACHE_TTL_SECONDS = 3600;

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20));
    const search = (req.query.search as string)?.trim();
    const category = (req.query.category as string)?.trim();

    const cacheKey = `products:list:${page}:${pageSize}:${search || "all"}:${category || "all"}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.status(200).json(cached);
      return;
    }
    res.setHeader("X-Cache", "MISS");

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { brands: { contains: search, mode: "insensitive" } },
          { category: { contains: search, mode: "insensitive" } },
          { code: { contains: search } },
        ],
      }),
      ...(category && {
        category: { contains: category, mode: "insensitive" },
      }),
    };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          brands: true,
          category: true,
          categoriesTags: true,
          imageUrl: true,
          unit: true,
          productQuantity: true,
          defaultUnitPrice: true,
          currency: true,
          isFood: true,
          isActive: true,
        },
      }),
    ]);

    const responsePayload = {
      data: products,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    // Store in Redis / In-Memory cache with 1-hour TTL
    await cacheSet(cacheKey, responsePayload, CACHE_TTL_SECONDS);

    res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params;
    const cacheKey = `products:id:${productId}`;
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.status(200).json({ data: cached });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      res.status(404).json({
        code: "PRODUCT_NOT_FOUND",
        message: `Product with ID '${productId}' was not found.`,
      });
      return;
    }

    await cacheSet(cacheKey, product, CACHE_TTL_SECONDS);
    res.setHeader("X-Cache", "MISS");
    res.status(200).json({ data: product });
  } catch (error) {
    next(error);
  }
}
