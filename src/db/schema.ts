import { pgTable, serial, varchar, integer, 
  timestamp, jsonb, text, pgEnum, uuid, index, 
  boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm'

// ENUMS
export const employmentTypeEnum = pgEnum('employment_type', ['FULL_TIME', 'PROBATION', 'INTERN']);
export const employeeLevelEnum = pgEnum('employee_level', ['EMPLOYEE', 'SUPERVISOR', 'CHIEF', 'HR']);
export const employeeRoleEnum = pgEnum('employee_role', ['USER', 'APPROVER', 'ADMIN']);
export const signatureStatusEnum = pgEnum('signature_status', ['pending', 'signed', 'rejected']);


// MASTER DATA
export const departments = pgTable('departments', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 10 }).notNull().unique(),
    description: text('description'),
});

// EMPLOYEES (ID: UUID)
export const employees = pgTable('employees', {
    id: uuid('id').primaryKey().defaultRandom(),
    fullName: varchar('full_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: text('password').notNull(), 
    phone: varchar('phone', { length: 20 }).notNull(),
    employmentType: employmentTypeEnum('employment_type').notNull(),
    level: employeeLevelEnum('level').notNull(),
    role: employeeRoleEnum('role').notNull(),
    departmentId: uuid('department_id')
        .references(() => departments.id, { onDelete: 'restrict' })
        .notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// SIGNATURES (FK: employees.id -> UUID)
export const signatures = pgTable('signatures', {
    id: serial('id').primaryKey(), // PK: SERIAL
    userId: uuid('user_id').references(() => employees.id).notNull(), // FIX: UUID
    signatureImagePath: varchar('signature_image_path', { length: 256 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// DOCUMENTS (PK: SERIAL)
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(), // PK: SERIAL
  batchId: varchar('batch_id', { length: 256 }).notNull(),
  title: varchar('title', { length: 256 }).notNull(),
  filename: varchar('filename', { length: 256 }).notNull(),
  filePath: varchar('file_path', { length: 256 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  sizeBytes: integer('size_bytes'),
  status: varchar('status', { length: 50 }).default('draft').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  
  // FIX: uploadedByUserId harus UUID
  uploadedByUserId: uuid('uploaded_by_user_id').references(() => employees.id), 
});

// USER SIGNATURES (FK: employees.id -> UUID)
export const userSignatures = pgTable('user_signatures', {
    id: serial('id').primaryKey(), // PK: SERIAL
    documentId: integer('document_id').references(() => documents.id).notNull(), // FK: documents.id -> SERIAL
    userId: uuid('user_id').references(() => employees.id).notNull(), // FIX: UUID
    signatureId: integer('signature_id').references(() => signatures.id), // FK: signatures.id -> SERIAL
    status: signatureStatusEnum('status').default('pending').notNull(),
    position: jsonb('position').notNull(), 
    signedAt: timestamp('signed_at'),
    rejectedReason: text('rejected_reason'), 
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// AUTH NONCES (ID: UUID)
export const authNonces = pgTable('auth_nonces', {
    id: uuid('id').primaryKey().defaultRandom(),
    walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
    nonce: varchar('nonce', { length: 160 }).notNull().unique(),
    message: text('message').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    index('ix_auth_nonces_addr').on(t.walletAddress),
    index('ix_auth_nonces_expiry').on(t.expiresAt),
]);

// WALLETS (ID: UUID)
export const wallets = pgTable('wallets', {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id')
        .references(() => employees.id, { onDelete: 'cascade' })
        .notNull(),
    address: varchar('address', { length: 42 }).notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    isVerified: boolean('is_verified').notNull().default(false),
    nickname: varchar('nickname', { length: 100 }),
    walletType: varchar('wallet_type', { length: 50 }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    uniqueIndex('ux_wallets_address_lower').on(sql`lower(${t.address})`),
    uniqueIndex('ux_wallets_primary_per_employee')
        .on(t.employeeId)
        .where(sql`${t.isPrimary} = true`),
    index('ix_wallets_employee').on(t.employeeId),
]);