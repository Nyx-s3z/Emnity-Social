# Voice calls and screen sharing setup

Phase 3 adds audio-only voice calls and screen sharing. It does not request or transmit camera video.

## Features

- Start a private voice call from a direct message. The other person receives an incoming-call prompt and can accept or decline.
- Join the **General Voice** room inside a server. Each server currently has one shared voice room.
- Mute/unmute the microphone, share/stop sharing the screen, and leave the call.
- Server voice rooms support up to 6 connected participants.

## Railway environment setting

The app includes a public STUN fallback so you can try voice calls without extra setup. STUN-only connections are not reliable across every home, school, or mobile network. For reliable calls between different networks, configure a TURN service.

Add a Railway variable named `RTC_ICE_SERVERS`. Its value must be a JSON array. Example format (replace the placeholders with credentials from your TURN provider):

```json
[
  { "urls": "stun:stun.l.google.com:19302" },
  {
    "urls": "turn:YOUR_TURN_HOST:3478",
    "username": "YOUR_TURN_USERNAME",
    "credential": "YOUR_TURN_CREDENTIAL"
  }
]
```

Treat TURN credentials as secrets. Do not commit real credentials to GitHub or paste them into frontend files. The authenticated `/api/voice-config` endpoint sends the configured ICE server details to signed-in clients because browsers need them to establish peer connections.

## Browser requirements

- Use the deployed HTTPS site or localhost.
- Allow microphone access when prompted.
- Screen sharing requires a browser that supports `getDisplayMedia`; desktop browsers are the best target. Some mobile browsers do not support screen sharing.
- For a useful cross-network test, use two accounts on separate devices and separate internet connections.
