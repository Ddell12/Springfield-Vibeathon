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

interface SessionReminderProps {
  patientName: string;
  dateTime: string;
  joinLink: string;
  reminderType: "24h" | "1h";
}

export function SessionReminder({
  patientName,
  dateTime,
  joinLink,
  reminderType,
}: SessionReminderProps) {
  const previewText =
    reminderType === "1h"
      ? "Your session starts in 1 hour"
      : "Session tomorrow";

  const headingText =
    reminderType === "1h" ? "Your Session Starts Soon" : "Session Tomorrow";

  const bodyText =
    reminderType === "1h"
      ? `Your session with ${patientName} begins in 1 hour. Make sure you're ready to join.`
      : `You have a session with ${patientName} scheduled for tomorrow. We'll send another reminder 1 hour before.`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
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
            {headingText}
          </Heading>

          <Text
            style={{
              fontSize: "16px",
              color: "#374151",
              lineHeight: "1.6",
              margin: "0 0 24px",
            }}
          >
            {bodyText}
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
            Join Session
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
            You received this reminder from Bridges. If you need to cancel or
            reschedule, please do so in the app as soon as possible.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default SessionReminder;
