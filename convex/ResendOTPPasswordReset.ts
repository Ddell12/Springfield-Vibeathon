"use node";

import Resend from "@auth/core/providers/resend";
import type { RandomReader } from "@oslojs/crypto/random";
import { generateRandomString } from "@oslojs/crypto/random";
import { Resend as ResendAPI } from "resend";

export const ResendOTPPasswordReset = Resend({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };
    const alphabet = "0123456789";
    return generateRandomString(random, alphabet, 8);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: "Vocali <noreply@vocali.health>",
      to: [email],
      subject: "Reset your Vocali password",
      text: `Your password reset code is: ${token}\n\nThis code expires in 15 minutes. If you didn't request a password reset, you can safely ignore this email.`,
    });
    if (error) {
      throw new Error(`Could not send password reset email: ${JSON.stringify(error)}`);
    }
  },
});
