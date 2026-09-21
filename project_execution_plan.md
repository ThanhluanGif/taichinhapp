# Kế Hoạch Xây Dựng Ứng Dụng Thu Thập Tin Tức Kinh Tế & Theo Dõi Chứng Khoán Cá Nhân
*Mô hình: 1 người làm, 1 người dùng | Chi phí duy trì: 0 Đồng (Free Tier)*

---

## 1. Tổng Quan Dự Án
Ứng dụng này được thiết kế như một **Personal Economic Command Center** (Trợ lý chỉ huy tài chính cá nhân). Nó giúp bạn:
- Tự động hóa việc gom tin tức kinh tế vĩ mô, thị trường và chứng khoán từ các nguồn uy tín.
- Phân loại rõ ràng các thông tin theo mạch kinh tế chính trị (Vĩ mô, Ngành/Thị trường, Doanh nghiệp).
- Cung cấp giao diện Dashboard gọn gàng tích hợp bảng theo dõi danh mục đầu tư chứng khoán cá nhân.

---

## 2. Tech Stack Tối Ưu (0 Đồng)
* **Thu thập dữ liệu (Data Pipeline):** Python (`feedparser`, `requests`).
* **Tự động hóa chạy ngầm:** GitHub Actions (Miễn phí Cron Job, không cần server riêng).
* **Cơ sở dữ liệu (Database):** MongoDB Atlas (Free Tier) hoặc Supabase (PostgreSQL).
* **Giao diện & API (Frontend/Backend):** Next.js (React, TypeScript, Tailwind CSS) deploy trên Vercel (Miễn phí).

---

## 3. Cấu Trúc Thư Mục Trong VS Code
Tạo một workspace chung đặt tên là `kinh-te-dashboard` với cấu trúc như sau:

```text
kinh-te-dashboard/
├── scraper/
│   ├── main.py
│   └── requirements.txt
├── web-app/
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx          # Trang chủ Dashboard
│   │       └── layout.tsx        # Bố cục giao diện chung
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

---

## 4. Các Giai Đoạn Triển Khai Chi Tiết

### Giai Đoạn 1: Xây Dựng Script Thu Thập Tin Tức (Python)
1. **Cài đặt môi trường trong thư mục `scraper/`:**
   ```bash
   cd scraper
   python -m venv venv
   source venv/bin/activate  # Trên Windows: venv\Scripts\activate
   pip install feedparser requests pymongo
   ```
2. **Viết mã nguồn gom RSS (ví dụ cho file `main.py`):**
   - Sử dụng `feedparser` để quét các nguồn RSS chuẩn từ CafeF, VnEconomy, Vietstock.
   - Lọc các trường dữ liệu: `title` (tiêu đề), `link` (đường dẫn), `published` (thời gian), `summary` (mô tả).
   - Đẩy dữ liệu đã làm sạch lên Database (MongoDB / Supabase) hoặc lưu tạm ra file JSON.

3. **Thiết lập GitHub Actions tự động hóa chạy ngầm:**
   - Tạo file `.github/workflows/scraper.yml` để GitHub tự động kích hoạt script Python chạy định kỳ 2-4 tiếng/lần mà không cần bật máy tính cá nhân.

---

### Giai Đoạn 2: Xây Dựng Giao Diện Dashboard (Next.js)
1. **Khởi tạo project Next.js tại thư mục `web-app/`:**
   ```bash
   cd ../web-app
   npx create-next-app@latest .
   ```
   *(Chọn các tùy chọn: TypeScript = Yes, Tailwind CSS = Yes, App Router = Yes).*

2. **Thiết kế Bố cục Giao diện (Dashboard Layout):**
   - **Cột Trái / Khu vực chính (News Feed):** 
     - Hiển thị danh sách tin tức kinh tế được phân chia theo nhãn màu sắc rõ ràng (🔴 Vĩ mô & Chính sách, 🔵 Thị trường & Chứng khoán, 🟢 Doanh nghiệp).
     - Cho phép click mở tab mới đọc báo gốc.
   - **Cột Phải / Widget (Portfolio Tracker):**
     - Bảng theo dõi danh mục chứng khoán cá nhân nhập tay (Mã CP, Số lượng, Giá vốn trung bình, Giá hiện tại, Lãi/Lỗ %).

---

### Giai Đoạn 3: Đưa Lên Mạng (Deployment & Vận Hành)
1. **Quản lý mã nguồn Git:**
   - Khởi tạo Git trong thư mục gốc: `git init`
   - Đẩy toàn bộ mã nguồn lên một GitHub Repository cá nhân.
2. **Deploy Web App:**
   - Đăng nhập vào **Vercel** bằng tài khoản GitHub, liên kết với thư mục `web-app`.
   - Vercel sẽ tự động build và cung cấp cho bạn một đường link truy cập (URL) miễn phí để sử dụng mọi lúc, mọi nơi trên điện thoại hoặc máy tính.

---

## 5. Mẹo Đọc Hiệu Quả Dưới Góc Nhìn Kinh Tế Chính Trị
Khi hệ thống đã chạy ổn định, hãy đọc tin tức theo thứ tự ưu tiên dòng tiền:
1. **Đọc tin Vĩ mô trước:** Quyết định của Ngân hàng Nhà nước về lãi suất, chỉ số lạm phát CPI, tỷ giá USD/VND. Đây là dòng chảy lớn định hướng toàn bộ thị trường.
2. **Đọc tin Ngành:** Xem dòng vốn đang dịch chuyển vào nhóm ngành nào (Bất động sản, Ngân hàng, Năng lượng, Đầu tư công).
3. **Kiểm tra danh mục cá nhân:** Đối chiếu xem biến động vĩ mô có ảnh hưởng gì đến các mã cổ phiếu bạn đang nắm giữ hay không để đưa ra quyết định mua/bán.