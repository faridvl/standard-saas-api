export declare class CryptoUtil {
    static generateId(): string;
    static hashPassword(password: string): string;
    static comparePassword(password: string, hash: string): boolean;
}
