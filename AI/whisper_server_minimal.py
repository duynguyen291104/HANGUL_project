#!/usr/bin/env python3
"""
Minimal Whisper Flask Server - Works with pip install openai-whisper
No compilation, pure binary wheels only.
"""

import json
import os
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Try to import whisper - if not available, provide stub
try:
    import whisper
    WHISPER_AVAILABLE = True
    MODEL_SIZE = os.getenv('WHISPER_MODEL_SIZE', 'base')
    print(f"✅ Whisper module found - loading model '{MODEL_SIZE}'...")
    model = whisper.load_model(MODEL_SIZE)
    print(f"✅ Model loaded successfully!")
except ImportError:
    WHISPER_AVAILABLE = False
    print("⚠️ Whisper not installed yet - using stub mode")
    print("   Run: pip install openai-whisper")
    model = None

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Transcribe audio using Whisper"""
    
    if not WHISPER_AVAILABLE or model is None:
        return jsonify({
            'success': False,
            'error': 'Whisper not installed',
            'message': 'Run: pip install openai-whisper',
            'stub': True
        }), 503

    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file'}), 400

        audio_file = request.files['audio']
        language = request.form.get('language', 'ko')

        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp:
            tmp_path = tmp.name
            audio_file.save(tmp_path)

        try:
            # Transcribe
            result = model.transcribe(
                tmp_path,
                language=language if language != 'auto' else None,
                verbose=False,
                temperature=0,
                fp16=False  # CPU mode
            )

            text = result['text'].strip()

            return jsonify({
                'success': True,
                'text': text,
                'language': result.get('language', language),
                'processing_time': 0,
                'confidence': 0.9
            }), 200

        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/status', methods=['GET'])
def status():
    """Server status"""
    return jsonify({
        'status': 'ok' if WHISPER_AVAILABLE else 'installing',
        'whisper_available': WHISPER_AVAILABLE,
        'message': '✅ Ready' if WHISPER_AVAILABLE else '⏳ Installing Whisper...',
        'model_loaded': model is not None
    }), 200


@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({'status': 'healthy'}), 200


@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("")
    print("=" * 50)
    print("🚀 Flask Whisper Server Starting")
    print("=" * 50)
    print(f"Status: {'✅ Whisper Ready' if WHISPER_AVAILABLE else '⏳ Installing...'}")
    print("")
    print("📲 Endpoints:")
    print("   POST /transcribe    - Convert audio to text")
    print("   GET /status         - Server status")
    print("   GET /health         - Health check")
    print("")
    print("🌐 Server: http://0.0.0.0:5001")
    print("=" * 50)
    print("")
    
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
