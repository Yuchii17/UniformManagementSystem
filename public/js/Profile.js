document.addEventListener("DOMContentLoaded", () => {
  const profileForm = document.getElementById("profileForm");

  profileForm.addEventListener("submit", (e) => {
    const firstName = profileForm.firstName.value.trim();
    const lastName = profileForm.lastName.value.trim();
    const phone = profileForm.phone.value.trim();
    const gender = profileForm.gender ? profileForm.gender.value : "";

    const nameRegex = /^[A-Za-z\s]{1,30}$/;
    const phoneRegex = /^[0-9]{1,11}$/;

    if (!nameRegex.test(firstName)) {
      e.preventDefault();
      Swal.fire("Invalid Input", "First Name cannot contain numbers or symbols and max 30 characters.", "warning");
      return;
    }

    if (!nameRegex.test(lastName)) {
      e.preventDefault();
      Swal.fire("Invalid Input", "Last Name cannot contain numbers or symbols and max 30 characters.", "warning");
      return;
    }

    if (!phoneRegex.test(phone)) {
      e.preventDefault();
      Swal.fire("Invalid Input", "Phone number must contain only numbers (max 11 digits).", "warning");
      return;
    }

    if (!gender) {
      e.preventDefault();
      Swal.fire("Missing Field", "Please select your gender before saving changes.", "warning");
      return;
    }
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get('updated')) {
    Swal.fire({
      icon: 'success',
      title: 'Profile Updated',
      text: 'Your profile changes have been saved successfully.',
      timer: 2000,
      showConfirmButton: false
    }).then(() => {
      window.history.replaceState({}, document.title, '/user/profile');
    });
  }
});
