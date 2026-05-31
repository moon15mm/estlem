import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Staff } from '../../database/entities/staff.entity';
import { StaffRole } from '@estlem/shared';
import { CreateStaffDto } from './dto/create-staff.dto';

export { CreateStaffDto };

@Injectable()
export class StaffService {
  constructor(@InjectRepository(Staff) private repo: Repository<Staff>) {}

  async findByStore(storeId: string, tenantId: string): Promise<Staff[]> {
    return this.repo.find({ where: { storeId, tenantId, isActive: true } });
  }

  async create(dto: CreateStaffDto, tenantId: string): Promise<Staff> {
    const staff = this.repo.create({ ...dto, tenantId });
    if (dto.pin) staff.pinHash = await bcrypt.hash(dto.pin, 10);
    if (dto.password) staff.passwordHash = await bcrypt.hash(dto.password, 10);
    return this.repo.save(staff);
  }

  async deactivate(id: string, tenantId: string): Promise<void> {
    const staff = await this.repo.findOne({ where: { id, tenantId } });
    if (!staff) throw new NotFoundException('Staff not found');
    staff.isActive = false;
    await this.repo.save(staff);
  }

  async updateFcmToken(id: string, fcmToken: string): Promise<void> {
    await this.repo.update(id, { fcmToken });
  }
}
