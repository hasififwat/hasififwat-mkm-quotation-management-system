export type CsvHotelContent = {
  hotel_type: string;
  name: string;
  meals: string[];
};

export type PackageHotelState = CsvHotelContent & {
  enabled: boolean;
  placeholder: string;
};

export function canonicalHotelType(hotelType: string): string {
  return hotelType.trim().toUpperCase();
}

export function normalizedMealsKey(meals: readonly string[]): string {
  return meals.map(meal => meal.trim().toUpperCase()).filter(Boolean).sort().join("+");
}

export function hotelsEqual(left: readonly PackageHotelState[], right: readonly PackageHotelState[]): boolean {
  if (left.length !== right.length) return false;
  const keys = (hotels: readonly PackageHotelState[]) => hotels.map(hotel => JSON.stringify([
    canonicalHotelType(hotel.hotel_type),
    hotel.name.trim(),
    hotel.enabled,
    hotel.placeholder,
    normalizedMealsKey(hotel.meals),
  ])).sort();
  const rightKeys = keys(right);
  return keys(left).every((key, index) => key === rightKeys[index]);
}

export function assertUniqueCsvHotelTypes(incoming: readonly CsvHotelContent[]): void {
  const seen = new Set<string>();
  for (const hotel of incoming) {
    const type = canonicalHotelType(hotel.hotel_type);
    if (seen.has(type)) throw new Error(`Duplicate CSV hotel type: ${type}`);
    seen.add(type);
  }
}

export function mergeCsvHotels(current: readonly PackageHotelState[], incoming: readonly CsvHotelContent[]): PackageHotelState[] {
  assertUniqueCsvHotelTypes(incoming);
  const incomingByType = new Map(incoming.map(hotel => [canonicalHotelType(hotel.hotel_type), hotel]));
  const savedCounts = new Map<string, number>();
  for (const hotel of current) {
    const type = canonicalHotelType(hotel.hotel_type);
    savedCounts.set(type, (savedCounts.get(type) ?? 0) + 1);
  }

  const hotels = current.map(saved => {
    const type = canonicalHotelType(saved.hotel_type);
    const next = incomingByType.get(type);
    if (!next) return saved;
    const nameChanged = saved.name.trim() !== next.name.trim();
    const mealsChanged = normalizedMealsKey(saved.meals) !== normalizedMealsKey(next.meals);
    if (!nameChanged && !mealsChanged) return saved;
    if ((savedCounts.get(type) ?? 0) > 1) throw new Error(`Ambiguous duplicate saved hotel type: ${type}`);
    return {
      ...saved,
      name: nameChanged ? next.name.trim() : saved.name,
      meals: mealsChanged ? next.meals.map(meal => meal.trim()).filter(Boolean) : saved.meals,
    };
  });

  for (const next of incoming) {
    if (savedCounts.has(canonicalHotelType(next.hotel_type))) continue;
    const name = next.name.trim();
    const meals = next.meals.map(meal => meal.trim()).filter(Boolean);
    if (!name && meals.length === 0) continue;
    hotels.push({ hotel_type: next.hotel_type.trim(), name, meals, enabled: name.length > 0, placeholder: "" });
  }
  return hotels;
}
