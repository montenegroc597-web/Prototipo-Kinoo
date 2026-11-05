// Lógica de entrar.html: valida la cuenta de prueba y vuelve a la pantalla que se pidió.
import { getSession, login, logout } from './session';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);
// Solo se vuelve a rutas del mismo sitio (evita redirecciones abiertas).
const next = (() => {
  const n = params.get('next');
  return n?.startsWith('/') && !n.startsWith('//') ? n : './kinoo-flujo/Flujo1_Descubrir.dc.html';
})();

function showLogged(name: string) {
  $('form').hidden = true;
  $('logged').hidden = false;
  $('logged-name').textContent = name;
}

const current = getSession();
if (current && params.get('salir') === null) showLogged(current.name);

$('logout').addEventListener('click', () => {
  logout();
  location.replace(location.pathname);
});
$('continue').addEventListener('click', () => location.assign(next));

$<HTMLFormElement>('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = $<HTMLInputElement>('user').value;
  const pass = $<HTMLInputElement>('pass').value;
  const err = $('error');
  err.hidden = true;
  const s = await login(user, pass);
  if (!s) {
    err.hidden = false;
    $<HTMLInputElement>('pass').select();
    return;
  }
  location.assign(next);
});

if (params.get('salir') !== null) {
  logout();
}
