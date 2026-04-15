import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { id, config } = req.body;
      const authHeader = req.headers.authorization;

      if (!process.env.ADMIN_SECRET) {
        return res.status(500).json({ error: 'Server misconfiguration: ADMIN_SECRET not set' });
      }

      if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!id || !config) {
        return res.status(400).json({ error: 'Missing id or config' });
      }

      // پشکنینی پەیوەندی KV (بە شێوەیەکی سادە)
      try {
        await kv.set(`update:${id}`, config);
      } catch (kvError) {
        console.error('KV Write Error:', kvError);
        return res.status(500).json({ error: 'Database write failed. Check KV configuration.' });
      }

      const rawUrl = `https://${req.headers.host}/api/update?id=${id}`;
      return res.status(200).json({ success: true, rawUrl: rawUrl });
    } catch (error) {
      console.error('POST General Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // داواکاری GET
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Missing id' });
    }

    try {
      const config = await kv.get(`update:${id}`);
      if (!config) {
        return res.status(404).json({ error: 'Config not found' });
      }
      return res.status(200).json(config);
    } catch (error) {
      console.error('GET Error:', error);
      return res.status(500).json({ error: 'Failed to fetch' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
    }
