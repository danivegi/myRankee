export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/settings', '/user/edit'],
    },
    sitemap: 'https://myrankee.com/sitemap.xml',
  };
}
