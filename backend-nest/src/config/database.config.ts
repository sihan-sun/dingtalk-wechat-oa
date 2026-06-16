import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  uri: process.env.MONGO_URI || 'mongodb://localhost:27018/staff-sync',
}));
