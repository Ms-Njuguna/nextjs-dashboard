import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';
import postgres from 'postgres';

const sql = postgres(process.env.nextjsdashboard_POSTGRES_URL!, { ssl: 'require' });

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User[]>`SELECT * FROM users WHERE email=${email}`;
    return user[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
  async authorize(credentials) {
    console.log('🔥 AUTHORIZE CALLED');
    console.log('Credentials:', credentials);

    const parsedCredentials = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
      })
      .safeParse(credentials);

    console.log('🔥 PARSED:', parsedCredentials.success);

    if (parsedCredentials.success) {
      const { email, password } = parsedCredentials.data;

      console.log('🔥 Looking for user:', email);

      const user = await getUser(email);

      console.log('🔥 USER:', user ? 'FOUND' : 'NOT FOUND');

      if (!user) return null;

      console.log('🔥 Comparing password');

      const passwordsMatch = await bcrypt.compare(
        password,
        user.password,
      );

      console.log('🔥 PASSWORD MATCH:', passwordsMatch);

      if (passwordsMatch) {
        return user;
      }
    }

    console.log('🔥 INVALID CREDENTIALS');

    return null;
  },
}),
  ],
});