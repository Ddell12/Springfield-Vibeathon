import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Preview,
  Section,
} from "@react-email/components";

interface AppointmentBookedProps {
  patientName: string;
  dateTime: string;
  joinLink: string;
  recipientRole: "slp" | "caregiver";
}

export function AppointmentBooked({
  patientName,
  dateTime,
  joinLink,
  recipientRole,
}: AppointmentBookedProps) {
  const message =
    recipientRole === "slp"
      ? `You have a new session booked with ${patientName}.`
      : "Your session has been scheduled.";

  return (
    <Html>
      <Head />
      <Preview>Session booked for {patientName}</Preview>
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
              color: "#00595c",
              fontSize: "24px",
              fontWeight: "700",
              margin: "0 0 16px",
              lineHeight: "1.2",
            }}
          >
            Session Booked
          </Heading>

          <Text
            style={{
              fontSize: "16px",
              color: "#374151",
              lineHeight: "1.6",
              margin: "0 0 24px",
            }}
          >
            {message}
          </Text>

          <Section
            style={{
              backgroundColor: "#F6F3EE",
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
              Date &amp; Time
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

          <Button
            href={joinLink}
            style={{
              backgroundColor: "#00595c",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              display: "inline-block",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            View Session
          </Button>

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
            You received this email because a session was scheduled on Bridges.
            If you have questions, reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AppointmentBooked;
