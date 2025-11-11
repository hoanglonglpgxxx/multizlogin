// helpers.js
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getWebhookUrl as getConfigWebhookUrl } from '../services/webhookService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getWebhookUrl(key, ownId) {
    return getConfigWebhookUrl(key, ownId);
}

export async function triggerN8nWebhook(msg, webhookUrl) {
    if (!webhookUrl) {
        console.warn("Webhook URL is empty, skipping webhook trigger");
        return false;
    }

    try {
        // If the webhook target is Discord, transform the payload to the expected shape
        // Discord expects JSON like { content: "..." } or embeds; posting arbitrary objects
        // will often result in 400 Bad Request.
        let payload = msg;
        try {
            const isDiscord = typeof webhookUrl === 'string' && webhookUrl.includes('discord.com/api/webhooks');
            if (isDiscord) {
                // Prefer a human readable text field if available, otherwise stringify a subset
                const text = msg?.text || msg?.message || msg?.content || msg?.body || null;
                if (text) {
                    payload = { content: String(text) };
                } else {
                    // Fallback: stringify the whole object but limit size to avoid hitting Discord limits
                    const raw = JSON.stringify(msg || {});
                    payload = { content: raw.length > 1900 ? raw.slice(0, 1900) + '...' : raw };
                }
            }
        } catch (transformErr) {
            console.warn('Error while transforming webhook payload:', transformErr.message);
            payload = msg;
        }

        await axios.post(webhookUrl, payload, { headers: { 'Content-Type': 'application/json' } });
        return true;
    } catch (error) {
        // Provide more diagnostic info when available
        if (error.response) {
            console.error("Error sending webhook request: status", error.response.status, "data:", error.response.data);
        } else {
            console.error("Error sending webhook request:", error.message);
        }
        return false;
    }
}

export async function saveImage(url) {
    try {
        const imgPath = "./temp.png";

        const { data } = await axios.get(url, { responseType: "arraybuffer" });
        // data is an ArrayBuffer (or Buffer in Node), write binary data directly
        fs.writeFileSync(imgPath, Buffer.from(data));

        return imgPath;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export function removeImage(imgPath) {
    try {
        fs.unlinkSync(imgPath);
    } catch (error) {
        console.error(error);
    }
}