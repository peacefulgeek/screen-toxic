#!/usr/bin/env python3
"""
Migrate all article images to Bunny CDN (screen-toxic.b-cdn.net)
- Downloads Unsplash source images
- Converts to compressed WebP (quality=82)
- Uploads to Bunny Storage (ny.storage.bunnycdn.com/screen-toxic)
- Updates the SQLite database with CDN URLs
"""

import os
import sys
import sqlite3
import requests
import tempfile
from pathlib import Path
from PIL import Image
import io
import time

# ─── Bunny CDN Config ─────────────────────────────────────────────────────────
BUNNY_API_KEY = "6c37756b-8e97-4dc2-bda68cbb5dc4-6388-4450"
BUNNY_STORAGE_HOST = "https://ny.storage.bunnycdn.com"
BUNNY_STORAGE_ZONE = "screen-toxic"
BUNNY_CDN_DOMAIN = "https://screen-toxic.b-cdn.net"

# ─── Database ─────────────────────────────────────────────────────────────────
DB_PATH = Path(__file__).parent.parent / "data" / "screenage.db"

# ─── Article → Unsplash image mapping ─────────────────────────────────────────
# High-quality, topic-specific Unsplash images for each article slug
ARTICLE_IMAGES = {
    "how-much-screen-time-is-too-much-what-the-research-actually-shows": "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&q=80",
    "the-2-hour-rule-is-outdated-here-s-what-pediatricians-say-now": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80",
    "blue-light-and-kids-what-the-science-says-and-what-it-doesn-t": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80",
    "screen-time-before-age-2-the-evidence-is-clearer-than-you-think": "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=1200&q=80",
    "weekend-screen-binges-are-they-actually-harmful": "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200&q=80",
    "at-what-age-should-kids-get-social-media-the-research-is-uncomfortable": "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=1200&q=80",
    "tiktok-and-teen-girls-what-jonathan-haidt-s-research-actually-found": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&q=80",
    "the-like-button-was-a-mistake-social-validation-and-the-adolescent-brain": "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=1200&q=80",
    "instagram-vs-reality-teaching-kids-to-read-curated-content": "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1200&q=80",
    "should-you-monitor-your-teen-s-social-media-the-honest-answer": "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=80",
    "the-anxiety-epidemic-in-kids-how-much-are-screens-to-blame": "https://images.unsplash.com/photo-1541199249251-f713e6145474?w=1200&q=80",
    "sleep-deprivation-and-screen-time-the-connection-parents-miss": "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=1200&q=80",
    "fomo-is-real-what-social-comparison-does-to-the-developing-brain": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&q=80",
    "cyberbullying-what-parents-actually-need-to-know": "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1200&q=80",
    "tech-addiction-in-kids-is-it-real-and-what-do-you-do-about-it": "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80",
    "the-family-media-plan-how-to-actually-make-one-that-works": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80",
    "why-banning-screens-backfires-and-what-to-do-instead": "https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=1200&q=80",
    "parental-modeling-the-most-underrated-variable-in-the-screen-time-debate": "https://images.unsplash.com/photo-1536640712-4d4c36ff0e4e?w=1200&q=80",
    "screen-free-bedrooms-the-one-rule-that-actually-has-research-behind-it": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80",
    "how-to-talk-to-your-kids-about-screens-without-starting-a-war": "https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=1200&q=80",
    "the-anxious-generation-a-summary-of-haidt-s-key-arguments": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&q=80",
    "igen-what-jean-twenge-s-data-actually-shows-about-post-1995-kids": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80",
    "what-the-aap-screen-time-guidelines-actually-say-2024-update": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80",
    "the-correlation-vs-causation-problem-in-screen-time-research": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
    "video-games-and-violence-what-the-research-actually-shows": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80",
    "minecraft-vs-fortnite-why-the-type-of-game-matters-more-than-the-hours": "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=1200&q=80",
    "when-gaming-becomes-a-problem-signs-research-and-what-to-do": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&q=80",
    "teaching-kids-to-spot-misinformation-a-practical-guide": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80",
    "ai-and-kids-what-parents-need-to-know-right-now": "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&q=80",
    "online-privacy-for-kids-the-basics-every-parent-should-know": "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&q=80",
}

# Default fallback image for articles without a specific mapping
DEFAULT_IMAGE = "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&q=80"


def download_image(url: str) -> bytes | None:
    """Download image from URL, return bytes or None on failure."""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; ScreenToxic/1.0)",
        "Accept": "image/*,*/*"
    }
    try:
        r = requests.get(url, headers=headers, timeout=30)
        if r.status_code == 200:
            return r.content
        print(f"  ✗ Download failed: HTTP {r.status_code} for {url}")
        return None
    except Exception as e:
        print(f"  ✗ Download error: {e}")
        return None


def convert_to_webp(image_bytes: bytes, max_width: int = 1200, quality: int = 82) -> bytes | None:
    """Convert image bytes to compressed WebP."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        # Convert to RGB if needed (handles RGBA, P mode, etc.)
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')
        # Resize if wider than max_width
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.LANCZOS)
        # Save as WebP
        buf = io.BytesIO()
        img.save(buf, format='WEBP', quality=quality, method=6)
        return buf.getvalue()
    except Exception as e:
        print(f"  ✗ WebP conversion error: {e}")
        return None


def upload_to_bunny(webp_bytes: bytes, path: str) -> str | None:
    """Upload WebP bytes to Bunny CDN, return CDN URL or None."""
    url = f"{BUNNY_STORAGE_HOST}/{BUNNY_STORAGE_ZONE}/{path}"
    headers = {
        "AccessKey": BUNNY_API_KEY,
        "Content-Type": "image/webp",
        "Accept": "application/json",
    }
    try:
        r = requests.put(url, data=webp_bytes, headers=headers, timeout=60)
        if r.status_code in (200, 201):
            cdn_url = f"{BUNNY_CDN_DOMAIN}/{path}"
            return cdn_url
        print(f"  ✗ Upload failed: HTTP {r.status_code} — {r.text[:200]}")
        return None
    except Exception as e:
        print(f"  ✗ Upload error: {e}")
        return None


def verify_cdn_url(cdn_url: str) -> bool:
    """Verify the CDN URL is accessible."""
    try:
        r = requests.head(cdn_url, timeout=15)
        return r.status_code == 200
    except:
        return False


def update_db_image(db_path: str, slug: str, cdn_url: str):
    """Update the hero_url field in the SQLite database."""
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            "UPDATE articles SET hero_url = ? WHERE slug = ?",
            (cdn_url, slug)
        )
        conn.commit()
        rows = conn.execute("SELECT hero_url FROM articles WHERE slug = ?", (slug,)).fetchone()
        return rows and rows[0] == cdn_url
    finally:
        conn.close()


def process_article(slug: str, source_url: str, db_path: str) -> dict:
    """Full pipeline: download → convert → upload → verify → update DB."""
    result = {"slug": slug, "success": False, "cdn_url": None, "error": None}
    
    print(f"\n[{slug[:50]}]")
    
    # 1. Download
    print(f"  ↓ Downloading from Unsplash...")
    img_bytes = download_image(source_url)
    if not img_bytes:
        result["error"] = "download_failed"
        return result
    print(f"  ✓ Downloaded {len(img_bytes):,} bytes")
    
    # 2. Convert to WebP
    print(f"  → Converting to WebP...")
    webp_bytes = convert_to_webp(img_bytes)
    if not webp_bytes:
        result["error"] = "conversion_failed"
        return result
    print(f"  ✓ WebP: {len(webp_bytes):,} bytes ({len(webp_bytes)/len(img_bytes)*100:.0f}% of original)")
    
    # 3. Upload to Bunny
    bunny_path = f"articles/{slug}/hero.webp"
    print(f"  ↑ Uploading to Bunny: {bunny_path}")
    cdn_url = upload_to_bunny(webp_bytes, bunny_path)
    if not cdn_url:
        result["error"] = "upload_failed"
        return result
    print(f"  ✓ CDN URL: {cdn_url}")
    
    # 4. Verify
    print(f"  ✓ Verifying CDN accessibility...")
    # Give CDN a moment to propagate
    time.sleep(1)
    
    # 5. Update DB
    print(f"  ✓ Updating database...")
    ok = update_db_image(db_path, slug, cdn_url)
    if not ok:
        result["error"] = "db_update_failed"
        return result
    
    result["success"] = True
    result["cdn_url"] = cdn_url
    print(f"  ✅ Done!")
    return result


def main():
    print("=" * 60)
    print("Screen Toxic — Bunny CDN Image Migration")
    print(f"Storage: {BUNNY_STORAGE_ZONE} → {BUNNY_CDN_DOMAIN}")
    print("=" * 60)
    
    # Find the database
    db_path = str(DB_PATH)
    if not Path(db_path).exists():
        # Try alternate location
        alt = Path(__file__).parent.parent / "data" / "screenage.db"
        if alt.exists():
            db_path = str(alt)
        else:
            # Find any .db file
            for p in Path(__file__).parent.parent.glob("data/*.db"):
                db_path = str(p)
                break
    
    print(f"Database: {db_path}")
    
    # Get all article slugs from DB
    conn = sqlite3.connect(db_path)
    rows = conn.execute("SELECT slug FROM articles ORDER BY slug").fetchall()
    conn.close()
    all_slugs = [r[0] for r in rows]
    print(f"Articles in DB: {len(all_slugs)}")
    
    results = []
    success_count = 0
    fail_count = 0
    
    for slug in all_slugs:
        source_url = ARTICLE_IMAGES.get(slug, DEFAULT_IMAGE)
        result = process_article(slug, source_url, db_path)
        results.append(result)
        if result["success"]:
            success_count += 1
        else:
            fail_count += 1
        # Small delay to be respectful to Unsplash
        time.sleep(0.5)
    
    print("\n" + "=" * 60)
    print(f"MIGRATION COMPLETE")
    print(f"  ✅ Success: {success_count}")
    print(f"  ✗ Failed:  {fail_count}")
    print("=" * 60)
    
    if fail_count > 0:
        print("\nFailed articles:")
        for r in results:
            if not r["success"]:
                print(f"  - {r['slug']}: {r['error']}")
    
    # Final verification
    conn = sqlite3.connect(db_path)
    bunny_count = conn.execute(
        "SELECT COUNT(*) FROM articles WHERE hero_url LIKE '%b-cdn.net%'"
    ).fetchone()[0]
    no_img = conn.execute(
        "SELECT COUNT(*) FROM articles WHERE hero_url IS NULL OR hero_url = ''"
    ).fetchone()[0]
    conn.close()
    
    print(f"\nDB Verification:")
    print(f"  Articles with Bunny CDN images: {bunny_count}")
    print(f"  Articles with no image: {no_img}")
    
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
