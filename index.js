require('@babel/register')({
  plugins: [
  ].map(require.resolve),
  presets: [
    '@babel/preset-env',
    '@babel/preset-react'
  ].map(require.resolve)
})

const fs = require('fs')
const puppeteer = require('puppeteer')
const { Readable } = require('stream')
const path = require('path')
const { createElement: h } = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const Datauri = require('datauri')
const resolveCWD = require('resolve-cwd')

const baseCSS = `*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif}`

const getHtmlData = ({
  body,
  baseCSS,
  css,
  styles,
  webfont
}) => {
  const fontCSS = webfont ? getWebfontCSS(webfont) : ''
  const html = `<!DOCTYPE html>
    <head>
    <meta charset="utf-8"><style>${baseCSS}${fontCSS}${css}</style>
    ${styles}
    </head>
    <body style="display: inline-block">
    ${body}`
  return html
}

const getWebfontCSS = (fontpath) => {
  const { content } = new Datauri(fontpath)
  const [ name, ext ] = fontpath.split('/').slice(-1)[0].split('.')
  const css = (`@font-face {
  font-family: '${name}';
  font-style: normal;
  font-weight: 400;
  src: url(${content});
}`)
  return css
}

module.exports = async (Component, opts = {}) => {
  const {
    props = {},
    css = '',
    filename,
    outDir,
    width,
    height,
    scale = 1,
    webfont,
    cssLibrary,
    type = 'png' // jpeg, png and pdf are allowed
  } = opts

  props.__options = opts

  let body
  let styles = ''
  const el = h(Component, props)
  switch (cssLibrary) {
    case 'styled-components':
      const { ServerStyleSheet } = require(resolveCWD('styled-components'))
      const sheet = new ServerStyleSheet()
      body = renderToStaticMarkup(
        sheet.collectStyles(el)
      )
      styles = sheet.getStyleTags()
      break
    case 'emotion':
      const { renderStylesToString } = require(resolveCWD('emotion-server'))
      body = renderStylesToString(renderToString(el))
      break
    default:
      body = renderToStaticMarkup(el)
  }

  const html = getHtmlData({
    body,
    baseCSS,
    css,
    styles,
    webfont
  })

  // todo:
  // - scale
  // - delay
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.setContent(html)

  let rect = {}
  if (!width && !height) {
    const bodyEl = await page.$('body')
    rect = await bodyEl.boxModel()
  }

  let result
  if (type === 'pdf') {
    result = await page.pdf({
      // width and height can be string here
      // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagepdfoptions
      width: parseInt(width || rect.width),
      height: parseInt(height || rect.height),
    })
  } else {
    result = await page.screenshot({
      type: type,
      clip: {
        x: 0,
        y: 0,
        width: parseInt(width || rect.width),
        height: parseInt(height || rect.height),
      },
      omitBackground: true
    })
  }

  await browser.close()

  return result
}
