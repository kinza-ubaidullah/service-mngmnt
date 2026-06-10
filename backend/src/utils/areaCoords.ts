const AREA_COORDS: Record<string, [number, number]> = {
  makkah: [21.4225, 39.8262],
  mecca: [21.4225, 39.8262],
  'makkah al mukarramah': [21.4225, 39.8262],
  'مكة': [21.4225, 39.8262],
  'مكه': [21.4225, 39.8262],
  jeddah: [21.4858, 39.1925],
  riyadh: [24.7136, 46.6753],
  madinah: [24.4672, 39.6111],
  medina: [24.4672, 39.6111],
  dammam: [26.3927, 49.9777],
  taif: [21.2703, 40.4158],
  tabuk: [28.3838, 36.5550],
  abha: [18.2164, 42.5053],
  khobar: [26.2172, 50.1971],
  yanbu: [24.0232, 38.0022],
};

export const resolveAreaCoords = (areaName?: string | null): [number, number] | null => {
  if (!areaName) return null;
  const key = areaName.toLowerCase().trim();
  if (AREA_COORDS[key]) return AREA_COORDS[key];
  for (const [name, coords] of Object.entries(AREA_COORDS)) {
    if (key.includes(name) || name.includes(key)) return coords;
  }
  return null;
};
