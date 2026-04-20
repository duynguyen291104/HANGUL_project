!/usr/bin/env python3
"""Test camera detection API flow"""
import cv2
import base64
import requests
import json

print("=" * 60)
print("🎬 HANGUL Camera Detection API Test")
print("=" * 60)

# 1. Capture frame from webcam
print("\n1️⃣ Capturing frame from webcam...")
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("❌ Cannot open camera")
    exit(1)

ret, frame = cap.read()
cap.release()

if not ret:
    print("❌ Cannot read frame")
    exit(1)

print("✅ Frame captured")

# 2. Encode to base64 and JPEG
print("\n2️⃣ Encoding frame to base64...")
ret, buffer = cv2.imencode('.jpg', frame)
image_base64 = base64.b64encode(buffer).decode('utf-8')
image_data_url = f"data:image/jpeg;base64,{image_base64}"
print(f"✅ Encoded ({len(image_data_url)} bytes)")

# 3. Test Flask directly
print("\n3️⃣ Testing Flask AI backend (port 5001)...")
try:
    response = requests.post(
        'http://localhost:5001/detect',
        json={'image': image_data_url},
        timeout=10
    )
    if response.status_code == 200:
        flask_result = response.json()
        print(f"✅ Flask response: {json.dumps(flask_result, indent=2)}")
    else:
        print(f"❌ Flask error {response.status_code}: {response.text}")
except Exception as e:
    print(f"❌ Flask connection failed: {e}")

# 4. Test Backend API
print("\n4️⃣ Testing Backend API (port 5000)...")
try:
    response = requests.post(
        'http://localhost:5000/api/camera/detect',
        json={'image': image_data_url},
        timeout=10
    )
    if response.status_code == 200:
        backend_result = response.json()
        print(f"✅ Backend response: {json.dumps(backend_result, indent=2)}")
    else:
        print(f"❌ Backend error {response.status_code}: {response.text}")
except Exception as e:
    print(f"❌ Backend connection failed: {e}")

print("\n" + "=" * 60)
print("✅ Test complete! Check results above")
print("=" * 60)
