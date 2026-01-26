import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export class CryptoUtil {
  // Genera un ID único para Tenants o Usuarios
  static generateId(): string {
    return uuidv4();
  }

  // Crea un hash simple para passwords (puedes mejorar esto con bcrypt luego)
  static hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  // Compara si un texto coincide con un hash
  static comparePassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }
}
