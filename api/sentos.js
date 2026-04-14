export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sentosUrl = process.env.SENTOS_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!sentosUrl) return res.status(500).json({ error: 'SENTOS_URL eksik' });
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: 'Supabase bilgileri eksik' });

  // Supabase'den Sentos API bilgilerini çek
  const entRes = await fetch(`${supabaseUrl}/rest/v1/entegrasyon_ayar?platform=eq.sentos&select=api_key,api_password`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const entData = await entRes.json();
  const apiKey = entData?.[0]?.api_key;
  const apiPassword = entData?.[0]?.api_password;

  if (!apiKey) return res.status(500).json({ error: 'Sentos API key tanımlı değil' });

  const auth = apiPassword
    ? 'Basic ' + Buffer.from(`${apiKey}:${apiPassword}`).toString('base64')
    : 'Bearer ' + apiKey;

  const { path } = req.query;
  const pathStr = Array.isArray(path) ? path.join('/') : (path || '');
  const queryStr = Object.entries(req.query)
    .filter(([k]) => k !== 'path')
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const targetUrl = `${sentosUrl}/${pathStr}${queryStr ? '?' + queryStr : ''}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: { 'Authorization': auth, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
