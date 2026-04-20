# HANGUL Learning App - Flask AI Backend

Python-based AI services for the HANGUL learning application.

## Features

- 🎯 **Object Detection** - YOLOv8 for camera vocabulary detection
- 🎤 **Pronunciation Scoring** - Audio analysis and feedback
- 🗣️ **Text-to-Speech** - Generate native audio pronunciations
- 🤖 **ML Integration** - TensorFlow/PyTorch models

## Tech Stack

- **Runtime**: Python 3.9+
- **Framework**: Flask
- **ML**: YOLOv8, TensorFlow/PyTorch
- **Audio**: librosa, soundfile
- **AI Services**: Azure Cognitive Services, Google Cloud

## Installation

### Prerequisites
- Python 3.9+
- pip
- YOLOv8 weights (auto-downloaded on first use)

### Setup

```bash
cd AI
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Variables

Create `.env`:
```
FLASK_ENV=development
FLASK_APP=app.py
YOLO_MODEL_PATH=models/yolov8n.pt
AZURE_SPEECH_KEY=your-key
AZURE_SPEECH_REGION=eastus
```

### Download YOLOv8 Model

```bash
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
```

## Running

```bash
python app.py
```

Server runs on [http://localhost:5001](http://localhost:5001)

## API Endpoints

### Health Check
```
GET /health
```

### Camera Detection
```
POST /api/detect-camera
Content-Type: application/json

{
    "image": "base64_image_string",
    "canvasSize": {"width": 640, "height": 480}
}
```

Response:
```json
{
    "objects": [
        {
            "name": "cup",
            "korean": "컵",
            "romanization": "keop",
            "confidence": 0.95
        }
    ]
}
```

### Pronunciation Scoring
```
POST /api/pronunciation-score
Content-Type: application/json

{
    "audio": "base64_audio_string",
    "word": "apple",
    "userId": 1
}
```

Response:
```json
{
    "accuracyScore": 85,
    "fluencyScore": 80,
    "completenessScore": 90,
    "overallScore": 85,
    "feedback": "Good pronunciation!",
    "phoneticErrors": []
}
```

## Project Structure

```
AI/
├── app.py                  # Flask app
├── models/                 # YOLOv8 weights
├── scripts/               # Training/preprocessing scripts
├── requirements.txt       # Python dependencies
└── .env.example          # Environment variables
```

## Dependencies

See `requirements.txt`:
- flask
- flask-cors
- ultralytics (YOLOv8)
- torch
- opencv-python
- pillow
- librosa
- azure-cognitiveservices-speech
- google-cloud-texttospeech

## Development Tips

- YOLOv8n is a lightweight model (~6MB) suitable for real-time detection
- For production, consider using YOLOv8s or YOLOv8m for better accuracy
- Use GPU if available for faster inference
- Cache model in memory to avoid reload latency

## Contributing

- Follow PEP 8 style guide
- Add error handling for all endpoints
- Document new endpoints

## License

MIT
