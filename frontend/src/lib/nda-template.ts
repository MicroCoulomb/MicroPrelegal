export type NdaFormValues = {
  confidentialityTermYears: string;
  effectiveDate: string;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  ndaTermYears: string;
  partyOneAddress: string;
  partyOneCompany: string;
  partyOneSigner: string;
  partyOneTitle: string;
  partyTwoAddress: string;
  partyTwoCompany: string;
  partyTwoSigner: string;
  partyTwoTitle: string;
  purpose: string;
};

export const DEFAULT_NDA_FORM: NdaFormValues = {
  confidentialityTermYears: "1",
  effectiveDate: new Date().toISOString().slice(0, 10),
  governingLaw: "California",
  jurisdiction: "courts located in San Francisco County, California",
  modifications: "None.",
  ndaTermYears: "1",
  partyOneAddress: "legal@northstarlabs.com",
  partyOneCompany: "Northstar Labs, Inc.",
  partyOneSigner: "Avery Stone",
  partyOneTitle: "Chief Executive Officer",
  partyTwoAddress: "contracts@harborpeak.co",
  partyTwoCompany: "Harbor Peak LLC",
  partyTwoSigner: "Jordan Lee",
  partyTwoTitle: "Managing Director",
  purpose: "Evaluating whether to enter into a strategic business relationship.",
};

function normalizeNumber(value: string, fallback: string) {
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) && numeric > 0 ? String(numeric) : fallback;
}

function formatDate(value: string) {
  if (!value) {
    return "[Effective date]";
  }

  const parsed = new Date(`${value}T00:00:00`);

  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

function sanitizeValue(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function buildDownloadFileName(values: NdaFormValues) {
  const left = sanitizeValue(values.partyOneCompany, "party-one")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const right = sanitizeValue(values.partyTwoCompany, "party-two")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${left}-${right}-mutual-nda.md`;
}

export function renderNdaDocument(values: NdaFormValues) {
  const ndaTermYears = normalizeNumber(values.ndaTermYears, "1");
  const confidentialityTermYears = normalizeNumber(values.confidentialityTermYears, "1");
  const effectiveDate = formatDate(values.effectiveDate);
  const purpose = sanitizeValue(
    values.purpose,
    "Evaluating whether to enter into a business relationship with the other party.",
  );
  const governingLaw = sanitizeValue(values.governingLaw, "California");
  const jurisdiction = sanitizeValue(
    values.jurisdiction,
    "courts located in San Francisco County, California",
  );
  const modifications = sanitizeValue(values.modifications, "None.");

  return `# Mutual Non-Disclosure Agreement

## Cover Page

This Mutual Non-Disclosure Agreement (the "MNDA") consists of this Cover Page and the Common Paper Mutual NDA Standard Terms Version 1.0.

### Purpose
${purpose}

### Effective Date
${effectiveDate}

### MNDA Term
- Expires ${ndaTermYears} year(s) from Effective Date.

### Term of Confidentiality
- ${confidentialityTermYears} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.

### Governing Law & Jurisdiction
Governing Law: ${governingLaw}
Jurisdiction: ${jurisdiction}

### MNDA Modifications
${modifications}

### Parties
| Field | Party 1 | Party 2 |
| --- | --- | --- |
| Print Name | ${sanitizeValue(values.partyOneSigner, "[Signer name]")} | ${sanitizeValue(values.partyTwoSigner, "[Signer name]")} |
| Title | ${sanitizeValue(values.partyOneTitle, "[Title]")} | ${sanitizeValue(values.partyTwoTitle, "[Title]")} |
| Company | ${sanitizeValue(values.partyOneCompany, "[Company]")} | ${sanitizeValue(values.partyTwoCompany, "[Company]")} |
| Notice Address | ${sanitizeValue(values.partyOneAddress, "[Notice address]")} | ${sanitizeValue(values.partyTwoAddress, "[Notice address]")} |
| Signature | ____________________ | ____________________ |
| Date | ____________________ | ____________________ |

## Standard Terms

1. Introduction. This Mutual Non-Disclosure Agreement allows each party ("Disclosing Party") to disclose or make available information in connection with the Purpose to the other party ("Receiving Party") as confidential information. Each party's Confidential Information also includes the existence and status of the parties' discussions and the information on this Cover Page.

2. Use and Protection of Confidential Information. The Receiving Party shall use Confidential Information solely for the Purpose, shall not disclose it to third parties without prior written approval except to representatives with a need to know for the Purpose, and shall protect it using at least reasonable care.

3. Exceptions. The Receiving Party's obligations do not apply to information that becomes public through no fault of the Receiving Party, was already known without restriction, is lawfully obtained from a third party without restriction, or is independently developed without use of the Confidential Information.

4. Disclosures Required by Law. The Receiving Party may disclose Confidential Information to the extent required by law, regulation, subpoena, or court order, provided that, where legally permitted, it gives reasonable advance notice and cooperates with efforts to obtain confidential treatment.

5. Term and Termination. This MNDA commences on the Effective Date and expires at the end of the MNDA Term. Either party may terminate upon written notice. The Receiving Party's obligations relating to Confidential Information survive for the Term of Confidentiality.

6. Return or Destruction of Confidential Information. Upon expiration, termination, or earlier request, the Receiving Party will cease use of Confidential Information and either destroy or return it, subject to standard backups and legal retention requirements.

7. Proprietary Rights. The Disclosing Party retains all intellectual property and other rights in its Confidential Information, and disclosure grants no license under those rights.

8. Disclaimer. All Confidential Information is provided "as is," without warranties, including implied warranties of title, merchantability, and fitness for a particular purpose.

9. Governing Law and Jurisdiction. This MNDA and related matters are governed by the laws of the State of ${governingLaw}. Any legal proceeding relating to this MNDA must be instituted in ${jurisdiction}, and each party submits to that exclusive jurisdiction.

10. Equitable Relief. A breach of this MNDA may cause irreparable harm for which monetary damages are an insufficient remedy, and the Disclosing Party may seek appropriate equitable relief in addition to other remedies.

11. General. Neither party is obligated to disclose Confidential Information or proceed with any proposed transaction. Assignment is restricted except in connection with a merger, reorganization, acquisition, or transfer of substantially all assets or voting securities. This MNDA, including the Cover Page, is the entire agreement with respect to its subject matter and may only be amended in writing signed by both parties.

Source basis: Common Paper Mutual Non-Disclosure Agreement Version 1.0 cover page and standard terms, adapted into a fillable markdown export for prototype use.`;
}
