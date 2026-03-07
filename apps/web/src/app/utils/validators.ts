export const validateEmail = (email: string): boolean => {
  // Must contain exactly one @ and at least one . after the @
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  // Must contain at least 10 digits, ignoring spaces or plus symbols
  const digitCount = phone.replace(/\D/g, '').length;
  return digitCount >= 10;
};

export const validatePincode = (pincode: string): boolean => {
  // Exactly 6 digits
  return /^\d{6}$/.test(pincode);
};
