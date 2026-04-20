# 📦 Backup & Restore Guide

## Nội Dung Backup

```
backup/
├── seed.ts                    ← DB initialization data
├── SEEDING.md                 ← Seeding documentation
├── labels_ko.json             ← Korean labels
├── labels_ko_numeric.json     ← Numeric labels
├── labels_ko_romanization.json ← Romanization labels
├── romanization.json          ← Romanization data
└── romanization_map.json      ← Romanization mapping
```

---

## 🔧 Cách Restore Khi DB Mất

### Tình Huống 1: Nếu DB mất nhưng container vẫn chạy

```bash
# 1. Dừng services
docker-compose down

# 2. Xóa volume PostgreSQL (DATA MẤT - CẢNH BÁO ⚠️)
docker volume rm hangul_postgres_data

# 3. Khởi động lại DB sạch
docker-compose up -d postgres

# 4. Chạy migrations + seeding
cd BE
npm run seed:fresh

# 5. Khởi động lại services
docker-compose up -d
```

### Tình Huống 2: Restore từ seed.ts

```bash
# 1. Copy seed.ts trở lại
cp backup/seed.ts BE/prisma/seed.ts

# 2. Chạy seeding
cd BE
npm run seed

# 3. Verify data
npm run check-db  # hoặc query trực tiếp từ Admin UI
```

### Tình Huống 3: Restore JSON data

```bash
# Restore labels & romanization files
cp backup/labels_ko*.json AI/ai-backend/
cp backup/romanization*.json AI/ai-backend/
```

---

## 📊 Các File Trong Backup

### seed.ts
- **Mục đích:** Initial database data
- **Sử dụng:** `npm run seed` hoặc `npm run seed:fresh`
- **Dữ liệu:** Test users, ranks, topics, etc.

### SEEDING.md
- **Mục đích:** Documentation for fresh setup
- **Tham khảo:** Khi onboarding dev mới

### JSON Files
- **Mục đích:** YOLO labels (object detection)
- **Sử dụng:** AI backend (nếu cấu hình lại)

---

## ✅ Production Strategy

**Hiện tại:**
1. ✅ PostgreSQL + Docker Volume = Data persistent
2. ✅ Admin UI = Quản lý data thủ công
3. ✅ Backup folder = Restore point

**Nếu production:**
- Thêm: Regular PostgreSQL exports (`pg_dump`)
- Thêm: S3 backups (AWS)
- Thêm: Database replication

---

## 🚨 Important Notes

⚠️ **Backup này KHÔNG phải là real-time backup**
- Chỉ là reference point để restore
- Dữ liệu mới add từ Admin UI không được backup ở đây
- Cần setup PostgreSQL dump nếu muốn full backup

✅ **Recommended for future:**
```bash
# Monthly backup
pg_dump -h localhost -U hangul hangul > backup/hangul_$(date +%Y%m%d).sql

# Restore when needed
psql -h localhost -U hangul hangul < backup/hangul_20260413.sql
```
