/**
 * GOOGLE SHEETS WEB APP SCRIPT
 * 
 * Hướng dẫn sử dụng:
 * 1. Mở Google Sheets mới: https://sheets.new
 * 2. Đặt tên sheet: "VKU Inspections"
 * 3. Tạo các cột ở hàng 1:
 *    A: UUID | B: Thời gian | C: Tòa nhà | D: Tầng | E: Phòng
 *    F: Người kiểm tra | G: Danh mục | H: Đánh giá | I: Ghi chú
 *    J: Ảnh (link) | K: Trạng thái
 * 4. Mở Extensions > Apps Script
 * 5. Dán toàn bộ code này vào
 * 6. Lưu project (Ctrl+S)
 * 7. Click Deploy > New deployment
 * 8. Type: Web app
 * 9. Execute as: Me (your email)
 * 10. Who has access: Anyone
 * 11. Deploy > Authorize > Allow (chấp nhận quyền truy cập)
 * 12. Copy Web app URL và dán vào CONFIG.GOOGLE_SHEETS.WEB_APP_URL trong app.js
 * 13. Đặt CONFIG.GOOGLE_SHEETS.ENABLED = true
 */

function doPost(e) {
    try {
        let data;
        if (e.postData && e.postData.contents) {
            data = JSON.parse(e.postData.contents);
        } else {
            data = e.parameter;
        }

        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('VKU Inspections') 
                   || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

        if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() === '') {
            sheet.appendRow([
                'UUID', 'Thời gian tạo', 'Tòa nhà', 'Tầng', 'Phòng',
                'Người kiểm tra', 'Danh mục', 'Đánh giá (1-5)', 'Ghi chú lỗi',
                'Ảnh (Base64)', 'Đã đồng bộ lúc'
            ]);
            sheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#e0f2fe');
        }

        const categoryLabels = {
            Hardware: '💻 Máy tính',
            Projector: '📽️ Máy chiếu',
            AC: '❄️ Điều hòa',
            Electrical: '⚡ Điện',
            Furniture: '🪑 Nội thất',
            Other: '📦 Khác'
        };

        const photoData = data.photoBase64 || data.photoData || '';
        let photoCell = '';
        if (photoData && photoData.length > 0 && photoData.length < 50000) {
            photoCell = photoData.substring(0, 100) + '... [TRUNCATED]';
        } else if (photoData && photoData.length >= 50000) {
            photoCell = '[Ảnh đính kèm - ' + Math.round(photoData.length / 1024) + 'KB]';
        }

        const timestamp = data.timestamp 
            ? new Date(data.timestamp).toLocaleString('vi-VN') 
            : new Date().toLocaleString('vi-VN');

        sheet.appendRow([
            data.uuid || generateId(),
            timestamp,
            data.building || '',
            data.floor || '',
            data.roomNumber || '',
            data.inspectorName || '',
            categoryLabels[data.category] || data.category || '',
            data.rating || '',
            data.defectNotes || '',
            photoCell,
            new Date().toLocaleString('vi-VN')
        ]);

        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow, 8).setBackground(getRatingColor(data.rating));

        if (photoData && photoData.startsWith('data:image')) {
            try {
                const base64 = photoData.split(',')[1];
                const blob = Utilities.newBlob(
                    Utilities.base64Decode(base64),
                    'image/jpeg',
                    `inspection-${data.uuid || generateId()}.jpg`
                );
                
                const folderName = 'VKU Inspection Photos';
                let folder;
                const folders = DriveApp.getFoldersByName(folderName);
                if (folders.hasNext()) {
                    folder = folders.next();
                } else {
                    folder = DriveApp.createFolder(folderName);
                }
                
                const file = folder.createFile(blob);
                file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                const fileUrl = file.getUrl();
                
                sheet.getRange(lastRow, 10).setValue(fileUrl);
            } catch (imgErr) {
                console.error('Image save failed:', imgErr);
            }
        }

        return ContentService
            .createTextOutput(JSON.stringify({
                success: true,
                message: 'Inspection saved',
                row: lastRow,
                uuid: data.uuid
            }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        console.error('Error in doPost:', err);
        return ContentService
            .createTextOutput(JSON.stringify({
                success: false,
                error: err.message
            }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function doGet(e) {
    return ContentService
        .createTextOutput(JSON.stringify({
            status: 'OK',
            message: 'VKU Inspector Web App is running',
            time: new Date().toISOString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
}

function generateId() {
    return 'ID-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function getRatingColor(rating) {
    const colors = {
        1: '#fee2e2',
        2: '#ffedd5',
        3: '#fef3c7',
        4: '#ecfccb',
        5: '#d1fae5'
    };
    return colors[rating] || '#ffffff';
}
