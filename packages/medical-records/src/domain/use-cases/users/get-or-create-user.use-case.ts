import { Injectable } from '@nestjs/common';
import { UserStorage } from '@medical-records/infrastructure/adapters/userRepository/user.storage';
import { IdentityRepository } from '@medical-records/infrastructure/adapters/identityRepository/identity.repository';

/** Tiempo que vale la copia local antes de volver a preguntarle el nombre a identity. */
export const USER_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Resuelve el nombre de un usuario a partir de su uuid.
 *
 * Usa la copia local (poblada por un get-or-create previo) mientras sea reciente; si no existe,
 * o tiene más de USER_CACHE_TTL_MS, la pide a identity y la guarda, así un usuario renombrado se
 * ve con su nombre nuevo en notas e historial en pocos minutos.
 *
 * Si el uuid viene vacío, o identity no responde (o no está configurada la URL), devuelve el nombre
 * local si lo hay, o null: el nombre del autor es informativo, no crítico.
 */
@Injectable()
export class GetOrCreateUserUseCase {
  constructor(
    private readonly userStorage: UserStorage,
    private readonly identityRepository: IdentityRepository,
  ) {}

  async execute(uuid: string, tenantUuid: string): Promise<string | null> {
    // Sin autor conocido (p. ej. notas migradas): no hay nada que resolver ni que pedir a identity.
    if (!uuid || !uuid.trim()) {
      return null;
    }

    const localUser = await this.userStorage.findByUuid(uuid);
    if (localUser && Date.now() - localUser.updatedAt.getTime() < USER_CACHE_TTL_MS) {
      return localUser.fullName;
    }

    const identityUser = await this.identityRepository.getUser(uuid, tenantUuid);
    if (!identityUser) {
      return localUser?.fullName ?? null;
    }

    const savedUser = await this.userStorage.upsert(
      identityUser.uuid,
      tenantUuid,
      identityUser.fullName,
    );
    return savedUser.fullName;
  }
}
