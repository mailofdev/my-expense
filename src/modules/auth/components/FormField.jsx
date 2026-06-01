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
    <div className={`form-field ${error ? 'form-field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        {...register}
      />
      {error && <span className="form-field__error">{error.message}</span>}
    </div>
  );
}
