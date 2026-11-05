import type { ReactNode } from "react";
import { FormLabel } from "@carbon/react";

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
 * Keep the actual input/select component native to Carbon so its keyboard,
 * validation and focus behavior remain owned by Carbon.
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
      <FormLabel htmlFor={htmlFor}>
        {label}
        {required && <span className="kosmo-form-field__required" aria-hidden="true"> *</span>}
      </FormLabel>
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
