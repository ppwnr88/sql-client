import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthenticatedRequest } from './auth';

const SECRET = 'test-secret';

function makeReq(authHeader?: string): AuthenticatedRequest {
  return { headers: { authorization: authHeader } } as unknown as AuthenticatedRequest;
}

function makeRes(): { status: jest.Mock; json: jest.Mock } {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as { status: jest.Mock; json: jest.Mock };
  (res.status as jest.Mock).mockReturnValue(res);
  return res;
}

describe('authMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = jest.fn();
    process.env.JWT_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('returns 401 when Authorization header is missing', () => {
    const req = makeReq(undefined);
    const res = makeRes();
    authMiddleware(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authorization header missing or malformed' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when header does not start with Bearer', () => {
    const req = makeReq('Basic dXNlcjpwYXNz');
    const res = makeRes();
    authMiddleware(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 when JWT_SECRET is not set', () => {
    delete process.env.JWT_SECRET;
    const token = jwt.sign({ userId: 'admin' }, SECRET);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    authMiddleware(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'JWT_SECRET not configured' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets req.userId for a valid token', () => {
    const token = jwt.sign({ userId: 'admin' }, SECRET);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    authMiddleware(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe('admin');
  });

  it('returns 401 with "Token expired" for an expired token', () => {
    const token = jwt.sign({ userId: 'admin' }, SECRET, { expiresIn: -1 });
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    authMiddleware(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with "Invalid token" for a tampered token', () => {
    const req = makeReq('Bearer not.a.valid.token');
    const res = makeRes();
    authMiddleware(req, res as unknown as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });
});
