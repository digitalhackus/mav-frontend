import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Facebook, Twitter, Linkedin, ArrowLeft } from "lucide-react";
import { authAPI } from "../api/client";
import { useAuth } from "../contexts/AuthContext";

type View = 'login' | 'signup' | 'verification' | 'forgot-password' | 'reset-password';

export function Login() {
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendingOTP, setResendingOTP] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !password) {
        setError("Please enter email and password");
        setLoading(false);
        return;
      }

      const response = await authAPI.login(email, password);
      if (response.success && response.user && response.accessToken) {
        // Use AuthContext login method to store token and user
        authLogin(response.accessToken, response.user);
        // Redirect to dashboard
        navigate("/dashboard", { replace: true });
      } else if (response.requiresVerification && response.userId) {
        setUserId(response.userId);
        setView('verification');
        setError("Please verify your email first");
      } else {
        setError(response.error || "Login failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!name || !email || !password) {
        setError("Please fill in all fields");
        setLoading(false);
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        setLoading(false);
        return;
      }

      const response = await authAPI.signup(name, email, password);
      if (response.success && response.user) {
        // Store userId and switch to verification view
        setUserId(response.user.id);
        setView('verification');
        setError("");
        // Show success message
        const message = response.user.role === 'admin'
          ? "Admin account created! Please check your email for the verification OTP."
          : "Signup successful! Please check your email for the verification OTP.";
        alert(message);
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
        alert("Email verified successfully! You can now login.");
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
        alert("Verification OTP sent! Please check your email.");
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
    setLoading(true);

    try {
      if (!email) {
        setError("Please enter your email");
        setLoading(false);
        return;
      }

      const response = await authAPI.forgotPassword(email);
      if (response.success) {
        if (response.userId) {
          setUserId(response.userId);
        }
        setView('reset-password');
        setError("");
        alert("Password reset OTP sent! Please check your email.");
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
        alert("Password reset successfully! You can now login.");
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
            <div className="flex gap-4">
              <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors">
                <Facebook className="h-5 w-5 text-white" />
              </button>
              <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors">
                <Twitter className="h-5 w-5 text-white" />
              </button>
              <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors">
                <Linkedin className="h-5 w-5 text-white" />
              </button>
            </div>
            
            {view === 'login' && (
              <div className="text-center text-white">
                <p className="text-sm mb-2">Don't have an account?</p>
                <button 
                  onClick={() => {
                    setView('signup');
                    setError("");
                  }}
                  className="text-white font-medium underline hover:no-underline"
                >
                  Signup
                </button>
              </div>
            )}
            {view === 'signup' && (
              <div className="text-center text-white">
                <p className="text-sm mb-2">Already have an account?</p>
                <button 
                  onClick={() => {
                    setView('login');
                    setError("");
                  }}
                  className="text-white font-medium underline hover:no-underline"
                >
                  Login
                </button>
              </div>
            )}
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
            <form onSubmit={handleVerifyEmail} className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Verify Your Email</h2>
                <p className="text-sm text-gray-600">
                  We've sent a 6-digit verification OTP to<br />
                  <span className="font-medium text-[#c53032]">{email}</span>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Check your inbox or spam folder. If you don't receive it, check the server console for the OTP (development mode).
                </p>
                <p className="text-xs text-blue-600 mt-2 font-medium">
                  💡 Tip: Check the server console/terminal for the OTP if email is not configured
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
            <form onSubmit={handleForgotPassword} className="space-y-5">
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
                  className="h-12 bg-gray-50 border-gray-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
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
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Reset Password</h2>
                <p className="text-sm text-gray-600">
                  Enter the OTP sent to your email and your new password.
                </p>
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

              <div>
                <Input
                  type="password"
                  placeholder="New Password"
                  className="h-12 bg-gray-50 border-gray-200"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <Input
                  type="password"
                  placeholder="Confirm New Password"
                  className="h-12 bg-gray-50 border-gray-200"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
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

          {/* Login/Signup Form */}
          {(view === 'login' || view === 'signup') && (
            <form onSubmit={view === 'login' ? handleLogin : handleSignup} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}

              {view === 'signup' && (
                <div>
                  <Input
                    type="text"
                    placeholder="Full Name"
                    className="h-12 bg-gray-50 border-gray-200"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  className="h-12 bg-gray-50 border-gray-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  className="h-12 bg-gray-50 border-gray-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {view === 'login' && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked: boolean) => setRememberMe(checked)}
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
                      }}
                      className="text-sm text-[#c53032] hover:text-[#a6212a] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full h-12 bg-[#c53032] hover:bg-[#a6212a] text-white"
                disabled={loading}
              >
                {loading ? "Please wait..." : view === 'login' ? "LOGIN" : "SIGN UP"}
              </Button>

              {/* Mobile Signup Toggle */}
              <div className="md:hidden text-center pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">
                  {view === 'signup' ? "Already have an account?" : "Don't have an account?"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setView(view === 'login' ? 'signup' : 'login');
                    setError("");
                  }}
                  className="text-[#c53032] font-medium hover:text-[#a6212a] hover:underline"
                >
                  {view === 'login' ? "Signup" : "Login"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
