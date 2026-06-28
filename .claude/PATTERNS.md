# Patterns & Conventions

## Naming

- **Files:** kebab-case, suffix indicates role: `create-patient.use-case.ts`, `patient.storage.ts`, `create-patient.dto.ts`
- **Classes:** PascalCase; Use Cases named `<Action><Entity>UseCase`; Storages named `<Entity>Storage`
- **Variables/params:** camelCase; domain UUIDs always include "Uuid" or "UUID" in the name (e.g., `tenantUuid`, `patientUUID` — casing is inconsistent between services, match existing file's style)
- **Enums:** PascalCase enum name, UPPER_SNAKE values
- **No barrel `index.ts` inside service packages** — import by full path or use tsconfig path aliases

## Path aliases (medical-records)

Configured in `packages/medical-records/tsconfig.json`:
- `@medical-records/domain/*` → `src/domain/*`
- `@medical-records/app/*` → `src/app/*`
- `@medical-records/infrastructure/*` → `src/infrastructure/*`

Identity service uses relative imports (no aliases). `@project/core` is a workspace package.

## Validation

Always use `ZodValidationPipe` from `@project/core` on the body:
```typescript
@Post()
@UsePipes(new ZodValidationPipe(MySchema))
async create(@Body() dto: MyDto) { ... }
```

Define schema and inferred type together in the DTO file:
```typescript
export const MySchema = z.object({ ... });
export type MyDto = z.infer<typeof MySchema>;
```

`ZodValidationPipe` only validates `metadata.type === 'body'` — path params and query strings pass through unvalidated.

## Error handling

- Throw NestJS built-ins: `NotFoundException`, `ConflictException`, `UnauthorizedException`, `BadRequestException`
- `GlobalExceptionFilter` (registered globally in `main.ts`) catches everything and formats:
  ```json
  { "success": false, "statusCode": N, "message": "...", "details": null, "timestamp": "ISO" }
  ```
- `details` is populated from Zod validation errors (array of `{ field, message }`)
- Domain errors extend `BaseError` (from core) but NestJS HttpExceptions are preferred in use cases for correct HTTP status codes

## Controller structure

```typescript
@Controller('resource')
@UseGuards(AuthGuard)           // class-level guard for all methods
export class ResourceController {
  constructor(
    private readonly createUseCase: CreateResourceUseCase,
    // one use case per operation
  ) {}

  @Post()
  @UsePipes(new ZodValidationPipe(CreateResourceSchema))
  async create(@Body() dto: CreateResourceDto, @CurrentUser() user: JwtPayload) {
    return await this.createUseCase.execute(dto, { tenantUuid: user.tenantUuid });
  }
}
```

- Controllers never contain business logic
- Return the use case result directly (NestJS serializes to JSON)
- Always pass `tenantUuid` (or the full user context) from `@CurrentUser()` to the use case

## Use case structure

```typescript
@Injectable()
export class CreateResourceUseCase {
  constructor(private readonly storage: ResourceStorage) {}

  async execute(dto: CreateResourceDto, context: { tenantUuid: string }): Promise<ResourceType> {
    // validate business rules, throw NestJS exceptions on violations
    return await this.storage.save(dto, context.tenantUuid);
  }
}
```

## Storage (repository) structure

- Named `*Storage`, implements one Prisma model
- Always scopes queries to `tenantUuid`
- Never exposes Prisma types to callers — maps rows to domain types in a `mapToDomain()` private method
- Accepts optional `tx?: Prisma.TransactionClient` for operations that need to participate in a transaction

## Auth rules

- `AuthGuard` is applied at class level on every protected controller
- `@CurrentUser()` gives a `JwtPayload`: `{ sub (userUuid), email, role, tenantId, tenantUuid }`
- JWT issued by identity service with `1h` expiry
- The `role` field is in the token but `RolesGuard` is not currently wired up anywhere

## Pagination

All list endpoints return `PaginatedResponse<T>`:
```typescript
{
  data: T[],
  meta: { total: number, page: number, limit: number, totalPages: number }
}
```
Query params `page` (default 1) and `limit` (default 10) are strings — convert with `Number()` before passing to use cases.

## ESLint rules to respect

- `@typescript-eslint/no-explicit-any`: **error** — do not use `any`
- `@typescript-eslint/explicit-module-boundary-types`: **error** — always type function return values
- `@typescript-eslint/no-unused-vars`: warn (underscore prefix exempted)
- No `@ts-ignore` without a description comment

## Adding a new endpoint (checklist)

1. Create Zod schema + inferred DTO type in `src/app/dtos/`
2. Create use case in `src/domain/use-cases/`
3. Add storage method if needed (always scope by `tenantUuid`)
4. Add use case + storage to the module's `providers` array
5. Add controller method with `@UseGuards`, `@UsePipes`, `@CurrentUser`
6. **Update `.claude/ENDPOINTS.md`** with method, path, body, response, and status
