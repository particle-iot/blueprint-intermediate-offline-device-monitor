import Particle from "particle:core";

const PRODUCT_ID = 36903;
const LEDGER_NAME = "offline-devices";

export default function job({ functionInfo, trigger, scheduled, secrets }) {
  const allDevices = getAllDevices(PRODUCT_ID);
  const offlineDevices = detectOfflineDevices(allDevices);

  const ledger = Particle.ledger(LEDGER_NAME, {
    productId: PRODUCT_ID,
    deviceId: null,
  });
  const ledgerState = ledger.get().data;

  const newlyOfflineDevices = filterNewOfflineDevices(
    offlineDevices,
    ledgerState
  );

  if (newlyOfflineDevices.length > 0) {
    console.log("offline devices: ", newlyOfflineDevices);
    Particle.publish("offline-device-alert", newlyOfflineDevices, {
      productId: PRODUCT_ID,
    });
  }

  ledger.set(
    {
      offlineDevices: offlineDevices.map((device) => device.id),
    },
    Particle.REPLACE
  );
}

function getAllDevices(productId) {
  const allDevices = [];
  let page = 1;
  let perPage = 25;

  while (true) {
    const response = Particle.listDevices(productId, { page, perPage });
    allDevices.push(...response.body.devices);
    if (response.body.devices.length < perPage) {
      break;
    }
    page++;
  }
  return allDevices;
}

function detectOfflineDevices(devices) {
  return devices.filter((device) => {
    const timeSinceLastHeard =
      new Date() - new Date(device.last_heard).getTime();
    const isOffline = timeSinceLastHeard >= 60 * 60 * 1000; // 60 minutes
    return !device.connected && isOffline;
  });
}

function filterNewOfflineDevices(offlineDevices, previousState) {
  if (
    !previousState.offlineDevices ||
    previousState.offlineDevices.length === 0
  ) {
    return offlineDevices;
  }
  return offlineDevices.filter(
    (device) => !previousState.offlineDevices.includes(device.id)
  );
}
