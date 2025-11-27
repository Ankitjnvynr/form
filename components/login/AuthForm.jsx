"use client";
import React, { useState, useEffect } from "react";
import {
  Theme,
  Flex,
  Button,
  Heading,
  Text,
  Link,
  TextField,
  Separator,
} from "@radix-ui/themes";
import { FaGoogle, FaUserPlus } from "react-icons/fa6";
import { AiOutlineLogin } from "react-icons/ai";
import { useAuth } from "@/context/AuthContext";
import { Mail, KeyRound, Loader } from "lucide-react";
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';

const GRADIENT_BG = "linear-gradient(90deg, #72471c 0%, #5a3816 100%)";
const BRAND_COLOR = "#5a3816";

const InputField = ({
  placeholder,
  type = "text",
  value,
  onChange,
  disabled,
  icon: Icon,
  required = false,
}) => (
  <TextField.Root
    placeholder={placeholder}
    type={type}
    value={value}
    onChange={onChange}
    disabled={disabled}
    required={required}
    size="3"
    style={{ backgroundColor: "rgba(255,255,255,0.5)", color: "black" }}
  >
    {Icon && <TextField.Slot>{<Icon size={16} />}</TextField.Slot>}
  </TextField.Root>
);

export default function AuthWithImage() {
  const {
    user,
    login,
    signup,
    sendOTP,
    verifyOTP,
    loginWithGoogle, // Assuming this function exists in your AuthContext
    isAuthenticated,
    loading: authLoading,
  } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error"); // success or error
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modeText = isSignUp ? "Sign Up" : "Log In";
  let formHeading = isSignUp ? "Create New Account" : "Welcome Back";
  let SubmitIcon = isSignUp ? FaUserPlus : AiOutlineLogin;

  const router = useRouter();

  useEffect(() => {
    // If the user is already authenticated, redirect them from the login page.
    if (isAuthenticated && !authLoading) {
      const isAdmin = user?.role === "admin" || user?.role === "superadmin";
      router.push(isAdmin ? "/school-inspections" : "/teacher-reports");
    }
  }, [isAuthenticated, authLoading, user, router]);

  if (otpSent) {
    formHeading = "Verify OTP";
    SubmitIcon = KeyRound;
  }

  const toggleMode = () => {
    setIsSignUp((prev) => !prev);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setOtp("");
    setOtpSent(false);
    setMessage("");
  };

  // ---------------------------
  // MASTER AUTH SUBMIT HANDLER
  // ---------------------------
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      // OTP PHASE
      if (otpSent) {
        if (!otp) {
          setMessageType("error");
          setMessage("Please enter the OTP.");
          setIsSubmitting(false);
          return;
        }

        const result = await verifyOTP(email, otp);
        console.log("OTP verification result:", result);

        if (result.success) {
          setMessageType("success");
          setMessage("OTP verified! Logging you in...");

          // 🔥 INSTANT LOGIN after OTP verification
          const loginResult = await login(email, password);
  console.log("Login after OTP verification result:", loginResult);
          if (loginResult.success) {
            setMessageType("success");
            setMessage("Logged in successfully!");
            if (
              loginResult.user.role == "admin" ||
              loginResult.user.role == "superadmin"
            ) {
              router.navi("/school-inspections");
            } else {
              router.push("/teacher-reports");
            }
          } else {
            setMessageType("error");
            setMessage("OTP verified but login failed. Please try again.");
          }
        } else {
          setMessageType("error");
          setMessage(result.error || "Invalid OTP.");
        }

        setIsSubmitting(false);
        return;
      }

      // LOGIN PHASE
      if (!isSignUp) {
        const loginResult = await login(email, password);
        console.log("Login result:", loginResult);

        if (loginResult.success) {
          setMessageType("success");
          setMessage("Logged in successfully!");
          if (
            loginResult.user.role == "admin" ||
            loginResult.user.role == "superadmin"
          ) {
            router.push("/school-inspections");
          } else {
            router.push("/teacher-reports");
          }
          return
        } else if (loginResult.code === 403) {
          // User not verified → send OTP
          const otpResult = await sendOTP(email);

          if (otpResult.success) {
            setMessageType("success");
            setMessage("Email not verified. OTP sent.");
            setOtpSent(true);
          } else {
            setMessageType("error");
            setMessage("Failed to send OTP. Try again.");
          }
        } else {
          setMessageType("error");
          setMessage("Invalid email or password.");
        }

        setIsSubmitting(false);
        return;
      }

      // SIGNUP PHASE
      if (isSignUp) {
        if (password !== confirmPassword) {
          setMessageType("error");
          setMessage("Passwords do not match.");
          setIsSubmitting(false);
          return;
        }

        const registerResult = await signup(fullName, email, password);

        if (registerResult.success) {
          const otpResult = await sendOTP(email);

          if (otpResult.success) {
            setMessageType("success");
            setMessage("Account created! OTP sent to verify.");
            setOtpSent(true);
          } else {
            setMessageType("error");
            setMessage("Registered but OTP sending failed.");
            setOtpSent(true);
          }
        } else {
          setMessageType("error");
          setMessage("Registration failed. Email may already exist.");
        }
      }
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const result = await sendOTP(email);
    if (result.success) {
      setMessageType("success");
      setMessage("New OTP sent successfully.");
    } else {
      setMessageType("error");
      setMessage("Failed to resend OTP.");
    }

    setIsSubmitting(false);
  };

  const isDisabled = authLoading || isSubmitting;

  // While checking auth status or redirecting, show a loader to prevent form flash.
  if (isAuthenticated || authLoading) {
    return <Flex align="center" justify="center" style={{ minHeight: "100vh" }}>
      <Loader size={48} className="animate-spin" style={{ color: BRAND_COLOR }} />
    </Flex>;
  }

  return (
    <Theme accentColor="blue" grayColor="sand" radius="large" scaling="100%">
      <Flex
        direction={{ initial: "column", md: "row" }}
        style={{
          minHeight: "100vh",
          width: "100%",
          backgroundImage: "url('https://t4.ftcdn.net/jpg/16/45/68/75/360_F_1645687530_lgL5M3MCNybJoGpV8iouPtRHTHanZAIA.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Flex
          align="center"
          justify="center"
          direction="column"
          p="2"
          style={{ flex: 1 }}
        >
          <Flex
            direction="column"
            gap="5"
            style={{
              width: "100%",
              maxWidth: "420px",
              backgroundColor: "rgba(255, 255, 255,0.8)",
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
              backdropFilter: "blur(5px)",
            }}
          >
            <Flex direction="column" align="center" gap="2">
              <Heading size="7" weight="bold" style={{ color: "#72471c" }}>
                {formHeading}
              </Heading>
              <Text color="gray">
                {otpSent
                  ? `Enter the code sent to ${email}.`
                  : isSignUp
                  ? "Join us and start your journey."
                  : "Login to access your account."}
              </Text>
            </Flex>

            {!otpSent && (
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  console.log("Google credential response:", credentialResponse);
                  const idToken = credentialResponse.credential;
                  // This function should send the ID token to your backend
                  const loginResult = await loginWithGoogle(idToken);
                  console.log("Google login result:", loginResult);


                  if (loginResult?.success) {
                    setMessageType("success");
                    setMessage("Logged in successfully with Google!");
                    // Redirect based on user role
                    const isAdmin = loginResult.user.role === "admin" || loginResult.user.role === "superadmin";
                    router.push(isAdmin ? "/school-inspections": "/teacher-reports");
                  } else {
                    setMessageType("error");
                    setMessage(loginResult?.error || "Google login failed. Please try again.");
                  }
                }}
                onError={() => {
                  console.error('Google Login Failed');
                  setMessageType("error");
                  setMessage("Google login failed. Please try again.");
                }}
                text={isSignUp ? "signup_with" : "signin_with"}
                shape="rectangular"
                theme="outline"
                size="large"
                logo_alignment="left"
                width="100%"
                disabled={isDisabled}
              />
            )}

            {!otpSent && (
              <Flex align="center" justify="center" gap="3">
                <Separator size="3" style={{ flex: 1 }} />
                <Text color="gray">or</Text>
                <Separator size="3" style={{ flex: 1 }} />
              </Flex>
            )}

            <form onSubmit={handleAuthSubmit}>
              <Flex direction="column" gap="3">
                <InputField
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isDisabled || otpSent}
                  icon={Mail}
                  required
                />

                {otpSent ? (
                  <>
                    <InputField
                      placeholder="Verification Code (OTP)"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      disabled={isDisabled}
                      icon={KeyRound}
                      required
                    />

                    <Text size="1" align="center">
                      Didn’t receive it?{" "}
                      <Link
                        onClick={handleResendOTP}
                        style={{ cursor: "pointer" }}
                      >
                        Resend OTP
                      </Link>
                    </Text>
                  </>
                ) : (
                  <>
                    {isSignUp && (
                      <InputField
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={isDisabled}
                      />
                    )}

                    <InputField
                      placeholder="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isDisabled}
                      required
                    />

                    {isSignUp && (
                      <InputField
                        placeholder="Confirm Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isDisabled}
                        required
                      />
                    )}
                  </>
                )}

                <Button
                  size="3"
                  type="submit"
                  color="blue"
                  disabled={isDisabled}
                  style={{
                    width: "100%",
                    marginTop: "1rem",
                    background: GRADIENT_BG,
                    color: "white",
                  }}
                >
                  {isDisabled ? (
                    <Loader
                      size={20}
                      className="animate-spin"
                      style={{ color: "white" }}
                    />
                  ) : (
                    <>
                      <SubmitIcon style={{ marginRight: 8 }} />
                      {otpSent ? "Verify" : modeText}
                    </>
                  )}
                </Button>
              </Flex>
            </form>

            {message && (
              <Text
                style={{
                  textAlign: "center",
                  color: messageType === "success" ? "green" : "red",
                  marginTop: 8,
                }}
              >
                {message}
              </Text>
            )}

            {!otpSent && (
              <Text
                color="gray"
                style={{ textAlign: "center", marginTop: "1rem" }}
              >
                {isSignUp
                  ? "Already have an account?"
                  : "Don't have an account yet?"}
                <Link
                  href="#"
                  onClick={toggleMode}
                  style={{
                    marginLeft: 6,
                    color: BRAND_COLOR,
                    textDecoration: "none",
                  }}
                >
                  {isSignUp ? "Log In" : "Sign Up"}
                </Link>
              </Text>
            )}
          </Flex>
        </Flex>

        <Flex style={{ flex: 1 }}></Flex>
      </Flex>
    </Theme>
  );
}
