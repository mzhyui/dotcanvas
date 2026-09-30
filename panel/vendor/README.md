# Bundled Markdown renderer

`markdown-it.min.js` is the unmodified UMD browser bundle from markdown-it **15.0.2**,
`package/dist/browser/markdown-it.umd.min.js`. It is served locally and also works
when opening `panel/index.html` directly. No runtime install or CDN is needed.

- Upstream: https://github.com/markdown-it/markdown-it
- Package: https://registry.npmjs.org/markdown-it/-/markdown-it-15.0.2.tgz
- Package integrity (SHA-512, base64): `q4IGxMv56jCqT4OCRCADBoDP3LO4MhmTXjFbphHPXs4g3j9Xg5RDnxqN8IF/3vIWEU+VCnUq+7JUg/cfy2E6Qw==`
- License: MIT; see `markdown-it.LICENSE` and `THIRD-PARTY-NOTICES.txt` for embedded dependencies.

DotCanvas disables raw HTML, retains the parser's URL validation, and opens rendered
links in a new tab with `noopener noreferrer`. The existing server image policy
still allows only same-origin images. Source maps are not shipped.
