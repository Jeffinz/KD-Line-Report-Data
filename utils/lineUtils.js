// utils/lineUtils.js
/**
 * @typedef {Object} ExtractedDetails
 * @property {string|null} village - หมายเลขหมู่บ้านที่แยกได้
 * @property {string|null} subdistrict - ชื่อตำบลที่แยกได้
 * @property {boolean} isValid - สถานะความถูกต้องของข้อความ (ต้องมีหมู่บ้านและตำบล)
 */

/**
 * แยกแยะข้อมูลสำคัญ (หมู่บ้าน, ตำบล) จากข้อความรายงาน
 * (Logic ไม่สนใจเลขวันที่ เพื่อใช้ Current Date ในการบันทึกแทน)
 * @param {string} message - ข้อความทั้งหมดที่ได้รับจาก LINE
 * @returns {ExtractedDetails} ข้อมูลที่แยกได้
 */
const extractDetails = (message) => {
  // ค้นหาหมู่บ้านและตำบลจากข้อความทั้งหมด (ไม่ต้องมีเครื่องหมายคำพูด)
  const villageRegex = /(?:ม\.\s*(\d+)|หมู่\s*ที่\s*(\d+)|หมู่\s*(\d+))/;
  const subdistrictRegex =
    /(ต\.\s*(ควนโดน|ควนสตอ|ย่านซื่อ|วังประจัน)|ตำบล\s*(ควนโดน|ควนสตอ|ย่านซื่อ|วังประจัน))/;

  const villageMatch = message.match(villageRegex);
  const subdistrictMatch = message.match(subdistrictRegex);

  const village = villageMatch
    ? villageMatch[1] || villageMatch[2] || villageMatch[3]
    : null;
  const subdistrict = subdistrictMatch
    ? subdistrictMatch[0].replace(/ต\.\s*|ตำบล\s*|ต\s*\.\s*/, "").trim()
    : null;

  // สถานะความถูกต้อง: ต้องมี หมู่บ้าน และ ตำบล ครบถ้วน
  const isValid = !!village && !!subdistrict;

  return {
    village: village,
    subdistrict: subdistrict,
    isValid: isValid,
  };
};

/**
 * ตรวจสอบว่าชื่อตำบลที่แยกได้เป็นตำบลที่อนุญาตให้บันทึกหรือไม่
 * @param {string|null} subdistrict - ชื่อตำบล
 * @returns {boolean}
 */
const isValidSubdistrict = (subdistrict) => {
  const validSubdistricts = ["ควนโดน"];
  return validSubdistricts.includes(subdistrict);
};

module.exports = { extractDetails, isValidSubdistrict };