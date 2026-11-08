# Highlighted Vocabulary Extractor

**Tiếng Việt** · [English](README.en.md)

Công cụ web trích xuất các từ được tô highlight trong ảnh chụp văn bản, dành cho người học ngoại ngữ cần lập danh sách từ vựng từ sách, tài liệu hoặc ảnh chụp màn hình.
Toàn bộ xử lý diễn ra trong trình duyệt bằng [Tesseract.js](https://github.com/naptha/tesseract.js), ảnh không được gửi lên máy chủ.

## Tính năng

- Nhận dạng chữ (OCR) trên ảnh tải lên và tự động lọc các từ được tô highlight (dải màu vàng đến xanh lá).
- Đánh dấu vị trí từng từ trên ảnh; rê chuột vào danh sách để xem từ tương ứng.
- Thêm từ thủ công bằng cách double-click trên ảnh hoặc nhập trực tiếp.
- Danh sách phụ gồm các từ được nhận dạng nhưng không tô màu, có thể thêm vào danh sách chính.
- Chỉnh sửa, xóa từ và sao chép toàn bộ danh sách (mỗi từ một dòng).
- Phóng to / thu nhỏ ảnh và chế độ debug hiển thị vùng màu được nhận diện.

## Sử dụng

Mở `index.html` bằng trình duyệt (cần kết nối Internet ở lần đầu để tải Tesseract.js và mô hình ngôn ngữ), hoặc triển khai thư mục lên bất kỳ dịch vụ web tĩnh nào như GitHub Pages.

1. Chọn ảnh chứa văn bản đã tô highlight.
2. Bấm **Quét văn bản**.
3. Kiểm tra, chỉnh sửa danh sách và bấm **Copy danh sách**.

## Cấu hình

Ngôn ngữ OCR được đặt bởi hằng số `OCR_LANG` trong `script.js` (mặc định `eng`). Dùng `vie` cho tiếng Việt hoặc `eng+vie` cho cả hai.

Ngưỡng màu highlight được định nghĩa trong hàm `isHighlightPixel` (theo không gian màu HSL).

## Cấu trúc

```
index.html   Giao diện
style.css    Định dạng
script.js    OCR, nhận diện vùng highlight, quản lý danh sách từ
```

## Tác giả

Vũ Đình Đạt · [@Vudinhdat02](https://github.com/Vudinhdat02)
