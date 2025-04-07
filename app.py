import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

ASSEMBLYAI_API_KEY = "8055383b3c774f77b3fc2a8c48f826f8"

def transcribe_audio(audio_file):
    headers = {'authorization': ASSEMBLYAI_API_KEY}
    upload_url = 'https://api.assemblyai.com/v2/upload'
    response = requests.post(upload_url, headers=headers, files={'file': audio_file})
    upload_url = response.json()['upload_url']
    
    transcript_url = 'https://api.assemblyai.com/v2/transcript'
    transcript_request = {
        'audio_url': upload_url
    }
    
    transcript_response = requests.post(transcript_url, json=transcript_request, headers=headers)
    transcript_id = transcript_response.json()['id']
    
    return transcript_id

@app.route('/transcribe', methods=['POST'])
def transcribe():
    audio_file = request.files['audio']
    transcript_id = transcribe_audio(audio_file)
    return jsonify({"transcript_id": transcript_id})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
