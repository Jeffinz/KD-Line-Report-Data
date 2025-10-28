// utils/lineUtils.js (ปรับปรุง)

const extractDetails = (message) => {
  // 1. ค้นหาหมู่บ้านและตำบล
  const villageRegex = /(?:ม\.\s*(\d+)|หมู่\s*ที่\s*(\d+)|หมู่\s*(\d+))/;
  const subdistrictRegex =
    /(ต\.\s*(ควนโดน|ควนสตอ|ย่านซื่อ|วังประจัน)|ตำบล\s*(ควนโดน|ควนสตอ|ย่านซื่อ|วังประจัน))/;

  const villageMatch = message.match(villageRegex);
  const subdistrictMatch = message.match(subdistrictRegex);

  // ดึงค่าที่พบ
  const village = villageMatch
    ? villageMatch[1] || villageMatch[2] || villageMatch[3]
    : null;
  const subdistrict = subdistrictMatch
    ? subdistrictMatch[0].replace(/ต\.\s*|ตำบล\s*|ต\s*\.\s*/, "").trim()
    : null;

  // *** Logic การดึงและตรวจสอบวันที่ถูกลบออกแล้ว ***

  // ตรวจสอบความถูกต้อง: ต้องมี หมู่บ้าน และ ตำบล ครบถ้วน
  const isValid = !!village && !!subdistrict;

  return {
    village: village,
    subdistrict: subdistrict,
    // ไม่มีการคืนค่า 'date' อีกต่อไป
    isValid: isValid,
  };
};

const isValidSubdistrict = (subdistrict) => {
  const validSubdistricts = ["ควนโดน"];
  return validSubdistricts.includes(subdistrict);
};

module.exports = { extractDetails, isValidSubdistrict };
