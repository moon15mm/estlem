import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, FindOptionsWhere } from 'typeorm';
import { Product } from '../../database/entities/product.entity';
import { ProductCategory } from '../../database/entities/product-category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(ProductCategory) private categoryRepo: Repository<ProductCategory>,
  ) {}

  async findAll(storeId: string, tenantId: string, query: {
    search?: string;
    categoryId?: string;
    limit?: string;
    offset?: string;
  }) {
    const where: FindOptionsWhere<Product> = { storeId, tenantId, isActive: true };
    if (query.categoryId) where.categoryId = query.categoryId;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.storeId = :storeId AND p.tenantId = :tenantId AND p.isActive = true', { storeId, tenantId })
      .leftJoinAndSelect('p.category', 'category')
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('p.name', 'ASC');

    if (query.search) {
      qb.andWhere('(p.name ILIKE :q OR p.nameAr ILIKE :q OR p.sku ILIKE :q)', {
        q: `%${query.search}%`,
      });
    }
    if (query.categoryId) qb.andWhere('p.categoryId = :cid', { cid: query.categoryId });

    const limit = parseInt(query.limit ?? '50', 10);
    const offset = parseInt(query.offset ?? '0', 10);
    qb.take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findById(id: string, tenantId: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id, tenantId } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto, storeId: string, tenantId: string): Promise<Product> {
    const product = this.productRepo.create({ ...dto, storeId, tenantId });
    return this.productRepo.save(product);
  }

  async update(id: string, dto: UpdateProductDto, tenantId: string): Promise<Product> {
    const product = await this.findById(id, tenantId);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const product = await this.findById(id, tenantId);
    product.isActive = false;
    await this.productRepo.save(product);
  }

  async bulkUpsert(products: Partial<Product>[], storeId: string, tenantId: string) {
    const entities = products.map((p) =>
      this.productRepo.create({ ...p, storeId, tenantId }),
    );
    await this.productRepo.upsert(entities, ['tenantId', 'storeId', 'sku']);
    return { upserted: entities.length };
  }

  async getCategories(storeId: string, tenantId: string) {
    return this.categoryRepo.find({
      where: { storeId, tenantId },
      order: { sortOrder: 'ASC' },
    });
  }

  async createCategory(
    storeId: string,
    tenantId: string,
    dto: { name?: string; nameAr: string; sortOrder?: number; imageUrl?: string },
  ) {
    const nameAr = dto.nameAr?.trim();
    const name = dto.name?.trim() || nameAr;

    if (!nameAr) throw new BadRequestException('Category Arabic name is required');

    const category = this.categoryRepo.create({
      storeId,
      tenantId,
      name,
      nameAr,
      sortOrder: dto.sortOrder ?? 0,
      imageUrl: dto.imageUrl,
    });

    return this.categoryRepo.save(category);
  }

  async updateCategory(
    id: string,
    tenantId: string,
    dto: { name?: string; nameAr?: string; sortOrder?: number; imageUrl?: string },
  ) {
    const category = await this.categoryRepo.findOne({ where: { id, tenantId } });
    if (!category) throw new NotFoundException('Category not found');

    if (dto.name !== undefined) category.name = dto.name.trim();
    if (dto.nameAr !== undefined) category.nameAr = dto.nameAr.trim();
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
    if (dto.imageUrl !== undefined) category.imageUrl = dto.imageUrl;

    if (!category.nameAr) throw new BadRequestException('Category Arabic name is required');
    if (!category.name) category.name = category.nameAr;

    return this.categoryRepo.save(category);
  }
}
