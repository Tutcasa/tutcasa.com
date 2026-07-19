/** Public interface of the bookings module (server-only). */
export type {
  Booking,
  BookingRequest,
  BookingStatus,
  ReserveError,
  ReserveResult,
  UnavailableRange,
} from "./types";
export { createBookingHold, getBooking, getUnavailableRanges } from "./service";
