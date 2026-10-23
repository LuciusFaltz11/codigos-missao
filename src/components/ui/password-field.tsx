"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { InputShell } from "@/components/ui/input";

export function PasswordField({
  name,
  placeholder,
  autoComplete,
  minLength,
  required = true,
}: {
  name: string;
  placeholder: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Ocultar senha" : "Mostrar senha";
  return (
    <InputShell className="relative pr-1">
      <input
        className="input-shell-field pr-12"
        name={name}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
      />
      <button
        type="button"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-gold-soft hover:text-ink"
        aria-label={label}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff className="size-4" strokeWidth={1.75} aria-hidden="true" /> : <Eye className="size-4" strokeWidth={1.75} aria-hidden="true" />}
      </button>
    </InputShell>
  );
}
