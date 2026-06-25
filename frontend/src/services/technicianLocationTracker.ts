import { socket } from './socket';
import { mergeTechnicianLocation } from './liveTechnicianStore';
import api from './api';

let watchId: number | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let activeUserId: number | null = null;
let running = false;
let lastRestPush = 0;

const pushLocationRest = (lat: number, lng: number) => {
  const now = Date.now();
  if (now - lastRestPush < 8000) return;
  lastRestPush = now;
  api.patch('/users/live-location', { lat: Number(lat), lng: Number(lng) }).catch(() => {});
};

const emitLocation = (userId: number, lat: number, lng: number) => {
  mergeTechnicianLocation(userId, lat, lng);
  pushLocationRest(lat, lng);
  if (!socket.connected) socket.connect();
  socket.emit('location_update', {
    userId,
    lat: Number(lat),
    lng: Number(lng),
  });
};

const pushCurrentPosition = (userId: number, highAccuracy = true) => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      emitLocation(userId, position.coords.latitude, position.coords.longitude);
    },
    () => {},
    {
      enableHighAccuracy: highAccuracy,
      timeout: 15000,
      maximumAge: highAccuracy ? 0 : 10000,
    }
  );
};

const onVisibilityChange = () => {
  if (document.visibilityState === 'visible' && activeUserId) {
    pushCurrentPosition(activeUserId, true);
  }
};

const onSocketReconnect = () => {
  if (activeUserId) pushCurrentPosition(activeUserId, true);
};

export const startTechnicianLocationTracking = (userId: number) => {
  if (running && activeUserId === userId) return;

  stopTechnicianLocationTracking();
  activeUserId = userId;
  running = true;

  socket.connect();
  socket.off('connect', onSocketReconnect);
  socket.on('connect', onSocketReconnect);

  if (!navigator.geolocation) {
    console.warn('Geolocation not supported in this browser.');
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      emitLocation(userId, position.coords.latitude, position.coords.longitude);
    },
    (error) => {
      console.warn('Geolocation watch error:', error.message);
      if (error.code === error.PERMISSION_DENIED) {
        console.error('[GPS] Location permission denied — enable location for live tracking');
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 5000,
    }
  );

  pushCurrentPosition(userId, true);

  intervalId = setInterval(() => {
    if (activeUserId) pushCurrentPosition(activeUserId, false);
  }, 30000);

  document.addEventListener('visibilitychange', onVisibilityChange);
};

export const stopTechnicianLocationTracking = () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  document.removeEventListener('visibilitychange', onVisibilityChange);
  socket.off('connect', onSocketReconnect);

  activeUserId = null;
  running = false;
};

export const isTechnicianLocationTrackingActive = () => running;
