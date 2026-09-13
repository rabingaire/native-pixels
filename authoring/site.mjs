// GitHub Pages redirects the github.io address to this account-level custom domain.
// Keep the trailing slash: all published URLs resolve beneath this project path.
export const site = {
  url: 'https://rabingaire.com.np/native-pixels/',
  name: 'Native Pixels',
  author: 'Rabin Gaire',
  description: 'Learn native 2D WebGPU with Odin and SDL3 in 23 chapters. Build a pixel-art game with sprite animation, collision, and complete runnable source.',
};
export const publishedURL = file => new URL(file === 'index.html' ? '' : file, site.url).href;
