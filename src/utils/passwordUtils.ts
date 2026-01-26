export const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("8文字以上で入力してください");
  }
  if (!/[a-zA-Z]/.test(password)) {
    errors.push("半角英字を1文字以上含めてください");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("半角数字を1文字以上含めてください");
  }
  
  return errors;
};