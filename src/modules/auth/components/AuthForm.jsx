export default function AuthForm({
  onSubmit,
  children,
  submitLabel,
  loading,
  footer,
}) {
  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div className="space-y-4">{children}</div>
      {footer}
      <button type="submit" className="btn-primary btn-full" disabled={loading}>
        {loading ? 'Please wait...' : submitLabel}
      </button>
    </form>
  );
}
