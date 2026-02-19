"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppLogger = void 0;
const common_1 = require("@nestjs/common");
let AppLogger = class AppLogger {
    constructor() {
        this.context = 'App';
        this.logger = new common_1.Logger();
    }
    setContext(context) {
        this.context = context;
    }
    log(message, data) {
        this.logger.log(`${message} ${data ? `| Data: ${JSON.stringify(data)}` : ''}`, this.context);
    }
    error(message, trace, data) {
        this.logger.error(`${message} ${data ? `| Context Data: ${JSON.stringify(data)}` : ''}`, trace, this.context);
    }
    warn(message, data) {
        this.logger.warn(`${message} ${data ? `| Warning Data: ${JSON.stringify(data)}` : ''}`, this.context);
    }
    debug(message, data) {
        if (process.env.NODE_ENV !== 'production') {
            this.logger.debug(`${message} ${data ? `| Debug Data: ${JSON.stringify(data)}` : ''}`, this.context);
        }
    }
};
exports.AppLogger = AppLogger;
exports.AppLogger = AppLogger = __decorate([
    (0, common_1.Injectable)({ scope: common_1.Scope.TRANSIENT })
], AppLogger);
//# sourceMappingURL=app-logger.js.map