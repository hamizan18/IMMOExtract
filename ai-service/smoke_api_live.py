"""Live loopback HTTP smoke test for IMMOExtract FastAPI AI Service.

Spins up a live Uvicorn server subprocess on 127.0.0.1:8005, executes real HTTP
requests against /health and /extract, verifies transparency, and terminates cleanly.
"""

import base64
import io
import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error
from PIL import Image, ImageDraw


def create_fixture(width=200, height=300):
    img = Image.new("RGB", (width, height), (240, 240, 240))
    draw = ImageDraw.Draw(img)
    # Head
    draw.ellipse([width * 0.35, height * 0.05, width * 0.65, height * 0.22], fill=(60, 40, 20))
    # Body
    draw.rectangle([width * 0.25, height * 0.22, width * 0.75, height * 0.55], fill=(30, 80, 180))
    # Legs
    draw.rectangle([width * 0.28, height * 0.55, width * 0.72, height * 0.90], fill=(40, 40, 50))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def encode_multipart_formdata(fields, files):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = bytearray()
    for key, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{value}\r\n".encode("utf-8"))
    for key, (filename, file_bytes, content_type) in files.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(
            f'Content-Disposition: form-data; name="{key}"; filename="{filename}"\r\n'.encode("utf-8")
        )
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(file_bytes)
        body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    return bytes(body), f"multipart/form-data; boundary={boundary}"


def main():
    ai_dir = os.path.dirname(os.path.abspath(__file__))
    python_exe = sys.executable
    port = 8005
    base_url = f"http://127.0.0.1:{port}"

    print(f"Starting live Uvicorn server on {base_url}...")
    proc = subprocess.Popen(
        [
            python_exe,
            "-m",
            "uvicorn",
            "main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--app-dir",
            ai_dir,
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    try:
        # Wait for server to come up
        health_data = None
        for attempt in range(30):
            try:
                with urllib.request.urlopen(f"{base_url}/health", timeout=2) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode("utf-8"))
                        if data.get("model_loaded") is True:
                            health_data = data
                            break
            except Exception:
                time.sleep(0.5)

        if not health_data:
            raise RuntimeError("Server failed to report healthy model within 15 seconds.")

        print(f"PASS: Live GET /health responded with: {health_data}")

        # Send POST /extract
        print("Sending POST /extract with fixture image...")
        fixture_bytes = create_fixture(200, 300)
        body, content_type = encode_multipart_formdata(
            {"include_base64": "true"},
            {"file": ("person.png", fixture_bytes, "image/png")},
        )

        req = urllib.request.Request(
            f"{base_url}/extract",
            data=body,
            headers={"Content-Type": content_type},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            assert resp.status == 200, f"Expected 200, got {resp.status}"
            extract_data = json.loads(resp.read().decode("utf-8"))

        assert extract_data["status"] == "success"
        assert extract_data["original_size"] == [200, 300]
        assert "image_base64" in extract_data
        assert "mask_base64" in extract_data

        rgba_bytes = base64.b64decode(extract_data["image_base64"])
        with Image.open(io.BytesIO(rgba_bytes)) as pil_rgba:
            assert pil_rgba.size == (200, 300)
            assert pil_rgba.mode == "RGBA"

        print(
            f"PASS: Live POST /extract succeeded in {extract_data['execution_time_seconds']}s, "
            f"categories detected: {extract_data['categories_present']}"
        )
        print("=== LIVE UVICORN SMOKE TEST PASS ===")

    finally:
        print("Stopping Uvicorn subprocess...")
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()


if __name__ == "__main__":
    main()
