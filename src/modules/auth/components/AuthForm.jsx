export default function AuthForm({
  onSubmit,
  children,
  submitLabel,
  loading,
  footer,
}) {
  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <div className="auth-form__fields">{children}</div>
      {footer}
      <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
        {loading ? 'Please wait...' : submitLabel}
      </button>
    </form>
  );
}
