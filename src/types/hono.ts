import { Context } from 'hono';

export type AuthVariables = {
  employeeId: string;
  walletAddress: string;
  role: string;
  employeeData: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
  };
};

export type AuthContext = Context<{ Variables: AuthVariables }>;