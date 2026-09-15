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
const VERSION = '7f8aeed2fd58';
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

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;

  const nuestro = new URL(ev.request.url).origin === location.origin;

  /*
   * Primero la red, para que una versión nueva se vea el mismo día en que se
   * publica. Lo guardado es la red de seguridad, no la fuente.
   *
   * `cache: 'reload'` para lo nuestro: sin eso, `fetch` puede contestar con lo
   * que el navegador guardó por su cuenta —que puede ser de antes de publicar—
   * y entonces ni la red ni este archivo tienen nada que decir. Los tipos de
   * letra y Tailwind vienen de fuera y ahi si conviene dejar que el navegador
   * los reutilice: no cambian.
   */
  ev.respondWith(
    fetch(ev.request, nuestro ? { cache: 'reload' } : undefined)
      .then((r) => {
        if (r.ok && nuestro) {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put(ev.request, copia));
        }
        return r;
      })
      .catch(() => caches.match(ev.request))
  );
});
