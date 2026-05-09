/**
 * @file src/tests/lib/push.test.ts
 */

// 1. Polyfill para atob: JSDOM no lo incluye y es vital para urlBase64ToUint8Array
if (typeof window !== 'undefined' && !window.atob) {
  window.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
}

// 2. Mock de apiFetch
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import { getVapidPublicKey, registerPush, unregisterPush } from '@/lib/push';

// Helpers para construir el árbol de mocks

function makePushSubscription(endpoint = 'https://push.example.com/sub') {
  return {
    endpoint,
    toJSON: () => ({
      endpoint,
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
    }),
    unsubscribe: jest.fn().mockResolvedValue(true),
  };
}

function makePushManager(subscription: any = null) {
  return {
    getSubscription: jest.fn().mockResolvedValue(subscription),
    subscribe: jest.fn().mockResolvedValue(makePushSubscription()),
  };
}

function makeRegistration(pushManager = makePushManager()) {
  return { pushManager };
}

function mockServiceWorker(registration: any = makeRegistration()) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: Promise.resolve(registration) },
    writable: true,
    configurable: true,
  });
}

function mockNotification(permission: NotificationPermission = 'default') {
  Object.defineProperty(window, 'Notification', {
    value: {
      permission,
      requestPermission: jest.fn().mockResolvedValue('granted'),
    },
    writable: true,
    configurable: true,
  });
}

// Configuración Global

beforeEach(() => {
  jest.clearAllMocks();
  // Seteamos un valor por defecto exitoso para que los tests no fallen al inicio
  mockApiFetch.mockResolvedValue({ publicKey: 'test-vapid-key' });
  mockNotification('default');
  mockServiceWorker();
});

// Tests de getVapidPublicKey

describe('getVapidPublicKey', () => {
  it('devuelve la clave pública cuando la API responde correctamente', async () => {
    mockApiFetch.mockResolvedValueOnce({ publicKey: 'test-vapid-key' });
    const key = await getVapidPublicKey();
    expect(key).toBe('test-vapid-key');
  });

  it('devuelve null si la API lanza un error', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Network error'));
    const key = await getVapidPublicKey();
    expect(key).toBeNull();
  });

  it('llama al endpoint correcto con auth:false', async () => {
    await getVapidPublicKey();
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/push/vapid-public-key',
      expect.objectContaining({ auth: false })
    );
  });
});

// Tests de registerPush

describe('registerPush', () => {
  it('no hace nada si Notification no está disponible', async () => {
    // @ts-expect-error
    delete window.Notification;
    await registerPush();
    // No debería intentar buscar la clave VAPID si no hay soporte de notificaciones
    expect(mockApiFetch).not.toHaveBeenCalledWith('/push/vapid-public-key', expect.anything());
  });

  it('no hace nada si el permiso está denegado', async () => {
    mockNotification('denied');
    await registerPush();
    expect(mockApiFetch).not.toHaveBeenCalledWith('/push/subscribe', expect.anything());
  });

  it('no hace nada si no hay clave VAPID disponible', async () => {
    mockApiFetch.mockResolvedValueOnce({ publicKey: null });
    await registerPush();
    expect(mockApiFetch).not.toHaveBeenCalledWith('/push/subscribe', expect.anything());
  });

  it('solicita permiso al usuario si aún no se ha concedido', async () => {
    const pushManager = makePushManager(null);
    mockServiceWorker(makeRegistration(pushManager));

    await registerPush();
    expect(window.Notification.requestPermission).toHaveBeenCalled();
  });

  it('usa la suscripción existente si ya hay una', async () => {
    const existing = makePushSubscription('https://existing.com/sub');
    const pushManager = makePushManager(existing);
    mockServiceWorker(makeRegistration(pushManager));

    await registerPush();

    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/push/subscribe',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('crea una nueva suscripción si no existe ninguna', async () => {
    const pushManager = makePushManager(null);
    mockServiceWorker(makeRegistration(pushManager));

    await registerPush();

    expect(pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true })
    );
  });

  it('envía el endpoint y las keys al backend', async () => {
    const sub = makePushSubscription('https://fcm.example.com/endpoint');
    mockServiceWorker(makeRegistration(makePushManager(sub)));

    await registerPush();

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/push/subscribe',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('https://fcm.example.com/endpoint'),
      })
    );
  });
});

// Tests de unregisterPush

describe('unregisterPush', () => {
  it('no hace nada si serviceWorker no está disponible', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    });
    await unregisterPush();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('llama al endpoint DELETE con el endpoint de la suscripción', async () => {
    const sub = makePushSubscription('https://push.example.com/my-sub');
    mockServiceWorker(makeRegistration(makePushManager(sub)));

    await unregisterPush();

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/push/subscribe',
      expect.objectContaining({
        method: 'DELETE',
        body: expect.stringContaining('https://push.example.com/my-sub'),
      })
    );
  });

  it('llama a subscription.unsubscribe() para limpiar el navegador', async () => {
    const sub = makePushSubscription();
    mockServiceWorker(makeRegistration(makePushManager(sub)));

    await unregisterPush();
    expect(sub.unsubscribe).toHaveBeenCalled();
  });

  it('no lanza error si la llamada a la API falla', async () => {
    const sub = makePushSubscription();
    mockServiceWorker(makeRegistration(makePushManager(sub)));
    mockApiFetch.mockRejectedValueOnce(new Error('Network Fail'));

    await expect(unregisterPush()).resolves.not.toThrow();
    // El unsubscribe del navegador debe ocurrir aunque falle la red
    expect(sub.unsubscribe).toHaveBeenCalled();
  });
});