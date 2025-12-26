import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Facebook, Instagram, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { authAPI } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { Toaster } from "./ui/sonner";

type View = 'login' | 'signup' | 'verification' | 'forgot-password' | 'reset-password' | '2fa';

export function Login() {
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+92");
  const [phoneError, setPhoneError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendingOTP, setResendingOTP] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotPasswordMethod, setForgotPasswordMethod] = useState<'email' | 'phone'>('email');
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationRole, setInvitationRole] = useState<string>("");
  const [verifyingInvitation, setVerifyingInvitation] = useState(false);

  // Check for invitation token in URL and verify it
  useEffect(() => {
    const token = searchParams.get('invitation');
    console.log('Invitation token from URL:', token);
    
    if (token) {
      setInvitationToken(token);
      setView('signup'); // Show signup form immediately when token is present
      setVerifyingInvitation(true);
      setError(""); // Clear any previous errors
      
      // Verify invitation token
      authAPI.verifyInvitation(token)
        .then((response) => {
          console.log('Invitation verification response:', response);
          if (response.success && response.data) {
            setEmail(response.data.email);
            setInvitationRole(response.data.role);
            setError(""); // Clear any errors on success
          } else {
            setError(response.error || "Invalid or expired invitation");
          }
        })
        .catch((err: any) => {
          console.error('Invitation verification error:', err);
          setError(err.message || "Invalid or expired invitation");
        })
        .finally(() => {
          setVerifyingInvitation(false);
        });
    } else {
      // No invitation token, reset invitation-related state
      if (invitationToken) {
        // Only reset if we previously had a token (avoid resetting on initial mount)
        setInvitationToken(null);
        setInvitationRole("");
        setView('login');
      }
    }
  }, [searchParams]);

  // Load remembered credentials on mount
  useEffect(() => {
    // Only load remembered credentials if there's no invitation token
    if (!invitationToken) {
    const rememberedEmail = localStorage.getItem('mw_remembered_email');
    const rememberedPassword = localStorage.getItem('mw_remembered_password');
    if (rememberedEmail && rememberedPassword) {
      setEmail(rememberedEmail);
      setPassword(rememberedPassword);
      setRememberMe(true);
    }
    }
  }, [invitationToken]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Pakistani phone format: +92 followed by 10 digits
    const phoneRegex = /^\+92[0-9]{10}$/;
    return phoneRegex.test(phone);
  };

  const handlePhoneChange = (value: string) => {
    // Ensure it always starts with +92
    if (!value.startsWith("+92")) {
      value = "+92";
    }
    // Remove any non-digit characters after +92
    const prefix = "+92";
    const rest = value.slice(3).replace(/\D/g, "");
    // Limit to 10 digits after +92
    const limitedRest = rest.slice(0, 10);
    setPhone(prefix + limitedRest);
    setPhoneError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailError("");
    setPasswordError("");
    setLoading(true);

    // Custom validation
    let hasError = false;
    if (!email) {
      setEmailError("Please fill in this field");
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      hasError = true;
    }
    
    if (!password) {
      setPasswordError("Please fill in this field");
      hasError = true;
    }

    if (hasError) {
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.login(email, password);
      if (response.success && response.user && response.accessToken) {
        // Save credentials if remember me is checked
        if (rememberMe) {
          localStorage.setItem('mw_remembered_email', email);
          localStorage.setItem('mw_remembered_password', password);
        } else {
          localStorage.removeItem('mw_remembered_email');
          localStorage.removeItem('mw_remembered_password');
        }
        
        // Use AuthContext login method to store token and user
        authLogin(response.accessToken, response.user);
        // Redirect to dashboard
        navigate("/dashboard", { replace: true });
      } else if (response.requires2FA && response.userId) {
        // 2FA required - switch to 2FA view
        setUserId(response.userId);
        setView('2fa');
        setOtp("");
        toast.success("Verification code sent to your email");
      } else if (response.requiresVerification && response.userId) {
        setUserId(response.userId);
        setView('verification');
        setError("Please verify your email first");
      } else {
        // Handle specific error types
        if (response.errorType === 'email') {
          setEmailError(response.error || "Email not found");
        } else if (response.errorType === 'password') {
          setPasswordError(response.error || "Incorrect password");
        } else {
          setError(response.error || "Login failed. Please try again.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit verification code");
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.verify2FA(userId, otp);
      if (response.success && response.user && response.accessToken) {
        // Use the auth context login function
        authLogin(response.accessToken, response.user);
        toast.success("Login successful!");
        // Redirect to dashboard
        navigate("/dashboard", { replace: true });
      } else {
        toast.error(response.error || "Invalid verification code");
        setError(response.error || "Invalid verification code");
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailError("");
    setPasswordError("");
    setPhoneError("");
    setLoading(true);

    // Custom validation
    let hasError = false;
    if (!name) {
      setError("Please fill in all fields");
      hasError = true;
    }
    
    if (!email) {
      setEmailError("Please fill in this field");
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      hasError = true;
    }
    
    if (!password) {
      setPasswordError("Please fill in this field");
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      hasError = true;
    }

    if (!phone || phone === "+92") {
      setPhoneError("Please enter your phone number");
      hasError = true;
    } else if (!validatePhone(phone)) {
      setPhoneError("Please enter a valid Pakistani phone number (+92 followed by 10 digits)");
      hasError = true;
    }

    if (hasError) {
      setLoading(false);
      return;
    }

    try {
      // Include invitation token if available
      const response = await authAPI.signup(name, email, password, phone, undefined, invitationToken || undefined);
      if (response.success && response.user) {
        // Store userId and switch to verification view
        setUserId(response.user.id);
        setView('verification');
        setError("");
        // Clear invitation token from URL
        if (invitationToken) {
          navigate('/login', { replace: true });
          setInvitationToken(null);
        }
        // Show success message
        const message = response.user.role === 'admin'
          ? "Admin account created! Please check your email for the verification OTP."
          : "Signup successful! Please check your email for the verification OTP.";
        toast.success(message);
      } else {
        setError(response.error || "Signup failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!otp || otp.length !== 6) {
        setError("Please enter a valid 6-digit OTP");
        setLoading(false);
        return;
      }

      if (!userId) {
        setError("User ID is missing. Please try signing up again.");
        setLoading(false);
        return;
      }

      const response = await authAPI.verifyEmail(userId, otp);
      if (response.success) {
        setView('login');
        setOtp("");
        setError("");
        // Clear password from signup
        setPassword("");
        setName("");
        toast.success("Email verified successfully! You can now login.");
      } else {
        setError(response.error || "Verification failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setResendingOTP(true);

    try {
      const response = await authAPI.sendVerificationOTP(email);
      if (response.success) {
        if (response.userId) {
          setUserId(response.userId);
        }
        setError("");
        toast.success("Verification OTP sent! Please check your email.");
      } else {
        setError(response.error || "Failed to resend OTP. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP. Please try again.");
    } finally {
      setResendingOTP(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailError("");
    setLoading(true);

    try {
        if (!email) {
          setEmailError("Please enter your email");
          setLoading(false);
          return;
        }
        if (!validateEmail(email)) {
          setEmailError("Please enter a valid email address");
          setLoading(false);
          return;
        }

      const response = await authAPI.forgotPassword(email, 'email');
      if (response.success) {
        if (response.userId) {
          setUserId(response.userId);
        }
        // Use the account email for OTP (from backend response)
        if (response.accountEmail) {
          setEmail(response.accountEmail);
        }
        setView('reset-password');
        setError("");
        toast.success(`Password reset OTP sent to your email!`, {
          description: `Please check your email.`
        });
      } else {
        setError(response.error || "Failed to send reset OTP. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send reset OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!userId) {
        setError("User ID is missing. Please request a new password reset OTP.");
        setLoading(false);
        return;
      }

      if (!otp || otp.length !== 6) {
        setError("Please enter a valid 6-digit OTP");
        setLoading(false);
        return;
      }

      if (!newPassword || newPassword.length < 8) {
        setError("Password must be at least 8 characters");
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      const response = await authAPI.resetPassword(userId, otp, newPassword);
      if (response.success) {
        setView('login');
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setError("");
        toast.success("Password reset successfully! You can now login.");
      } else {
        setError(response.error || "Password reset failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Password reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Toaster position="top-center" richColors />
    <div className="min-h-screen flex overflow-hidden">
      {/* Left Side - Image & Social */}
      <div 
        className="hidden md:flex md:w-5/12 relative bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(197, 48, 50, 0.9), rgba(168, 33, 42, 0.9)), url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080')`,
        }}
      >
        <div className="absolute inset-0 flex flex-col justify-between p-8">
          <div></div>
          
          {/* Social Icons */}
          <div className="flex flex-col items-center gap-6">
            <h2 className="text-white text-sm font-semibold tracking-wide">Follow Momentum Auto Works</h2>
            <div className="flex gap-4">
              <a 
                href="https://www.facebook.com/people/Momentum-Auto-Works/61581450630950/#" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <Facebook className="h-5 w-5 text-white" />
              </a>
              <a 
                href="https://www.instagram.com/momentumaw/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <Instagram className="h-5 w-5 text-white" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 p-8 md:p-12 bg-white flex flex-col justify-center">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <img src="/1.png" alt="Momentum POS" className="h-16 w-auto mb-3" />
            <h1 className="text-2xl text-[#7f161e] tracking-wide">MOMENTUM POS</h1>
          </div>

          {/* Verification View */}
          {view === 'verification' && (
            <form onSubmit={handleVerifyEmail} noValidate className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Verify Your Email</h2>
                <p className="text-sm text-gray-600">
                  We've sent a 6-digit verification OTP to<br />
                  <span className="font-medium text-[#c53032]">{email}</span>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Check your inbox or spam folder.
                </p>
                {userId && (
                  <p className="text-xs text-green-600 mt-2 font-medium">
                    ✓ Account created! Enter the OTP to verify your email.
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div>
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  className="h-12 bg-gray-50 border-gray-200 text-center text-2xl tracking-widest"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                  }}
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-[#c53032] hover:bg-[#a6212a] text-white"
                disabled={loading || otp.length !== 6}
              >
                {loading ? "Verifying..." : "Verify Email"}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">Didn't receive the OTP?</p>
                <button 
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendingOTP}
                  className="text-sm text-[#c53032] hover:text-[#a6212a] hover:underline disabled:opacity-50"
                >
                  {resendingOTP ? "Sending..." : "Resend OTP"}
                </button>
              </div>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setView('login');
                    setOtp("");
                    setError("");
                  }}
                  className="text-sm text-gray-600 hover:text-[#c53032] hover:underline flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password View */}
          {view === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} noValidate className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Forgot Password</h2>
                <p className="text-sm text-gray-600">
                  Enter your email address and we'll send you a password reset OTP.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}

                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    className={`h-12 bg-gray-50 border-gray-200 ${emailError ? 'border-red-500' : ''}`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                  />
                  {emailError && (
                    <p className="mt-1 text-sm text-red-600">{emailError}</p>
                  )}
                </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-[#c53032] hover:bg-[#a6212a] text-white"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset OTP"}
              </Button>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setView('login');
                    setError("");
                    setEmailError("");
                  }}
                  className="text-sm text-gray-600 hover:text-[#c53032] hover:underline flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* Reset Password View */}
          {view === 'reset-password' && (
            <form onSubmit={handleResetPassword} noValidate className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Reset Password</h2>
                <p className="text-sm text-gray-600">
                  Enter the OTP sent to your account email and your new password.
                </p>
                {email && (
                  <p className="text-xs text-gray-500 mt-1">
                    OTP sent to your account email: <span className="font-medium text-[#c53032]">{email}</span>
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div>
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  className="h-12 bg-gray-50 border-gray-200 text-center text-2xl tracking-widest"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                  }}
                  maxLength={6}
                  required
                />
              </div>

              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="New Password"
                  className="h-12 bg-gray-50 border-gray-200 pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  className="h-12 bg-gray-50 border-gray-200 pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-[#c53032] hover:bg-[#a6212a] text-white"
                disabled={loading || otp.length !== 6 || !newPassword || newPassword !== confirmPassword}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setView('login');
                    setOtp("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setError("");
                  }}
                  className="text-sm text-gray-600 hover:text-[#c53032] hover:underline flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* Two-Factor Authentication View */}
          {view === '2fa' && (
            <form onSubmit={handleVerify2FA} noValidate className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Two-Factor Authentication</h2>
                <p className="text-sm text-gray-600">
                  Enter the verification code sent to your email.
                </p>
                {email && (
                  <p className="text-xs text-gray-500 mt-1">
                    Code sent to: <span className="font-medium text-[#c53032]">{email}</span>
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  className="h-12 bg-gray-50 border-gray-200 text-center text-2xl tracking-widest"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                  }}
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-[#c53032] hover:bg-[#a6212a] text-white"
                disabled={loading || otp.length !== 6}
              >
                {loading ? "Verifying..." : "Verify & Login"}
              </Button>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setView('login');
                    setOtp("");
                    setError("");
                  }}
                  className="text-sm text-gray-600 hover:text-[#c53032] hover:underline flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* Login Form */}
          {view === 'login' && (
            <form onSubmit={handleLogin} noValidate className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  className={`h-12 bg-gray-50 border-gray-200 ${emailError ? 'border-red-500' : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                />
                {emailError && (
                  <p className="mt-1 text-sm text-red-600">{emailError}</p>
                )}
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className={`h-12 bg-gray-50 border-gray-200 pr-10 ${passwordError ? 'border-red-500' : ''}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
                {passwordError && (
                  <p className="mt-1 text-sm text-red-600">{passwordError}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked: boolean) => setRememberMe(checked as boolean)}
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm text-gray-600 cursor-pointer"
                  >
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot-password');
                    setError("");
                    setEmailError("");
                    setPasswordError("");
                  }}
                  className="text-sm text-[#c53032] hover:text-[#a6212a] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#c53032] hover:bg-[#a6212a] text-white"
                disabled={loading}
              >
                {loading ? "Please wait..." : "LOGIN"}
              </Button>
            </form>
          )}

          {/* Signup Form */}
          {view === 'signup' && (
            <form onSubmit={handleSignup} noValidate className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Create Account</h2>
                {invitationToken ? (
                  <div>
                    <p className="text-sm text-gray-600">
                      You've been invited to join Momentum POS as a <strong>{invitationRole}</strong>
                    </p>
                    {invitationRole && (
                      <div className="mt-2 inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        Role: {invitationRole}
                      </div>
                    )}
                  </div>
                ) : (
                <p className="text-sm text-gray-600">
                  Sign up to get started with Momentum POS
                </p>
                )}
              </div>

              {verifyingInvitation && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-600 text-sm text-center">
                  Verifying invitation...
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div>
                <Input
                  type="text"
                  placeholder="Full Name"
                  className="h-12 bg-gray-50 border-gray-200"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  className={`h-12 bg-gray-50 border-gray-200 ${emailError ? 'border-red-500' : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  disabled={!!invitationToken}
                />
                {emailError && (
                  <p className="mt-1 text-sm text-red-600">{emailError}</p>
                )}
                {invitationToken && (
                  <p className="mt-1 text-xs text-gray-500">Email is set from your invitation</p>
                )}
              </div>

              <div>
                <Input
                  type="tel"
                  placeholder="+92XXXXXXXXXX"
                  className={`h-12 bg-gray-50 border-gray-200 ${phoneError ? 'border-red-500' : ''}`}
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                />
                {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className={`h-12 bg-gray-50 border-gray-200 pr-10 ${passwordError ? 'border-red-500' : ''}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
                {passwordError && (
                  <p className="mt-1 text-sm text-red-600">{passwordError}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-[#c53032] hover:bg-[#a6212a] text-white"
                disabled={loading || verifyingInvitation}
              >
                {loading ? "Creating Account..." : "SIGN UP"}
              </Button>

              <div className="text-center pt-2">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setView('login');
                      setError("");
                      setEmailError("");
                      setPasswordError("");
                      if (invitationToken) {
                        navigate('/login', { replace: true });
                        setInvitationToken(null);
                      }
                    }}
                    className="text-sm text-[#c53032] hover:text-[#a6212a] hover:underline font-medium"
                  >
                    Login
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
