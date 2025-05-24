import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { GoogleGenAI, Modality } from '@google/genai';

// Load env variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

// Read prompts from prompts.txt (only lines 1-30)
function getRandomPrompt() {
  try {
    const promptsPath = path.join(process.cwd(), 'prompts.txt');
    const prompts = fs.readFileSync(promptsPath, 'utf-8').split('\n').filter(Boolean);
    // Only use first 30 lines
    const validPrompts = prompts.slice(0, 30);

    if (validPrompts.length === 0) {
      throw new Error('No valid prompts found');
    }

    const randomIndex = Math.floor(Math.random() * validPrompts.length);
    return validPrompts[randomIndex];
  } catch (error) {
    console.error('Error reading prompts.txt:', error.message);
    // Fallback prompt
    return 'Beautiful divine artwork with vibrant colors and spiritual energy';
  }
}

// Read captions from caption.txt
function getRandomCaption() {
  try {
    const captionPath = path.join(process.cwd(), 'caption.txt');
    const fileContent = fs.readFileSync(captionPath, 'utf-8');

    if (!fileContent || fileContent.length === 0) {
      throw new Error('caption.txt is empty or could not be read');
    }

    // Split by === separator
    const sections = fileContent.split('===').filter(section => section && section.trim().length > 10);

    if (sections.length === 0) {
      throw new Error('No valid captions found in caption.txt');
    }

    const randomIndex = Math.floor(Math.random() * sections.length);
    return sections[randomIndex].trim();
  } catch (error) {
    console.error('Error reading caption.txt:', error.message);
    // Fallback: return a simple caption
    return 'Check out this amazing image! #art #creative #inspiration';
  }
}

async function generateImage(prompt) {
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-preview-image-generation',
    contents: prompt,
    config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const imageData = part.inlineData.data;
      const buffer = Buffer.from(imageData, 'base64');
      fs.writeFileSync('generated_image.png', buffer);
      console.log('Image saved as generated_image.png');
      return buffer;
    }
  }
  throw new Error('No image generated');
}

async function postToFacebook(imageBuffer, caption) {
  const form = new FormData();
  form.append('access_token', FACEBOOK_PAGE_ACCESS_TOKEN);
  form.append('caption', caption);
  form.append('source', imageBuffer, {
    filename: 'image.png',
    contentType: 'image/png',
  });

  const uploadResponse = await fetch(`https://graph.facebook.com/v16.0/${FACEBOOK_PAGE_ID}/photos`, {
    method: 'POST',
    body: form,
    headers: form.getHeaders(),
  });

  const data = await uploadResponse.json();
  if (!uploadResponse.ok) {
    throw new Error(`Facebook photo upload failed: ${data.error.message}`);
  }
  console.log('Posted image to Facebook, post ID:', data.post_id || data.id);
}

async function main() {
  try {
    const prompt = getRandomPrompt();
    const caption = getRandomCaption();
    console.log('Prompt:', prompt);
    console.log('Caption:', caption);

    console.log('Generating image...');
    const imageBuffer = await generateImage(prompt);

    console.log('Posting to Facebook...');
    await postToFacebook(imageBuffer, caption);

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();