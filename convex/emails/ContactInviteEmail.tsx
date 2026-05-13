import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type ContactInviteEmailProps = {
  inviterName: string;
  inviterEmail: string;
  recipientEmail: string;
  message?: string;
  acceptUrl: string;
};

export const ContactInviteEmail = ({
  inviterName,
  inviterEmail,
  recipientEmail,
  message,
  acceptUrl,
}: ContactInviteEmailProps) => {
  const preview = `${inviterName} invited you to join Crew Circle`;
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>You have been invited to join Crew Circle</Heading>

          <Text style={paragraph}>Hi,</Text>
          <Text style={paragraph}>
            <strong>{inviterName}</strong> ({inviterEmail}) has invited you to connect on Crew
            Circle — a network for film and TV crew.
          </Text>

          {message ? (
            <Section style={messageBox}>
              <Text style={messageLabel}>Personal message</Text>
              <Text style={messageBody}>“{message}”</Text>
            </Section>
          ) : null}

          <Section style={ctaSection}>
            <Button href={acceptUrl} style={ctaButton}>
              Accept invite
            </Button>
          </Section>

          <Text style={paragraph}>
            Or copy this link into your browser:
            <br />
            <Link href={acceptUrl} style={link}>
              {acceptUrl}
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            This invite was sent to {recipientEmail}. If you weren’t expecting it, you can ignore
            this email and no account will be created.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

ContactInviteEmail.PreviewProps = {
  inviterName: "Jane Doe",
  inviterEmail: "jane@example.com",
  recipientEmail: "you@example.com",
  message: "Would love to have you in my crew circle!",
  acceptUrl: "https://crewcircle.app/invite/abc123",
} satisfies ContactInviteEmailProps;

export default ContactInviteEmail;

const body = {
  backgroundColor: "#f5f5f4",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif",
  margin: 0,
  padding: 0,
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #e7e5e4",
  borderRadius: "12px",
  margin: "32px auto",
  maxWidth: "560px",
  padding: "32px",
};

const heading = {
  color: "#1c1917",
  fontSize: "22px",
  fontWeight: 600,
  lineHeight: "1.3",
  margin: "0 0 16px",
};

const paragraph = {
  color: "#292524",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const messageBox = {
  backgroundColor: "#fafaf9",
  border: "1px solid #e7e5e4",
  borderRadius: "8px",
  margin: "0 0 24px",
  padding: "16px",
};

const messageLabel = {
  color: "#78716c",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.06em",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
};

const messageBody = {
  color: "#1c1917",
  fontSize: "15px",
  fontStyle: "italic" as const,
  lineHeight: "1.5",
  margin: 0,
};

const ctaSection = {
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const ctaButton = {
  backgroundColor: "#1c1917",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 600,
  padding: "12px 24px",
  textDecoration: "none",
};

const link = {
  color: "#1c1917",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
};

const hr = {
  borderColor: "#e7e5e4",
  margin: "24px 0",
};

const footer = {
  color: "#78716c",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: 0,
};
