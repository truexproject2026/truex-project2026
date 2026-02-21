export const runtime = 'edge';
import { HfInference } from "@huggingface/inference";
import { NextResponse } from "next/server";

const hf = new HfInference(process.env.HF_TOKEN);

export async function POST(req: Request) {
  // ประกาศตัวแปรไว้ข้างนอกเพื่อให้ catch เรียกใช้ได้
  let currentTemp = "--";
  let currentAqi = 0;
  let currentDesc = "";

  try {
    const { aqi, temp, desc, aqiHourly, weatherHourly } = await req.json();
    currentTemp = temp;
    currentAqi = aqi;
    currentDesc = desc;

    const systemPrompt = `
      คุณคือ TrueX AI ผู้ช่วยวิเคราะห์สภาพอากาศอัจฉริยะ
      ข้อมูลปัจจุบัน: อุณหภูมิ ${temp}°C, สภาพอากาศ ${desc}, ค่า AQI ${aqi}
      ข้อมูลพยากรณ์: ${JSON.stringify(aqiHourly || [])} ${JSON.stringify(weatherHourly || [])}

      กฎเหล็ก (ตอบเรียงตามลำดับนี้เท่านั้น):
      1. รายงานอุณหภูมิและเวลา: "วันนี้อุณหภูมิ ${temp} องศาเซลเซียส จะ[ร้อน/หนาว/ปกติ]ไปจนถึง [ระบุเวลาจากข้อมูล]"
      2. วิเคราะห์เหตุการณ์สำคัญ (เลือกอย่างใดอย่างหนึ่งที่เด่นที่สุด):
         - ถ้าแดดจัด: "ค่ายูวีอยู่ในระดับสูงมาก แนะนำให้ทากันแดดด้วยนะครับ"
         - ถ้ามีฝน: "จะมีฝนตกช่วง [เวลา] แนะนำให้พกร่มหรือเลี่ยงการเดินทางครับ"
         - ถ้ามีหิมะ: "จะมีหิมะตกช่วง [เวลา] ระวังถนนลื่นและรักษาสุขภาพนะครับ"
      3. รายงานฝุ่น: "สภาพอากาศมีฝุ่นหนาแน่น ค่า AQI อยู่ที่ ${aqi} โดยค่าฝุ่นจะลดลงช่วง [เวลา] และจะดีขึ้นไปจนถึง [เวลา]"

      *ห้ามเกริ่นนำ ห้ามขอโทษ ห้ามพูดว่า "ตามข้อมูล" ให้เข้าแพทเทิร์นทันที*
    `;

    const response = await hf.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages: [{ role: "system", content: systemPrompt }],
      max_tokens: 250,
      temperature: 0.3,
    });

    const result = response.choices[0].message.content || "";
    return NextResponse.json({ analysis: result.trim() });

  } catch (error) {
    return NextResponse.json({ 
      analysis: `วันนี้อุณหภูมิ ${currentTemp} องศาเซลเซียส สภาพอากาศ ${currentDesc} และค่า AQI อยู่ที่ ${currentAqi} แนะนำให้ดูแลสุขภาพด้วยนะครับ` 
    });
  }
}