let initialization;

export function initAnalytics() {
  if (!import.meta.env.VITE_POSTHOG_KEY) return Promise.resolve(null);
  return initialization ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST,
      person_profiles: 'identified_only',
    });
    return posthog;
  }).catch(() => {
    initialization = undefined;
    return null;
  });
}

export function captureEvent(name, properties) {
  void initAnalytics().then(client => client?.capture(name, properties));
}
