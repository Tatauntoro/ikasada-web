import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { ChipBerubah, KELAS_FIELD_BERUBAH } from "./ChipBerubah";

export type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
  /** Nilainya berbeda dari versi terverifikasi (mode tinjau) — tampilkan chip. */
  berubah?: boolean;
};

export function FormField({
  label,
  htmlFor,
  error,
  children,
  hint,
  required,
  berubah = false,
}: FormFieldProps) {
  const messageId = useId();
  const hasMessage = Boolean(error || hint);

  let control = children;
  if (isValidElement(children) && typeof children.type === "string") {
    const props: Record<string, unknown> = {};
    if (hasMessage) props["aria-describedby"] = messageId;
    if (error) props["aria-invalid"] = true;
    control = cloneElement(
      children as ReactElement<Record<string, unknown>>,
      props
    );
  }

  return (
    <div
      className={`space-y-1.5 ${berubah ? KELAS_FIELD_BERUBAH : ""}`}
    >
      <label
        htmlFor={htmlFor}
        className={`flex items-center gap-2 text-sm font-semibold ${
          berubah ? "text-red-700" : "text-[#0f1012]"
        }`}
      >
        <span>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
        {berubah && <ChipBerubah />}
      </label>
      {control}
      {hint && !error && (
        <p
          id={messageId}
          className="text-xs text-[#8f8f8f]"
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={messageId}
          className="text-xs text-red-600 font-medium"
        >
          {error}
        </p>
      )}
    </div>
  );
}
