// frontend/user.js
async function loadUserInfo() {
  const token = localStorage.getItem('metaBankToken');
  if (!token) {
    alert('Session expired. Please log in again.');
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch('https://meta-bank-backend.onrender.com/api/user/profile', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();

    if (res.ok) {
      // Update greeting if element exists
      const greetingEl = document.querySelector('.greeting');
      if (greetingEl) {
        greetingEl.textContent = `Welcome, ${data.fullName || data.username}!`;
      }

      // Update profile name if element exists
      const nameEl = document.querySelector('.user-name');
      if (nameEl) {
        nameEl.textContent = data.fullName || data.username;
      }

      // Update balances if element exists
      const balanceEl = document.querySelector('.balance');
      if (balanceEl) {
        balanceEl.textContent = `$${Number(data.balance || 0).toLocaleString()}`;
      }
    } else {
      console.error('Failed to load user info:', data.message);
    }
  } catch (err) {
    console.error('Error fetching user info:', err);
  }
}

// Run on page load
window.addEventListener('DOMContentLoaded', loadUserInfo);
