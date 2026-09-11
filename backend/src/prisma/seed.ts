// NOTE: Seeds the database with demo users, customers, orders, and stock data.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import {
  MovementType,
  NotificationType,
  OrderStatus,
  OrderType,
  PrismaClient,
  Role,
} from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SEED_PASSWORD = 'SeedPass123!';

async function assertMigrationsApplied(): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<Array<{ table_present: boolean }>>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'notifications'
    ) AS table_present
  `);
  if (!rows[0]?.table_present) {
    throw new Error(
      [
        'Prisma tables do not exist in this database (or you are pointing to another DB).',
        'From isp-manager-api, apply migrations first:',
        '  npx prisma migrate deploy',
        'For local development, this also works:',
        '  npx prisma migrate dev',
        'Then run the seed again.',
      ].join('\n'),
    );
  }
}

async function wipeDevData(): Promise<void> {
  await prisma.refreshSession.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.orderNote.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.orderEquipment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.warehouseStock.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.equipmentCategory.deleteMany();
  await prisma.unit.deleteMany();
}

async function main(): Promise<void> {
  await assertMigrationsApplied();
  await wipeDevData();

  const passwordHash = bcrypt.hashSync(SEED_PASSWORD, 10);

  const unitUnidad = await prisma.unit.create({
    data: { name: 'Unidad', abbreviation: 'u', active: true },
  });
  const unitMetro = await prisma.unit.create({
    data: { name: 'Metro', abbreviation: 'm', active: true },
  });

  const catRouter = await prisma.equipmentCategory.create({
    data: { name: 'Router', active: true },
  });
  const catCable = await prisma.equipmentCategory.create({
    data: { name: 'Cable', active: true },
  });

  const warehouseCentral = await prisma.warehouse.create({
    data: {
      name: 'Central Warehouse',
      address: '100 Main Ave',
      city: 'Buenos Aires',
      province: 'CABA',
      active: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Admin Demo',
      email: 'admin@isp.local',
      password: passwordHash,
      phone: '+54 11 1111-1111',
      role: Role.ADMIN,
      active: true,
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      name: 'Supervisor Demo',
      email: 'supervisor@isp.local',
      password: passwordHash,
      phone: '+54 11 2222-2222',
      role: Role.SUPERVISOR,
      active: true,
    },
  });

  const installer = await prisma.user.create({
    data: {
      name: 'Instalador Demo',
      email: 'installer@isp.local',
      password: passwordHash,
      phone: '+54 11 3333-3333',
      role: Role.INSTALLER,
      active: true,
    },
  });

  const equipRouter = await prisma.equipment.create({
    data: {
      name: 'Router WiFi AX3000',
      categoryId: catRouter.id,
      unitId: unitUnidad.id,
    },
  });

  const equipCable = await prisma.equipment.create({
    data: {
      name: 'Cable FO drop 100m',
      categoryId: catCable.id,
      unitId: unitMetro.id,
    },
  });

  await prisma.warehouseStock.createMany({
    data: [
      {
        warehouseId: warehouseCentral.id,
        equipmentId: equipRouter.id,
        stock: 25,
        minStock: 5,
      },
      {
        warehouseId: warehouseCentral.id,
        equipmentId: equipCable.id,
        stock: 120,
        minStock: 20,
      },
    ],
  });

  const customer = await prisma.customer.create({
    data: {
      name: 'Residential Customer Inc',
      email: 'contact@customer.example',
      phone: '+54 11 4444-4444',
      address: 'Fake Street 123',
      city: 'La Plata',
      province: 'Buenos Aires',
      zipCode: '1900',
    },
  });

  const order1 = await prisma.order.create({
    data: {
      title: 'FTTH installation - Residential Customer Inc',
      description: 'New 300 Mbps service',
      type: OrderType.INSTALLATION,
      status: OrderStatus.IN_PROGRESS,
      address: 'Fake Street 123',
      city: 'La Plata',
      province: 'Buenos Aires',
      installerId: installer.id,
      customerId: customer.id,
      scheduledAt: new Date(Date.now() + 86400000),
    },
  });

  await prisma.orderEquipment.create({
    data: {
      orderId: order1.id,
      equipmentId: equipRouter.id,
      warehouseId: warehouseCentral.id,
      quantity: 1,
    },
  });

  await prisma.orderEquipment.create({
    data: {
      orderId: order1.id,
      equipmentId: equipCable.id,
      warehouseId: warehouseCentral.id,
      quantity: 30,
    },
  });

  await prisma.orderNote.create({
    data: {
      orderId: order1.id,
      userId: installer.id,
      content: 'Customer verified on site. Conduit is ready for fiber routing.',
    },
  });

  await prisma.stockMovement.create({
    data: {
      equipmentId: equipRouter.id,
      warehouseId: warehouseCentral.id,
      userId: admin.id,
      type: MovementType.IN,
      quantity: 50,
      note: 'Initial demo stock entry',
    },
  });

  await prisma.notification.create({
    data: {
      userId: installer.id,
      type: NotificationType.ORDER_ASSIGNED,
      title: 'New order assigned',
      message: `You were assigned the order "${order1.title}".`,
      read: false,
    },
  });

  await prisma.notification.create({
    data: {
      userId: supervisor.id,
      type: NotificationType.GENERAL,
      title: 'Seed completado',
      message: 'Datos demo cargados correctamente.',
      read: false,
    },
  });

  console.log('Seed completed.');
  console.log(
    `Demo login (all users): email *@isp.local password: ${SEED_PASSWORD}`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
