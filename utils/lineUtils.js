// utils/lineUtils.js

/**
 * @typedef {Object} ExtractedDetails
 * @property {string|null} village - หมายเลขหมู่บ้านที่แยกได้
 * @property {string|null} subdistrict - ชื่อตำบลที่แยกได้
 * @property {boolean} isValid - สถานะความถูกต้องของข้อความ (ต้องมีหมู่บ้านและตำบล)
 */

/**
 * แปลงเลขไทยเป็นเลขอารบิก (เพื่อให้ Logic การเปรียบเทียบหมู่บ้านทำงานได้ง่ายขึ้น)
 * @param {string} str - ข้อความที่มีเลขไทย
 * @returns {string} ข้อความที่แปลงเลขไทยเป็นเลขอารบิกแล้ว
 */
const thaiToArab = (str) => {
  // กำหนดการ mapping ของเลขไทยกับเลขอารบิก
  const thaiNumerals = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];

  // แทนที่ตัวเลขทีละตัว
  return str.replace(/[๐-๙]/g, (match) => {
    return thaiNumerals.indexOf(match);
  });
};

/**
 * แยกแยะข้อมูลสำคัญ (หมู่บ้าน, ตำบล) จากข้อความรายงาน
 * @param {string} message - ข้อความทั้งหมดที่ได้รับจาก LINE
 * @returns {ExtractedDetails} ข้อมูลที่แยกได้
 */
const extractDetails = (message) => {
  // REGEX ที่รองรับทั้งเลขอารบิก (\d) และเลขไทย (๐-๙)

  // 1. ค้นหาหมู่บ้าน
  // [0-9\u0E50-\u0E59]+ หมายถึง ตัวเลข 0-9 หรือ อักษรไทย ๐-๙ หนึ่งตัวขึ้นไป
  const villageRegex =
    /(?:ม\.\s*([0-9\u0E50-\u0E59]+)|หมู่\s*ที่\s*([0-9\u0E50-\u0E59]+)|หมู่\s*([0-9\u0E50-\u0E59]+))/;

  // 2. ค้นหาตำบล (ตำบลยังคงใช้แค่ชื่อภาษาไทยปกติ)
  const subdistrictRegex =
    /(ต\.\s*(ควนโดน|ควนสตอ|ย่านซื่อ|วังประจัน)|ตำบล\s*(ควนโดน|ควนสตอ|ย่านซื่อ|วังประจัน))/;

  const villageMatch = message.match(villageRegex);
  const subdistrictMatch = message.match(subdistrictRegex);

  let rawVillage = villageMatch
    ? villageMatch[1] || villageMatch[2] || villageMatch[3]
    : null;

  // ดึงค่าตำบล
  const subdistrict = subdistrictMatch
    ? subdistrictMatch[0].replace(/ต\.\s*|ตำบล\s*|ต\s*\.\s*/, "").trim()
    : null;

  // *** NEW LOGIC: แปลงหมู่บ้าน (ถ้าพบ) จากเลขไทยเป็นเลขอารบิก ***
  const village = rawVillage ? thaiToArab(rawVillage) : null;

  // ตรวจสอบความถูกต้อง: ต้องมี หมู่บ้าน และ ตำบล ครบถ้วน
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
