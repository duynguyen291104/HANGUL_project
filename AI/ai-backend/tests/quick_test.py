#!/usr/bin/env python3
import subprocess
import sys
import urllib.request
import os

print("Downloading sample image from internet...")
try:
    url = "https://ultralytics.com/images/bus.jpg"
    urllib.request.urlretrieve(url, "test_bus.jpg")
    print("✅ Downloaded test_bus.jpg")
    
    # Run detection
    subprocess.run([sys.executable, "detect_local.py", "test_bus.jpg"])
except Exception as e:
    print(f"Cannot download: {e}")
    print("\nTry this instead:")
    print("  python3 detect_local.py /path/to/your/image.jpg")
    print("  python3 detect_local.py --webcam")
