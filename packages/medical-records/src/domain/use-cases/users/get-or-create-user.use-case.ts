import { Injectable } from '@nestjs/common';
import { UserStorage } from '@medical-records/infrastructure/adapters/userRepository/user.storage';
import { IdentityRepository } from '@medical-records/infrastructure/adapters/identityRepository/identity.repository';

/**
 * Resuelve el nombre de un usuario a partir de su uuid.
 *
 * Primero busca la copia local (poblada por otro get-or-create previo);
 * si no existe, la pide a identity y la guarda para las próximas veces.
 * Igual que el patrón de service-core-comx (GetUser.getOrCreateUser en
 * billing): la copia local puede quedar desactualizada si el usuario
 * cambia de nombre en identity, se acepta ese trade-off.
 *
 * Si identity no responde (o no está configurada la URL), devuelve null
 * en vez de fallar: el nombre del autor es informativo, no crítico.
 */
@Injectable()
export class GetOrCreateUserUseCase {
  constructor(
    private readonly userStorage: UserStorage,
    private readonly identityRepository: IdentityRepository,
  ) {}

  async execute(uuid: string, tenantUuid: string): Promise<string | null> {
    const localUser = await this.userStorage.findByUuid(uuid);
    if (localUser) {
      return localUser.fullName;
    }

    const identityUser = await this.identityRepository.getUser(uuid, tenantUuid);
    if (!identityUser) {
      return null;
    }

    const savedUser = await this.userStorage.upsert(
      identityUser.uuid,
      tenantUuid,
      identityUser.fullName,
    );
    return savedUser.fullName;
  }
}
