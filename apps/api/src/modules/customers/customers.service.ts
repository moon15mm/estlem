import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../database/entities/customer.entity';
import { CustomerVehicle } from '../../database/entities/customer-vehicle.entity';
import { BlockedCustomer } from '../../database/entities/blocked-customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerVehicle) private vehicleRepo: Repository<CustomerVehicle>,
    @InjectRepository(BlockedCustomer) private blockedRepo: Repository<BlockedCustomer>,
  ) {}

  // ─── Customer profile ─────────────────────────────────────────

  async getMyProfile(customerId: string) {
    const customer = await this.customerRepo.findOne({
      where: { id: customerId },
      relations: ['vehicles'],
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async updateMyProfile(customerId: string, data: { fullName?: string; preferredLang?: string }) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (data.fullName) customer.fullName = data.fullName;
    if (data.preferredLang) (customer as any).preferredLang = data.preferredLang;
    return this.customerRepo.save(customer);
  }

  // ─── Vehicles ─────────────────────────────────────────────────

  async addVehicle(customerId: string, data: { make: string; model: string; color: string; plateNumber: string; isDefault?: boolean }) {
    if (data.isDefault) {
      // unset previous defaults
      await this.vehicleRepo.update({ customerId }, { isDefault: false });
    }
    const vehicle = this.vehicleRepo.create({ ...data, customerId });
    return this.vehicleRepo.save(vehicle);
  }

  async deleteVehicle(customerId: string, vehicleId: string) {
    const vehicle = await this.vehicleRepo.findOne({ where: { id: vehicleId, customerId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    await this.vehicleRepo.remove(vehicle);
    return { success: true };
  }

  // ─── Block / Unblock (store-side) ─────────────────────────────

  async isBlocked(customerId: string, tenantId: string): Promise<boolean> {
    const count = await this.blockedRepo.count({ where: { tenantId, customerId } });
    return count > 0;
  }

  async ensureNotBlocked(customerId: string, tenantId: string) {
    if (await this.isBlocked(customerId, tenantId)) {
      throw new ForbiddenException('تم حظرك من هذا المتجر. للاستفسار، يرجى التواصل مع إدارة المحل.');
    }
  }

  async blockCustomer(customerId: string, tenantId: string, staffId: string, reason?: string) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const existing = await this.blockedRepo.findOne({ where: { tenantId, customerId } });
    if (existing) throw new ConflictException('Customer is already blocked');

    const blocked = this.blockedRepo.create({
      tenantId,
      customerId,
      mobile: customer.mobile,
      blockedBy: staffId,
      reason,
    });
    return this.blockedRepo.save(blocked);
  }

  async unblockCustomer(customerId: string, tenantId: string) {
    const result = await this.blockedRepo.delete({ tenantId, customerId });
    if (!result.affected) throw new NotFoundException('Customer is not blocked');
    return { success: true };
  }

  async listBlocked(tenantId: string) {
    const blocked = await this.blockedRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    // Enrich with customer name
    const enriched = await Promise.all(
      blocked.map(async (b) => {
        const c = await this.customerRepo.findOne({ where: { id: b.customerId } });
        return { ...b, fullName: c?.fullName ?? null };
      }),
    );
    return enriched;
  }
}
