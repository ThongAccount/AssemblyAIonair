import express from "express";
import multer from "multer";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
const upload = multer({ dest: "uploads/" });
const PORT = process.env.PORT || 3000;
const API_KEY = "8055383b3c774f77b3fc2a8c48f826f8";

app.use(cors());

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const audioPath = req.file.path;

    // STEP 1: Upload audio to AssemblyAI
    const audioData = fs.readFileSync(audioPath);
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        "authorization": API_KEY,
        "transfer-encoding": "chunked"
      },
      body: audioData,
    });

    const uploadData = await uploadRes.json();
    const audio_url = uploadData.upload_url;

    // STEP 2: Detect language
    const detectRes = await fetch("https://api.assemblyai.com/v2/language-detection", {
      method: "POST",
      headers: {
        "authorization": API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({ audio_url })
    });

    const detectData = await detectRes.json();
    const langCode = detectData.language_code || "en";
    console.log(`🔤 Detected language: ${langCode}`);

    // STEP 3: Transcribe using detected language
    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "authorization": API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        audio_url,
        language_code: langCode,
        punctuate: true,
        format_text: true
      })
    });

    const transcriptData = await transcriptRes.json();

    // Polling until done
    let transcript;
    while (true) {
      const pollingRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptData.id}`, {
        headers: { authorization: API_KEY }
      });

      transcript = await pollingRes.json();
      if (transcript.status === "completed") break;
      if (transcript.status === "error") throw new Error("Transcription failed.");

      await new Promise(r => setTimeout(r, 2500));
    }

    fs.unlinkSync(audioPath); // cleanup
    res.json({
      text: transcript.text,
      language_code: langCode
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Transcription failed." });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
