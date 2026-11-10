import { Injectable, NotFoundException } from '@nestjs/common';
import { UserStorage } from '../../../infrastructure/adapters/user.storage';
import { UserActor, UserDomain } from '../../types/user.types';

/** Lo único que expone la firma de un profesional: nombre, título y colegiado. */
export type UserSignature = Pick<
  UserDomain,
  'uuid' | 'fullName' | 'professionalTitle' | 'licenseNumber'
>;

@Injectable()
export class GetUserSignatureUseCase {
  constructor(private readonly userStorage: UserStorage) {}

  /**
   * Cualquier usuario de la clínica puede leerla: un informe se imprime igual sin importar quién
   * lo imprime. Incluye usuarios inactivos para que un informe viejo conserve su firma.
   */
  async execute(uuid: string, actor: UserActor): Promise<UserSignature> {
    const user = await this.userStorage.findByUuidAndTenant(uuid, actor.tenantUuid);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return {
      uuid: user.uuid,
      fullName: user.fullName,
      professionalTitle: user.professionalTitle ?? null,
      licenseNumber: user.licenseNumber ?? null,
    };
  }
}
