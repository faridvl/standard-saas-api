import { PrismaClient } from '@prisma/client';

// Constructor vacío: esto evita el ValidationError de Prisma
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed...');

  const tenant = await prisma.tenant.upsert({
    where: { uuid: 'default-tenant-uuid' },
    update: {},
    create: {
      businessName: 'Clinica Dental Central',
      uuid: 'default-tenant-uuid',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: {},
    create: {
      email: 'admin@admin.com',
      name: 'Admin',
      password: 'admin_password_123',
      tenantId: tenant.id,
    },
  });

  console.log('✅ Seed finalizado con éxito');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
