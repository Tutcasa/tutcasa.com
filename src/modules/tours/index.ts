/** Public interface of the tours module (server-only service). */
export type { Tour, TourBooking, TourBookingRequest, TourReserveResult } from "./types";
export { tierTotalMXN } from "./types"; // pure helper, client-safe
// (the Amanah sync lives in ./sync — server-only, import it directly)
export { ADDONS, BYO_ACTS, XP_PRICES, addonByName, priceForActivity, type Addon } from "./addons";
export {
  createTourBooking,
  fmtMXN,
  getTourBooking,
  listTourBookings,
  listTours,
  setTourBookingStatus,
  tourBySlug,
  upsertTour,
} from "./service";
