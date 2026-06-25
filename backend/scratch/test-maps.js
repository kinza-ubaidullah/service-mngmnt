function parseGoogleMapsCoords(url) {
  if (!url) return null;

  const candidates = [url, decodeURIComponent(url)];
  const patterns = [
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    /!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[?&]center=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /\/(-?\d+\.?\d*),(-?\d+\.?\d*)(?:\/|\?|$)/,
  ];

  for (const text of candidates) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return [lat, lng];
        }
      }
    }
  }
  return null;
}

async function expandAndParseGoogleMapsUrl(url) {
  if (!url) return null;

  const direct = parseGoogleMapsCoords(url);
  if (direct) return direct;

  if (!url.includes('goo.gl') && !url.includes('maps.app')) return null;

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual', // Don't follow automatically, inspect headers
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
    });

    console.log("Status:", res.status);
    
    // Check Location header for 3xx
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      console.log("Location:", loc);
      if (loc) {
        const fromLoc = parseGoogleMapsCoords(loc);
        if (fromLoc) return fromLoc;
        // If it redirected to another short URL or consent page, we might need to follow
        url = loc;
      }
    }

    // Try following normally if manual didn't yield coords
    const res2 = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    console.log("Final URL:", res2.url);
    const fromFinalUrl = parseGoogleMapsCoords(res2.url);
    if (fromFinalUrl) return fromFinalUrl;

    const html = await res2.text();
    // Search for meta property og:url
    const ogMatch = html.match(/<meta property="og:url" content="([^"]+)"/);
    if (ogMatch && ogMatch[1]) {
      console.log("Found og:url:", ogMatch[1]);
      const fromOg = parseGoogleMapsCoords(ogMatch[1]);
      if (fromOg) return fromOg;
    }

    // Search for window.location.replace
    const jsMatch = html.match(/window\.location\.replace\('([^']+)'\)/);
    if (jsMatch && jsMatch[1]) {
        // usually the js replacement URL contains escaped characters like \x26 instead of &
        let unescapedUrl = jsMatch[1].replace(/\\x22/g, '"').replace(/\\x27/g, "'").replace(/\\x26/g, "&");
        console.log("Found js replace:", unescapedUrl);
        const fromJs = parseGoogleMapsCoords(unescapedUrl);
        if (fromJs) return fromJs;
    }

    const fromHtml = parseGoogleMapsCoords(html);
    if (fromHtml) return fromHtml;

  } catch (err) {
    console.error(err);
  }
  return null;
}

// Example URL (you can replace with a valid one if you have it)
expandAndParseGoogleMapsUrl('https://maps.app.goo.gl/vJb92LBN4bK2Vp7R8').then(console.log);
