# AI Object Detection Backend

## 🚀 Đã cài đặt thành công!

### Các công nghệ sử dụng:
- **YOLOv8** (nano): Model nhẹ, nhanh cho realtime detection
- **Flask**: Python backend API server  
- **OpenCV**: Xử lý hình ảnh
- **PyTorch**: Deep learning framework

### API Endpoints:

#### 1. Health Check
```bash
GET http://localhost:5001/health
```

#### 2. Detect Objects
```bash
POST http://localhost:5001/detect
Content-Type: application/json

{
  "image": "base64_encoded_image_data"
}
```

**Response:**
```json
{
  "success": true,
  "objects": [
    {
      "name": "cup",
      "korean": "컵",
      "confidence": 0.95,
      "bbox": {
        "x1": 100,
        "y1": 200,
        "x2": 300,
        "y2": 400
      }
    }
  ],
  "total_detected": 1
}
```

#### 3. List Vocabulary
```bash
GET http://localhost:5001/vocab/list
```

#### 4. Add New Vocabulary
```bash
POST http://localhost:5001/vocab/add
Content-Type: application/json

{
  "english": "pen",
  "korean": "펜"
}
```

### 📊 Supported Objects (80 classes from COCO dataset):

- **Người & Động vật**: 사람, 고양이, 개, 새, 말, 소, 양, 코끼리...
- **Phương tiện**: 자동차, 버스, 기차, 자전거, 비행기, 배...
- **Đồ ăn**: 사과, 바나나, 피자, 샌드위치, 케이크, 도넛...
- **Đồ dùng**: 컵, 병, 포크, 나이프, 숟가락, 그릇...
- **Điện tử**: 노트북, 휴대폰, 키보드, 마우스, 텔레비전...
- **Nội thất**: 의자, 소파, 침대, 식탁, 시계...

### 🎯 Cách sử dụng:

1. **Chụp/Upload ảnh** trên trang Camera to Vocab
2. **AI tự động nhận diện** đối tượng trong ảnh
3. **Hiển thị từ tiếng Hàn** tương ứng
4. **Lưu vào từ điển** để học

### ⚙️ Cấu hình:

- **Port**: 5001
- **Confidence threshold**: 50% (có thể điều chỉnh)
- **Max objects returned**: 10
- **Model**: YOLOv8n (6.2MB)

### 🔧 Troubleshooting:

**Nếu backend không chạy:**
```bash
cd ai-backend
python3 app.py
```

**Kiểm tra backend:**
```bash
curl http://localhost:5001/health
```

### 📝 Tính năng tương lai:

- [ ] OCR cho chữ Hàn
- [ ] Fine-tune với custom objects
- [ ] Thêm romanization tự động
- [ ] Export ONNX cho deployment
- [ ] Batch processing
- [ ] Real-time webcam stream

---

**Status**: ✅ Running on http://localhost:5001
