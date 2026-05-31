import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PosIntegration } from '../../database/entities/pos-integration.entity';
import { ProductsService } from '../products/products.service';
import { PosProvider } from '@estlem/shared';

// Adapter interface — each POS implements this
interface PosAdapter {
  getProducts(integration: PosIntegration): Promise<Record<string, unknown>[]>;
}

class FoodicsAdapter implements PosAdapter {
  async getProducts(integration: PosIntegration): Promise<Record<string, unknown>[]> {
    const { apiKey, branchId } = integration.credentials as {
      apiKey: string;
      branchId: string;
    };
    // Foodics API call
    const res = await fetch(`https://api.foodics.com/v5/products?branch_id=${branchId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });
    const json = (await res.json()) as { data: Record<string, unknown>[] };
    return json.data ?? [];
  }
}

class CsvAdapter implements PosAdapter {
  async getProducts(_integration: PosIntegration): Promise<Record<string, unknown>[]> {
    // CSV parsing happens via file upload endpoint
    return [];
  }
}

const ADAPTERS: Record<PosProvider, PosAdapter> = {
  [PosProvider.FOODICS]: new FoodicsAdapter(),
  [PosProvider.CSV]: new CsvAdapter(),
  [PosProvider.SQUARE]: new CsvAdapter(), // placeholder
  [PosProvider.MANUAL]: new CsvAdapter(), // placeholder
};

@Injectable()
export class PosService {
  constructor(
    @InjectRepository(PosIntegration) private integrationRepo: Repository<PosIntegration>,
    private productsService: ProductsService,
  ) {}

  async sync(integrationId: string, tenantId: string) {
    const integration = await this.integrationRepo.findOne({
      where: { id: integrationId, tenantId },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    const adapter = ADAPTERS[integration.provider];
    const rawProducts = await adapter.getProducts(integration);

    const mapped = rawProducts.map((p: Record<string, unknown>) => ({
      posRefId: String(p.id),
      name: String(p.name),
      nameAr: String(p.name_ar ?? p.name),
      sku: String(p.sku ?? p.reference ?? p.id),
      price: parseFloat(String(p.price ?? 0)),
      stockQuantity: parseInt(String(p.quantity ?? 0), 10),
      isActive: Boolean(p.is_active ?? true),
    }));

    const result = await this.productsService.bulkUpsert(
      mapped,
      integration.storeId,
      tenantId,
    );

    integration.lastSyncAt = new Date();
    integration.status = 'active';
    await this.integrationRepo.save(integration);

    return { ...result, syncedAt: integration.lastSyncAt };
  }

  async createIntegration(data: Partial<PosIntegration>, tenantId: string) {
    const integration = this.integrationRepo.create({ ...data, tenantId });
    return this.integrationRepo.save(integration);
  }

  async findByStore(storeId: string, tenantId: string) {
    return this.integrationRepo.find({ where: { storeId, tenantId } });
  }
}
