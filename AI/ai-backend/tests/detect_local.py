#!/usr/bin/env python3
"""Direct object detection on local machine without web server"""

import cv2
import numpy as np
import json
import torch
import os
from pathlib import Path

# Patch torch.load BEFORE importing YOLO
original_load = torch.load

def patched_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return original_load(*args, **kwargs)

torch.load = patched_load

from ultralytics import YOLO

# Set torch to use weights_only=False for YOLO compatibility
os.environ['TORCH_WEIGHTS_ONLY'] = '0'

print("=" * 60)
print("YOLO Object Detection - Direct Mode")
print("=" * 60)

# Load YOLO model
print("\n📦 Loading YOLOv8 model...")
model = YOLO('yolov8n.pt')
print("✅ Model loaded!")

# Load Korean labels
print("🇰🇷 Loading Korean vocabulary...")
try:
    with open('labels_ko_fixed.json', 'r', encoding='utf-8') as f:
        labels_ko = json.load(f)
    print(f"✅ Loaded {len(labels_ko)} Korean labels (fixed version)")
except FileNotFoundError:
    print("⚠️  labels_ko_fixed.json not found, creating default...")
    # Create default mapping
    coco_names = [
        "사람", "자전거", "자동차", "오토바이", "비행기",
        "버스", "기차", "트럭", "배", "신호등",
        "소화전", "정지 표지판", "주차 미터기", "벤치", "새",
        "고양이", "개", "말", "양", "소",
        "코끼리", "곰", "얼룩말", "기린", "배낭",
        "우산", "핸드백", "넥타이", "여행 가방", "프리스비",
        "스키", "스노보드", "공", "연", "야구 방망이",
        "야구 글러브", "스케이트보드", "서핑보드", "테니스 라켓", "병",
        "와인잔", "컵", "포크", "칼", "숟가락",
        "그릇", "바나나", "사과", "샌드위치", "오렌지",
        "브로콜리", "당근", "핫도그", "피자", "도넛",
        "케이크", "의자", "소파", "화분", "침대",
        "식탁", "변기", "텔레비전", "노트북", "마우스",
        "리모컨", "키보드", "휴대전화", "전자레인지", "오븐",
        "토스터", "싱크대", "냉장고", "책", "시계",
        "꽃병", "가위", "테디 베어", "헤어 드라이어", "칫솔"
    ]
    labels_ko = {str(i): name for i, name in enumerate(coco_names)}
    print(f"✅ Using default Korean labels")

def detect_image(image_path):
    """Detect objects in a single image"""
    print(f"\n📸 Processing: {image_path}")
    
    # Check if file exists
    if not os.path.exists(image_path):
        print(f"❌ File not found: {image_path}")
        return None
    
    # Read image
    img = cv2.imread(image_path)
    if img is None:
        print(f"❌ Cannot read image: {image_path}")
        return None
    
    print(f"   Image size: {img.shape[1]}x{img.shape[0]}")
    
    # Run YOLO detection
    print("   Running detection...")
    results = model(img, conf=0.5)
    
    detected_objects = []
    
    # Parse results
    for result in results:
        boxes = result.boxes
        print(f"\n   Found {len(boxes)} objects:")
        
        for idx, box in enumerate(boxes, 1):
            cls_id = int(box.cls[0])
            confidence = float(box.conf[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            # Get names (Korean first!)
            name_ko = labels_ko.get(str(cls_id), "Unknown")
            name_en = model.names[cls_id]
            
            obj = {
                "id": idx,
                "class_id": cls_id,
                "name_ko": name_ko,
                "name_en": name_en,
                "confidence": round(confidence, 3),
                "bbox": {
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2,
                    "width": x2 - x1,
                    "height": y2 - y1
                }
            }
            detected_objects.append(obj)
            
            print(f"     {idx}. {name_ko} ({name_en})")
            print(f"        Confidence: {confidence:.1%}")
            print(f"        Bbox: ({x1}, {y1}) to ({x2}, {y2})")
    
    return {
        "success": True,
        "image_path": image_path,
        "objects": detected_objects,
        "total_detected": len(detected_objects)
    }

def detect_webcam():
    """Real-time detection from webcam"""
    print("\n🎥 Starting webcam detection...")
    print("   Press 'q' to quit, 's' to save image")
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Cannot open webcam")
        return
    
    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_count += 1
        
        # Run detection every 5 frames to save processing power
        if frame_count % 5 == 0:
            results = model(frame, conf=0.5)
            
            # Draw boxes
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    cls_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    
                    name_en = model.names[cls_id]
                    name_ko = labels_ko.get(str(cls_id), "Unknown")
                    
                    # Draw bounding box
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    
                    # Draw label
                    label = f"{name_en} ({name_ko}) {confidence:.1%}"
                    cv2.putText(frame, label, (x1, y1 - 10),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        # Display frame
        cv2.imshow('YOLO Detection', frame)
        
        # Handle keyboard
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            cv2.imwrite(f'webcam_capture_{frame_count}.jpg', frame)
            print(f"   ✅ Saved: webcam_capture_{frame_count}.jpg")
    
    cap.release()
    cv2.destroyAllWindows()
    print("✅ Webcam closed")

def main():
    """Main function"""
    import sys
    
    print("\n📋 Usage:")
    print("   python3 detect_local.py [image_path]")
    print("   python3 detect_local.py --webcam")
    print("   python3 detect_local.py --demo")
    
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        
        if arg == '--webcam':
            detect_webcam()
        
        elif arg == '--demo':
            # Create test image
            print("\n🎨 Creating demo image...")
            img = np.ones((480, 640, 3), dtype=np.uint8) * 255
            cv2.rectangle(img, (50, 50), (200, 200), (0, 0, 255), -1)
            cv2.rectangle(img, (300, 100), (500, 300), (0, 255, 0), -1)
            cv2.circle(img, (400, 400), 50, (255, 0, 0), -1)
            
            demo_path = 'demo_image.jpg'
            cv2.imwrite(demo_path, img)
            print(f"✅ Saved demo image: {demo_path}")
            
            result = detect_image(demo_path)
            if result:
                print("\n" + "=" * 60)
                print("📊 Detection Results:")
                print("=" * 60)
                print(json.dumps(result, indent=2, ensure_ascii=False))
        
        else:
            # Detect image
            result = detect_image(arg)
            if result:
                print("\n" + "=" * 60)
                print("📊 Detection Results:")
                print("=" * 60)
                print(json.dumps(result, indent=2, ensure_ascii=False))
    
    else:
        print("\n⚠️  No argument provided!")
        print("\nExamples:")
        print("   python3 detect_local.py photo.jpg")
        print("   python3 detect_local.py /path/to/image.png")
        print("   python3 detect_local.py --webcam")
        print("   python3 detect_local.py --demo")

if __name__ == '__main__':
    main()
