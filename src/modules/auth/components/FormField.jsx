export default function FormField({
  label,
  id,
  type = 'text',
  error,
  register,
  placeholder,
  autoComplete,
}) {
  return (
    <div className={error ? 'space-y-1' : 'space-y-1'}>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`input ${error ? 'border-danger' : ''}`}
        {...register}
      />
      {error && <span className="text-xs text-red-300">{error.message}</span>}
    </div>
  );
}
