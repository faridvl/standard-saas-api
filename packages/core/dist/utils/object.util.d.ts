export declare class ObjectUtil {
    static excludeFields<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K>;
}
