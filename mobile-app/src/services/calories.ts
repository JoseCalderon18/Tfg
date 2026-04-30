// Servicio para estimar calorías quemadas y generar sugerencias de alimentos

export type FoodSuggestion = {
  name: string;
  kcal: number;
  portion?: string;
};

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function computeRouteDistanceKm(points: Array<{ latitude: number; longitude: number }>) {
  if (!points || points.length < 2) return 0;
  let dist = 0;
  for (let i = 1; i < points.length; i++) {
    dist += haversineDistance(points[i - 1].latitude, points[i - 1].longitude, points[i].latitude, points[i].longitude);
  }
  return dist;
}

export function estimateCalories(opts: { distanceKm?: number; durationHours?: number; weightKg?: number }) {
  const weight = opts.weightKg ?? 75; // default 75kg
  const distanceKm = opts.distanceKm ?? 0;
  const duration = opts.durationHours ?? 0;

  // If we have both distance and duration, estimate speed and MET
  let met = 3.5; // default light activity
  if (duration > 0) {
    const speed = distanceKm / duration; // km/h
    if (speed < 4.8) met = 2.8; // slow walk
    else if (speed < 5.6) met = 3.5; // normal walk
    else if (speed < 6.8) met = 4.5; // brisk walk
    else if (speed < 9) met = 7; // jogging
    else met = 10; // running/cycling vigorous
  } else if (distanceKm > 0) {
    // fallback: use distance to estimate duration at 5 km/h
    const estDuration = distanceKm / 5;
    const speed = distanceKm / estDuration; // 5
    met = 3.5;
  }

  const calories = met * weight * duration;

  // If duration missing, attempt simple distance-based estimate (kcal per km)
  if (duration === 0 && distanceKm > 0) {
    // approximate kcal per km for walking/jogging based on weight
    const kcalPerKm = 1 * (weight / 70); // 1 kcal/kg/km approx
    return Math.round(kcalPerKm * distanceKm);
  }

  return Math.round(calories);
}

const FOODS: FoodSuggestion[] = [
  { name: 'Plátano', kcal: 105, portion: '1 unidad' },
  { name: 'Barra energética', kcal: 250, portion: '1 barra' },
  { name: 'Bocadillo pequeño de pollo', kcal: 350, portion: '1 unidad' },
  { name: 'Yogur + fruta', kcal: 150, portion: '1 ración' },
  { name: 'Ensalada con quinoa', kcal: 400, portion: '1 plato' },
  { name: 'Tostada con aguacate', kcal: 200, portion: '2 tostadas' },
  { name: 'Plato de arroz', kcal: 300, portion: '1 ración' },
  { name: 'Manzana', kcal: 95, portion: '1 unidad' },
  { name: 'Batido proteico', kcal: 220, portion: '1 vaso' },
  { name: 'Sándwich completo', kcal: 450, portion: '1 unidad' },
];

export function suggestFoodsForCalories(kcalNeeded: number) {
  if (!kcalNeeded || kcalNeeded <= 0) return [];

  // Greedy: sort by kcal descending and pick until reach target (but prefer smaller items first to give variety)
  const sorted = FOODS.slice().sort((a, b) => a.kcal - b.kcal);
  const suggestion: FoodSuggestion[] = [];
  let sum = 0;

  for (const food of sorted) {
    if (sum >= kcalNeeded) break;
    suggestion.push(food);
    sum += food.kcal;
  }

  // If still below target, add largest item repeatedly
  const largest = FOODS.slice().sort((a, b) => b.kcal - a.kcal)[0];
  while (sum < kcalNeeded && largest) {
    suggestion.push(largest);
    sum += largest.kcal;
    if (suggestion.length > 10) break; // safety
  }

  return suggestion;
}
