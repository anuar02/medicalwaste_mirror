const WebSocket = require('ws');
const GpsData = require('../models/gpsData');
const { logger } = require('../middleware/loggers');

let wss = null;
let connectedClients = new Set();

function initializeGpsWebSocket(server) {
    wss = new WebSocket.Server({
        server,
        path: '/ws/gps'
    });

    wss.on('connection', (ws, req) => {
        const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
        connectedClients.add(ws);

        logger.info(`GPS WebSocket client connected: ${clientId}`);

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'connection',
            message: 'GPS WebSocket connected',
            timestamp: new Date().toISOString()
        }));

        // Handle incoming messages from ESP32
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());

                if (message.type === 'gps_data') {
                    await handleGpsData(message.data, ws);
                } else if (message.type === 'ping') {
                    ws.send(JSON.stringify({
                        type: 'pong',
                        timestamp: new Date().toISOString()
                    }));
                }
            } catch (error) {
                logger.error(`Error processing GPS WebSocket message: ${error.message}`);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid message format',
                    timestamp: new Date().toISOString()
                }));
            }
        });

        // Handle client disconnect
        ws.on('close', () => {
            connectedClients.delete(ws);
            logger.info(`GPS WebSocket client disconnected: ${clientId}`);
        });

        // Handle errors
        ws.on('error', (error) => {
            logger.error(`GPS WebSocket error for ${clientId}: ${error.message}`);
            connectedClients.delete(ws);
        });
    });

    // Cleanup function
    return () => {
        if (wss) {
            wss.close();
        }
    };
}

async function handleGpsData(data, ws) {
    try {
        const gpsData = new GpsData({
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            altitude: data.altitude ? parseFloat(data.altitude) : null,
            gpsTime: data.gpsTime ? new Date(data.gpsTime) : new Date(),
            speed: data.speed ? parseFloat(data.speed) : null,
            course: data.course ? parseFloat(data.course) : null,
            satellites: {
                visible: data.satellites?.visible ? parseInt(data.satellites.visible) : null,
                used: data.satellites?.used ? parseInt(data.satellites.used) : null,
                snr: data.satellites?.snr || []
            },
            fixQuality: data.fixQuality ? parseInt(data.fixQuality) : null,
            hdop: data.hdop ? parseFloat(data.hdop) : null,
            vdop: data.vdop ? parseFloat(data.vdop) : null,
            pdop: data.pdop ? parseFloat(data.pdop) : null,
            deviceInfo: {
                chipId: data.deviceInfo?.chipId || null,
                firmware: data.deviceInfo?.firmware || null,
                batteryLevel: data.deviceInfo?.batteryLevel ? parseFloat(data.deviceInfo.batteryLevel) : null,
                signalStrength: data.deviceInfo?.signalStrength ? parseInt(data.deviceInfo.signalStrength) : null
            },
            rawNmea: data.rawNmea || null
        });

        // Validate required fields
        if (!gpsData.latitude || !gpsData.longitude) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Latitude and longitude are required',
                timestamp: new Date().toISOString()
            }));
            return;
        }

        // Save to database
        const savedData = await gpsData.save();

        logger.info(`GPS data received via WebSocket: ${savedData.latitude}, ${savedData.longitude} from ${savedData.deviceInfo.chipId || 'unknown'}`);

        // Send confirmation to sender
        ws.send(JSON.stringify({
            type: 'gps_data_saved',
            id: savedData._id,
            isValidFix: savedData.isValidFix(),
            timestamp: new Date().toISOString()
        }));

        // Broadcast to other connected clients (for monitoring/dashboard)
        broadcastGpsUpdate(savedData, ws);

    } catch (error) {
        logger.error(`Error saving GPS data via WebSocket: ${error.message}`);
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to save GPS data',
            details: error.message,
            timestamp: new Date().toISOString()
        }));
    }
}

function broadcastGpsUpdate(gpsData, excludeWs = null) {
    const message = JSON.stringify({
        type: 'gps_update',
        data: {
            id: gpsData._id,
            latitude: gpsData.latitude,
            longitude: gpsData.longitude,
            altitude: gpsData.altitude,
            speed: gpsData.speed,
            course: gpsData.course,
            gpsTime: gpsData.gpsTime,
            satellites: gpsData.satellites,
            deviceInfo: gpsData.deviceInfo,
            isValidFix: gpsData.isValidFix()
        },
        timestamp: new Date().toISOString()
    });

    connectedClients.forEach(client => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
            } catch (error) {
                logger.error(`Error broadcasting GPS update: ${error.message}`);
                connectedClients.delete(client);
            }
        }
    });
}

function getConnectedClientsCount() {
    return connectedClients.size;
}

function sendToAllClients(message) {
    const messageString = JSON.stringify({
        ...message,
        timestamp: new Date().toISOString()
    });

    connectedClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(messageString);
            } catch (error) {
                logger.error(`Error sending message to client: ${error.message}`);
                connectedClients.delete(client);
            }
        }
    });
}

module.exports = {
    initializeGpsWebSocket,
    broadcastGpsUpdate,
    getConnectedClientsCount,
    sendToAllClients
};
