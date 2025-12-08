import { db, schema } from '../../db';
import { generateNonce, verifyMessage } from 'viem/accounts'; 
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const NONCE_TIMEOUT_MINUTES = parseInt(process.env.NONCE_TIMEOUT_MINUTES || '5', 10);
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const DOMAIN = process.env.APP_DOMAIN || 'example.com'; 

/**
 * Membuat pesan Nonce baru dan menyimpannya ke database.
 */
export async function createNonce(address: string) {
    const lowerAddress = address.toLowerCase();

    const nonce = generateNonce();
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
        throw new Error("Failed to create authentication challenge.");
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
            eq(schema.authNonces.usedAt, null),
            sql`"expires_at" > now()`
        ),
    });

    if (!nonceRecord) {
        throw new Error('Invalid or expired nonce.');
    }

    const recoveredAddress = verifyMessage({
        address: address as `0x${string}`, 
        message: nonceRecord.message,
        signature: signature,
    });
    
    if (recoveredAddress.toLowerCase() !== lowerAddress) {
        throw new Error('Signature mismatch. Verification failed.');
    }

    await db.update(schema.authNonces)
        .set({ usedAt: new Date() })
        .where(eq(schema.authNonces.id, nonceRecord.id));

    const walletRecord = await db.query.wallets.findFirst({
        where: eq(schema.wallets.address, lowerAddress),
        with: {
            employee: true,
        },
    });

    if (!walletRecord?.employee) {
        throw new Error('Wallet not linked to an active employee account.');
    }

    const token = jwt.sign(
        { 
            employeeId: walletRecord.employeeId,
            role: walletRecord.employee.role,
            wallet: lowerAddress,
        }, 
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    return { token, employee: walletRecord.employee };
}