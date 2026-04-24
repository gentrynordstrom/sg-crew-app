/**
 * Reusable labeled form field with consistent styling.
 */

interface BaseProps {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
}

interface TextFieldProps extends BaseProps {
  type?: "text" | "date" | "time" | "number" | "tel";
  defaultValue?: string;
  placeholder?: string;
}

interface SelectFieldProps extends BaseProps {
  options: readonly string[] | string[];
  defaultValue?: string;
}

interface TextareaFieldProps extends BaseProps {
  rows?: number;
  defaultValue?: string;
  placeholder?: string;
}

const inputClass =
  "w-full appearance-none rounded-xl bg-brand-moss-800/60 px-4 py-3 text-brand-cream-100 placeholder-brand-cream-600 ring-1 ring-brand-cream-900/40 focus:outline-none focus:ring-2 focus:ring-brand-brass-400 min-h-[48px]";

const labelClass = "mb-1.5 block text-sm font-medium text-brand-cream-300";

export function TextField({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  hint,
}: TextFieldProps) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
        {required && <span className="ml-1 text-brand-brass-400">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className={inputClass}
      />
      {hint && <p className="mt-1 text-xs text-brand-cream-500">{hint}</p>}
    </div>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  required,
  hint,
}: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
        {required && <span className="ml-1 text-brand-brass-400">*</span>}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className={`${inputClass} appearance-none`}
      >
        {!defaultValue && (
          <option value="" disabled>
            Select…
          </option>
        )}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-brand-cream-500">{hint}</p>}
    </div>
  );
}

export function TextareaField({
  label,
  name,
  rows = 3,
  defaultValue,
  placeholder,
  required,
  hint,
}: TextareaFieldProps) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
        {required && <span className="ml-1 text-brand-brass-400">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className={`${inputClass} resize-none`}
      />
      {hint && <p className="mt-1 text-xs text-brand-cream-500">{hint}</p>}
    </div>
  );
}
