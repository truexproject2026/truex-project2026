export const runtime = 'edge'; // ⚡ เพิ่มบรรทัดนี้ครับ
import { HfInference } from "@huggingface/inference";
import { NextResponse } from "next/server";

const hf = new HfInference(process.env.HF_TOKEN);

export async function POST(req: Request) {
  try {
    const { aqi, temp } = await req.json();

    // ⚡ ปรับ Prompt ให้เน้นความกระชับและ "จบประโยคให้สมบูรณ์"
    const systemPrompt = `
      คุณคือ TrueX AI ผู้ช่วยอัจฉริยะ วิเคราะห์ AQI: ${aqi} และ Temp: ${temp}°C 
      ตอบเป็นภาษาไทยที่จริงใจ เป็นกันเอง และ "ต้องจบประโยคให้สมบูรณ์" 
      ห้ามใส่หัวข้อ ห้ามมีเครื่องหมาย [] เน้นสรุปสั้นๆ ใน 1-2 ประโยค 
      เช่น "อากาศดีมากครับ AQI ${aqi} กับอุณหภูมิ ${temp}°C กำลังสบาย ออกไปเดินเล่นได้เลยครับ"
    `;

    const response = await hf.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages: [{ role: "system", content: systemPrompt }],
      max_tokens: 150, // เพิ่มจาก 100 เป็น 150 เพื่อให้ AI มีพื้นที่พิมพ์จนจบประโยค
      temperature: 0.5, // ลดความเพ้อเจ้อลง เพื่อให้ตอบตรงประเด็นและสั้นลง
    });

    const result = response.choices[0].message.content;
    
    // Clean ข้อมูลเผื่อมีขยะหลุดมา
    const cleanResult = result?.replace(/\[.*?\]/g, "").trim();

    return NextResponse.json({ analysis: cleanResult });

  } catch (error) {
    return NextResponse.json({ analysis: "ขออภัยครับ ระบบ AI ขัดข้องเล็กน้อย แต่สภาพอากาศโดยรวมยังปกติครับ" }, { status: 500 });
  }
}