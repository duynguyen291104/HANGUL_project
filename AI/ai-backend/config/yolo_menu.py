#!/usr/bin/env python3
"""Simple menu to run YOLO detection"""

import os
import subprocess
import sys

def main():
    print("=" * 70)
    print("🎯 YOLO Detection Menu")
    print("=" * 70)
    
    while True:
        print("\n📋 Choose option:")
        print("   1. 🎥 Webcam Real-time Detection")
        print("   2. 📸 Detect from Image File")
        print("   3. 🌐 Start Web Server (localhost:5001)")
        print("   4. ❓ Help & Usage")
        print("   5. ❌ Exit")
        print()
        
        choice = input("👉 Enter choice (1-5): ").strip()
        
        if choice == '1':
            print("\n▶️  Starting webcam detection...")
            print("   Press 'q' to quit, 's' to save, 'r' to change speed\n")
            os.system('python3 webcam_detection.py')
        
        elif choice == '2':
            image_path = input("\n📁 Enter image path: ").strip()
            if os.path.exists(image_path):
                print(f"\n▶️  Detecting objects in {image_path}...\n")
                os.system(f'python3 detect_local.py "{image_path}"')
            else:
                print(f"❌ File not found: {image_path}")
        
        elif choice == '3':
            print("\n▶️  Starting Flask web server...")
            print("   Visit: http://localhost:5001")
            print("   Press Ctrl+C to stop\n")
            os.system('python3 app.py')
        
        elif choice == '4':
            print("""
╔════════════════════════════════════════════════════════════════════╗
║                     YOLO Detection - Usage Guide                   ║
╚════════════════════════════════════════════════════════════════════╝

🎥 WEBCAM DETECTION (Option 1)
   python3 webcam_detection.py
   
   Controls:
   - 'q': Quit
   - 's': Save current frame
   - 'r': Change detection speed (skip frames)
   - 'c': Change confidence threshold
   - 'h': Toggle stats display

📸 IMAGE DETECTION (Option 2)
   python3 detect_local.py image.jpg
   
   Examples:
   python3 detect_local.py /path/to/photo.jpg
   python3 detect_local.py ~/Pictures/test.png

🌐 WEB SERVER (Option 3)
   python3 app.py
   
   Then use API:
   POST http://localhost:5001/detect
   Content-Type: application/json
   
   Body:
   {
     "image": "base64_encoded_image"
   }

💡 TIPS
   - For real-time: Use webcam_detection.py (fastest)
   - For accuracy: Use detect_local.py with good images
   - For integration: Use web server (app.py)
   - Models: yolov8n.pt (nano - fast), yolov8s.pt (small - accurate)

📊 DETECTED CLASSES
   80 COCO classes including:
   - Objects: person, car, dog, cat, etc.
   - Animals: horse, cow, sheep, etc.
   - Vehicles: bus, train, truck, bike, etc.
""")
        
        elif choice == '5':
            print("\n👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice! Please enter 1-5")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Goodbye!")
        sys.exit(0)
