export const runtime = 'edge';
import { HfInference } from "@huggingface/inference";
import { NextResponse } from "next/server";

const hf = new HfInference(process.env.HF_TOKEN);

export async function POST(req: Request) {
  let currentTemp = "--";
  let currentAqi = 0;
  let currentDesc = "";
  let currentEvent = "ไม่มีนัดหมาย";

  try {
    const { aqi, temp, desc, nextEvent } = await req.json();
    currentTemp = temp;
    currentAqi = aqi;
    currentDesc = desc;
    currentEvent = nextEvent || "ไม่มีนัดหมาย";

    // ปรับ Prompt ให้มีตัวอย่างและกฎที่เข้มงวดขึ้น
    const systemPrompt = `
      คุณคือ TrueX AI ผู้ช่วยวิเคราะห์สภาพอากาศและตารางงานอัจฉริยะ
      ข้อมูลปัจจุบัน: อุณหภูมิ ${temp}°C, สภาพอากาศ ${desc}, AQI ${aqi}, นัดหมายคือ '${currentEvent}'

      กฎเหล็ก: ตอบตามแพทเทิร์นนี้ "เป๊ะๆ" ห้ามมีส่วนนำ ห้ามเกริ่น และห้ามใช้เครื่องหมายดอกจัน (*):
      "วันนี้อุณหภูมิ [อุณหภูมิ] องศาเซลเซียส สภาพอากาศ[คำแปลสภาพอากาศเป็นไทย] ค่าฝุ่น AQI อยู่ที่ [AQI] [แนะนำสั้นๆ] โดยเฉพาะเมื่อคุณมีนัด '[ชื่อนัดหมาย]' [คำแนะนำการเตรียมตัว]"

      ตัวอย่างคำตอบที่ถูกต้อง:
      "วันนี้อุณหภูมิ 34 องศาเซลเซียส สภาพอากาศท้องฟ้าแจ่มใส ค่าฝุ่น AQI อยู่ที่ 84 ควรระวังเรื่องแดดจัดเล็กน้อย โดยเฉพาะเมื่อคุณมีนัด 'ไปหาหมอตอน 19:00 น' คุณอาจต้องการพกร่มกับตนเองเพื่อความสะดวกในการเดินทาง"

      *ตอบเป็นภาษาไทยเท่านั้น และเข้าแพทเทิร์นทันที*
    `;

    const response = await hf.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages: [{ role: "system", content: systemPrompt }],
      max_tokens: 200,
      temperature: 0.1, // ลดค่าความเพี้ยนเพื่อให้ตอบตรงแพทเทิร์นที่สุด
    });

    let result = response.choices[0].message.content || "";
    
    // ลบเครื่องหมายพิเศษที่อาจทำให้ระบบอ่านเสียงสะดุดออก
    result = result.trim().replace(/\*/g, '').replace(/#/g, '');

    return NextResponse.json({ analysis: result });

  } catch (error) {
    console.error("AI API Error:", error);
    return NextResponse.json({ 
      analysis: `วันนี้อุณหภูมิ ${currentTemp} องศาเซลเซียส สภาพอากาศ ${currentDesc} และค่า AQI อยู่ที่ ${currentAqi} อย่าลืมเตรียมตัวสำหรับนัด '${currentEvent}' และดูแลสุขภาพด้วยนะครับ` 
    });
  }
}