import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import * as catalogData from '../../data/saudi-catalog.json';

interface CatalogItem {
  name: string;
  nameAr: string;
  price: number;
  sku: string;
}

interface CatalogCategory {
  category: string;
  categoryEn: string;
  icon: string;
  items: CatalogItem[];
}

type CatalogByStore = Record<string, CatalogCategory[]>;

const CATALOG: CatalogByStore = catalogData as unknown as CatalogByStore;

// Categories that are universally suitable (any store can use)
const FALLBACK_KEY = 'grocery';

@Controller('catalog')
export class CatalogController {
  @Get()
  getAll(
    @Query('storeCategory') storeCategory?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    // Map store category to catalog key
    const key = (storeCategory && CATALOG[storeCategory]) ? storeCategory : FALLBACK_KEY;
    let catalog = CATALOG[key] ?? [];

    if (category) {
      catalog = catalog.filter(
        (c) => c.category === category || c.categoryEn.toLowerCase() === category.toLowerCase(),
      );
    }

    if (search) {
      const q = search.toLowerCase();
      catalog = catalog
        .map((c) => ({
          ...c,
          items: c.items.filter(
            (i) =>
              i.name.toLowerCase().includes(q) ||
              i.nameAr.includes(q) ||
              i.sku.toLowerCase().includes(q),
          ),
        }))
        .filter((c) => c.items.length > 0);
    }

    return catalog;
  }

  @Get('categories')
  getCategories(@Query('storeCategory') storeCategory?: string) {
    const key = (storeCategory && CATALOG[storeCategory]) ? storeCategory : FALLBACK_KEY;
    const catalog = CATALOG[key] ?? [];
    return catalog.map((c) => ({
      name: c.category,
      nameEn: c.categoryEn,
      icon: c.icon,
      count: c.items.length,
    }));
  }

  @Get('store-categories')
  getStoreCategories() {
    return Object.keys(CATALOG).map((key) => ({
      key,
      categoriesCount: CATALOG[key].length,
      productsCount: CATALOG[key].reduce((s, c) => s + c.items.length, 0),
    }));
  }
}
