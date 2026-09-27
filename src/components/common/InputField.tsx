import React, { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  icon,
  error,
  helperText,
  type = "text",
  id,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === "password";
  const inputType = isPasswordType
    ? showPassword
      ? "text"
      : "password"
    : type;
  const generatedId = useId();
  const inputId = id || generatedId;
  const descriptionId = `${inputId}-description`;

  return (
    <div className="scms-field-group">
      <div className="scms-field-header">
        <label htmlFor={inputId} className="scms-field-label">
          {label}
        </label>
        {props.required && <span className="scms-field-required">*</span>}
      </div>

      <div className={`scms-input-container ${error ? "has-error" : ""}`}>
        {icon && <span className="scms-input-icon">{icon}</span>}

        <input
          id={inputId}
          type={inputType}
          className={`scms-input ${icon ? "with-icon" : ""} ${isPasswordType ? "with-toggle" : ""}`}
          aria-invalid={!!error}
          aria-describedby={error || helperText ? descriptionId : undefined}
          {...props}
        />

        {isPasswordType && (
          <button
            type="button"
            className="scms-pwd-toggle"
            onClick={() => setShowPassword(!showPassword)}
            disabled={props.disabled}
            aria-pressed={showPassword}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error ? (
        <p id={descriptionId} className="scms-field-error" role="alert">
          <span className="scms-error-dot">●</span> {error}
        </p>
      ) : helperText ? (
        <p id={descriptionId} className="scms-field-helper">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
