"""Download script for SCHP ATR-18 checkpoint file.

Downloads `exp-schp-201908301523-atr.pth` (~255 MB) from Hugging Face mirror
into `ai-service/models/` with chunked streaming and progress reporting.
"""

import os
import sys
import time
import urllib.request

URLS = [
    "https://huggingface.co/zhengchong/CatVTON/resolve/main/SCHP/exp-schp-201908301523-atr.pth",
    "https://huggingface.co/panyanyany/Self-Correction-Human-Parsing/resolve/main/checkpoints/exp-schp-201908301523-atr.pth",
]

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "exp-schp-201908301523-atr.pth")
EXPECTED_SIZE = 267_445_237  # 255.06 MB


def download_checkpoint():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    if os.path.exists(OUTPUT_PATH):
        current_size = os.path.getsize(OUTPUT_PATH)
        if current_size == EXPECTED_SIZE:
            print(f"Checkpoint already exists and has correct size ({current_size:,} bytes).")
            return OUTPUT_PATH
        else:
            print(f"Existing file has size {current_size:,} bytes (expected {EXPECTED_SIZE:,}). Re-downloading...")

    success = False
    for url in URLS:
        print(f"Attempting download from: {url}")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "IMMOExtract-Downloader/1.0"})
            with urllib.request.urlopen(req) as response:
                total_size = int(response.headers.get("Content-Length", 0))
                print(f"Server reported size: {total_size:,} bytes ({total_size / (1024**2):.2f} MB)")

                downloaded = 0
                chunk_size = 1024 * 1024  # 1 MB
                start_time = time.perf_counter()
                last_report = start_time

                temp_path = OUTPUT_PATH + ".part"
                with open(temp_path, "wb") as f:
                    while True:
                        chunk = response.read(chunk_size)
                        if not chunk:
                            break
                        f.write(chunk)
                        downloaded += len(chunk)

                        now = time.perf_counter()
                        if now - last_report >= 2.0 or downloaded == total_size:
                            speed_mb = (downloaded / (1024**2)) / (now - start_time)
                            pct = (downloaded / total_size) * 100 if total_size > 0 else 0
                            print(
                                f"  [{pct:5.1f}%] {downloaded / (1024**2):6.1f} / {total_size / (1024**2):.1f} MB "
                                f"({speed_mb:4.1f} MB/s)",
                                flush=True,
                            )
                            last_report = now

                if os.path.exists(OUTPUT_PATH):
                    os.remove(OUTPUT_PATH)
                os.rename(temp_path, OUTPUT_PATH)
                print(f"Download complete! Saved to: {OUTPUT_PATH}")
                success = True
                break
        except Exception as e:
            print(f"Failed from {url}: {e}")

    if not success:
        print("ERROR: All mirror downloads failed.")
        sys.exit(1)

    return OUTPUT_PATH


if __name__ == "__main__":
    download_checkpoint()
