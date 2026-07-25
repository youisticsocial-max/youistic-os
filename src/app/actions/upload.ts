"use server";

import fs from "fs";
import path from "path";
import crypto from "crypto";

export async function uploadBase64Image(base64Data: string): Promise<string> {
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const matches = base64Data.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 string");
    }

    const extension = matches[1] === "jpeg" ? "jpg" : matches[1];
    const imageBuffer = Buffer.from(matches[2], "base64");
    const filename = `${crypto.randomUUID()}.${extension}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, imageBuffer);

    return `/uploads/${filename}`;
  } catch (error) {
    console.error("Failed to upload image:", error);
    throw new Error("Image upload failed");
  }
}
