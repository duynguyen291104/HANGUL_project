#!/usr/bin/env python3
"""YOLO Detection - Flask Server with PostgreSQL Integration"""

import cv2
import numpy as np
import json
import torch
import os
import sys
import threading
import time
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
from flask import Flask, Response, jsonify, request, send_file
from flask_cors import CORS
from gtts import gTTS
import io
import csv
import psycopg2
from psycopg2.extras import execute_values
import requests

# Setup torch
original_load = torch.load
def patched_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return original_load(*args, **kwargs)
torch.load = patched_load

from ultralytics import YOLO

os.environ['TORCH_WEIGHTS_ONLY'] = '0'

print("=" * 70)
print("🎥 YOLO Detection - Flask Server (PostgreSQL Integration)")
print("=" * 70)

# Initialize Flask
app = Flask(__name__)
CORS(app)

# PostgreSQL Configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'postgres'),  # Use 'postgres' as default (Docker service name)
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME', 'hangul'),
    'user': os.getenv('DB_USER', 'hangul'),
    'password': os.getenv('DB_PASSWORD', 'hangul123'),
}

# Backend API Configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://backend:5000')  # Use 'backend' as default (Docker service name)
BACKEND_API_KEY = os.getenv('BACKEND_API_KEY', '')

# Load fonts
print("📝 Loading Korean font...")
font_path = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
if not os.path.exists(font_path):
    font_path = "/usr/share/fonts/truetype/nanum/NanumSquareRoundB.ttf"

try:
    korean_font = ImageFont.truetype(font_path, 40) if os.path.exists(font_path) else None
    print("✅ Korean font loaded")
except Exception as e:
    korean_font = None
    print(f"⚠️  Font: {e}")

# Load model
print("📦 Loading YOLOv8 model...")
model = YOLO('yolov8s.pt')
print("✅ Model loaded!")

# Load labels
print("🇰🇷 Loading labels...")
try:
    with open('labels_ko_fixed.json', 'r', encoding='utf-8') as f:
        labels_ko = json.load(f)
except FileNotFoundError:
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

# Global state
class DetectionState:
    def __init__(self):
        self.frame = None
        self.detections = []
        self.lock = threading.Lock()
        self.is_running = False
        self.frame_count = 0
        self.skip_frames = 1
        self.confidence_threshold = 0.35
        self.max_object_age = 15
        self.tracked_objects = {}
        self.next_id = 0
        self.is_recording = False
        self.video_writer = None
        self.detection_history = []
        self.last_spoken = {}
        self.session_id = str(int(time.time() * 1000))  # Session ID
        self.session_start = datetime.now()
        self.user_id = 1  # Default user for now

# ========================
# INITIALIZATION
# ========================
state = DetectionState()

# Start webcam thread
def capture_frames():
    print("📹 Starting webcam capture...")
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    if not cap.isOpened():
        print("❌ Cannot open webcam")
        return

    print("✅ Webcam opened")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("⚠️  Failed to read frame")
            continue

        with state.lock:
            state.frame = frame
            
            if state.is_running and state.frame_count % state.skip_frames == 0:
                try:
                    results = model.predict(frame, conf=state.confidence_threshold, verbose=False)
                    state.detections = []

                    for result in results:
                        for box in result.boxes:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            confidence = float(box.conf[0])
                            class_id = int(box.cls[0])
                            label = labels_ko.get(str(class_id), f"Object {class_id}")

                            state.detections.append({
                                'label': label,
                                'confidence': confidence,
                                'bbox': {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2},
                                'class_id': class_id,
                                'timestamp': datetime.now().isoformat(),
                                'frame_number': state.frame_count,
                            })

                            # Add to history
                            state.detection_history.append({
                                'label': label,
                                'confidence': confidence,
                                'bbox': {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2},
                                'class_id': class_id,
                                'timestamp': datetime.now().isoformat(),
                                'frame_number': state.frame_count,
                            })

                except Exception as e:
                    print(f"⚠️  Detection error: {e}")

            state.frame_count += 1

capture_thread = threading.Thread(target=capture_frames, daemon=True)
capture_thread.start()

# ========================
# HEALTH CHECK
# ========================

@app.route('/api/yolo/health', methods=['GET'])
def health():
    try:
        conn = get_db_connection()
        db_status = "✅ Connected" if conn else "❌ Error"
        if conn:
            conn.close()
        
        return jsonify({
            'status': 'running',
            'model': 'YOLOv8s',
            'database': db_status,
            'detections': len(state.detections),
            'frame_count': state.frame_count,
            'session': state.session_id,
        })
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

# ========================
# MJPEG STREAM
# ========================

def generate_frames():
    while True:
        with state.lock:
            if state.frame is None:
                continue

            frame = state.frame.copy()

            # Draw detections with Korean text support
            if state.detections:
                # Convert BGR to RGB for PIL
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)
                draw = ImageDraw.Draw(pil_image)

                for det in state.detections:
                    bbox = det['bbox']
                    x1, y1, x2, y2 = bbox['x1'], bbox['y1'], bbox['x2'], bbox['y2']
                    label = det['label']
                    confidence = det['confidence']

                    # Draw rectangle on PIL (RGB format: green = (0, 255, 0))
                    draw.rectangle([x1, y1, x2, y2], outline=(0, 255, 0), width=2)
                    
                    # Draw text with Korean font (PIL uses RGB format)
                    text = f"{label}: {confidence:.2f}"
                    if korean_font:
                        # Draw background rectangle for text
                        text_bbox = draw.textbbox((x1, y1 - 40), text, font=korean_font)
                        draw.rectangle(text_bbox, fill=(0, 0, 0, 180))
                        # Draw text in green
                        draw.text((x1, y1 - 40), text, font=korean_font, fill=(0, 255, 0))
                    else:
                        # Fallback to cv2 rectangle on original frame
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

                # Convert back to BGR for OpenCV
                frame = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

        ret, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/api/yolo/stream', methods=['GET'])
def stream():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# ========================
# DETECTIONS API
# ========================

@app.route('/api/yolo/detections', methods=['GET'])
def get_detections():
    with state.lock:
        detections = state.detections.copy()
    
    return jsonify({
        'count': len(detections),
        'detections': detections,
        'frame_number': state.frame_count,
    })

# ========================
# SAVE TO POSTGRESQL
# ========================

@app.route('/api/yolo/save-detections', methods=['POST'])
def save_detections():
    """Save detections to PostgreSQL"""
    try:
        data = request.json or {}
        user_id = data.get('user_id', state.user_id)
        detections_to_save = data.get('detections', state.detections)

        if not detections_to_save:
            return jsonify({'success': False, 'error': 'No detections to save'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Database connection failed'}), 500

        try:
            cursor = conn.cursor()

            # Insert detections
            for det in detections_to_save:
                sql = """
                INSERT INTO "YOLODetection" 
                (userId, label, confidence, bbox, sessionId, frameNumber, source, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                values = (
                    user_id,
                    det['label'],
                    det['confidence'],
                    json.dumps(det['bbox']),
                    state.session_id,
                    det.get('frame_number', 0),
                    'webcam',
                    datetime.now(),
                    datetime.now(),
                )
                cursor.execute(sql, values)

            conn.commit()
            cursor.close()
            conn.close()

            return jsonify({
                'success': True,
                'count': len(detections_to_save),
                'session_id': state.session_id,
            })

        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'error': str(e)}), 500

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ========================
# BACKEND API INTEGRATION
# ========================

@app.route('/api/yolo/sync-backend', methods=['POST'])
def sync_backend():
    """Sync detections to Backend API"""
    try:
        data = request.json or {}
        user_id = data.get('user_id', state.user_id)
        detections_to_sync = data.get('detections', state.detections)

        if not detections_to_sync:
            return jsonify({'success': False, 'error': 'No detections to sync'}), 400

        # Call backend API to save detections
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {BACKEND_API_KEY}' if BACKEND_API_KEY else None,
        }

        payload = {
            'detections': detections_to_sync,
            'sessionId': state.session_id,
        }

        response = requests.post(
            f'{BACKEND_URL}/api/yolo/batch-save',
            json=payload,
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            return jsonify({'success': True, **result})
        else:
            return jsonify({
                'success': False,
                'error': f'Backend error: {response.status_code}',
                'details': response.text,
            }), 500

    except requests.exceptions.RequestException as e:
        return jsonify({'success': False, 'error': f'Request error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ========================
# VOICE SYNTHESIS
# ========================

@app.route('/api/yolo/speak', methods=['POST'])
def speak():
    try:
        data = request.json or {}
        text = data.get('text', '감지됨')
        
        tts = gTTS(text=text, lang='ko', slow=False)
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        return send_file(audio_buffer, mimetype='audio/mpeg')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================
# RECORDING
# ========================

@app.route('/api/yolo/record/start', methods=['POST'])
def start_recording():
    try:
        with state.lock:
            if state.is_recording:
                return jsonify({'success': False, 'error': 'Already recording'}), 400

            state.is_recording = True
            
            # Initialize video writer
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_path = f'/tmp/detection_{timestamp}.avi'
            
            fourcc = cv2.VideoWriter_fourcc(*'MJPG')
            state.video_writer = cv2.VideoWriter(output_path, fourcc, 30.0, (640, 480))
            
            return jsonify({
                'success': True,
                'output_path': output_path,
                'timestamp': timestamp,
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/yolo/record/stop', methods=['POST'])
def stop_recording():
    try:
        with state.lock:
            if not state.is_recording:
                return jsonify({'success': False, 'error': 'Not recording'}), 400

            state.is_recording = False
            
            if state.video_writer:
                state.video_writer.release()
                state.video_writer = None
            
            return jsonify({'success': True, 'message': 'Recording stopped'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ========================
# EXPORT
# ========================

@app.route('/api/yolo/export', methods=['GET'])
def export_detections():
    try:
        format_type = request.args.get('format', 'json').lower()
        detections = state.detection_history or state.detections

        if format_type == 'csv':
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=['label', 'confidence', 'bbox', 'timestamp', 'frame_number'])
            writer.writeheader()
            
            for det in detections:
                writer.writerow({
                    'label': det['label'],
                    'confidence': f"{det['confidence']:.4f}",
                    'bbox': json.dumps(det['bbox']),
                    'timestamp': det.get('timestamp', ''),
                    'frame_number': det.get('frame_number', 0),
                })
            
            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode()),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'detections_{int(time.time())}.csv'
            )

        else:  # JSON
            return send_file(
                io.BytesIO(json.dumps(detections, indent=2, ensure_ascii=False).encode('utf-8')),
                mimetype='application/json',
                as_attachment=True,
                download_name=f'detections_{int(time.time())}.json'
            )

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================
# CONTROL
# ========================

@app.route('/api/yolo/start', methods=['POST'])
def start_detection():
    with state.lock:
        state.is_running = True
    return jsonify({'success': True, 'message': 'Detection started'})

@app.route('/api/yolo/stop', methods=['POST'])
def stop_detection():
    with state.lock:
        state.is_running = False
    return jsonify({'success': True, 'message': 'Detection stopped'})

@app.route('/api/yolo/reset', methods=['POST'])
def reset_state():
    with state.lock:
        state.detections = []
        state.detection_history = []
        state.frame_count = 0
        state.session_id = str(int(time.time() * 1000))
    return jsonify({'success': True, 'new_session_id': state.session_id})

if __name__ == '__main__':
    print(f"🚀 Starting YOLO Flask Server")
    print(f"📡 Database: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    print(f"🔗 Backend: {BACKEND_URL}")
    app.run(host='0.0.0.0', port=5001, debug=False)
