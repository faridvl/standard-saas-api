// Configuración y variables de entorno
export * from './config/env';

// Infraestructura y Repositorios
export * from './adapters/repositories/dynamo/dynamo-base.repository';

// Filtros y Validaciones (los que ya teníamos)
export * from './adapters/filters/global-exception.filter';
export * from './adapters/pipes/zod-validation.pipe';
// Exporta el pipe para que esté disponible en @project/core
export * from './adapters/pipes/zod-validation.pipe';

// También exporta el filtro si ya lo creaste
export * from './adapters/filters/global-exception.filter';

export * from './adapters/logger/app-logger';

// ... tus exportaciones actuales
export * from './interfaces/auth.interface';
export * from './decorators/current-user.decorator';
export * from './guards/auth.guard';
export * from './guards/roles.guard';
