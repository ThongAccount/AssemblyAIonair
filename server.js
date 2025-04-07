import express from 'express';
import axios from 'axios';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

const ASSEMBLY_API_KEY = process.env.ASSEMBLY_API_KEY;

app.use(cors());

app.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    const audioData = fs.createReadStream(req.file.path);

    const uploadResponse = await axios.post(
      'https://api.assemblyai.com/v2/upload',
      audioData,
      {
        headers: { authorization: ASSEMBLY_API_KEY }
      }
    );

    const transcriptResponse = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url: uploadResponse.data.upload_url
      },
      {
        headers: { authorization: ASSEMBLY_API_KEY }
      }
    );

    res.json({ id: transcriptResponse.data.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/result/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await axios.get(
      `https://api.assemblyai.com/v2/transcript/${id}`,
      {
        headers: { authorization: ASSEMBLY_API_KEY }
      }
    );
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
