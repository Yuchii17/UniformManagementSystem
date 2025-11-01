    document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
      e.preventDefault();
      const confirm = await Swal.fire({
        icon: "question",
        title: "Logout?",
        text: "Are you sure you want to log out?",
        showCancelButton: true,
        confirmButtonText: "Yes, logout",
        cancelButtonText: "Cancel"
      });
      if (confirm.isConfirmed) {
        const res = await fetch("/logout", { method: "POST" });
        const data = await res.json();
        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "Logged out",
            text: data.message,
            timer: 1000,
            showConfirmButton: false
          });
          setTimeout(() => {
            window.location.href = data.redirect || "/login";
          }, 1000);
        } else {
          Swal.fire("Error", data.message || "Failed to logout.", "error");
        }
      }
    });