const zlib = require('zlib');
const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
const path = require('path');
let router = express.Router();
const pino = require("pino");
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    Browsers, 
    makeCacheableSignalKeyStore,
    DisconnectReason 
} = require('@whiskeysockets/baileys');

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
        console.log('✅ Successfully followed newsletter:', jid);
    } catch (error) {
        console.error('⚠️ Error following newsletter:', error.message);
    }
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    // Validate phone number
    if (!num || num.replace(/[^0-9]/g, '').length < 10) {
        return res.send({ code: "Invalid phone number" });
    }

    async function JAWAD_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        let sessionProcessed = false;

        try {
            let sock = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }).child({ level: "silent" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "silent" }).child({ level: "silent" }),
                browser: Browsers.ubuntu("Chrome"),
                getMessage: async (key) => {
                    return { conversation: 'hello' }
                }
            });

            // Request pairing code
            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');

                try {
                    const code = await sock.requestPairingCode(num);
                    console.log(`🔑 Pairing code for ${num}: ${code}`);

                    if (!res.headersSent) {
                        res.send({ code });
                    }
                } catch (err) {
                    console.error('❌ Error requesting pairing code:', err.message);
                    if (!res.headersSent) {
                        res.send({ code: "Error: " + (err.message || "Could not generate code") });
                    }
                    
                    try {
                        if (sock?.ws?.readyState === 1) {
                            sock.ws.close();
                        }
                    } catch (closeErr) {
                        console.error('Socket close error (safe to ignore):', closeErr.message);
                    }
                    
                    await removeFile('./temp/' + id);
                    return;
                }
            }

            // Save credentials when updated
            sock.ev.on('creds.update', saveCreds);

            // Handle connection updates
            sock.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;

                console.log('📡 Connection status:', connection);

                if (connection === "open" && !sessionProcessed) {
                    sessionProcessed = true;
                    console.log('✅ Connected! User:', sock.user.id);

                    // Wait for connection to stabilize
                    await delay(5000);

                    let rf = path.join(__dirname, `temp/${id}/creds.json`);

                    if (!fs.existsSync(rf)) {
                        console.error('❌ Credentials file not found!');
                        await removeFile('./temp/' + id);
                        return;
                    }

                    const phoneNumber = sock.user.id.split(':')[0];
                    const recipientJid = `${phoneNumber}@s.whatsapp.net`;

                    console.log('📱 Sending to:', recipientJid);

                    try {
                        console.log('📤 Preparing session data...');

                        // Read and compress credentials
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

                        // Send session ID
                        let codeMsg;
                        try {
                            codeMsg = await sock.sendMessage(recipientJid, { text: sessionId });
                            console.log('✅ Session ID sent');
                        } catch (msgError) {
                            throw new Error(`Failed to send session: ${msgError.message}`);
                        }

                        await delay(2000);

                        // Send welcome message
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

                        // Follow channels
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

                        try {
                            await sock.sendMessage(recipientJid, {
                                text: `❌ Critical error: ${sendError.message}\n\nPlease try again.`
                            });
                        } catch (notifyError) {
                            console.error('❌ Failed to send error notification:', notifyError);
                        }
                    }

                    // Process completed successfully
                    console.log(`👤 ${sock.user.id} 𝗖𝗼𝗻𝗻𝗲𝗰𝘁𝗲𝗱 ✅ 𝗣𝗿𝗼𝗰𝗲𝘀𝘀 𝗰𝗼𝗺𝗽𝗹𝗲𝘁𝗲𝗱`);
                    
                    // Cleanup after delay - don't wait for it
                    setTimeout(async () => {
                        try {
                            await removeFile('./temp/' + id);
                            if (sock?.ws?.readyState === 1) {
                                sock.ws.close();
                            }
                        } catch (cleanupError) {
                            console.error('Cleanup error (safe to ignore):', cleanupError.message);
                        }
                    }, 3000);

                } else if (connection === "close") {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const reason = lastDisconnect?.error?.output?.payload?.error || 'Unknown';

                    console.log('Connection closed. Code:', statusCode, 'Reason:', reason);

                    // Handle 428 error - this is NORMAL after session send
                    if (statusCode === 428) {
                        console.log('✅ Session sent successfully. 428 is expected - ignoring.');
                        await removeFile('./temp/' + id);
                        return;
                    }

                    // Handle expected closures
                    if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403) {
                        console.log('✅ Authentication ended normally');
                        await removeFile('./temp/' + id);
                        return;
                    }

                    // Only retry for connection issues BEFORE session is sent
                    if (!sessionProcessed && (statusCode === DisconnectReason.connectionClosed || 
                        statusCode === DisconnectReason.connectionLost || 
                        statusCode === DisconnectReason.timedOut)) {
                        console.log('🔄 Connection issue, retrying...');
                        await delay(3000);
                        return JAWAD_MD_PAIR_CODE();
                    }

                    // For any other case, just cleanup
                    console.log('⛔ Session ended');
                    await removeFile('./temp/' + id);
                }
            });

            sock.ev.on('messages.upsert', async () => { });

        } catch (err) {
            console.error("❌ Service error:", err.message);
            console.error(err.stack);
            await removeFile('./temp/' + id);

            if (!res.headersSent) {
                res.send({ code: "Service Error: " + err.message });
            }
        }
    }

    return await JAWAD_MD_PAIR_CODE();
});

module.exports = router;
