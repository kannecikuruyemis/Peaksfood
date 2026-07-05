// Döviz kuru proxy — sunucu tarafında çeker, tarayıcı CORS sorunu yaşamaz.
// İki kaynak sırayla denenir; biri başarısız olursa diğerine geçilir.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  async function kaynaktanCek(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const rates = d.rates || d.conversion_rates;
    if (!rates || !rates.TRY || !rates.EUR) throw new Error('Beklenmeyen yanıt formatı');
    const usdTry = parseFloat(rates.TRY);       // 1 USD = X TRY (doğrudan)
    const eurTry = usdTry / parseFloat(rates.EUR); // 1 EUR = X TRY (USD üzerinden çapraz kur)
    if (!(usdTry > 10 && usdTry < 200)) throw new Error('Mantıksız USD kuru: ' + usdTry);
    if (!(eurTry > 10 && eurTry < 200)) throw new Error('Mantıksız EUR kuru: ' + eurTry);
    return {
      usd: Math.round(usdTry * 100) / 100,
      eur: Math.round(eurTry * 100) / 100
    };
  }

  const kaynaklar = [
    'https://open.er-api.com/v6/latest/USD',
    'https://api.exchangerate-api.com/v4/latest/USD'
  ];

  const hatalar = [];
  for (const url of kaynaklar) {
    try {
      const sonuc = await kaynaktanCek(url);
      return res.status(200).json({ ...sonuc, kaynak: url, alinma_zamani: new Date().toISOString() });
    } catch (e) {
      hatalar.push(url + ': ' + e.message);
    }
  }

  return res.status(502).json({ error: 'Tüm döviz kaynakları başarısız oldu', detay: hatalar });
}
