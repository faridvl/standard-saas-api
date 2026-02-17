# 🚀 Standard SaaS API Framework

Arquitectura robusta basada en **NestJS**, **Arquitectura Hexagonal**, y despliegue **Serverless (AWS Lambda)**. Diseñada para sistemas multi-tenant escalables utilizando **Prisma 7**.

---

## 📝 Notas para Desarrolladores (Mantenimiento de DB)

Si necesitas modificar la base de datos o es tu primera vez levantando el proyecto, sigue estas guías:

### Cuando es la primera vez (Generar Base de Datos)
Para que el sistema reconozca los modelos de Prisma por primera vez:
1. Asegúrate de tener el contenedor activo: `yarn db:up`
2. Genera el cliente:
   ```bash
   yarn workspace @project/identity-service run prisma generate
   ```
## Cuando realizas una Migración (Cambios en tablas)
### Gestión de Identidad (Identity Service)
- **Generar Cliente:** `yarn identity:prisma:gen`
- **Crear Migración:** `yarn identity:prisma:migrate --name nombre_cambio`

## 📋 Requerimientos Previos
Antes de comenzar, asegúrate de tener instalados:
- **Node.js**: v20.x (Usar `.nvmrc`)
- **Yarn**: v1.22+
- **Docker & Docker Compose**: Indispensable para bases de datos PostgreSQL locales.
- **Postman**: Para pruebas de integración de los endpoints.

---

## 🏗️ Boilerplate del Proyecto (Estructura)

El proyecto sigue los principios de **Clean Architecture**, dividiendo la lógica en capas para facilitar el mantenimiento y escalabilidad:

```text
packages/identity/
├── prisma/
│   ├── schema.prisma       # Definición de modelos y base de datos
│   ├── prisma.config.ts    # Configuración de Prisma 7
│   └── seed.ts             # Script de datos iniciales
├── src/
│   ├── domain/             # Entidades y reglas de negocio puras
│   ├── application/        # Casos de uso (Lógica de la aplicación)
│   ├── infrastructure/     # Implementaciones técnicas
│   │   ├── adapters/       # Prisma, Repositorios, Storage
│   │   ├── controllers/    # Controladores REST (Entry points)
│   │   └── modules/        # Configuración de Módulos NestJS
│   └── main.ts             # Punto de arranque de la aplicación
└── .env                    # Variables de entorno locales
```

## 🛠️ Setup Inicial (Paso a Paso)
Sigue este orden exacto desde la raíz del proyecto para inicializar el entorno:

Levantar Infraestructura (Docker):

```text 
yarn db:up
```
Esto enciende un contenedor de PostgreSQL. Asegúrate de tener Docker Desktop abierto.

Instalar Dependencias:

```text
yarn install
```
Generar Cliente Prisma (Crucial) 🔑:

Bash
```text
yarn workspace @project/identity-service run prisma generate
```
Traduce el schema.prisma a código TypeScript. Es obligatorio ejecutarlo si el esquema cambia o es la primera instalación.

Sincronizar Base de Datos (Migraciones):

Bash
```text
 yarn workspace @project/identity-service run prisma:migrate
 ```
Ejecutar Microservicio:

Bash
```text
 yarn local:identity
 ```

## ⚙️ Detalles de Implementación (Para Devs)
Prisma 7 & Driver Adapters
Para garantizar estabilidad en monorepos y evitar errores de inicialización del motor binario de Prisma, utilizamos @prisma/adapter-pg. Esto permite que el PrismaService gestione el pool de conexiones mediante el driver nativo de Node.js (pg).

Onboarding Atómico (Transacciones)
El registro de Owners (Dueños) es una operación atómica. Utilizando $transaction, el sistema garantiza que:

Se cree el Tenant (Empresa).

Se cree el User (Admin) vinculado.

Si falla cualquier paso, se aplica un Rollback automático, evitando datos huérfanos.

## 🧪 Pruebas de API (Postman)
Cuando veas el log Nest application successfully started, realiza una prueba de registro:

Método: POST

```text
URL: http://localhost:7170/owners
```

Cuerpo (JSON):

JSON
```text
 {
  "businessName": "Clínica Dental Pro",
  "email": "admin@dentalpro.com",
  "password": "password123"
} 
```
## 🛡️ Estándares de Código
Arquitectura Hexagonal: Separación estricta entre Dominio, Aplicación e Infraestructura.



- **No any**: El linter bloqueará tipos no definidos para asegurar la integridad de TypeScript.

- **Precommit**: Husky validará Lint, Formato y Tests antes de permitir cualquier commit.

- **CI/CD**: GitHub Actions validará automáticamente cada Pull Request hacia develop y main.

Si necesitas modificar la base de datos o es tu primera vez levantando el proyecto, sigue estas guías:
