import { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import AuthLayout from '../../../shared/components/AuthLayout';
import AuthForm from '../components/AuthForm';
import FormField from '../components/FormField';
import PasswordField from '../components/PasswordField';
import { signIn, clearAuthError } from '../store/authSlice';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: '', password: '' } });

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const onSubmit = (data) => {
    dispatch(signIn(data));
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Track, manage and grow your money">
      {error && <div className="alert-error">{error}</div>}
      <AuthForm onSubmit={handleSubmit(onSubmit)} submitLabel="Login" loading={loading}>
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
        <PasswordField
          label="Password"
          id="password"
          placeholder="••••••••"
          autoComplete="current-password"
          register={register('password', {
            required: 'Password is required',
            minLength: { value: 6, message: 'Min 6 characters' },
          })}
          error={errors.password}
        />
        <div className="-mt-2 text-right">
          <Link to="/forgot-password" className="text-sm no-underline hover:underline">
            Forgot password?
          </Link>
        </div>
      </AuthForm>
      <p className="mt-5 text-center text-sm text-muted">
        New here? <Link to="/signup" className="no-underline hover:underline">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
