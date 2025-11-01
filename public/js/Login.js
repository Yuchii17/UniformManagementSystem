const togglePassword = document.querySelector("#togglePassword");
const password = document.querySelector("#password");
const loginForm = document.getElementById("loginForm");

togglePassword.addEventListener("click", () => {
  password.type = password.type === "password" ? "text" : "password";
  togglePassword.classList.toggle("bi-eye");
});

function showAlert(icon, title, text) {
  Swal.fire({
    icon,
    title,
    text,
    timer: 1200,
    showConfirmButton: false,
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(loginForm));

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        showAlert("success", "Login Successful", data.message || "Welcome back!");
        setTimeout(() => {
          window.location.href = data.redirect || "/user/index";
        }, 1000);
      } else {
        showAlert("error", "Login Failed", data.message || "Invalid email or password.");
      }
    } catch {
      showAlert("error", "Server Error", "Please try again later.");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const forgotForm = document.getElementById("forgotPasswordForm");
  const otpForm = document.getElementById("otpForm");
  const resetForm = document.getElementById("resetPasswordForm");

  let userEmail = "";
  let verifiedOTP = ""; 

  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      userEmail = document.getElementById("forgotEmail").value.trim();

      if (!userEmail) {
        Swal.fire("Error", "Please enter your email address.", "warning");
        return;
      }

      try {
        const res = await fetch("/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail }),
        });

        const data = await res.json();

        if (res.ok) {
          Swal.fire("Success", data.message, "success");
          bootstrap.Modal.getInstance(document.getElementById("forgotPasswordModal")).hide();
          new bootstrap.Modal(document.getElementById("otpModal")).show();
        } else {
          Swal.fire("Error", data.message || "Failed to send OTP.", "error");
        }
      } catch {
        Swal.fire("Error", "Something went wrong.", "error");
      }
    });
  }

  if (otpForm) {
    otpForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const otpInputs = document.querySelectorAll("#otpForm .otp-input");
      const otp = Array.from(otpInputs).map((i) => i.value).join("").trim();

      if (otp.length !== 6) {
        Swal.fire("Error", "Please enter the 6-digit OTP.", "warning");
        return;
      }

      try {
        const res = await fetch("/verify-forgot-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, otp }),
        });

        const data = await res.json();

        if (res.ok) {
          verifiedOTP = otp; 
          Swal.fire("Verified", data.message, "success");
          bootstrap.Modal.getInstance(document.getElementById("otpModal")).hide();
          new bootstrap.Modal(document.getElementById("resetPasswordModal")).show();
        } else {
          Swal.fire("Error", data.message || "Invalid OTP.", "error");
        }
      } catch {
        Swal.fire("Error", "Something went wrong.", "error");
      }
    });
  }

  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newPassword = document.getElementById("newPassword").value.trim();
      const confirmPassword = document.getElementById("confirmPassword").value.trim();

      if (newPassword !== confirmPassword) {
        Swal.fire("Error", "Passwords do not match.", "warning");
        return;
      }

      try {
        const res = await fetch("/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, otp: verifiedOTP, newPassword }), 
        });

        const data = await res.json();

        if (res.ok) {
          Swal.fire("Success", data.message, "success");
          bootstrap.Modal.getInstance(document.getElementById("resetPasswordModal")).hide();
        } else {
          Swal.fire("Error", data.message || "Failed to reset password.", "error");
        }
      } catch {
        Swal.fire("Error", "Something went wrong.", "error");
      }
    });
  }

  document.querySelectorAll(".otp-input").forEach((input, index, arr) => {
    input.addEventListener("input", () => {
      if (input.value.length === 1 && index < arr.length - 1) arr[index + 1].focus();
    });
  });
});

  document.addEventListener("DOMContentLoaded", () => {
    const toggleNewPassword = document.getElementById("toggleNewPassword");
    const newPassword = document.getElementById("newPassword");
    const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");
    const confirmPassword = document.getElementById("confirmPassword");

    toggleNewPassword.addEventListener("click", () => {
      const type = newPassword.type === "password" ? "text" : "password";
      newPassword.type = type;
      toggleNewPassword.classList.toggle("bi-eye");
      toggleNewPassword.classList.toggle("bi-eye-slash");
    });

    toggleConfirmPassword.addEventListener("click", () => {
      const type = confirmPassword.type === "password" ? "text" : "password";
      confirmPassword.type = type;
      toggleConfirmPassword.classList.toggle("bi-eye");
      toggleConfirmPassword.classList.toggle("bi-eye-slash");
    });
  });