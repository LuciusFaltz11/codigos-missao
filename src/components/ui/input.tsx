import { cn } from "@/lib/utils";

export function InputShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("input-shell", className)}>{children}</span>;
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <InputShell>
      <input className={cn("input-shell-field", className)} {...props} />
    </InputShell>
  );
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <InputShell>
      <select className={cn("input-shell-field", className)} {...props} />
    </InputShell>
  );
}

export function TextArea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <InputShell className="items-start">
      <textarea className={cn("input-shell-field", className)} {...props} />
    </InputShell>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
      {hint ? <span className="font-normal text-muted">{hint}</span> : null}
    </label>
  );
}
