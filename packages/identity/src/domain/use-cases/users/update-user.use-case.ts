import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserStorage, UpdateUserParams } from '../../../infrastructure/adapters/user.storage';
import { ATTENDS_PATIENTS_NEEDS_SPECIALTY_MESSAGE } from '../../validations/professional.schema';
import {
  OWNER_ONLY_MESSAGE,
  OWN_MEDIA_ONLY_MESSAGE,
  OWN_PROFESSIONAL_ONLY_MESSAGE,
  assertCanAdministerUsers,
  assertCanManageTarget,
  assertTenantKeepsOwner,
  isOwner,
  resolveActiveActor,
} from '../../policies/user-admin.policy';
import { diffAccess, sameSpecialties } from '../../utils/user-audit.util';
import { UserActor, UserDomain, UserRole } from '../../types/user.types';

export type UpdateUserData = UpdateUserParams;

@Injectable()
export class UpdateUserUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  /** La firma y la foto solo las cambia su dueño: se llama antes de subir el archivo al bucket. */
  async assertCanChangeOwnMedia(uuid: string, actor: UserActor): Promise<void> {
    if (actor.uuid !== uuid) throw new ForbiddenException(OWN_MEDIA_ONLY_MESSAGE);
    await resolveActiveActor(this.userStorage, actor);
  }

  async execute(uuid: string, actor: UserActor, data: UpdateUserData): Promise<UserDomain> {
    const current = await resolveActiveActor(this.userStorage, actor);
    const isSelf = actor.uuid === uuid;

    if ((data.signatureUrl !== undefined || data.avatarUrl !== undefined) && !isSelf) {
      throw new ForbiddenException(OWN_MEDIA_ONLY_MESSAGE);
    }

    if (!isSelf) assertCanAdministerUsers(current);

    const existing = isSelf
      ? current
      : await this.userStorage.findByUuidAndTenant(uuid, actor.tenantUuid);
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    if (!isSelf) assertCanManageTarget(current, existing);

    // Se compara con el valor actual para que un formulario que reenvía lo mismo no falle.
    const titleChanged =
      data.professionalTitle !== undefined &&
      (data.professionalTitle ?? null) !== (existing.professionalTitle ?? null);
    const licenseChanged =
      data.licenseNumber !== undefined &&
      (data.licenseNumber ?? null) !== (existing.licenseNumber ?? null);
    if ((titleChanged || licenseChanged) && !isSelf) {
      throw new ForbiddenException(OWN_PROFESSIONAL_ONLY_MESSAGE);
    }

    const roleChanged = data.role !== undefined && data.role !== existing.role;
    if (roleChanged) {
      assertCanAdministerUsers(current);
      if (isSelf) throw new BadRequestException('No puedes cambiar tu propio nivel de acceso');
      const touchesOwnerLevel = data.role === UserRole.OWNER || existing.role === UserRole.OWNER;
      if (touchesOwnerLevel && !isOwner(current)) throw new ForbiddenException(OWNER_ONLY_MESSAGE);
    }

    const attendsChanged =
      data.attendsPatients !== undefined && data.attendsPatients !== existing.attendsPatients;
    const specialtiesChanged =
      data.specialties !== undefined && !sameSpecialties(data.specialties, existing.specialties);
    if ((attendsChanged || specialtiesChanged) && !isOwner(current)) {
      throw new ForbiddenException(OWNER_ONLY_MESSAGE);
    }

    const attendsPatients = data.attendsPatients ?? existing.attendsPatients;
    let specialties = data.specialties ?? existing.specialties;
    if (!attendsPatients) specialties = [];
    else if (specialties.length === 0) {
      throw new BadRequestException(ATTENDS_PATIENTS_NEEDS_SPECIALTY_MESSAGE);
    }

    const demotesOwner = roleChanged && existing.role === UserRole.OWNER;
    if (demotesOwner) {
      await assertTenantKeepsOwner(this.userStorage, actor.tenantUuid, existing.uuid);
    }

    const role = data.role ?? existing.role;
    const audit = diffAccess(current, existing, { role, attendsPatients, specialties });

    return await this.userStorage.update(
      uuid,
      { ...data, attendsPatients, specialties },
      audit,
      demotesOwner,
    );
  }
}
