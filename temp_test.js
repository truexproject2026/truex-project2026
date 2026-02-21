const thaiNumMap={"หนึ่ง":"1","สอง":"2","สาม":"3","สี่":"4","ห้า":"5","หก":"6","เจ็ด":"7","แปด":"8","เก้า":"9","สิบ":"10"};
function cleanTitleOnly(text){const trashWords=["เพิ่มนัด","จอง","ยกเลิกนัด","ลบนัด","ยกเลิก","ลบ","นัดหมาย","ตอน","เวลา"];let cleaned=text;trashWords.forEach(w=>{cleaned=cleaned.replace(new RegExp(w,'g'),"");});cleaned=cleaned.replace(/(วันนี้|พรุ่งนี้|มะรืน)/g,"");cleaned=cleaned.replace(/(\d+[:\.]\d+)(?:\s*น(?:\.|าฬิกา)?)?/g,"");cleaned=cleaned.replace(/(\d+|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ)(โมง|ทุ่ม|ตี|น\.|นาฬิกา|ครึ่ง|นาที)/g,"");cleaned=cleaned.replace(/(เที่ยงคืน|เที่ยงวัน|เที่ยง|บ่ายโมง|บ่าย|โมงเย็น|โมงเช้า|โมง|นัดหมาย)/g,"");cleaned=cleaned.replace(/\s+น\s*$/g,"");return cleaned.trim();}
function parseTime(text){let t=text.replace(/\s+/g,"");Object.keys(thaiNumMap).forEach(key=>{t=t.replace(new RegExp(key,'g'),thaiNumMap[key]);});let targetDate=new Date();if(t.includes("พรุ่งนี้"))targetDate.setDate(targetDate.getDate()+1);else if(t.includes("มะรืน"))targetDate.setDate(targetDate.getDate()+2);let hour=-1;let minute=0;const explicit=t.match(/(\d{1,2})[:\.](\d{1,2})/);if(explicit){hour=parseInt(explicit[1]);minute=parseInt(explicit[2]);}if(hour===-1){if(t.includes("เที่ยงคืน"))hour=0;else if(t.includes("เที่ยง"))hour=12;else if(t.includes("ตี")){const m=t.match(/ตี(\d+)/);if(m)hour=parseInt(m[1]);}else if(t.includes("ทุ่ม")){const m=t.match(/(\d+)ทุ่ม/);if(m)hour=parseInt(m[1])+18;}else if(t.includes("บ่ายโมง"))hour=13;else if(t.includes("บ่าย")){const m=t.match(/บ่าย(\d+)/);if(m)hour=parseInt(m[1])+12;else hour=13;}else if(t.includes("โมงเย็น")){const m=t.match(/(\d+)โมงเย็น/);if(m)hour=parseInt(m[1])+12;}else if(t.includes("โมง")){const m=t.match(/(\d+)โมง/);if(m){const v=parseInt(m[1]);hour=(v>=7&&v<=11)?v:(v<=6?v+12:v);}}}if(hour!==-1&&minute===0){if(t.includes("ครึ่ง")){minute=30;}else{const minMatch=t.match(/(?:โมง|ทุ่ม|น\.|นาฬิกา|บ่าย|เย็น)(\d+)/)||t.match(/(\d+)นาที/);if(minMatch)minute=parseInt(minMatch[1]);}}if(hour===-1){const m=t.match(/(\d+)/);if(m){const v=parseInt(m[1]);hour=(v<=5)?v+12:v;}}return{hour,minute};}
// mimic parseDateTime used in app for simple unit tests
function parseDateTime(text){
  let t=text.replace(/\s+/g,"");
  Object.keys(thaiNumMap).forEach(key=>{t=t.replace(new RegExp(key,'g'),thaiNumMap[key]);});
  let targetDate=new Date();
  if(t.includes("พรุ่งนี้"))targetDate.setDate(targetDate.getDate()+1);
  else if(t.includes("มะรืน"))targetDate.setDate(targetDate.getDate()+2);
  let hour=-1;let minute=0;
  const explicit=t.match(/(\d{1,2})[:\.](\d{1,2})/);
  if(explicit){hour=parseInt(explicit[1]);minute=parseInt(explicit[2]);}
  if(hour===-1){
    if(t.includes("เที่ยงคืน"))hour=0;
    else if(t.includes("เที่ยง"))hour=12;
    else if(t.includes("ตี")){
      const m=t.match(/ตี(\d+)/);
      if(m)hour=parseInt(m[1]);
    } else if(t.includes("ทุ่ม")){
      const m=t.match(/(\d+)ทุ่ม/);
      if(m)hour=parseInt(m[1])+18;
    } else if(t.includes("บ่ายโมง"))hour=13;
    else if(t.includes("บ่าย")){
      const m=t.match(/บ่าย(\d+)/);
      if(m)hour=parseInt(m[1])+12;else hour=13;
    } else if(t.includes("โมงเย็น")){
      const m=t.match(/(\d+)โมงเย็น/);
      if(m)hour=parseInt(m[1])+12;
    } else if(t.includes("โมง")){
      const m=t.match(/(\d+)โมง/);
      if(m){
        const v=parseInt(m[1]);
        hour=(v>=7&&v<=11)?v:(v<=6?v+12:v);
      }
    }
  }
  if(hour!==-1&&minute===0){
    if(t.includes("ครึ่ง")){minute=30;}else{
      const minMatch=t.match(/(?:โมง|ทุ่ม|น\.|นาฬิกา|บ่าย|เย็น)(\d+)/)||t.match(/(\d+)นาที/);
      if(minMatch)minute=parseInt(minMatch[1]);
    }
  }
  if(hour===-1){
    const m=t.match(/(\d+)/);
    if(m){
      const v=parseInt(m[1]);
      hour=(v<=5)?v+12:v;
    }
  }
  if(hour===0){
    const now=new Date();
    const eventDate=new Date(targetDate.getFullYear(),targetDate.getMonth(),targetDate.getDate(),hour,minute);
    if(eventDate<=now)targetDate.setDate(targetDate.getDate()+1);
  }
  const cleanTitle=cleanTitleOnly(text);
  return{targetDate,hour,minute,cleanTitle};
}

// tests for deletion/parse
console.log(parseDateTime("ยกเลิกนัดไปดูหนังพรุ่งนี้แปดโมงครึ่ง"));
console.log(parseDateTime("ยกเลิกนัดไปดูหนังพรุ่งนี้ 8:30 น"));
console.log(parseDateTime("ยกเลิกนัดไปดูหนังวันนี้เที่ยงคืน"));
console.log(parseDateTime("เพิ่มนัดไปดูหนังตอนห้าทุ่ม"));

// quick tests
console.log("cleaning:", cleanTitleOnly("เพิ่มนัดหมายดูหนังวันนี้เที่ยงคืน"));
console.log("cleaning:", cleanTitleOnly("เพิ่มนัดหมายไปดูหนังเที่ยงคืน"));
console.log("cleaning:", cleanTitleOnly("เพิ่มนัดไปดูหนังวันนี้เที่ยงคืน"));
console.log("cleaning:", cleanTitleOnly("เพิ่มนัดไปดูหนังพรุ่งนี้เที่ยงคืน"));
console.log("cleaning:", cleanTitleOnly("เพิ่มนัดหมายดูหนังวันนี้เที่ยงคืน")); // repeat after change to ensure fix


console.log(parseTime("เพิ่มนัดไปดูหนังพรุ้งนี้ตี2"));
console.log(parseTime("พรุ่งนี้ตี2"));
console.log(parseTime("พรุ่งนี้ตี 2"));
console.log(parseTime("เพิ่มนัดไปกินข้าววันนี้ห้าทุ่ม"));
console.log(parseTime("เพิ่มนัดไปดูหนังพรุ้งนี้ 2 โมงเช้า"));
console.log(parseTime("เพิ่มนัดไปหาหมอพรุ่งนี้ตอนแปดโมงครึ่ง"));
console.log(parseTime("เพิ่มนัดไปหาหมอพรุ่งนี้ตอน 8:30 น"));
