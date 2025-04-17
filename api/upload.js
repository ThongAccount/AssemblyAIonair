import { IncomingForm } from 'formidable';
import fetch from 'node-fetch';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing to handle file uploads
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = new IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err || !files.audio) return res.status(400).json({ error: 'Upload failed' });

    const file = files.audio;
    const API_KEY = process.env.ASSEMBLYAI_API_KEY;

    if (!API_KEY) return res.status(500).json({ error: 'API Key missing' });

    try {
      // Read the file as a buffer
      const buffer = fs.readFileSync(file[0]?.filepath || '');

      // Upload file to AssemblyAI
      const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          authorization: API_KEY,
          'Content-Type': 'application/json',
        },
        body: buffer,
      });

      const uploadData = await uploadRes.json();
      const audio_url = uploadData.upload_url;

      // Create a transcription request
      const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          authorization: API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url,
          language_code: 'vi', // Vietnamese
          punctuate: true,
          format_text: true,
        }),
      });

      const transcriptData = await transcriptRes.json();

      // Polling loop
      let transcript;
      while (true) {
        const pollingRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptData.id}`, {
          headers: { authorization: API_KEY },
        });
        transcript = await pollingRes.json();

        if (transcript.status === 'completed') break;
        if (transcript.status === 'error') throw new Error('Transcription failed.');

        await new Promise((r) => setTimeout(r, 2500)); // Wait 2.5s
      }

      // Return the transcribed text
      res.status(200).json({ text: transcript.text });
    } catch (e) {
      console.error('🛑 ERROR:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
