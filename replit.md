# JawadTechX WhatsApp Session Generator

## Overview
This is a WhatsApp session generator web application using Baileys library. It allows users to generate WhatsApp bot session credentials via either pairing codes or QR codes.

## Recent Changes (Nov 13, 2025)
- **Fixed Critical Error**: Resolved 428 "Precondition Required" error that occurred after successful WhatsApp connection
  - Changed from force-closing socket (`sock.ws.close()`) to graceful logout (`sock.logout()`)
  - Added 428 error handling to treat it as expected behavior instead of error
  - Improved connection lifecycle management
  
- **Enhanced Error Handling**: Added comprehensive try-catch blocks throughout the application
  - Individual error handling for file operations, message sending, and newsletter following
  - Better error messages and logging
  - Graceful degradation when optional features fail
  
- **Replit Environment Setup**:
  - Configured server to run on port 5000 (required for Replit webview)
  - Server binds to 0.0.0.0 to accept all connections
  - Fixed Node.js syntax error in pair.js
  - Added .gitignore for Node.js projects
  
- **Deployment Configuration**:
  - Added vercel.json for Vercel deployment
  - Added render.yaml for Render deployment
  - Configured Replit deployment settings

## Project Architecture

### Core Files
- `index.js` - Main Express server, handles routing
- `pair.js` - Pairing code generation endpoint
- `qr.js` - QR code generation endpoint  
- `pair.html` - Frontend UI with neon theme
- `gen-id.js` - Random ID generator for temp directories

### Key Features
1. **Pairing Code Method** - Generate 8-digit pairing code for WhatsApp linking
2. **QR Code Method** - Generate QR code for WhatsApp scanning
3. **Session Management** - Automatically sends session credentials to user's WhatsApp
4. **Newsletter Auto-Follow** - Follows configured newsletters after connection
5. **Automatic Cleanup** - Removes temporary files after session creation

### Tech Stack
- Node.js v20
- Express.js - Web framework
- Baileys v7.0.0-rc.5 - WhatsApp Web API
- QRCode - QR generation
- Pino - Logging

### Environment Variables
- `PORT` - Server port (default: 5000 for Replit, 10000 for Render)
- `NODE_ENV` - Environment mode

## Deployment Instructions

### Deploy to Vercel
```bash
vercel --prod
```

### Deploy to Render
1. Connect GitHub repository to Render
2. Render will auto-detect render.yaml configuration
3. Deploy automatically

### Deploy on Replit
1. Click "Deploy" button in Replit
2. Project is pre-configured with deployment settings

## User Preferences
- None specified yet

## Known Issues
- None currently

## Next Steps
- Monitor for any remaining connection issues
- Consider adding rate limiting for production
- Add analytics/monitoring
