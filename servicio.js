/*
 * El trabajador de servicio.
 *
 * Está aquí por una razón concreta: sin uno registrado, el navegador NO ofrece
 * instalar la aplicación. Es el requisito que convierte una página web en algo
 * que se puede anclar al escritorio o a la pantalla del teléfono, con su icono
 * y su propia ventana.
 *
 * LO QUE NO HACE, Y CONVIENE SABERLO: Kontia no funciona sin internet. Guarda
 * su propio archivo para que abra rápido, pero los tipos de letra y las hojas
 * de estilo vienen de fuera, y sobre todo el SRI está en internet. Prometer que
 * funciona sin conexión sería mentir, así que no se promete.
 */

/*
 * La version la escribe el empaquetador en cada publicacion, en lugar de la
 * marca de abajo. Asi este archivo cambia cada vez que se publica, el navegador
 * instala el trabajador nuevo solo, y al activarse borra lo guardado por el
 * anterior (mas abajo). Ya no hay que acordarse de subir un numero a mano.
 */
const VERSION = '7f32bc688a6a';
const CACHE = 'kontia-' + VERSION;
const PROPIOS = ['./', './index.html', './manifiesto.json',
                 './iconos/icono-192.png', './iconos/icono-512.png'];

self.addEventListener('install', (ev) => {
  // Si algún archivo falla, la instalación no se cae entera: se guarda lo que
  // se pueda. Un instalador que se niega por un icono no sirve para nada.
  ev.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(PROPIOS.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/*
 * Cómo se pide cada cosa a la red.
 *
 * Lo nuestro se pide «sin memoria del navegador» (`no-cache`): el navegador
 * pregunta al servidor si cambió y, si no, reutiliza lo que tiene sin volver a
 * descargarlo. Así una publicación nueva se ve en la primera recarga.
 *
 * EL ERROR QUE HABÍA. Antes se hacía `fetch(pedido, { cache: 'reload' })` con
 * todo, también con la página misma. Pero una página (un pedido de navegación)
 * no admite opciones: el navegador lo rechaza, se caía al `catch` y se servía
 * la copia guardada, que era la vieja. Por eso recargar no bastaba y hacía
 * falta una segunda carga. La página se pide ahora por su dirección, que sí
 * admite la opción.
 */
function pedirALaRed(pedido) {
  const nuestro = new URL(pedido.url).origin === location.origin;
  if (!nuestro) return fetch(pedido);
  if (pedido.mode === 'navigate') {
    return fetch(pedido.url, { cache: 'no-cache', credentials: 'same-origin' });
  }
  try {
    return fetch(new Request(pedido, { cache: 'no-cache' }));
  } catch (e) {
    return fetch(pedido);
  }
}

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;

  const pedido = ev.request;
  const nuestro = new URL(pedido.url).origin === location.origin;

  /*
   * Primero la red, para que una versión nueva se vea en cuanto se recarga.
   * Lo guardado es la red de seguridad cuando no hay internet, no la fuente.
   * Los tipos de letra y Tailwind vienen de fuera y no se guardan aquí.
   */
  ev.respondWith(
    pedirALaRed(pedido)
      .then((r) => {
        if (r.ok && nuestro) {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put(pedido, copia)).catch(() => {});
        }
        return r;
      })
      .catch(() => caches.match(pedido, { ignoreSearch: pedido.mode === 'navigate' })
        .then((r) => r || (pedido.mode === 'navigate' ? caches.match('./index.html') : r)))
  );
});
