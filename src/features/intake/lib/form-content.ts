export interface PracticeInfo {
  practiceName: string;
  practiceAddress: string;
  practicePhone: string;
  slpName: string;
  credentials: string;
}

export interface FormSection {
  heading: string;
  body: string;
}

export interface FormTemplate {
  title: string;
  sections: FormSection[];
  disclaimer: string;
}

const DEFAULT_DISCLAIMER =
  "This is a template document. Consult your legal counsel to ensure compliance with your state's specific requirements.";

export type IntakeFormType =
  | "hipaa-npp"
  | "consent-treatment"
  | "financial-agreement"
  | "cancellation-policy"
  | "release-authorization"
  | "telehealth-consent";

export const REQUIRED_INTAKE_FORMS: IntakeFormType[] = [
  "hipaa-npp",
  "consent-treatment",
  "financial-agreement",
  "cancellation-policy",
];

export function getFormTemplate(
  formType: IntakeFormType,
  practice: PracticeInfo,
  patientName: string,
  thirdPartyName?: string,
): FormTemplate {
  switch (formType) {
    case "hipaa-npp":
      return getHipaaNpp(practice);
    case "consent-treatment":
      return getConsentTreatment(practice, patientName);
    case "financial-agreement":
      return getFinancialAgreement(practice);
    case "cancellation-policy":
      return getCancellationPolicy(practice);
    case "release-authorization":
      return getReleaseAuthorization(practice, patientName, thirdPartyName ?? "[Third Party]");
    case "telehealth-consent":
      return getTelehealthConsent(practice, patientName);
  }
}

export const FORM_LABELS: Record<IntakeFormType, string> = {
  "hipaa-npp": "HIPAA Notice of Privacy Practices",
  "consent-treatment": "Consent for Evaluation and Treatment",
  "financial-agreement": "Financial Agreement",
  "cancellation-policy": "Cancellation Policy",
  "release-authorization": "Release of Information Authorization",
  "telehealth-consent": "Telehealth Informed Consent",
};

function getHipaaNpp(practice: PracticeInfo): FormTemplate {
  return {
    title: "Notice of Privacy Practices (HIPAA)",
    sections: [
      {
        heading: "Your Information. Your Rights. Our Responsibilities.",
        body: `${practice.practiceName} is committed to protecting your health information. This notice describes how medical information about you or your child may be used and disclosed, and how you can access this information.`,
      },
      {
        heading: "How We Use and Disclose Your Information",
        body: "We may use and disclose your protected health information (PHI) for the following purposes: Treatment — to provide and coordinate speech-language pathology services. Payment — to bill and collect payment for services provided. Healthcare Operations — to improve quality of care, train staff, and conduct business planning. We will not use or disclose your PHI for any other purpose without your written authorization.",
      },
      {
        heading: "Your Rights",
        body: "You have the right to: (1) Request a copy of your health records. (2) Request corrections to your health information. (3) Request restrictions on certain uses and disclosures. (4) Request confidential communications. (5) Receive a list of disclosures we have made. (6) File a complaint if you believe your privacy rights have been violated. Complaints may be filed with us or with the U.S. Department of Health and Human Services.",
      },
      {
        heading: "Our Responsibilities",
        body: "We are required by law to: maintain the privacy of your PHI, provide you with this notice of our legal duties and privacy practices, and notify you following a breach of unsecured PHI. We will not use or share your information other than as described here unless you tell us we can in writing.",
      },
      {
        heading: "Contact Information",
        body: `Privacy Officer: ${practice.slpName}, ${practice.credentials}\n${practice.practiceName}\n${practice.practiceAddress}\n${practice.practicePhone}`,
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

function getConsentTreatment(practice: PracticeInfo, patientName: string): FormTemplate {
  return {
    title: "Consent for Evaluation and Treatment",
    sections: [
      {
        heading: "Authorization",
        body: `I authorize ${practice.slpName}, ${practice.credentials}, of ${practice.practiceName} to evaluate and provide speech-language pathology services to ${patientName}.`,
      },
      {
        heading: "Scope of Services",
        body: "Services may include, but are not limited to: speech-language evaluation, articulation therapy, language therapy, fluency intervention, voice therapy, augmentative and alternative communication (AAC) assessment and training, feeding/swallowing therapy, and cognitive-communication therapy.",
      },
      {
        heading: "Risks and Benefits",
        body: "Benefits may include improved communication skills. Risks are minimal but may include temporary frustration during challenging tasks. The clinician will use evidence-based practices and adjust treatment as needed.",
      },
      {
        heading: "Right to Withdraw",
        body: "I understand that I may withdraw consent and discontinue treatment at any time by providing written or verbal notice.",
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

function getFinancialAgreement(practice: PracticeInfo): FormTemplate {
  return {
    title: "Financial Agreement",
    sections: [
      {
        heading: "Payment Terms",
        body: `${practice.practiceName} provides speech-language pathology services. Payment is due at the time of service unless other arrangements have been made. We accept payment via credit card, debit card, HSA/FSA, and electronic transfer.`,
      },
      {
        heading: "Insurance",
        body: "If you plan to use insurance, you are responsible for verifying your coverage and benefits prior to treatment. We will provide documentation (superbills) to support your insurance claims. You are responsible for any balance not covered by your insurance, including deductibles, co-pays, and co-insurance.",
      },
      {
        heading: "No Surprises Act — Good Faith Estimate",
        body: "Under the No Surprises Act, you have the right to receive a Good Faith Estimate explaining how much your medical care will cost. You can ask your healthcare provider for a Good Faith Estimate before you schedule a service. If you receive a bill that is at least $400 more than your Good Faith Estimate, you can dispute the bill.",
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

function getCancellationPolicy(practice: PracticeInfo): FormTemplate {
  return {
    title: "Cancellation and No-Show Policy",
    sections: [
      {
        heading: "Required Notice",
        body: `${practice.practiceName} requires at least 24 hours' notice for cancellations. This allows us to offer the time slot to another family.`,
      },
      {
        heading: "Late Cancellation and No-Show",
        body: "Cancellations with less than 24 hours' notice or no-shows may be subject to a fee. Repeated late cancellations or no-shows may result in schedule changes or discharge from services.",
      },
      {
        heading: "How to Cancel",
        body: `To cancel or reschedule, please contact us at ${practice.practicePhone} or through the Vocali app messaging feature.`,
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

function getReleaseAuthorization(
  practice: PracticeInfo,
  patientName: string,
  thirdPartyName: string,
): FormTemplate {
  return {
    title: "Authorization for Release of Information",
    sections: [
      {
        heading: "Authorization",
        body: `I authorize ${practice.practiceName} to exchange information regarding ${patientName}'s speech-language pathology evaluation and treatment with: ${thirdPartyName}.`,
      },
      {
        heading: "Information to be Released",
        body: "This may include: evaluation reports, treatment plans, progress notes, and relevant clinical data pertaining to speech-language services.",
      },
      {
        heading: "Purpose",
        body: "The purpose of this release is to coordinate care and ensure continuity of services for the patient.",
      },
      {
        heading: "Expiration",
        body: "This authorization expires one (1) year from the date of signing. You may revoke this authorization at any time by providing written notice.",
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}

function getTelehealthConsent(practice: PracticeInfo, patientName: string): FormTemplate {
  return {
    title: "Telehealth Informed Consent",
    sections: [
      {
        heading: "Description of Telehealth",
        body: `Telehealth involves the delivery of speech-language pathology services by ${practice.slpName}, ${practice.credentials}, via live video conferencing technology. This includes evaluation, therapy, and consultation.`,
      },
      {
        heading: "Risks and Limitations",
        body: "Telehealth services may be limited by technology — poor internet connection, audio/video quality, or equipment failure may interrupt sessions. Some assessments and interventions may not be appropriate for telehealth delivery. In such cases, in-person sessions will be recommended.",
      },
      {
        heading: "Technology Requirements",
        body: "You will need a device with a camera, microphone, and speaker, plus a stable internet connection. Sessions will be conducted through the Vocali platform, which uses encrypted video conferencing.",
      },
      {
        heading: "Emergency Protocols",
        body: `In case of a medical or behavioral emergency during a telehealth session, please call 911. Please have your physical address available at the start of each session in case emergency services need to be dispatched. ${patientName} should not be left unattended during telehealth sessions.`,
      },
      {
        heading: "Voluntary Participation",
        body: "Participation in telehealth is voluntary. You may opt out of telehealth services at any time and request in-person sessions instead.",
      },
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  };
}
