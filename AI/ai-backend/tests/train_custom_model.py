#!/usr/bin/env python3
"""Train custom YOLO model on your dataset"""

import torch
from ultralytics import YOLO
import os
import yaml

print("=" * 70)
print("🚀 YOLO Custom Model Training")
print("=" * 70)

# Setup torch
original_load = torch.load
def patched_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return original_load(*args, **kwargs)
torch.load = patched_load

os.environ['TORCH_WEIGHTS_ONLY'] = '0'

# Check dataset exists
dataset_path = '../coco128_split'
if not os.path.exists(dataset_path):
    print(f"❌ Dataset not found: {dataset_path}")
    print("Please make sure coco128_split folder exists with images/ and labels/ folders")
    exit(1)

print(f"\n📁 Dataset path: {dataset_path}")
print(f"✅ Dataset found!")

# Create data.yaml for YOLO
data_yaml = {
    'path': os.path.abspath(dataset_path),
    'train': 'images/train',
    'val': 'images/val',
    'nc': 80,  # Number of classes (COCO)
    'names': [
        'person', 'bicycle', 'car', 'motorcycle', 'airplane',
        'bus', 'train', 'truck', 'boat', 'traffic light',
        'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird',
        'cat', 'dog', 'horse', 'sheep', 'cow',
        'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
        'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
        'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat',
        'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle',
        'wine glass', 'cup', 'fork', 'knife', 'spoon',
        'bowl', 'banana', 'apple', 'sandwich', 'orange',
        'broccoli', 'carrot', 'hot dog', 'pizza', 'donut',
        'cake', 'chair', 'couch', 'potted plant', 'bed',
        'dining table', 'toilet', 'tv', 'laptop', 'mouse',
        'remote', 'keyboard', 'cell phone', 'microwave', 'oven',
        'toaster', 'sink', 'refrigerator', 'book', 'clock',
        'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
    ]
}

# Save data.yaml
yaml_path = 'data.yaml'
with open(yaml_path, 'w') as f:
    yaml.dump(data_yaml, f)
print(f"\n✅ Created: {yaml_path}")

# Load pretrained model
print("\n📦 Loading YOLOv8 model...")
model = YOLO('yolov8s.pt')
print("✅ Model loaded!")

# Train
print("\n" + "=" * 70)
print("🎓 TRAINING CONFIGURATION")
print("=" * 70)
print(f"Model: YOLOv8 Small (yolov8s)")
print(f"Dataset: COCO128 (80 classes)")
print(f"Epochs: 10 (quick CPU training)")
print(f"Batch: 16")
print(f"Image size: 640x640")
print("\nThis will train on your dataset to improve detection!")
print("=" * 70 + "\n")

print("⏳ Training starting...\n")

# Train model
results = model.train(
    data=yaml_path,
    epochs=10,
    imgsz=640,
    batch=16,
    patience=5,
    save=True,
    device='cpu',  # CPU training (no GPU available)
    project='runs/detect',
    name='custom_yolov8s',
    pretrained=True,
    verbose=True,
    half=False,  # Disable FP16 for CPU compatibility
    optimizer='SGD',
    lr0=0.01,
    lrf=0.01,
    momentum=0.937,
    weight_decay=0.0005,
    warmup_epochs=3,
    warmup_momentum=0.8,
    warmup_bias_lr=0.1,
    box=7.5,
    cls=0.5,
    dfl=1.5,
)

print("\n" + "=" * 70)
print("✅ TRAINING COMPLETED!")
print("=" * 70)
print(f"\n📊 Results saved in: runs/detect/custom_yolov8s/")
print(f"   weights/best.pt - Best trained model")
print(f"   weights/last.pt - Last checkpoint")
print(f"\n🎯 To use trained model:")
print(f"   cp runs/detect/custom_yolov8s/weights/best.pt ./yolov8s_custom.pt")
print(f"   python3 webcam_fullscreen.py  # Will use best.pt automatically")
print("=" * 70)
