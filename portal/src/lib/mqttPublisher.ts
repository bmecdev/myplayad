import mqtt from 'mqtt';

// Use a global variable to keep a single MQTT connection in development/production
let mqttClient: mqtt.MqttClient | null = null;

export async function publishSyncEvent(screenId: string) {
  try {
    if (!mqttClient) {
      // Connect using WebSocket port/path
      const mqttUrl = process.env.MQTT_URL || 'wss://videos.myplayad.com/mqtt';
      mqttClient = mqtt.connect(mqttUrl, {
        reconnectPeriod: 5000,
      });

      mqttClient.on('error', (err) => {
        console.error('[MQTT Publisher] Error:', err);
      });
    }

    if (mqttClient.connected) {
      mqttClient.publish(`screens/${screenId}/sync`, JSON.stringify({ timestamp: Date.now() }));
      console.log(`[MQTT Publisher] Published sync event for screen ${screenId}`);
    } else {
      // If not connected yet, wait for connect or just publish (mqtt.js queues messages by default)
      mqttClient.publish(`screens/${screenId}/sync`, JSON.stringify({ timestamp: Date.now() }));
    }
  } catch (err) {
    console.error('[MQTT Publisher] Failed to publish:', err);
  }
}
