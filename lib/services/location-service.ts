import { detectLocation } from '@/lib/utils/location-utils';

export async function detectUserLocation() {
    try {
        const location = await detectLocation();
        return location;
    } catch (error) {
        console.error("Error in detectUserLocation:", error);
        throw new Error("Failed to detect location");
    }
}
