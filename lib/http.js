'use strict'
const http = require('http')
const https = require('https')

function get (url) {
  var reqMod = http

  if (url.indexOf('https:') === 0) {
    reqMod = https
  }

  return new Promise((resolve, reject) => {
    reqMod.get(url, resolve)
        .on('error', reject)
  })
  .then(res => {
    if (res.statusCode !== 200) {
      res.resume()
      throw new Error(`Request Failed.\n Status Code: ${res.statusCode}`)
    }

    return new Promise((resolve, reject) => {
      let rawData = ''

      res.setEncoding('utf8')
      res.on('data', (chunk) => { rawData += chunk })
      res.on('end', () => resolve(rawData))
      res.on('error', reject)
    })
  })
}

module.exports.get = get
