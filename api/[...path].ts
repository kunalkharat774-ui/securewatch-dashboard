import type express from 'express';
import app from '../server';

export const config = {
  maxDuration: 30,
};

export default function handler(req: express.Request, res: express.Response) {
  return app(req, res);
}