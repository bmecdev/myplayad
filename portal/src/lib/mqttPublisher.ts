import mqtt from 'mqtt';

// Use a global variable to keep a single MQTT connection in development/production
let mqttClient: mqtt.MqttClient | null = null;

function getClient(): mqtt.MqttClient {
  if (!mqttClient) {
    const mqttUrl = process.env.MQTT_URL || 'wss://videos.myplayad.com/mqtt';
    mqttClient = mqtt.connect(mqttUrl, {
      reconnectPeriod: 5000,
    });

    mqttClient.on('error', (err) => {
      console.error('[MQTT Publisher] Error:', err);
    });
  }
  return mqttClient;
}

export async function publishSyncEvent(screenId: string) {
  try {
    const client = getClient();
    const payload = JSON.stringify({ timestamp: Date.now() });

    if (client.connected) {
      client.publish(`screens/${screenId}/sync`, payload);
      console.log(`[MQTT Publisher] Published sync event for screen ${screenId}`);
    } else {
      client.publish(`screens/${screenId}/sync`, payload);
    }
  } catch (err) {
    console.error('[MQTT Publisher] Failed to publish sync:', err);
  }
}

export async function publishIdentifyEvent(screenId: string) {
  try {
    const client = getClient();
    const payload = JSON.stringify({ timestamp: Date.now() });

    if (client.connected) {
      client.publish(`screens/${screenId}/identify`, payload);
      console.log(`[MQTT Publisher] Published identify event for screen ${screenId}`);
    } else {
      client.publish(`screens/${screenId}/identify`, payload);
    }
  } catch (err) {
    console.error('[MQTT Publisher] Failed to publish identify:', err);
  }
}

export async function publishUpdateCommand(params: {
  screenId?: string;
  broadcast?: boolean;
  clientId?: string;
  triggeredBy?: string;
}) {
  try {
    const client = getClient();
    const payload = JSON.stringify({
      action: 'UPDATE_SOFTWARE',
      targetBranch: 'main',
      screenId: params.screenId,
      clientId: params.clientId,
      triggeredBy: params.triggeredBy || 'portal',
      timestamp: Date.now(),
    });

    if (params.broadcast) {
      client.publish('screens/broadcast/commands', payload, { qos: 1 });
      client.publish('screens/broadcast/update', payload, { qos: 1 });
      console.log(`[MQTT Publisher] Published broadcast update command by ${params.triggeredBy}`);
    } else if (params.screenId) {
      client.publish(`screens/${params.screenId}/commands`, payload, { qos: 1 });
      client.publish(`screens/${params.screenId}/update`, payload, { qos: 1 });
      console.log(`[MQTT Publisher] Published update command for screen ${params.screenId} by ${params.triggeredBy}`);
    }
  } catch (err) {
    console.error('[MQTT Publisher] Failed to publish update command:', err);
  }
}

export async function publishPowerCommand(params: {
  action: 'POWER_ON' | 'POWER_OFF' | 'REBOOT';
  screenId?: string;
  broadcast?: boolean;
  triggeredBy?: string;
}) {
  try {
    const client = getClient();
    const payload = JSON.stringify({
      action: params.action,
      screenId: params.screenId,
      triggeredBy: params.triggeredBy || 'portal',
      timestamp: Date.now(),
    });

    if (params.broadcast) {
      client.publish('screens/broadcast/commands', payload, { qos: 1 });
      console.log(`[MQTT Publisher] Published broadcast power command: ${params.action} by ${params.triggeredBy}`);
    } else if (params.screenId) {
      client.publish(`screens/${params.screenId}/commands`, payload, { qos: 1 });
      console.log(`[MQTT Publisher] Published power command: ${params.action} for screen ${params.screenId} by ${params.triggeredBy}`);
    }
  } catch (err) {
    console.error('[MQTT Publisher] Failed to publish power command:', err);
  }
}
