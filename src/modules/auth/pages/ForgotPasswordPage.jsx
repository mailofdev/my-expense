import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import AuthLayout from '../../../shared/components/AuthLayout';
import AuthForm from '../components/AuthForm';
import FormField from '../components/FormField';
import { resetPassword, clearAuthError, clearResetStatus } from '../store/authSlice';

export default function ForgotPasswordPage() {
  const dispatch = useDispatch();
  const { loading, error, resetEmailSent } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: '' } });

  useEffect(() => {
    dispatch(clearAuthError());
    dispatch(clearResetStatus());
  }, [dispatch]);

  const onSubmit = (data) => {
    dispatch(resetPassword({ email: data.email }));
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We'll send a reset link to your email"
    >
      {resetEmailSent ? (
        <div className="alert alert--success">
          Reset link sent! Check your inbox and spam folder.
        </div>
      ) : (
        <>
          {error && <div className="alert alert--error">{error}</div>}
          <AuthForm
            onSubmit={handleSubmit(onSubmit)}
            submitLabel="Send reset link"
            loading={loading}
          >
            <FormField
              label="Email"
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              register={register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+$/i, message: 'Enter a valid email' },
              })}
              error={errors.email}
            />
          </AuthForm>
        </>
      )}
      <p className="auth-switch">
        <Link to="/login">← Back to login</Link>
      </p>
    </AuthLayout>
  );
}
