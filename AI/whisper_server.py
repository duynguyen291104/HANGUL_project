"""
Flask Whisper Server - Local Speech-to-Text
Uses faster-whisper for faster Korean speech recognition.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from faster_whisper import WhisperModel
import tempfile
import os
import logging
import torch
import time

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

WHISPER_MODEL_SIZE = os.getenv('WHISPER_MODEL_SIZE', 'base')
WHISPER_DEVICE = os.getenv('WHISPER_DEVICE', 'cpu')
WHISPER_COMPUTE_TYPE = os.getenv('WHISPER_COMPUTE_TYPE', 'int8')
PORT = int(os.getenv('WHISPER_PORT', '5002'))

whisper_model = None


def normalize_language(language: str):
    language = (language or 'ko').strip().lower()

    if language == 'auto':
        return None

    if language.startswith('ko'):
        return 'ko'

    return language


def load_whisper_model():
    global whisper_model

    if whisper_model is None:
        logger.info(f'Loading faster-whisper model: {WHISPER_MODEL_SIZE}')
        logger.info(f'Device: {WHISPER_DEVICE}')
        logger.info(f'Compute type: {WHISPER_COMPUTE_TYPE}')

        whisper_model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE
        )

        logger.info('faster-whisper model loaded successfully')

    return whisper_model


@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        logger.info('Transcribe request received')

        if 'audio' not in request.files:
            logger.warning('No audio file in request')
            return jsonify({
                'success': False,
                'error': 'No audio file provided'
            }), 400

        audio_file = request.files['audio']

        if audio_file.filename == '':
            logger.warning('Empty filename')
            return jsonify({
                'success': False,
                'error': 'No selected file'
            }), 400

        language = normalize_language(request.form.get('language', 'ko'))

        logger.info(f'File: {audio_file.filename}')
        logger.info(f'Language: {language or "auto"}')

        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as tmp_file:
            tmp_path = tmp_file.name
            audio_file.save(tmp_path)
            logger.info(f'Saved temp audio: {tmp_path}')

        try:
            model = load_whisper_model()

            logger.info('Transcribing...')
            started_at = time.perf_counter()

            segments, info = model.transcribe(
                    tmp_path,
                    language='ko',
                    task='transcribe',
                    beam_size=5,
                    vad_filter=False,
                    # vad_parameters={
                    #     'min_silence_duration_ms': 300,
                    #     'speech_pad_ms': 80,
                    # },
                    condition_on_previous_text=False,
                )

            transcript = ''.join(segment.text for segment in segments).strip()
            detected_language = getattr(info, 'language', language or 'ko')
            processing_time = round(time.perf_counter() - started_at, 3)

            logger.info(f'Transcribed: {transcript}')
            logger.info(f'Detected language: {detected_language}')
            logger.info(f'Processing time: {processing_time}s')

            return jsonify({
                'success': True,
                'text': transcript,
                'language': detected_language,
                'processing_time': processing_time,
                'confidence': 0.95,
                'engine': 'faster-whisper',
                'model': WHISPER_MODEL_SIZE,
            }), 200

        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                logger.info('Cleaned up temp file')

    except Exception as e:
        logger.error(f'Transcription error: {str(e)}', exc_info=True)
        return jsonify({
            'success': False,
            'error': f'Transcription failed: {str(e)}'
        }), 500


@app.route('/status', methods=['GET'])
def status():
    try:
        logger.info('Status check')
        return jsonify({
            'status': 'ok',
            'message': 'Whisper Server is running',
            'engine': 'faster-whisper',
            'whisper_model': WHISPER_MODEL_SIZE,
            'device': WHISPER_DEVICE,
            'cuda_available': torch.cuda.is_available(),
            'compute_type': WHISPER_COMPUTE_TYPE,
            'model_loaded': whisper_model is not None,
        }), 200
    except Exception as e:
        logger.error(f'Status check failed: {str(e)}')
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'engine': 'faster-whisper',
    }), 200


@app.errorhandler(404)
def not_found(error):
    logger.warning(f'404 Not Found: {request.path}')
    return jsonify({
        'error': 'Endpoint not found',
        'path': request.path
    }), 404


@app.errorhandler(500)
def server_error(error):
    logger.error(f'500 Server Error: {str(error)}')
    return jsonify({
        'error': 'Internal server error',
        'details': str(error)
    }), 500


if __name__ == '__main__':
    logger.info('Starting Whisper Flask Server')
    logger.info(f'Port: {PORT}')
    logger.info(f'Model: {WHISPER_MODEL_SIZE}')
    logger.info(f'Device: {WHISPER_DEVICE}')
    logger.info(f'Compute type: {WHISPER_COMPUTE_TYPE}')
    logger.info('Available endpoints:')
    logger.info('POST /transcribe')
    logger.info('GET /status')
    logger.info('GET /health')

    try:
        load_whisper_model()
    except Exception as e:
        logger.error(f'Failed to preload model: {str(e)}')
        logger.warning('Will attempt to load on first request')

    app.run(host='0.0.0.0', port=PORT, debug=False, threaded=True)
