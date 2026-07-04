import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { env } from './env';

// Configure WebSocket support for Node.js environment
neonConfig.webSocketConstructor = ws;

const connectionString = env.DATABASE_URL;

// Initialize the PrismaNeon adapter directly with connection options
const adapter = new PrismaNeon({ connectionString });

export const prisma = new PrismaClient({
  adapter,
  log: ['info', 'warn', 'error'],
});

// Explicitly handle database shutdown cleanly
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
