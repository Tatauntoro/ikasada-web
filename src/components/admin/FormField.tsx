import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

export type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
};

export function FormField({
  label,
  htmlFor,
  error,
  children,
  hint,
  required,
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
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-semibold text-[#0f1012]"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
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
