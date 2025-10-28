// utils/helpers.js
const extractDetails = (message) => {
  // ตรวจสอบข้อความที่มีเครื่องหมายคำพูด (ทั้งคู่)
  const quoteRegex = /["“”](.*?)["“”]/;

  // ถ้าไม่มีข้อความในเครื่องหมายคำพูด หรือข้อความภายในเครื่องหมายคำพูดว่าง
  const quoteMatch = message.match(quoteRegex);
  if (!quoteMatch || !quoteMatch[1].trim()) {
    return { village: null, subdistrict: null, isValid: false }; // คืนค่าความถูกต้องเป็น false
  }

  // ใช้ regex สำหรับค้นหาวันที่ในรูปแบบ "12" (เลขวันที่เท่านั้น)
  const dateRegex = /\b(\d{1,2})\b/; // ค้นหาตัวเลขที่เป็นวันที่ (1 หรือ 2 หลัก)

  // ค้นหาวันที่จากข้อความที่ถูกเลือก
  const dateMatch = message.match(dateRegex);

  if (!dateMatch) {
    return { village: null, subdistrict: null, date: null, isValid: false }; // ถ้าไม่มีวันที่จะถือว่าไม่ถูกต้อง
  }

  // ดึงเลขวันที่จากข้อความที่พบ
  const date = dateMatch[1]; // เอาแค่วันที่ (เลขวัน)

  const villageRegex = /(?:ม\.\s*(\d+)|หมู่\s*ที่\s*(\d+)|หมู่\s*(\d+))/;
  const subdistrictRegex =
    /(ต\.\s*(ควนโดน|ควนสตอ|ย่านซื่อ|วังประจัน)|ตำบล\s*(ควนโดน|ควนสตอ|ย่านซื่อ|วังประจัน))/;

  const villageMatch = message.match(villageRegex);
  const subdistrictMatch = message.match(subdistrictRegex);

  return {
    village: villageMatch
      ? villageMatch[1] || villageMatch[2] || villageMatch[3]
      : null,
    subdistrict: subdistrictMatch
      ? subdistrictMatch[0].replace(/ต\.\s*|ตำบล\s*|ต\s*\.\s*/, "").trim()
      : null,
    date: date,
    isValid: true, // ข้อความนี้ถูกต้อง
  };
};

const isValidSubdistrict = (subdistrict) => {
  const validSubdistricts = ["ควนโดน"];
  return validSubdistricts.includes(subdistrict);
};

module.exports = { extractDetails, isValidSubdistrict };
