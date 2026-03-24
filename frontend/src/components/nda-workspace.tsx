"use client";

import { useDeferredValue, useState, useTransition } from "react";
import {
  DEFAULT_NDA_FORM,
  type NdaFormValues,
  buildDownloadFileName,
  renderNdaDocument,
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

export function NdaWorkspace() {
  const [values, setValues] = useState(DEFAULT_NDA_FORM);
  const [isPending, startTransition] = useTransition();
  const deferredValues = useDeferredValue(values);
  const documentText = renderNdaDocument(deferredValues);

  function updateValue(name: keyof NdaFormValues, value: string) {
    startTransition(() => {
      setValues((current) => ({ ...current, [name]: value }));
    });
  }

  function downloadDocument() {
    const blob = new Blob([documentText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildDownloadFileName(values);
    anchor.click();
    URL.revokeObjectURL(url);
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
              Fill in the agreement details, review the live draft, then download a completed
              markdown document locally.
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

          <div className="mt-8 flex items-center justify-between gap-4 rounded-[1.5rem] bg-stone-950 px-5 py-4 text-stone-50">
            <div>
              <p className="text-sm font-medium">Download completed draft</p>
              <p className="text-xs text-stone-300">
                {isPending ? "Refreshing preview..." : "Preview is up to date."}
              </p>
            </div>
            <button
              className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300"
              onClick={downloadDocument}
              type="button"
            >
              Download .md
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-stone-200/70 bg-stone-950 shadow-[0_24px_80px_rgba(28,25,23,0.28)]">
          <div className="flex items-center justify-between border-b border-stone-800 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
                Live draft
              </p>
              <h2 className="mt-2 text-xl font-semibold text-stone-50">
                Mutual Non-Disclosure Agreement
              </h2>
            </div>
            <div className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-300">
              Markdown export
            </div>
          </div>
          <div className="max-h-[calc(100vh-5rem)] overflow-y-auto">
            <pre className="whitespace-pre-wrap px-6 py-8 font-[family-name:var(--font-document)] text-[15px] leading-7 text-stone-200">
              {documentText}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
