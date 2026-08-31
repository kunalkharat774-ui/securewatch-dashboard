import app from '../server';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

export default function handler(req: Parameters<typeof app>[0], res: Parameters<typeof app>[1]) {
	return app(req, res);
}