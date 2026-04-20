#!/usr/bin/env python3
"""Test script for object detection API"""

import requests
import base64
import json
import cv2
import numpy as np

def test_with_sample_image():
    """Create a simple test image and test detection"""
    
    # Create a simple test image (white background)
    img = np.ones((480, 640, 3), dtype=np.uint8) * 255
    
    # Draw some colored rectangles to simulate objects
    cv2.rectangle(img, (50, 50), (200, 200), (0, 0, 255), -1)  # Red square
    cv2.rectangle(img, (300, 100), (500, 300), (0, 255, 0), -1)  # Green rectangle
    cv2.circle(img, (400, 400), 50, (255, 0, 0), -1)  # Blue circle
    
    # Save test image
    cv2.imwrite('test_image.jpg', img)
    print("Created test image: test_image.jpg")
    
    # Encode to base64
    _, buffer = cv2.imencode('.jpg', img)
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    
    # Send to API
    url = 'http://localhost:5001/detect'
    payload = {'image': img_base64}
    
    print(f"\nSending request to {url}...")
    response = requests.post(url, json=payload)
    
    print(f"Status: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    
    return response.json()

def test_with_url_image():
    """Test with a real image from URL (if internet available)"""
    
    # Download a sample image
    img_url = "https://ultralytics.com/images/bus.jpg"
    
    try:
        print(f"\nDownloading image from {img_url}...")
        img_response = requests.get(img_url, timeout=5)
        
        if img_response.status_code == 200:
            # Save image
            with open('bus_test.jpg', 'wb') as f:
                f.write(img_response.content)
            print("Saved image: bus_test.jpg")
            
            # Encode to base64
            img_base64 = base64.b64encode(img_response.content).decode('utf-8')
            
            # Send to API
            url = 'http://localhost:5001/detect'
            payload = {'image': img_base64}
            
            print(f"Sending request to {url}...")
            response = requests.post(url, json=payload)
            
            print(f"Status: {response.status_code}")
            print(f"Response:\n{json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            
            return response.json()
    except Exception as e:
        print(f"Could not download image: {e}")
        return None

if __name__ == '__main__':
    print("=" * 60)
    print("Testing AI Object Detection API")
    print("=" * 60)
    
    # Test with simple generated image
    print("\n1. Testing with generated test image...")
    result1 = test_with_sample_image()
    
    # Test with real image
    print("\n" + "=" * 60)
    print("2. Testing with real image from URL...")
    result2 = test_with_url_image()
    
    print("\n" + "=" * 60)
    print("Testing completed!")
