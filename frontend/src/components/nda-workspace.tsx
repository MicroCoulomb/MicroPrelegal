"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { jsPDF } from "jspdf";
import {
  DEFAULT_NDA_FORM,
  type NdaFormValues,
  buildPreviewDocument,
  buildDownloadFileName,
} from "@/lib/nda-template";

type FieldConfig = {
  name: keyof NdaFormValues;
  label: string;
  placeholder?: string;
  type?: "text" | "date" | "email";
};

const PARTY_FIELDS: FieldConfig[] = [
  { name: "partyOneCompany", label: "Party 1 company", placeholder: "Northstar Labs, Inc." },
  { name: "partyOneSigner", label: "Party 1 signer", placeholder: "Avery Stone" },
  { name: "partyOneTitle", label: "Party 1 title", placeholder: "Chief Executive Officer" },
  { name: "partyOneAddress", label: "Party 1 notice address", placeholder: "legal@northstarlabs.com" },
  { name: "partyTwoCompany", label: "Party 2 company", placeholder: "Harbor Peak LLC" },
  { name: "partyTwoSigner", label: "Party 2 signer", placeholder: "Jordan Lee" },
  { name: "partyTwoTitle", label: "Party 2 title", placeholder: "Managing Director" },
  { name: "partyTwoAddress", label: "Party 2 notice address", placeholder: "contracts@harborpeak.co" },
];

const AGREEMENT_FIELDS: FieldConfig[] = [
  { name: "purpose", label: "Purpose", placeholder: "Evaluating a potential strategic partnership." },
  { name: "effectiveDate", label: "Effective date", type: "date" },
  { name: "governingLaw", label: "Governing law", placeholder: "California" },
  {
    name: "jurisdiction",
    label: "Jurisdiction",
    placeholder: "courts located in San Francisco County, California",
  },
];

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  onChange: (name: keyof NdaFormValues, value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-stone-700">{field.label}</span>
      <input
        className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-600 focus:ring-4 focus:ring-amber-100"
        name={field.name}
        onChange={(event) => onChange(field.name, event.target.value)}
        placeholder={field.placeholder}
        type={field.type ?? "text"}
        value={value}
      />
    </label>
  );
}

function NdaPreviewPaper({ previewDocument }: { previewDocument: ReturnType<typeof buildPreviewDocument> }) {
  return (
    <article className="mx-auto max-w-4xl rounded-[1.75rem] border border-[#e7e5e4] bg-white px-8 py-10 text-[#1c1917] shadow-[0_28px_60px_rgba(28,25,23,0.08)] sm:px-12">
      <header className="border-b border-[#e7e5e4] pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#b45309]">
          Common Paper Prototype
        </p>
        <h2 className="mt-4 font-[family-name:var(--font-document)] text-4xl leading-tight">
          Mutual Non-Disclosure Agreement
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#57534e]">
          This Mutual Non-Disclosure Agreement (the &quot;MNDA&quot;) consists of this Cover Page and
          the Common Paper Mutual NDA Standard Terms Version 1.0.
        </p>
      </header>

      <section className="grid gap-6 border-b border-[#e7e5e4] py-8 sm:grid-cols-2">
        <div className="rounded-[1.5rem] bg-[#fafaf9] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">Purpose</p>
          <p className="mt-3 font-[family-name:var(--font-document)] text-lg leading-8">
            {previewDocument.purpose}
          </p>
        </div>
        <div className="grid gap-4">
          <div className="rounded-[1.5rem] border border-[#e7e5e4] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">
              Effective date
            </p>
            <p className="mt-2 text-lg font-medium text-[#1c1917]">{previewDocument.effectiveDate}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[#e7e5e4] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">
                MNDA term
              </p>
              <p className="mt-2 text-lg font-medium text-[#1c1917]">
                {previewDocument.ndaTermYears} year(s)
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-[#e7e5e4] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">
                Confidentiality
              </p>
              <p className="mt-2 text-lg font-medium text-[#1c1917]">
                {previewDocument.confidentialityTermYears} year(s)
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-b border-[#e7e5e4] py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">
            Governing law
          </p>
          <p className="mt-2 text-lg text-[#1c1917]">{previewDocument.governingLaw}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">
            Jurisdiction
          </p>
          <p className="mt-2 text-lg text-[#1c1917]">{previewDocument.jurisdiction}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">
            MNDA modifications
          </p>
          <p className="mt-2 text-lg leading-8 text-[#1c1917]">{previewDocument.modifications}</p>
        </div>
      </section>

      <section className="border-b border-[#e7e5e4] py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h3 className="font-[family-name:var(--font-document)] text-2xl">Parties</h3>
          <span className="text-xs uppercase tracking-[0.2em] text-[#a8a29e]">Signature block</span>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {previewDocument.parties.map((party, index) => (
            <section
              key={party.company + index}
              className="rounded-[1.5rem] border border-[#e7e5e4] bg-[#fafaf9] p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b45309]">
                Party {index + 1}
              </p>
              <h4 className="mt-3 font-[family-name:var(--font-document)] text-2xl">
                {party.company}
              </h4>
              <dl className="mt-5 space-y-4">
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-[#78716c]">Print name</dt>
                  <dd className="mt-1 text-base text-[#1c1917]">{party.signer}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-[#78716c]">Title</dt>
                  <dd className="mt-1 text-base text-[#1c1917]">{party.title}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-[#78716c]">
                    Notice address
                  </dt>
                  <dd className="mt-1 text-base leading-7 text-[#1c1917]">{party.address}</dd>
                </div>
              </dl>
              <div className="mt-8 space-y-5">
                <div>
                  <div className="h-px bg-[#d6d3d1]" />
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#78716c]">
                    Signature
                  </p>
                </div>
                <div>
                  <div className="h-px bg-[#d6d3d1]" />
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#78716c]">Date</p>
                </div>
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="py-8">
        <h3 className="font-[family-name:var(--font-document)] text-2xl">Standard Terms</h3>
        <div className="mt-6 space-y-7">
          {previewDocument.standardTerms.map((section) => (
            <section key={section.heading}>
              <h4 className="font-[family-name:var(--font-document)] text-xl text-[#0c0a09]">
                {section.heading}
              </h4>
              <div className="mt-3 space-y-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-[15px] leading-8 text-[#44403c]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </article>
  );
}

export function NdaWorkspace() {
  const [values, setValues] = useState(DEFAULT_NDA_FORM);
  const [isExporting, setIsExporting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deferredValues = useDeferredValue(values);
  const previewDocument = buildPreviewDocument(deferredValues);

  function updateValue(name: keyof NdaFormValues, value: string) {
    startTransition(() => {
      setValues((current) => ({ ...current, [name]: value }));
    });
  }

  async function downloadDocument() {
    if (isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const pdf = new jsPDF({
        format: "a4",
        orientation: "portrait",
        unit: "pt",
      });

      const palette = {
        accent: [180, 83, 9] as const,
        border: [231, 229, 228] as const,
        panel: [250, 250, 249] as const,
        text: [28, 25, 23] as const,
        muted: [120, 113, 108] as const,
        subtle: [87, 83, 78] as const,
      };
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageMargin = 36;
      const contentWidth = pageWidth - pageMargin * 2;
      const gap = 14;
      const cardRadius = 12;
      let y = pageMargin;

      const applyTextColor = (tone: keyof typeof palette) => {
        const [r, g, b] = palette[tone];
        pdf.setTextColor(r, g, b);
      };

      const applyDrawColor = (tone: keyof typeof palette) => {
        const [r, g, b] = palette[tone];
        pdf.setDrawColor(r, g, b);
      };

      const applyFillColor = (tone: keyof typeof palette) => {
        const [r, g, b] = palette[tone];
        pdf.setFillColor(r, g, b);
      };

      const ensureSpace = (requiredHeight: number) => {
        if (y + requiredHeight <= pageHeight - pageMargin) {
          return;
        }

        pdf.addPage();
        y = pageMargin;
      };

      const drawLabel = (text: string, x: number, top: number) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        applyTextColor("muted");
        pdf.text(text.toUpperCase(), x, top);
        return top + 12;
      };

      const drawWrappedText = (
        text: string,
        x: number,
        top: number,
        width: number,
        options?: { font?: "helvetica" | "times"; style?: "normal" | "bold"; size?: number; color?: keyof typeof palette; lineHeight?: number },
      ) => {
        pdf.setFont(options?.font ?? "helvetica", options?.style ?? "normal");
        pdf.setFontSize(options?.size ?? 11);
        applyTextColor(options?.color ?? "text");
        const lines = pdf.splitTextToSize(text, width);
        const lineHeight = options?.lineHeight ?? (options?.size ?? 11) * 1.5;

        for (const line of lines) {
          pdf.text(line, x, top);
          top += lineHeight;
        }

        return top;
      };

      const measureWrappedTextHeight = (
        text: string,
        width: number,
        options?: { size?: number; lineHeight?: number },
      ) => {
        const size = options?.size ?? 11;
        const lineHeight = options?.lineHeight ?? size * 1.5;
        return pdf.splitTextToSize(text, width).length * lineHeight;
      };

      const drawCard = (
        x: number,
        top: number,
        width: number,
        height: number,
        options?: { fill?: keyof typeof palette },
      ) => {
        applyDrawColor("border");
        if (options?.fill) {
          applyFillColor(options.fill);
          pdf.roundedRect(x, top, width, height, cardRadius, cardRadius, "FD");
          return;
        }
        pdf.roundedRect(x, top, width, height, cardRadius, cardRadius, "S");
      };

      const drawInfoCard = (
        x: number,
        top: number,
        width: number,
        label: string,
        value: string,
        options?: { fill?: keyof typeof palette; bodyFont?: "helvetica" | "times"; bodySize?: number; bodyLineHeight?: number },
      ) => {
        const inner = 16;
        const labelHeight = 12;
        const bodyHeight = measureWrappedTextHeight(value, width - inner * 2, {
          lineHeight: options?.bodyLineHeight,
          size: options?.bodySize,
        });
        const height = inner + labelHeight + 10 + bodyHeight + inner;
        drawCard(x, top, width, height, { fill: options?.fill });
        let cursor = top + inner + 8;
        cursor = drawLabel(label, x + inner, cursor);
        drawWrappedText(value, x + inner, cursor + 6, width - inner * 2, {
          color: "text",
          font: options?.bodyFont ?? "helvetica",
          lineHeight: options?.bodyLineHeight,
          size: options?.bodySize ?? 13,
        });
        return { height };
      };

      const drawDivider = (top: number) => {
        applyDrawColor("border");
        pdf.line(pageMargin, top, pageWidth - pageMargin, top);
      };

      ensureSpace(120);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      applyTextColor("accent");
      pdf.text("COMMON PAPER PROTOTYPE", pageMargin, y);
      y += 24;

      pdf.setFont("times", "bold");
      pdf.setFontSize(24);
      applyTextColor("text");
      pdf.text("Mutual Non-Disclosure Agreement", pageMargin, y);
      y += 24;

      y = drawWrappedText(
        'This Mutual Non-Disclosure Agreement (the "MNDA") consists of this Cover Page and the Common Paper Mutual NDA Standard Terms Version 1.0.',
        pageMargin,
        y,
        Math.min(contentWidth, 360),
        { color: "subtle", font: "helvetica", lineHeight: 18, size: 10.5 },
      );
      y += 18;
      drawDivider(y);
      y += 22;

      const leftColumnWidth = contentWidth * 0.46;
      const rightColumnWidth = contentWidth - leftColumnWidth - gap;
      const purposeCardHeight = drawInfoCard(
        pageMargin,
        y,
        leftColumnWidth,
        "Purpose",
        previewDocument.purpose,
        { bodyFont: "times", bodyLineHeight: 20, bodySize: 13, fill: "panel" },
      ).height;
      const rightColumnX = pageMargin + leftColumnWidth + gap;
      const effectiveHeight = drawInfoCard(
        rightColumnX,
        y,
        rightColumnWidth,
        "Effective date",
        previewDocument.effectiveDate,
      ).height;
      const termCardWidth = (rightColumnWidth - gap) / 2;
      const termTop = y + effectiveHeight + gap;
      const termHeight = drawInfoCard(
        rightColumnX,
        termTop,
        termCardWidth,
        "MNDA term",
        `${previewDocument.ndaTermYears} year(s)`,
      ).height;
      const confidentialityHeight = drawInfoCard(
        rightColumnX + termCardWidth + gap,
        termTop,
        termCardWidth,
        "Confidentiality",
        `${previewDocument.confidentialityTermYears} year(s)`,
      ).height;
      y += Math.max(purposeCardHeight, effectiveHeight + gap + Math.max(termHeight, confidentialityHeight)) + 22;
      drawDivider(y);
      y += 22;

      const stackedSections = [
        ["Governing law", previewDocument.governingLaw],
        ["Jurisdiction", previewDocument.jurisdiction],
        ["MNDA modifications", previewDocument.modifications],
      ] as const;

      for (const [label, value] of stackedSections) {
        const blockHeight = 18 + measureWrappedTextHeight(value, contentWidth, { size: 13, lineHeight: 20 }) + 8;
        ensureSpace(blockHeight + 6);
        y = drawLabel(label, pageMargin, y + 8);
        y = drawWrappedText(value, pageMargin, y + 4, contentWidth, {
          font: "helvetica",
          lineHeight: 20,
          size: 13,
        });
        y += 10;
      }
      drawDivider(y);
      y += 24;

      ensureSpace(40);
      pdf.setFont("times", "bold");
      pdf.setFontSize(18);
      applyTextColor("text");
      pdf.text("Parties", pageMargin, y);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      applyTextColor("muted");
      pdf.text("SIGNATURE BLOCK", pageWidth - pageMargin, y, { align: "right" });
      y += 18;

      const partyCardWidth = (contentWidth - gap) / 2;
      const partyCardPadding = 16;
      const signatureSectionHeight = 48;
      const partyHeights = previewDocument.parties.map((party) => {
        const bodyWidth = partyCardWidth - partyCardPadding * 2;
        return (
          24 +
          28 +
          18 + measureWrappedTextHeight(party.signer, bodyWidth, { size: 11, lineHeight: 16 }) +
          18 + measureWrappedTextHeight(party.title, bodyWidth, { size: 11, lineHeight: 16 }) +
          18 + measureWrappedTextHeight(party.address, bodyWidth, { size: 11, lineHeight: 16 }) +
          signatureSectionHeight +
          signatureSectionHeight +
          20
        );
      });
      ensureSpace(Math.max(...partyHeights) + 10);

      previewDocument.parties.forEach((party, index) => {
        const x = pageMargin + index * (partyCardWidth + gap);
        const height = partyHeights[index];
        drawCard(x, y, partyCardWidth, height, { fill: "panel" });

        let cursor = y + partyCardPadding + 8;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        applyTextColor("accent");
        pdf.text(`PARTY ${index + 1}`, x + partyCardPadding, cursor);
        cursor += 22;

        pdf.setFont("times", "bold");
        pdf.setFontSize(16);
        applyTextColor("text");
        const companyLines = pdf.splitTextToSize(party.company, partyCardWidth - partyCardPadding * 2);
        for (const line of companyLines) {
          pdf.text(line, x + partyCardPadding, cursor);
          cursor += 18;
        }
        cursor += 8;

        const partyDetails = [
          ["Print name", party.signer],
          ["Title", party.title],
          ["Notice address", party.address],
        ] as const;

        for (const [label, value] of partyDetails) {
          cursor = drawLabel(label, x + partyCardPadding, cursor);
          cursor = drawWrappedText(value, x + partyCardPadding, cursor + 2, partyCardWidth - partyCardPadding * 2, {
            lineHeight: 16,
            size: 11,
          });
          cursor += 8;
        }

        const lineWidth = partyCardWidth - partyCardPadding * 2;
        for (const lineLabel of ["Signature", "Date"]) {
          applyDrawColor("border");
          pdf.line(x + partyCardPadding, cursor + 10, x + partyCardPadding + lineWidth, cursor + 10);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          applyTextColor("muted");
          pdf.text(lineLabel.toUpperCase(), x + partyCardPadding, cursor + 24);
          cursor += signatureSectionHeight;
        }
      });
      y += Math.max(...partyHeights) + 20;
      drawDivider(y);
      y += 26;

      for (const [index, section] of previewDocument.standardTerms.entries()) {
        const headingHeight = 20;
        const bodyHeight = section.body.reduce(
          (total, paragraph) => total + measureWrappedTextHeight(paragraph, contentWidth, { size: 11, lineHeight: 18 }) + 10,
          0,
        );
        ensureSpace(headingHeight + bodyHeight + (index === 0 ? 30 : 0));

        if (index === 0) {
          pdf.setFont("times", "bold");
          pdf.setFontSize(18);
          applyTextColor("text");
          pdf.text("Standard Terms", pageMargin, y);
          y += 22;
        }

        pdf.setFont("times", "bold");
        pdf.setFontSize(14);
        applyTextColor("text");
        pdf.text(section.heading, pageMargin, y);
        y += 16;

        for (const paragraph of section.body) {
          y = drawWrappedText(paragraph, pageMargin, y, contentWidth, {
            color: "subtle",
            font: "helvetica",
            lineHeight: 18,
            size: 11,
          });
          y += 10;
        }
        y += 6;
      }

      ensureSpace(30);
      applyDrawColor("border");
      pdf.line(pageMargin, y, pageWidth - pageMargin, y);
      y += 16;
      y = drawWrappedText(
        "Source basis: Common Paper Mutual Non-Disclosure Agreement Version 1.0 cover page and standard terms, adapted into a fillable PDF export for prototype use.",
        pageMargin,
        y,
        contentWidth,
        { color: "muted", font: "helvetica", lineHeight: 14, size: 9.5 },
      );

      pdf.save(buildDownloadFileName(values));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.2),_transparent_32%),linear-gradient(180deg,_#fffaf0_0%,_#f5efe3_48%,_#efe6d7_100%)] px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-[2rem] border border-stone-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(120,53,15,0.12)] backdrop-blur">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-700">
              MicroPrelegal
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">
              Mutual NDA creator
            </h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Fill in the agreement details, review the live draft, then download a completed PDF
              locally.
            </p>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                Agreement details
              </h2>
              <div className="grid gap-4">
                {AGREEMENT_FIELDS.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    onChange={updateValue}
                    value={values[field.name]}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                Parties
              </h2>
              <div className="grid gap-4">
                {PARTY_FIELDS.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    onChange={updateValue}
                    value={values[field.name]}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-stone-700">MNDA term (years)</span>
                <input
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-600 focus:ring-4 focus:ring-amber-100"
                  min="1"
                  onChange={(event) => updateValue("ndaTermYears", event.target.value)}
                  type="number"
                  value={values.ndaTermYears}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-stone-700">
                  Confidentiality term (years)
                </span>
                <input
                  className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-600 focus:ring-4 focus:ring-amber-100"
                  min="1"
                  onChange={(event) => updateValue("confidentialityTermYears", event.target.value)}
                  type="number"
                  value={values.confidentialityTermYears}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-stone-700">MNDA modifications</span>
              <textarea
                className="min-h-28 rounded-[1.5rem] border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-600 focus:ring-4 focus:ring-amber-100"
                onChange={(event) => updateValue("modifications", event.target.value)}
                placeholder="Optional business-specific modifications."
                value={values.modifications}
              />
            </label>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4 rounded-[1.5rem] bg-stone-900 px-5 py-4 text-stone-50">
            <div>
              <p className="text-sm font-medium">Download completed draft</p>
              <p className="text-xs text-stone-300">
                {isExporting
                  ? "Formatting PDF..."
                  : isPending
                    ? "Refreshing preview..."
                    : "Preview is up to date."}
              </p>
            </div>
            <button
              className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300"
              onClick={downloadDocument}
              type="button"
              disabled={isExporting}
            >
              {isExporting ? "Preparing..." : "Download PDF"}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-stone-200/80 bg-[linear-gradient(180deg,_#f7f3ec_0%,_#efe6d8_100%)] shadow-[0_24px_80px_rgba(120,53,15,0.12)]">
          <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
                Live draft
              </p>
              <h2 className="mt-2 text-xl font-semibold text-stone-900">
                Mutual Non-Disclosure Agreement
              </h2>
            </div>
            <div className="rounded-full border border-stone-300 bg-white/80 px-3 py-1 text-xs text-stone-600">
              Paper preview
            </div>
          </div>
          <div className="max-h-[calc(100vh-5rem)] overflow-y-auto p-6">
            <NdaPreviewPaper previewDocument={previewDocument} />
          </div>
        </section>
      </div>
    </main>
  );
}
