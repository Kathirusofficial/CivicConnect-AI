import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { FadeIn } from '../../components/animations/FadeIn';
import { SuccessCheck } from '../../components/animations/SuccessCheck';

export const OTPVerificationPage = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsVerified(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    }, 1500);
  };

  const handleResend = () => {
    setTimeLeft(60);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  if (isVerified) {
    return (
      <FadeIn>
        <div className="text-center space-y-6 py-8">
          <SuccessCheck />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h2 className="font-display text-2xl text-surface-900 dark:text-surface-50">Verified!</h2>
            <p className="mt-2 text-sm text-surface-500">Redirecting to dashboard...</p>
          </motion.div>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-cyan to-accent-sky flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20"
          >
            <Shield size={28} className="text-white" />
          </motion.div>
          <h1 className="font-display text-3xl text-surface-900 dark:text-surface-50 tracking-tight">
            Verify your email
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            We sent a 6-digit code to your email address
          </p>
        </div>

        <div className="flex justify-center gap-3">
          {otp.map((digit, index) => (
            <motion.input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-xl font-semibold rounded-xl border-2 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-50 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 dark:focus:ring-brand-400/30 dark:focus:border-brand-400 border-surface-200 dark:border-surface-700"
            />
          ))}
        </div>

        <Button
          onClick={handleVerify}
          size="lg"
          className="w-full"
          isLoading={isLoading}
          disabled={otp.some((d) => !d)}
          icon={ArrowRight}
        >
          Verify
        </Button>

        <div className="text-center">
          {timeLeft > 0 ? (
            <p className="text-sm text-surface-500">
              Resend code in <span className="font-semibold text-brand-600 dark:text-brand-400">{timeLeft}s</span>
            </p>
          ) : (
            <button onClick={handleResend} className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700">
              Resend code
            </button>
          )}
        </div>
      </div>
    </FadeIn>
  );
};
