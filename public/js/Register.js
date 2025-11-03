const togglePassword = document.querySelector("#togglePassword");
const password = document.querySelector("#password");
const toggleConfirm = document.querySelector("#toggleConfirm");
const confirmPassword = document.querySelector("#confirmPassword");
const termsContent = document.getElementById("termsContent");
const agreeBtn = document.getElementById("agreeBtn");
const checkbox = document.getElementById("termsCheckbox");
const registerForm = document.getElementById("registerForm");
const registerBtn = registerForm.querySelector("button[type='submit']");
const otpModal = document.getElementById("otpModal");
const otpInputs = document.querySelectorAll(".otp-input");
const resendBtn = document.getElementById("resendOtpBtn");
const timerText = document.getElementById("timerText");

const firstNameInput = registerForm.firstName;
const lastNameInput = registerForm.lastName;
const phoneInput = registerForm.phone;

togglePassword.addEventListener("click", () => {
  password.type = password.type === "password" ? "text" : "password";
  togglePassword.classList.toggle("bi-eye");
});

toggleConfirm.addEventListener("click", () => {
  confirmPassword.type = confirmPassword.type === "password" ? "text" : "password";
  toggleConfirm.classList.toggle("bi-eye");
});

termsContent.addEventListener("scroll", () => {
  if (termsContent.scrollTop + termsContent.clientHeight >= termsContent.scrollHeight - 10)
    agreeBtn.disabled = false;
});

agreeBtn.addEventListener("click", () => {
  checkbox.disabled = false;
  checkbox.checked = true;
  bootstrap.Modal.getInstance(document.getElementById("termsModal")).hide();
});

function showAlert(icon, title, text, inputToFocus = null) {
  Swal.fire({
    icon,
    title,
    text,
    timer: 1000,
    showConfirmButton: false,
  }).then(() => {
    if (inputToFocus) inputToFocus.focus();
  });
}

[firstNameInput, lastNameInput].forEach((input) => {
  input.addEventListener("input", () => {
    if (/\d/.test(input.value)) {
      input.value = input.value.replace(/\d/g, "");
      showAlert("error", "Invalid Character", "Numbers are not allowed.", input);
    }
    if (input.value.length > 30) {
      input.value = input.value.slice(0, 30);
      showAlert("error", "Invalid Length", "Cannot exceed 30 characters.", input);
    }
  });
});

phoneInput.addEventListener("input", () => {
  if (/\D/.test(phoneInput.value)) {
    phoneInput.value = phoneInput.value.replace(/\D/g, "");
    showAlert("error", "Invalid Character", "Letters are not allowed in phone number.", phoneInput);
  }
  if (phoneInput.value.length > 11) {
    phoneInput.value = phoneInput.value.slice(0, 11);
    showAlert("warning", "Max Digits Reached", "Phone number cannot exceed 11 digits.", phoneInput);
  }
});

// OTP navigation
otpInputs.forEach((input, index) => {
  input.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
    if (e.target.value && index < otpInputs.length - 1) otpInputs[index + 1].focus();
    checkOtpFilled();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !input.value && index > 0) otpInputs[index - 1].focus();
  });
});

function checkOtpFilled() {
  const otp = Array.from(otpInputs).map((i) => i.value).join("");
  if (otp.length === 6) verifyOtp(otpModal.dataset.email, otp);
}

async function verifyOtp(email, otp) {
  try {
    const res = await fetch("/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "Email Verified",
        text: data.message,
        timer: 1000,
        showConfirmButton: false,
      }).then(() => {
        bootstrap.Modal.getInstance(otpModal).hide();
        window.location.href = "/login";
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Invalid OTP",
        text: data.message,
        timer: 1000,
        showConfirmButton: false,
      });
      otpInputs.forEach((i) => (i.value = ""));
      otpInputs[0].focus();
    }
  } catch {
    Swal.fire({
      icon: "error",
      title: "Verification Failed",
      text: "Try again.",
      timer: 1000,
      showConfirmButton: false,
    });
  }
}

function startResendTimer() {
  let timeLeft = 300;
  resendBtn.disabled = true;
  const timer = setInterval(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerText.textContent = `Resend available in ${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;
    timeLeft--;
    if (timeLeft < 0) {
      clearInterval(timer);
      timerText.textContent = "";
      resendBtn.disabled = false;
    }
  }, 1000);
}

resendBtn.addEventListener("click", async () => {
  const email = otpModal.dataset.email;
  resendBtn.disabled = true;
  try {
    const res = await fetch("/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "OTP Sent",
        text: data.message,
        timer: 1000,
        showConfirmButton: false,
      }).then(startResendTimer);
    } else {
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: data.message,
        timer: 1000,
        showConfirmButton: false,
      });
      resendBtn.disabled = false;
    }
  } catch {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to resend OTP.",
      timer: 1000,
      showConfirmButton: false,
    });
    resendBtn.disabled = false;
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const phone = phoneInput.value.trim();
  const pass = password.value.trim();
  const confirmPass = confirmPassword.value.trim();

  if (firstName.length === 0 || lastName.length === 0) {
    showAlert("error", "Invalid Name", "First and Last name cannot be empty.", firstNameInput);
    return;
  }
  if (phone.length !== 11) {
    showAlert("error", "Invalid Phone Number", "Phone number must be exactly 11 digits.", phoneInput);
    return;
  }
  if (pass !== confirmPass) {
    showAlert("error", "Password Mismatch", "Password and Confirm Password do not match.", password);
    return;
  }

  registerBtn.disabled = true;
  const formData = Object.fromEntries(new FormData(registerForm));
  try {
    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (res.ok) {
      await Swal.fire({
        icon: "success",
        title: "Registration Successful",
        text: data.message,
        timer: 1000,
        showConfirmButton: false,
      });
      otpModal.querySelector(".modal-title").textContent = `Verify Email (${formData.email})`;
      otpModal.dataset.email = formData.email;
      new bootstrap.Modal(otpModal).show();
      startResendTimer();
    } else {
      await Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: data.message,
        timer: 1000,
        showConfirmButton: false,
      });
      registerBtn.disabled = false;
    }
  } catch {
    await Swal.fire({
      icon: "error",
      title: "Server Error",
      text: "Please try again later.",
      timer: 1000,
      showConfirmButton: false,
    });
    registerBtn.disabled = false;
  }
});

  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirmPassword');
  const helper = document.getElementById('passwordHelper');
  const matchHelper = document.getElementById('matchHelper');
  const submitBtn = document.querySelector('form button[type="submit"]');

  const rules = {
    length: document.getElementById('ruleLength'),
    upper: document.getElementById('ruleUpper'),
    number: document.getElementById('ruleNumber'),
    special: document.getElementById('ruleSpecial')
  };

  passwordInput.addEventListener('focus', () => { helper.style.display = 'block'; });
  passwordInput.addEventListener('blur', () => { helper.style.display = 'none'; });

  const validate = () => {
    const pass = passwordInput.value;
    const confirmPass = confirmInput.value;
    let valid = true;

    if (pass.length >= 8) rules.length.classList.replace('text-danger','text-success'); else { rules.length.classList.replace('text-success','text-danger'); valid = false; }
    if (/[A-Z]/.test(pass)) rules.upper.classList.replace('text-danger','text-success'); else { rules.upper.classList.replace('text-success','text-danger'); valid = false; }
    if (/\d/.test(pass)) rules.number.classList.replace('text-danger','text-success'); else { rules.number.classList.replace('text-success','text-danger'); valid = false; }
    if (/[_!@#$%^&*]/.test(pass)) rules.special.classList.replace('text-danger','text-success'); else { rules.special.classList.replace('text-success','text-danger'); valid = false; }

    if (confirmPass && pass === confirmPass) { matchHelper.style.display = 'none'; } else { matchHelper.style.display = 'block'; valid = false; }

    submitBtn.disabled = !valid;
  };

  passwordInput.addEventListener('input', validate);
  confirmInput.addEventListener('input', validate);

  document.getElementById('togglePassword').addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    document.getElementById('togglePassword').classList.toggle('bi-eye');
    document.getElementById('togglePassword').classList.toggle('bi-eye-slash');
  });
  document.getElementById('toggleConfirm').addEventListener('click', () => {
    const type = confirmInput.type === 'password' ? 'text' : 'password';
    confirmInput.type = type;
    document.getElementById('toggleConfirm').classList.toggle('bi-eye');
    document.getElementById('toggleConfirm').classList.toggle('bi-eye-slash');
  });
