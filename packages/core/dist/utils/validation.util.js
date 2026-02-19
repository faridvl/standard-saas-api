"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaValidator = void 0;
class SchemaValidator {
    static validate(schema, data) {
        const result = schema.safeParse(data);
        if (!result.success) {
            const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
            throw new Error(`VALIDATION_FAILED: ${issues.join(', ')}`);
        }
        return result.data;
    }
}
exports.SchemaValidator = SchemaValidator;
//# sourceMappingURL=validation.util.js.map