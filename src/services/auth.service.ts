import { db, schema } from '../db/index.ts';
import { verifyMessage } from 'viem'; 
import { eq, and, sql } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'crypto';
import { UnauthorizedError, ForbiddenError } from '../errors/index.ts';

const NONCE_TIMEOUT_MINUTES = parseInt(process.env.NONCE_TIMEOUT_MINUTES || '5', 10);
const JWT_SECRET: Secret = process.env.JWT_SECRET || randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const DOMAIN = process.env.APP_DOMAIN || 'example.com'; 

/**
 * Membuat pesan Nonce baru dan menyimpannya ke database.
 */
export async function createNonce(address: string) {
    const lowerAddress = address.toLowerCase();

    const nonce = randomUUID();
    const expiresAt = new Date(Date.now() + NONCE_TIMEOUT_MINUTES * 60 * 1000);
    
    const message = `
${DOMAIN} wants you to sign in with your Ethereum account:
${address}

This request will not trigger a blockchain transaction or cost any gas fees.

Nonce: ${nonce}
`;

    try {
        await db.insert(schema.authNonces).values({
            walletAddress: lowerAddress,
            nonce: nonce,
            message: message.trim(),
            expiresAt: expiresAt,
        });

        return {
            nonce: nonce,
            message: message.trim(),
            expiresAt: expiresAt.toISOString(),
        };
    } catch (error) {
        console.error("Error creating nonce:", error);
        throw new UnauthorizedError("Failed to create authentication challenge.");
    }
}

/**
 * Memverifikasi tanda tangan wallet dan mengeluarkan JWT.
 */
export async function verifyWalletSignature(
    address: string,
    nonce: string,
    signature: `0x${string}`
) {
    const lowerAddress = address.toLowerCase();

    const nonceRecord = await db.query.authNonces.findFirst({
        where: and(
            eq(schema.authNonces.walletAddress, lowerAddress),
            eq(schema.authNonces.nonce, nonce),
            sql`"used_at" IS NULL`,
            sql`"expires_at" > now()`
        ),
    });

    if (!nonceRecord) {
        throw new UnauthorizedError('Invalid or expired nonce or wallet.');
    }

    const signatureValid = await verifyMessage({
        address: address as `0x${string}`, 
        message: nonceRecord.message,
        signature: signature,
    });
    
    if (!signatureValid) {
        throw new UnauthorizedError('Signature mismatch. Verification failed.');
    }

    await db.update(schema.authNonces)
        .set({ usedAt: new Date() })
        .where(eq(schema.authNonces.id, nonceRecord.id));

    const walletRecord = await db.query.wallets.findFirst({
        where: eq(schema.wallets.address, lowerAddress),
    });

    if (!walletRecord) {
        throw new ForbiddenError('Wallet not registered or linked to any employee account.');
    }
    
    const employeeRecord = await db.query.employees.findFirst({
        where: eq(schema.employees.id, walletRecord.employeeId),
    });

    if (!employeeRecord || !employeeRecord.isActive) {
        throw new ForbiddenError('Wallet linked to an inactive or non-existent employee account.');
    }

    const signOptions: SignOptions = { 
        expiresIn: JWT_EXPIRES_IN as any
    };

    const token = jwt.sign(
        { 
            sub: employeeRecord.id, 
            role: employeeRecord.role,
            wallet: lowerAddress,
        }, 
        JWT_SECRET,
        signOptions
    );

    return { token, employee: employeeRecord };
}