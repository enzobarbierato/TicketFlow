(() => {
  let csrfToken = null;

  const SAFE_METHODS = [
    "GET",
    "HEAD",
    "OPTIONS",
  ];

  async function parseResponse(response) {
    const contentType =
      response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();

    return {
      message: text || null,
    };
  }

  async function getCsrfToken() {
    if (csrfToken) {
      return csrfToken;
    }

    const response = await fetch(
      "/api/auth/csrf-token",
      {
        method: "GET",

        headers: {
          Accept: "application/json",
        },

        credentials: "same-origin",
      }
    );

    const data = await parseResponse(response);

    if (
      !response.ok ||
      !data.csrfToken
    ) {
      throw new Error(
        data.message ||
        "Não foi possível iniciar uma sessão segura."
      );
    }

    csrfToken = data.csrfToken;

    return csrfToken;
  }

  async function request(
    url,
    options = {}
  ) {
    const method = (
      options.method || "GET"
    ).toUpperCase();

    const headers = new Headers(
      options.headers || {}
    );

    headers.set(
      "Accept",
      "application/json"
    );

    let body = options.body;

    if (
      body &&
      !(body instanceof FormData) &&
      typeof body !== "string"
    ) {
      headers.set(
        "Content-Type",
        "application/json"
      );

      body = JSON.stringify(body);
    }

    if (!SAFE_METHODS.includes(method)) {
      const token = await getCsrfToken();

      headers.set(
        "X-CSRF-Token",
        token
      );
    }

    let response;

    try {
      response = await fetch(
        url,
        {
          ...options,
          method,
          headers,
          body,
          credentials: "same-origin",
        }
      );
    } catch {
      throw new Error(
        "Não foi possível conectar ao TicketFlow."
      );
    }

    const data =
      await parseResponse(response);

    /*
     * O backend pode regenerar o token,
     * principalmente após o login.
     */
    if (data?.csrfToken) {
      csrfToken = data.csrfToken;
    }

    if (!response.ok) {
      const error = new Error(
        data?.message ||
        "Não foi possível concluir a solicitação."
      );

      error.status = response.status;
      error.data = data;

      throw error;
    }

    return data;
  }

  function setCsrfToken(token) {
    csrfToken = token || null;
  }

  function clearCsrfToken() {
    csrfToken = null;
  }

  window.TicketFlowApi = {
    request,
    getCsrfToken,
    setCsrfToken,
    clearCsrfToken,
  };
})();