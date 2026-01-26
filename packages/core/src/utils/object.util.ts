export class ObjectUtil {
  /**
   * Elimina campos sensibles de un objeto (como passwords)
   * antes de enviarlo al frontend
   */
  static excludeFields<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const newObj = { ...obj };
    keys.forEach((key) => delete newObj[key]);
    return newObj;
  }
}
