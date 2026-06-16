// Types for the itinerary builder (in-memory, branded print output).

export interface ItineraryActivity {
  id: string;
  time: string;
  text: string;
}

/** A place card (attraction) attached to a day — shown with image in print. */
export interface ItineraryPlace {
  id: string;
  name: string;
  image: string;
  desc: string;
}

export interface ItineraryDay {
  id: string;
  title: string;
  date: string;
  activities: ItineraryActivity[];
  places: ItineraryPlace[];
}
