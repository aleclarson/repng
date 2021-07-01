const puppeteer = require('puppeteer')
const DataURI = require('datauri')

const baseCSS = `*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif}`

const getHtmlData = ({ body, css = '', webfont }) => {
  const fontCSS = webfont ? getWebfontCSS(webfont) : ''
  const html = `<!DOCTYPE html>
    <head>
    <meta charset="utf-8"><style>${baseCSS}${fontCSS}${css}</style>
    </head>
    <body style="display:inline-block">
    ${body}`
  return html
}

const getWebfontCSS = (fontpath) => {
  const { content } = new DataURI(fontpath)
  const [name] = fontpath.split('/').slice(-1)[0].split('.')
  const css = `@font-face {
  font-family: '${name}';
  font-style: normal;
  font-weight: 400;
  src: url(${content});
}`
  return css
}

module.exports = async (body, opts = {}) => {
  const html = body.includes('<head>')
    ? body
    : getHtmlData({
        body,
        css: opts.css,
        webfont: opts.webfont,
      })

  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await page.setContent(html, {
    waitUntil: ['domcontentloaded', 'networkidle0'],
    timeout: 0,
  })

  let rect = {}
  if (!opts.width && !opts.height) {
    const bodyEl = await page.$('body')
    rect = await bodyEl.boxModel()
  }
  const width = parseInt(opts.width || rect.width)
  const height = parseInt(opts.height || rect.height)

  await page.setViewport({
    width,
    height,
  })

  const result = await page.screenshot({
    type: 'png',
    clip: {
      x: 0,
      y: 0,
      width,
      height,
    },
    omitBackground: true,
  })

  await browser.close()
  return result
}
