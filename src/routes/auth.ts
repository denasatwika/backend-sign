import { Hono } from 'hono';
import { getNonce, verifyLogin } from '../controllers/auth.controller.ts'; 

const authRouter = new Hono();

authRouter.post('/nonce', getNonce);
authRouter.post('/verify', verifyLogin);

// Rute Lama
// authRouter.post('/login', loginController.login);
// authRouter.post('/register', registerController.register);

export default authRouter;