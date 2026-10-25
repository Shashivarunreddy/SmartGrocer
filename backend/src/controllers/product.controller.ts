import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20));
    const search = (req.query.search as string)?.trim();
    const category = (req.query.category as string)?.trim();

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
      }),
    ]);

    res.status(200).json({
      data: products,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params;

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

    res.status(200).json({ data: product });
  } catch (error) {
    next(error);
  }
}
