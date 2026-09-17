import {
  Body,
  Container,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import type { ReactElement } from "react";

type OtpEmailProps = {
  code: string;
};

export function OtpEmail({ code }: OtpEmailProps): ReactElement {
  return (
    <Html lang="ru">
      <Preview>Ваш одноразовый код AIDIX</Preview>
      <Body
        style={{ backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" }}
      >
        <Container
          style={{
            margin: "40px auto",
            padding: "32px",
            backgroundColor: "#ffffff",
          }}
        >
          <Heading>AIDIX</Heading>
          <Text>Введите этот код, чтобы войти в аккаунт:</Text>
          <Text
            style={{
              fontSize: "32px",
              fontWeight: "700",
              letterSpacing: "8px",
            }}
          >
            {code}
          </Text>
          <Text>
            Если вы не запрашивали вход, просто проигнорируйте это письмо.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
