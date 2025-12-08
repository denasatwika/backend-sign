import { Context } from 'hono';
import * as authService from '../services/auth.service.ts';

export const getNonce = async (c: Context) => {
    try {
        const { address } = await c.req.json() as { address: string };

        if (!address) {
            return c.json({ error: "Wallet address is required" }, 400);
        }

        const result = await authService.createNonce(address);
        return c.json(result);
    } catch (e) {
        console.error("Nonce error:", e);
        return c.json({ error: (e as Error).message || "Failed to generate challenge" }, 500);
    }
};

export const verifyLogin = async (c: Context) => {
    try {
        const { address, nonce, signature } = await c.req.json() as { 
            address: string; 
            nonce: string; 
            signature: `0x${string}` 
        };

        if (!address || !nonce || !signature) {
            return c.json({ error: "Missing required fields: address, nonce, or signature" }, 400);
        }

        const result = await authService.verifyWalletSignature(address, nonce, signature);
        
        return c.json({ 
            token: result.token,
            employee: result.employee,
            message: "Login successful" 
        });

    } catch (e) {
        console.error("Verification error:", e);
        return c.json({ error: (e as Error).message || "Login failed" }, 401);
    }
};