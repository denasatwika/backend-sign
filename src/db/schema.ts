import { pgTable, serial, varchar, integer, 
  timestamp, jsonb, text, pgEnum, uuid, index, 
  boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm'

/**
 * Tabel untuk menyimpan data pengguna, baik Staff maupun Signer (Penanda Tangan).
 */

export const employmentTypeEnum = pgEnum('employment_type', [
    'FULL_TIME', 'PROBATION', 'INTERN',
])

export const employeeLevelEnum = pgEnum('employee_level', [
    'EMPLOYEE', 'SUPERVISOR', 'CHIEF', 'HR',
])

export const employeeRoleEnum = pgEnum('employee_role', [
    'USER', 'APPROVER', 'ADMIN'
])

export const departments = pgTable('departments', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 10 }).notNull().unique(),
    description: text('description'),
})

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullName: varchar('full_name', { length: 256 }).notNull(),
  email: varchar('email', { length: 256 }).notNull().unique(),
  password: text('password').notNull(), 
  role: varchar('role', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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
})

/**
 * Tabel untuk menyimpan file gambar tanda tangan milik setiap pengguna.
 * Setiap pengguna bisa memiliki lebih dari satu tanda tangan.
 */
export const signatures = pgTable('signatures', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    signatureImagePath: varchar('signature_image_path', { length: 256 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Enum untuk status pada setiap permintaan tanda tangan
export const signatureStatusEnum = pgEnum('signature_status', ['pending', 'signed', 'rejected']);

/**
 * Tabel penghubung yang merekam setiap permintaan tanda tangan pada sebuah dokumen.
 * Ini adalah inti dari alur kerja penandatanganan.
 */
export const userSignatures = pgTable('user_signatures', {
    id: serial('id').primaryKey(),
    documentId: integer('document_id').references(() => documents.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(), // Pengguna yang ditugaskan untuk menandatangani
    signatureId: integer('signature_id').references(() => signatures.id), // Tanda tangan yang digunakan (setelah ditandatangani)
    status: signatureStatusEnum('status').default('pending').notNull(),
    position: jsonb('position').notNull(), // Format: { page, x, y, width, height }
    signedAt: timestamp('signed_at'),
    rejectedReason: text('rejected_reason'), // Alasan jika statusnya 'rejected'
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Tabel utama untuk dokumen.
 * Kolom yang berhubungan dengan satu penanda tangan telah dipindahkan ke tabel 'user_signatures'.
 */
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  batchId: varchar('batch_id', { length: 256 }).notNull(),
  title: varchar('title', { length: 256 }).notNull(),
  filename: varchar('filename', { length: 256 }).notNull(),
  filePath: varchar('file_path', { length: 256 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  sizeBytes: integer('size_bytes'),
  status: varchar('status', { length: 50 }).default('draft').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  
  // Kolom untuk melacak ID staff yang mengunggah dokumen.
  uploadedByUserId: integer('uploaded_by_user_id').references(() => users.id),
});

export const authNonces = pgTable('auth_nonces', {
    id: uuid('id').primaryKey().defaultRandom(),
    walletAddress: varchar('wallet_address', { length: 42 }).notNull(), // store LOWERCASE
    nonce: varchar('nonce', { length: 160 }).notNull().unique(),
    message: text('message').notNull(), // exact message to sign
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    index('ix_auth_nonces_addr').on(t.walletAddress),
    index('ix_auth_nonces_expiry').on(t.expiresAt),
]);

export const wallets = pgTable('wallets', {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id')
        .references(() => employees.id, { onDelete: 'cascade' })
        .notNull(),
    address: varchar('address', { length: 42 }).notNull(), // 0x + 40 hex
    isPrimary: boolean('is_primary').notNull().default(false),
    isVerified: boolean('is_verified').notNull().default(false),
    nickname: varchar('nickname', { length: 100 }),
    walletType: varchar('wallet_type', { length: 50 }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    // case-insensitive uniqueness
    uniqueIndex('ux_wallets_address_lower').on(sql`lower(${t.address})`),

    // at most one primary wallet per employee
    uniqueIndex('ux_wallets_primary_per_employee')
        .on(t.employeeId)
        .where(sql`${t.isPrimary} = true`),

    index('ix_wallets_employee').on(t.employeeId),
]);

