import { Context } from 'hono';
import * as authService from '../services/auth.service.ts';
import { setCookie } from 'hono/cookie';

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

        const isProduction = process.env.NODE_ENV === 'production';
        const expireDate = new Date();
        const maxAgeSeconds = 7 * 24 * 60 * 60; 

        setCookie(c, 'access_token', result.token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'None' : 'Lax',
            path: '/',
            maxAge: maxAgeSeconds 
        });
        
        return c.json({
            employee: result.employee,
            message: "Login successul"
        }, 200);

    } catch (e) {
        console.error("Verification error:", e);
        const errorMessage = (e as Error).message;
        if (errorMessage.includes('Wallet not linked')) {
            return c.json({ error: errorMessage }, 403);
        }
        return c.json({ error: errorMessage || "Login failed" }, 401);
    }
};