import { SetMetadata } from '@nestjs/common';
import { StaffRole, SystemRole } from '@estlem/shared';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: (StaffRole | SystemRole)[]) => SetMetadata(ROLES_KEY, roles);
