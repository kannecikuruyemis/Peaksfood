export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path } = req.query;
  const apiUrl = process.env.SENTOS_URL || '';
  const apiKey = process.env.SENTOS_KEY || '';
  const apiPassword = process.env.SENTOS_PASSWORD || '';

  if (!apiUrl || !apiKey) {
    return res.status(500).json({ error: 'Sentos API bilgileri eksik' });
  }

  const pathStr = Array.isArray(path) ? path.join('/') : (path || '');
  const queryStr = Object.entries(req.query)
    .filter(([k]) => k !== 'path')
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const targetUrl = `${apiUrl}/${pathStr}${queryStr ? '?' + queryStr : ''}`;

  const auth = apiPassword
    ? 'Basic ' + Buffer.from(`${apiKey}:${apiPassword}`).toString('base64')
    : 'Bearer ' + apiKey;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
