// Same-origin proxy for espil.online's public Mapbox token endpoint.
// The upstream endpoint sends no CORS headers, so the /system/ playable
// demo cannot read it cross-origin; this function relays it server-side.
// No token value lives in this repository - it is fetched at runtime.
module.exports = async function handler(req, res) {
  try {
    const r = await fetch('https://espil.online/api/mapbox-token');
    const data = await r.json();
    res.setHeader('Access-Control-Allow-Origin', 'https://han.espil.online');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: 'token unavailable' });
  }
};
