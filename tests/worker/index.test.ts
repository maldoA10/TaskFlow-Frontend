/**
 * @file src/tests/worker/index.test.ts
 */

// Simulamos el entorno global de un Service Worker
const mockShowNotification = jest.fn();
const mockMatchAll = jest.fn();
const mockOpenWindow = jest.fn();

// @ts-ignore
global.self = global;
// @ts-ignore
self.registration = {
  showNotification: mockShowNotification,
};
// @ts-ignore
self.clients = {
  matchAll: mockMatchAll,
  openWindow: mockOpenWindow,
};

// Importamos el worker (asegúrate que la ruta sea correcta)
import '../../worker/index';

describe('Service Worker: Eventos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Push Event', () => {
    it('debe mostrar notificación con el payload correcto', async () => {
      const payload = {
        title: 'Hola',
        body: 'Mundo',
        url: '/test'
      };

      // Creamos un evento de push simulado
      const event = new Event('push') as any;
      event.data = {
        json: () => payload,
        text: () => JSON.stringify(payload)
      };
      event.waitUntil = (promise: Promise<any>) => promise;

      // Disparar el evento manualmente
      // @ts-ignore
      self.dispatchEvent(event);

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Hola',
        expect.objectContaining({
          body: 'Mundo',
          data: { url: '/test' }
        })
      );
    });

    it('debe usar el título por defecto si el JSON falla', () => {
      const event = new Event('push') as any;
      event.data = {
        json: () => { throw new Error('Bad JSON') },
        text: () => 'Texto plano'
      };
      event.waitUntil = jest.fn();

      self.dispatchEvent(event);

      expect(mockShowNotification).toHaveBeenCalledWith(
        'TaskFlow',
        expect.objectContaining({ body: 'Texto plano' })
      );
    });
  });

  describe('Notification Click', () => {
    it('debe abrir una nueva ventana si no hay clientes abiertos', async () => {
      const event = new Event('notificationclick') as any;
      event.notification = {
        close: jest.fn(),
        data: { url: '/dashboard' }
      };
      event.waitUntil = (p: any) => p;

      mockMatchAll.mockResolvedValue([]); // No hay ventanas abiertas
      mockOpenWindow.mockResolvedValue({});

      // @ts-ignore
      await self.dispatchEvent(event);

      expect(event.notification.close).toHaveBeenCalled();
      expect(mockOpenWindow).toHaveBeenCalledWith('/dashboard');
    });
  });
});