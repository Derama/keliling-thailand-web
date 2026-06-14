// Types for the itinerary builder (in-memory, branded print output).

export interface ItineraryActivity {
  id: string;
  time: string;
  text: string;
}

export interface ItineraryDay {
  id: string;
  title: string;
  date: string;
  activities: ItineraryActivity[];
}
