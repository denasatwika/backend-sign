import { pgTable, serial, varchar, integer, timestamp, jsonb, text, pgEnum } from 'drizzle-orm/pg-core';

/**
 * Tabel untuk menyimpan data pengguna, baik Staff maupun Signer (Penanda Tangan).
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullName: varchar('full_name', { length: 256 }).notNull(),
  email: varchar('email', { length: 256 }).notNull().unique(),
  password: text('password').notNull(), // PENTING: Selalu simpan HASH dari password, bukan password asli.
  role: varchar('role', { length: 50 }).notNull(), // Contoh: 'staff', 'chief', 'hrd'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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

