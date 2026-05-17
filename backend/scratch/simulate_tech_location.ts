import { io } from 'socket.io-client';

const BACKEND_URL = 'http://127.0.0.1:5000';
const socket = io(BACKEND_URL, {
  transports: ['websocket']
});

// You can specify the technician ID you want to test here (ID 12 is the existing Call Center agent)
const TEST_TECH_ID = 12; 

console.log(`Connecting to Socket server at ${BACKEND_URL}...`);

socket.on('connect', () => {
  console.log(`Connected successfully! Socket ID: ${socket.id}`);
  console.log(`Simulating live location updates for Technician ID: ${TEST_TECH_ID}...`);
  
  let angle = 0;
  const baseLat = 31.5204;
  const baseLng = 74.3587;
  
  const interval = setInterval(() => {
    // Generate circular path movement around Lahore center
    angle += 0.1;
    const lat = baseLat + 0.01 * Math.sin(angle);
    const lng = baseLng + 0.01 * Math.cos(angle);
    
    console.log(`Sending update -> Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
    
    // Emit coordinate update
    socket.emit('location_update', {
      userId: TEST_TECH_ID,
      lat,
      lng
    });
  }, 2000); // Send location update every 2 seconds
  
  socket.on('disconnect', () => {
    clearInterval(interval);
    console.log('Disconnected from server.');
  });
});

socket.on('connect_error', (error: any) => {
  console.error('Connection error:', error.message);
});
