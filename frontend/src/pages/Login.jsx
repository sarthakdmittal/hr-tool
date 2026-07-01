import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Building2, Lock, Mail, Eye, EyeOff, User, Send, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import api from '../api/client';
import { setAuth } from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const loginForm = useForm({ defaultValues: { email: '', password: '' } });
  const requestForm = useForm({ defaultValues: { name: '', email: '', password: '' } });

  const loginMutation = useMutation({
    mutationFn: (data) => api.post('/auth/login', data),
    onSuccess: (res) => {
      setAuth(res.data.token, res.data.user);
      toast.success('Welcome back!');
      navigate('/');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Invalid email or password');
    },
  });

  const requestMutation = useMutation({
    mutationFn: (data) => api.post('/account-requests', data),
    onSuccess: () => setRequestSent(true),
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to submit request');
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl shadow-lg mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">HR Management</h1>
          <p className="mt-1 text-sm text-gray-500">Attendance · Payroll · Salary Slips</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-8 py-8">
          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                tab === 'login' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('request'); setRequestSent(false); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                tab === 'request' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Request Access
            </button>
          </div>

          {/* Sign In */}
          {tab === 'login' && (
            <form onSubmit={loginForm.handleSubmit((d) => loginMutation.mutate(d))} noValidate className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition ${
                      loginForm.formState.errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                    {...loginForm.register('email', {
                      required: 'Email is required',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                    })}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="mt-1.5 text-xs text-red-600">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition ${
                      loginForm.formState.errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                    {...loginForm.register('password', { required: 'Password is required' })}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="mt-1.5 text-xs text-red-600">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition mt-2"
              >
                {loginMutation.isPending ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Signing in…</>
                ) : 'Sign In'}
              </button>

              <p className="text-center text-xs text-gray-400 mt-2">
                New employee?{' '}
                <button type="button" onClick={() => { setTab('request'); setRequestSent(false); }} className="text-primary-600 hover:underline font-medium">
                  Request account access
                </button>
              </p>
            </form>
          )}

          {/* Request Access */}
          {tab === 'request' && (
            requestSent ? (
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full">
                  <CheckCircle className="h-7 w-7 text-green-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Request Submitted!</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Your request has been sent to HR. You can sign in once it's approved.
                  </p>
                </div>
                <button
                  onClick={() => { setRequestSent(false); requestForm.reset(); setTab('login'); }}
                  className="text-sm text-primary-600 hover:underline font-medium"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={requestForm.handleSubmit((d) => requestMutation.mutate(d))} noValidate className="space-y-4">
                <p className="text-sm text-gray-500 -mt-1 mb-3">
                  Enter your details. HR will review and approve your account.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Full name"
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
                        requestForm.formState.errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                      {...requestForm.register('name', { required: 'Name is required' })}
                    />
                  </div>
                  {requestForm.formState.errors.name && (
                    <p className="mt-1 text-xs text-red-600">{requestForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      placeholder="your.email@company.com"
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
                        requestForm.formState.errors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                      {...requestForm.register('email', {
                        required: 'Work email is required',
                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                      })}
                    />
                  </div>
                  {requestForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-600">{requestForm.formState.errors.email.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">Must match the email HR registered you with</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Choose Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition ${
                        requestForm.formState.errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                      {...requestForm.register('password', {
                        required: 'Password is required',
                        minLength: { value: 6, message: 'Minimum 6 characters' },
                      })}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {requestForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-red-600">{requestForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={requestMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition mt-1"
                >
                  {requestMutation.isPending ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Submitting…</>
                  ) : (
                    <><Send className="h-4 w-4" /> Submit Request</>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400 mt-2">
                  Already approved?{' '}
                  <button type="button" onClick={() => setTab('login')} className="text-primary-600 hover:underline font-medium">
                    Sign in
                  </button>
                </p>
              </form>
            )
          )}
        </div>

        <p className="text-center mt-6 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} HR Management Tool
        </p>
      </div>
    </div>
  );
}
