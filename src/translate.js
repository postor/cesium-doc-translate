const { copy, ensureDir, readJSON, writeJSON } = require('fs-extra')
const { join } = require('path')
const glob = require('glob')
const { readFile, writeFile, exists } = require('fs-extra')
const { JSDOM } = require('jsdom')
// const translate = require('@postor/google-translate-api')
const translatte = require('./baidu')
// const { retry, proxify } = require('@postor/google-translate-api/src/proxify')


module.exports = async function (targetLanguage) {
  const translatedFolder = join(__dirname, '..', 'translated')
  await ensureDir(translatedFolder)
  const targetFolder = join(translatedFolder, targetLanguage)
  const cacheFile = join(__dirname, '..', 'cache.json')
  const cache = await exists(cacheFile) ? await readJSON(cacheFile) : {}

  // copy
  await copy(join(__dirname, '..', 'cesiumjs-ref-doc'), targetFolder)

  // translate desc
  let htmlFiles = glob.sync(`${targetFolder}/**/*.html`)
  for (let htmlFile of htmlFiles) {
    let html = await readFile(htmlFile)
    let dom = new JSDOM(html)
    let { document } = dom.window
    let translatedClassName = 'js-translated'
    let selector = `.description:not(.${translatedClassName}), .param-desc:not(.${translatedClassName})`

    let unhandled = [...document.querySelectorAll(selector)], tmp = []

    while (unhandled.length) {
      tmp = []
      for (let desc of unhandled) {
        if (desc.querySelectorAll(selector).length) {
          tmp.push(desc)
          continue
        }
        desc.innerHTML = await trans(desc, targetLanguage)
        desc.className = desc.className + ' ' + translatedClassName
      }
      unhandled = tmp
    }

    await writeFile(htmlFile, dom.serialize())
    console.log(`${htmlFile} to ${targetLanguage} done!`)
    // process.exit()
  }



  async function trans(dom, to) {
    // no children node
    if (!dom.children.length) {
      return await translateWithRetry(dom.textContent, to)
    }

    // only children node, without text
    let clone = dom.cloneNode(true)
    for (let n of clone.children) {
      clone.removeChild(n)
    }
    if (/^\s*$/.test(clone.textContent)) {
      return dom.innerHTML
    }

    // both node and text
    let txts = [], htms = [], nums = [], num = 616668164
      , domTxt = dom.textContent
    for (let n of dom.children) {
      txts.push(n.textContent)
      htms.push(n.outerHTML)
      num++
      while (domTxt.includes(num)) {
        num++
      }
      nums.push('' + num)
    }

    for (let i = 0; i < txts.length; i++) {
      domTxt = domTxt.replace(txts[i], nums[i])
    }
    let translated = await translateWithRetry(domTxt, to)
    for (let i = 0; i < htms.length; i++) {
      translated = translated.replace(nums[i], htms[i])
    }
    return translated
  }

  async function translateWithRetry(txt1, to, retry = 100) {
    let txt = txt1.trim()
    if (!txt) return txt
    if (!cache[to]) {
      cache[to] = {}
    }
    if (cache[to][txt1]) return cache[to][txt1]
    if (cache[to][txt]) return cache[to][txt]
    await waitMiliSec(100)
    for (let i = 0; i < retry; i++) {
      try {
        // let { text } = await translatte(txt, { to })
        let text = await translatte(txt, to)
        cache[to][txt] = text
        await writeJSON(cacheFile, cache, { spaces: 2 })
        console.log(`translated！[${txt}]`)
        return text
      } catch (e) {
        console.log('failed translting, retrying', e, txt)
      }
    }
    throw `retry translate reach max ${retry}, when translating [${txt}] into ${to}`
  }
}

function waitMiliSec(mili) {
  return new Promise(resolve => setTimeout(resolve, mili))
}
