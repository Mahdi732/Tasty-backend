const state = {
  accessToken: localStorage.getItem('us_access_token') || '',
  refreshToken: localStorage.getItem('us_refresh_token') || '',
};

const byId = (id) => document.getElementById(id);

const output = byId('output');
const accessTokenState = byId('accessTokenState');
const refreshTokenState = byId('refreshTokenState');

const ui = {
  baseUrl: byId('baseUrl'),
  email: byId('email'),
  password: byId('password'),
  deviceId: byId('deviceId'),
  otpCode: byId('otpCode'),
  sessionId: byId('sessionId'),
};

const setTokens = ({ accessToken, refreshToken }) => {
  if (typeof accessToken === 'string') {
    state.accessToken = accessToken;
    localStorage.setItem('us_access_token', accessToken);
  }

  if (typeof refreshToken === 'string') {
    state.refreshToken = refreshToken;
    localStorage.setItem('us_refresh_token', refreshToken);
  }

  renderTokenState();
};

const clearTokens = () => {
  state.accessToken = '';
  state.refreshToken = '';
  localStorage.removeItem('us_access_token');
  localStorage.removeItem('us_refresh_token');
  renderTokenState();
};

const renderTokenState = () => {
  accessTokenState.textContent = state.accessToken || '(none)';
  refreshTokenState.textContent = state.refreshToken || '(none)';
};

const jsonOut = (title, data) => {
  output.textContent = `${title}\n\n${JSON.stringify(data, null, 2)}`;
};

const base = () => ui.baseUrl.value.trim().replace(/\/$/, '');

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (auth && state.accessToken) {
    headers.Authorization = `Bearer ${state.accessToken}`;
  }

  const response = await fetch(`${base()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = { message: 'No JSON response' };
  }

  if (data?.data?.accessToken || data?.data?.refreshToken) {
    setTokens({
      accessToken: data?.data?.accessToken,
      refreshToken: data?.data?.refreshToken,
    });

    if (data?.data?.session?.sessionId) {
      ui.sessionId.value = data.data.session.sessionId;
    }
  }

  jsonOut(`${method} ${path} -> ${response.status}`, data);
  return { response, data };
}

byId('registerBtn').addEventListener('click', async () => {
  await request('/auth/register', {
    method: 'POST',
    body: {
      email: ui.email.value,
      password: ui.password.value,
    },
  });
});

byId('startVerifyBtn').addEventListener('click', async () => {
  await request('/auth/email/start-verification', {
    method: 'POST',
    body: { email: ui.email.value },
  });
});

byId('verifyBtn').addEventListener('click', async () => {
  await request('/auth/email/verify', {
    method: 'POST',
    body: {
      email: ui.email.value,
      code: ui.otpCode.value.trim(),
    },
  });
});

byId('loginBtn').addEventListener('click', async () => {
  await request('/auth/login', {
    method: 'POST',
    body: {
      email: ui.email.value,
      password: ui.password.value,
      deviceId: ui.deviceId.value,
    },
  });
});

byId('meBtn').addEventListener('click', async () => {
  await request('/auth/me', { auth: true });
});

byId('refreshBtn').addEventListener('click', async () => {
  await request('/auth/refresh', {
    method: 'POST',
    body: state.refreshToken ? { refreshToken: state.refreshToken } : {},
  });
});

byId('logoutBtn').addEventListener('click', async () => {
  await request('/auth/logout', {
    method: 'POST',
    auth: true,
    body: state.refreshToken ? { refreshToken: state.refreshToken } : {},
  });
});

byId('logoutAllBtn').addEventListener('click', async () => {
  await request('/auth/logout-all', {
    method: 'POST',
    auth: true,
    body: { exceptCurrentSession: false },
  });
});

byId('listSessionsBtn').addEventListener('click', async () => {
  const { data } = await request('/auth/sessions', { auth: true });
  const firstSessionId = data?.data?.sessions?.[0]?.sessionId;
  if (firstSessionId) {
    ui.sessionId.value = firstSessionId;
  }
});

byId('revokeSessionBtn').addEventListener('click', async () => {
  const sessionId = ui.sessionId.value.trim();
  if (!sessionId) {
    jsonOut('Session ID required', { message: 'Enter a session ID first.' });
    return;
  }

  await request(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    auth: true,
  });
});

byId('clearTokensBtn').addEventListener('click', () => {
  clearTokens();
  jsonOut('Token state', { message: 'Local token state cleared.' });
});

renderTokenState();

