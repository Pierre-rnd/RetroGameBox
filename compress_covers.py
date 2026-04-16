import os
import shutil
from pathlib import Path
from PIL import Image

COVERS_DIR   = Path("static/covers")          
MAX_WIDTH    = 800                      
MAX_HEIGHT   = 1200                     
JPEG_QUALITY = 85                       
PNG_COMPRESS = 7                        
CONVERT_TO   = "JPEG"                  
BACKUP_DIR   = COVERS_DIR / "_originals"  

EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}


def format_size(bytes_size):
    if bytes_size < 1024:
        return f"{bytes_size} o"
    elif bytes_size < 1024 * 1024:
        return f"{bytes_size / 1024:.1f} Ko"
    else:
        return f"{bytes_size / 1024 / 1024:.1f} Mo"


def compress_image(src_path: Path, backup: bool = True) -> dict:
    """Compresse une image et retourne les stats."""
    original_size = src_path.stat().st_size

    if backup:
        rel = src_path.relative_to(COVERS_DIR)
        backup_path = BACKUP_DIR / rel
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        if not backup_path.exists():
            shutil.copy2(src_path, backup_path)

    with Image.open(src_path) as img:
        if CONVERT_TO == "JPEG" and img.mode in ("RGBA", "P", "LA"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            if img.mode in ("RGBA", "LA"):
                background.paste(img, mask=img.split()[-1])
            img = background
        elif img.mode == "P":
            img = img.convert("RGB")

        w, h = img.size
        if w > MAX_WIDTH or h > MAX_HEIGHT:
            img.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.LANCZOS)

        # Choix du format de sortie
        if CONVERT_TO == "JPEG":
            out_path = src_path.with_suffix(".jpg")
            img.save(out_path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
            # Supprime l'ancien PNG si on a converti
            if src_path.suffix.lower() == ".png" and out_path != src_path:
                src_path.unlink()
        else:
            out_path = src_path.with_suffix(".png")
            img.save(out_path, "PNG", compress_level=PNG_COMPRESS, optimize=True)
            if src_path.suffix.lower() != ".png" and out_path != src_path:
                src_path.unlink()

    new_size = out_path.stat().st_size
    reduction = (1 - new_size / original_size) * 100 if original_size > 0 else 0

    return {
        "file":     str(out_path.relative_to(COVERS_DIR)),
        "original": original_size,
        "new":      new_size,
        "reduction": reduction,
        "out_path": out_path,
    }


def main():
    if not COVERS_DIR.exists():
        print(f"❌ Dossier '{COVERS_DIR}' introuvable.")
        print("   Lancez ce script depuis la racine de votre projet (là où se trouve index.html).")
        return

    images = [
        p for p in COVERS_DIR.rglob("*")
        if p.suffix.lower() in EXTENSIONS
        and BACKUP_DIR not in p.parents
        and p != BACKUP_DIR
    ]

    if not images:
        print("Aucune image trouvée dans le dossier covers/")
        return

    print(f"\n🎮 COVER VAULT — Compression en lot")
    print(f"{'='*55}")
    print(f"  Images trouvées : {len(images)}")
    print(f"  Format cible    : {CONVERT_TO}")
    print(f"  Taille max      : {MAX_WIDTH}×{MAX_HEIGHT}px")
    print(f"  Qualité JPEG    : {JPEG_QUALITY}")
    print(f"  Originaux       : sauvegardés dans {BACKUP_DIR}/")
    print(f"{'='*55}\n")

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    results = []
    total_before = 0
    total_after  = 0

    for i, img_path in enumerate(sorted(images), 1):
        print(f"  [{i:>3}/{len(images)}] {img_path.relative_to(COVERS_DIR)}", end=" ... ", flush=True)
        try:
            stats = compress_image(img_path)
            results.append(stats)
            total_before += stats["original"]
            total_after  += stats["new"]
            print(f"{format_size(stats['original'])} → {format_size(stats['new'])}  (-{stats['reduction']:.0f}%)")
        except Exception as e:
            print(f"ERREUR : {e}")

    total_reduction = (1 - total_after / total_before) * 100 if total_before > 0 else 0
    print(f"\n{'='*55}")
    print(f"  Compression terminée !")
    print(f"  Avant  : {format_size(total_before)}")
    print(f"  Après  : {format_size(total_after)}")
    print(f"  Gain   : {format_size(total_before - total_after)} (-{total_reduction:.0f}%)")
    print(f"{'='*55}")


if __name__ == "__main__":
    main()