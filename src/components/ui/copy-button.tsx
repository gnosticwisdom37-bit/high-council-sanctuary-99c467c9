/**
 * CopyButton — tiny icon button that copies text to the clipboard and
 * shows a 1-second "Copied" pulse. Pure presentational, no state machine.
 */
import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({
  text,
  className,
  title = "Copy",
  size = 12,
}: {
  text: string;
  className?: string;
  title?: string;
  size?: number;
}) {
  const [copied, setCopied] = useState(false);

  const onClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {
      // ignore — older browsers / insecure context
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={onClick}
      title={copied ? "Copied" : title}
      aria-label={copied ? "Copied" : title}
      className={`inline-flex items-center justify-center rounded-md p-1 opacity-50 transition hover:opacity-100 ${className ?? ""}`}
    >
      {copied ? (
        <Check style={{ width: size, height: size }} />
      ) : (
        <Copy style={{ width: size, height: size }} />
      )}
    </button>
  );
}
