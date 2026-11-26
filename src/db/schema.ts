import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firebaseUid: varchar('firebase_uid', { length: 128 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  displayName: varchar('display_name', { length: 255 }),
  role: varchar('role', { length: 32 }).default('admin').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  cardNumber: varchar('card_number', { length: 40 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 64 }).notNull(),
  category: varchar('category', { length: 64 }).notNull(),
  cardDesign: varchar('card_design', { length: 120 }).notNull(),
  org: varchar('org', { length: 255 }).default('-').notNull(),
  address: text('address').default('-').notNull(),
  nik: varchar('nik', { length: 32 }).default('').notNull(),
  kkNumber: varchar('kk_number', { length: 32 }).default('').notNull(),
  kkRelation: varchar('kk_relation', { length: 64 }).default('Kepala Keluarga').notNull(),
  ktpAddress: text('ktp_address').default('').notNull(),
  status: varchar('status', { length: 32 }).default('AKTIF').notNull(),
  registeredAt: varchar('registered_at', { length: 64 }).default('-').notNull(),
  notes: text('notes').default('').notNull(),
  updatedByUid: varchar('updated_by_uid', { length: 128 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const attendanceLogs = pgTable('attendance_logs', {
  id: varchar('id', { length: 80 }).primaryKey(),
  dateKey: varchar('date_key', { length: 16 }).notNull(),
  timestamp: varchar('timestamp', { length: 64 }).notNull(),
  isoTimestamp: varchar('iso_timestamp', { length: 64 }),
  hour: integer('hour'),
  cardNumber: varchar('card_number', { length: 40 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 64 }).notNull(),
  phone: varchar('phone', { length: 64 }).default('-').notNull(),
  purpose: varchar('purpose', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const duplicateAttempts = pgTable('duplicate_attempts', {
  id: varchar('id', { length: 80 }).primaryKey(),
  ts: varchar('ts', { length: 64 }).notNull(),
  reason: varchar('reason', { length: 64 }).notNull(),
  cardNumber: varchar('card_number', { length: 40 }).notNull(),
  attemptedName: varchar('attempted_name', { length: 255 }).notNull(),
  attemptedPhone: varchar('attempted_phone', { length: 64 }).notNull(),
  matchedCardNumber: varchar('matched_card_number', { length: 40 }).notNull(),
  matchedName: varchar('matched_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
