import { Controller, Post, Body, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCategory } from '../../database/entities/product-category.entity';
import { Product } from '../../database/entities/product.entity';
import { saudiCategories, saudiProducts } from '../../database/seeds/saudi-products';

@ApiTags('Saudi Catalog')
@ApiBearerAuth()
@Controller('catalog/saudi')
export class SaudiCatalogController {
  constructor(
    @InjectRepository(ProductCategory)
    private catRepo: Repository<ProductCategory>,
    @InjectRepository(Product)
    private prodRepo: Repository<Product>,
  ) {}

  @Post('import')
  @ApiOperation({ summary: 'Import 73 Saudi products with categories in one click' })
  async importSaudiCatalog(@Req() req: any, @Body() body: { storeId: string }) {
    const tenantId = req.user.tenantId;
    const storeId = body.storeId;

    // Create categories
    const categoryMap = new Map<string, string>();
    for (const cat of saudiCategories) {
      const existing = await this.catRepo.findOne({
        where: { storeId, name: cat.name },
      });
      if (existing) {
        categoryMap.set(cat.key, existing.id);
      } else {
        const created = await this.catRepo.save(this.catRepo.create({
          storeId,
          tenantId,
          name: cat.name,
          nameAr: cat.nameAr,
          sortOrder: cat.sortOrder,
          isActive: true,
        }));
        categoryMap.set(cat.key, created.id);
      }
    }

    // Create products
    let importedCount = 0;
    for (const prod of saudiProducts) {
      const exists = await this.prodRepo.findOne({
        where: { storeId, name: prod.name },
      });
      if (!exists) {
        await this.prodRepo.save(this.prodRepo.create({
          storeId,
          tenantId,
          categoryId: categoryMap.get(prod.categoryKey),
          name: prod.name,
          nameAr: prod.nameAr,
          price: prod.price,
          isActive: true,
          trackInventory: false,
        }));
        importedCount++;
      }
    }

    return {
      success: true,
      categoriesCreated: saudiCategories.length,
      productsImported: importedCount,
      totalProducts: saudiProducts.length,
      message: `Imported ${importedCount} Saudi products across ${saudiCategories.length} categories`,
    };
  }
}
