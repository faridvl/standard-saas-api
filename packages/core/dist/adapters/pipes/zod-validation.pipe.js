"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZodValidationPipe = void 0;
const common_1 = require("@nestjs/common");
class ZodValidationPipe {
    constructor(schema) {
        this.schema = schema;
    }
    transform(value, metadata) {
        if (metadata.type !== 'body') {
            return value;
        }
        const valueToValidate = value ?? {};
        const result = this.schema.safeParse(valueToValidate);
        if (!result.success) {
            const errorMessages = result.error.issues.map((issue) => ({
                field: issue.path.join('.') || 'body',
                message: issue.message,
            }));
            throw new common_1.BadRequestException({
                success: false,
                statusCode: 400,
                message: 'Validation failed',
                details: errorMessages,
            });
        }
        return result.data;
    }
}
exports.ZodValidationPipe = ZodValidationPipe;
//# sourceMappingURL=zod-validation.pipe.js.map