"use server";

const TELEGRAM_BOT_TOKEN = "8632913740:AAGyu62YVLYx9o8XaBQ5t9tQcNz57lv4F3Q";
const TELEGRAM_CHAT_ID = "-1003668861443";

/**
 * Uploads a file (Buffer) to a Telegram Chat group as a document.
 * Returns the file mapping or URL structure.
 */
export async function uploadDocumentToTelegram(fileBuffer: Buffer, filename: string, mimeType: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;

  const formData = new FormData();
  formData.append("chat_id", TELEGRAM_CHAT_ID);

  const fileBlob = new Blob([fileBuffer], { type: mimeType });
  formData.append("document", fileBlob, filename);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Telegram Error: ${data.description}`);
    }

    // data.result.document contains file_id
    const fileId = data.result.document.file_id;
    return { success: true, fileId };
  } catch (error: any) {
    console.error("Telegram Upload Failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves a file URL from Telegram using the file_id.
 * Note: Telegram file URLs expire, so this must be called when the user actually wants to download.
 */
export async function getTelegramFileUrl(fileId: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram Error: ${data.description}`);
    }

    const filePath = data.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
    
    return { success: true, url: downloadUrl };
  } catch (error: any) {
    console.error("Telegram Get File Failed:", error);
    return { success: false, error: error.message };
  }
}
