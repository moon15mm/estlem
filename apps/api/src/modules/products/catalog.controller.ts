import { Controller, Get, Query } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

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

let catalogCache: CatalogCategory[] | null = null;

function loadCatalog(): CatalogCategory[] {
  if (catalogCache) return catalogCache;
  const raw = readFileSync(join(__dirname, '..', '..', 'data', 'saudi-catalog.json'), 'utf-8');
  catalogCache = JSON.parse(raw);
  return catalogCache!;
}

@Controller('catalog')
export class CatalogController {
  @Get()
  getAll(@Query('search') search?: string, @Query('category') category?: string) {
    let catalog = loadCatalog();

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
    return loadCatalog().map((c) => ({
      name: c.category,
      nameEn: c.categoryEn,
      count: c.items.length,
    }));
  }
}
