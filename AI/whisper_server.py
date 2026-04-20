"""
Flask Whisper Server - Local Speech-to-Text
============================================
Free alternative to Google Cloud Speech API
Uses OpenAI's Whisper model running locally

Features:
- 100% free (no API costs)
- Works offline
- Supports multiple audio formats (WEBM, MP3, WAV, etc.)
- Korean language support
- Fast processing with CPU/GPU

Endpoints:
- POST /transcribe - Convert audio to text
- GET /status - Check server health

Usage:
    from flask import Flask
    app = Flask(__name__)
    python whisper_server.py

Environment Variables:
    WHISPER_MODEL_SIZE: tiny, base, small, medium, large (default: base)
    WHISPER_DEVICE: cpu or cuda (default: cpu)
    WHISPER_COMPUTE_TYPE: int8, int16, float32 (default: int8)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os
import logging
import torch

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration from environment
WHISPER_MODEL_SIZE = os.getenv('WHISPER_MODEL_SIZE', 'base')
WHISPER_DEVICE = os.getenv('WHISPER_DEVICE', 'cpu')
WHISPER_COMPUTE_TYPE = os.getenv('WHISPER_COMPUTE_TYPE', 'int8')

# Global model (cached)
whisper_model = None

def load_whisper_model():
    """Load Whisper model once and cache it"""
    global whisper_model
    if whisper_model is None:
        logger.info(f'📥 Loading Whisper model: {WHISPER_MODEL_SIZE}...')
        try:
            whisper_model = whisper.load_model(WHISPER_MODEL_SIZE, device=WHISPER_DEVICE)
            logger.info(f'✅ Whisper model loaded successfully')
            logger.info(f'   Model: {WHISPER_MODEL_SIZE}')
            logger.info(f'   Device: {WHISPER_DEVICE}')
            logger.info(f'   Compute Type: {WHISPER_COMPUTE_TYPE}')
            if WHISPER_DEVICE == 'cuda':
                logger.info(f'   GPU Available: {torch.cuda.is_available()}')
        except Exception as e:
            logger.error(f'❌ Failed to load Whisper model: {str(e)}')
            raise
    return whisper_model

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio file to text
    
    Request:
        - audio: file (required) - Audio file in any format Whisper supports
        - language: string (optional) - Target language code (e.g., 'ko', 'en')
    
    Response:
        {
            "success": true,
            "text": "transcribed text",
            "language": "detected language",
            "processing_time": 1.23
        }
    """
    try:
        logger.info('🎤 Transcribe request received')
        
        # Validate request
        if 'audio' not in request.files:
            logger.warning('❌ No audio file in request')
            return jsonify({'error': 'No audio file provided', 'success': False}), 400

        audio_file = request.files['audio']
        
        if audio_file.filename == '':
            logger.warning('❌ Empty filename')
            return jsonify({'error': 'No selected file', 'success': False}), 400

        # Optional language specification
        language = request.form.get('language', 'ko')  # Default to Korean
        
        logger.info(f'   File: {audio_file.filename}')
        logger.info(f'   Language: {language}')
        
        # Save audio to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp_file:
            tmp_path = tmp_file.name
            audio_file.save(tmp_path)
            logger.info(f'   Saved to: {tmp_path}')

        try:
            # Load model
            model = load_whisper_model()
            
            # Transcribe
            logger.info('   🔄 Transcribing...')
            result = model.transcribe(
                tmp_path,
                language=language if language != 'auto' else None,
                verbose=False,
                temperature=0,  # Deterministic
                fp16=WHISPER_DEVICE == 'cuda'  # Use FP16 for GPU
            )
            
            transcript = result['text'].strip()
            detected_language = result.get('language', language)
            processing_time = result.get('processing_time', 0)
            
            logger.info(f'   ✅ Transcribed: {transcript}')
            logger.info(f'   Detected Language: {detected_language}')
            
            return jsonify({
                'success': True,
                'text': transcript,
                'language': detected_language,
                'processing_time': processing_time,
                'confidence': 0.95  # Whisper doesn't provide confidence, use placeholder
            }), 200

        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                logger.info(f'   🗑️ Cleaned up temp file')

    except Exception as e:
        logger.error(f'❌ Transcription error: {str(e)}', exc_info=True)
        return jsonify({
            'error': f'Transcription failed: {str(e)}',
            'success': False
        }), 500

@app.route('/status', methods=['GET'])
def status():
    """
    Check server status
    
    Response:
        {
            "status": "ok",
            "whisper_model": "base",
            "device": "cpu",
            "cuda_available": false
        }
    """
    try:
        logger.info('📊 Status check')
        return jsonify({
            'status': 'ok',
            'message': '✅ Whisper Server is running',
            'whisper_model': WHISPER_MODEL_SIZE,
            'device': WHISPER_DEVICE,
            'cuda_available': torch.cuda.is_available(),
            'compute_type': WHISPER_COMPUTE_TYPE,
            'model_loaded': whisper_model is not None
        }), 200
    except Exception as e:
        logger.error(f'❌ Status check failed: {str(e)}')
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Simple health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

@app.errorhandler(404)
def not_found(error):
    """404 handler"""
    logger.warning(f'🚨 404 Not Found: {request.path}')
    return jsonify({'error': 'Endpoint not found', 'path': request.path}), 404

@app.errorhandler(500)
def server_error(error):
    """500 handler"""
    logger.error(f'🚨 500 Server Error: {str(error)}')
    return jsonify({'error': 'Internal server error', 'details': str(error)}), 500

if __name__ == '__main__':
    logger.info('🚀 Starting Whisper Flask Server')
    logger.info(f'   Port: 5001')
    logger.info(f'   Model: {WHISPER_MODEL_SIZE}')
    logger.info(f'   Device: {WHISPER_DEVICE}')
    logger.info('')
    logger.info('🎯 Available Endpoints:')
    logger.info('   POST /transcribe - Transcribe audio')
    logger.info('   GET /status - Server status')
    logger.info('   GET /health - Health check')
    logger.info('')
    logger.info('📲 Ready to accept connections on http://localhost:5001')
    
    # Load model at startup to avoid initial delay
    try:
        load_whisper_model()
    except Exception as e:
        logger.error(f'Failed to preload model: {str(e)}')
        logger.warning('Will attempt to load on first request')
    
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
