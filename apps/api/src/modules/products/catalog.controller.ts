import { Controller, Get, Query } from '@nestjs/common';
import * as catalogData from '../../data/saudi-catalog.json';

interface CatalogItem {
  name: string;
  nameAr: string;
  price: number;
  sku: string;
  imageUrl: string;
}

interface CatalogCategory {
  category: string;
  categoryEn: string;
  items: CatalogItem[];
}

const CATALOG: CatalogCategory[] = catalogData as unknown as CatalogCategory[];

@Controller('catalog')
export class CatalogController {
  @Get()
  getAll(@Query('search') search?: string, @Query('category') category?: string) {
    let catalog = CATALOG;

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
  getCategories() {
    return CATALOG.map((c) => ({
      name: c.category,
      nameEn: c.categoryEn,
      count: c.items.length,
    }));
  }
}
