<!-- Include this in every HTML page, above your page-specific script -->
<script>
window.API = (function() {
  const BASE = 'https://meta-bank-backend.onrender.com';

  function getToken() {
    const t = localStorage.getItem('metaBankToken');
    if (!t) {
      alert('Session expired. Please log in again.');
      window.location.href = 'login.html';
      throw new Error('No token');
    }
    return t;
  }

  async function request(path, options = {}) {
    const token = options.skipAuth ? null : getToken();
    const headers = options.headers || {};
    if (!options.skipAuth) headers['Authorization'] = 'Bearer ' + token;
    if (options.json) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${BASE}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body || null,
      credentials: options.credentials || 'same-origin'
    });

    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await res.json();
    } else {
      data = {};
    }

    if (!res.ok) {
      const msg = (data && data.message) ? data.message : `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return data;
  }

  // Profile (for greeting consistency)
  async function getProfile() {
    return await request('/api/user/profile');
  }

  // Overview/account
  async function getAccount() {
    return await request('/api/user/account');
  }

  // Investments
  async function getInvestments() {
    return await request('/api/user/investments');
  }

  // Loans
  async function getLoans() {
    return await request('/api/user/loans');
  }
  async function createLoan(payload) {
    return await request('/api/user/loans', { method: 'POST', json: true, body: JSON.stringify(payload) });
  }

  // Transfers
  async function getTransfers() {
    return await request('/api/user/transfers');
  }
  async function createTransfer(payload) {
    return await request('/api/user/transfers', { method: 'POST', json: true, body: JSON.stringify(payload) });
  }

  // External accounts
  async function getExternalAccounts() {
    return await request('/api/user/external-accounts');
  }
  async function createExternalAccount(payload) {
    return await request('/api/user/external-accounts', { method: 'POST', json: true, body: JSON.stringify(payload) });
  }

  // IRA
  async function getIRA() {
    return await request('/api/user/ira');
  }
  async function createIRA(payload) {
    return await request('/api/user/ira', { method: 'POST', json: true, body: JSON.stringify(payload) });
  }

  // Verification
  async function getVerification() {
    return await request('/api/user/verification');
  }
  async function uploadKYC(formData) {
    return await request('/api/kyc/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + getToken() }, body: formData });
  }

  // Statements
  async function getStatements() {
    return await request('/api/user/statements');
  }

  return {
    request,
    getProfile,
    getAccount,
    getInvestments,
    getLoans,
    createLoan,
    getTransfers,
    createTransfer,
    getExternalAccounts,
    createExternalAccount,
    getIRA,
    createIRA,
    getVerification,
    uploadKYC,
    getStatements
  };
})();
</script>
