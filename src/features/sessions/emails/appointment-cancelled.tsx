import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
  Preview,
  Section,
} from "@react-email/components";

interface AppointmentCancelledProps {
  patientName: string;
  dateTime: string;
  cancelledBy: "slp" | "caregiver";
}

export function AppointmentCancelled({
  patientName,
  dateTime,
  cancelledBy,
}: AppointmentCancelledProps) {
  const cancelledByLabel = cancelledBy === "slp" ? "therapist" : "caregiver";

  return (
    <Html>
      <Head />
      <Preview>Session cancelled for {patientName}</Preview>
      <Body
        style={{
          backgroundColor: "#F6F3EE",
          fontFamily: "Instrument Sans, Arial, sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: "480px",
            margin: "40px auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "32px",
          }}
        >
          <Heading
            style={{
              color: "#374151",
              fontSize: "24px",
              fontWeight: "700",
              margin: "0 0 16px",
              lineHeight: "1.2",
            }}
          >
            Session Cancelled
          </Heading>

          <Text
            style={{
              fontSize: "16px",
              color: "#374151",
              lineHeight: "1.6",
              margin: "0 0 24px",
            }}
          >
            {patientName}&apos;s session on {dateTime} has been cancelled by the{" "}
            {cancelledByLabel}.
          </Text>

          <Section
            style={{
              backgroundColor: "#fef2f2",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <Text
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: "0 0 4px",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Cancelled Session
            </Text>
            <Text
              style={{
                fontSize: "18px",
                color: "#111827",
                fontWeight: "600",
                margin: 0,
              }}
            >
              {dateTime}
            </Text>
          </Section>

          <Text
            style={{
              fontSize: "16px",
              color: "#374151",
              lineHeight: "1.6",
              margin: "0 0 8px",
            }}
          >
            To rebook, log in to Bridges and schedule a new session at a time
            that works for everyone.
          </Text>

          <Hr
            style={{
              borderColor: "#e5e7eb",
              margin: "32px 0 24px",
            }}
          />

          <Text
            style={{
              fontSize: "13px",
              color: "#9ca3af",
              margin: 0,
              lineHeight: "1.5",
            }}
          >
            You received this email because a session was cancelled on Bridges.
            If you have questions, reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AppointmentCancelled;
