import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Store } from '../../database/entities/store.entity';
import { ParkingSpot } from '../../database/entities/parking-spot.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateParkingSpotsDto } from './dto/create-parking-spots.dto';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store) private storeRepo: Repository<Store>,
    @InjectRepository(ParkingSpot) private spotRepo: Repository<ParkingSpot>,
  ) {}

  async findByTenant(tenantId: string): Promise<Store[]> {
    return this.storeRepo.find({ where: { tenantId, isActive: true } });
  }

  async findById(id: string): Promise<Store> {
    const store = await this.storeRepo.findOne({
      where: { id, isActive: true },
      relations: ['parkingSpots'],
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async findByQr(qrCode: string): Promise<{ store: Store; spot: ParkingSpot }> {
    const spot = await this.spotRepo.findOne({
      where: { qrCode, isActive: true },
      relations: ['store'],
    });
    if (!spot) throw new NotFoundException('Invalid QR code');
    return { store: spot.store, spot };
  }

  async create(dto: CreateStoreDto, tenantId: string): Promise<Store> {
    const store = this.storeRepo.create({ ...dto, tenantId });
    return this.storeRepo.save(store);
  }

  async update(id: string, dto: Partial<CreateStoreDto>, tenantId: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { id, tenantId } });
    if (!store) throw new NotFoundException('Store not found');
    Object.assign(store, dto);
    return this.storeRepo.save(store);
  }

  async updateLanguages(
    id: string,
    dto: { defaultLanguage?: string; supportedLanguages?: string[] },
    tenantId: string,
  ): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { id, tenantId } });
    if (!store) throw new NotFoundException('Store not found');
    if (dto.defaultLanguage) store.defaultLanguage = dto.defaultLanguage as any;
    if (dto.supportedLanguages?.length) store.supportedLanguages = dto.supportedLanguages as any;
    return this.storeRepo.save(store);
  }

  async createParkingSpots(storeId: string, dto: CreateParkingSpotsDto, tenantId: string) {
    const store = await this.storeRepo.findOne({ where: { id: storeId, tenantId } });
    if (!store) throw new NotFoundException('Store not found');

    const spotType = dto.type ?? 'parking';
    const prefix = spotType === 'table' ? 'TBL' : 'SP';

    const spots: ParkingSpot[] = [];
    for (const spotNumber of dto.spotNumbers) {
      // Embed type in spotNumber: "T:1" for table, just "1" for parking
      const storedNumber = spotType === 'table' ? `T:${spotNumber}` : spotNumber;
      const qrCode = `${prefix}-${storeId.slice(0, 8)}-${spotNumber}-${uuidv4().slice(0, 8)}`;
      const spot = this.spotRepo.create({ storeId, spotNumber: storedNumber, qrCode });
      spots.push(spot);
    }
    await this.spotRepo.save(spots as any);
    return spots;
  }

  async findSpotsByStore(storeId: string) {
    return this.spotRepo.find({ where: { storeId, isActive: true }, order: { spotNumber: 'ASC' } });
  }

  async searchByName(query: string, limit = 20): Promise<Store[]> {
    return this.storeRepo
      .createQueryBuilder('store')
      .where('store.isActive = true')
      .andWhere('(store.name ILIKE :q OR store.nameAr ILIKE :q)', { q: `%${query}%` })
      .select([
        'store.id', 'store.name', 'store.nameAr', 'store.category',
        'store.address', 'store.lat', 'store.lng', 'store.logoUrl',
        'store.coverUrl', 'store.tenantId',
      ])
      .take(limit)
      .getMany();
  }

  async findNearby(lat: number, lng: number, radiusKm = 10, limit = 20) {
    const stores = await this.storeRepo
      .createQueryBuilder('store')
      .addSelect(
        `(6371 * acos(cos(radians(:lat)) * cos(radians(store.lat)) * cos(radians(store.lng) - radians(:lng)) + sin(radians(:lat)) * sin(radians(store.lat))))`,
        'distance',
      )
      .where('store.isActive = true')
      .andWhere('store.lat IS NOT NULL')
      .andWhere('store.lng IS NOT NULL')
      .having('distance < :radius', { radius: radiusKm })
      .setParameters({ lat, lng })
      .orderBy('distance', 'ASC')
      .limit(limit)
      .getRawAndEntities();

    return stores.entities.map((store, i) => ({
      ...store,
      distance: parseFloat(stores.raw[i]?.distance ?? '0'),
    }));
  }
}
