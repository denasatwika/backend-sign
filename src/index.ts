import { Hono } from 'hono'
import authRouter from './routes/auth.ts'; 
import { authMiddleware, requireRole } from './middleware/auth.middleware.ts';
import { AuthVariables } from './types/hono.ts'; 
import { AppError } from './types/errors.ts'; 
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const app = new Hono<{ Variables: AuthVariables }>();

app.onError((err, c) => {
    console.error(`[Global Error Handler] ${err.message}`, err); 
    
    if (err instanceof AppError) {
        return c.json(
            { error: err.message, code: err.errorCode }, 
            err.statusCode as ContentfulStatusCode
        );
    }
    return c.json({ error: "Internal Server Error" }, 500 as ContentfulStatusCode);
});

app.get('/', (c) => 
    c.text('Welcome to the Wallet Sign Backend API!'))
app.route('/auth', authRouter);

app.use('/api/v1/*', authMiddleware);

app.get('/api/v1/me', (c) => {
    const employeeData = c.get('employeeData');
    return c.json({
        message: 'Protected route access granted',
        user: {
            id: employeeData.id,
            fullName: employeeData.fullName,
            email: employeeData.email,
            role: c.get('role'),
            walletAddress: c.get('walletAddress'),
        }
    });
});

app.get('/api/v1/admin-only', requireRole('ADMIN'), (c) => {
    return c.json({
        message: 'Admin access granted successfully',
        role: c.get('role')
    });
});

export default app