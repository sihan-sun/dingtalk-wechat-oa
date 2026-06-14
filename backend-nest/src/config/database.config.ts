import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  uri: process.env.MONGO_URI || 'mongodb://localhost:27017/staff-sync',
}));
