import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import AuthLayout from '../../../shared/components/AuthLayout';
import AuthForm from '../components/AuthForm';
import FormField from '../components/FormField';
import PasswordField from '../components/PasswordField';
import { signUp, clearAuthError } from '../store/authSlice';

export default function SignupPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const onSubmit = (data) => {
    dispatch(
      signUp({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      })
    );
  };

  return (
    <AuthLayout title="Create account" subtitle="Start managing your money the smart way">
      {error && <div className="alert alert--error">{error}</div>}
      <AuthForm onSubmit={handleSubmit(onSubmit)} submitLabel="Sign up" loading={loading}>
        <FormField
          label="Full name"
          id="displayName"
          placeholder="Rahul Sharma"
          autoComplete="name"
          register={register('displayName', { required: 'Name is required' })}
          error={errors.displayName}
        />
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
          placeholder="Min 6 characters"
          autoComplete="new-password"
          register={register('password', {
            required: 'Password is required',
            minLength: { value: 6, message: 'Min 6 characters' },
          })}
          error={errors.password}
        />
        <PasswordField
          label="Confirm password"
          id="confirmPassword"
          placeholder="Repeat password"
          autoComplete="new-password"
          register={register('confirmPassword', {
            required: 'Please confirm password',
            validate: (value) => value === password || 'Passwords do not match',
          })}
          error={errors.confirmPassword}
        />
      </AuthForm>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </AuthLayout>
  );
}
