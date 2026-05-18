/**
 * Universal Drop Zone — Phase 8.1.
 *
 * Drop any file. The server routes by extension:
 *   .csv  → blog-archive curated JSON
 *   .pdf  → legal-document curated JSON
 *   else  → queued in the intake drawer as "Unrecognized File: …"
 */
import { useCallback, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  FileQuestion,
  Loader2,
  Upload,
} from "lucide-react";
import { processDroppedFile } from "@/server/dropzone.functions";

type Outcome =
  | { kind: "blog-archive" | "legal-document"; summary: string }
  | { kind: "unrecognized"; summary: string }
  | { kind: "error"; summary: string };

type Props = {
  workshopId: string;
  onProcessed?: () => void;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function DropZone({ workshopId, onProcessed }: Props) {
  const processFn = useServerFn(processDroppedFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Array<{ name: string; outcome: Outcome }>>([]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setBusy(true);
      for (const file of list) {
        setActiveName(file.name);
        try {
          const content_base64 = await fileToBase64(file);
          const res = await processFn({
            data: { workshop_id: workshopId, filename: file.name, content_base64 },
          });
          if (res.ok) {
            setOutcomes((prev) => [
              { name: file.name, outcome: { kind: res.kind, summary: res.summary } },
              ...prev,
            ]);
          } else {
            setOutcomes((prev) => [
              { name: file.name, outcome: { kind: "error", summary: res.error } },
              ...prev,
            ]);
          }
        } catch (e) {
          setOutcomes((prev) => [
            {
              name: file.name,
              outcome: {
                kind: "error",
                summary: e instanceof Error ? e.message : String(e),
              },
            },
            ...prev,
          ]);
        }
      }
      setActiveName(null);
      setBusy(false);
      onProcessed?.();
    },
    [processFn, workshopId, onProcessed],
  );

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer?.files?.length) void handleFiles(e.dataTransfer.files);
        }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors"
        style={{
          borderColor: dragOver
            ? "var(--dawn-gold-bright)"
            : "color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
          background: dragOver
            ? "color-mix(in oklab, var(--dawn-gold-bright) 12%, transparent)"
            : "color-mix(in oklab, var(--dawn-ink) 30%, transparent)",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {busy ? (
          <>
            <Loader2
              className="h-7 w-7 animate-spin"
              style={{ color: "var(--dawn-gold-bright)" }}
            />
            <p
              className="mt-2 text-xs uppercase tracking-[0.3em]"
              style={{ color: "var(--dawn-parchment)" }}
            >
              Reading {activeName ?? "…"}
            </p>
          </>
        ) : (
          <>
            <Upload
              className="h-7 w-7"
              style={{ color: "var(--dawn-gold-bright)" }}
            />
            <p
              className="mt-2 text-xs uppercase tracking-[0.3em]"
              style={{ color: "var(--dawn-parchment)" }}
            >
              Drop any file · or click to choose
            </p>
            <p
              className="mt-1 text-[10px] italic"
              style={{
                color: "color-mix(in oklab, var(--dawn-parchment) 65%, transparent)",
              }}
            >
              .csv → Blog Archive · .pdf → Legal Document · other → Queue for review
            </p>
          </>
        )}
      </label>

      {outcomes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {outcomes.slice(0, 5).map((o, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs"
              style={{
                background:
                  o.outcome.kind === "error"
                    ? "color-mix(in oklab, var(--dawn-ember) 14%, transparent)"
                    : o.outcome.kind === "unrecognized"
                      ? "color-mix(in oklab, var(--dawn-gold) 12%, transparent)"
                      : "color-mix(in oklab, var(--dawn-gold-bright) 14%, transparent)",
                color: "var(--dawn-parchment)",
              }}
            >
              {o.outcome.kind === "error" ? (
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  style={{ color: "var(--dawn-ember)" }}
                />
              ) : o.outcome.kind === "unrecognized" ? (
                <FileQuestion
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  style={{ color: "var(--dawn-gold-bright)" }}
                />
              ) : (
                <CheckCircle2
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  style={{ color: "var(--dawn-gold-bright)" }}
                />
              )}
              <span>
                <strong>{o.name}</strong> — {o.outcome.summary}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
