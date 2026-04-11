import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const expectedUsername = process.env.AUTH_USERNAME || 'admin';
  const expectedPassword = process.env.AUTH_PASSWORD || 'admin123';
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({ error: 'JWT_SECRET not configured' });
    return;
  }

  const usernameMatch = username === expectedUsername;

  // Use bcrypt compare if the stored password looks like a hash, otherwise plain compare
  const isBcryptHash = expectedPassword.startsWith('$2');
  let passwordMatch: boolean;

  if (isBcryptHash) {
    passwordMatch = await bcrypt.compare(password, expectedPassword);
  } else {
    passwordMatch = password === expectedPassword;
  }

  if (!usernameMatch || !passwordMatch) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = jwt.sign({ userId: username }, jwtSecret, { expiresIn: '8h' });

  res.json({ token, expiresIn: 28800 });
});

export default router;
