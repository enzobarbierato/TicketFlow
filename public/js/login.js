const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const togglePasswordButton =
  document.getElementById("toggle-password");

const loginMessage =
  document.getElementById("login-message");

const loginSubmit =
  document.getElementById("login-submit");

const buttonLabel =
  loginSubmit.querySelector(".button-label");

const buttonLoader =
  loginSubmit.querySelector(".button-loader");


function showMessage(message) {
  loginMessage.textContent = message;
  loginMessage.hidden = false;
}


function clearMessage() {
  loginMessage.textContent = "";
  loginMessage.hidden = true;
}


function setLoading(isLoading) {
  loginSubmit.disabled = isLoading;

  emailInput.disabled = isLoading;
  passwordInput.disabled = isLoading;

  buttonLabel.textContent =
    isLoading ? "Entrando..." : "Entrar";

  buttonLoader.hidden = !isLoading;
}


function validateForm() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email) {
    showMessage("Informe seu e-mail.");
    emailInput.focus();

    return false;
  }

  if (!emailInput.validity.valid) {
    showMessage("Informe um e-mail válido.");
    emailInput.focus();

    return false;
  }

  if (!password) {
    showMessage("Informe sua senha.");
    passwordInput.focus();

    return false;
  }

  return true;
}


function redirectByRole(role) {
  switch (role) {
    case "user":
      window.location.href = "/user/";
      break;

    case "support":
      window.location.href = "/support/";
      break;

    case "manager":
      window.location.href = "/manager/";
      break;

    default:
      throw new Error(
        "Perfil de usuário não reconhecido."
      );
  }
}


togglePasswordButton.addEventListener(
  "click",
  () => {
    const passwordIsVisible =
      passwordInput.type === "text";

    passwordInput.type =
      passwordIsVisible
        ? "password"
        : "text";

    togglePasswordButton.setAttribute(
      "aria-pressed",
      String(!passwordIsVisible)
    );

    togglePasswordButton.setAttribute(
      "aria-label",
      passwordIsVisible
        ? "Mostrar senha"
        : "Ocultar senha"
    );

    passwordInput.focus();
  }
);


emailInput.addEventListener(
  "input",
  clearMessage
);

passwordInput.addEventListener(
  "input",
  clearMessage
);


loginForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    clearMessage();

    if (!validateForm()) {
      return;
    }

    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value;

    setLoading(true);

    try {
      await TicketFlowApi.request(
        "/api/auth/login",
        {
          method: "POST",

          body: {
            email,
            password,
          },
        }
      );

      const session =
        await TicketFlowApi.request(
          "/api/auth/me"
        );

      if (!session.user) {
        throw new Error(
          "Não foi possível identificar o usuário autenticado."
        );
      }

      redirectByRole(
        session.user.role
      );
    } catch (error) {
      if (error.status === 401) {
        showMessage(
          "E-mail ou senha incorretos."
        );
      } else if (error.status === 429) {
        showMessage(
          "Muitas tentativas de login. Aguarde alguns minutos e tente novamente."
        );
      } else {
        showMessage(
          error.message ||
          "Não foi possível realizar o login."
        );
      }

      setLoading(false);
    }
  }
);