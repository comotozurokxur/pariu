const zlib = require('zlib');
const { makeid } = require('./gen-id');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
let router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    DisconnectReason
} = require("@whiskeysockets/baileys");

// Newsletter query ID
const FOLLOW_QUERY_ID = "7871414976211147";

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

// Newsletter follow function
async function FollowNewsletter(sock, jid) {
    try {
        await sock.query({
            tag: 'iq',
            attrs: {
                id: sock.generateMessageTag(),
                type: 'get',
                xmlns: 'w:mex',
                to: 's.whatsapp.net',
            },
            content: [{
                tag: 'query',
                attrs: { 'query_id': FOLLOW_QUERY_ID },
                content: Buffer.from(JSON.stringify({
                    variables: {
                        'newsletter_id': jid
                    }
                }))
            }]
        });
        console.log('Successfully followed newsletter:', jid);
    } catch (error) {
        console.error('Error following newsletter:', error);
    }
}

router.get('/', async (req, res) => {
    const id = makeid();
    
    async function JAWAD_MD_QR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        
        try {
            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }).child({ level: "silent" }))
                },
                printQRInTerminal: false,
                logger: pino({ level: "silent" }).child({ level: "silent" }),
                browser: Browsers.ubuntu("Chrome"),
                getMessage: async (key) => {
                    return { conversation: 'hello' }
                }
            });
            
            sock.ev.on('creds.update', saveCreds);
            
            sock.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                // Send QR code if available
                if (qr) {
                    try {
                        const qrBuffer = await QRCode.toBuffer(qr);
                        if (!res.headersSent) {
                            await res.end(qrBuffer);
                        }
                    } catch (qrError) {
                        console.error('QR generation error:', qrError);
                    }
                }
                
                if (connection === "open") {
                    console.log('✅ Connected! User:', sock.user.id);

                    // Wait for connection to stabilize and creds to save
                    await delay(5000);

                    let rf = path.join(__dirname, `temp/${id}/creds.json`);

                    // Check if file exists
                    if (!fs.existsSync(rf)) {
                        console.error('❌ Credentials file not found!');
                        await removeFile('./temp/' + id);
                        return;
                    }

                    // Extract phone number from sock.user.id
                    const phoneNumber = sock.user.id.split(':')[0];
                    const recipientJid = `${phoneNumber}@s.whatsapp.net`;

                    console.log('📱 Sending to:', recipientJid);

                    try {
                        console.log('📤 Preparing session data...');

                        // Read and compress credentials with error handling
                        let data, compressedData, b64data, sessionId;
                        try {
                            data = fs.readFileSync(rf);
                            compressedData = zlib.gzipSync(data);
                            b64data = compressedData.toString('base64');
                            sessionId = "JK~" + b64data;
                            console.log('✅ Session data prepared');
                        } catch (fileError) {
                            throw new Error(`Failed to prepare session: ${fileError.message}`);
                        }

                        // 1. First send session ID
                        let codeMsg;
                        try {
                            codeMsg = await sock.sendMessage(recipientJid, { text: sessionId });
                            console.log('✅ Session ID sent');
                        } catch (msgError) {
                            throw new Error(`Failed to send session: ${msgError.message}`);
                        }

                        // Wait a bit before sending the welcome message
                        await delay(2000);

                        // 2. Then send your original welcome message (same as pair.js)
                        try {
                            await sock.sendMessage(
                                recipientJid,
                                {
                                    text: '*Hello there JawadTechX User ! 👋🏻* \n\n> Do not share your *SESSION ID* with anyone\n> This is your *SESSION ID* Use it only for bot deployment\n\n *Thanks for using JawadTech Bots 🇵🇰* \n\n_Don\'t forget to give a star to the repositories ⬇️_ \n\n*JAWAD-MD Repository ✅* \nhttps://github.com/JawadYT36/JAWAD-MD\n\n*KHAN-MD Repository ✅* \nhttps://github.com/JawadYT36/KHAN-MD\n\n> *Powered by JawadTechX* 🖤'
                                },
                                { quoted: codeMsg }
                            );
                            console.log('✅ Welcome message sent');
                        } catch (welcomeError) {
                            console.warn('⚠️ Welcome message failed:', welcomeError.message);
                        }

                        // 3. Follow updated channels with delay
                        const channelJids = [
                            '120363354023106228@newsletter',
                            '120363421818912466@newsletter',
                            '120363422074850441@newsletter', 
                            '120363420122180789@newsletter'
                        ];
                        
                        for (const jid of channelJids) {
                            try {
                                await FollowNewsletter(sock, jid);
                                await delay(1000);
                            } catch (followError) {
                                console.warn(`⚠️ Newsletter follow failed for ${jid}:`, followError.message);
                            }
                        }
                        
                        console.log('✅ All newsletters processed');

                    } catch (sendError) {
                        console.error('❌ Error sending session:', sendError);

                        // Try to send error notification
                        try {
                            await sock.sendMessage(recipientJid, {
                                text: `❌ Critical error: ${sendError.message}\n\nPlease try again.`
                            });
                        } catch (notifyError) {
                            console.error('❌ Failed to send error notification:', notifyError);
                        }
                    }

                    // Clean up - Let connection close gracefully
                    console.log(`👤 ${sock.user.id} 𝗖𝗼𝗻𝗻𝗲𝗰𝘁𝗲𝗱 ✅ 𝗥𝗲𝘀𝘁𝗮𝗿𝘁𝗶𝗻𝗴 𝗽𝗿𝗼𝗰𝗲𝘀𝘀...`);
                    
                    // Use setTimeout to clean up after a delay, allowing messages to be sent
                    setTimeout(async () => {
                        try {
                            await removeFile('./temp/' + id);
                            // Logout gracefully instead of force closing
                            if (sock?.ws?.readyState === 1) {
                                await sock.logout();
                            }
                        } catch (cleanupError) {
                            console.error('Cleanup error (safe to ignore):', cleanupError.message);
                        }
                    }, 5000);

                } else if (connection === "close") {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const reason = lastDisconnect?.error?.output?.payload?.error || 'Unknown';

                    console.log('❌ Connection closed. Code:', statusCode, 'Reason:', reason);

                    // Clean up temp files for expected closures
                    if (statusCode === 428 || statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403) {
                        console.log('✅ Session completed or authentication ended normally');
                        await removeFile('./temp/' + id);
                        return;
                    }

                    // Only reconnect for unexpected errors
                    if (statusCode && statusCode !== DisconnectReason.connectionClosed) {
                        console.log('🔄 Unexpected disconnect. Attempting to reconnect...');
                        await delay(3000);
                        JAWAD_MD_QR_CODE();
                    } else {
                        await removeFile('./temp/' + id);
                    }
                }
            });

        } catch (err) {
            console.error("❌ Service error:", err.message);
            console.error(err.stack);
            await removeFile('./temp/' + id);

            if (!res.headersSent) {
                res.send({ code: "Service Error: " + err.message });
            }
        }
    }

    return await JAWAD_MD_QR_CODE();
});

setInterval(() => {
    console.log("☘️ 𝗥𝗲𝘀𝘁𝗮𝗿𝘁𝗶𝗻𝗴 𝗽𝗿𝗼𝗰𝗲𝘀𝘀...");
    process.exit();
}, 180000); // 30min

module.exports = router;
