import type { ReactNode } from "react";

export type FormFieldProps = {
  label: string;
  htmlFor: string;
  children: ReactNode;
  helperText?: string;
  invalidText?: string;
  required?: boolean;
  className?: string;
};

/**
 * Shared field framing for Carbon form controls.
 * The associated native label uses Carbon's public label class; input
 * behavior, keyboard handling and focus remain owned by Carbon controls.
 */
export function FormField({
  label,
  htmlFor,
  children,
  helperText,
  invalidText,
  required = false,
  className = "",
}: FormFieldProps) {
  return (
    <div className={["kosmo-form-field", invalidText ? "is-invalid" : "", className].filter(Boolean).join(" ")}>
      <label className="cds--label" htmlFor={htmlFor}>
        {label}
        {required && <span className="kosmo-form-field__required" aria-hidden="true"> *</span>}
      </label>
      <div className="kosmo-form-field__control">{children}</div>
      {invalidText ? (
        <div className="kosmo-form-field__message kosmo-form-field__message--error" role="alert">
          {invalidText}
        </div>
      ) : helperText ? (
        <div className="kosmo-form-field__message">{helperText}</div>
      ) : null}
    </div>
  );
}
