import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { CatalogController } from './catalog.controller';
import { ProductsService } from './products.service';
import { Product } from '../../database/entities/product.entity';
import { ProductCategory } from '../../database/entities/product-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductCategory])],
  controllers: [ProductsController, CatalogController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
