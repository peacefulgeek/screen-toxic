// HARDCODE per site. DO NOT move these to env vars.
const BUNNY_STORAGE_ZONE = 'the-screen-age';
const BUNNY_API_KEY      = 'BUNNY_API_KEY_PLACEHOLDER';  // Set when Bunny zone is created
const BUNNY_PULL_ZONE    = 'https://the-screen-age.b-cdn.net';
const BUNNY_HOSTNAME     = 'ny.storage.bunnycdn.com';

// Fallback placeholder images for development (Unsplash, no text on images)
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80', // child with tablet
  'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=800&q=80', // family tech
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80', // laptop child
  'https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?w=800&q=80', // phone screen
  'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80', // kids learning
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80', // classroom tech
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80', // teen phone
  'https://images.unsplash.com/photo-1492538368677-f6e0afe31dcc?w=800&q=80', // child reading
  'https://images.unsplash.com/photo-1588072432836-e10032774350?w=800&q=80', // family together
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', // nature outdoors
];

/**
 * Pick a random library image, copy it to /images/{slug}.webp, return the public URL.
 * Falls back to Unsplash placeholder if Bunny is not yet configured.
 */
export async function assignHeroImage(slug) {
  // If Bunny not configured yet, use Unsplash placeholder
  if (BUNNY_API_KEY === 'BUNNY_API_KEY_PLACEHOLDER') {
    const idx = Math.floor(Math.random() * FALLBACK_IMAGES.length);
    return FALLBACK_IMAGES[idx];
  }

  const idx = String(Math.floor(Math.random() * 40) + 1).padStart(2, '0');
  const sourceFile = `lib-${idx}.webp`;
  const destFile   = `${slug}.webp`;

  try {
    const sourceUrl = `${BUNNY_PULL_ZONE}/library/${sourceFile}`;
    const downloadRes = await fetch(sourceUrl);
    if (!downloadRes.ok) throw new Error(`download ${downloadRes.status}`);
    const imageBuffer = await downloadRes.arrayBuffer();

    const uploadUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/images/${destFile}`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { AccessKey: BUNNY_API_KEY, 'Content-Type': 'image/webp' },
      body: imageBuffer,
    });
    if (!uploadRes.ok) throw new Error(`upload ${uploadRes.status}`);
    return `${BUNNY_PULL_ZONE}/images/${destFile}`;
  } catch (err) {
    console.warn(`[bunny.assignHeroImage] copy failed (${err.message}), using fallback`);
    const idx2 = Math.floor(Math.random() * FALLBACK_IMAGES.length);
    return FALLBACK_IMAGES[idx2];
  }
}

/**
 * Upload an arbitrary WebP buffer to a target path under the storage zone.
 */
export async function uploadWebP(targetPath, buffer) {
  const url = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${targetPath.replace(/^\//, '')}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { AccessKey: BUNNY_API_KEY, 'Content-Type': 'image/webp' },
    body: buffer,
  });
  if (!res.ok) throw new Error(`bunny upload ${res.status} for ${targetPath}`);
  return `${BUNNY_PULL_ZONE}/${targetPath.replace(/^\//, '')}`;
}

export { BUNNY_PULL_ZONE };
