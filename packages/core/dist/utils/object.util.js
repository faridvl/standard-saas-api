"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectUtil = void 0;
class ObjectUtil {
    static excludeFields(obj, keys) {
        const newObj = { ...obj };
        keys.forEach((key) => delete newObj[key]);
        return newObj;
    }
}
exports.ObjectUtil = ObjectUtil;
//# sourceMappingURL=object.util.js.map