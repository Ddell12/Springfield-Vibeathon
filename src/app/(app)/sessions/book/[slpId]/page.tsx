import { CaregiverBookingPage } from "@/features/sessions/components/caregiver-booking-page";

export default function BookingRoute({ params }: { params: Promise<{ slpId: string }> }) {
  return <CaregiverBookingPage paramsPromise={params} />;
}
