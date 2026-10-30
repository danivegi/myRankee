// Header the native app (React Native / Expo) sends on every API request.
// Native clients send no Origin header, so src/proxy.js lets an Origin-less
// non-GET request through only when it carries this exact header and value.
// The mobile app must use the same values.
export const MOBILE_CLIENT_HEADER = {
  name:  'X-Client',
  value: 'myrankee-mobile',
};
