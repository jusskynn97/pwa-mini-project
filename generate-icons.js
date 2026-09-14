const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUTPUT_DIR = path.join(__dirname, 'icons');

function crc32(data) {
    const table = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    
    const typeBuffer = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeBuffer, data]);
    const crcValue = crc32(crcData);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crcValue, 0);
    
    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function createPNG(width, height, getPixel) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    
    const rawData = [];
    for (let y = 0; y < height; y++) {
        rawData.push(0); // Filter type: None
        for (let x = 0; x < width; x++) {
            const pixel = getPixel(x, y, width, height);
            rawData.push(pixel.r, pixel.g, pixel.b, pixel.a);
        }
    }
    const rawBuffer = Buffer.from(rawData);
    const compressed = zlib.deflateSync(rawBuffer, { level: 9 });
    
    const ihdrChunk = createChunk('IHDR', ihdr);
    const idatChunk = createChunk('IDAT', compressed);
    const iendChunk = createChunk('IEND', Buffer.alloc(0));
    
    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function generateIcon(size) {
    const colors = {
        orange: { r: 243, g: 112, b: 33, a: 255 },  // #F37021
        slate:  { r: 74,  g: 95,  b: 107, a: 255 }, // #4A5F6B
        none:   { r: 0,   g: 0,   b: 0,   a: 0 }
    };

    return createPNG(size, size, (x, y, w, h) => {
        // Chuyển đổi tọa độ về khoảng chuẩn hóa [0, 100]
        const nx = (x / (w - 1)) * 100;
        const ny = (y / (h - 1)) * 100;

        // 1. Kiểm tra Mái nhà (Màu Cam)
        // Đường viền dưới đỉnh mái nhà
        const orangeRoofInner = (nx <= 38.5) 
            ? (55.5 - nx) 
            : (nx - 21.5);

        const inOrangeRoof = ny >= 13 && ny <= 44 && 
                             ny >= (50 - nx * 0.96) && 
                             ny >= (nx * 0.96 - 46) && 
                             ny <= orangeRoofInner;

        if (inOrangeRoof) {
            return colors.orange;
        }

        // 2. Kiểm tra Thân nhà & Bong bóng thoại (Màu Xám Chàm)
        // Mái phía trên của thân xám
        const slateRoofLine = (nx <= 38.5) ? (60 - nx) : (nx - 17);
        const inSlateHeader = ny >= 22 && ny <= 48 && 
                              nx >= 19 && nx <= 81 && 
                              ny >= slateRoofLine;

        // Thân chính (hình chữ nhật бо góc)
        const inBodyBox = nx >= 19 && nx <= 81 && ny >= 48 && ny <= 68;

        // Đuôi bóng thoại (Tam giác chỏm dưới)
        const inTail = nx >= 48.5 && nx <= 66.5 && 
                       ny >= 68 && ny <= 89 && 
                       ny <= (48.5 + (nx - 48.5) * 2.25);

        if (inSlateHeader || inBodyBox || inTail) {
            // Bo tròn 2 góc dưới của thân xám (bán kính r = 3%)
            const r = 3;
            const inBottomLeftCutout = (nx < 19 + r && ny > 68 - r) && 
                (Math.hypot(nx - (19 + r), ny - (68 - r)) > r);
            const inBottomRightCutout = (nx > 81 - r && ny > 68 - r && ny <= 68) && 
                (Math.hypot(nx - (81 - r), ny - (68 - r)) > r);

            if (!inBottomLeftCutout && !inBottomRightCutout) {
                return colors.slate;
            }
        }

        return colors.none;
    });
}

function main() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log('🎨 Generating PWA icons...');
    
    ICON_SIZES.forEach(size => {
        const pngBuffer = generateIcon(size);
        const filePath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
        fs.writeFileSync(filePath, pngBuffer);
        const kb = (pngBuffer.length / 1024).toFixed(1);
        console.log(`   ✅ icon-${size}x${size}.png (${kb} KB)`);
    });

    const favicon = generateIcon(32);
    fs.writeFileSync(path.join(OUTPUT_DIR, '..', 'favicon.ico'), favicon);

    console.log(`\n🎉 Successfully generated ${ICON_SIZES.length} icons in icons/ directory!`);
    console.log('   Icons are ready for PWA manifest.json');
}

if (require.main === module) {
    main();
}

module.exports = { generateIcon, ICON_SIZES };