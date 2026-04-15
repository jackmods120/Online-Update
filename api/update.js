// Vercel Serverless Function
export default async function handler(req, res) {
  // ڕێگەدان بە CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // کاردانەوە بۆ داواکاری OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 📌 داواکاری POST: پاشەکەوتکردنی داتا لە KV (تایبەتە بە تۆ وەک بەڕێوەبەر)
  if (req.method === 'POST') {
    try {
      const { id, config } = req.body;
      
      // پشتڕاستکردنەوەی سادە (تەنها تۆ دەتوانیت داتا بنێریت)
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!id || !config) {
        return res.status(400).json({ error: 'Missing id or config' });
      }

      // پاشەکەوتکردن لە Vercel KV
      const { kv } = await import('@vercel/kv');
      await kv.set(`update:${id}`, config);
      
      // گەڕاندنەوەی لینکی Raw
      const rawUrl = `https://${req.headers.host}/api/update/${id}`;
      return res.status(200).json({ success: true, rawUrl: rawUrl });
    } catch (error) {
      console.error('POST Error:', error);
      return res.status(500).json({ error: 'Failed to save' });
    }
  }

  // 📌 داواکاری GET: وەرگرتنی لینکی Raw
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }

  try {
    const { kv } = await import('@vercel/kv');
    const config = await kv.get(`update:${id}`);
    
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    // گەڕاندنەوەی JSON بە شێوەی Raw (وەک Pastebin)
    return res.status(200).json(config);
  } catch (error) {
    console.error('GET Error:', error);
    return res.status(500).json({ error: 'Failed to fetch' });
  }
}
