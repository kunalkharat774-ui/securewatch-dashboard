import fs from 'node:fs';
import readline from 'node:readline';

const evePath = process.env.SURICATA_EVE_PATH || '/var/log/suricata/eve.json';
const secureWatchUrl = process.env.SECUREWATCH_URL || 'http://127.0.0.1:3000';
let filePosition = fs.existsSync(evePath) ? fs.statSync(evePath).size : 0;
let processing = false;

async function forwardEvent(event) {
    if (event.event_type !== 'alert' || !event.src_ip) return;
    const response = await fetch(`${secureWatchUrl}/api/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
    });
    if (!response.ok) throw new Error(`SecureWatch returned HTTP ${response.status}`);
}

async function processNewData() {
    if (processing || !fs.existsSync(evePath)) return;
    const currentSize = fs.statSync(evePath).size;
    if (currentSize <= filePosition) {
        if (currentSize < filePosition) filePosition = 0;
        return;
    }

    processing = true;
    const stream = fs.createReadStream(evePath, { start: filePosition, end: currentSize - 1 });
    const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
    try {
        for await (const line of lines) {
            try {
                await forwardEvent(JSON.parse(line));
            } catch (error) {
                console.error(`Unable to forward Suricata event: ${error.message}`);
            }
        }
        filePosition = currentSize;
    } finally {
        lines.close();
        processing = false;
    }
}

console.log(`Forwarding Suricata alerts from ${evePath} to ${secureWatchUrl}`);
setInterval(processNewData, 2000);
processNewData();